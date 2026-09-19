import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../frontend/node_modules/vite/dist/node/index.js';

// Use the app's existing resolver for its extensionless browser imports.
// No HTTP server, live API, database, or extra testing dependency is needed.
const cacheDir = await mkdtemp(join(tmpdir(), 'school-review-test-'));
const vite = await createServer({
  root: fileURLToPath(new URL('../frontend', import.meta.url)),
  configFile: false,
  cacheDir,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: 'custom',
});
after(async () => {
  await vite.close();
  await rm(cacheDir, { recursive: true, force: true });
});

const { cutoffForPick, analyseSet } = await vite.ssrLoadModule('/src/lib/admissionRisk.js');
const { groupProgramsByObor, summarizeCurrentYear } = await vite.ssrLoadModule('/src/lib/schoolPrograms.js');
const { setCompareSelection, getCompareSelection, toggleCompareSelection } = await vite.ssrLoadModule('/src/lib/searchPrefs.js');

test('adding a fifth comparison school is rejected without losing existing selections', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const storage = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } });
  try {
    setCompareSelection([1, 2, 3, 4]);
    assert.throws(() => toggleCompareSelection(5), /4 školy/);
    assert.deepEqual(getCompareSelection(), [1, 2, 3, 4]);
    assert.deepEqual(toggleCompareSelection(2), [1, 3, 4]);
    assert.deepEqual(toggleCompareSelection(5), [1, 3, 4, 5]);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});

test('a selected four-year program does not use the same-name six-year cutoff', () => {
  const school = {
    admission_cutoff: 78,
    school_programs: [
      { kkov: '79-41-K/61', obor_nazev: 'Gymnázium', rok: 2026, prihlasky: 833, cutoff: 75 },
      { kkov: '79-41-K/41', obor_nazev: 'Gymnázium', rok: 2026, prihlasky: 78, cutoff: 81 },
    ],
  };
  assert.equal(cutoffForPick({ obor_kkov: '79-41-K/41', obor_nazev: 'Gymnázium' }, school).cutoff, 81);
  assert.equal(cutoffForPick({ obor_kkov: '79-41-K/61' }, school).cutoff, 75);
  assert.equal(cutoffForPick({}, school).cutoff, 78);
});

test('an incomplete set of known cutoffs never claims all three schools are risky', () => {
  const picks = [90, null, null].map((cutoff) => ({ school: { admission_cutoff: cutoff } }));
  const result = analyseSet(picks, 50);
  assert.equal(result.verdict, 'chybiHranice');
  assert.equal(result.counts.risk, 1);
});

test('missing school data is distinguished from missing student points', () => {
  const picks = Array.from({ length: 3 }, () => ({ school: {} }));
  assert.equal(analyseSet(picks, 50).verdict, 'chybiHranice');
  assert.equal(analyseSet(picks, null).verdict, 'bezBodu');
  assert.equal(analyseSet(picks.slice(0, 2), 50).verdict, 'neuplne');
});

test('complete known risk data retains the existing verdicts', () => {
  const picks = (cutoffs) => cutoffs.map((cutoff) => ({ school: { admission_cutoff: cutoff } }));
  assert.equal(analyseSet(picks([80, 90, 85]), 50).verdict, 'vseRisk');
  assert.equal(analyseSet(picks([20, 25, 30]), 50).verdict, 'vseJistota');
  assert.equal(analyseSet(picks([30, 50, 80]), 50).verdict, 'vyvazene');
});

test('zero admitted remains zero and unknown counts remain null', () => {
  const [entry] = groupProgramsByObor({ school_programs: [
    { kkov: 'x', rok: 2026, kapacita: 30, prihlasky: 2, prijati: 0 },
    { kkov: 'x', rok: 2025, kapacita: null, prihlasky: null, prijati: null },
  ] });
  assert.equal(entry.latest.prijati, 0);
  assert.equal(entry.years[2025].prijati, null);
});

test('known zero applicants gives zero applicants per place', () => {
  const entries = groupProgramsByObor({ school_programs: [
    { kkov: 'x', rok: 2026, kapacita: 30, prihlasky: 0, prijati: 0 },
  ] });
  assert.equal(entries[0].ratio, 0);
  assert.equal(summarizeCurrentYear(entries).ratio, 0);
});
