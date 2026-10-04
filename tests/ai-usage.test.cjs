const { test } = require('node:test');
const assert = require('node:assert/strict');
const { logAiUsage, fetchWithAiUsage } = require('../lib/aiUsage');

test('cost ledger stores returned usage and keeps unknown cost unknown', async () => {
  const rows = [];
  const db = { from: () => ({ insert: (row) => {
    rows.push(row); return { select: () => ({ single: async () => ({ data: { id: 7 } }) }) };
  } }) };
  assert.equal(await logAiUsage(db, { source: 'questionnaire', model: 'test', userId: 'tester', runId: 9,
    usage: { prompt_tokens: 10, completion_tokens: 3, cost: 0.012 }, ok: true }), 7);
  assert.deepEqual(rows[0], { source: 'questionnaire', model: 'test', user_id: 'tester', run_id: 9,
    prompt_tokens: 10, completion_tokens: 3, cost_usd: 0.012, ok: true, error: null });
  await logAiUsage(db, { source: 'extract', model: 'test', usage: {}, ok: false });
  assert.equal(rows[1].cost_usd, null);
});

test('every OpenRouter HTTP call logs usage, including errors, without response text', async () => {
  const original = global.fetch;
  const logs = [];
  try {
    global.fetch = async () => new Response(JSON.stringify({ usage: { cost: 0.02 }, error: 'secret provider detail' }), { status: 429 });
    const response = await fetchWithAiUsage('https://example.test', {}, (result) => logs.push(result));
    assert.equal(response.status, 429);
    assert.deepEqual(logs, [{ usage: { cost: 0.02 }, ok: false, error: 'OpenRouter HTTP 429' }]);
    global.fetch = async () => { throw new Error('secret'); };
    await assert.rejects(fetchWithAiUsage('https://example.test', {}, (result) => logs.push(result)));
    assert.equal(logs[1].error, 'OpenRouter network failure');
  } finally { global.fetch = original; }
});
