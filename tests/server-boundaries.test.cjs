const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const vm = require('node:vm');
const season = require('../lib/season');
// The daily price moves, so assertions compute today's value instead of hardcoding it.
const todayMinor = () => season.seasonPriceCzk(new Date()) * 100;
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

// Exercise the actual registered handlers with deterministic external-service
// responses. Do not load .env, bind a port, run the billing timer, or call Stripe.
function harness({
  result = () => ({ data: null, error: null }),
  stripeEnabled = true,
  cancelError,
  paymentIntentResult = { status: 'succeeded' },
  paymentIntentError = null,
  paymentIntentRetrieveResult = { id: 'pi_test', status: 'requires_action', client_secret: 'pi_secret', metadata: { purchase_id: 'purchase-season-1', app_user_id: 'user-test' } },
  paymentIntentSearchResult = { data: [] },
  refundListResult = { data: [] },
  refundCreateResult = { id: 're_test', amount: 69000, status: 'succeeded' },
  refundCreateError = null,
  rpcResult = { data: { testerAccessUntil: '2026-09-28T12:00:00.000Z' }, error: null },
  rpcImpl,
  checkoutSessionResult = { status: 'open', url: 'https://checkout.test/session' },
  authUser = { id: 'user-test', email: 'tester@example.com', email_confirmed_at: '2026-01-01T00:00:00.000Z' },
  authResult = null,
  authAdmin = null,
  deleteUserError = null,
  requestReasonsImpl = async () => new Map(),
  env = {},
  storageListResult = async () => ({ data: [], error: null }),
  commuteMatrix = null,
  commuteMatrixPresent = false,
  paymentMethodFingerprint = 'fp_test',
  existingSubscriptions = [],
  subscriptionPeriodEnd = 2000000000,
} = {}) {
  const storageRemovals = [];
  const routes = new Map();
  const routeChains = new Map();
  const queries = [];
  const reasonCalls = [];
  const rpcCalls = [];
  const operationLog = [];
  const warnings = [];
  let deletions = 0;
  let cancellations = 0;
  const paymentIntentCalls = [];
  const paymentIntentRetrievals = [];
  const paymentIntentSearches = [];
  const paymentIntentCancellations = [];
  const refundListCalls = [];
  const refundCalls = [];
  let activeRefundCreateError = refundCreateError;
  const checkoutCalls = [];
  const invoiceItemCalls = [];
  const subscriptionUpdates = [];
  const checkoutOptions = [];
  const checkoutRetrieveCalls = [];
  const checkoutSessionsByKey = new Map();
  let subscriptionRetrievals = 0;
  let setupIntentRetrievals = 0;
  const db = {
    auth: {
      admin: {
        deleteUser: async () => { if (deleteUserError) return { error: deleteUserError }; deletions++; return { error: null }; },
        getUserById: async () => authAdmin || { data: { user: authUser }, error: null },
      },
      getUser: async () => authResult || ({ data: { user: authUser }, error: null }),
    },
    storage: { from: () => ({
      list: async (prefix, options) => storageListResult(prefix, options),
      remove: async (paths) => { storageRemovals.push(...paths); return { error: null }; },
    }) },
    rpc(name, args) {
      rpcCalls.push({ name, args });
      operationLog.push(`rpc:${name}`);
      return Promise.resolve(rpcImpl ? rpcImpl(name, args) : rpcResult);
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
          if (method === 'update') operationLog.push(`db:update:${table}`);
          if (method === 'throwOnError') strict = true;
          return chain;
        };
      } });
      return chain;
    },
  };
  const realFs = require('node:fs');
  const fsModule = {
    readFileSync(filePath, ...args) {
      if (String(filePath).endsWith('/lib/data/commute-matrix.json')) {
        if (!commuteMatrixPresent) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        return JSON.stringify(commuteMatrix);
      }
      return realFs.readFileSync(filePath, ...args);
    },
  };
  const stripe = {
    webhooks: { constructEvent: (event) => event },
    subscriptions: {
      cancel: async () => { operationLog.push('stripe:subscription.cancel'); cancellations++; if (cancelError) throw cancelError; },
      update: async (id, params) => { operationLog.push('stripe:subscription.update'); subscriptionUpdates.push({ id, params }); return { current_period_end: 2_000_000_000 }; },
      retrieve: async () => { operationLog.push('stripe:subscription.retrieve'); subscriptionRetrievals++; return { id: 'sub_test', start_date: 1_800_000_000, status: 'active', metadata: { plan_id: 'monthly' }, current_period_end: subscriptionPeriodEnd }; },
      list: async () => ({ data: existingSubscriptions }),
    },
    setupIntents: { retrieve: async () => { setupIntentRetrievals++; return { payment_method: 'pm_test' }; } },
    paymentMethods: {
      retrieve: async (id) => ({ id, card: { fingerprint: paymentMethodFingerprint, brand: 'visa', last4: '4242' } }),
      list: async () => ({ data: [{ id: 'pm_test' }] }),
      detach: async (id) => { operationLog.push('stripe:payment_method.detach'); return { id }; },
    },
    invoiceItems: { create: async (params, options) => { invoiceItemCalls.push({ params, options }); return { id: 'ii_test' }; } },
    checkout: { sessions: {
      create: async (params, options = {}) => {
        checkoutCalls.push(params);
        checkoutOptions.push(options);
        const key = options.idempotencyKey;
        if (key && checkoutSessionsByKey.has(key)) return checkoutSessionsByKey.get(key);
        const session = { id: `cs_test_${checkoutCalls.length}`, url: 'https://checkout.test/session' };
        if (key) checkoutSessionsByKey.set(key, session);
        return session;
      },
      retrieve: async (id) => { checkoutRetrieveCalls.push(id); return checkoutSessionResult; },
    } },
    refunds: {
      list: async (params) => { refundListCalls.push(params); return refundListResult; },
      create: async (params, options) => {
        refundCalls.push({ params, options });
        if (activeRefundCreateError) throw activeRefundCreateError;
        return refundCreateResult;
      },
    },
    paymentIntents: {
      list: async () => ({ data: [] }),
      retrieve: async (id) => { paymentIntentRetrievals.push(id); return typeof paymentIntentRetrieveResult === 'function' ? paymentIntentRetrieveResult(id) : { ...paymentIntentRetrieveResult, id }; },
      search: async (params) => { paymentIntentSearches.push(params); return paymentIntentSearchResult; },
      cancel: async (id) => { operationLog.push('stripe:payment_intent.cancel'); paymentIntentCancellations.push(id); return { id, status: 'canceled' }; },
      create: async (params, options) => {
        paymentIntentCalls.push({ params, options });
        if (paymentIntentError) throw paymentIntentError;
        return paymentIntentResult;
      },
    },
  };
  const app = { use() {}, set() {}, listen() {}, disable() {} };
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
    '\nmodule.exports = { handleStripeWebhook, slimProgramsForList, chargeDueSeasonPasses, paidAccessActive, betaProgramState, betaAccessState, hasPaidStatus, requireAccess, hasLivePlan, accessStateFor, createCheckoutForUser, cancelPlanForUser, withdrawPlanForUser, restorePlanForUser, settleReferrals, recordReferral, trialEligible, withdrawalQuote, saveOnboardingRun, withCommute };', {
    module, Date, Buffer, URL, setTimeout, clearTimeout, __dirname: join(__dirname, '..'),
    console: { log() {}, warn(...args) {
      const message = args.join(' ');
      if (!message.startsWith('[commute] matrix unavailable;')) warnings.push(message);
    }, error() {} },
      process: { env: { SUPABASE_SERVICE_ROLE_KEY: 'synthetic', STRIPE_SECRET_KEY: stripeEnabled ? 'synthetic' : '', STRIPE_WEBHOOK_SECRET: 'synthetic', DEVELOPER_EMAILS: 'dev@example.com', SHARING_ENABLED: 'true',...env } },
    require(name) {
      if (name === 'express') return express;
      if (name === 'cors') return () => () => {};
      if (name === 'express-rate-limit') return (options) => Object.assign((req,res,next)=>next(),{options});
      if (name === 'dotenv') return { config() {} };
      if (name === '@supabase/supabase-js') return { createClient: () => db };
      if (name === 'stripe') return () => stripe;
      if (name === './lib/reviewFilter') return require('../lib/reviewFilter');
      if (name === './lib/betaRankings') return require('../lib/betaRankings');
      if (name === './lib/betaAdminRoutes') return require('../lib/betaAdminRoutes');
      if (name === './lib/betaLimits') return require('../lib/betaLimits');
      if (name === './lib/betaMaintenance') return require('../lib/betaMaintenance');
      if (name === './lib/betaClosing') return require('../lib/betaClosing');
      if (name === './lib/betaAnalytics') return require('../lib/betaAnalytics');
      if (name === './lib/aiUsage') return require('../lib/aiUsage');
      if (name === './lib/season') return require('../lib/season');
      if (name === './lib/creatorLinks') return require('../lib/creatorLinks');
      if (name === './lib/pragueDistricts') return { districtOfSchool: (school) => school.district ?? null };
      if (name === './lib/matching') return { scoreSchools: (_answers, schools) => schools.map((school, index) => ({ school_id: school.id, score: 100 - index })) };
      if (name === './lib/questionnaire') return {
        REASON_COUNT: 10,
        requestReasons: async (options) => {
          reasonCalls.push(options);
          return requestReasonsImpl(options);
        },
      };
      if (name === './lib/onboardingAnswers') return require('../lib/onboardingAnswers');
      if (name === 'node:fs') return fsModule;
      if (name === 'node:path') return require('node:path');
      if (name.startsWith('./lib/')) return {};
      return require(name);
    },
  }, { filename: 'server.js' });
  return {
    ...module.exports, storageRemovals, routeChains, queries, reasonCalls, rpcCalls, operationLog, checkoutCalls, checkoutOptions, checkoutRetrieveCalls, paymentIntentCalls, paymentIntentRetrievals, paymentIntentSearches, paymentIntentCancellations, refundListCalls, refundCalls, warnings, invoiceItemCalls, subscriptionUpdates,
    get subscriptionRetrievals() { return subscriptionRetrievals; },
    get setupIntentRetrievals() { return setupIntentRetrievals; },
    get deletions() { return deletions; }, get cancellations() { return cancellations; },
    setRefundCreateError(error) { activeRefundCreateError = error; },
    async call(method, path, req = {}) {
      const res = { set() { return this; }, statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; }, send(body) { this.body = body; return this; } };
      await routes.get(`${method} ${path}`)({ user: { id: 'user-test' }, params: {}, headers: {}, ...req }, res);
      return res;
    },
    async callChain(method, path, req = {}) {
      const res = { set() { return this; }, statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, end() { return this; }, send(body) { this.body = body; return this; } };
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

test('decision profile rejects malformed numeric shapes before database writes', async () => {
  for (const field of ['jpzPoints', 'expectedGain']) {
    for (const value of [true, false, [], [12], {}, ' ', '\t\n']) {
      const h = harness();
      const body = { jpzPoints: 40, expectedGain: 5, [field]: value };
      const response = await h.call('put', '/api/decision-profile', { body });
      assert.equal(response.statusCode, 400, `${field}: ${JSON.stringify(value)}`);
      assert.equal(h.queries.length, 0);
    }
  }
});

test('decision profile preserves numeric boundaries and empty-point clearing', async () => {
  for (const value of [0, 100, '0', '100', ' 12 ']) {
    const h = harness();
    const response = await h.call('put', '/api/decision-profile', {
      body: { jpzPoints: value, expectedGain: '5' },
    });
    assert.equal(response.statusCode, 200);
    const row = h.queries[0].calls.find(([method]) => method === 'upsert')[1];
    assert.equal(row.jpz_points, Number(value));
    assert.equal(row.jpz_expected_gain, 5);
    assert.equal(row.jpz_source, 'nanecisto');
  }
  for (const value of ['', null, undefined]) {
    const h = harness();
    const response = await h.call('put', '/api/decision-profile', {
      body: { jpzPoints: value, expectedGain: 5 },
    });
    assert.equal(response.statusCode, 200);
    const row = h.queries[0].calls.find(([method]) => method === 'upsert')[1];
    assert.equal(row.jpz_points, null);
    assert.equal(row.jpz_expected_gain, null);
    assert.equal(row.jpz_source, null);
  }
});

test('on-demand questionnaire explanations are authenticated, access-gated and limited per account', async () => {
  const h = harness();
  const handlers = h.routeChains.get('post /api/questionnaire/explain/:schoolId');
  assert.equal(handlers.length, 4);
  const limiter = handlers[2];
  assert.equal(limiter.options.limit, 60);
  assert.equal(limiter.options.windowMs, 60 * 60 * 1000);
  assert.equal(limiter.options.keyGenerator({ user: { id: 'student-a' } }), 'student-a');
  assert.equal((await h.call('post', '/api/questionnaire/explain/:schoolId', { params: { schoolId: '0' } })).statusCode, 400);
  assert.equal(h.queries.length, 0);
});

test('on-demand explanation returns stored reasons without another model call', async () => {
  const h = harness({ result: (query) => query.table === 'questionnaire_runs'
    ? { data: { id: 9, answers: {}, matches: [{ school_id: 7, reason: 'Už uložený důvod.' }], extra_reasons: {} }, error: null }
    : { data: null, error: null } });
  const response = await h.call('post', '/api/questionnaire/explain/:schoolId', { params: { schoolId: '7' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.reason, 'Už uložený důvod.');
  assert.equal(response.body.cached, true);
  assert.equal(h.reasonCalls.length, 0);
});

test('on-demand explanations cache extra schools on only the caller’s default run', async () => {
  let extraReasons = {};
  const baseRun = {
    id: 12,
    answers: { typ: 'odborna' },
    matches: Array.from({ length: 10 }, (_, i) => ({ school_id: i + 1, reason: '' })),
  };
  const h = harness({
    env: { OPENROUTER_API_KEY: 'synthetic' },
    rpcImpl: (name, args) => {
      extraReasons = { ...extraReasons, [args.p_school_id]: args.p_reason };
      return { data: true, error: null };
    },
    result: (query) => {
      if (query.table === 'questionnaire_runs') {
        return { data: { ...baseRun, extra_reasons: extraReasons }, error: null };
      }
      if (query.table === 'schools') return { data: [{ id: 11, name: 'Škola 11', programs: 'Gymnázium' }], error: null };
      return { data: null, error: null };
    },
    requestReasonsImpl: async ({ shortlist }) => new Map([[shortlist[0].school_id, 'Nové vysvětlení.']]),
  });

  const first = await h.call('post', '/api/questionnaire/explain/:schoolId', { params: { schoolId: '11' } });
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.reason, 'Nové vysvětlení.');
  assert.equal(first.body.cached, false);
  assert.equal(h.reasonCalls.length, 1);
  assert.equal(h.reasonCalls[0].shortlist.length, 1);
  assert.equal(h.reasonCalls[0].shortlist[0].school_id, 11);
  assert.equal(h.rpcCalls[0].name, 'cache_questionnaire_reason');
  assert.equal(h.rpcCalls[0].args.p_user_id, 'user-test');
  assert.equal(h.rpcCalls[0].args.p_run_id, 12);

  const second = await h.call('post', '/api/questionnaire/explain/:schoolId', { params: { schoolId: '11' } });
  assert.equal(second.statusCode, 200);
  assert.equal(second.body.reason, 'Nové vysvětlení.');
  assert.equal(second.body.cached, true);
  assert.equal(h.reasonCalls.length, 1);
});

test('on-demand explanation without a default run is a safe no-op, and a missing key is reported inline', async () => {
  const noRun = harness({ result: () => ({ data: null, error: null }) });
  const missing = await noRun.call('post', '/api/questionnaire/explain/:schoolId', { params: { schoolId: '4' } });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.body.code, 'QUESTIONNAIRE_REQUIRED');

  const noKey = harness({
    result: (query) => query.table === 'questionnaire_runs'
      ? { data: { id: 2, answers: {}, matches: [], extra_reasons: {} }, error: null }
      : { data: null, error: null },
  });
  const unavailable = await noKey.call('post', '/api/questionnaire/explain/:schoolId', { params: { schoolId: '4' } });
  assert.equal(unavailable.statusCode, 503);
  assert.equal(unavailable.body.error, 'Vysvětlení teď nejde vytvořit.');
  assert.equal(noKey.reasonCalls.length, 0);
});

test('every admin report, export and mutation requires verified ADMIN_EMAILS independent of developer access',async()=>{
 const paths=[...require('../lib/betaAdminRoutes').TABS.map(t=>['get','/api/admin/'+t]),['get','/api/admin/export/:table.csv'],['get','/api/admin/feedback/:id'],['patch','/api/admin/feedback/:id'],['patch','/api/admin/reviews/:id'],['get','/api/admin/testers/:id/email']];
 for(const [method,path] of paths){
  const denied=harness({authUser:{id:'dev',email:'dev@example.com',email_confirmed_at:'2026-01-01'}});
  assert.equal((await denied.callChain(method,path)).statusCode,403,path);assert.equal(denied.queries.length,0);
  assert.equal((await denied.callChain(method,path,{headers:{}})).statusCode,401,path);
 }
 const admin=harness({env:{ADMIN_EMAILS:' Admin@Example.com '},authUser:{id:'admin',email:'admin@example.com',email_confirmed_at:'2026-01-01'},result:()=>({data:[],error:null})});
 const r=await admin.callChain('get','/api/admin/overview');assert.equal(r.statusCode,200);assert.equal(r.body.tab,'overview');
 const unconfirmed=harness({env:{ADMIN_EMAILS:'admin@example.com'},authUser:{id:'admin',email:'admin@example.com'}});assert.equal((await unconfirmed.callChain('get','/api/admin/overview')).statusCode,403);
});

test('admin feedback patch cannot change attribution and review selection requires publication consent',async()=>{
 const options={env:{ADMIN_EMAILS:'admin@example.com'},authUser:{id:'admin',email:'admin@example.com',email_confirmed_at:'2026-01-01'},result:q=>({data:q.table==='beta_reviews'?{id:1,consent_publish:false}:{id:1},error:null})};
 const h=harness(options);
 assert.equal((await h.callChain('patch','/api/admin/feedback/:id',{params:{id:'1'},body:{user_id:'other'}})).statusCode,400);
 assert.equal((await h.callChain('patch','/api/admin/feedback/:id',{params:{id:'1'},body:{status:'vyreseno',admin_reply:'Hotovo'}})).statusCode,204);
 const patch=h.queries.find(q=>q.table==='beta_feedback').calls.find(c=>c[0]==='update')[1];assert.equal(patch.admin_reply,'Hotovo');assert.ok(patch.replied_at);
 assert.equal((await h.callChain('patch','/api/admin/reviews/:id',{params:{id:'1'},body:{selected:true}})).statusCode,400);
 assert.equal((await h.callChain('patch','/api/admin/reviews/:id',{params:{id:'1'},body:{selected:false}})).statusCode,204);
});

test('every paid season or spring access ends on 30 June 2027 in Prague', () => {
  assert.equal(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Prague', dateStyle: 'short', timeStyle: 'medium' }).format(season.ACCESS_END), '30/06/2027, 23:59:59');
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
  const res = { set() { return this; }, statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  let reached = false;
  await h.requireAccess(req, res, () => { reached = true; });
  assert.equal(reached, false);
  assert.equal(res.statusCode, 402);
  assert.equal(res.body.code, 'BETA_ACCESS_EXPIRED');
});

test('creator access requires an active creator link and reports schema outages separately', async () => {
  const profile = { id: 'user-test', subscription_status: 'creator' };
  const active = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null }
    : query.table === 'creator_links'
      ? { data: { revoked_at: null, last_active_at: new Date().toISOString() }, error: null }
      : { data: null, error: null } });
  assert.equal((await active.accessStateFor('user-test', 'dev@example.com')).hasAccess, true);

  for (const link of [null, { revoked_at: '2026-10-22T00:00:00.000Z', last_active_at: null }]) {
    const denied = harness({ result: (query) => query.table === 'users'
      ? { data: profile, error: null }
      : query.table === 'creator_links' ? { data: link, error: null } : { data: null, error: null } });
    const state = await denied.accessStateFor('user-test', 'dev@example.com');
    assert.equal(state.hasAccess, false);
    assert.equal(state.httpStatus, 403);
    assert.equal(state.body.code, 'CREATOR_REVOKED');
  }

  const unavailable = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null }
    : query.table === 'creator_links' ? { data: null, error: new Error('missing relation') } : { data: null, error: null } });
  const failed = await unavailable.accessStateFor('user-test', 'dev@example.com');
  assert.equal(failed.httpStatus, 503);
  assert.equal(failed.body.code, 'CREATOR_ACCESS_UNAVAILABLE');
});

