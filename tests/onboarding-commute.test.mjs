import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../frontend/node_modules/vite/dist/node/index.js';

// quizQuestions.js uses extensionless browser imports, so load through the app's own resolver.
const cacheDir = await mkdtemp(join(tmpdir(), 'onboarding-commute-test-'));
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
const { rankSchools, scoreSchool, explain, tradeoffs } = await vite.ssrLoadModule('/src/lib/matching.js');
const { withCommuteMinutes } = await vite.ssrLoadModule('/src/lib/commute.js');
const { QUESTIONS, cleanAnswers, answerTags, reassuranceFor } = await vite.ssrLoadModule('/src/pages/onboarding/quizQuestions.js');

const require = createRequire(import.meta.url);
const server = require('../lib/commuteScore.js');
const { scoreSchools } = require('../lib/matching.js');
const { validateOnboardingAnswers, translateOnboardingAnswers, isScoreable } = require('../lib/onboardingAnswers.js');

const school = (id, minutes) => ({
  id, name: `Škola ${id}`, programs: '', location: 'Praha', commute_minutes: minutes,
  school_programs: [{ kkov: '79-41-K/41', maturitni: true, jazyk_studia: 'Český' }],
});
const only = (limit, strict, extra = {}) => ({ commuteStop: 'pid-1-a', commuteLimit: limit, commuteStrict: strict, ...extra });

test('with only the commute answered, the browser engine gives the server engine\'s number', () => {
  for (const limit of [1, 15, 20, 25, 45, 60]) {
    for (const strict of ['preference', 'dulezite', 'nutne', undefined]) {
      for (const minutes of [0, 10, 20, 24, 28, 35, 50, 90, null]) {
        const browser = scoreSchool(school(1, minutes), only(limit, strict)).score;
        const [serverMatch] = scoreSchools(
          { dojezd_zastavka: 'pid-1-a', dojezd_limit: limit, ...(strict ? { dojezd_prisnost: strict } : {}) },
          [{ id: 1, name: 'S', programs: '', school_programs: [], commute_minutes: minutes }],
        );
        assert.ok(Math.abs(browser * 100 - serverMatch.raw_score) <= 0.5 + 1e-9, `${minutes}/${limit}/${strict}: ${browser * 100} vs ${serverMatch.raw_score}`);
      }
    }
  }
});

test('the 20-minute worked example holds in the browser engine too', () => {
  const credit = (minutes) => scoreSchool(school(1, minutes), only(20, 'preference')).parts.commute.score;
  assert.equal(credit(18), 1);
  assert.ok(Math.abs(credit(28) - 0.5) < 0.02);
  assert.ok(Math.abs(credit(35) - 0.2) < 0.02);
  assert.equal(credit(50), 0);
});

test('unknown minutes never count as a no; known-far (null) does', () => {
  const unknown = scoreSchool(school(1, undefined), only(25, 'nutne', { focus: ['it'] }));
  assert.equal(unknown.parts.commute, undefined);
  assert.ok(unknown.missing.includes('commute'));
  const withoutCommute = scoreSchool(school(1, undefined), { focus: ['it'] });
  assert.equal(unknown.score, withoutCommute.score);
  const far = scoreSchool(school(1, null), only(25, 'nutne'));
  assert.equal(far.parts.commute.score, 0);
  // no limit (60+) or no stop: the component sits out entirely
  assert.equal(scoreSchool(school(1, 80), { commuteStop: 'pid-1-a' }).parts.commute, undefined);
  assert.equal(scoreSchool(school(1, 80), { commuteLimit: 25 }).parts.commute, undefined);
});

test('strictness orders the lineup like the server: must-have pushes a far school below a weak in-limit one', () => {
  const list = [school(1, 35), school(2, 24), school(3, 18), school(4, 15)];
  const order = (strict) => rankSchools(list, only(20, strict)).map((r) => r.school.id);
  assert.deepEqual(order('nutne').slice(0, 2), [3, 4].sort((a, b) => order('nutne').indexOf(a) - order('nutne').indexOf(b)));
  const nutne = order('nutne');
  assert.ok(nutne.indexOf(1) > nutne.indexOf(2));
  assert.ok(nutne.indexOf(2) > nutne.indexOf(3));
});

test('withCommuteMinutes: row numbers, null kept as known-far, missing entry stays undefined', () => {
  const out = withCommuteMinutes([{ id: 1 }, { id: 2 }, { id: 3 }], { 1: 12, 2: null });
  assert.equal(out[0].commute_minutes, 12);
  assert.equal(out[1].commute_minutes, null);
  assert.equal('commute_minutes' in out[2], false);
  const same = [{ id: 1 }];
  assert.equal(withCommuteMinutes(same, null), same);
});

// --- explanation copy ---------------------------------------------------------

test('explanation says the real MHD minutes and limit, in the right voice', () => {
  const inLimit = scoreSchool(school(1, 18), only(25, 'dulezite'));
  assert.ok(explain(inLimit, only(25), 'student').includes('Dojedeš tam MHD za cca 18 minut, tedy v tvém limitu 25 minut.'));
  assert.ok(explain(inLimit, only(25), 'parent').includes('Cesta MHD trvá cca 18 minut, tedy v limitu 25 minut, který jste nastavili.'));
  const one = scoreSchool(school(1, 1), only(2, 'dulezite'));
  assert.ok(explain(one, only(2), 'student').includes('Dojedeš tam MHD za cca 1 minutu, tedy v tvém limitu 2 minut.'));
});

