const { test } = require('node:test');
const assert = require('node:assert/strict');
const { registerCreatorLinks, sha256 } = require('../lib/creatorLinks');
const { CREATOR_DEMO_ANSWERS } = require('../lib/creatorDemo');
const { validateOnboardingAnswers, translateOnboardingAnswers, isScoreable } = require('../lib/onboardingAnswers');
const { loadBetaData } = require('../lib/betaAdmin');

const TOKEN = 'A'.repeat(43);
const DEVICE = 'a'.repeat(64);

function setup({ rpc = { data: [{ result: 'not_found', user_id: null }], error: null }, secret = 'secret', nodeEnv = 'test' } = {}) {
  const routes = new Map();
  const rpcCalls = [];
  const generateCalls = [];
  const app = {};
  for (const method of ['get', 'post']) {
    app[method] = (path, ...handlers) => routes.set(`${method} ${path}`, handlers);
  }
  const db = {
    rpc: async (name, args) => { rpcCalls.push({ name, args }); return rpc; },
    auth: { admin: {
      getUserById: async () => ({ data: { user: { email: 'creator@stredninamiru.cz' } }, error: null }),
      generateLink: async (args) => { generateCalls.push(args); return { data: { properties: { hashed_token: 'magic-hash' } }, error: null }; },
    } },
    from: () => { throw new Error('Database access should not happen in this test.'); },
  };
  const pass = (_req, _res, next) => next();
  const env = { secret: process.env.CREATOR_CLAIM_SECRET, nodeEnv: process.env.NODE_ENV };
  if (secret == null) delete process.env.CREATOR_CLAIM_SECRET;
  else process.env.CREATOR_CLAIM_SECRET = secret;
  if (nodeEnv == null) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;
  registerCreatorLinks(app, db, { requireAuth: pass, requireAdmin: pass, saveOnboardingRun: async () => ({ status: 201, body: { saved: true }, matches: [] }) });
  return {
    routes, rpcCalls, generateCalls,
    async call(method, path, { body = {}, headers = {} } = {}) {
      const handlers = routes.get(`${method} ${path}`);
      assert.ok(handlers, `missing route ${method} ${path}`);
      const request = { body, headers, params: {}, get: (name) => headers[name.toLowerCase()] || headers[name] };
      const response = { statusCode: 200, headers: {}, set(name, value) { this.headers[name.toLowerCase()] = value; return this; }, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; }, end() { return this; } };
      await handlers.at(-1)(request, response);
      return response;
    },
    restoreEnv() {
      if (env.secret == null) delete process.env.CREATOR_CLAIM_SECRET;
      else process.env.CREATOR_CLAIM_SECRET = env.secret;
      if (env.nodeEnv == null) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = env.nodeEnv;
    },
  };
}

test('creator claim requires the configured secret and fails closed in production when unset', async () => {
  const configured = setup({ secret: 'secret' });
  try {
    const denied = await configured.call('post', '/api/creator/claim', { body: { token: TOKEN, device: DEVICE } });
    assert.equal(denied.statusCode, 403);
    assert.equal(configured.rpcCalls.length, 0);
  } finally { configured.restoreEnv(); }

  const production = setup({ secret: null, nodeEnv: 'production' });
  try {
    const denied = await production.call('post', '/api/creator/claim', { body: { token: TOKEN, device: DEVICE } });
    assert.equal(denied.statusCode, 403);
    assert.equal(production.rpcCalls.length, 0);
  } finally { production.restoreEnv(); }
});

test('unknown creator token returns 404 and never generates a magic link', async () => {
  const h = setup({ rpc: { data: [{ result: 'not_found', user_id: null }], error: null } });
  try {
    const response = await h.call('post', '/api/creator/claim', {
      headers: { 'X-Creator-Claim-Secret': 'secret' }, body: { token: TOKEN, device: DEVICE, userAgent: 'Browser' },
    });
    assert.equal(response.statusCode, 404);
    assert.deepEqual(h.generateCalls, []);
  } finally { h.restoreEnv(); }
});

