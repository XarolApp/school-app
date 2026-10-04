const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');

// Exercise the actual registered handlers with deterministic external-service
// responses. Do not load .env, bind a port, run the billing timer, or call Stripe.
function harness({
  result = () => ({ data: null, error: null }),
  stripeEnabled = true,
  cancelError,
  paymentIntentResult = { status: 'succeeded' },
  rpcResult = { data: { testerAccessUntil: '2026-09-28T12:00:00.000Z' }, error: null },
  authUser = { id: 'user-test', email: 'tester@example.com', email_confirmed_at: '2026-01-01T00:00:00.000Z' },
  authAdmin = null,
} = {}) {
  const routes = new Map();
  const routeChains = new Map();
  const queries = [];
  const rpcCalls = [];
  const warnings = [];
  let deletions = 0;
  let cancellations = 0;
  const paymentIntentCalls = [];
  const checkoutCalls = [];
  let subscriptionRetrievals = 0;
  let setupIntentRetrievals = 0;
  const db = {
    auth: {
      admin: {
        deleteUser: async () => { deletions++; return { error: null }; },
        getUserById: async () => authAdmin || { data: { user: authUser }, error: null },
      },
      getUser: async () => ({ data: { user: authUser }, error: null }),
    },
    rpc(name, args) {
      rpcCalls.push({ name, args });
      return Promise.resolve(rpcResult);
    },
    from(table) {
      const query = { table, calls: [] };
      queries.push(query);
      let strict = false;
      const chain = new Proxy({}, { get(_, method) {
        if (method === 'then') return (resolve, reject) => Promise.resolve(result(query)).then((response) => {
          if (strict && response.error) throw response.error;
          return response;
        }).then(resolve, reject);
        return (...args) => {
          query.calls.push([method, ...args]);
          if (method === 'throwOnError') strict = true;
          return chain;
        };
      } });
      return chain;
    },
  };
  const stripe = {
    webhooks: { constructEvent: (event) => event },
    subscriptions: {
      cancel: async () => { cancellations++; if (cancelError) throw cancelError; },
      update: async () => {},
      retrieve: async () => { subscriptionRetrievals++; return { id: 'sub_test', start_date: 1_800_000_000, status: 'active', metadata: { plan_id: 'monthly' }, current_period_end: 2000000000 }; },
    },
    setupIntents: { retrieve: async () => { setupIntentRetrievals++; return { payment_method: 'pm_test' }; } },
    checkout: { sessions: { create: async (params) => { checkoutCalls.push(params); return { url: 'https://checkout.test/session' }; } } },
    refunds: { create: async () => ({ status: 'succeeded' }) },
    paymentIntents: {
      list: async () => ({ data: [] }),
      create: async (params, options) => {
        paymentIntentCalls.push({ params, options });
        return paymentIntentResult;
      },
    },
  };
  const app = { use() {}, set() {}, listen() {} };
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    app[method] = (path, ...handlers) => {
      routes.set(`${method} ${path}`, handlers.at(-1));
      routeChains.set(`${method} ${path}`, handlers);
    };
  }
  const express = Object.assign(() => app, { raw: () => () => {}, json: () => () => {} });
  const source = readFileSync(join(__dirname, '../server.js'), 'utf8');
  // Leave all functions/routes intact, but stop before process startup.
  const module = { exports: {} };
  vm.runInNewContext(source.slice(0, source.lastIndexOf('\nif (stripe)')) +
    '\nmodule.exports = { seasonEndsAt, handleStripeWebhook, slimProgramsForList, chargeDueSeasonPasses, paidAccessActive, betaProgramState, betaAccessState, hasPaidStatus, requireAccess, hasLivePlan, accessStateFor, createCheckoutForUser, cancelPlanForUser, withdrawPlanForUser };', {
    module, Date, Buffer, URL, setTimeout, clearTimeout,
    console: { log() {}, warn(...args) { warnings.push(args.join(' ')); }, error() {} },
      process: { env: { SUPABASE_SERVICE_ROLE_KEY: 'synthetic', STRIPE_SECRET_KEY: stripeEnabled ? 'synthetic' : '', STRIPE_WEBHOOK_SECRET: 'synthetic', DEVELOPER_EMAILS: 'dev@example.com' } },
    require(name) {
      if (name === 'express') return express;
      if (name === 'cors') return () => () => {};
      if (name === 'express-rate-limit') return () => (req, res, next) => next();
      if (name === 'dotenv') return { config() {} };
      if (name === '@supabase/supabase-js') return { createClient: () => db };
      if (name === 'stripe') return () => stripe;
      if (name === './lib/reviewFilter') return require('../lib/reviewFilter');
      if (name === './lib/betaAnalytics') return require('../lib/betaAnalytics');
      if (name === './lib/aiUsage') return require('../lib/aiUsage');
      if (name === './lib/pragueDistricts') return { districtOfSchool: (school) => school.district ?? null };
      if (name === './lib/matching') return { scoreSchools: (_answers, schools) => schools.map((school, index) => ({ school_id: school.id, score: 100 - index })) };
      if (name === './lib/questionnaire') return { REASON_COUNT: 10 };
      if (name.startsWith('./lib/')) return {};
      return require(name);
    },
  }, { filename: 'server.js' });
  return {
    ...module.exports, queries, rpcCalls, checkoutCalls, paymentIntentCalls, warnings,
    get subscriptionRetrievals() { return subscriptionRetrievals; },
    get setupIntentRetrievals() { return setupIntentRetrievals; },
    get deletions() { return deletions; }, get cancellations() { return cancellations; },
    async call(method, path, req = {}) {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; }, send(body) { this.body = body; return this; } };
      await routes.get(`${method} ${path}`)({ user: { id: 'user-test' }, params: {}, headers: {}, ...req }, res);
      return res;
    },
    async callChain(method, path, req = {}) {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; }, send(body) { this.body = body; return this; } };
      const request = { user: { id: 'user-test', email: 'tester@example.com' }, params: {}, headers: { authorization: 'Bearer synthetic' }, ...req };
      const handlers = routeChains.get(`${method} ${path}`) || [];
      const dispatch = async (index) => {
        if (index >= handlers.length) return;
        let nextPromise;
        await handlers[index](request, res, (error) => {
          if (error) throw error;
          nextPromise = dispatch(index + 1);
          return nextPromise;
        });
        if (nextPromise) await nextPromise;
      };
      await dispatch(0);
      return res;
    },
  };
}

