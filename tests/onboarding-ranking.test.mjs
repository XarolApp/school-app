import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankSchools } from '../frontend/src/lib/matching.js';
import { deriveFeatures } from '../frontend/src/lib/schoolFeatures.js';

// Minimal rows shaped like GET /api/schools (slimmed school_programs).
const prog = (kkov, maturitni = true) => ({ kkov, maturitni, jazyk_studia: 'Český' });
const SCHOOLS = [
  { id: 1, name: 'Vyšší odborná škola oděvního návrhářství a Střední průmyslová škola oděvní', district: 'Praha 7', programs: '', school_programs: [prog('31-43-M/01')] },
  { id: 2, name: '1. IT Gymnázium, s.r.o.', district: 'Praha 9', programs: '', school_programs: [prog('79-41-K/41')] },
  { id: 3, name: 'Gymnázium, Praha 7, Nad Štolou 1', district: 'Praha 7', programs: '', school_programs: [prog('79-41-K/41')] },
  { id: 4, name: 'Střední odborná škola přírodovědná a Gymnázium', district: 'Praha 2', programs: '', school_programs: [prog('79-41-K/41'), prog('29-42-M/01')] },
  { id: 5, name: 'Smíchovská střední škola', district: 'Praha 5', programs: '', school_programs: [prog('18-20-M/01'), prog('79-41-K/41')] },
];

test('"průmyslová" alone does not make a school IT (2026-09-28 bug)', () => {
  assert.ok(!deriveFeatures(SCHOOLS[0]).focus.includes('it'));
});

test('"IT" as a word in a pure gymnázium name counts as IT focus', () => {
  assert.ok(deriveFeatures(SCHOOLS[1]).focus.includes('it'));
});

test('gymnázium + IT: the clothing school is never first; the IT gymnázium is', () => {
  const r = rankSchools(SCHOOLS, { focus: ['it'], studyType: 'gymnazium', future: 'vysoka' });
  assert.equal(r[0].school.id, 2);
  assert.ok(r.findIndex((x) => x.school.id === 1) > 1);
});

test('a mixed school cannot combine a gymnázium from one obor with a focus from another', () => {
  // School 4's gymnázium obor must not inherit "přírodovědná" from the SOŠ
  // half of the name; the science focus belongs to its 29-xx obor only.
  const obory = deriveFeatures(SCHOOLS[3]).obory;
  assert.deepEqual(obory.find((o) => o.type === 'gymnazium').focus, []);
  assert.ok(obory.find((o) => o.kkov === '29-42-M/01').focus.includes('prirodni'));
});

test('scores are per obor: the best-fitting obor is reported', () => {
  const r = rankSchools(SCHOOLS, { focus: ['it'], studyType: 'odborna' });
  assert.equal(r.find((x) => x.school.id === 5).bestObor, '18-20-M/01');
});

// --- optional points block (plan 017, 2026-09-29) ----------------------------
const withCutoff = (school, cutoff) => ({
  ...school,
  admission_cutoff: cutoff,
  school_programs: school.school_programs.map((p) => ({ ...p, cutoff })),
});

test('reserve: with points and "jistota", a school far below your points outranks one at the edge', () => {
  const easy = withCutoff(SCHOOLS[2], 40);
  const hard = withCutoff({ ...SCHOOLS[1], id: 20 }, 75);
  const r = rankSchools([easy, hard], { studyType: 'gymnazium', points: '65', reserve: 'jistota' });
  assert.equal(r[0].school.id, easy.id);
  assert.ok(r[0].parts.reserve.score > r[1].parts.reserve.score);
});

test('reserve: "ambice" prefers the school at the edge of your points over a far easier one', () => {
  const easy = withCutoff(SCHOOLS[2], 30);
  const edge = withCutoff({ ...SCHOOLS[1], id: 20 }, 66);
  const r = rankSchools([easy, edge], { studyType: 'gymnazium', points: '65', reserve: 'ambice' });
  assert.equal(r[0].school.id, edge.id);
});

test('reserve does not exist without points, and unanswered never lowers confidence', () => {
  const s = withCutoff(SCHOOLS[2], 50);
  const base = rankSchools([s], { studyType: 'gymnazium' })[0];
  assert.equal(base.parts.reserve, undefined);
  const noPoints = rankSchools([s], { studyType: 'gymnazium', reserve: 'jistota' })[0];
  assert.equal(noPoints.confidence, base.confidence);
  const noCutoff = rankSchools([{ ...SCHOOLS[2], admission_cutoff: null, school_programs: [prog('79-41-K/41')] }], { studyType: 'gymnazium', points: '65', reserve: 'jistota' })[0];
  assert.equal(noCutoff.parts.reserve, undefined);
});
