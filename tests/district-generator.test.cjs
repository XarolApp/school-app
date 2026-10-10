const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const loadModule = (source) => {
  const context = vm.createContext({ module: { exports: {} } });
  vm.runInContext(source, context);
  return context.module.exports;
};

async function generateInMemory() {
  const writes = new Map();
  const elements = Array.from({ length: 22 }, (_, i) => {
    const lon = 14.2 + (i % 6) * 0.03;
    const lat = 50.1 + Math.floor(i / 6) * 0.03;
    const geometry = [[lon, lat], [lon + 0.02, lat], [lon + 0.02, lat + 0.02],
      [lon, lat + 0.02], [lon, lat]].map(([lon, lat]) => ({ lon, lat }));
    return { tags: { name: `SO Praha ${i + 1}` }, members: [{ type: 'way', role: 'outer', geometry }] };
  });
  const context = vm.createContext({
    __dirname: path.join(root, 'scripts'),
    require(name) {
      if (name === 'path') return path;
      if (name === 'fs') return {
        writeFileSync(file, source) { writes.set(file, source); },
        statSync(file) { return { size: Buffer.byteLength(writes.get(file)) }; },
      };
      throw new Error(`Blocked dependency: ${name}`);
    },
    fetch: async () => ({ text: async () => JSON.stringify({ elements }) }),
    URLSearchParams,
    console: { log() {}, error() {} },
    process: { argv: ['node', 'build-district-map.js'], stderr: { write() {} },
      exit(code) { throw new Error(`Generator exited ${code}`); } },
    setTimeout() { throw new Error('Unexpected retry'); },
  });
  const source = fs.readFileSync(path.join(root, 'scripts/build-district-map.js'), 'utf8')
    .replace('(async () => {', 'globalThis.generation = (async () => {');
  vm.runInContext(source, context);
  await context.generation;
  return writes;
}

test('district regeneration preserves the matching engine module contract', async () => {
  const writes = await generateInMemory();
  assert.equal(writes.size, 2);
  const generated = loadModule(writes.get(path.join(root, 'lib/pragueDistricts.js')));
  const existing = require('../lib/pragueDistricts');
  const frontSource = fs.readFileSync(path.join(root, 'frontend/src/lib/schoolFeatures.js'), 'utf8');
  const frontHops = vm.runInNewContext(frontSource.replace(/export /g, '') + '\ndistrictHops;');
  for (const name of ['districtForPoint', 'districtOfSchool', 'districtHops', 'toCoreDistrict']) {
    assert.equal(typeof generated[name], 'function', name);
  }
  assert.deepEqual(Array.from(generated.DISTRICT_IDS), Array.from(existing.DISTRICT_IDS));
  for (let a = 1; a <= 22; a += 1) {
    assert.equal(generated.toCoreDistrict(`Praha ${a}`), existing.toCoreDistrict(`Praha ${a}`));
    for (let b = 1; b <= 22; b += 1) {
      assert.equal(generated.districtHops(`Praha ${a}`, `Praha ${b}`),
        existing.districtHops(`Praha ${a}`, `Praha ${b}`), `${a} → ${b}`);
      assert.equal(generated.districtHops(`Praha ${a}`, `Praha ${b}`), frontHops(a, b));
    }
  }
  assert.equal(generated.districtForPoint(50.11, 14.21), 'Praha 1');
  assert.equal(generated.districtForPoint(null, null), null);
  assert.equal(generated.districtOfSchool({ latitude: 50.11, longitude: 14.21 }), 'Praha 1');
  assert.equal(generated.districtOfSchool(null), null);
});
