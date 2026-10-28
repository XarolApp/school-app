// Run the real useDraft module with a minimal hook shim and an in-memory sessionStorage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../frontend/src/lib/useDraft.js'), 'utf8');

function load() {
  const store = new Map();
  const methods = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  // Object.keys(sessionStorage) is how the module enumerates its keys.
  const sessionStorage = new Proxy({}, {
    get: (_, name) => methods[name],
    ownKeys: () => [...store.keys()],
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  });
  const context = { sessionStorage, JSON, Object };
  // Single-component hook shim: state cell, refs, effects run immediately.
  let cell; let initialised = false; const refs = []; let refIndex = 0;
  const hooks = {
    useState: (init) => { if (!initialised) { cell = typeof init === 'function' ? init() : init; initialised = true; } return [cell, (next) => { cell = typeof next === 'function' ? next(cell) : next; }]; },
    useRef: (initial) => { const i = refIndex++ % 2; refs[i] = refs[i] || { current: initial }; return refs[i]; },
    useEffect: (fn) => { fn(); },
    useCallback: (fn) => fn,
  };
  Object.assign(context, hooks);
  vm.createContext(context);
  vm.runInContext(source.replace(/^import .*;\n/gm, '').replace(/\bexport (?=function|const)/g, '')
    + '\nthis.mod = { useDraft, syncDraftOwner, readDraft };', context);
  return { mod: context.mod, store, read: () => cell };
}

test('a mounted draft is reset, not re-persisted, when a different account takes over', () => {
  const h = load();
  h.mod.syncDraftOwner('A');
  const [, setValue] = h.mod.useDraft('snm.draft.test', 'prázdné');
  setValue('soukromý text A');
  h.store.set('snm.draft.test', JSON.stringify('soukromý text A'));

  h.mod.syncDraftOwner('B');
  assert.equal(h.store.has('snm.draft.test'), false, 'A\'s stored draft is wiped');
  assert.equal(h.read(), 'prázdné', 'the in-memory draft goes back to its initial value');
});

test('going from no account to an account keeps the draft', () => {
  const h = load();
  h.mod.useDraft('snm.draft.test', '');
  h.store.set('snm.draft.test', JSON.stringify('rozepsáno'));
  h.mod.syncDraftOwner(null);
  h.mod.syncDraftOwner('A');
  assert.equal(h.store.get('snm.draft.test'), JSON.stringify('rozepsáno'));
});
