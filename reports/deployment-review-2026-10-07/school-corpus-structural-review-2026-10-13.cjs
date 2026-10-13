'use strict';
// Offline only: read every cache byte, replay the existing pure filter, write a separate receipt.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');
const root = path.resolve(__dirname, '../..');
const {filterSchool, parsePages} = require(path.join(root,'scripts/filter-scraped-schools.js'));
const rawDir = path.join(root,'scripts/data/scraped-schools');
const filteredDir = path.join(root,'scripts/data/filtered-schools');
const manifestPath = path.join(rawDir,'_manifest.json');
const reportPath = path.join(filteredDir,'_report.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
const report = JSON.parse(fs.readFileSync(reportPath,'utf8'));
const strict = new TextDecoder('utf-8',{fatal:true});
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const names = d => fs.readdirSync(d).filter(n=>/^\d+\.md$/.test(n)).sort((a,b)=>parseInt(a)-parseInt(b));
const rawNames=names(rawDir), filteredNames=names(filteredDir);
const reportByName=new Map(report.schools.map(r=>[r.filename,r]));
const stats={rawBytes:0,filteredBytes:0,rawLines:0,filteredLines:0,rawChars:0,filteredChars:0,rawPages:0,filteredPages:0};
const all=[];
function integrity(buf,text,pages){
 const urls=(pages||[]).map(p=>p.url);const hosts=[];const invalidUrls=[];const suspiciousUrls=[];
 for(const u of urls){try{const x=new URL(u);hosts.push(x.hostname);if(!['http:','https:'].includes(x.protocol)||x.username||x.password||/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/i.test(x.hostname))suspiciousUrls.push(u);}catch{invalidUrls.push(u);}}
 let historicalYearLines=0,audienceScopeLines=0;
 for(const l of text.split(/\r?\n/)){if(/(?:19\d{2}|20(?:0\d|1\d|2[0-3]))\s*[/–-]\s*(?:\d{2}|20\d{2})|(?:rok|roce|roční|roků|letech)\W{0,12}(?:19\d{2}|20(?:0\d|1\d|2[0-3]))/i.test(l))historicalYearLines++;if(/mateřsk|základní škol|nižší.*gymn|nástavb|vyšší odborn|třetího věku|zaměstnan|ubytovan|předškol|první stupeň|prvního stupně/i.test(l))audienceScopeLines++;}
 return {sha256:hash(buf),bytes:buf.length,lines:text.split('\n').length-(text.endsWith('\n')?1:0),utf16Chars:text.length,utf8Valid:true,nulBytes:buf.includes(0),replacementCharacters:(text.match(/\ufffd/g)||[]).length,parsed:!!pages,pageCount:urls.length,uniqueUrlCount:new Set(urls).size,hosts:[...new Set(hosts)].sort(),invalidUrls,suspiciousUrls,historicalYearLines,audienceScopeLines};
}
for(const filename of rawNames){
 const id=filename.slice(0,-3);const raw=fs.readFileSync(path.join(rawDir,filename));const rawText=strict.decode(raw);const cached=fs.readFileSync(path.join(filteredDir,filename));const filteredText=strict.decode(cached);
 const rawPages=parsePages(rawText), filteredPages=parsePages(filteredText);const result=filterSchool(rawText);const rawRecord=integrity(raw,rawText,rawPages), filteredRecord=integrity(cached,filteredText,filteredPages);
 const m=manifest[id], old=reportByName.get(filename);const rawUrls=(rawPages||[]).map(p=>p.url), filteredUrls=(filteredPages||[]).map(p=>p.url);
 const fields=old?{originalChars:old.originalChars===rawText.length,filteredChars:old.filteredChars===filteredText.length,pagesTotal:old.pagesTotal===(rawPages?.length||0),pagesKept:old.pagesKept===(filteredPages?.length||0)}:null;
 const row={id,filename,raw:rawRecord,filtered:filteredRecord,manifest:{present:!!m,scrapedAt:m?.scrapedAt||null,pageCountMatches:m?.pageCount===rawUrls.length,sourceUrlsMatchExactly:JSON.stringify(m?.sourceUrls)===JSON.stringify(rawUrls),missingFromManifest:rawUrls.filter(u=>!m?.sourceUrls?.includes(u)),missingFromRaw:(m?.sourceUrls||[]).filter(u=>!rawUrls.includes(u))},filterReport:{present:!!old,currentStoredFieldMatches:fields},replay:{sha256:hash(Buffer.from(result.text)),matchesStored:result.text===filteredText,chars:result.text.length,flags:result.flags,rescuedGroups:result.rescuedGroups||[]},filteredUrlsAbsentFromRaw:filteredUrls.filter(u=>!rawUrls.includes(u))};all.push(row);
 for(const [side,r]of[['raw',rawRecord],['filtered',filteredRecord]]){stats[side+'Bytes']+=r.bytes;stats[side+'Lines']+=r.lines;stats[side+'Chars']+=r.utf16Chars;stats[side+'Pages']+=r.pageCount;}
}
const summary={rawFiles:rawNames.length,filteredFiles:filteredNames.length,rawOnly:rawNames.filter(n=>!filteredNames.includes(n)),filteredOnly:filteredNames.filter(n=>!rawNames.includes(n)),manifestEntries:Object.keys(manifest).length,reportEntries:report.schools.length,manifestOnly:Object.keys(manifest).filter(id=>!rawNames.includes(id+'.md')),reportOnly:report.schools.filter(r=>!rawNames.includes(r.filename)).map(r=>r.filename),replayMismatchIds:all.filter(r=>!r.replay.matchesStored).map(r=>r.id),manifestMismatchIds:all.filter(r=>!r.manifest.pageCountMatches||!r.manifest.sourceUrlsMatchExactly).map(r=>r.id),reportMismatchIds:all.filter(r=>!r.filterReport.present||Object.values(r.filterReport.currentStoredFieldMatches||{}).includes(false)).map(r=>r.id),unparsedIds:all.filter(r=>!r.raw.parsed||!r.filtered.parsed).map(r=>r.id),replacementCharacterIds:all.filter(r=>r.raw.nulBytes||r.filtered.nulBytes||r.raw.replacementCharacters||r.filtered.replacementCharacters).map(r=>r.id),foreignFilteredUrlIds:all.filter(r=>r.filteredUrlsAbsentFromRaw.length).map(r=>r.id),suspiciousUrlIds:all.filter(r=>r.raw.invalidUrls.length||r.filtered.invalidUrls.length||r.raw.suspiciousUrls.length||r.filtered.suspiciousUrls.length).map(r=>r.id),...stats};
const out={date:'2026-10-13',method:'All 438 external Markdown files fully decoded and every line/URL scanned structurally; all 219 raw inputs replayed through current offline pure filter. This is not manual semantic review of 1.3 million captured third-party lines or verification that each source fact is current or eligible for the ninth-grade Prague audience.',sourceHashes:{filter:hash(fs.readFileSync(path.join(root,'scripts/filter-scraped-schools.js'))),config:hash(fs.readFileSync(path.join(root,'scripts/filter-config.json'))),manifest:hash(fs.readFileSync(manifestPath)),report:hash(fs.readFileSync(reportPath))},summary,reportTotals:report.totals,files:all};
fs.writeFileSync(path.join(require('node:os').tmpdir(), 'school-corpus-structural-review-replay.json'),JSON.stringify(out,null,2)+'\n');console.log(JSON.stringify(summary,null,2));
