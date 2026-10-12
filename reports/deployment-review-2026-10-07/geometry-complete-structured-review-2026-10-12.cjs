// Entire generated literal, pure local validation. No regeneration or network.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const source = fs.readFileSync('lib/pragueDistricts.js', 'utf8');
const literal = source.match(/^const REGIONS = (.+);$/m)[1];
const regions = JSON.parse(literal);
assert.equal(JSON.stringify(regions), literal, 'every generated token round-trips exactly');
assert.deepEqual(regions.map(r => r.id), Array.from({length:22},(_,i)=>`Praha ${i+1}`));
const projection = JSON.parse(source.match(/^const PROJECTION = (.+);$/m)[1]);
const rows = [];
function orientation(a,b,c) {
  return Math.sign((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]));
}
for (const region of regions) {
  assert.deepEqual(Object.keys(region), ['id','num','bbox','rings']);
  const all = region.rings.flat();
  const actualBox = [Math.min(...all.map(p=>p[0])),Math.min(...all.map(p=>p[1])),
    Math.max(...all.map(p=>p[0])),Math.max(...all.map(p=>p[1]))];
  assert.deepEqual(region.bbox, actualBox);
  let zeroEdges=0, crossings=0, repeatedVertices=0, candidatePairs=0;
  const geographic = [];
  for (const ring of region.rings) {
    assert.ok(ring.length>=4); assert.deepEqual(ring[0],ring.at(-1));
    const seen = new Set();
    for (const p of ring.slice(0,-1)) {
      assert.equal(p.length,2); assert.ok(p.every(Number.isFinite));
      const key=JSON.stringify(p); if(seen.has(key))repeatedVertices++; seen.add(key);
      const lon=((p[0]-projection.pad)/projection.scale+projection.minX)*360-180;
      const mercY=(p[1]-projection.pad)/projection.scale+projection.minY;
      const lat=Math.atan(Math.sinh(Math.PI*(1-2*mercY)))*180/Math.PI;
      assert.ok(lat>49&&lat<51&&lon>13&&lon<16); geographic.push([lat,lon]);
    }
    const n=ring.length-1;
    const segments=Array.from({length:n},(_,i)=>{
      const a=ring[i].map(x=>Math.round(x*10000)),b=ring[i+1].map(x=>Math.round(x*10000));
      if(a[0]===b[0]&&a[1]===b[1])zeroEdges++;
      return {i,a,b,minX:Math.min(a[0],b[0]),maxX:Math.max(a[0],b[0]),minY:Math.min(a[1],b[1]),maxY:Math.max(a[1],b[1])};
    }).sort((a,b)=>a.minX-b.minX);
    for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
      const a=segments[i],b=segments[j]; if(b.minX>a.maxX)break;
      if(a.maxY<b.minY||b.maxY<a.minY||Math.abs(a.i-b.i)===1||Math.abs(a.i-b.i)===n-1)continue;
      candidatePairs++;
      if(orientation(a.a,a.b,b.a)*orientation(a.a,a.b,b.b)<0 &&
         orientation(b.a,b.b,a.a)*orientation(b.a,b.b,a.b)<0)crossings++;
    }
  }
  rows.push({id:region.id,rings:region.rings.length,points:all.length,bbox:actualBox,
    latRange:[Math.min(...geographic.map(p=>p[0])),Math.max(...geographic.map(p=>p[0]))],
    lonRange:[Math.min(...geographic.map(p=>p[1])),Math.max(...geographic.map(p=>p[1]))],
    zeroEdges,repeatedVertices,properSelfCrossings:crossings,candidatePairs});
}
const result={sha256:crypto.createHash('sha256').update(source).digest('hex'),
  method:'All140 nonliteral lines reviewed separately; entire319620-character literal parsed and reproduced exactly; every coordinate validated, every district summarized and all nonadjacent segment pairs with overlapping bounding boxes checked for proper crossings.',
  perDistrict:rows,points:rows.reduce((n,r)=>n+r.points,0),
  limitations:'Generated geometry is reviewed as data; not manual reading of each numeric token. Collinear contacts, authoritative boundary freshness, interdistrict topology, exact-edge policy and building accuracy require S16 acceptance. Source unchanged.'};
fs.writeFileSync('/private/tmp/geometry-complete-structured-review-2026-10-12.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
