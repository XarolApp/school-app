// Read-only synthetic reproduction of the actual component callback's merge.
// No React lifetime, network, model or database behavior is simulated as proven.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = readFileSync(resolve(__dirname, '../../frontend/src/components/schoolDetail/SchoolActions.jsx'), 'utf8');
const start = source.indexOf('  const handleExplain = async () => {');
const end = source.indexOf('  const handleShare = async () => {', start);
assert(start >= 0 && end > start);
const callback = source.slice(start, end);
let release;
const delayed = new Promise((done) => { release = done; });
let current = { active: { id: 'original-run', extra_reasons: {} } };
let requestedSchool;
const context = {
  school: { id: 101 },
  explanationLoading: false,
  setExplanationLoading() {},
  setExplanationError() {},
  explainQuestionnaireSchool(id) { requestedSchool = id; return delayed; },
  setQuestionnaire(updater) { current = updater(current); },
};
vm.createContext(context);
vm.runInContext(callback + '\nrunCallback = handleExplain;', context);
(async () => {
  const pending = context.runCallback();
  current = { active: { id: 'later-current-run', extra_reasons: {} } };
  release({ reason: 'Synthetic explanation based on the original run' });
  await pending;
  assert.equal(requestedSchool, 101);
  assert.equal(current.active.id, 'later-current-run');
  assert.equal(current.active.extra_reasons['101'], 'Synthetic explanation based on the original run');
  console.log(JSON.stringify({
    result: 'An older callback can merge its explanation into a later current run',
    requestedSchool, currentRun: current.active.id, cachedSchools: Object.keys(current.active.extra_reasons),
    limitation: 'The isolated actual callback assumes a later current state. A complete React account/route lifetime interleaving remains to verify.',
    externalCalls: 0, databaseWrites: 0,
  }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