test('creator device claim hashes identifiers, truncates user agent, and handles blocked and accepted devices', async () => {
  const blocked = setup({ rpc: { data: [{ result: 'blocked', user_id: null }], error: null } });
  try {
    const response = await blocked.call('post', '/api/creator/claim', {
      headers: { 'X-Creator-Claim-Secret': 'secret' }, body: { token: TOKEN, device: DEVICE, userAgent: 'X'.repeat(250) },
    });
    assert.equal(response.statusCode, 409);
    assert.deepEqual(blocked.rpcCalls[0].args, {
      p_token_hash: sha256(TOKEN), p_device_hash: sha256(DEVICE), p_user_agent: 'X'.repeat(200),
    });
    assert.equal(blocked.generateCalls.length, 0);
  } finally { blocked.restoreEnv(); }

  const accepted = setup({ rpc: { data: [{ result: 'ok', user_id: 'creator-id' }], error: null } });
  try {
    const response = await accepted.call('post', '/api/creator/claim', {
      headers: { 'X-Creator-Claim-Secret': 'secret' }, body: { token: TOKEN, device: DEVICE, userAgent: 'Browser' },
    });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { tokenHash: 'magic-hash' });
    assert.equal(accepted.generateCalls[0].type, 'magiclink');
  } finally { accepted.restoreEnv(); }
});

test('every creator-management route is behind both auth and admin guards', async () => {
  const routes = new Map();
  const calls = [];
  const app = {};
  for (const method of ['get', 'post']) app[method] = (path, ...handlers) => routes.set(`${method} ${path}`, handlers);
  const requireAuth = (_req, _res, next) => next();
  const requireAdmin = (_req, res) => res.status(403).json({ error: 'forbidden' });
  const db = { from: () => { calls.push('db'); throw new Error('unexpected db call'); } };
  registerCreatorLinks(app, db, { requireAuth, requireAdmin, saveOnboardingRun: async () => ({}) });

  for (const path of [
    ['get', '/api/admin/creators'],
    ['post', '/api/admin/creators'],
    ['post', '/api/admin/creators/:id/rotate'],
    ['post', '/api/admin/creators/:id/reset-devices'],
    ['post', '/api/admin/creators/:id/revoke'],
    ['post', '/api/admin/creators/:id/restore'],
  ]) {
    const handlers = routes.get(path.join(' '));
    assert.equal(handlers.length, 3, path.join(' '));
    const request = { body: {}, headers: {}, params: { id: '00000000-0000-0000-0000-000000000001' } };
    const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    let nextPromise;
    await handlers[1](request, response, () => { nextPromise = handlers[2](request, response); });
    if (nextPromise) await nextPromise;
    assert.equal(response.statusCode, 403, path.join(' '));
  }
  assert.deepEqual(calls, []);
});

test('creator preview demo answers pass validation and can be scored', () => {
  const validation = validateOnboardingAnswers(CREATOR_DEMO_ANSWERS);
  assert.equal(validation.ok, true);
  assert.equal(isScoreable(translateOnboardingAnswers(validation.answers)), true);
});

test('beta admin drops creator rows but keeps rows with no user', async () => {
  const rows = {
    users: [{ id: 'beta-a', subscription_status: 'beta' }, { id: 'creator-a', subscription_status: 'creator' }],
    beta_events: [{ id: 1, user_id: 'beta-a' }, { id: 2, user_id: null }, { id: 3, user_id: 'creator-a' }],
    ai_usage_log: [{ id: 1, user_id: null }, { id: 2, user_id: 'creator-a' }],
    questionnaire_runs: [{ id: 1, user_id: 'creator-a' }, { id: 2, user_id: 'beta-a' }],
  };
  const db = { from(table) {
    let status;
    const chain = new Proxy({}, { get(_target, method) {
      if (method === 'then') return (resolve, reject) => Promise.resolve({
        data: table === 'users' ? rows.users.filter((user) => user.subscription_status === status) : rows[table] || [],
        error: null,
      }).then(resolve, reject);
      return (...args) => { if (method === 'eq' && args[0] === 'subscription_status') status = args[1]; return chain; };
    } });
    return chain;
  } };
  const data = await loadBetaData(db);
  assert.deepEqual(data.users.map((user) => user.id), ['beta-a']);
  assert.deepEqual(data.events.map((row) => row.id), [1, 2]);
  assert.deepEqual(data.usage.map((row) => row.id), [1]);
  assert.deepEqual(data.runs.map((row) => row.id), [2]);
});
