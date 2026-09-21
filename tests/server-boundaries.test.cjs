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
} = {}) {
  const routes = new Map();
  const queries = [];
  let deletions = 0;
  let cancellations = 0;
  const paymentIntentCalls = [];
  const db = {
    auth: { admin: { deleteUser: async () => { deletions++; return { error: null }; } } },
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
      retrieve: async () => ({ status: 'active', metadata: { plan_id: 'monthly' }, current_period_end: 2000000000 }),
    },
    setupIntents: { retrieve: async () => ({ payment_method: 'pm_test' }) },
    paymentIntents: {
      create: async (params, options) => {
        paymentIntentCalls.push({ params, options });
        return paymentIntentResult;
      },
    },
  };
  const app = { use() {}, set() {}, listen() {} };
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    app[method] = (path, ...handlers) => routes.set(`${method} ${path}`, handlers.at(-1));
  }
  const express = Object.assign(() => app, { raw: () => () => {}, json: () => () => {} });
  const source = readFileSync(join(__dirname, '../server.js'), 'utf8');
  // Leave all functions/routes intact, but stop before process startup.
  const module = { exports: {} };
  vm.runInNewContext(source.slice(0, source.lastIndexOf('\nif (stripe)')) +
    '\nmodule.exports = { seasonEndsAt, handleStripeWebhook, slimProgramsForList, chargeDueSeasonPasses, paidAccessActive };', {
    module, Date, Buffer, URL, setTimeout, clearTimeout,
    console: { log() {}, warn() {}, error() {} },
    process: { env: { SUPABASE_SERVICE_ROLE_KEY: 'synthetic', STRIPE_SECRET_KEY: stripeEnabled ? 'synthetic' : '', STRIPE_WEBHOOK_SECRET: 'synthetic' } },
    require(name) {
      if (name === 'express') return express;
      if (name === 'cors' || name === 'express-rate-limit') return () => () => {};
      if (name === 'dotenv') return { config() {} };
      if (name === '@supabase/supabase-js') return { createClient: () => db };
      if (name === 'stripe') return () => stripe;
      if (name === './lib/reviewFilter') return require('../lib/reviewFilter');
      // Questionnaire is under another agent's ownership; never exercise it here.
      if (name.startsWith('./lib/')) return {};
      return require(name);
    },
  }, { filename: 'server.js' });
  return {
    ...module.exports, queries, paymentIntentCalls,
    get deletions() { return deletions; }, get cancellations() { return cancellations; },
    async call(method, path, req = {}) {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; }, send(body) { this.body = body; return this; } };
      await routes.get(`${method} ${path}`)({ user: { id: 'user-test' }, params: {}, headers: {}, ...req }, res);
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

test('health check keeps the documented machine-readable response', async () => {
  const res = await harness().call('get', '/');
  assert.equal(res.body.status, 'ok');
  assert.deepEqual(Object.keys(res.body), ['status']);
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
  const res = await h.call('post', '/api/checkout', { body: { planId: 'season', paymentConsent: true } });
  assert.equal(res.statusCode, 500);
  assert.match(res.body.error, /platební profil/);
});

test('checkout requires a payment acknowledgement', async () => {
  const h = harness();
  const res = await h.call('post', '/api/checkout', { body: { planId: 'season' } });
  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /souhlas s platbou/);
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