test('over the limit is an honest neutral trade-off, never a match; null or missing says nothing', () => {
  const over = scoreSchool(school(1, 31), only(25, 'dulezite'));
  assert.ok(!explain(over, only(25), 'student').some((line) => /MHD/.test(line)));
  assert.ok(tradeoffs(over, 'student').includes('MHD tam trvá cca 31 minut, tedy nad tvým limitem 25 minut. Ověř si skutečné spojení.'));
  assert.ok(tradeoffs(over, 'parent').includes('Cesta MHD trvá cca 31 minut, tedy nad nastaveným limitem 25 minut. Skutečné spojení je potřeba ověřit.'));
  assert.ok(!over.basedOn.includes('dojezd MHD'));
  for (const minutes of [null, undefined]) {
    const result = scoreSchool(school(1, minutes), only(25, 'dulezite'));
    const lines = [...explain(result, only(25), 'student'), ...tradeoffs(result, 'student'), ...explain(result, only(25), 'parent'), ...tradeoffs(result, 'parent')];
    assert.deepEqual(lines.filter((line) => /MHD|dojezd|dojed|limit/i.test(line)), []);
  }
});

test('no sentence names a district any more', () => {
  const result = scoreSchool({ ...school(1, 10), district: 'Praha 5' }, { ...only(25, 'dulezite'), districts: ['5'] });
  const lines = [...explain(result, only(25), 'student'), ...tradeoffs(result, 'student')];
  assert.deepEqual(lines.filter((line) => /Prah|městsk/.test(line)), []);
});

// --- quiz definition and copy honesty -----------------------------------------

test('the quiz asks the commute question (not districts) and keeps its length', () => {
  assert.equal(QUESTIONS.length, 11);
  assert.ok(!QUESTIONS.some((q) => q.key === 'districts'));
  const commute = QUESTIONS.find((q) => q.type === 'commute');
  assert.equal(commute.key, 'commuteStop');
  assert.deepEqual(commute.strictOptions.map((o) => o.value), ['preference', 'dulezite', 'nutne']);
});

test('quiz copy makes no claim the product no longer meets', () => {
  const text = JSON.stringify(QUESTIONS);
  assert.doesNotMatch(text, /částí Prahy|městských částí|části Prahy/);
  assert.doesNotMatch(text, /minuty bychom si museli|což neděláme|to neděláme/);
  assert.doesNotMatch(text, /než adresa|než poloha/);
  // what it says instead is true: estimate, PID, saved only with the finished quiz
  const commute = QUESTIONS.find((q) => q.type === 'commute');
  assert.match(commute.honesty.student, /Neptáme se na adresu/);
  assert.match(commute.honesty.student, /až s dokončeným dotazníkem/);
  assert.match(commute.honesty.parent, /vašemu účtu/);
  assert.match(reassuranceFor(commute, 'pid-1-a', 'student'), /odhad/);
});

test('profile tags show the limit, never the stop id; cleaning keeps numbers and drops blanks', () => {
  const commute = QUESTIONS.find((q) => q.type === 'commute');
  assert.deepEqual(answerTags(commute, 'pid-1-a', 'student', { commuteLimit: 25 }), ['do 25 min MHD']);
  assert.deepEqual(answerTags(commute, 'pid-1-a', 'student', {}), ['bez časového limitu']);
  assert.deepEqual(answerTags(commute, '', 'student', {}), []);
  assert.deepEqual(cleanAnswers({ commuteStop: 'pid-1-a', commuteLimit: 25, commuteStrict: '', focus: ['nevim'] }), { commuteStop: 'pid-1-a', commuteLimit: 25 });
});

// --- saving the onboarding answers (server) -----------------------------------

const known = new Set(['pid-1-a']);
const validate = (raw) => validateOnboardingAnswers(raw, { isCommuteStop: (id) => known.has(id) });

test('onboarding save: only the stop id, a whole-minute limit and a strictness are stored', () => {
  const ok = validate({ commuteStop: 'pid-1-a', commuteLimit: 25, commuteStrict: 'nutne', focus: ['it'] });
  assert.equal(ok.ok, true);
  assert.deepEqual(translateOnboardingAnswers(ok.answers), {
    dojezd_zastavka: 'pid-1-a', dojezd_limit: 25, dojezd_prisnost: 'nutne', oblasti: ['it', 'technika'],
  });
  // a stale or unknown stop is dropped (the rest still saves), a bad limit is rejected
  assert.deepEqual(validate({ commuteStop: 'pid-gone', commuteLimit: 25, focus: ['it'] }).answers, { commuteLimit: 25, focus: ['it'] });
  assert.deepEqual(translateOnboardingAnswers(validate({ commuteStop: 'pid-gone', commuteLimit: 25, focus: ['it'] }).answers), { oblasti: ['it', 'technika'] });
  assert.equal(validate({ commuteStop: 'pid-1-a', commuteLimit: 61 }).ok, false);
  assert.equal(validate({ commuteStop: 'pid-1-a', commuteStrict: 'moc' }).ok, false);
  assert.equal(validateOnboardingAnswers({ commuteStop: 'pid-1-a' }).answers.commuteStop, undefined, 'no validator, no stored stop');
});

test('onboarding save: strictness needs a limit, a limit needs a stop, stop + limit is scoreable', () => {
  const t = (raw) => translateOnboardingAnswers(validate(raw).answers);
  assert.deepEqual(t({ commuteStop: 'pid-1-a', commuteStrict: 'nutne' }), { dojezd_zastavka: 'pid-1-a' });
  assert.deepEqual(t({ commuteLimit: 25, commuteStrict: 'nutne' }), {});
  assert.equal(isScoreable(t({ commuteStop: 'pid-1-a' })), false);
  assert.equal(isScoreable(t({ commuteStop: 'pid-1-a', commuteLimit: 25 })), true);
  // answers saved before this change still translate
  assert.deepEqual(t({ districts: ['5', '6'] }), { casti: ['Praha 5', 'Praha 6'] });
});