test('season access ends on March 31 in Prague, including the rollover year', () => {
  const h = harness();
  for (const [from, expected] of [['2026-01-01', '31/03/2026, 23:59:59'], ['2026-03-25', '31/03/2027, 23:59:59']]) {
    assert.equal(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', dateStyle: 'short', timeStyle: 'medium' }).format(h.seasonEndsAt(new Date(from))), expected);
  }
});

test('past-due access follows its paid-through timestamp instead of revoking immediately', () => {
  const { paidAccessActive } = harness();
  assert.equal(paidAccessActive({
    subscription_status: 'past_due',
    access_expires_at: '2999-01-01T00:00:00.000Z',
  }), true);
  assert.equal(paidAccessActive({
    subscription_status: 'past_due',
    access_expires_at: '2000-01-01T00:00:00.000Z',
  }), false);
  assert.equal(paidAccessActive({ subscription_status: 'past_due', access_expires_at: null }), false);
});

test('beta access requires both future deadlines and refuses equality or missing settings', () => {
  const { betaAccessState } = harness();
  const now = new Date('2026-09-26T12:00:00.000Z');
  const settings = { ends_at: '2026-10-01T00:00:00.000Z', access_hours: 48 };
  const profile = { subscription_status: 'beta', tester_access_until: '2026-09-28T12:00:00.000Z' };

  assert.equal(betaAccessState(profile, settings, now).hasAccess, true);
  assert.equal(betaAccessState({ ...profile, tester_access_until: now.toISOString() }, settings, now).hasAccess, false);
  assert.equal(betaAccessState(profile, { ...settings, ends_at: now.toISOString() }, now).hasAccess, false);
  assert.equal(betaAccessState(profile, { ...settings, ends_at: '2026-09-26T11:59:59.000Z' }, now).programEnded, true);
  assert.equal(betaAccessState(profile, { ...settings, ends_at: null }, now).hasAccess, false);
  assert.equal(betaAccessState({ ...profile, tester_access_until: 'not-a-date' }, settings, now).hasAccess, false);
  assert.equal(harness().hasPaidStatus('beta'), false);
  assert.equal(harness().paidAccessActive({ subscription_status: 'beta' }), false);
});

test('beta access wins over a long normal trial and the developer email allowlist', async () => {
  const now = Date.now();
  const profile = {
    trial_expires_at: '2999-01-01T00:00:00.000Z',
    subscription_status: 'beta',
    tester_access_until: new Date(now - 1000).toISOString(),
  };
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null }
    : { data: { ends_at: new Date(now + 86400000).toISOString(), access_hours: 48 }, error: null } });
  const req = { user: { id: 'user-test', email: 'dev@example.com' } };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  let reached = false;
  await h.requireAccess(req, res, () => { reached = true; });
  assert.equal(reached, false);
  assert.equal(res.statusCode, 402);
  assert.equal(res.body.code, 'BETA_ACCESS_EXPIRED');
});

test('tester check-in through a developer email does not restore beta access', async () => {
  const profile = {
    id: 'user-test', email: 'dev@example.com', subscription_status: 'beta',
    trial_expires_at: '2999-01-01T00:00:00.000Z',
    tester_access_until: '2026-09-28T12:00:00.000Z',
  };
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null }
    : { data: { ends_at: '2026-10-01T00:00:00.000Z', access_hours: 48 }, error: null } });
  const res = await h.call('get', '/api/me', { user: { id: 'user-test', email: 'dev@example.com' } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.isTester, true);
  assert.equal(res.body.isDeveloper, false);
  assert.equal(res.body.trialActive, false);
  assert.equal(res.body.subscribed, false);
});

test('school-list capacity sums current admission groups and excludes historical programs', () => {
  const rows = [
    { kkov: '75-41-M/01', obor_nazev: 'Sociální činnost', rok: 2026, kapacita: 10 },
    { kkov: '75-41-M/01', obor_nazev: 'Sociální činnost', rok: 2026, kapacita: 5 },
    { kkov: '75-41-M/01', obor_nazev: 'Sociální činnost', rok: 2025, kapacita: 30 },
    { kkov: 'old', rok: 2025, kapacita: 40 },
    { kkov: 'zero', rok: 2026, kapacita: 0 },
    { kkov: 'unknown', rok: 2026, kapacita: null },
  ];
  const before = JSON.stringify(rows);
  const result = harness().slimProgramsForList(rows);
  assert.deepEqual(Array.from(result, row => [row.kkov, row.kapacita]), [
    ['75-41-M/01', 15], ['zero', 0], ['unknown', null],
  ]);
  assert.equal(JSON.stringify(rows), before);
});