test('creator accounts are excluded from subscription status and cannot create Stripe checkout sessions', async () => {
  const profile = {
    id: 'user-test', email: 'creator@example.com', subscription_status: 'creator',
    trial_expires_at: '2999-01-01T00:00:00.000Z',
  };
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null }
    : query.table === 'creator_links'
      ? { data: { revoked_at: null, last_active_at: new Date().toISOString() }, error: null }
      : { data: null, error: null } });
  const me = await h.call('get', '/api/me', { user: { id: 'user-test', email: profile.email } });
  assert.equal(me.body.isCreator, true);
  assert.equal(me.body.hasAccess, true);
  assert.equal(me.body.trialActive, false);
  assert.equal(me.body.subscribed, false);
  assert.equal(me.body.canWithdraw, false);
  assert.equal(me.body.trialDaysLeft, 0);

  const checkout = await h.createCheckoutForUser({ userId: 'user-test', email: profile.email, planId: 'season' });
  assert.equal(checkout.status, 403);
  assert.equal(checkout.body.code, 'CREATOR_CHECKOUT_DISABLED');
  assert.equal(h.checkoutCalls.length, 0);
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
    'id, name, theme_palette, theme_mode, gender'
  );

  const mode = await validPatch({ theme_mode: 'dark' });
  assert.equal(mode.res.statusCode, 200);
  assert.deepEqual({ ...mode.update }, { theme_mode: 'dark' });

  const female = await validPatch({ gender: 'f' });
  assert.equal(female.res.statusCode, 200);
  assert.deepEqual({ ...female.update }, { gender: 'f' });

  const clearGender = await validPatch({ gender: null });
  assert.equal(clearGender.res.statusCode, 200);
  assert.deepEqual({ ...clearGender.update }, { gender: null });

  const invalidGender = await validPatch({ gender: 'other' });
  assert.equal(invalidGender.res.statusCode, 400);
  assert.equal(invalidGender.res.body.error, 'Neplatný způsob oslovení.');

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

test('same-plan checkout reuses the open purchase and Stripe session across payer contexts', async () => {
  let pendingPurchase = null;
  let insertedPurchase;
  const h = harness({ result: (query) => {
    if (query.table === 'users') {
      return { data: { subscription_status: 'expired', stripe_customer_id: null }, error: null };
    }
    if (query.table === 'purchases') {
      if (query.calls.some(([method]) => method === 'insert')) {
        insertedPurchase = query.calls.find(([method]) => method === 'insert')[1];
        pendingPurchase = { id: 'purchase-season-1', stripe_checkout_session_id: null, checkout_context: 'self', price_amount_minor: todayMinor(), trial: true, referrer_user_id: null };
        return { data: pendingPurchase, error: null };
      }
      if (query.calls.some(([method]) => method === 'update')) {
        pendingPurchase = { ...pendingPurchase, stripe_checkout_session_id: 'cs_test_1' };
        return { data: null, error: null };
      }
      return { data: pendingPurchase, error: null };
    }
    return { data: null, error: null };
  } });

  const first = await h.call('post', '/api/checkout', {
    user: { id: 'user-test', email: 'tester@example.com' },
    body: { planId: 'season', immediateStart: true },
  });
  const second = await h.createCheckoutForUser({
    userId: 'user-test', email: undefined, planId: 'season', immediateStart: true,
    successPath: '/platba-rodice/token', cancelPath: '/platba-rodice/token', checkoutContext: 'self',
  });

  assert.equal(first.statusCode, 200);
  assert.equal(second.status, 200);
  assert.equal(first.body.url, second.body.url);
  assert.equal(h.checkoutCalls.length, 1);
  assert.equal(h.checkoutOptions[0].idempotencyKey, 'snm-checkout:purchase-season-1');
  assert.equal(h.checkoutRetrieveCalls[0], 'cs_test_1');
  const pendingLookup = h.queries.find((query) => query.table === 'purchases' && query.calls.some(([method]) => method === 'select'));
  assert.equal(pendingLookup.calls.some(([method, column]) => method === 'eq' && column === 'checkout_context'), false);
  assert.equal(insertedPurchase.price_amount_minor, todayMinor());
  assert.equal(h.checkoutCalls[0].metadata.purchase_id, 'purchase-season-1');
});

test('expired pending checkout is closed before a new purchase attempt is reserved', async () => {
  let pendingPurchase = { id: 'purchase-old', stripe_checkout_session_id: 'cs_old', checkout_context: 'self', price_amount_minor: todayMinor(), trial: true, referrer_user_id: null };
  let inserts = 0;
  const h = harness({ checkoutSessionResult: { status: 'expired' }, result: (query) => {
    if (query.table === 'users') return { data: { subscription_status: 'expired' }, error: null };
    if (query.table === 'purchases' && query.calls.some(([method]) => method === 'update')) {
      const update = query.calls.find(([method]) => method === 'update')[1];
      if (update.status === 'failed') pendingPurchase = null;
      else pendingPurchase = { ...pendingPurchase, stripe_checkout_session_id: update.stripe_checkout_session_id };
      return { data: null, error: null };
    }
    if (query.table === 'purchases' && query.calls.some(([method]) => method === 'insert')) {
      inserts++;
      pendingPurchase = { id: 'purchase-new', stripe_checkout_session_id: null };
      return { data: pendingPurchase, error: null };
    }
    if (query.table === 'purchases') return { data: pendingPurchase, error: null };
    return { data: null, error: null };
  } });

  const response = await h.call('post', '/api/checkout', {
    user: { id: 'user-test', email: 'tester@example.com' },
    body: { planId: 'season', immediateStart: true },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(inserts, 1);
  assert.equal(h.checkoutOptions[0].idempotencyKey, 'snm-checkout:purchase-new');
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
  }], error: null }), rpcImpl: () => ({ data: [], error: null }) });
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
    const h = harness({
      rpcResult: { data: null, error: { message: 'database unavailable' } },
      result: () => ({ data: null, error: { message: 'database unavailable' } }),
    });
    const res = await h.call('post', '/webhooks/stripe', { body: { type, data: { object } } });
    assert.equal(res.statusCode, 500, type);
  }
});

test('failed season cancellation returns an error instead of promising no charge', async () => {
  const h = harness({ result: (query) => query.calls.some(([method]) => method === 'update')
    ? { error: { message: 'database unavailable' } }
    : { data: { plan_id: 'season', subscription_status: 'trialing', season_charge_due_at: '2027-01-01T00:00:00.000Z' }, error: null } });
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
    id: 'evt_season_setup', created: created - 100,
    type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_setup', mode: 'setup', created, customer: 'cus_test', setup_intent: 'seti_test',
      client_reference_id: 'user-test',
    } },
  } });
  assert.equal(res.statusCode, 200);
  const event = h.rpcCalls.find(({ name }) => name === 'apply_stripe_purchase_event');
  assert.equal(event.args.p_setup_intent_id, 'seti_test');
  assert.equal(event.args.p_checkout_session_id, 'cs_setup');
  assert.equal(event.args.p_profile_patch.stripe_setup_intent_id, 'seti_test');
  assert.equal(event.args.p_profile_patch.trial_expires_at, new Date((created + 3 * 86400) * 1000).toISOString());
  assert.equal(event.args.p_profile_patch.season_charge_due_at, event.args.p_profile_patch.trial_expires_at);
});

test('tracked Checkout completion applies purchase atomically and completes the onboarding account', async () => {
  const created = 1_800_000_000;
  const h = harness({
    result: (query) => query.table === 'users'
      ? { data: { id: 'user-test', subscription_status: 'expired', stripe_setup_intent_id: null }, error: null }
      : { data: null, error: null },
    rpcImpl: (name) => name === 'apply_stripe_purchase_event'
      ? { data: 'applied', error: null }
      : { data: true, error: null },
  });

  const response = await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_tracked_setup', created: created - 100,
    type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_tracked', mode: 'setup', created, customer: 'cus_test', setup_intent: 'seti_test',
      client_reference_id: 'user-test', metadata: { purchase_id: 'purchase-test', plan_id: 'season' },
    } },
  } });

  assert.equal(response.statusCode, 200);
  assert.equal(h.rpcCalls.length, 2);
  assert.equal(h.rpcCalls[0].name, 'apply_stripe_purchase_event');
  assert.equal(h.rpcCalls[0].args.p_event_id, 'evt_tracked_setup');
  assert.equal(h.rpcCalls[0].args.p_purchase_id, 'purchase-test');
  assert.equal(h.rpcCalls[0].args.p_checkout_session_id, 'cs_tracked');
  assert.equal(h.rpcCalls[0].args.p_profile_patch.stripe_payment_method_id, 'pm_test');
  assert.equal(h.rpcCalls[1].name, 'complete_paid_onboarding');
  assert.equal(h.rpcCalls[1].args.p_user_id, 'user-test');
  assert.equal(h.rpcCalls[1].args.p_purchase_id, 'purchase-test');
  const userUpdates = h.queries.filter((query) => query.table === 'users' && query.calls.some(([method]) => method === 'update'))
    .map((query) => Object.keys(query.calls.find(([method]) => method === 'update')[1]));
  assert.deepEqual(userUpdates, [['season_trial_used_at']]);
});

test('a retried season setup event cannot restart a cancelled trial', async () => {
  const h = harness({ result: (query) => {
    if (query.calls.some(([method]) => method === 'select')) {
      return { data: { stripe_setup_intent_id: 'seti_test' }, error: null };
    }
    return { data: null, error: null };
  } });
  const res = await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_replay_setup', created: 1_800_000_100,
    type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_setup', mode: 'setup', created: 1_800_000_000, customer: 'cus_test',
      setup_intent: 'seti_test', client_reference_id: 'user-test',
    } },
  } });
  assert.equal(res.statusCode, 200);
  assert.deepEqual({ ...h.rpcCalls[0].args.p_profile_patch }, {});
});

