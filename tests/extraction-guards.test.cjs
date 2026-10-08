const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../scripts/extract-school-details.js'), 'utf8');
const moduleStub = { exports: {} };
vm.runInNewContext(source.slice(0, source.lastIndexOf('\nmain().catch')) +
  '\nmodule.exports = { isVocationalSchool, FIELD_GUARDS, deriveDining, cleanStructureResult };', {
  module: moduleStub, __dirname: join(__dirname, '../scripts'),
  process: { argv: [], env: { SUPABASE_URL: 'synthetic', SUPABASE_SERVICE_ROLE_KEY: 'synthetic', OPENROUTER_API_KEY: 'synthetic' } },
  require(name) {
    if (name === 'dotenv') return { config() {} };
    if (name === '@supabase/supabase-js') return { createClient: () => ({}) };
    return require(name);
  },
});
const { isVocationalSchool, FIELD_GUARDS, deriveDining, cleanStructureResult } = moduleStub.exports;

test('official SOŠ type is recognized even though Š is not an ASCII word character', () => {
  assert.equal(isVocationalSchool(['SOŠ']), true);
  assert.equal(isVocationalSchool(['SOU']), true);
  assert.equal(isVocationalSchool(['Gymnázium']), false);
});

test('university placement accepts the Czech VŠ abbreviation', () => {
  assert.equal(FIELD_GUARDS.vs_uplatneni('80 % absolventů pokračuje na VŠ.'), true);
  assert.equal(FIELD_GUARDS.vs_uplatneni('Absolventi chodí na univerzitu.'), true);
  assert.equal(FIELD_GUARDS.vs_uplatneni('Absolventi zakládají firmy.'), false);
});

test('absence of an own canteen is unknown lunch provision, never a positive', () => {
  for (const text of [
    'Škola nemá vlastní jídelnu.',
    'Škola neprovozuje jídelnu.',
    'Škola jídelnu neprovozuje.',
    'Vlastní jídelnu nemáme.',
    'Jídelna není k dispozici.',
    'Vlastní jídelna se nenachází v budově školy.',
  ]) {
    assert.equal(deriveDining(text).value, null, text);
    const result = cleanStructureResult(
      { ma_jidelnu: true, evidence: { ma_jidelnu: text } },
      { ma_jidelnu: { usedText: text } }, ['ma_jidelnu'],
    );
    assert.equal(result.output.ma_jidelnu, null, 'A quoted denial must not rescue a model positive: ' + text);
  }
});

test('explicit own or arranged lunches remain positive and explicit no meals stays false', () => {
  for (const text of [
    'Škola má vlastní jídelnu.',
    'Máme vlastní jídelnu.',
    'Provozujeme školní jídelnu.',
    'Jídelna je k dispozici v budově školy.',
    'Nemáme vlastní jídelnu. Obědy jsou zajištěny v partnerské škole.',
    'Nemáme vlastní jídelnu, obědy jsou zajištěny v partnerské škole.',
  ]) assert.equal(deriveDining(text).value, true, text);
  assert.equal(deriveDining('Škola neposkytuje školní stravování.').value, false);
});

test('failed preservation or existing-record lookup aborts before model calls or writes', async () => {
  let modelCalls = 0;
  let writes = 0;
  const fixtureModule = { exports: {} };
  const client = { from(table) {
    return {
      select() { return this; },
      in() { return table === 'schools' ? Promise.resolve({ data: [{ id: 1, name: 'Fixture', school_programs: [] }], error: null }) : this; },
      ilike() { return Promise.resolve({ data: null, error: { message: 'lookup failed' } }); },
      not() { return Promise.resolve({ data: null, error: { message: 'existing lookup failed' } }); },
      upsert() { writes += 1; throw new Error('Unexpected write'); },
    };
  } };
  const testProcess = { argv: ['node', 'extract', '--school-id', '1'], env: { SUPABASE_URL: 'synthetic', SUPABASE_SERVICE_ROLE_KEY: 'synthetic', OPENROUTER_API_KEY: 'synthetic' } };
  vm.runInNewContext(source.slice(0, source.lastIndexOf('\nmain().catch')) + '\nmodule.exports = { main };', {
    module: fixtureModule, __dirname: join(__dirname, '../scripts'), console: { log() {} },
    process: testProcess,
    require(name) {
      if (name === 'dotenv') return { config() {} };
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === 'fs') return { existsSync: () => true, readFileSync: () => '{"1":{}}' };
      if (name === '../lib/aiUsage') return { logAiUsage() {}, fetchWithAiUsage() { modelCalls += 1; throw new Error('Unexpected model call'); } };
      return require(name);
    },
  });
  await assert.rejects(fixtureModule.exports.main(), /Could not read Cermat preservation records: lookup failed/);
  testProcess.argv = ['node', 'extract'];
  await assert.rejects(fixtureModule.exports.main(), /Could not read existing extraction records: existing lookup failed/);
  assert.equal(modelCalls, 0);
  assert.equal(writes, 0);
});