test('school-list rows carry the year and per-obor counts; cutoff averaged within one obor only', () => {
  const rows = [
    { kkov: 'a', obor_nazev: 'A', rok: 2026, kapacita: 10, prihlasky: 30, prijati: 8, cutoff: 40 },
    { kkov: 'a', obor_nazev: 'A', rok: 2026, kapacita: 5, prihlasky: 10, prijati: 2, cutoff: 50 },
    { kkov: 'a', obor_nazev: 'A', rok: 2025, kapacita: 15, prihlasky: 99, prijati: 9, cutoff: 90 },
    { kkov: 'b', obor_nazev: 'B', rok: 2026, kapacita: 20, prihlasky: 20, prijati: 20, cutoff: null },
  ];
  const [a, b] = harness().slimProgramsForList(rows);
  assert.deepEqual([a.rok, a.prihlasky, a.prijati, a.cutoff], [2026, 40, 10, 45]);
  assert.deepEqual([b.rok, b.cutoff], [2026, null]);
});

test('health check keeps the documented machine-readable response', async () => {
  const res = await harness().call('get', '/');
  assert.equal(res.body.status, 'ok');
  assert.deepEqual(Object.keys(res.body), ['status']);
});

test('profile PATCH accepts palette, mode, and name-only updates with validation', async () => {
  const validPatch = async (body) => {
    const h = harness({ result: () => ({ data: { id: 'user-test' }, error: null }) });
    const res = await h.call('patch', '/api/me', { body });
    const query = h.queries.find((item) => item.table === 'users');
    const update = query?.calls.find(([method]) => method === 'update')?.[1];
    return { h, res, update };
  };

  const palette = await validPatch({ theme_palette: 'smrk' });
  assert.equal(palette.res.statusCode, 200);
  assert.deepEqual({ ...palette.update }, { theme_palette: 'smrk' });
  assert.equal(
    palette.h.queries[0].calls.find(([method]) => method === 'select')[1],
    'id, name, theme_palette, theme_mode'
  );

  const mode = await validPatch({ theme_mode: 'dark' });
  assert.equal(mode.res.statusCode, 200);
  assert.deepEqual({ ...mode.update }, { theme_mode: 'dark' });

  const invalidPalette = await validPatch({ theme_palette: 'violet' });
  assert.equal(invalidPalette.res.statusCode, 400);
  assert.equal(invalidPalette.res.body.error, 'Neplatný vzhled.');

  const invalidMode = await validPatch({ theme_mode: 'automatic' });
  assert.equal(invalidMode.res.statusCode, 400);
  assert.equal(invalidMode.res.body.error, 'Neplatný vzhled.');

  const empty = await validPatch({});
  assert.equal(empty.res.statusCode, 400);
  assert.equal(empty.res.body.error, 'Není co uložit.');

  const name = await validPatch({ name: '  Ada  ' });
  assert.equal(name.res.statusCode, 200);
  assert.deepEqual({ ...name.update }, { name: 'Ada' });
});

test('empty and non-positive school id lists are rejected', async () => {
  for (const ids of ['', '1,', ',1', '0', '-2']) {
    const res = await harness().call('get', '/api/schools', { query: { ids } });
    assert.equal(res.statusCode, 400, ids);
  }
});

test('school detail distinguishes a missing row from a database failure', async () => {
  const missing = harness({ result: () => ({ data: null, error: { code: 'PGRST116', message: 'no rows' } }) });
  assert.equal((await missing.call('get', '/api/schools/:id', { params: { id: '1' } })).statusCode, 404);

  const unavailable = harness({ result: () => ({ data: null, error: { code: 'XX000', message: 'database unavailable' } }) });
  assert.equal((await unavailable.call('get', '/api/schools/:id', { params: { id: '1' } })).statusCode, 500);
});

test('questionnaire reads surface database failures', async () => {
  const h = harness({ result: () => ({ data: null, error: { message: 'database unavailable' } }) });
  assert.equal((await h.call('get', '/api/questionnaire')).statusCode, 500);
  assert.equal((await h.call('get', '/api/questionnaire/runs/:id', { params: { id: '1' } })).statusCode, 500);
  assert.equal((await h.call('patch', '/api/questionnaire/runs/:id', {
    params: { id: '1' }, body: { label: 'Nový název' },
  })).statusCode, 500);
  assert.equal((await h.call('put', '/api/questionnaire/runs/:id/default', {
    params: { id: '1' },
  })).statusCode, 500);
  assert.equal((await h.call('patch', '/api/questionnaire/runs/:id/archive', {
    params: { id: '1' }, body: { archived: true },
  })).statusCode, 500);
});

test('checkout does not continue with an unreadable billing profile', async () => {
  const h = harness({ result: () => ({ data: null, error: { message: 'database unavailable' } }) });
  const res = await h.call('post', '/api/checkout', { body: { planId: 'season' } });
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /platební profil/);
});

test('beta accounts cannot create either Stripe checkout plan, even when Stripe is missing', async () => {
  for (const planId of ['season', 'monthly']) {
    for (const stripeEnabled of [true, false]) {
      const h = harness({
        stripeEnabled,
        result: () => ({ data: { subscription_status: 'beta', stripe_customer_id: 'cus_legacy' }, error: null }),
      });
      const res = await h.call('post', '/api/checkout', { body: { planId } });
      assert.equal(res.statusCode, 403, `${planId}, Stripe enabled=${stripeEnabled}`);
      assert.equal(res.body.code, 'BETA_CHECKOUT_DISABLED');
      assert.equal(h.checkoutCalls.length, 0);
    }
  }
});