test('season charges reuse a stable Stripe idempotency key across retries', async () => {
  const due = {
    purchase_id: 'purchase-season-1',
    user_id: 'user-test',
    stripe_customer_id: 'cus_test',
    stripe_payment_method_id: 'pm_test',
    season_charge_due_at: '2027-01-15T12:00:00.000Z',
    attempt_number: 1,
    stripe_payment_intent_id: null,
    season_charge_idempotency_key: 'season:user-test:2027-01-15T12:00:00.000Z',
    price_amount_minor: 51200,
  };
  const h = harness({
    rpcImpl: (name) => name === 'claim_due_season_charges' ? { data: [due], error: null } : { data: 'succeeded', error: null },
    result: (query) => query.table === 'purchases' && query.calls.some(([method]) => method === 'select')
      ? { data: query.calls.some(([method, column]) => method === 'eq' && column === 'id') ? { cancel_requested_at: null } : [], error: null }
      : { data: null, error: null },
  });
  await h.chargeDueSeasonPasses();
  await h.chargeDueSeasonPasses();
  assert.equal(h.paymentIntentCalls.length, 2);
  assert.equal(h.rpcCalls.filter((call) => call.name === 'claim_due_season_charges').length, 2);
  assert.equal(h.paymentIntentCalls[0].params.metadata.purchase_id, 'purchase-season-1');
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
    rpcImpl: (name) => name === 'claim_due_season_charges' ? { data: [{
      purchase_id: 'purchase-season-1', user_id: due.id, stripe_customer_id: due.stripe_customer_id,
      stripe_payment_method_id: due.stripe_payment_method_id, season_charge_due_at: due.season_charge_due_at,
      attempt_number: 1, stripe_payment_intent_id: null,
      season_charge_idempotency_key: 'season:user-test:2027-01-15T12:00:00.000Z', price_amount_minor: 51200,
    }], error: null } : { data: 'succeeded', error: null },
    result: (query) => query.table === 'purchases' && query.calls.some(([method]) => method === 'select')
      ? { data: query.calls.some(([method, column]) => method === 'eq' && column === 'id') ? { cancel_requested_at: null } : [], error: null }
      : { data: null, error: query.table === 'users' && query.calls.some(([method]) => method === 'update') ? { message: 'database unavailable' } : null },
  });

  await h.chargeDueSeasonPasses();

  const updates = h.queries.filter((query) => query.table === 'users').flatMap((query) => query.calls).filter(([method]) => method === 'update');
  assert.equal(updates.length, 1);
  assert.equal(updates[0][1].subscription_status, 'season');
  assert.equal(updates[0][1].access_expires_at, season.ACCESS_END.toISOString());
  assert.equal(h.paymentIntentCalls[0].params.amount, 51200); // the locked price, not a constant
});

test('season charge stores an SCA-required intent instead of treating it as a decline', async () => {
  const h = harness({
    paymentIntentError: {
      type: 'StripeCardError', code: 'authentication_required',
      payment_intent: { id: 'pi_auth', status: 'requires_action' },
    },
    rpcImpl: (name) => name === 'claim_due_season_charges' ? { data: [{
      purchase_id: 'purchase-season-1', user_id: 'user-test', stripe_customer_id: 'cus_test',
      stripe_payment_method_id: 'pm_test', season_charge_due_at: '2027-01-15T12:00:00.000Z',
      attempt_number: 1, stripe_payment_intent_id: null,
      season_charge_idempotency_key: 'season:purchase-season-1', price_amount_minor: 51200,
    }], error: null } : { data: 'requires_action', error: null },
  });
  await h.chargeDueSeasonPasses();
  const saved = h.rpcCalls.find((call) => call.name === 'set_season_charge_state');
  assert.equal(saved.args.p_state, 'requires_action');
  assert.equal(saved.args.p_payment_intent_id, 'pi_auth');
  assert.equal(h.paymentIntentCalls.length, 1);
});

test('ambiguous season charge retries reconcile the purchase metadata before creating again', async () => {
  let claim = 0;
  const h = harness({
    paymentIntentError: { type: 'StripeConnectionError', code: 'api_connection_error' },
    paymentIntentSearchResult: { data: [{ id: 'pi_recovered' }] },
    paymentIntentRetrieveResult: { status: 'succeeded', created: 1_800_000_000 },
    rpcImpl: (name) => name === 'claim_due_season_charges' ? { data: [{
      purchase_id: 'purchase-season-1', user_id: 'user-test', stripe_customer_id: 'cus_test',
      stripe_payment_method_id: 'pm_test', season_charge_due_at: '2027-01-15T12:00:00.000Z',
      attempt_number: ++claim, stripe_payment_intent_id: null,
      season_charge_idempotency_key: 'season:purchase-season-1', price_amount_minor: 51200,
    }], error: null } : { data: 'ok', error: null },
    result: (query) => query.table === 'purchases' && query.calls.some(([method]) => method === 'select')
      ? { data: query.calls.some(([method, column]) => method === 'eq' && column === 'id') ? { cancel_requested_at: null } : [], error: null }
      : { data: null, error: null },
  });
  await h.chargeDueSeasonPasses();
  await h.chargeDueSeasonPasses();
  assert.equal(h.paymentIntentCalls.length, 1);
  assert.equal(h.paymentIntentSearches.length, 1);
  assert.match(h.paymentIntentSearches[0].query, /purchase-season-1/);
  assert.deepEqual(h.paymentIntentRetrievals, ['pi_recovered']);
});

test('cancellation is durably requested before Stripe cancels an SCA intent', async () => {
  const h = harness({
    result: (query) => query.table === 'users'
      ? { data: { plan_id: 'season', subscription_status: 'past_due', season_charge_due_at: '2027-01-01T00:00:00.000Z' }, error: null }
      : query.table === 'purchases'
        ? { data: { id: 'purchase-season-1' }, error: null }
        : { data: null, error: null },
    rpcImpl: (name) => name === 'request_season_charge_cancel'
      ? { data: [{ result: 'cancellation_requested', payment_intent_id: 'pi_auth', charge_status: 'requires_action' }], error: null }
      : { data: 'canceled', error: null },
  });
  const result = await h.cancelPlanForUser('user-test');
  assert.equal(result.status, 200);
  assert.equal(h.paymentIntentCancellations[0], 'pi_auth');
  assert.ok(h.operationLog.indexOf('rpc:request_season_charge_cancel') < h.operationLog.indexOf('stripe:payment_intent.cancel'));
});

test('monthly cancellation persists intent before the Stripe request', async () => {
  const h = harness({
    result: (query) => query.table === 'users'
      ? { data: { plan_id: 'monthly', subscription_status: 'active', stripe_subscription_id: 'sub_test' }, error: null }
      : query.table === 'purchases'
        ? { data: { id: 'purchase-monthly-1' }, error: null }
        : { data: null, error: null },
  });
  const result = await h.cancelPlanForUser('user-test');
  assert.equal(result.status, 200);
  assert.ok(h.operationLog.indexOf('db:update:purchases') < h.operationLog.indexOf('stripe:subscription.retrieve'));
  assert.ok(h.operationLog.indexOf('stripe:subscription.retrieve') < h.operationLog.indexOf('stripe:subscription.update'));
});

test('the authenticated season-charge endpoint exposes only the owned SCA client secret', async () => {
  const h = harness({
    result: (query) => query.table === 'purchases'
      ? { data: { id: 'purchase-season-1', season_charge_status: 'requires_action', stripe_payment_intent_id: 'pi_auth', cancel_requested_at: null }, error: null }
      : { data: null, error: null },
    paymentIntentRetrieveResult: {
      id: 'pi_auth', status: 'requires_action', client_secret: 'pi_secret_private',
      metadata: { purchase_id: 'purchase-season-1', app_user_id: 'user-test' },
    },
  });
  const result = await h.call('get', '/api/subscription/season-charge');
  assert.equal(result.body.status, 'requires_action');
  assert.equal(result.body.clientSecret, 'pi_secret_private');
});

test('withdrawal refunds only the PaymentIntent attached to the purchase', async () => {
  const paidAt = daysAgo(3);
  const withdrawalHarness = (consent) => harness({
    paymentIntentRetrieveResult: { id: 'pi_linked', status: 'succeeded', amount_received: 51200 },
    result: (query) => {
      if (query.table === 'users' && query.calls.some(([method]) => method === 'select')) return { data: {
        stripe_customer_id: 'cus_test', stripe_subscription_id: null, plan_id: 'season',
        subscription_status: 'season', plan_started_at: daysAgo(10), last_paid_at: paidAt,
      }, error: null };
      if (query.table === 'purchases' && query.calls.some(([method]) => method === 'select')) return { data: {
        id: 'purchase-season-1', plan: 'season', status: 'active', stripe_payment_intent_id: 'pi_linked',
        stripe_subscription_id: null, refund_status: 'none', refund_attempts: 0, season_charge_status: 'succeeded',
        price_amount_minor: 51200, immediate_start_consent_at: consent ? daysAgo(10) : null,
        access_ends_at: season.ACCESS_END.toISOString(), refund_amount_minor: null,
      }, error: null };
      return { data: null, error: null };
    },
  });
  const h = withdrawalHarness(true);
  const result = await h.withdrawPlanForUser('user-test');
  assert.equal(result.status, 200);
  assert.equal(result.body.refundStatus, 'succeeded');
  assert.equal(h.refundListCalls[0].payment_intent, 'pi_linked');
  assert.equal(h.refundListCalls[0].limit, 100);
  assert.equal(h.refundCalls[0].params.payment_intent, 'pi_linked');
  assert.equal(h.paymentIntentCalls.some((call) => call.params.customer === 'cus_test'), false);
  // Pro rata: the paid days used are kept, the rest is refunded with an explicit amount.
  const owed = season.proRataOwedMinor({ paidMinor: 51200, paidAt, accessEndsAt: season.ACCESS_END, now: new Date() });
  assert.ok(Math.abs(h.refundCalls[0].params.amount - (51200 - owed)) <= 1);
  assert.ok(h.refundCalls[0].params.amount < 51200);

  // Without an express request for immediate start nothing may be deducted.
  const noConsent = withdrawalHarness(false);
  await noConsent.withdrawPlanForUser('user-test');
  assert.equal(noConsent.refundCalls[0].params.amount, 51200);
});

test('withdrawal is refused after 14 days from the order', async () => {
  const h = harness({
    result: (query) => query.table === 'users'
      ? { data: { plan_id: 'season', subscription_status: 'season', plan_started_at: daysAgo(15), last_paid_at: daysAgo(12) }, error: null }
      : { data: null, error: null },
  });
  const result = await h.withdrawPlanForUser('user-test');
  assert.equal(result.status, 400);
  assert.equal(result.body.code, 'NOT_WITHDRAWABLE');
});

test('a failed linked refund can be retried without changing the purchase or duplicating the charge', async () => {
  let purchase = {
    id: 'purchase-season-1', plan: 'season', status: 'active', stripe_payment_intent_id: 'pi_linked',
    stripe_subscription_id: null, refund_status: 'none', refund_attempts: 0, season_charge_status: 'succeeded',
    price_amount_minor: 51200, immediate_start_consent_at: daysAgo(10),
    access_ends_at: season.ACCESS_END.toISOString(), refund_amount_minor: null,
  };
  const h = harness({
    paymentIntentRetrieveResult: { id: 'pi_linked', status: 'succeeded', amount_received: 51200 },
    refundCreateError: new Error('temporary refund error'),
    result: (query) => {
      if (query.table === 'users' && query.calls.some(([method]) => method === 'select')) return { data: {
        stripe_customer_id: 'cus_test', stripe_subscription_id: null, plan_id: 'season',
        subscription_status: 'season', plan_started_at: daysAgo(10), last_paid_at: daysAgo(3),
      }, error: null };
      if (query.table === 'purchases' && query.calls.some(([method]) => method === 'select')) return { data: { ...purchase }, error: null };
      if (query.table === 'purchases' && query.calls.some(([method]) => method === 'update')) {
        const patch = query.calls.find(([method]) => method === 'update')[1];
        purchase = { ...purchase, ...patch };
      }
      return { data: null, error: null };
    },
    rpcImpl: (name, args) => {
      if (name === 'set_purchase_refund_state') {
        purchase = {
          ...purchase,
          status: 'withdrawn', refund_status: args.p_state,
          refund_attempts: purchase.refund_attempts + (args.p_state === 'pending' && !args.p_refund_id ? 1 : 0),
        };
      }
      return { data: 'ok', error: null };
    },
  });
  const first = await h.withdrawPlanForUser('user-test');
  assert.equal(first.status, 202);
  assert.equal(first.body.refundStatus, 'failed');
  h.setRefundCreateError(null);
  const second = await h.withdrawPlanForUser('user-test');
  assert.equal(second.status, 200);
  assert.equal(second.body.refundStatus, 'succeeded');
  assert.equal(h.refundCalls.length, 2);
  assert.notEqual(h.refundCalls[0].options.idempotencyKey, h.refundCalls[1].options.idempotencyKey);
  assert.ok(h.refundCalls.every((call) => call.params.payment_intent === 'pi_linked'));
  // The amount decided on the first request is repeated exactly, even days later.
  assert.equal(h.refundCalls[0].params.amount, h.refundCalls[1].params.amount);
});

test('season success webhooks calculate access from the payment time', async () => {
  const created = Math.floor(new Date('2026-03-25T12:00:00.000Z').getTime() / 1000);
  const h = harness({ result: () => ({ data: null, error: null }) });
  const res = await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_season_paid', created,
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_season', created, metadata: { plan_id: 'season', app_user_id: 'user-test' } } },
  } });
  assert.equal(res.statusCode, 200);
  const event = h.rpcCalls[0].args;
  assert.equal(event.p_payment_intent_id, 'pi_season');
  assert.equal(event.p_profile_patch.access_expires_at, season.ACCESS_END.toISOString());
});

test('an old invoice failure cannot downgrade a replacement subscription', async () => {
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: { id: 'user-test' }, error: null }
    : { data: null, error: null } });
  const res = await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_old_invoice', created: 100,
    type: 'invoice.payment_failed',
    data: { object: { customer: 'cus_test', subscription: 'sub_old' } },
  } });
  assert.equal(res.statusCode, 200);
  const lookup = h.queries.find((query) => query.table === 'users');
  assert.deepEqual(Array.from(lookup.calls.find(([method]) => method === 'eq').slice(1)), ['stripe_subscription_id', 'sub_old']);
  assert.equal(h.rpcCalls[0].args.p_profile_patch.subscription_status, 'past_due');
});

test('webhook payloads in the dahlia API shape keep paid access self-expiring', async () => {
  // 2026-08-26.dahlia: period end lives on the subscription items and the
  // invoice's subscription under parent.subscription_details.
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: { id: 'user-test' }, error: null }
    : { data: null, error: null } });
  const end = 1792590527;
  await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_sub_updated', created: 200,
    type: 'customer.subscription.updated',
    data: { object: { id: 'sub_new', status: 'active', items: { data: [{ current_period_end: end }] } } },
  } });
  assert.equal(h.rpcCalls[0].args.p_profile_patch.access_expires_at, new Date(end * 1000).toISOString());

  const h2 = harness({ result: () => ({ data: null, error: null }) });
  await h2.call('post', '/webhooks/stripe', { body: {
    id: 'evt_invoice_failed', created: 201,
    type: 'invoice.payment_failed',
    data: { object: { customer: 'cus_test', parent: { subscription_details: { subscription: 'sub_old' } } } },
  } });
  assert.equal(h2.rpcCalls[0].args.p_user_id, null);
  assert.equal(h2.rpcCalls[0].args.p_profile_patch.subscription_status, 'past_due');
});

