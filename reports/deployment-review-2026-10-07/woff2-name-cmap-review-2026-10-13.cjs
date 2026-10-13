'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const prior=JSON.parse(fs.readFileSync(path.join(root,'reports/deployment-review-2026-10-07/font-build-provenance-2026-10-13.json'),'utf8'));
const tags=['cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca','prep','CFF ','VORG','EBDT','EBLC','gasp','hdmx','kern','LTSH','PCLT','VDMX','vhea','vmtx','BASE','GDEF','GPOS','GSUB','EBSC','JSTF','MATH','CBDT','CBLC','COLR','CPAL','SVG ','sbix','acnt','avar','bdat','bloc','bsln','cvar','fdsc','feat','fmtx','fvar','gvar','hsty','just','lcar','mort','morx','opbd','prop','trak','Zapf','Silf','Glat','Gloc','Feat','Sill'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function readWoff2(buf){
 assert.equal(buf.toString('ascii',0,4),'wOF2');assert.equal(buf.readUInt32BE(8),buf.length);assert.notEqual(buf.toString('ascii',4,8),'ttcf');
 let at=48,offset=0;const dir=[];
 function u128(){let value=0;for(let i=0;i<5;i++){assert(at<buf.length);const b=buf[at++];assert(i!==0||b!==0x80);assert(value<=0x1ffffff);value=value*128+(b&127);if(!(b&128))return value;}throw new Error('Invalid UIntBase128');}
 for(let i=0;i<buf.readUInt16BE(12);i++){
  const flags=buf[at++],index=flags&63,version=flags>>>6;let tag;
  if(index===63){tag=buf.toString('ascii',at,at+4);at+=4;}else tag=tags[index];
  const originalLength=u128();const special=tag==='glyf'||tag==='loca';assert(special?[0,3].includes(version):tag==='hmtx'?[0,1].includes(version):version===0);
  const transformed=special?version===0:version!==0;const length=transformed?u128():originalLength;
  if(tag==='loca'&&transformed)assert.equal(length,0);dir.push({tag,version,originalLength,length,offset,transformed});offset+=length;
 }
 const compressedLength=buf.readUInt32BE(20);assert(at+compressedLength<=buf.length);
 const data=zlib.brotliDecompressSync(buf.subarray(at,at+compressedLength));assert.equal(data.length,offset);
 const tables=new Map(dir.filter(t=>!t.transformed).map(t=>[t.tag,data.subarray(t.offset,t.offset+t.length)]));
 const metaOffset=buf.readUInt32BE(28),metaLength=buf.readUInt32BE(32),metaOrigLength=buf.readUInt32BE(36);let metadata=null;
 if(metaOffset){assert(metaOffset>=at+compressedLength);assert(metaOffset+metaLength<=buf.length);const xml=zlib.brotliDecompressSync(buf.subarray(metaOffset,metaOffset+metaLength));assert.equal(xml.length,metaOrigLength);metadata=xml.toString('utf8');}
 return {dir,tables,decompressedBytes:data.length,metadata};
}
function names(buf){
 assert(buf&&buf.length>=6);const format=buf.readUInt16BE(0),count=buf.readUInt16BE(2),strings=buf.readUInt16BE(4);assert([0,1].includes(format));assert(6+12*count<=buf.length);const rows=[];
 for(let i=0;i<count;i++){
  const at=6+i*12,platform=buf.readUInt16BE(at),encoding=buf.readUInt16BE(at+2),language=buf.readUInt16BE(at+4),id=buf.readUInt16BE(at+6),length=buf.readUInt16BE(at+8),offset=buf.readUInt16BE(at+10);assert(strings+offset+length<=buf.length);const raw=buf.subarray(strings+offset,strings+offset+length);let text;
  if(platform===0||platform===3){assert.equal(raw.length%2,0);const copy=Buffer.from(raw);copy.swap16();text=copy.toString('utf16le');}else text=raw.toString('latin1');rows.push({platform,encoding,language,id,text});
 }return rows;
}
function cmapGlyph(buf,point){
 assert(buf&&buf.length>=4);const count=buf.readUInt16BE(2);assert(4+count*8<=buf.length);let result=0;
 for(let i=0;i<count;i++){
  const at=4+i*8,platform=buf.readUInt16BE(at),encoding=buf.readUInt16BE(at+2),offset=buf.readUInt32BE(at+4);if(platform!==0&&!(platform===3&&[1,10].includes(encoding)))continue;assert(offset+2<=buf.length);const format=buf.readUInt16BE(offset);
  if(format===4&&point<=0xffff){const length=buf.readUInt16BE(offset+2),n=buf.readUInt16BE(offset+6)/2;assert(offset+length<=buf.length);const end=offset+14,start=end+n*2+2,delta=start+n*2,range=delta+n*2;assert(range+n*2<=offset+length);
   for(let j=0;j<n;j++){if(point<buf.readUInt16BE(start+j*2)||point>buf.readUInt16BE(end+j*2))continue;const ro=buf.readUInt16BE(range+j*2),d=buf.readInt16BE(delta+j*2);let glyph;if(!ro)glyph=(point+d)&65535;else{const pos=range+j*2+ro+2*(point-buf.readUInt16BE(start+j*2));assert(pos+2<=offset+length);glyph=buf.readUInt16BE(pos);if(glyph)glyph=(glyph+d)&65535;}result=result||glyph;break;}
  }else if(format===12){const length=buf.readUInt32BE(offset+4),n=buf.readUInt32BE(offset+12);assert(offset+length<=buf.length);assert(16+n*12<=length);for(let j=0;j<n;j++){const a=offset+16+j*12,start=buf.readUInt32BE(a),end=buf.readUInt32BE(a+4);if(point>=start&&point<=end){result=result||(buf.readUInt32BE(a+8)+point-start);break;}}}
 }return result;
}
const required='AÁBCČDĎEÉĚFGHIÍJKLMNŇOÓPQRŘSŠTŤUÚŮVWXYÝZŽaábcčdďeéěfghiíjklmnňoópqrřsštťuúůvwxyýzž0123456789 Kč.–—';const rows=[],groups=new Map();
for(const item of prior.fonts){
 const buf=fs.readFileSync(path.join(root,item.woff2_path));assert.equal(hash(buf),item.woff2_sha256);const decoded=readWoff2(buf),records=names(decoded.tables.get('name'));const numGlyphs=decoded.tables.get('maxp').readUInt16BE(4);
 const glyphs={};for(const char of [...new Set(required)]){const id=cmapGlyph(decoded.tables.get('cmap'),char.codePointAt(0));assert(id<numGlyphs);glyphs[char]=id;}
 const key=item.woff2_path.replace(/-(vietnamese|latin-ext|latin)-/,'-combined-');const group=groups.get(key)||new Set();for(const [char,id]of Object.entries(glyphs))if(id)group.add(char);groups.set(key,group);
 rows.push({path:item.woff2_path,sha256:hash(buf),decompressedBytes:decoded.decompressedBytes,nameTableVersion:decoded.tables.get('name').readUInt16BE(0),tableDirectory:decoded.dir,nameRecords:records,name13Present:records.some(r=>r.id===13),name14:records.filter(r=>r.id===14).map(r=>r.text),extendedMetadata:decoded.metadata,requiredGlyphsPresent:Object.fromEntries(Object.entries(glyphs).map(([c,id])=>[c,id>0]))});
}
const combined=[...groups].map(([font,set])=>({font,missing:[...new Set(required)].filter(c=>!set.has(c))}));
const out={date:'2026-10-13',method:'All24 actual shipped-parity WOFF2 streams Brotli-decompressed; complete directories and untransformed name/maxp/cmap tables decoded with bounds checks. Names/license metadata and format4/12 character-to-glyph mappings reviewed; transformed outlines not reconstructed or visually accepted.',sources:['https://www.w3.org/TR/WOFF2/','https://learn.microsoft.com/en-us/typography/opentype/spec/name','https://learn.microsoft.com/en-us/typography/opentype/spec/cmap'],files:rows,combinedRequiredGlyphCoverage:combined,limitations:['This is metadata/glyph mapping, not complete WOFF2 conformance, outline/shaping/kerning quality, font rights legal acceptance or actual target-browser/physical text rendering.','Required glyph string is a deliberate Czech/number/price/dash sample, not every possible Unicode/product/user character.']};
fs.writeFileSync(path.join(require('node:os').tmpdir(),'woff2-name-cmap-review-replay.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify({fonts:rows.length,name13Count:rows.filter(r=>r.name13Present).length,extendedMetadataCount:rows.filter(r=>r.extendedMetadata).length,name14Urls:[...new Set(rows.flatMap(r=>r.name14))],combinedRequiredGlyphCoverage:combined},null,2));