test('beta feedback is the only API path that calls the renewal transaction', async () => {
  const h = harness();
  const res = await h.call('post', '/api/beta/feedback', { body: {
    type: 'idea', page_url: '/skoly', message: 'Přidejte prosím srovnání oborů.',
  } });
  assert.equal(res.statusCode, 201);
  assert.equal(h.rpcCalls.length, 1);
  assert.equal(h.rpcCalls[0].name, 'submit_beta_feedback');
  assert.equal(h.rpcCalls[0].args.p_user_id, 'user-test');
  assert.equal('p_school_code' in h.rpcCalls[0].args, false);
  assert.equal('p_deadline' in h.rpcCalls[0].args, false);

  const invalid = harness();
  const badRes = await invalid.call('post', '/api/beta/feedback', { body: {
    type: 'bug', page_url: '//outside.test', message: 'Přesměrujte mě jinam.',
  } });
  assert.equal(badRes.statusCode, 400);
  assert.equal(invalid.rpcCalls.length, 0);
});

test('unconfirmed email cannot submit beta feedback even if auth is misconfigured to issue a session', async () => {
  const h = harness({ authUser: { id: 'user-test', email: 'tester@example.com', email_confirmed_at: null } });
  const res = await h.callChain('post', '/api/beta/feedback', { body: {
    type: 'comment', page_url: '/skoly', message: 'Zpráva delší než deset znaků.',
  } });
  assert.equal(res.statusCode, 403);
  assert.equal(h.rpcCalls.length, 0);
});

test('beta guidance acknowledgement is an ordinary profile update, never a renewal', async () => {
  const h = harness({ result: (query) => query.calls.some(([method]) => method === 'select')
    ? { data: { subscription_status: 'beta' }, error: null }
    : { data: null, error: null } });
  const res = await h.call('post', '/api/beta/guidance-seen');
  assert.equal(res.statusCode, 204);
  assert.equal(h.rpcCalls.length, 0);
  const update = h.queries.flatMap((query) => query.calls).find(([method]) => method === 'update');
  assert.deepEqual(Object.keys(update[1]), ['tester_guidance_seen_at']);
  assert.equal(update[1].subscription_status, undefined);
});

test('stale Stripe checkout events for beta accounts do not retrieve or attach billing', async () => {
  for (const [mode, event] of [
    ['setup', { id: 'evt_setup', type: 'checkout.session.completed', data: { object: { id: 'cs_setup', mode: 'setup', client_reference_id: 'user-test', setup_intent: 'seti_test' } } }],
    ['subscription', { id: 'evt_subscription', type: 'checkout.session.completed', data: { object: { id: 'cs_subscription', mode: 'subscription', client_reference_id: 'user-test', subscription: 'sub_test' } } }],
  ]) {
    const h = harness({ result: () => ({ data: { subscription_status: 'beta', stripe_setup_intent_id: null }, error: null }) });
    const res = await h.call('post', '/webhooks/stripe', { body: event });
    assert.equal(res.statusCode, 200, mode);
    assert.equal(h.setupIntentRetrievals, 0, mode);
    assert.equal(h.subscriptionRetrievals, 0, mode);
    assert.equal(h.queries.some((query) => query.calls.some(([method]) => method === 'update')), false, mode);
    assert.deepEqual(JSON.parse(h.warnings[0]), {
      level: 'warn',
      event: 'legacy_stripe_checkout_ignored_for_beta_tester',
      stripeEventId: `evt_${mode}`,
      stripeEventType: 'checkout.session.completed',
      stripeCheckoutSessionId: `cs_${mode}`,
      ...(mode === 'setup' ? { stripeSetupIntentId: 'seti_test' } : { stripeSubscriptionId: 'sub_test' }),
      userId: 'user-test',
      checkoutMode: mode,
    });
    assert.equal(h.warnings.length, 1, mode);
  }
});

test('season charge scheduler ignores beta rows even if a stale query returns one', async () => {
  const h = harness({ result: () => ({ data: [{
    id: 'user-test', subscription_status: 'beta', stripe_customer_id: 'cus_test',
    stripe_payment_method_id: 'pm_test', season_charge_due_at: '2026-09-01T00:00:00.000Z',
  }], error: null }) });
  await h.chargeDueSeasonPasses();
  assert.equal(h.paymentIntentCalls.length, 0);
});

test('webhook database failures are not acknowledged as successful', async () => {
  for (const [type, object] of [
    ['checkout.session.completed', { mode: 'setup', client_reference_id: 'user-test', setup_intent: 'seti_test' }],
    ['checkout.session.completed', { mode: 'subscription', client_reference_id: 'user-test', subscription: 'sub_test' }],
    ['payment_intent.succeeded', { metadata: { plan_id: 'season', app_user_id: 'user-test' } }],
    ['payment_intent.payment_failed', { metadata: { plan_id: 'season', app_user_id: 'user-test' } }],
    ['customer.subscription.updated', { id: 'sub_test', status: 'active' }],
    ['customer.subscription.deleted', { id: 'sub_test' }],
    ['invoice.payment_failed', { customer: 'cus_test' }],
  ]) {
    const h = harness({ result: () => ({ data: null, error: { message: 'database unavailable' } }) });
    const res = await h.call('post', '/webhooks/stripe', { body: { type, data: { object } } });
    assert.equal(res.statusCode, 500, type);
  }
});