test('review reads resolve opt-in adult names without the nonexistent public.users relationship', async () => {
  const rows = [
    { id: 1, user_id: 'adult', role: 'rodic', status: 'published', show_name: true },
    { id: 2, user_id: 'child', role: 'student', status: 'published', show_name: true },
    { id: 3, user_id: 'user-test', role: 'ucitel', status: 'held', show_name: false },
    { id: 4, user_id: 'other', role: 'student', status: 'held', show_name: false },
  ];
  const h = harness({ env: { SCHOOL_REVIEWS_ENABLED: 'true' }, result: (query) => {
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
  const h = harness({ env: { SCHOOL_REVIEWS_ENABLED: 'true' }, result: (query) => {
    if (query.calls.some(([method, value]) => method === 'select' && /users\s*\(/.test(value))) return { error: { code: 'PGRST200', message: 'No relationship' } };
    const insert = query.calls.find(([method]) => method === 'insert')?.[1];
    return { data: { ...insert, id: 5 }, error: null };
  } });
  const res = await h.call('post', '/api/schools/:id/reviews', { params: { id: '1' }, body: { role: 'student', showName: true, body: 'Ředitel Novák nám pravidelně pomáhal s výukou i přípravou.' } });
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.status, 'held');
  assert.equal(res.body.display_name, null);
});

test('beta inbox returns reply read timestamps and counts only unread admin replies', async () => {
  const rows = [
    { id: 1, admin_reply: 'Nová odpověď', replied_at: '2026-10-08T10:00:00.000Z', reply_read_at: null },
    { id: 2, admin_reply: 'Upravená odpověď', replied_at: '2026-10-08T11:00:00.000Z', reply_read_at: '2026-10-08T10:30:00.000Z' },
    { id: 3, admin_reply: 'Přečtená odpověď', replied_at: '2026-10-08T10:00:00.000Z', reply_read_at: '2026-10-08T10:01:00.000Z' },
    { id: 4, admin_reply: null, replied_at: null, reply_read_at: null },
  ];
  const h = harness({ result: (query) => {
    if (query.table === 'beta_profile') return { data: { role: '9' }, error: null };
    if (query.table === 'beta_feedback') return { data: rows, error: null };
    return { data: null, error: null };
  } });
  const response = await h.call('get', '/api/beta/me');
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.unreadReplies, 2);
  assert.equal(response.body.feedback[0].reply_read_at, null);
  const select = h.queries.find((query) => query.table === 'beta_feedback').calls.find(([method]) => method === 'select')[1];
  assert.match(select, /reply_read_at/);
});

test('marking inbox replies read updates only the authenticated tester’s replied rows', async () => {
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: { id: 'user-test', subscription_status: 'beta' }, error: null }
    : { data: null, error: null } });
  const response = await h.callChain('post', '/api/beta/feedback/replies/read', { body: { user_id: 'other-user' } });
  assert.equal(response.statusCode, 204);
  const update = h.queries.find((query) => query.table === 'beta_feedback');
  assert.ok(update);
  const payload = update.calls.find(([method]) => method === 'update')[1];
  assert.ok(Number.isFinite(Date.parse(payload.reply_read_at)));
  assert.ok(update.calls.some(([method, column, value]) => method === 'eq' && column === 'user_id' && value === 'user-test'));
  assert.ok(update.calls.some(([method, column, operator, value]) => method === 'not' && column === 'admin_reply' && operator === 'is' && value === null));
});

test('school reviews stay disabled by default at both public API routes', async () => {
  const h = harness();
  const reads = await h.call('get', '/api/schools/:id/reviews', { params: { id: '1' } });
  assert.equal(reads.statusCode, 200);
  assert.deepEqual(Array.from(reads.body), []);
  const writes = await h.callChain('post', '/api/schools/:id/reviews', { params: { id: '1' }, body: {} });
  assert.equal(writes.statusCode, 403);
  assert.equal(h.queries.length, 0);
});

test('beta website review accepts private feedback and stamps publication consent server-side', async () => {
  for (const consent of [false, true]) {
    const h = harness({ result: (query) => {
      if (query.table === 'users') return { data: { id: 'user-test', subscription_status: 'beta' }, error: null };
      if (query.table === 'beta_profile') return { data: { role: '9' }, error: null };
      return { data: null, error: null };
    } });
    const response = await h.callChain('post', '/api/beta/review', { body: {
      review: { stars: 5, body: 'Pomohlo mi vybrat si vhodnou školu.', consent_publish: consent, display_label: 'Jméno', age_group: 'adult' },
    } });
    assert.equal(response.statusCode, 201);
    assert.equal(h.rpcCalls[0].name, 'submit_beta_review');
    assert.equal(h.rpcCalls[0].args.p_user_id, 'user-test');
    assert.equal(h.rpcCalls[0].args.p_review.display_label, 'Student, 9. třída');
    assert.equal(h.rpcCalls[0].args.p_review.age_group, 'unknown');
    assert.equal(h.rpcCalls[0].args.p_review.consent_publish, consent);
    assert.equal(h.rpcCalls[0].args.p_review.consent_text_version, consent ? '2026-10-08' : null);
  }
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
      if (query.table === 'purchases' && query.calls.some(([method]) => method === 'insert')) return { data: { id: 'purchase-parent', stripe_checkout_session_id: null }, error: null };
      if (query.table === 'purchases') return { data: null, error: null };
      return { data: null, error: null };
    },
  });
  const response = await valid.call('post', '/api/pay-links/:token/checkout', {
    params: { token: 'valid' }, body: { planId: 'season', immediateStart: true },
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
  assert.deepEqual(Object.keys(response.body).sort(), [
    'can_restore', 'checkout_open', 'expires_at', 'for_name', 'plan',
    'restore_charge_at', 'restore_kind', 'restore_price_czk', 'trial_eligible',
  ].sort());
  assert.equal('savedCard' in response.body, false); // the child's card is never shown to a parent
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
    onboarding_completed_at: hasAccess ? '2026-01-01T00:00:00.000Z' : null,
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

test('quick ratings go through submit_beta_micro; skips carry no answer; soft gate renews through feedback', async () => {
  const h=harness({result:(q)=>({data:q.table==='users'?{subscription_status:'beta'}:null,error:null})});
  const session='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const bad=await h.call('post','/api/beta/micro',{user:{id:'user-test'},body:{id:'dotaznik',action:'answer',rating:7}}); assert.equal(bad.statusCode,400);
  await h.call('post','/api/beta/micro',{user:{id:'user-test'},body:{id:'dotaznik',session_id:session,action:'answer',rating:4,answers:['Částečně: nesedí poloha'],note:'Skoly mi sedi'}});
  assert.equal(h.rpcCalls[0].name,'submit_beta_micro'); assert.equal(h.rpcCalls[0].args.p_user_id,'user-test');
  assert.equal(h.rpcCalls[0].args.p_answer,'4/5 · Částečně: nesedí poloha · Skoly mi sedi');
  await h.call('post','/api/beta/micro',{user:{id:'user-test'},body:{id:'detail',session_id:session,action:'skip',rating:3}});
  assert.equal(h.rpcCalls[1].args.p_answer,null);
  const short=await h.call('post','/api/beta/gate',{user:{id:'user-test'},body:{message:'short'}}); assert.equal(short.statusCode,400);
  await h.call('post','/api/beta/gate',{user:{id:'user-test'},body:{message:'Porovnani skol mi hodne pomohlo.'}});
  assert.equal(h.rpcCalls[2].name,'submit_beta_feedback_details'); assert.equal(h.rpcCalls[2].args.p_details.source,'gate');
});

test('quick rating renews access only when the optional note has the tester\'s own words',async()=>{
 const h=harness({result:(q)=>({data:q.table==='users'?{subscription_status:'beta'}:q.table==='beta_program_settings'?{ends_at:new Date(Date.now()+86400000).toISOString(),access_hours:48}:null,error:null})});
 const send=(body)=>h.call('post','/api/beta/micro',{user:{id:'user-test'},body:{id:'dotaznik',action:'answer',rating:4,...body}});
 const renewals=()=>h.queries.filter(q=>q.table==='users'&&q.calls.some(c=>c[0]==='update'&&c[1]?.tester_access_until)).length;
 assert.equal((await send({})).body.accessRenewed,false);
 assert.equal((await send({note:'dobre'})).body.accessRenewed,false);
 assert.equal(renewals(),0);
 assert.equal((await send({note:'Dotaznik byl srozumitelny'})).body.accessRenewed,true);
 assert.equal(renewals(),1);
 assert.equal((await send({answers:['Částečně: nesedí poloha ulice'],typed:['nesedí poloha ulice']})).body.accessRenewed,true);
 assert.equal(renewals(),2);
 assert.equal((await send({answers:['Ano'],typed:[]})).body.accessRenewed,false);
});
test('beta events refuse a legacy tester before the notice and cache school names after it',async()=>{
 const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
 const body={anon_id:id,session_id:id,events:[{name:'search',path:'/skoly',props:{length:8,query:'Gymnazium',results:1}}]};
 const response=(notice)=>(q)=>({data:q.table==='users'?{subscription_status:'beta'}:q.table==='beta_profile'?{consent_tracking_at:notice}:q.table==='beta_program_settings'?{ends_at:new Date(Date.now()+86400000).toISOString()}:q.table==='schools'?[{name:'Gymnazium Praha'}]:null,error:null});
 const blocked=harness({result:response(null)});
 assert.equal((await blocked.call('post','/api/beta/events',{body,headers:{authorization:'Bearer synthetic'}})).statusCode,403);
 assert.equal(blocked.rpcCalls.length,0);
 const allowed=harness({result:response('2026-01-01')});
 for(let i=0;i<2;i++) assert.equal((await allowed.call('post','/api/beta/events',{body,headers:{authorization:'Bearer synthetic'}})).statusCode,204);
 assert.equal(allowed.queries.filter(q=>q.table==='schools').length,1);
});
test('beta endpoints have separate per-user quotas; micro ask consumes no quota',()=>{
 const h=harness(),paths=['feedback','feedback/screenshot-url','micro','gate','closing'];
 const options=paths.map(p=>h.routeChains.get('post /api/beta/'+p).find(fn=>fn.options)?.options);
 assert.deepEqual(options.map(o=>o.limit),[20,20,20,10,10]);
 assert.equal(new Set(options).size,5);
 for(const o of options) assert.equal(o.keyGenerator({user:{id:'one'}}),'one');
 assert.equal(options[2].skip({body:{action:'ask'}}),true);
 assert.equal(options[2].skip({body:{action:'answer'}}),false);
});
test('production never signs beta tickets with the service key and lookup alone does not issue one',async()=>{
 const result=q=>({data:q.table==='beta_schools'?{code:'SCHOOL',school_name:'School'}:{ends_at:new Date(Date.now()+86400000).toISOString()},error:null});
 const h=harness({result,env:{NODE_ENV:'production'}});
 const req={params:{code:'SCHOOL'},query:{anon:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',notice:'1',role:'9'}};
 assert.equal((await h.call('get','/api/beta/schools/:code',req)).body.trackingTicket,null);
 const signed=harness({result,env:{NODE_ENV:'production',BETA_TICKET_SECRET:'dedicated'}});
 assert.equal((await signed.call('get','/api/beta/schools/:code',{...req,query:{anon:req.query.anon}})).body.trackingTicket,null);
 const ticket=(await signed.call('get','/api/beta/schools/:code',req)).body.trackingTicket;
 assert.ok(require('../lib/betaAnalytics').verifyVisitorTicket('dedicated',ticket,req.query.anon));
 assert.equal(require('../lib/betaAnalytics').verifyVisitorTicket('synthetic',ticket,req.query.anon),null);
});

test('ranking writes reject normal accounts and testers without notice; owner/source fields are server derived',async()=>{
 const id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',body={source:'onboarding',capture_id:id,ranking:[2,1],user_id:'attacker',answers:{body:90},email:'secret'};
 const result=(status,notice)=>(q)=>({data:q.table==='users'?{subscription_status:status}:q.table==='beta_profile'?{consent_tracking_at:notice}:q.table==='schools'?[{id:1},{id:2}]:q.table==='beta_program_settings'?{ends_at:new Date(Date.now()+86400000).toISOString()}:null,error:null});
 const normal=harness({result:result('active','now')});assert.equal((await normal.callChain('post','/api/beta/rankings',{body})).statusCode,403);
 const legacy=harness({result:result('beta',null)});assert.equal((await legacy.callChain('post','/api/beta/rankings',{body})).statusCode,403);
 const beta=harness({result:result('beta','now')});assert.equal((await beta.callChain('post','/api/beta/rankings',{body})).statusCode,204);
 const saved=beta.queries.find(q=>q.table==='beta_rankings').calls.find(c=>c[0]==='upsert')[1];
 assert.equal(saved.user_id,'user-test');assert.equal(saved.source,'onboarding');assert.equal(saved.answers,undefined);assert.equal(saved.email,undefined);assert.deepEqual(Array.from(saved.ranking),[2,1]);
 assert.equal((await beta.callChain('post','/api/beta/rankings',{body:{...body,ranking:[2,2]}})).statusCode,400);
 assert.equal((await beta.callChain('post','/api/beta/rankings',{body:{...body,ranking:[2,3]}})).statusCode,400);
});

test('link sharing is off unless SHARING_ENABLED=true', async () => {
  const off = harness({ env: { SHARING_ENABLED: '' } });
  for (const key of ['post /api/share-links', 'get /api/shared/:token', 'post /api/result-snapshots', 'post /api/handoffs', 'get /api/pay-links/:token']) {
    const [guard] = off.routeChains.get(key);
    let code = 200; let nexted = false;
    guard({}, { status(c) { code = c; return { json() {} }; } }, () => { nexted = true; });
    assert.equal(code, 404, key); assert.equal(nexted, false, key);
  }
  const [guard] = harness().routeChains.get('get /api/shared/:token');
  let nexted = false; guard({}, {}, () => { nexted = true; });
  assert.equal(nexted, true);
});

test('account deletion removes the tester screenshots first and keeps the account if that fails', async () => {
  const h = harness({ storageListResult: async (prefix) => ({ data: [{ name: 'a.png' }, { name: 'b.jpg' }], error: null, prefix }) });
  assert.equal((await h.call('delete', '/api/me')).statusCode, 204);
  assert.deepEqual(h.storageRemovals, ['user-test/a.png', 'user-test/b.jpg']);
  assert.equal(h.deletions, 1);
  const failing = harness({ storageListResult: async () => ({ data: null, error: { message: 'down' } }) });
  assert.equal((await failing.call('delete', '/api/me')).statusCode, 502);
  assert.equal(failing.deletions, 0);
});

test('switching usage recording off pauses it and deletes this account\'s recorded usage', async () => {
  const h = harness({ result: (query) => {
    if (query.table === 'users') return { data: { id: 'user-test', subscription_status: 'beta' }, error: null };
    if (query.table === 'beta_profile') return { data: { user_id: 'user-test', consent_tracking_at: '2026-10-10T00:00:00Z' }, error: null };
    return { data: null, error: null };
  } });
  const off = await h.call('post', '/api/beta/tracking', { body: { enabled: false } });
  assert.equal(off.statusCode, 200);
  assert.ok(h.queries.some((q) => q.table === 'beta_profile' && q.calls.some(([m, v]) => m === 'update' && v.tracking_paused_at)));
  for (const table of ['beta_events', 'beta_rankings']) {
    const q = h.queries.find((x) => x.table === table);
    assert.ok(q.calls.some(([m]) => m === 'delete') && q.calls.some(([m, col, v]) => m === 'eq' && col === 'user_id' && v === 'user-test'), table);
  }
  const on = harness({ result: (query) => query.table === 'users' ? { data: { subscription_status: 'beta' }, error: null } : { data: { consent_tracking_at: '2026-10-10T00:00:00Z' }, error: null } });
  assert.equal((await on.call('post', '/api/beta/tracking', { body: { enabled: true } })).statusCode, 200);
  assert.ok(!on.queries.some((q) => q.table === 'beta_events'));
  assert.equal((await on.call('post', '/api/beta/tracking', { body: {} })).statusCode, 400);
});

test('auth outages remain retryable on profile and beta event endpoints', async () => {
  for (const error of [{ name: 'AuthRetryableFetchError', status: 0 }, { name: 'AuthApiError', status: 503 }, { name: 'AuthApiError', status: 429 }]) {
    const h = harness({ authResult: { data: null, error } });
    assert.equal((await h.callChain('get', '/api/me')).statusCode, 503);
    assert.equal((await h.call('post', '/api/beta/events', { headers: { authorization: 'Bearer synthetic' } })).statusCode, 503);
    assert.equal(h.queries.length, 0);
    assert.equal(h.rpcCalls.length, 0);
  }
});

test('authoritative token rejection still answers 401 without recording events', async () => {
  const h = harness({ authResult: { data: null, error: { name: 'AuthApiError', status: 401 } } });
  assert.equal((await h.callChain('get', '/api/me')).statusCode, 401);
  assert.equal((await h.call('post', '/api/beta/events', { headers: { authorization: 'Bearer synthetic' } })).statusCode, 401);
  assert.equal(h.queries.length, 0);
  assert.equal(h.rpcCalls.length, 0);
});

test('withdrawing health consent strips the disability answer from only the caller’s runs and re-scores', async () => {
  const runs = [
    { id: 1, answers: { typ: 'gymnazium', postizeni: 'ano', postizeni_typ: ['sluchove'] }, matches: [{ school_id: 11, reason: 'Starý důvod.' }] },
    { id: 2, answers: { typ: 'odborna' }, matches: [] },
  ];
  const h = harness({
    result: (query) => {
      if (query.table === 'questionnaire_runs') return query.calls.some((c) => c[0] === 'update') ? { data: null, error: null } : { data: runs, error: null };
      if (query.table === 'schools') return { data: [{ id: 11, name: 'Škola 11', programs: 'Gymnázium' }], error: null };
      return { data: null, error: null };
    },
  });
  const response = await h.call('post', '/api/questionnaire/health-consent/withdraw');
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.updated, 1);
  const updates = h.queries.filter((q) => q.table === 'questionnaire_runs' && q.calls.some((c) => c[0] === 'update'));
  assert.equal(updates.length, 1);
  const payload = updates[0].calls.find((c) => c[0] === 'update')[1];
  assert.equal(JSON.stringify(payload.answers), JSON.stringify({ typ: 'gymnazium' }));
  assert.equal(payload.matches[0].reason, 'Starý důvod.');
  assert.ok(updates[0].calls.some((c) => c[0] === 'eq' && c[1] === 'user_id' && c[2] === 'user-test'));
});

test('commute endpoints expose the static stops and an aligned school column', async () => {
  const matrix = { feedDate: '2026-10-18', stops: [{ id: 'pid-1040-andel', name: 'Anděl', lat: 50.07, lon: 14.4 }], schools: { 12: [24] } };
  const h = harness({
    commuteMatrix: matrix,
    commuteMatrixPresent: true,
    result: () => ({ data: { id: 12, merged_into: null, hidden_reason: null }, error: null }),
  });
  const stops = await h.call('get', '/api/commute/stops');
  assert.equal(stops.statusCode, 200);
  assert.equal(JSON.stringify(stops.body), JSON.stringify({ feedDate: matrix.feedDate, stops: matrix.stops }));
  const commute = await h.call('get', '/api/schools/:id/commute', { params: { id: '12' } });
  assert.equal(commute.statusCode, 200);
  assert.equal(JSON.stringify(commute.body), JSON.stringify({ feedDate: matrix.feedDate, minutes: [24] }));
});

test('commute endpoint rejects malformed ids and hidden or merged schools', async () => {
  const matrix = { feedDate: '2026-10-18', stops: [], schools: { 12: [24] } };
  const validMatrix = { commuteMatrix: matrix, commuteMatrixPresent: true };
  const badId = harness(validMatrix);
  assert.equal((await badId.call('get', '/api/schools/:id/commute', { params: { id: '12x' } })).statusCode, 400);
  assert.equal(badId.queries.length, 0);

  for (const school of [
    { id: 12, hidden_reason: 'not_for_9th_grade', merged_into: null },
    { id: 12, hidden_reason: null, merged_into: 13 },
  ]) {
    const h = harness({ ...validMatrix, result: () => ({ data: school, error: null }) });
    assert.equal((await h.call('get', '/api/schools/:id/commute', { params: { id: '12' } })).statusCode, 404);
  }
});

test('anonymous school catalogue is a map-only projection and detail remains view-only public', async () => {
  const source = {
    id: 42, name: 'Škola', official_name: 'Oficiální škola', location: 'Praha', district: 'Praha 1',
    contact: 'info@skola.cz', website: 'https://skola.cz', latitude: 50.1, longitude: 14.4,
    merged_into: null, hidden_reason: null, secret_internal: 'must not escape',
    school_programs: [{ typ_skoly: 'Gymnázium 4leté', kkov: '79-41-K/41',
      jazyk_studia: 'Český', delka_studia: 4, maturitni: true, rok: 2026, school_id: 42,
      cutoff: 86, kapacita: 90, prihlasky: 120, prijati: 90 }],
    school_extracted_details: [{ skolne_poplatky: null }],
  };
  const h = harness({ result: (query) => query.table === 'schools'
    ? { data: query.calls.some(([method]) => method === 'in') ? []
      : query.calls.some(([method]) => method === 'single') ? source : [source], error: null }
    : { data: null, error: null } });

  const list = await h.call('get', '/api/schools', { user: null, query: {} });
  assert.equal(list.statusCode, 200);
  assert.deepEqual(Object.keys(list.body[0]).sort(), ['contact','district','id','latitude','location','longitude','name','official_name','school_programs','website'].sort());
  assert.equal(list.body[0].school_programs[0].kkov, '79-41-K/41');
  assert.equal(list.body[0].school_programs[0].cutoff, 86);
  assert.equal(list.body[0].district, 'Praha 1');
  assert.equal(h.queries[0].calls.find(([method]) => method === 'select')[1],
    'id,name,official_name,location,contact,website,latitude,longitude,school_programs(maturitni,jpz_povinna,typ_skoly,jazyk_studia,kkov,zrizovatel,kapacita,cutoff,rok,prihlasky,prijati,obor_nazev,forma_vzdelavani,zamereni)');

  const detail = await h.call('get', '/api/schools/:id', { user: null, params: { id: '42' } });
  assert.equal(detail.statusCode, 200);
  assert.equal(detail.body.name, 'Škola');
  assert.equal(detail.body.contact, 'info@skola.cz');
  assert.equal(detail.body.school_programs[0].school_id, 42);
  assert.equal('secret_internal' in detail.body, false);
  assert.equal('merged_into' in detail.body, false);
  assert.equal('hidden_reason' in detail.body, false);
});

test('only incomplete signed-in accounts get full catalogue through onboarding scope', async () => {
  const profile = {
    trial_expires_at: '2999-01-01T00:00:00.000Z', subscription_status: 'trialing',
    access_expires_at: null, onboarding_completed_at: null,
  };
  const rows = [{ id: 1, name: 'Škola', location: 'Praha', latitude: 50, longitude: 14,
    school_programs: [{ typ_skoly: 'Gymnázium', kkov: '79-41-K/41', rok: 2026 }] }];
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null }
    : query.table === 'schools' ? { data: rows, error: null } : { data: null, error: null } });

  const publicList = await h.call('get', '/api/schools', { query: {} });
  assert.equal(publicList.statusCode, 200);
  assert.equal('school_extracted_details' in publicList.body[0], false);

  const onboarding = await h.call('get', '/api/schools', { query: { scope: 'onboarding' } });
  assert.equal(onboarding.statusCode, 200);
  assert.equal(h.queries.at(-1).calls.find(([method]) => method === 'select')[1],
    '*, school_programs(*), school_extracted_details(*)');
  const access = await h.accessStateFor('user-test', 'student@example.com');
  assert.equal(access.hasAccess, false);
  assert.equal(access.httpStatus, 403);
  assert.equal(access.body.code, 'ONBOARDING_INCOMPLETE');
  assert.equal(access.profile.onboarding_completed_at, null);
});

