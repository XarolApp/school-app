// Actual questionnaire modules, synthetic rows, fake fetch: never loads dotenv.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { QUESTIONS, validateAnswers, requestMatches, describeAnswers } = require('../../lib/questionnaire');
const base = { typ: 'odborna', oblasti: ['it'], predmety: ['informatika'], styl: 'kombinace', po_skole: 'nevim', velikost: 'nezalezi', jazyky: 'stredne' };
const schools = [
  ...Array.from({ length: 11 }, (_, i) => ({ id: i + 1, name: `Fixture ordinary IT school ${i + 1}`, programs: 'Informační technologie' })),
  { id: 99, name: 'Fixture secondary school for pupils with hearing disability', programs: 'Informační technologie', school_extracted_details: { urceno_pro_postizeni: ['sluchove'] } },
];
let bodies = [];
global.fetch = async (_url, options) => {
  const body = JSON.parse(options.body); bodies.push(body);
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ reasons: [{ school_id: 1, reason: 'Synthetic fixture explanation.' }] }) } }] }), { status: 200 });
};
(async () => {
  const answers = { ...base, postizeni: 'ano', postizeni_typ: ['sluchove'] };
  const validation = validateAnswers(answers);
  assert.equal(validation.ok, true);
  assert.deepEqual(validation.answers.postizeni_typ, ['sluchove']);
  assert.equal(QUESTIONS.find(q => q.id === 'postizeni').privateToServer, true);
  const directText = describeAnswers(validation.answers);
  assert.equal(directText.includes('postižení'), false);
  assert.equal(directText.includes('sluchove'), false);
  const noType = validateAnswers({ ...base, postizeni: 'ne', postizeni_typ: ['sluchove'] });
  assert.equal(noType.ok, true); assert.equal('postizeni_typ' in noType.answers, false);
  const args = { schools, apiKey: 'offline-fixture-not-a-key', model: 'fixture', referer: 'http://localhost', onUsage: null };
  const normal = await requestMatches({ ...args, answers: base });
  const needs = await requestMatches({ ...args, answers: validation.answers });
  const [normalPrompt, needsPrompt] = bodies.map(b => b.messages[1].content);
  assert.equal(normalPrompt.includes('hearing disability'), false);
  assert.equal(needsPrompt.includes('hearing disability'), true);
  assert.equal(needsPrompt.includes('sluchove'), false);
  assert.equal(needs.matches[0].school_id, 99);
  const out = { method: 'Actual current modules, 12 synthetic school rows, intercepted fake fetch; no real HTTP or environment secrets.',
    direct_private_answers_absent: true,
    no_answer_health_fields_validated_without_separate_consent_input: validation.answers,
    inactive_type_omitted_control: noType.answers,
    normal_ranking: normal.fullRanking,
    health_preference_ranking: needs.fullRanking,
    normal_prompt: normalPrompt, health_preference_prompt: needsPrompt,
    limitation: 'School ordering/name exposure supports a health-preference inference risk; it does not establish a diagnosis, actual provider inference, or a production disclosure.' };
  fs.writeFileSync('/private/tmp/questionnaire-health-offline-probe-2026-10-12.json', JSON.stringify(out, null, 2) + '\n');
  console.log(JSON.stringify(out, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
