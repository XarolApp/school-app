const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(join(__dirname, '../scripts/extract-school-details.js'), 'utf8');
const moduleStub = { exports: {} };
vm.runInNewContext(source.slice(0, source.lastIndexOf('\nmain().catch')) +
  '\nmodule.exports = { isVocationalSchool, FIELD_GUARDS };', {
  module: moduleStub, __dirname: join(__dirname, '../scripts'),
  process: { env: { SUPABASE_URL: 'synthetic', SUPABASE_SERVICE_ROLE_KEY: 'synthetic', OPENROUTER_API_KEY: 'synthetic' } },
  require(name) {
    if (name === 'dotenv') return { config() {} };
    if (name === '@supabase/supabase-js') return { createClient: () => ({}) };
    return require(name);
  },
});
const { isVocationalSchool, FIELD_GUARDS } = moduleStub.exports;

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