test('signed-in accounts without access can still open the map school card read-only', async () => {
  const profile = { onboarding_completed_at: null, trial_expires_at: null, subscription_status: null };
  const school = { id: 42, name: 'Škola', location: 'Praha', merged_into: null,
    hidden_reason: null, school_programs: [], school_extracted_details: [] };
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null }
    : query.table === 'schools' ? { data: school, error: null } : { data: [], error: null } });
  const response = await h.call('get', '/api/schools/:id', { params: { id: '42' } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.name, 'Škola');
  assert.equal('hidden_reason' in response.body, false);
  const schoolRead = h.queries.find((query) => query.table === 'schools');
  assert.equal(schoolRead.calls.find(([method]) => method === 'select')[1],
    'id,name,official_name,location,contact,website,latitude,longitude,merged_into,hidden_reason,school_programs(*),school_extracted_details(*)');
});

test('full comparison catalogue stays gated until an account has completed onboarding and paid', async () => {
  const profile = {
    trial_expires_at: '2999-01-01T00:00:00.000Z', subscription_status: 'trialing',
    access_expires_at: null, onboarding_completed_at: null,
  };
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null } : { data: [], error: null } });
  const denied = await h.call('get', '/api/schools', { query: { ids: '1,2' } });
  assert.equal(denied.statusCode, 402);
  assert.equal(denied.body.code, 'PAYMENT_REQUIRED');
  assert.equal(h.queries.some((query) => query.table === 'schools'), false);
});

test('onboarding progress validates steps and binds each saved draft to the authenticated user', async () => {
  const profile = { onboarding_completed_at: null };
  const invalid = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null } : { data: null, error: null } });
  const rejected = await invalid.callChain('put', '/api/me/onboarding-progress', {
    body: { stepId: '/skoly', role: 'student', answers: {}, intents: [], planId: 'season' },
  });
  assert.equal(rejected.statusCode, 400);
  assert.equal(invalid.queries.length, 0);

  const h = harness({ result: (query) => query.table === 'users'
    ? { data: profile, error: null } : { data: null, error: null } });
  const saved = await h.callChain('put', '/api/me/onboarding-progress', {
    body: { stepId: 'q4', role: 'student', answers: { focus: ['it'] }, intents: ['srovnat'],
      commitment: null, gender: 'f', planId: 'monthly' },
  });
  assert.equal(saved.statusCode, 204);
  const row = h.queries.find((query) => query.table === 'onboarding_progress')
    .calls.find(([method]) => method === 'upsert')[1];
  assert.equal(row.user_id, 'user-test');
  assert.equal(row.step_id, 'q4');
  assert.deepEqual(row.answers, { focus: ['it'] });
  assert.equal(row.plan_id, 'monthly');
});

test('commute endpoints return 503 when the generated matrix is missing', async () => {
  const h = harness();
  assert.equal((await h.call('get', '/api/commute/stops')).statusCode, 503);
  assert.equal((await h.call('get', '/api/schools/:id/commute', { params: { id: '12' } })).statusCode, 503);
  assert.equal(h.queries.length, 0);
});

test('the ordinary trial window opens once, on the first confirmed request that reads the profile', async () => {
  const fresh = { trial_expires_at: null, subscription_status: 'trialing', onboarding_completed_at: '2026-01-01T00:00:00.000Z', access_expires_at: null };
  const started = '2026-10-23T10:00:00.000Z';
  const runAccess = async (profile, afterRpc) => {
    let current = profile;
    const h = harness({
      rpcImpl: () => { current = { ...current, ...afterRpc }; return { data: started, error: null }; },
      result: (query) => query.table === 'users' ? { data: current, error: null } : { data: null, error: null },
    });
    const req = { user: { id: 'user-test', email: 'tester@example.com' } };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let reached = false;
    await h.requireAccess(req, res, () => { reached = true; });
    return { h, res, reached };
  };

  const first = await runAccess(fresh, { trial_expires_at: '2999-01-01T00:00:00.000Z' });
  assert.equal(first.reached, true);
  assert.deepEqual(first.h.rpcCalls.map((call) => call.name), ['start_ordinary_trial']);
  assert.equal(first.h.rpcCalls[0].args.p_user_id, 'user-test');

  const later = await runAccess({ ...fresh, trial_expires_at: '2999-01-01T00:00:00.000Z' }, {});
  assert.equal(later.h.rpcCalls.length, 0, 'an account with a window never calls the starter again');

  const paid = await runAccess({ ...fresh, subscription_status: 'season', access_expires_at: '2999-01-01T00:00:00.000Z' }, {});
  assert.equal(paid.h.rpcCalls.length, 0, 'paid, beta, creator and developer rows are not given a trial');

  const failed = await runAccess(fresh, {});
  assert.equal(failed.reached, false, 'a starter that leaves no window grants no access');
  assert.equal(failed.res.statusCode, 402);
});

test('trial start schema is nullable, service-only and mirrored in the repeatable setup', () => {
  const { readFileSync } = require('node:fs');
  const migration = readFileSync('migrations/2026-10-23-trial-starts-at-first-signin.sql', 'utf8');
  const setup = readFileSync('supabase-setup.sql', 'utf8');
  for (const sql of [migration, setup]) {
    assert.match(sql, /alter table public\.users alter column trial_expires_at drop not null/i);
    assert.match(sql, /where u\.id = p_user_id\s+and u\.trial_expires_at is null\s+and u\.subscription_status = 'trialing'/i);
    assert.match(sql, /revoke all on function public\.start_ordinary_trial\(uuid\) from public, anon, authenticated/i);
    assert.match(sql, /grant execute on function public\.start_ordinary_trial\(uuid\) to service_role/i);
    assert.doesNotMatch(sql, /clock_timestamp\(\) \+ interval '3 days',\s*'trialing'/i, 'signup trigger no longer starts the clock');
  }
  assert.doesNotMatch(setup, /now\(\) \+ interval '3 days',\s*'trialing'/i, 'backfill no longer starts the clock');
});

test('saving picks is one database call that keeps the old list when it fails', async () => {
  const profile = { trial_expires_at: '2999-01-01T00:00:00.000Z', subscription_status: 'trialing', onboarding_completed_at: '2026-01-01T00:00:00.000Z' };
  const make = (rpcImpl) => harness({ rpcImpl, result: (query) => query.table === 'users' ? { data: profile, error: null } : { data: [], error: null } });

  const ok = make(() => ({ data: 2, error: null }));
  const saved = await ok.call('put', '/api/picks', { body: { picks: [{ schoolId: 5, oborKkov: '79-41-K/41' }, { schoolId: 9 }] } });
  assert.equal(saved.statusCode, 200);
  assert.equal(saved.body.count, 2);
  assert.deepEqual(ok.rpcCalls.map((c) => c.name), ['save_application_picks']);
  assert.equal(JSON.stringify(ok.rpcCalls[0].args.p_picks.map((p) => p.school_id)), '[5,9]');
  assert.equal(ok.queries.some((q) => q.table === 'application_picks'), false, 'no separate delete or insert from the server');

  const gone = make(() => ({ data: null, error: { message: 'School unavailable', hint: 'SCHOOL_UNAVAILABLE', code: '22023' } }));
  const rejected = await gone.call('put', '/api/picks', { body: { picks: [{ schoolId: 5 }] } });
  assert.equal(rejected.statusCode, 400);
  assert.equal(rejected.body.code, 'SCHOOL_UNAVAILABLE');

  const broken = make(() => ({ data: null, error: { message: 'insert failed', code: '23505' } }));
  assert.equal((await broken.call('put', '/api/picks', { body: { picks: [{ schoolId: 5 }] } })).statusCode, 500);

  const dup = make(() => ({ data: 2, error: null }));
  assert.equal((await dup.call('put', '/api/picks', { body: { picks: [{ schoolId: 5 }, { schoolId: 5 }] } })).statusCode, 400);
  assert.equal(dup.rpcCalls.length, 0);
});