test('failed season cancellation returns an error instead of promising no charge', async () => {
  const h = harness({ result: (query) => query.calls.some(([method]) => method === 'update')
    ? { error: { message: 'database unavailable' } }
    : { data: { plan_id: 'season', subscription_status: 'trialing' }, error: null } });
  assert.equal((await h.call('post', '/api/subscription/cancel')).statusCode, 500);
});

test('account deletion retains the billing mapping when cancellation fails', async () => {
  const h = harness({ result: () => ({ data: { stripe_subscription_id: 'sub_test' } }), cancelError: new Error('Stripe unavailable') });
  assert.equal((await h.call('delete', '/api/me')).statusCode, 502);
  assert.equal(h.cancellations, 1);
  assert.equal(h.deletions, 0);
});

test('account deletion cannot treat a failed profile read or missing Stripe client as no subscription', async () => {
  const unavailable = harness({ result: () => ({ error: { message: 'database unavailable' } }) });
  assert.equal((await unavailable.call('delete', '/api/me')).statusCode, 500);
  assert.equal(unavailable.deletions, 0);
  const unconfigured = harness({ stripeEnabled: false, result: () => ({ data: { stripe_subscription_id: 'sub_test' } }) });
  assert.equal((await unconfigured.call('delete', '/api/me')).statusCode, 503);
  assert.equal(unconfigured.deletions, 0);
});

test('unbilled accounts can still be erased', async () => {
  const h = harness({ result: () => ({ data: { stripe_subscription_id: null } }) });
  assert.equal((await h.call('delete', '/api/me')).statusCode, 204);
  assert.equal(h.deletions, 1);
});

test('confirmed missing subscriptions do not block account erasure', async () => {
  const h = harness({ result: () => ({ data: { stripe_subscription_id: 'sub_test' } }),
    cancelError: { type: 'StripeInvalidRequestError', code: 'resource_missing' } });
  assert.equal((await h.call('delete', '/api/me')).statusCode, 204);
  assert.equal(h.deletions, 1);
});

test('successful subscription events are acknowledged after saving', async () => {
  const h = harness({ result: () => ({ data: null, error: null }) });
  const res = await h.call('post', '/webhooks/stripe', { body: { type: 'customer.subscription.updated', data: { object: { id: 'sub_test', status: 'active' } } } });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.received, true);
});

test('season setup starts access for an expired account and records replay protection', async () => {
  const h = harness({ result: (query) => {
    if (query.calls.some(([method]) => method === 'select')) {
      return { data: { stripe_setup_intent_id: null }, error: null };
    }
    return { data: null, error: null };
  } });
  const created = 1_800_000_000;
  const res = await h.call('post', '/webhooks/stripe', { body: {
    type: 'checkout.session.completed',
    data: { object: {
      mode: 'setup', created, customer: 'cus_test', setup_intent: 'seti_test',
      client_reference_id: 'user-test',
    } },
  } });
  assert.equal(res.statusCode, 200);
  const update = h.queries
    .flatMap((query) => query.calls)
    .find(([method]) => method === 'update')?.[1];
  assert.equal(update.stripe_setup_intent_id, 'seti_test');
  assert.equal(update.trial_expires_at, new Date((created + 3 * 86400) * 1000).toISOString());
  assert.equal(update.season_charge_due_at, update.trial_expires_at);
});

test('a retried season setup event cannot restart a cancelled trial', async () => {
  const h = harness({ result: (query) => {
    if (query.calls.some(([method]) => method === 'select')) {
      return { data: { stripe_setup_intent_id: 'seti_test' }, error: null };
    }
    return { data: null, error: null };
  } });
  const res = await h.call('post', '/webhooks/stripe', { body: {
    type: 'checkout.session.completed',
    data: { object: {
      mode: 'setup', created: 1_800_000_000, customer: 'cus_test',
      setup_intent: 'seti_test', client_reference_id: 'user-test',
    } },
  } });
  assert.equal(res.statusCode, 200);
  assert.equal(h.queries.some((query) => query.calls.some(([method]) => method === 'update')), false);
});

test('season charges reuse a stable Stripe idempotency key across retries', async () => {
  const due = {
    id: 'user-test',
    subscription_status: 'trialing',
    stripe_customer_id: 'cus_test',
    stripe_payment_method_id: 'pm_test',
    season_charge_due_at: '2027-01-15T12:00:00.000Z',
  };
  const h = harness({ result: (query) =>
    query.calls.some(([method]) => method === 'select')
      ? { data: [due], error: null }
      : { data: null, error: null }
  });
  await h.chargeDueSeasonPasses();
  await h.chargeDueSeasonPasses();
  assert.equal(h.paymentIntentCalls.length, 2);
  assert.equal(h.paymentIntentCalls[0].options.idempotencyKey, 'season:user-test:2027-01-15T12:00:00.000Z');
  assert.equal(h.paymentIntentCalls[1].options.idempotencyKey, h.paymentIntentCalls[0].options.idempotencyKey);
});

