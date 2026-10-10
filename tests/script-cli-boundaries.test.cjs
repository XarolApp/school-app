const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the actual scripts with synthetic credentials and blocked service/I/O
// dependencies. Invalid CLI values must fail before a query, paid call or write.
async function runScript(name, args) {
  const filename = path.join(__dirname, '..', 'scripts', name);
  const source = readFileSync(filename, 'utf8');
  const entry = source.lastIndexOf('main().catch(');
  assert.ok(entry > 0, `${name}: expected standalone main entry`);
  const operations = [];
  const boundary = (kind) => {
    operations.push(kind);
    throw new Error(`Blocked ${kind} boundary`);
  };
  const fakeFs = {
    existsSync: () => true,
    readFileSync: () => JSON.stringify({ 1: {}, 2: {} }),
    mkdirSync: () => boundary('filesystem write'),
    writeFileSync: () => boundary('filesystem write'),
  };
  class Firecrawl {
    async scrape() { return boundary('Firecrawl'); }
    async crawl() { return boundary('Firecrawl'); }
  }
  class Turndown { remove() {} }
  const context = vm.createContext({
    __dirname: path.dirname(filename), Buffer, URL, AbortSignal,
    console: { log() {}, error() {}, warn() {} },
    process: {
      argv: ['node', filename, ...args],
      env: { SUPABASE_URL: 'https://unused.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic',
        FIRECRAWL_API_KEY: 'synthetic', OPENROUTER_API_KEY: 'synthetic' },
      exit: () => { throw new Error('Unexpected process exit'); },
    },
    fetch: () => boundary('fetch'),
    setTimeout: () => boundary('timer'),
    require: (id) => {
      if (id === 'dotenv') return { config() {} };
      if (id === '@supabase/supabase-js') return {
        createClient: () => ({ from: () => boundary('Supabase') }),
      };
      if (id === 'firecrawl') return { Firecrawl };
      if (id === 'turndown') return Turndown;
      if (id === '../lib/aiUsage') return {
        fetchWithAiUsage: () => boundary('model'), logAiUsage: () => boundary('usage write'),
      };
      if (id === 'fs') return fakeFs;
      if (id === 'path' || id === 'crypto') return require(id);
      throw new Error(`Unexpected dependency ${id}`);
    },
  });
  let error;
  try {
    const main = vm.runInContext(`${source.slice(0, entry)}\nmain;`, context,
      { filename, timeout: 1000 });
    await main();
  } catch (caught) { error = caught; }
  return { error, operations };
}

const scripts = ['generate-school-proscons.js', 'extract-school-details.js',
  'scrape-schools.js', 'scrape-schools-free.js', 'backfill-school-websites.js'];
const invalidLimits = [[], ['abc'], ['-5'], ['0'], ['1.5'], ['Infinity'],
  ['9007199254740992'], ['--force']];

for (const name of scripts) {
  test(`${name}: invalid limits fail before service calls or writes`, async () => {
    for (const value of invalidLimits) {
      const result = await runScript(name, ['--limit', ...value]);
      assert.match(result.error?.message || '', /--limit.*positive integer/, value.join(' '));
      assert.deepEqual(result.operations, []);
    }
  });
  test(`${name}: positive and omitted limits reach the blocked work boundary`, async () => {
    for (const args of [[], ['--limit', '1']]) {
      const result = await runScript(name, args);
      assert.ok(result.operations.length > 0, result.error?.message);
      assert.doesNotMatch(result.error?.message || '', /--limit.*positive integer/);
    }
  });
}

for (const name of ['generate-school-proscons.js', 'extract-school-details.js']) {
  test(`${name}: missing/flag/blank model values fail before work`, async () => {
    for (const args of [['--model'], ['--model', '--force'], ['--model', ' ']]) {
      const result = await runScript(name, args);
      assert.match(result.error?.message || '', /--model requires/);
      assert.deepEqual(result.operations, []);
    }
  });
}

for (const name of ['extract-school-details.js', 'scrape-schools.js', 'scrape-schools-free.js']) {
  test(`${name}: missing/flag/blank school values do not fall back to all schools`, async () => {
    for (const args of [['--school-id'], ['--school-id', '--force'], ['--school-id', ' ']]) {
      const result = await runScript(name, args);
      assert.match(result.error?.message || '', /--school-id requires/);
      assert.deepEqual(result.operations, []);
    }
  });
}

test('extract structure mode retains limit and model validation before work', async () => {
  for (const value of invalidLimits) {
    const result = await runScript('extract-school-details.js', ['--structure', '--limit', ...value]);
    assert.match(result.error?.message || '', /--limit.*positive integer/);
    assert.deepEqual(result.operations, []);
  }
  for (const value of [[], ['--force'], [' ']]) {
    const result = await runScript('extract-school-details.js', ['--structure', '--model', ...value]);
    assert.match(result.error?.message || '', /--model requires/);
    assert.deepEqual(result.operations, []);
  }
});