test('pick save function locks per account, validates programmes and keeps hidden-school picks', () => {
  const { readFileSync } = require('node:fs');
  const migration = readFileSync('migrations/2026-10-23-atomic-application-picks.sql', 'utf8');
  const setup = readFileSync('supabase-setup.sql', 'utf8');
  for (const sql of [migration, setup]) {
    assert.match(sql, /create or replace function public\.save_application_picks\(p_user_id uuid, p_picks jsonb\)/i);
    assert.match(sql, /pg_advisory_xact_lock\(hashtextextended\('application_picks:' \|\| p_user_id::text, 0\)\)/i);
    assert.match(sql, /jsonb_array_length\(p_picks\) > 3/i);
    assert.match(sql, /p\.school_id = sid and p\.kkov = v_kkov/i);
    assert.match(sql, /delete from public\.application_picks ap[\s\S]{0,260}s\.merged_into is null and s\.hidden_reason is null/i);
    assert.match(sql, /revoke all on function public\.save_application_picks\(uuid, jsonb\) from public, anon, authenticated/i);
    assert.match(sql, /grant execute on function public\.save_application_picks\(uuid, jsonb\) to service_role/i);
  }
});

test('parallel explanations keep every cached school and the same school costs one model call', async () => {
  const baseRun = { id: 12, answers: { typ: 'odborna' }, matches: [] };
  const schools = [{ id: 11, name: 'Škola 11', programs: 'Gymnázium' }, { id: 12, name: 'Škola 12', programs: 'Gymnázium' }];
  const make = (requestReasonsImpl, cacheOk = true) => {
    const stored = {};
    const h = harness({
      env: { OPENROUTER_API_KEY: 'synthetic' },
      rpcImpl: (name, args) => { if (cacheOk) stored[args.p_school_id] = args.p_reason; return { data: cacheOk, error: null }; },
      requestReasonsImpl,
      result: (query) => query.table === 'questionnaire_runs'
        ? { data: { ...baseRun, extra_reasons: {} }, error: null }
        : query.table === 'schools' ? { data: schools, error: null } : { data: null, error: null },
    });
    return { h, stored };
  };
  const ask = (h, id) => h.call('post', '/api/questionnaire/explain/:schoolId', { params: { schoolId: String(id) }, query: { run: '12' } });

  const parallel = make(async ({ shortlist }) => new Map([[shortlist[0].school_id, 'Důvod ' + shortlist[0].school_id]]));
  const both = await Promise.all([ask(parallel.h, 11), ask(parallel.h, 12)]);
  assert.ok(both.every((r) => r.statusCode === 200));
  assert.equal(JSON.stringify(Object.keys(parallel.stored).sort()), '["11","12"]');

  let release; const gate = new Promise((resolve) => { release = resolve; });
  const same = make(async () => { await gate; return new Map([[11, 'Jeden důvod']]); });
  const pair = Promise.all([ask(same.h, 11), ask(same.h, 11)]);
  await new Promise((resolve) => setImmediate(resolve));
  release();
  const results = await pair;
  assert.ok(results.every((r) => r.statusCode === 200 && r.body.reason === 'Jeden důvod'));
  assert.equal(same.h.reasonCalls.length, 1);

  const changed = make(async () => new Map([[11, 'Zastaralý důvod']]), false);
  assert.equal((await ask(changed.h, 11)).statusCode, 502, 'answers changed while generating: nothing is cached');
});

test('explanation cache merge is per key, owner-bound and service-only', () => {
  const { readFileSync } = require('node:fs');
  for (const sql of [readFileSync('migrations/2026-10-23-explanation-cache-merge.sql', 'utf8'), readFileSync('supabase-setup.sql', 'utf8')]) {
    assert.match(sql, /extra_reasons = coalesce\(r\.extra_reasons, '\{\}'::jsonb\)\s+\|\| jsonb_build_object\(p_school_id, p_reason\)/i);
    assert.match(sql, /r\.user_id = p_user_id\s+and r\.answers = p_answers/i);
    assert.match(sql, /grant execute on function public\.cache_questionnaire_reason\(uuid, bigint, text, jsonb, text\) to service_role/i);
  }
});

test('account erasure lists every screenshot page and removes them all before the account', async () => {
  const names = Array.from({ length: 2500 }, (_, i) => ({ name: `s${i}.png` }));
  const offsets = [];
  const h = harness({ storageListResult: async (prefix, options) => {
    offsets.push(options.offset);
    return { data: names.slice(options.offset, options.offset + options.limit), error: null };
  } });
  assert.equal((await h.call('delete', '/api/me')).statusCode, 204);
  assert.equal(JSON.stringify(offsets), '[0,1000,2000]');
  assert.equal(h.storageRemovals.length, 2500);
  assert.equal(h.deletions, 1);

  const exact = Array.from({ length: 1000 }, (_, i) => ({ name: `e${i}.png` }));
  const edge = harness({ storageListResult: async (prefix, options) => ({ data: options.offset === 0 ? exact : [], error: null }) });
  assert.equal((await edge.call('delete', '/api/me')).statusCode, 204);
  assert.equal(edge.storageRemovals.length, 1000, 'a full first page still checks the next page');
});

test('a failed account deletion takes its own archive copy back so a retry cannot duplicate or keep it', async () => {
  const run = (body, deleteUserError) => {
    const h = harness({
      deleteUserError,
      rpcImpl: (name) => ({ data: name === 'archive_beta_contributions' ? [11, 12] : 2, error: null }),
    });
    return h.call('delete', '/api/me', { body }).then((res) => ({ h, res }));
  };

  const failedArchive = await run({}, { message: 'auth down' });
  assert.equal(failedArchive.res.statusCode, 500);
  assert.deepEqual(failedArchive.h.rpcCalls.map((c) => c.name), ['archive_beta_contributions', 'remove_beta_archive_rows']);
  assert.equal(JSON.stringify(failedArchive.h.rpcCalls[1].args.p_ids), '[11,12]');

  const deleteChoice = await run({ delete_contributions: true }, { message: 'auth down' });
  assert.equal(deleteChoice.h.rpcCalls.length, 0, 'choosing deletion never archives, so nothing is left to undo');

  const success = await run({}, null);
  assert.equal(success.res.statusCode, 204);
  assert.deepEqual(success.h.rpcCalls.map((c) => c.name), ['archive_beta_contributions']);

  const gone = harness({
    deleteUserError: { message: 'timeout' },
    authAdmin: { data: { user: null }, error: null },
    rpcImpl: () => ({ data: [21], error: null }),
  });
  await gone.call('delete', '/api/me', { body: {} });
  assert.deepEqual(gone.rpcCalls.map((c) => c.name), ['archive_beta_contributions'], 'an account that is already gone keeps its archive copy');
});

test('archive functions return their ids and the undo is service-only', () => {
  const { readFileSync } = require('node:fs');
  for (const sql of [readFileSync('migrations/2026-10-23-account-erasure-archive-undo.sql', 'utf8'), readFileSync('supabase-setup.sql', 'utf8')]) {
    assert.match(sql, /create function public\.archive_beta_contributions\(p_user_id uuid\)\s+returns bigint\[\]/i);
    assert.match(sql, /delete from public\.beta_contributions_archive where id = any\(coalesce\(p_ids, '\{\}'\)\)/i);
    assert.match(sql, /grant execute on function public\.remove_beta_archive_rows\(bigint\[\]\) to service_role/i);
  }
});

/* ---------------------------------------------------------------------------
 * Plan 025: revenue model. Dates are frozen so the daily price and the trial
 * window are deterministic whenever the suite runs.
 * ------------------------------------------------------------------------- */
const freeze = (t, iso = '2026-11-05T10:00:00+01:00') => t.mock.timers.enable({ apis: ['Date'], now: new Date(iso) });
const checkoutArgs = { userId: 'user-test', email: 'tester@example.com', successPath: '/skoly', cancelPath: '/predplatne', immediateStart: true };
const hasCall = (query, method, column) => query.calls.some(([m, c]) => m === method && (column === undefined || c === column));
const purchaseRow = (extra = {}) => ({
  id: 'purchase-025', stripe_checkout_session_id: null, checkout_context: 'self',
  price_amount_minor: todayMinor(), trial: false, referrer_user_id: null, ...extra,
});

test('checkout needs the express request for immediate start and the price the person saw', async (t) => {
  freeze(t);
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: { subscription_status: 'expired', stripe_customer_id: null }, error: null }
    : { data: null, error: null } });
  const missing = await h.createCheckoutForUser({ ...checkoutArgs, planId: 'season', immediateStart: undefined });
  assert.equal(missing.status, 400);
  assert.equal(missing.body.code, 'IMMEDIATE_START_REQUIRED');
  const changed = await h.createCheckoutForUser({ ...checkoutArgs, planId: 'season', confirmPriceCzk: 1 });
  assert.equal(changed.status, 409);
  assert.equal(changed.body.code, 'PRICE_CHANGED');
  assert.equal(changed.body.priceCzk, season.seasonPriceCzk(new Date()));
  assert.equal(h.checkoutCalls.length, 0);
});

test('a second season checkout pays at once, and only after the person was told there is no trial', async (t) => {
  freeze(t);
  const make = () => harness({ result: (query) => {
    if (query.table === 'users') return { data: { subscription_status: 'expired', stripe_customer_id: null, season_trial_used_at: new Date().toISOString() }, error: null };
    if (query.table === 'purchases' && hasCall(query, 'insert')) return { data: purchaseRow(), error: null };
    return { data: null, error: null };
  } });
  const refused = await make().createCheckoutForUser({ ...checkoutArgs, planId: 'season' });
  assert.equal(refused.status, 409);
  assert.equal(refused.body.code, 'TRIAL_NOT_AVAILABLE');
  assert.equal(refused.body.priceCzk, season.seasonPriceCzk(new Date()));

  const h = make();
  const ok = await h.createCheckoutForUser({ ...checkoutArgs, planId: 'season', acknowledgedNoTrial: true });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.trial, false);
  const session = h.checkoutCalls[0];
  assert.equal(session.mode, 'payment');
  assert.equal(session.line_items[0].price_data.unit_amount, todayMinor());
  assert.equal(session.payment_intent_data.setup_future_usage, 'on_session');
  assert.equal(session.payment_intent_data.metadata.purchase_id, 'purchase-025');
  assert.ok(session.expires_at > Date.now() / 1000 && session.expires_at <= Date.now() / 1000 + 3601);
});

test('a trial checkout creates a Stripe customer, so the saved card can be charged later', async (t) => {
  freeze(t);
  const h = harness({ result: (query) => {
    if (query.table === 'users') return { data: { subscription_status: 'expired', stripe_customer_id: null, season_trial_used_at: null }, error: null };
    if (query.table === 'purchases' && hasCall(query, 'insert')) return { data: purchaseRow({ trial: true }), error: null };
    return { data: null, error: null };
  } });
  const ok = await h.createCheckoutForUser({ ...checkoutArgs, planId: 'season' });
  assert.equal(ok.status, 200);
  assert.equal(h.checkoutCalls[0].mode, 'setup');
  assert.equal(h.checkoutCalls[0].customer_creation, 'always');
});

test('a card that already had a trial gets no charge schedule and no access until the person confirms', async (t) => {
  freeze(t);
  const created = Math.floor(Date.now() / 1000);
  const h = harness({ result: (query) => {
    if (query.table === 'users') return { data: { id: 'user-test', subscription_status: 'expired', stripe_setup_intent_id: null }, error: null };
    if (query.table === 'trial_card_fingerprints') return { data: { user_id: 'someone-else' }, error: null };
    if (query.table === 'purchases') return { data: [], error: null };
    return { data: null, error: null };
  } });
  const res = await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_blocked_card', created, type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_blocked', mode: 'setup', created, customer: 'cus_test', setup_intent: 'seti_blocked',
      client_reference_id: 'user-test', metadata: { purchase_id: 'purchase-blocked', plan_id: 'season' },
    } },
  } });
  assert.equal(res.statusCode, 200);
  const apply = h.rpcCalls.find((call) => call.name === 'apply_stripe_purchase_event').args;
  assert.equal(apply.p_purchase_status, null);
  assert.equal('season_charge_due_at' in apply.p_profile_patch, false);
  assert.equal('subscription_status' in apply.p_profile_patch, false);
  assert.equal(h.rpcCalls.some((call) => call.name === 'complete_paid_onboarding'), false);
  const flagged = h.queries.find((query) => query.table === 'purchases' && hasCall(query, 'update'));
  assert.equal(flagged.calls.find(([m]) => m === 'update')[1].needs_payment_confirmation, true);
  assert.equal(flagged.calls.find(([m]) => m === 'update')[1].trial, false);
});

test('a cancelled monthly plan is restored, never bought a second time', async (t) => {
  freeze(t);
  const profile = {
    subscription_status: 'active', plan_id: 'monthly', stripe_subscription_id: 'sub_test', stripe_customer_id: 'cus_test',
    cancel_at_period_end: true, access_expires_at: '2999-01-01T00:00:00.000Z',
  };
  const h = harness({ result: (query) => query.table === 'users' ? { data: profile, error: null } : { data: null, error: null } });
  const blocked = await h.createCheckoutForUser({ ...checkoutArgs, planId: 'monthly' });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, 'ALREADY_SUBSCRIBED');
  assert.equal(blocked.body.canRestore, true);
  assert.equal(h.checkoutCalls.length, 0);

  const restored = await h.restorePlanForUser('user-test');
  assert.equal(restored.status, 200);
  assert.equal(restored.body.restored, 'monthly');
  assert.equal(h.subscriptionUpdates[0].params.cancel_at, Math.floor(season.DEADLINE.getTime() / 1000));
});

test('a new monthly subscription is set to end at the deadline, and that is not a cancellation', async (t) => {
  freeze(t);
  const created = Math.floor(Date.now() / 1000);
  const h = harness({ result: (query) => query.table === 'users'
    ? { data: { id: 'user-test', subscription_status: 'expired' }, error: null }
    : { data: null, error: null } });
  const res = await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_monthly_done', created, type: 'checkout.session.completed',
    data: { object: { id: 'cs_monthly', mode: 'subscription', subscription: 'sub_test', customer: 'cus_test', client_reference_id: 'user-test', metadata: { purchase_id: 'purchase-m', plan_id: 'monthly' } } },
  } });
  assert.equal(res.statusCode, 200);
  assert.equal(h.subscriptionUpdates[0].params.cancel_at, Math.floor(season.DEADLINE.getTime() / 1000));

  const deadlineEnd = Math.floor(season.DEADLINE.getTime() / 1000);
  const update = (linked) => harness({ result: (query) => query.table === 'purchases'
    ? { data: { id: 'purchase-m', user_id: 'user-test', cancel_requested_at: linked }, error: null }
    : { data: null, error: null } });
  const event = { id: 'evt_sub_updated', created, type: 'customer.subscription.updated',
    data: { object: { id: 'sub_test', status: 'active', cancel_at: deadlineEnd, cancel_at_period_end: false, current_period_end: deadlineEnd - 86400, metadata: { plan_id: 'monthly', purchase_id: 'purchase-m' } } } };
  const scheduled = update(null);
  await scheduled.call('post', '/webhooks/stripe', { body: event });
  assert.equal(scheduled.rpcCalls[0].args.p_profile_patch.cancel_at_period_end, false);
  const cancelled = update('2026-11-06T00:00:00.000Z');
  await cancelled.call('post', '/webhooks/stripe', { body: { ...event, id: 'evt_sub_cancelled' } });
  assert.equal(cancelled.rpcCalls[0].args.p_profile_patch.cancel_at_period_end, true);
});

