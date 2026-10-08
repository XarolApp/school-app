// Synthetic reproduction of the current AuthContext flush. No network/storage services.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/AuthContext.jsx'), 'utf8');
const start = source.indexOf('async function flushOnboardingStash(');
const end = source.indexOf('// Supabase reports auth failures');
assert.ok(start >= 0 && end > start, 'Re-review changed function boundaries before reuse');
let currentOwner = 'A';
let finishAnswerSave;
const answerSave = new Promise((resolve) => { finishAnswerSave = resolve; });
const writes = [];
const stash = { email: 'a@example.test', answers: { synthetic: true }, gender: 'f' };
const context = {
  readOnboardingStash: () => stash,
  saveOnboardingAnswers: async () => {
    writes.push({ operation: 'answers', owner: currentOwner });
    await answerSave;
  },
  updateProfile: async () => writes.push({ operation: 'gender', owner: currentOwner }),
  clearOnboardingStash: () => writes.push({ operation: 'clear-current-stash', owner: currentOwner }),
};
vm.createContext(context);
vm.runInContext('let flushInFlight = false;\n' + source.slice(start, end) + '\nthis.run = flushOnboardingStash;', context);
(async () => {
  const pending = context.run({ user: { id: 'A', email: stash.email } });
  currentOwner = 'B';
  finishAnswerSave();
  await pending;
  console.log(JSON.stringify({ scenario: 'A answer save finishes after switching to B', writes }, null, 2));
  assert.deepEqual(writes.map((w) => w.owner), ['A', 'B', 'B'], 'Control flow changed; re-review rather than treating old evidence as current');
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
