const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAnswers } = require('../lib/questionnaire');
const { validateOnboardingAnswers } = require('../lib/onboardingAnswers');

const base = {
  typ: 'odborna', oblasti: ['it'], predmety: ['informatika'],
  styl: 'kombinace', po_skole: 'nevim', velikost: 'nezalezi', jazyky: 'stredne',
};
const malformed = [true, false, [], [12], {}, ' ', '\t\n'];

test('questionnaire and onboarding reject malformed numeric answer shapes', () => {
  for (const value of malformed) {
    assert.equal(validateAnswers({ ...base, body: value }).ok, false, JSON.stringify(value));
    assert.equal(validateOnboardingAnswers({ points: value }).ok, false, JSON.stringify(value));
  }
  assert.equal(validateOnboardingAnswers({ points: null }).ok, false);
});

test('numeric answers preserve scalar boundaries and existing optional omission', () => {
  for (const value of [0, 100, '0', '100', ' 12 ']) {
    const questionnaire = validateAnswers({ ...base, body: value });
    const onboarding = validateOnboardingAnswers({ points: value });
    assert.equal(questionnaire.ok, true);
    assert.equal(onboarding.ok, true);
    assert.equal(questionnaire.answers.body, Number(value));
    assert.equal(onboarding.answers.points, Number(value));
  }
  for (const value of ['', null, undefined]) {
    const result = validateAnswers({ ...base, body: value });
    assert.equal(result.ok, true);
    assert.equal(Object.hasOwn(result.answers, 'body'), false);
  }
  for (const value of ['', undefined]) {
    const result = validateOnboardingAnswers({ points: value });
    assert.equal(result.ok, true);
    assert.equal(Object.hasOwn(result.answers, 'points'), false);
  }
});