test('the last monthly invoice is credited for the days after the deadline, only when Stripe did not prorate it', async (t) => {
  freeze(t);
  const feb1 = Math.floor(new Date('2027-02-01T00:00:00+01:00').getTime() / 1000);
  const mar1 = Math.floor(new Date('2027-03-01T00:00:00+01:00').getTime() / 1000);
  const invoice = (amount) => ({ id: 'evt_inv_' + amount, created: feb1, type: 'invoice.created', data: { object: {
    id: 'in_last', customer: 'cus_test', subscription: 'sub_test', status: 'draft', billing_reason: 'subscription_cycle',
    lines: { data: [{ amount, period: { start: feb1, end: mar1 } }] },
  } } });
  const make = () => harness({ result: (query) => query.table === 'purchases'
    ? { data: { id: 'purchase-m', user_id: 'user-test' }, error: null } : { data: null, error: null } });
  const full = make();
  await full.call('post', '/webhooks/stripe', { body: invoice(24900) });
  const expected = Math.round(24900 * (mar1 * 1000 - season.DEADLINE.getTime()) / ((mar1 - feb1) * 1000));
  assert.equal(full.invoiceItemCalls.length, 1);
  assert.equal(full.invoiceItemCalls[0].params.amount, -expected);
  assert.equal(full.invoiceItemCalls[0].options.idempotencyKey, 'deadline-credit:in_last');
  const prorated = make();
  await prorated.call('post', '/webhooks/stripe', { body: invoice(19600) });
  assert.equal(prorated.invoiceItemCalls.length, 0);
});

// Referral: every rule that keeps it from paying out circularly or to oneself.
function referralHarness({ referrerId = 'referrer', referrerPaid = true, callerPrior = false, existingReferral = false } = {}) {
  return harness({ result: (query) => {
    if (query.table === 'users') {
      return { data: hasCall(query, 'in') ? [{ id: 'user-test', stripe_customer_id: null }, { id: referrerId, stripe_customer_id: null }]
        : { subscription_status: 'expired', stripe_customer_id: null }, error: null };
    }
    if (query.table === 'referral_codes') return { data: { user_id: referrerId }, error: null };
    if (query.table === 'referrals') return { data: existingReferral ? { id: 'r1' } : null, error: null };
    if (query.table === 'purchases') {
      if (hasCall(query, 'insert')) return { data: purchaseRow({ price_amount_minor: todayMinor() - 10000, referrer_user_id: referrerId, trial: true }), error: null };
      if (hasCall(query, 'not', 'stripe_payment_intent_id')) return { data: referrerPaid ? [{ id: 'rp', trial: false, season_charge_status: 'not_due', checkout_context: 'self' }] : [], error: null };
      if (hasCall(query, 'eq', 'trial')) return { data: [], error: null };
      if (hasCall(query, 'in', 'status')) return { data: callerPrior ? [{ id: 'old' }] : [], error: null };
    }
    return { data: null, error: null };
  } });
}
const inserted = (h) => h.queries.filter((q) => q.table === 'purchases' && hasCall(q, 'insert')).map((q) => q.calls.find(([m]) => m === 'insert')[1]);

test('a referral code takes 100 Kč off a first purchase and is ignored in every circular or self-serving case', async (t) => {
  freeze(t);
  const args = { ...checkoutArgs, planId: 'season', referralCode: 'ABCDEFGH' };
  const good = referralHarness();
  assert.equal((await good.createCheckoutForUser(args)).body.referralApplied, true);
  assert.equal(inserted(good)[0].price_amount_minor, todayMinor() - 10000);
  assert.equal(inserted(good)[0].discount_kind, 'referral');
  assert.equal(inserted(good)[0].referrer_user_id, 'referrer');

  for (const [name, options] of [
    ['own code', { referrerId: 'user-test' }],
    ['referrer has not paid', { referrerPaid: false }],
    ['caller already bought something (also stops circles: A referred B, then A uses B\'s code)', { callerPrior: true }],
    ['caller was already referred', { existingReferral: true }],
  ]) {
    const h = referralHarness(options);
    const res = await h.createCheckoutForUser(args);
    assert.equal(res.body.referralApplied, false, name);
    assert.equal(inserted(h)[0].price_amount_minor, todayMinor(), name);
    assert.equal(inserted(h)[0].referrer_user_id, null, name);
  }
});

test('a friend paying with the referrer\'s own card earns the referrer nothing', async (t) => {
  freeze(t);
  const h = harness({ result: (query) => {
    if (query.table === 'purchases' && hasCall(query, 'eq', 'card_fingerprint')) return { data: [{ id: 'referrer-purchase' }], error: null };
    if (query.table === 'purchases') return { data: { id: 'p2', user_id: 'friend', referrer_user_id: 'referrer', discount_kind: 'referral', card_fingerprint: 'fp_same' }, error: null };
    return { data: null, error: null };
  } });
  await h.recordReferral('p2');
  const upsert = h.queries.find((q) => q.table === 'referrals' && hasCall(q, 'upsert')).calls.find(([m]) => m === 'upsert')[1];
  assert.equal(upsert.status, 'void');
  assert.equal(upsert.void_reason, 'same_card');
});

test('referral rewards are paid after 14 days, once, and never beyond what the referrer paid', async (t) => {
  freeze(t);
  const settle = async ({ startedDaysAgo, charge }) => {
    const h = harness({
      paymentIntentRetrieveResult: { id: 'pi_ref', status: 'succeeded', latest_charge: charge },
      result: (query) => {
        if (query.table === 'referrals') return { data: [{ id: 'ref1', referrer_user_id: 'referrer', referred_user_id: 'friend', referred_purchase_id: 'p2' }], error: null };
        if (query.table === 'purchases' && hasCall(query, 'eq', 'user_id')) return { data: { id: 'rp', stripe_payment_intent_id: 'pi_ref' }, error: null };
        if (query.table === 'purchases') return { data: { status: 'active', trial: false, season_charge_status: 'not_due', access_starts_at: daysAgo(startedDaysAgo) }, error: null };
        return { data: null, error: null };
      },
    });
    await h.settleReferrals();
    return h;
  };
  const early = await settle({ startedDaysAgo: 5, charge: { amount: 51200, amount_refunded: 0 } });
  assert.equal(early.refundCalls.length, 0);
  const due = await settle({ startedDaysAgo: 15, charge: { amount: 51200, amount_refunded: 0 } });
  assert.equal(due.refundCalls.length, 1);
  assert.equal(due.refundCalls[0].params.amount, 10000);
  assert.equal(due.refundCalls[0].options.idempotencyKey, 'referral:ref1');
  assert.equal(due.queries.filter((q) => q.table === 'referrals' && hasCall(q, 'update')).at(-1).calls.find(([m]) => m === 'update')[1].status, 'rewarded');
  const capped = await settle({ startedDaysAgo: 15, charge: { amount: 15000, amount_refunded: 6000 } });
  assert.equal(capped.refundCalls.length, 0);
  assert.equal(capped.queries.filter((q) => q.table === 'referrals' && hasCall(q, 'update')).at(-1).calls.find(([m]) => m === 'update')[1].status, 'capped');
});

test('saved-card purchases charge only the confirmed price, on-session, and never a card a parent typed', async (t) => {
  freeze(t);
  const build = (context) => harness({ result: (query) => {
    if (query.table === 'users') return { data: { subscription_status: 'expired', stripe_customer_id: 'cus_test', stripe_payment_method_id: 'pm_test' }, error: null };
    if (query.table === 'purchases' && hasCall(query, 'insert')) return { data: purchaseRow(), error: null };
    // The saved card counts only when the person's own purchase carries its fingerprint.
    if (query.table === 'purchases' && hasCall(query, 'eq', 'card_fingerprint')) return { data: context === 'self' ? [{ id: 'own-purchase' }] : [], error: null };
    return { data: null, error: null };
  } });
  const body = (extra = {}) => ({ user: { id: 'user-test', email: 'tester@example.com' }, body: { immediateStart: true, confirmPriceCzk: season.seasonPriceCzk(new Date()), ...extra } });

  const wrong = await build('self').call('post', '/api/purchase/season-saved-card', body({ confirmPriceCzk: 1 }));
  assert.equal(wrong.statusCode, 409);
  assert.equal(wrong.body.code, 'PRICE_CHANGED');

  const h = build('self');
  const ok = await h.call('post', '/api/purchase/season-saved-card', body());
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.status, 'succeeded');
  const charge = h.paymentIntentCalls[0];
  assert.equal(charge.params.amount, todayMinor());
  assert.equal(charge.params.off_session, false);
  assert.equal(charge.params.metadata.plan_id, 'season');
  assert.equal(charge.options.idempotencyKey, 'onsession:purchase-025');

  const parentCard = build('parent');
  const refused = await parentCard.call('post', '/api/purchase/season-saved-card', body());
  assert.equal(refused.statusCode, 409);
  assert.equal(refused.body.code, 'NO_SAVED_CARD');
  assert.equal(parentCard.paymentIntentCalls.length, 0);
});

/* ---------------------------------------------------------------------------
 * Plan 025 v3: anniversary-billed monthly, extend, and the review fixes.
 * ------------------------------------------------------------------------- */
const feb = (day) => `2027-02-${String(day).padStart(2, '0')}T10:00:00+01:00`;
const unixDeadline = () => Math.floor(season.DEADLINE.getTime() / 1000);

test('monthly checkout bills on the purchase day; under a month left it is one payment ending at the deadline; closed from 9 Feb', async (t) => {
  const make = () => harness({ env: { STRIPE_PRICE_ID_MONTHLY: 'price_monthly' }, result: (query) => {
    if (query.table === 'users') return { data: { subscription_status: 'expired', stripe_customer_id: null }, error: null };
    if (query.table === 'purchases' && hasCall(query, 'insert')) return { data: purchaseRow({ price_amount_minor: 24900 }), error: null };
    return { data: null, error: null };
  } });
  freeze(t);
  const normal = make();
  assert.equal((await normal.createCheckoutForUser({ ...checkoutArgs, planId: 'monthly' })).status, 200);
  const session = normal.checkoutCalls[0];
  assert.equal('billing_cycle_anchor_config' in session.subscription_data, false);
  assert.equal('billing_cycle_anchor' in session.subscription_data, false);
  assert.ok(session.expires_at > Date.now() / 1000);

  t.mock.timers.reset();
  freeze(t, feb(1));
  const single = make();
  assert.equal((await single.createCheckoutForUser({ ...checkoutArgs, planId: 'monthly' })).status, 200);
  assert.equal(single.checkoutCalls[0].subscription_data.billing_cycle_anchor, unixDeadline());

  t.mock.timers.reset();
  freeze(t, feb(9));
  const closed = await make().createCheckoutForUser({ ...checkoutArgs, planId: 'monthly' });
  assert.equal(closed.status, 409);
  assert.equal(closed.body.code, 'MONTHLY_CLOSED');
});

test('the last monthly period is credited in full when it starts after the deadline or would be left under 15 Kč', async (t) => {
  freeze(t, feb(1));
  const stamp = (iso) => Math.floor(new Date(iso).getTime() / 1000);
  const run = async (amount, start, end) => {
    const h = harness({ result: (query) => query.table === 'purchases'
      ? { data: { id: 'purchase-m', user_id: 'user-test' }, error: null } : { data: null, error: null } });
    await h.call('post', '/webhooks/stripe', { body: { id: 'evt_' + amount + start, created: stamp(feb(1)), type: 'invoice.created', data: { object: {
      id: 'in_' + start, customer: 'cus_test', subscription: 'sub_test', status: 'draft', billing_reason: 'subscription_cycle',
      lines: { data: [{ amount, period: { start: stamp(start), end: stamp(end) } }] },
    } } } });
    return h.invoiceItemCalls;
  };
  const afterDeadline = await run(24900, '2027-02-23T00:00:00+01:00', '2027-03-23T00:00:00+01:00');
  assert.equal(afterDeadline[0].params.amount, -24900);
  // A renewal on 22 Feb 10:00 would keep only ~14 hours of a 28-day period: under 15 Kč, so nothing is charged.
  const tiny = await run(24900, '2027-02-22T10:00:00+01:00', '2027-03-22T10:00:00+01:00');
  assert.equal(tiny[0].params.amount, -24900);
  // Stripe itself cuts a 22 Feb renewal at cancel_at: a 5 Kč sliver (period ends at the deadline) is credited too.
  const sliver = await run(500, '2027-02-22T10:00:00+01:00', '2027-02-22T23:59:59+01:00');
  assert.equal(sliver[0].params.amount, -500);
  // ... but the already-cut 18 Feb period (40 Kč) is left alone.
  assert.equal((await run(4000, '2027-02-18T10:00:00+01:00', '2027-02-22T23:59:59+01:00')).length, 0);
  // A sensible remainder (18 Feb renewal) is credited only for the days after the deadline.
  const partial = await run(24900, '2027-02-18T10:00:00+01:00', '2027-03-18T10:00:00+01:00');
  const expected = Math.round(24900 * (stamp('2027-03-18T10:00:00+01:00') * 1000 - season.DEADLINE.getTime()) / ((stamp('2027-03-18T10:00:00+01:00') - stamp('2027-02-18T10:00:00+01:00')) * 1000));
  assert.equal(partial[0].params.amount, -expected);
});

test('extend: not before 1 Feb; 149 Kč plus the monthly payment still due before the deadline', async (t) => {
  const monthly = { subscription_status: 'active', plan_id: 'monthly', stripe_subscription_id: 'sub_test', stripe_customer_id: 'cus_test', stripe_payment_method_id: 'pm_test', access_expires_at: '2999-01-01T00:00:00.000Z' };
  const make = (periodEnd) => harness({ subscriptionPeriodEnd: periodEnd, result: (query) => {
    if (query.table === 'users') return { data: monthly, error: null };
    if (query.table === 'purchases' && hasCall(query, 'eq', 'card_fingerprint')) return { data: [{ id: 'own' }], error: null };
    if (query.table === 'purchases' && hasCall(query, 'insert')) return { data: purchaseRow({ plan: 'season' }), error: null };
    return { data: null, error: null };
  } });
  freeze(t, '2027-01-20T10:00:00+01:00');
  const early = await make(unixDeadline()).call('get', '/api/plan/extend-preview', {});
  assert.equal(early.statusCode, 409);
  assert.equal(early.body.code, 'EXTEND_NOT_AVAILABLE');

  t.mock.timers.reset();
  freeze(t, feb(5));
  const last = await make(unixDeadline()).call('get', '/api/plan/extend-preview', {});
  assert.equal(last.body.amountCzk, 149);
  assert.equal(last.body.remainingMonthlyCzk, 0);
  const mid = make(Math.floor(new Date('2027-02-18T10:00:00+01:00').getTime() / 1000));
  const preview = await mid.call('get', '/api/plan/extend-preview', {});
  assert.ok(preview.body.remainingMonthlyCzk >= 35 && preview.body.remainingMonthlyCzk <= 45, String(preview.body.remainingMonthlyCzk));
  const paid = await mid.call('post', '/api/plan/extend', { body: { immediateStart: true, confirmPriceCzk: preview.body.amountCzk } });
  assert.equal(paid.statusCode, 200);
  assert.equal(mid.paymentIntentCalls[0].params.amount, preview.body.amountCzk * 100);
  assert.equal(mid.paymentIntentCalls[0].params.metadata.switch_from_subscription, 'sub_test');
  const stale = await mid.call('post', '/api/plan/extend', { body: { immediateStart: true, confirmPriceCzk: 149 } });
  assert.equal(stale.body.code, 'PRICE_CHANGED');
});