test('a paid season charge uses Stripe creation time and is never mislabeled past due after a database failure', async () => {
  const due = {
    id: 'user-test',
    subscription_status: 'trialing',
    stripe_customer_id: 'cus_test',
    stripe_payment_method_id: 'pm_test',
    season_charge_due_at: '2026-01-04T12:00:00.000Z',
  };
  const paidAt = Math.floor(new Date('2026-01-04T12:00:00.000Z').getTime() / 1000);
  const h = harness({
    paymentIntentResult: { status: 'succeeded', created: paidAt },
    result: (query) => query.calls.some(([method]) => method === 'select')
      ? { data: [due], error: null }
      : { data: null, error: { message: 'database unavailable' } },
  });

  await h.chargeDueSeasonPasses();

  const updates = h.queries.flatMap((query) => query.calls).filter(([method]) => method === 'update');
  assert.equal(updates.length, 1);
  assert.equal(updates[0][1].subscription_status, 'season');
  assert.equal(updates[0][1].access_expires_at, h.seasonEndsAt(new Date(paidAt * 1000)).toISOString());
});

test('season success webhooks calculate access from the payment time', async () => {
  const created = Math.floor(new Date('2026-03-25T12:00:00.000Z').getTime() / 1000);
  const h = harness({ result: () => ({ data: null, error: null }) });
  const res = await h.call('post', '/webhooks/stripe', { body: {
    type: 'payment_intent.succeeded',
    data: { object: { created, metadata: { plan_id: 'season', app_user_id: 'user-test' } } },
  } });
  assert.equal(res.statusCode, 200);
  const update = h.queries.flatMap((query) => query.calls).find(([method]) => method === 'update')[1];
  assert.equal(update.access_expires_at, h.seasonEndsAt(new Date(created * 1000)).toISOString());
});

test('an old invoice failure cannot downgrade a replacement subscription', async () => {
  const h = harness({ result: () => ({ data: null, error: null }) });
  const res = await h.call('post', '/webhooks/stripe', { body: {
    type: 'invoice.payment_failed',
    data: { object: { customer: 'cus_test', subscription: 'sub_old' } },
  } });
  assert.equal(res.statusCode, 200);
  const updateQuery = h.queries.find((query) => query.calls.some(([method]) => method === 'update'));
  assert.deepEqual(
    Array.from(updateQuery.calls.find(([method]) => method === 'eq').slice(1)),
    ['stripe_subscription_id', 'sub_old'],
  );
});

test('review reads resolve opt-in adult names without the nonexistent public.users relationship', async () => {
  const rows = [
    { id: 1, user_id: 'adult', role: 'rodic', status: 'published', show_name: true },
    { id: 2, user_id: 'child', role: 'student', status: 'published', show_name: true },
    { id: 3, user_id: 'user-test', role: 'ucitel', status: 'held', show_name: false },
    { id: 4, user_id: 'other', role: 'student', status: 'held', show_name: false },
  ];
  const h = harness({ result: (query) => {
    if (query.calls.some(([method, value]) => method === 'select' && /users\s*\(/.test(value))) return { error: { code: 'PGRST200', message: 'No relationship' } };
    return { data: query.table === 'school_reviews' ? rows : [{ id: 'adult', name: 'Jana Nováková' }], error: null };
  } });
  const res = await h.call('get', '/api/schools/:id/reviews', { params: { id: '1' } });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(Array.from(res.body, r => r.id), [1, 2, 3]);
  assert.equal(res.body[0].display_name, 'Jana');
  assert.equal(res.body[1].display_name, null);
  assert.equal(res.body[2].status, 'held');
  assert.equal('user_id' in res.body[0], false);
  const lookup = h.queries.find(query => query.table === 'users');
  assert.deepEqual(Array.from(lookup.calls.find(([method]) => method === 'in')[2]), ['adult']);
});

test('new held reviews return moderation state without a broken join', async () => {
  const h = harness({ result: (query) => {
    if (query.calls.some(([method, value]) => method === 'select' && /users\s*\(/.test(value))) return { error: { code: 'PGRST200', message: 'No relationship' } };
    const insert = query.calls.find(([method]) => method === 'insert')?.[1];
    return { data: { ...insert, id: 5 }, error: null };
  } });
  const res = await h.call('post', '/api/schools/:id/reviews', { params: { id: '1' }, body: { role: 'student', showName: true, body: 'Ředitel Novák nám pravidelně pomáhal s výukou i přípravou.' } });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.status, 'held');
  assert.equal(res.body.display_name, null);
});

test('shared shortlist does not disguise database failures as an empty selection', async () => {
  const h = harness({ result: (query) => {
    if (query.table === 'shortlist_shares') {
      return { data: { user_id: 'owner', include_notes: false }, error: null };
    }
    if (query.table === 'application_picks') {
      return { data: null, error: { message: 'database unavailable' } };
    }
    return { data: null, error: null };
  } });
  const res = await h.call('get', '/api/shared/:token', { params: { token: 'synthetic' } });
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /nepodařilo načíst/);
});

test('shared shortlist token lookup distinguishes outage from a missing token', async () => {
  const outage = harness({ result: () => ({ data: null, error: { message: 'database unavailable' } }) });
  assert.equal((await outage.call('get', '/api/shared/:token', { params: { token: 'synthetic' } })).statusCode, 500);

  const missing = harness({ result: () => ({ data: null, error: null }) });
  assert.equal((await missing.call('get', '/api/shared/:token', { params: { token: 'synthetic' } })).statusCode, 404);
});


