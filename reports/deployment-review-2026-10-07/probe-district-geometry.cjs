// Pure local data inspection: no network, regeneration or database operations.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const backendPath = 'lib/pragueDistricts.js';
const frontendPath = 'frontend/src/lib/pragueDistricts.js';
const source = fs.readFileSync(path.join(root, backendPath), 'utf8');
const projection = JSON.parse(source.match(/^const PROJECTION = (.+);$/m)[1]);
const regions = JSON.parse(source.match(/^const REGIONS = (.+);$/m)[1]);
const frontSource = fs.readFileSync(path.join(root, frontendPath), 'utf8');
const districts = vm.runInNewContext(frontSource.replace(/export const/g, 'const') + '\nDISTRICTS;');
const backend = require(path.join(root, backendPath));
const frontendFeatures = fs.readFileSync(path.join(root, 'frontend/src/lib/schoolFeatures.js'), 'utf8');
const frontHops = vm.runInNewContext(frontendFeatures.replace(/export /g, '') + '\ndistrictHops;');
const ids = Array.from({ length: 22 }, (_, i) => `Praha ${i + 1}`);
assert.deepEqual(regions.map((r) => r.id), ids);
assert.deepEqual(Array.from(districts, (r) => r.id), ids);
let lookupPoints = 0, drawnPoints = 0, parityChecks = 0;
const perDistrict = [];
for (const [i, region] of regions.entries()) {
  assert.equal(region.num, i + 1);
  assert.equal(region.bbox.length, 4);
  assert.ok(region.bbox.every(Number.isFinite));
  assert.ok(region.rings.length > 0);
  for (const ring of region.rings) {
    assert.ok(ring.length >= 4);
    assert.deepEqual(ring[0], ring.at(-1));
    for (const pt of ring) {
      assert.equal(pt.length, 2);
      assert.ok(pt.every(Number.isFinite));
      assert.ok(pt[0] >= region.bbox[0] && pt[0] <= region.bbox[2]);
      assert.ok(pt[1] >= region.bbox[1] && pt[1] <= region.bbox[3]);
      assert.ok(pt[0] >= 0 && pt[0] <= 1000 && pt[1] >= 0 && pt[1] <= 764);
      lookupPoints += 1;
    }
  }
  const drawn = districts[i];
  assert.equal(drawn.num, region.num);
  assert.match(drawn.d, /^(M\d+(?:\.\d+)?,\d+(?:\.\d+)?(?:L\d+(?:\.\d+)?,\d+(?:\.\d+)?)+Z)+$/);
  drawnPoints += Array.from(drawn.d.matchAll(/[ML]/g)).length;
  assert.ok([drawn.labelX, drawn.labelY, drawn.labelR].every(Number.isFinite));
  assert.ok(drawn.labelR > 0);
  const mercX = (drawn.labelX - projection.pad) / projection.scale + projection.minX;
  const mercY = (drawn.labelY - projection.pad) / projection.scale + projection.minY;
  const lon = mercX * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * mercY))) * 180 / Math.PI;
  assert.equal(backend.districtForPoint(lat, lon), region.id, 'label membership');
  for (let j = 1; j <= 22; j += 1) {
    assert.equal(backend.districtHops(region.id, `Praha ${j}`), frontHops(i + 1, j));
    parityChecks += 1;
  }
  perDistrict.push({ id: region.id, rings: region.rings.length,
    lookupPoints: region.rings.reduce((n, r) => n + r.length, 0), labelMembership: true });
}
const result = { checkedAt: new Date().toISOString(), lookupPoints, drawnPoints, parityChecks,
  sourceHashes: Object.fromEntries([backendPath, frontendPath, 'frontend/src/lib/schoolFeatures.js']
    .map((p) => [p, crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex')])),
  perDistrict, note: 'Every stored lookup coordinate inspected by assertions; authored non-data lines read separately. Not a manual read of each coordinate literal, authoritative boundary freshness, exact-edge policy or building geocode validation.' };
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