test('a double click on a one-click purchase reuses the pending row: one PaymentIntent key, nothing marked failed', async (t) => {
  freeze(t);
  const pending = purchaseRow();
  const h = harness({ result: (query) => {
    if (query.table === 'users') return { data: { subscription_status: 'expired', stripe_customer_id: 'cus_test', stripe_payment_method_id: 'pm_test' }, error: null };
    if (query.table === 'purchases' && hasCall(query, 'eq', 'card_fingerprint')) return { data: [{ id: 'own' }], error: null };
    if (query.table === 'purchases' && hasCall(query, 'select', 'plan')) return { data: [{ id: pending.id, plan: 'season', price_amount_minor: todayMinor(), stripe_checkout_session_id: null }], error: null };
    if (query.table === 'purchases' && hasCall(query, 'eq', 'status') && hasCall(query, 'select')) return { data: pending, error: null };
    return { data: null, error: null };
  } });
  const body = { body: { immediateStart: true, confirmPriceCzk: season.seasonPriceCzk(new Date()) } };
  await h.call('post', '/api/purchase/season-saved-card', body);
  await h.call('post', '/api/purchase/season-saved-card', body);
  assert.equal(h.paymentIntentCalls.length, 2);
  assert.deepEqual(h.paymentIntentCalls.map((call) => call.options.idempotencyKey), ['onsession:purchase-025', 'onsession:purchase-025']);
  const failed = h.queries.filter((query) => query.table === 'purchases' && query.calls.some(([m, v]) => m === 'update' && v?.status === 'failed'));
  assert.equal(failed.length, 0);
});

test('a payment that succeeds for an abandoned purchase is refunded in full, never kept', async (t) => {
  freeze(t);
  const h = harness({ result: (query) => query.table === 'purchases'
    ? { data: { id: 'purchase-025', user_id: 'user-test', trial: false, status: 'failed', checkout_context: 'self', stripe_checkout_session_id: null }, error: null }
    : { data: null, error: null } });
  const res = await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_orphan', created: Math.floor(Date.now() / 1000), type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_orphan', metadata: { plan_id: 'season', app_user_id: 'user-test', purchase_id: 'purchase-025' } } },
  } });
  assert.equal(res.statusCode, 200);
  assert.equal(h.refundCalls.length, 1);
  assert.equal(h.refundCalls[0].options.idempotencyKey, 'orphan:pi_orphan');
  assert.equal(h.refundCalls[0].params.metadata.kind, 'orphan');
  assert.equal(h.rpcCalls.some((call) => call.name === 'apply_stripe_purchase_event'), false);
});

test('a parent-paid purchase never puts the parent card on the child profile', async (t) => {
  freeze(t);
  const h = harness({ result: (query) => query.table === 'purchases'
    ? { data: { id: 'purchase-025', user_id: 'user-test', trial: false, status: 'pending', checkout_context: 'parent', stripe_checkout_session_id: 'cs_parent' }, error: null }
    : { data: null, error: null } });
  await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_parent', created: Math.floor(Date.now() / 1000), type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_parent', customer: 'cus_parent', payment_method: 'pm_parent', metadata: { plan_id: 'season', app_user_id: 'user-test', purchase_id: 'purchase-025' } } },
  } });
  const patch = h.rpcCalls.find((call) => call.name === 'apply_stripe_purchase_event').args.p_profile_patch;
  assert.equal('stripe_customer_id' in patch, false);
  assert.equal('stripe_payment_method_id' in patch, false);
  assert.equal(patch.subscription_status, 'season');
});

test('a failed one-click payment fails its purchase; a Checkout retry keeps its row', async (t) => {
  freeze(t);
  const run = async (stripeCheckoutSessionId, type = 'payment_intent.payment_failed') => {
    const h = harness({ result: (query) => query.table === 'purchases'
      ? { data: { id: 'purchase-025', user_id: 'user-test', trial: false, status: 'pending', checkout_context: 'self', stripe_checkout_session_id: stripeCheckoutSessionId }, error: null }
      : { data: null, error: null } });
    await h.call('post', '/webhooks/stripe', { body: {
      id: 'evt_' + type + stripeCheckoutSessionId, created: Math.floor(Date.now() / 1000), type,
      data: { object: { id: 'pi_failed', metadata: { plan_id: 'season', app_user_id: 'user-test', purchase_id: 'purchase-025' } } },
    } });
    return h.rpcCalls.find((call) => call.name === 'apply_stripe_purchase_event').args;
  };
  assert.equal((await run(null)).p_purchase_status, 'failed');
  assert.equal((await run(null, 'payment_intent.canceled')).p_purchase_status, 'failed');
  assert.equal((await run('cs_checkout')).p_purchase_status, null);
});

test('confirm-pending refuses an account that already has a live monthly', async (t) => {
  freeze(t);
  const h = harness({ result: (query) => {
    if (query.table === 'users') return { data: { subscription_status: 'active', plan_id: 'monthly', stripe_subscription_id: 'sub_test', access_expires_at: '2999-01-01T00:00:00.000Z' }, error: null };
    if (query.table === 'purchases') return { data: { id: 'pending-1', plan: 'season', price_amount_minor: todayMinor(), discount_minor: 0 }, error: null };
    return { data: null, error: null };
  } });
  const res = await h.call('post', '/api/purchase/confirm-pending', { body: { immediateStart: true, confirmPriceCzk: season.seasonPriceCzk(new Date()) } });
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.code, 'ALREADY_SUBSCRIBED');
  assert.equal(h.paymentIntentCalls.length, 0);
});

test('a retried setup webhook still records the trial-abuse fingerprint, the trial use and the referral', async (t) => {
  freeze(t);
  const created = Math.floor(Date.now() / 1000);
  const h = harness({ result: (query) => {
    if (query.table === 'users') return { data: { id: 'user-test', subscription_status: 'trialing', stripe_setup_intent_id: 'seti_done' }, error: null };
    if (query.table === 'purchases') return { data: { status: 'active', card_fingerprint: null }, error: null };
    return { data: null, error: null };
  } });
  await h.call('post', '/webhooks/stripe', { body: {
    id: 'evt_setup_replay', created, type: 'checkout.session.completed',
    data: { object: { id: 'cs_done', mode: 'setup', created, customer: 'cus_test', setup_intent: 'seti_done', client_reference_id: 'user-test', metadata: { purchase_id: 'purchase-025', plan_id: 'season' } } },
  } });
  const table = (name) => h.queries.filter((query) => query.table === name);
  assert.ok(table('trial_card_fingerprints').some((query) => hasCall(query, 'upsert')));
  assert.ok(table('users').some((query) => query.calls.some(([m, v]) => m === 'update' && v?.season_trial_used_at)));
  assert.ok(table('purchases').some((query) => query.calls.some(([m, v]) => m === 'update' && v?.trial === true && v?.card_fingerprint === 'fp_test')));
});

test('the one-click card must be one the person entered themselves (fingerprint of their own purchase)', async (t) => {
  freeze(t);
  const fresh = (own) => harness({ result: (query) => {
    if (query.table === 'users') return { data: { subscription_status: 'expired', stripe_customer_id: 'cus_test', stripe_payment_method_id: 'pm_test' }, error: null };
    if (query.table === 'purchases' && hasCall(query, 'eq', 'card_fingerprint')) return { data: own ? [{ id: 'own' }] : [], error: null };
    return { data: null, error: null };
  } });
  const body = { body: { immediateStart: true, confirmPriceCzk: season.seasonPriceCzk(new Date()) } };
  const parentCard = fresh(false);
  const refused = await parentCard.call('post', '/api/purchase/season-saved-card', body);
  assert.equal(refused.body.code, 'NO_SAVED_CARD');
  assert.equal(parentCard.paymentIntentCalls.length, 0);
});

test('the stale-pending cleanup never fails a one-click monthly whose subscription is waiting for 3-D Secure', async () => {
  const h = harness({ result: () => ({ data: [], error: null }), rpcImpl: () => ({ data: [], error: null }) });
  await h.chargeDueSeasonPasses();
  const cleanup = h.queries.find((query) => query.table === 'purchases'
    && query.calls.some(([method, patch]) => method === 'update' && patch?.status === 'failed')
    && query.calls.some(([method, column]) => method === 'eq' && column === 'trial'));
  assert.ok(cleanup, 'cleanup query not found');
  assert.ok(cleanup.calls.some(([method, column, value]) => method === 'is' && column === 'stripe_subscription_id' && value === null));
  assert.ok(cleanup.calls.some(([method, column, value]) => method === 'is' && column === 'stripe_checkout_session_id' && value === null));
});

test('a withdrawal stores its pro-rata refund amount in the same write that makes the refund sweepable', async () => {
  const paidAt = daysAgo(3);
  const h = harness({
    paymentIntentRetrieveResult: { id: 'pi_linked', status: 'succeeded', amount_received: 51200 },
    result: (query) => {
      if (query.table === 'users' && query.calls.some(([method]) => method === 'select')) return { data: {
        stripe_customer_id: 'cus_test', stripe_subscription_id: null, plan_id: 'season',
        subscription_status: 'season', plan_started_at: daysAgo(10), last_paid_at: paidAt,
      }, error: null };
      if (query.table === 'purchases' && query.calls.some(([method]) => method === 'select')) return { data: {
        id: 'purchase-season-1', plan: 'season', status: 'active', stripe_payment_intent_id: 'pi_linked',
        stripe_subscription_id: null, refund_status: 'none', refund_attempts: 0, season_charge_status: 'succeeded',
        price_amount_minor: 51200, immediate_start_consent_at: daysAgo(10),
        access_ends_at: season.ACCESS_END.toISOString(), refund_amount_minor: null,
      }, error: null };
      return { data: null, error: null };
    },
  });
  await h.withdrawPlanForUser('user-test');
  const firstWrite = h.queries.find((query) => query.table === 'purchases'
    && query.calls.some(([method, patch]) => method === 'update' && patch?.status === 'withdrawn'));
  assert.ok(firstWrite, 'withdrawn write not found');
  const patch = firstWrite.calls.find(([method]) => method === 'update')[1];
  assert.equal(patch.refund_status, 'pending');
  assert.ok(Number.isInteger(patch.refund_amount_minor), 'refund_amount_minor must be written with refund_status=pending');
  assert.equal(patch.refund_amount_minor, h.refundCalls[0].params.amount);
  assert.ok(patch.refund_amount_minor < 51200);
});

const stopRowMatrix = {
  feedDate: '2026-10-18',
  stops: [
    { id: 'pid-1-a', name: 'A', lat: 50.07, lon: 14.4 },
    { id: 'pid-2-b', name: 'B', lat: 50.08, lon: 14.5 },
  ],
  // 12 visible, 13 hidden after the matrix was built, 14 has a short column.
  schools: { 12: [24, null], 13: [10, 11], 14: [5] },
};

test('stop row endpoint returns minutes to visible schools only', async () => {
  const h = harness({
    commuteMatrix: stopRowMatrix,
    commuteMatrixPresent: true,
    result: (query) => (query.table === 'schools' ? { data: [{ id: 12 }, { id: 14 }], error: null } : { data: null, error: null }),
  });
  const a = await h.call('get', '/api/commute/stops/:stopId/schools', { params: { stopId: 'pid-1-a' } });
  assert.equal(a.statusCode, 200);
  assert.equal(JSON.stringify(a.body), JSON.stringify({ feedDate: '2026-10-18', stopId: 'pid-1-a', minutes: { 12: 24, 14: 5 } }));
  const b = await h.call('get', '/api/commute/stops/:stopId/schools', { params: { stopId: 'pid-2-b' } });
  // null = over 90 minutes (kept, known far); a column too short for this stop reads as null too.
  assert.equal(JSON.stringify(b.body.minutes), JSON.stringify({ 12: null, 14: null }));
});

test('stop row endpoint answers 404 for an unknown stop and 503 without the matrix', async () => {
  const h = harness({ commuteMatrix: stopRowMatrix, commuteMatrixPresent: true });
  assert.equal((await h.call('get', '/api/commute/stops/:stopId/schools', { params: { stopId: 'pid-nope' } })).statusCode, 404);
  assert.equal(h.queries.length, 0);

  const missing = harness();
  assert.equal((await missing.call('get', '/api/commute/stops/:stopId/schools', { params: { stopId: 'pid-1-a' } })).statusCode, 503);
  assert.equal(missing.queries.length, 0);
});

test('stop row endpoint is public like the other commute reads (optionalAuth, not requireAuth)', () => {
  const h = harness({ commuteMatrix: stopRowMatrix, commuteMatrixPresent: true });
  const chain = h.routeChains.get('get /api/commute/stops/:stopId/schools');
  assert.equal(chain.length, 2);
  assert.equal(chain[0].name, h.routeChains.get('get /api/schools/:id/commute')[0].name);
});

test('withCommute attaches the stop column without mutating the shared catalogue', () => {
  const h = harness({ commuteMatrix: stopRowMatrix, commuteMatrixPresent: true });
  const catalogue = [{ id: 12 }, { id: 14 }, { id: 99 }];
  const withStop = h.withCommute(catalogue, 'pid-2-b');
  assert.equal(withStop[0].commute_minutes, null); // matrix null: over 90 minutes, known far
  assert.equal(withStop[1].commute_minutes, null); // short column: no data for this stop
  assert.equal(withStop[2].commute_minutes, undefined); // no column at all: unknown
  assert.equal('commute_minutes' in catalogue[0], false);
  assert.equal(h.withCommute(catalogue, 'pid-1-a')[0].commute_minutes, 24);
  // Unknown stop, no stop, or a bad value: untouched.
  for (const stop of ['pid-nope', undefined, null, 42]) assert.equal(h.withCommute(catalogue, stop), catalogue);
  assert.equal(harness().withCommute(catalogue, 'pid-1-a'), catalogue);
});

test('a stop in the answers moves match scores; no stop or no matrix leaves them identical', () => {
  const { scoreSchools } = require('../lib/matching');
  const schools = [{ id: 12, name: 'Blízká', programs: 'Gymnázium', school_programs: [] }, { id: 14, name: 'Daleká', programs: 'Gymnázium', school_programs: [] }];
  const matrix = { ...stopRowMatrix, schools: { 12: [10], 14: [70] } };
  const withMatrix = harness({ commuteMatrix: matrix, commuteMatrixPresent: true });
  const answers = { typ: 'gymnazium', dojezd_zastavka: 'pid-1-a', dojezd_limit: 20, dojezd_prisnost: 'nutne' };
  const scored = (h, a) => Object.fromEntries(scoreSchools(a, h.withCommute(schools, a.dojezd_zastavka)).map((m) => [m.school_id, m.score]));
  const withStop = scored(withMatrix, answers);
  assert.ok(withStop[12] > withStop[14]);
  const plain = scored(withMatrix, { typ: 'gymnazium' });
  assert.equal(plain[12], plain[14]);
  // Matrix unavailable (503 mode): same as not having answered.
  assert.deepEqual(scored(harness(), answers), plain);
});