test('payment share links reject beta and active-plan accounts, and replace the previous link', async () => {
  const beta = harness({
    result: (query) => query.table === 'users'
      ? { data: { subscription_status: 'beta' }, error: null }
      : { data: null, error: null },
  });
  const betaResponse = await beta.callChain('post', '/api/share-links', { body: { kind: 'payment' } });
  assert.equal(betaResponse.statusCode, 403);
  assert.equal(betaResponse.body.code, 'BETA_CHECKOUT_DISABLED');

  const active = harness({
    result: (query) => query.table === 'users'
      ? { data: { subscription_status: 'active', access_expires_at: '2999-01-01T00:00:00.000Z', plan_id: 'monthly' }, error: null }
      : { data: null, error: null },
  });
  const activeResponse = await active.callChain('post', '/api/share-links', { body: { kind: 'payment' } });
  assert.equal(activeResponse.statusCode, 409);
  assert.equal(activeResponse.body.code, 'ALREADY_SUBSCRIBED');

  const created = harness({
    result: (query) => query.table === 'users'
      ? { data: { subscription_status: 'expired' }, error: null }
      : { data: null, error: null },
  });
  const response = await created.callChain('post', '/api/share-links', { body: { kind: 'payment' } });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.kind, 'payment');
  const shareQueries = created.queries.filter((query) => query.table === 'share_links');
  assert.equal(shareQueries.length, 2);
  assert.equal(shareQueries[0].calls[0][0], 'delete');
  assert.equal(shareQueries[1].calls[0][0], 'insert');
});

