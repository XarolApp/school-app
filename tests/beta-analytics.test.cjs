const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeEvent, visitorTicket, verifyVisitorTicket, checklistFromEvents } = require('../lib/betaAnalytics');
const { feedbackDetails } = require('../lib/betaAnalytics');
test('feedback metadata ignores caller status/source and restricts screenshots to the owner', () => {
  const uuid = '00000000-0000-0000-0000-000000000000';
  const valid = feedbackDetails({ kind: 'text', text_before: 'before', text_after: 'after', source: 'micro', status: 'vyreseno',
    screenshot_path: uuid + '/' + uuid + '.jpg' }, uuid);
  assert.equal(valid.source, 'button');
  assert.equal(valid.status, undefined);
  assert.equal(feedbackDetails({ kind: 'bug', screenshot_path: 'other/' + uuid + '.jpg' }, uuid), null);
  assert.equal(feedbackDetails({ kind: 'text', text_after: 'x'.repeat(2001) }, uuid), null);
  assert.equal(feedbackDetails({ kind: 'bug', rect: { x: 0, y: 0, width: -1, height: 4 } }, uuid), null);
});
test('event allowlist rejects arbitrary names and oversized props; strips private/unknown fields', () => {
  assert.equal(sanitizeEvent({ name: 'email', path: '/', props: {} }), null);
  assert.equal(sanitizeEvent({ name: 'q_answer', path: '/', props: { arbitrary: 'a'.repeat(2050) } }), null);
  assert.deepEqual(sanitizeEvent({ name: 'q_answer', path: '/dotaznik', props: { key: 'body', skipped: false, body: 84, email: 'a@example.test', password: 'secret' } }),
    { name: 'q_answer', path: '/dotaznik', props: { key: 'body', skipped: false } });
  assert.equal(sanitizeEvent({ name: 'page_view', path: '/?email=secret', props: {} }), null);
  assert.equal(sanitizeEvent({ name: 'page_view', path: '/sdileni/private-token', props: {} }).path, '/sdileni/:token');
  assert.equal(sanitizeEvent({ name: 'js_error', path: '/', props: { message: 'User secret@example.test password leaked' } }).props.message, 'Chyba JavaScriptu');
});
test('anonymous invitation ticket is signed, expires, and binds the browser id', () => {
  const anon = '00000000-0000-0000-0000-000000000000';
  const ticket = visitorTicket('secret', 'SCHOOL', anon, 100);
  assert.equal(verifyVisitorTicket('secret', ticket, anon, 200).code, 'SCHOOL');
  assert.equal(verifyVisitorTicket('wrong', ticket, anon, 200), null);
  assert.equal(verifyVisitorTicket('secret', ticket, 'different', 200), null);
  assert.equal(verifyVisitorTicket('secret', ticket, anon, 86400101), null);
});
test('result events reject malformed school items without throwing', () => {
  for (const item of [null, false, 1, 'school', [], {}]) {
    assert.equal(sanitizeEvent({ name: 'result_view', path: '/skoly', props: { schools: [item] } }), null);
  }
  assert.deepEqual(sanitizeEvent({ name: 'result_view', path: '/skoly', props: { schools: [{ id: 1, rank: 1, ignored: 'value' }] } }),
    { name: 'result_view', path: '/skoly', props: { schools: [{ id: 1, rank: 1 }] } });
});
test('checklist counts unique schools and requires all five paywall screens', () => {
  const events = [1,1,2,3].map((id) => ({ name: 'school_open', props: { id } }));
  const state = checklistFromEvents(events);
  assert.equal(state.detail, true);
  assert.equal(state.school_ids.length, 3);
  assert.equal(checklistFromEvents(['hodnota','cesta','plan','zkusebni','platba'].map((screen) => ({ name: 'paywall_view', props: { screen } }))).platby, true);
});

test('ordinary visitors and normal accounts send ZERO events, even with a beta visit in storage', async () => {
  const { createBetaTracker } = await import('../frontend/src/lib/betaTrack.js');
  const values = new Map(), sent = [];
  const store = { getItem: (key) => values.get(key), setItem: (key,value) => values.set(key,value), removeItem: (key) => values.delete(key) };
  const tracker = createBetaTracker({ local: store, session: store, uuid: () => '00000000-0000-0000-0000-000000000000', send: async (value) => sent.push(value) });
  tracker.setAccount({ resolved: true, userId: null, tester: false });
  tracker.track('page_view'); await tracker.flush();
  assert.equal(values.size, 0);
  tracker.startVisit('SCHOOL',true); tracker.acceptTicket('ticket');
  tracker.setAccount({ resolved: true, userId: 'normal', tester: false, token: 'normal-token' });
  tracker.track('page_view'); tracker.track('q_finish', { run_id: 1 }); await tracker.flush(true);
  assert.equal(sent.length, 0);
  tracker.setAccount({ resolved: true, userId: 'beta', tester: true, noticeAccepted:true, token: 'beta-token' });
  tracker.track('page_view'); await tracker.flush();
  assert.equal(sent.length, 1);
});
