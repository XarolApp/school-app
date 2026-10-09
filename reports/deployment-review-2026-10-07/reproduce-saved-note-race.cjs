// Execute the actual SavedCard persistence callback with a delayed simulated API.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/pages/SavedSchools.jsx'), 'utf8');
const start = source.indexOf('  const persist = async () => {');
const end = source.indexOf('  const programs =', start);
assert.ok(start >= 0 && end > start);
let text = 'First edit', release;
const pending = new Promise(resolve => { release = resolve; });
const statuses = [], writes = [];
const context = {
  text, school: { id: 1 }, lastSaved: { current: 'Previous note' },
  setStatus: status => statuses.push(status), setText: value => { text = value; },
  saveNote: async (id, body) => { writes.push({ id, body }); await pending; },
  deleteNote: async () => { throw new Error('Deletion must not occur'); }, toast() {},
};
const persist = vm.runInNewContext(source.slice(start, end) + '\npersist;', context);
(async () => {
  const request = persist();
  text = 'Newer edit typed before the first request finishes';
  const newerEdit = text;
  release(); await request;
  assert.equal(text, 'First edit');
  assert.equal(statuses.at(-1), 'saved');
  console.log(JSON.stringify({ reproduced: true, newerEdit, textAfterCompletion: text, writes, limitation: 'Actual callback, synthetic delayed API and later React state edit. No live note or account operation.' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