test('parent checkout link rejects expiry and starts Stripe checkout for the child account without child email', async () => {
  const expired = harness({
    result: (query) => query.table === 'share_links'
      ? { data: { user_id: 'child-owner', expires_at: '2000-01-01T00:00:00.000Z' }, error: null }
      : { data: null, error: null },
  });
  const expiredResponse = await expired.call('post', '/api/pay-links/:token/checkout', {
    params: { token: 'expired' }, body: { planId: 'season' },
  });
  assert.equal(expiredResponse.statusCode, 410);

  const valid = harness({
    result: (query) => {
      if (query.table === 'share_links') return { data: { user_id: 'child-owner', expires_at: '2999-01-01T00:00:00.000Z' }, error: null };
      if (query.table === 'users') return { data: { subscription_status: 'expired', stripe_customer_id: 'cus_child' }, error: null };
      return { data: null, error: null };
    },
  });
  const response = await valid.call('post', '/api/pay-links/:token/checkout', {
    params: { token: 'valid' }, body: { planId: 'season' },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(valid.checkoutCalls.length, 1);
  assert.equal(valid.checkoutCalls[0].client_reference_id, 'child-owner');
  assert.equal(Object.hasOwn(valid.checkoutCalls[0], 'customer_email'), false);
  assert.equal(Object.hasOwn(valid.checkoutCalls[0], 'customer'), false);
  assert.equal(valid.checkoutCalls[0].customer_creation, 'always');
  assert.equal(valid.checkoutCalls[0].success_url.includes('/platba-rodice/valid?platba=ok'), true);
});

test('public payment-link profile response contains only its allowlisted fields', async () => {
  const profile = {
    name: 'Tereza Nováková',
    plan_id: 'monthly',
    subscription_status: 'active',
    access_expires_at: '2999-01-01T00:00:00.000Z',
    cancel_at_period_end: false,
    season_charge_due_at: null,
    plan_started_at: '2999-01-01T00:00:00.000Z',
    last_paid_at: '2999-01-01T00:00:00.000Z',
    email: 'private@example.com',
    id: 'private-id',
  };
  const h = harness({
    result: (query) => query.table === 'share_links'
      ? { data: { user_id: 'owner', expires_at: '2999-01-01T00:00:00.000Z' }, error: null }
      : { data: profile, error: null },
  });
  const response = await h.call('get', '/api/pay-links/:token', { params: { token: 'valid' } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(Object.keys(response.body).sort(), ['checkout_open', 'expires_at', 'for_name', 'plan'].sort());
  assert.equal(response.body.for_name, 'Tereza');
  assert.equal('email' in response.body, false);
  assert.equal('id' in response.body, false);
  assert.deepEqual(Object.keys(response.body.plan).sort(), [
    'plan_id', 'subscription_status', 'access_expires_at', 'cancel_at_period_end', 'can_withdraw',
  ].sort());
});

test('payment link reopens checkout once a plan has ended, even though plan_id is still set', async () => {
  const h = harness({
    result: (query) => query.table === 'share_links'
      ? { data: { user_id: 'owner', expires_at: '2999-01-01T00:00:00.000Z' }, error: null }
      : {
        data: {
          name: null,
          plan_id: 'monthly',
          subscription_status: 'expired',
          access_expires_at: '2000-01-01T00:00:00.000Z',
          cancel_at_period_end: false,
          season_charge_due_at: null,
        },
        error: null,
      },
  });
  const response = await h.call('get', '/api/pay-links/:token', { params: { token: 'valid' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.plan, null);
  assert.equal(response.body.checkout_open, true);
});

test('shared account results mirror current entitlement and expose no questionnaire answers', async () => {
  const schools = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, name: 'School ' + (index + 1), district: 'Praha 1' }));
  const ownerProfile = (hasAccess) => ({
    trial_expires_at: hasAccess ? '2999-01-01T00:00:00.000Z' : '2000-01-01T00:00:00.000Z',
    subscription_status: null,
    access_expires_at: null,
    tester_access_until: null,
    tester_school_code: null,
    created_at: '2026-01-01T00:00:00.000Z',
  });
  const makeHarness = (hasAccess, authAdmin) => harness({
    authAdmin,
    result: (query) => {
      if (query.table === 'share_links') return { data: { user_id: 'owner' }, error: null };
      if (query.table === 'questionnaire_runs') return { data: { id: 'run', user_id: 'owner', answers: { secret: true }, matches: [], created_at: '2026-02-01T00:00:00.000Z' }, error: null };
      if (query.table === 'schools') return { data: schools, error: null };
      if (query.table === 'users') return { data: ownerProfile(hasAccess), error: null };
      if (query.table === 'beta_program_settings') return { data: { ends_at: '2999-01-01T00:00:00.000Z', access_hours: 48 }, error: null };
      return { data: null, error: null };
    },
  });

  const free = await makeHarness(false).call('get', '/api/shared-results/:token', { params: { token: 'results' } });
  assert.equal(free.statusCode, 200);
  assert.equal(free.body.top.length, 1);
  assert.equal(free.body.locked_count, 11);
  assert.equal('answers' in free.body, false);

  const paid = await makeHarness(true).call('get', '/api/shared-results/:token', { params: { token: 'results' } });
  assert.equal(paid.statusCode, 200);
  assert.equal(paid.body.top.length, 10);
  assert.equal(paid.body.locked_count, 0);
  assert.equal('answers' in paid.body, false);

  const failedLookup = await makeHarness(true, { data: null, error: { message: 'auth unavailable' } })
    .call('get', '/api/shared-results/:token', { params: { token: 'results' } });
  assert.equal(failedLookup.statusCode, 200);
  assert.equal(failedLookup.body.top.length, 1);
  assert.equal(failedLookup.body.locked_count, 11);
});

test('handoff opens reject revoked and expired tokens', async () => {
  const revoked = harness({ result: () => ({ data: { status: 'revoked', expires_at: '2999-01-01T00:00:00.000Z' }, error: null }) });
  assert.equal((await revoked.call('post', '/api/handoffs/:token/open', { params: { token: 'revoked' } })).statusCode, 404);

  const expired = harness({ result: () => ({ data: { status: 'active', expires_at: '2000-01-01T00:00:00.000Z' }, error: null }) });
  assert.equal((await expired.call('post', '/api/handoffs/:token/open', { params: { token: 'expired' } })).statusCode, 404);
});

test('handoff completion can update only an opened token and wrong owner secrets are hidden', async () => {
  const completion = harness({ result: () => ({ data: null, error: null }) });
  const completed = await completion.call('post', '/api/handoffs/:token/complete', { params: { token: 'token' } });
  assert.equal(completed.statusCode, 204);
  const completionQuery = completion.queries.find((query) => query.table === 'quiz_handoffs');
  assert.deepEqual(
    completionQuery.calls.filter(([method]) => method === 'eq').map(([, key, value]) => [key, value]),
    [['token', 'token'], ['status', 'opened']],
  );

  const wrongStatus = harness({
    result: () => ({ data: { owner_secret: 'right-secret', status: 'active', expires_at: '2999-01-01T00:00:00.000Z' }, error: null }),
  });
  const status = await wrongStatus.call('get', '/api/handoffs/:token', {
    params: { token: 'token' }, headers: { 'x-owner-secret': 'wrong-secret' },
  });
  assert.equal(status.statusCode, 404);

  const wrongRevoke = harness({ result: () => ({ data: null, error: null }) });
  const revoke = await wrongRevoke.call('post', '/api/handoffs/:token/revoke', {
    params: { token: 'token' }, headers: { 'x-owner-secret': 'wrong-secret' },
  });
  assert.equal(revoke.statusCode, 404);
  const revokeQuery = wrongRevoke.queries.find((query) => query.table === 'quiz_handoffs');
  assert.ok(revokeQuery.calls.some(([method, key, value]) => method === 'eq' && key === 'owner_secret' && value === 'wrong-secret'));
});

test('normal authenticated account cannot send beta events, even with an invitation ticket', async () => {
  const { visitorTicket } = require('../lib/betaAnalytics');
  const anon = '00000000-0000-0000-0000-000000000000';
  const h = harness({ result: () => ({ data: { subscription_status: 'trialing' }, error: null }) });
  const response = await h.call('post', '/api/beta/events', { body: { token: 'synthetic', anon_id: anon, session_id: anon,
    ticket: visitorTicket('synthetic', 'SCHOOL', anon), events: [{ name: 'page_view', path: '/', props: {} }] } });
  assert.equal(response.statusCode, 403);
  assert.equal(h.rpcCalls.length, 0);
});

test('micro answer and soft gate renew through the existing feedback transaction; skips do not contain an answer', async () => {
  const h=harness({result:(q)=>({data:q.table==='users'?{subscription_status:'beta'}:null,error:null})});
  const session='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  await h.call('post','/api/beta/micro',{user:{id:'user-test'},body:{id:'result',session_id:session,action:'answer',answer:'4 · Skoly mi sedi'}});
  assert.equal(h.rpcCalls[0].name,'submit_beta_micro'); assert.equal(h.rpcCalls[0].args.p_user_id,'user-test');
  await h.call('post','/api/beta/micro',{user:{id:'user-test'},body:{id:'detail',session_id:session,action:'skip',answer:'ignored'}});
  assert.equal(h.rpcCalls[1].args.p_answer,null);
  const short=await h.call('post','/api/beta/gate',{user:{id:'user-test'},body:{message:'short'}}); assert.equal(short.statusCode,400);
  await h.call('post','/api/beta/gate',{user:{id:'user-test'},body:{message:'Porovnani skol mi hodne pomohlo.'}});
  assert.equal(h.rpcCalls[2].name,'submit_beta_feedback_details'); assert.equal(h.rpcCalls[2].args.p_details.source,'gate');
});
