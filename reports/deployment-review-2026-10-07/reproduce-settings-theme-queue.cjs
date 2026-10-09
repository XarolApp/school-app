// Synthetic actual-handler reproduction. No browser, auth, API or database calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/Settings.jsx'), 'utf8');
const start = source.indexOf('  const saveThemePreference =');
const end = source.indexOf('  const handleDeleteShareLink =', start);
assert.ok(start >= 0 && end > start, 'Actual Settings callback must be found');
const ref = current => ({ current });
const base = () => ({ palette: 'znacka', mode: 'system' });
const revision = ref(0), saved = ref(base()), chosen = ref(base());
const queue = ref(Promise.resolve()), pending = [], calls = [];
let owner = 'A';
const context = {
  themeChangeRevisionRef: revision, savedThemeRef: saved,
  chosenThemeRef: chosen, themeSaveQueueRef: queue, themeClickRef: ref(null),
  PALETTE_IDS: ['znacka', 'zvyraznovac', 'smrk', 'terakota'],
  MODES: ['system', 'light', 'dark'],
  setThemePalette() {}, setThemeMode() {}, applyThemeAnimated() {},
  applyTheme() {}, toast() {}, refreshProfile: async () => {},
  updateProfile: async patch => {
    calls.push({ owner, patch });
    await new Promise(resolve => pending.push(resolve));
    return { theme_palette: patch.themePalette || 'znacka', theme_mode: patch.themeMode || 'system' };
  },
};
const save = vm.runInNewContext(source.slice(start, end) + '\nsaveThemePreference;', context);
const settle = () => new Promise(resolve => setImmediate(resolve));
(async () => {
  save('palette', 'zvyraznovac');
  save('palette', 'smrk');
  await settle();
  assert.equal(calls.length, 1);
  // Mirror the current account-change branch: replacing the queue ref does not
  // cancel continuations already chained onto its previous Promise.
  owner = 'B'; revision.current = 0; queue.current = Promise.resolve();
  saved.current = base(); chosen.current = base();
  pending.shift()();
  await settle();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    { owner: 'A', patch: { themePalette: 'zvyraznovac' } },
    { owner: 'B', patch: { themePalette: 'smrk' } },
  ]);
  pending.shift()();
  await settle();
  console.log(JSON.stringify({ reproduced: true, calls, limitation: 'Actual callback with synthetic request-time owner and account-ref reset; browser React fixture independently confirms the same sequence. No live write.' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
