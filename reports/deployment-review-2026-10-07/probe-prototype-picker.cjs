// Execute only the repository's reference picker snippet against synthetic DOM
// objects. No browser, network, library install or application state is changed.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const paths = ['.agents/skills/prototype/PICKER.md', '.claude/skills/prototype/PICKER.md'];
const results = paths.map(file => {
  const raw = process.argv.includes('--baseline')
    ? execFileSync('git', ['show', 'HEAD:' + file], { cwd: root })
    : fs.readFileSync(path.join(root, file));
  const snippet = raw.toString().match(/```js\n([\s\S]*?)\n```/)[1];
  const cases = ['', '-1', '0', '999', '2.5', 'abc', '2', '3'].map(value => {
    const stage = { innerHTML: '' }, highlight = { style: {} };
    const items = Array.from({ length: 3 }, () => ({ offsetWidth: 60, offsetLeft: 4,
      toggleAttribute() {}, setAttribute() {}, removeAttribute() {}, addEventListener() {} }));
    const picker = { querySelector: selector => selector.includes('highlight') ? highlight : null,
      querySelectorAll: () => items, setAttribute() {} };
    let savedUrl;
    vm.runInNewContext(snippet, { document: { getElementById: () => stage,
      querySelector: () => picker, addEventListener() {} }, window: { addEventListener() {} },
      variants: [() => 'variant-1', () => 'variant-2', () => 'variant-3'],
      requestAnimationFrame: callback => callback(), URL, URLSearchParams,
      location: { search: '?v=' + value, toString: () => 'http://synthetic.test/?v=' + value },
      history: { replaceState: (_state, _title, url) => { savedUrl = String(url); } },
    });
    const expected = ['2', '3'].includes(value) ? 'variant-' + value : 'variant-1';
    if (process.argv.includes('--expect-fixed')) assert.equal(stage.innerHTML, expected, file + ' v=' + value);
    return { value, rendered: stage.innerHTML, expected, savedUrl: savedUrl || null };
  });
  return { file, sha256: crypto.createHash('sha256').update(raw).digest('hex'), cases };
});
console.log(JSON.stringify({ checkedAt: new Date().toISOString(),
  sourceRevision: process.argv.includes('--baseline') ? 'HEAD' : 'working tree',
  scope: 'Actual JS snippets with synthetic DOM and synchronous animation-frame callbacks. No application or browser acceptance.', results }, null, 2));
