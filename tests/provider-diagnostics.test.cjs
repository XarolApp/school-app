const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function diagnostic(fetch) {
  const messages = [];
  const source = fs.readFileSync(path.join(__dirname, '../test-google-api.js'), 'utf8');
  const context = vm.createContext({
    require: () => ({ config() {} }),
    process: { env: { GOOGLE_GEMINI_API_KEYS: 'fake-key' } },
    console: { log: (...args) => messages.push(args.join(' ')), error: assert.fail },
    fetch,
  });
  // Skip the network-running entry point; exercise the actual diagnostic helper.
  vm.runInContext(source.replace(/main\(\);\s*$/, ''), context);
  return { run: () => context.testKey('fake-key', 0), messages };
}

test('a successful response with no text is reported without consuming its body twice', async () => {
  const check = diagnostic(async () => new Response(JSON.stringify({ candidates: [] })));
  assert.equal(await check.run(), false);
  assert.ok(check.messages.some((message) => message.includes('HTTP 200, no usable answer')));
  assert.ok(check.messages.every((message) => !/Body.*used|unusable/i.test(message)));
});

test('provider errors stay errors and do not print upstream credential details', async () => {
  const check = diagnostic(async () => new Response(JSON.stringify({ error: 'secret provider detail' }), { status: 403 }));
  assert.equal(await check.run(), false);
  assert.ok(check.messages.some((message) => message.includes('HTTP 403')));
  assert.ok(check.messages.every((message) => !message.includes('secret provider detail')));
});

test('usable text succeeds while invalid JSON and blank text do not', async () => {
  const good = diagnostic(async () => Response.json({ candidates: [{ content: { parts: [{ text: 'OK' }] } }] }));
  assert.equal(await good.run(), true);
  for (const response of [new Response('invalid JSON'), Response.json({ candidates: [{ content: { parts: [{ text: ' ' }] } }] })]) {
    const bad = diagnostic(async () => response);
    assert.equal(await bad.run(), false);
  }
});
