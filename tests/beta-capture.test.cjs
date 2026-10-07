const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../frontend/src/lib/betaCapture.js'), 'utf8');
const capture = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('screenshot masking clears fields and private identity before capture', async () => {
  const nodes = ['input', 'textarea', '[data-private]'].map((type) => ({
    type, value: 'private@example.test', textContent: 'Private name',
    attributes: { value: 'secret', placeholder: 'secret' },
    getBoundingClientRect: () => ({ width: 210, height: 42 }),
    removeAttribute(key) { delete this.attributes[key]; },
    style: { setProperty(key, value) { this[key] = value; } },
  }));
  (await capture).maskCaptureDocument({ querySelectorAll(selector) {
    assert.equal(selector, 'input,textarea,[data-private]'); return nodes;
  } });
  for (const node of nodes) {
    assert.equal(node.value, ''); assert.equal(node.textContent, '');
    assert.deepEqual(node.attributes, {});
    assert.equal(node.style.width, '210px'); assert.equal(node.style.height, '42px');
    assert.equal(node.style.background, 'var(--ink2)');
  }
});

test('marked element text removes private descendants and email addresses', async () => {
  let removed = 0;
  const element = { cloneNode: () => ({ textContent: 'Kontakt private@example.test',
    querySelectorAll(selector) { assert.equal(selector, 'input,textarea,[data-private]');
      return [{ remove() { removed++; } }]; },
  }) };
  assert.equal((await capture).publicElementText(element), 'Kontakt [soukromý údaj]');
  assert.equal(removed, 1);
});

test('text proposals retain their longer limit while redacting email addresses', async () => {
  const text = 'Kontakt private@example.test ' + 'popis '.repeat(40);
  const element = { cloneNode: () => ({ textContent: text, querySelectorAll: () => [] }) };
  const result = (await capture).publicElementText(element, 2000);
  assert.ok(result.length > 120);
  assert.ok(!result.includes('private@example.test'));
  assert.ok(result.includes('[soukromý údaj]'));
});

test('private elements cannot expose their own text to feedback selections', async () => {
  const element = { closest: () => ({}), cloneNode: () => { throw new Error('private text must not be read'); } };
  assert.equal((await capture).publicElementText(element, 2000), '');
});
