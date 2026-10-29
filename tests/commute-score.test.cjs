const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  commuteCredit,
  commuteMultiplier,
  graceMinutes,
  isCommuteLimit,
  STRICTNESS_P,
} = require('../lib/commuteScore');
const { scoreSchools, effectiveWeights } = require('../lib/matching');
const {
  QUESTIONS,
  validateAnswers,
  describeAnswers,
  questionApplies,
} = require('../lib/questionnaire');

const near = (actual, expected, tolerance, message) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message || ''} expected ${expected} +-${tolerance}, got ${actual}`);

test('credit: the 20-minute worked example from the plan', () => {
  for (const t of [0, 10, 18, 20]) assert.equal(commuteCredit(t, 20), 1);
  near(commuteCredit(22, 20), 0.856, 0.02, '22 min');
  near(commuteCredit(25, 20), 0.664, 0.02, '25 min');
  near(commuteCredit(28, 20), 0.5, 0.02, '28 min');
  near(commuteCredit(30, 20), 0.402, 0.02, '30 min');
  near(commuteCredit(35, 20), 0.2, 0.02, '35 min');
  near(commuteCredit(40, 20), 0.084, 0.02, '40 min');
  assert.equal(commuteCredit(50, 20), 0);
});

test('credit generalises to any whole-minute limit', () => {
  // G = clamp(1.5 T, 20, 40): 1-13 -> 20, 14-26 -> 1.5 T, 27+ -> 40
  assert.equal(graceMinutes(5), 20);
  assert.equal(graceMinutes(20), 30);
  assert.equal(graceMinutes(40), 40);
  assert.equal(graceMinutes(60), 40);
  for (let limit = 1; limit <= 60; limit += 1) {
    const grace = graceMinutes(limit);
    assert.equal(commuteCredit(limit, limit), 1, `limit ${limit}`);
    assert.equal(commuteCredit(limit + grace, limit), 0, `limit ${limit} reaches 0 at T+G`);
    // Same relative position inside the grace window -> same credit.
    near(commuteCredit(limit + grace / 2, limit), Math.pow(0.5, 2.25), 1e-9, `limit ${limit} halfway`);
  }
  near(commuteCredit(45, 30), Math.pow(1 - 15 / 40, 2.25), 1e-9);
});

test('credit is monotone non-increasing in minutes for every limit and null is known-far', () => {
  for (let limit = 1; limit <= 60; limit += 1) {
    let previous = 1;
    for (let t = 0; t <= 120; t += 1) {
      const value = commuteCredit(t, limit);
      assert.ok(value <= previous + 1e-12, `limit ${limit} minute ${t}`);
      assert.ok(value >= 0 && value <= 1);
      previous = value;
    }
  }
  assert.equal(commuteCredit(null, 30), 0);
});

test('multiplier ramps in over 10 minutes past the limit', () => {
  const at = (t) => commuteMultiplier(t, 20, 'nutne');
  assert.equal(at(20), 1);
  near(at(21), 0.99, 0.01);
  near(at(23), 0.89, 0.01);
  near(at(25), 0.75, 0.01);
  near(at(28), 0.55, 0.01);
  near(at(30), 0.5, 0.01);
  assert.equal(at(45), 0.5);
  assert.equal(commuteMultiplier(null, 20, 'nutne'), 0.5);
  assert.equal(commuteMultiplier(null, 20, 'dulezite'), 0.75);
  assert.equal(commuteMultiplier(60, 20, 'preference'), 1);
  assert.deepEqual(STRICTNESS_P, { preference: 0, dulezite: 0.25, nutne: 0.5 });
  // An unknown strictness falls back to the default instead of crashing.
  assert.equal(commuteMultiplier(60, 20, 'bogus'), 0.75);
});

test('limit validation: whole minutes 1-60', () => {
  assert.equal(isCommuteLimit(1), true);
  assert.equal(isCommuteLimit(60), true);
  for (const bad of [0, 61, 25.5, '25', null, undefined, NaN]) assert.equal(isCommuteLimit(bad), false);
});

// --- questionnaire definition & validation ----------------------------------

const base = { typ: 'odborna', oblasti: ['it'], predmety: ['informatika'], styl: 'kombinace', po_skole: 'nevim', velikost: 'nezalezi', jazyky: 'stredne' };
const stops = new Set(['pid-1-a', 'pid-2-b']);
const validate = (answers) => validateAnswers({ ...base, ...answers }, { isCommuteStop: (id) => stops.has(id) });

test('the district question is gone; the three commute questions are listed once, in order', () => {
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(ids.includes('casti'), false);
  assert.equal(new Set(ids).size, ids.length);
  const [stop, limit, strict] = ['dojezd_zastavka', 'dojezd_limit', 'dojezd_prisnost'].map((id) => QUESTIONS.find((q) => q.id === id));
  assert.equal(stop.type, 'stop');
  assert.equal(limit.min, 1);
  assert.equal(limit.max, 60);
  assert.deepEqual(strict.options.map((o) => o.value), ['preference', 'dulezite', 'nutne']);
  assert.ok([stop, limit, strict].every((q) => q.privateToServer && q.optional));
  assert.ok(ids.indexOf('dojezd_zastavka') < ids.indexOf('dojezd_limit') && ids.indexOf('dojezd_limit') < ids.indexOf('dojezd_prisnost'));
});

test('valid commute answers pass; unknown stop is rejected; a stop cannot be checked without a validator', () => {
  const ok = validate({ dojezd_zastavka: 'pid-1-a', dojezd_limit: 25, dojezd_prisnost: 'nutne' });
  assert.equal(ok.ok, true);
  assert.equal(ok.answers.dojezd_zastavka, 'pid-1-a');
  assert.equal(ok.answers.dojezd_limit, 25);
  assert.equal(ok.answers.dojezd_prisnost, 'nutne');

  assert.equal(validate({ dojezd_zastavka: 'pid-nope' }).ok, false);
  assert.equal(validate({ dojezd_zastavka: 'pid-1-a', dojezd_limit: 61 }).ok, false);
  assert.equal(validate({ dojezd_zastavka: 'pid-1-a', dojezd_limit: 0 }).ok, false);
  assert.equal(validate({ dojezd_zastavka: 'pid-1-a', dojezd_limit: 12.5 }).ok, false);
  assert.equal(validate({ dojezd_zastavka: 'pid-1-a', dojezd_limit: 10, dojezd_prisnost: 'moc' }).ok, false);

  const unchecked = validateAnswers({ ...base, dojezd_zastavka: 'pid-1-a', dojezd_limit: 25 });
  assert.equal(unchecked.ok, true);
  assert.equal('dojezd_zastavka' in unchecked.answers, false, 'unverifiable stop is dropped, never stored');
  assert.equal('dojezd_limit' in unchecked.answers, false);
});

test('a limit without a stop and a strictness without a limit are stripped', () => {
  const noStop = validate({ dojezd_limit: 25, dojezd_prisnost: 'nutne' });
  assert.equal(noStop.ok, true);
  assert.equal('dojezd_limit' in noStop.answers, false);
  assert.equal('dojezd_prisnost' in noStop.answers, false);

  const noLimit = validate({ dojezd_zastavka: 'pid-1-a', dojezd_prisnost: 'nutne' });
  assert.equal(noLimit.ok, true);
  assert.equal(noLimit.answers.dojezd_zastavka, 'pid-1-a');
  assert.equal('dojezd_prisnost' in noLimit.answers, false, '60+ (no limit) keeps no strictness');
});

test('showIf present: true means answered at all', () => {
  const q = { showIf: { field: 'a', present: true } };
  assert.equal(questionApplies(q, {}), false);
  assert.equal(questionApplies(q, { a: '' }), false);
  assert.equal(questionApplies(q, { a: 'x' }), true);
  assert.equal(questionApplies(q, { a: 0 }), true);
  assert.equal(questionApplies({ showIf: { field: 'a', equals: 'x' } }, { a: 'x' }), true);
});

test('a stored run that still carries the removed district answer loads, validates and scores', () => {
  // The old question is not in QUESTIONS: validation never reads it, so a
  // resubmitted old answer set just loses the key.
  const resubmitted = validate({ casti: ['Praha 5'], dojezd_zastavka: 'pid-1-a' });
  assert.equal(resubmitted.ok, true);
  assert.equal('casti' in resubmitted.answers, false);

  // Scoring a stored run does not throw and still honours the field exactly as before.
  const schools = [
    { id: 1, name: 'A', programs: 'Gymnázium', school_programs: [], district: 'Praha 5' },
    { id: 2, name: 'B', programs: 'Gymnázium', school_programs: [], district: 'Praha 9' },
  ];
  const ranked = scoreSchools({ typ: 'gymnazium', casti: ['Praha 5'] }, schools);
  assert.equal(ranked[0].school_id, 1);
  assert.equal(effectiveWeights({}).casti, 20);
});

test('describeAnswers never narrates commute answers to the AI', () => {
  const text = describeAnswers({ ...base, dojezd_zastavka: 'pid-1-a', dojezd_limit: 25, dojezd_prisnost: 'nutne' });
  assert.doesNotMatch(text, /dojezd|MHD|zastáv|pid-1-a|25|Nutnost|přísn/i);
});

// --- scoring -----------------------------------------------------------------

const mk = (id, programs, minutes, extra = {}) => ({
  id, name: `S${id}`, location: 'Praha', programs, school_programs: [], commute_minutes: minutes, ...extra,
});
const withCommute = (strictness) => ({
  oblasti: ['it'], dojezd_zastavka: 'pid-1-a', dojezd_limit: 20, ...(strictness ? { dojezd_prisnost: strictness } : {}),
});
const order = (answers, list) => scoreSchools(answers, list).map((m) => m.school_id);

// IT-fit schools at 35 / 24 min, a weak-fit school (general gymnázium) inside the limit,
// a no-fit school inside the limit, and a perfect-fit school the matrix calls unreachable.
const lineup = () => [
  mk(1, 'Informační technologie', 35),
  mk(2, 'Informační technologie', 24),
  mk(3, 'Gymnázium', 18),
  mk(4, 'Kuchař', 15),
  mk(5, 'Informační technologie', null),
];

test('strictness changes the order the way the plan describes', () => {
  // preference: decay only, a great school 15 minutes over stays above weak in-limit ones
  assert.deepEqual(order(withCommute('preference'), lineup()), [2, 1, 5, 3, 4]);
  // important (also the default): far schools drop below the weak in-limit one
  assert.deepEqual(order(withCommute('dulezite'), lineup()), [2, 1, 3, 5, 4]);
  assert.deepEqual(order(withCommute(), lineup()), order(withCommute('dulezite'), lineup()));
  // must-have: the 35-minute near-perfect school falls below the in-limit weak fit
  assert.deepEqual(order(withCommute('nutne'), lineup()), [2, 3, 1, 4, 5]);
});

test('dojezd breakdown equals the credit; signals carry minutes but never the stop', () => {
  const ranked = scoreSchools(withCommute('nutne'), lineup());
  const by = Object.fromEntries(ranked.map((m) => [m.school_id, m]));
  near(by[1].breakdown.dojezd, 0.21, 0.01);
  near(by[2].breakdown.dojezd, 0.72, 0.01);
  assert.equal(by[3].breakdown.dojezd, 1);
  assert.equal(by[5].breakdown.dojezd, 0);
  assert.ok(by[3].signals.includes('dojedeš tam MHD za cca 18 min, tedy v tvém limitu 20 min'));
  assert.ok(!by[1].signals.some((s) => /MHD/.test(s)));
  // the stop itself never appears in a signal or note
  for (const match of ranked) assert.ok([...match.signals, ...match.notes].every((s) => !/pid-|zastáv/i.test(s)));
});

test('unknown commute (no column) sits out; answers without commute score exactly as before', () => {
  const noColumn = mk(9, 'Informační technologie', undefined);
  const hit = scoreSchools(withCommute('nutne'), [noColumn])[0];
  assert.equal('dojezd' in hit.breakdown, false);
  assert.equal(hit.score, 100);

  const plain = { oblasti: ['it'], typ: 'odborna' };
  const list = lineup();
  const stripped = list.map(({ commute_minutes, ...school }) => school);
  assert.deepEqual(scoreSchools(plain, list), scoreSchools(plain, stripped));

  // A stop and strictness without a limit (the slider's 60+) is also inert.
  const noLimit = { oblasti: ['it'], dojezd_zastavka: 'pid-1-a', dojezd_prisnost: 'nutne' };
  assert.deepEqual(scoreSchools(noLimit, list), scoreSchools({ oblasti: ['it'] }, list));
});

test('the commute weight follows the "what vs where" answer', () => {
  assert.equal(effectiveWeights({}).dojezd, 20);
  assert.equal(effectiveWeights({ priorita_nabidka_misto: 'misto' }).dojezd, 36);
  assert.equal(effectiveWeights({ priorita_nabidka_misto: 'nabidka' }).dojezd, 10);
});

test('a paid school outside a must-have limit stacks both penalties', () => {
  const paid = mk(7, 'Informační technologie', null, { school_programs: [{ zrizovatel: 'Soukromá škola' }] });
  const free = mk(8, 'Informační technologie', null);
  const answers = { ...withCommute('nutne'), skolne: 'ne' };
  const [a, b] = ['7', '8'].map((id) => scoreSchools(answers, [paid, free]).find((m) => String(m.school_id) === id).raw_score);
  assert.ok(a < b);
  near(a, b * 0.5, 1);
});

// --- explanation texts: MHD minutes instead of districts ---------------------

const { describeMatches, requestReasons } = require('../lib/questionnaire');

const stopAnswers = (limit) => ({ oblasti: ['it'], dojezd_zastavka: 'pid-286-haje', dojezd_limit: limit });

test('signals state the real MHD minutes and the limit; over the limit is a neutral note, not a match', () => {
  const ranked = scoreSchools(stopAnswers(25), [mk(1, 'Informační technologie', 18), mk(2, 'Informační technologie', 31)]);
  const by = Object.fromEntries(ranked.map((m) => [m.school_id, m]));
  assert.deepEqual(by[1].signals.filter((s) => /MHD/.test(s)), ['dojedeš tam MHD za cca 18 min, tedy v tvém limitu 25 min']);
  assert.deepEqual(by[1].notes, []);
  assert.deepEqual(by[2].signals.filter((s) => /MHD|limit/.test(s)), []);
  assert.deepEqual(by[2].notes, ['MHD tam trvá cca 31 min, tedy nad tvým limitem 25 min']);
});

test('null or missing minutes say nothing about commute', () => {
  for (const minutes of [null, undefined]) {
    const [match] = scoreSchools(stopAnswers(25), [mk(1, 'Informační technologie', minutes)]);
    assert.deepEqual(match.signals.filter((s) => /MHD|dojezd|limit/i.test(s)), []);
    assert.deepEqual(match.notes, []);
  }
});

test('a district no longer produces an explanation sentence, old run or not', () => {
  const school = { id: 1, name: 'A', programs: 'Gymnázium', school_programs: [], district: 'Praha 5' };
  const [match] = scoreSchools({ typ: 'gymnazium', casti: ['Praha 5'] }, [school]);
  assert.equal(match.signals.some((s) => /Prah/.test(s)), false);
});

test('the AI input carries minutes and limit but never the stop, and tells the model not to invent times', async () => {
  const answers = stopAnswers(25);
  const schools = [mk(1, 'Informační technologie', 18), mk(2, 'Informační technologie', 31)];
  const ranked = scoreSchools(answers, schools);
  const byId = new Map(schools.map((s) => [s.id, s]));
  const text = describeMatches(ranked, byId, { fullOrder: ranked, answers });
  assert.match(text, /dojedeš tam MHD za cca 18 min, tedy v tvém limitu 25 min/);
  assert.match(text, /poznámky \(neutrální, ne shoda\): MHD tam trvá cca 31 min, tedy nad tvým limitem 25 min/);
  assert.doesNotMatch(text, /pid-286|haje|zastávk/i);

  const sent = [];
  const realFetch = global.fetch;
  global.fetch = async (url, init) => {
    sent.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ reasons: [{ school_id: 1, reason: 'Text.' }] }) } }], usage: {} }), { status: 200 });
  };
  try {
    await requestReasons({ answers, shortlist: ranked.slice(0, 1), byId, apiKey: 'k', model: 'm', referer: 'http://x', fullOrder: ranked, nameById: byId });
  } finally {
    global.fetch = realFetch;
  }
  const body = JSON.stringify(sent[0]);
  assert.doesNotMatch(body, /pid-286|haje|zastávk/i);
  assert.match(body, /Žádné minuty nevymýšlej, nezaokrouhluj ani nepřepočítávej/);
  assert.match(body, /v tvém limitu 25 min/);
  assert.doesNotMatch(body, /Praha 12|leží v Praze/);
});
