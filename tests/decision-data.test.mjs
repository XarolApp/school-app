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
const { escapeHtml } = await vite.ssrLoadModule('/src/lib/escapeHtml.js');
const { parseSchoolContact } = await vite.ssrLoadModule('/src/lib/schoolContact.js');
const { buildComparisonRows } = await vite.ssrLoadModule('/src/lib/comparisonRows.js');
const { scoreByWeights } = await vite.ssrLoadModule('/src/lib/decisionMatrix.js');

test('Leaflet labels keep HTML and attributes as literal text', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.equal(escapeHtml('Škola & "umění"'), 'Škola &amp; &quot;umění&quot;');
  assert.equal(escapeHtml("A'B"), 'A&#39;B');
});

test('mixed school contacts produce separate email and phone links', () => {
  assert.deepEqual(parseSchoolContact('perina@gopat.cz, 272 941 932'), [
    { type: 'email', label: 'perina@gopat.cz', href: 'mailto:perina@gopat.cz' },
    { type: 'phone', label: '272 941 932', href: 'tel:272941932' },
  ]);
  assert.deepEqual(parseSchoolContact('Telefon: +420 123 456 789'), [
    { type: 'phone', label: 'Telefon: +420 123 456 789', href: 'tel:+420123456789' },
  ]);
  assert.deepEqual(parseSchoolContact('sekretariát'), [
    { type: 'other', label: 'sekretariát', href: null },
  ]);
});

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
  const none = cutoffForPick({}, school);
  assert.equal(none.cutoff, null);
  assert.equal(none.needsObor, true);
  assert.equal(none.range, '75–81 b.');
});

test('a one-obor school needs no obor pick; a multi-obor school gets no averaged verdict', () => {
  const one = { school_programs: [{ kkov: 'x', rok: 2026, cutoff: 40 }] };
  assert.equal(cutoffForPick({}, one).cutoff, 40);
  const two = { school_programs: [{ kkov: 'x', rok: 2026, cutoff: 40 }, { kkov: 'y', rok: 2026, cutoff: 60 }] };
  assert.equal(analyseSet([{ school: one }, { school: one }, { school: two }], 50).verdict, 'chybiObor');
});

test('an incomplete set of known cutoffs never claims all three schools are risky', () => {
  const picks = [90, null, null].map((cutoff) => ({ school: { school_programs: [{ kkov: 'x', rok: 2026, cutoff }] } }));
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
  const picks = (cutoffs) => cutoffs.map((cutoff) => ({ school: { school_programs: [{ kkov: 'x', rok: 2026, cutoff }] } }));
  assert.equal(analyseSet(picks([80, 90, 85]), 50).verdict, 'vseRisk');
  assert.equal(analyseSet(picks([20, 25, 30]), 50).verdict, 'vseJistota');
  assert.equal(analyseSet(picks([30, 50, 80]), 50).verdict, 'vyvazene');
});

test('school admission is the newest year only: a cutoff range and a real acceptance ratio', async () => {
  const { summarizeAdmission, formatCutoffRange, schoolHistory } = await vite.ssrLoadModule('/src/lib/schoolPrograms.js');
  const school = { school_programs: [
    { kkov: 'x', obor_nazev: 'X', rok: 2025, prihlasky: 100, prijati: 10, cutoff: 70 },
    { kkov: 'x', obor_nazev: 'X', rok: 2026, prihlasky: 40, prijati: 10, cutoff: 35 },
    { kkov: 'y', obor_nazev: 'Y', rok: 2026, prihlasky: 60, prijati: 30, cutoff: 26 },
  ] };
  const adm = summarizeAdmission(school);
  assert.equal(adm.year, 2026);
  assert.equal(adm.isOld, false);
  assert.equal(formatCutoffRange(adm), '26–35 b.');
  assert.equal(adm.acceptance, 40);
  const old = summarizeAdmission({ school_programs: [{ kkov: 'x', rok: 2025, cutoff: 50 }] });
  assert.equal(old.isOld, true);
  assert.equal(formatCutoffRange(old), '50 b.');
  assert.equal(summarizeAdmission({}), null);
  const history = schoolHistory(groupProgramsByObor(school));
  assert.deepEqual(history.map((h) => [h.year, h.cutoffMin, h.cutoffMax]), [[2025, 70, 70], [2026, 26, 35]]);
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

test('decision tools read the founder from the newest school program year', () => {
  const schools = [
    {
      id: 1,
      school_programs: [
        { rok: 2025, zrizovatel: 'Soukromý', kkov: 'x' },
        { rok: 2026, zrizovatel: 'Hlavní město Praha', kkov: 'x' },
      ],
    },
    {
      id: 2,
      school_programs: [{ rok: 2026, zrizovatel: 'Soukromý', kkov: 'y' }],
    },
  ];

  const schoolRows = buildComparisonRows(schools).find((section) => section.id === 'skola').rows;
  assert.deepEqual(
    schoolRows.find((row) => row.id === 'zrizovatel').values.map((value) => value.text),
    ['Hlavní město Praha', 'Soukromý']
  );
  assert.deepEqual(
    schoolRows.find((row) => row.id === 'skolne').values.map((value) => value.text),
    ['Bez školného', 'Placená škola']
  );

  const ranked = scoreByWeights(schools, { skolne: 'zasadni' });
  assert.equal(ranked[0].school.id, 1);
  assert.equal(ranked[0].breakdown[0].raw, 1);
  assert.equal(ranked[1].breakdown[0].raw, 0);
});
