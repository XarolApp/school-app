// Actual-source callback probes with synthetic identities, responses and in-memory
// storage only. These establish local control flow, not live SDK/React acceptance.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const sources = Object.fromEntries(['frontend/src/components/AuthContext.jsx', 'frontend/src/lib/useDraft.js', 'server.js']
  .map(name => [name, fs.readFileSync(path.join(root, name), 'utf8')]));
const between = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Changed source boundaries require re-review');
  return source.slice(a, b);
};
const settle = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const session = id => ({ user: { id, email: `${id.toLowerCase()}@example.test` }, access_token: `synthetic-${id}` });
function authProbe() {
  const response = deferred(), timers = [], profiles = [], signouts = [], themes = [];
  let callback, owner = 'A';
  const noop = () => {};
  const context = {
    profileRequestRef: { current: 0 }, profileIdentityRef: { current: null }, profileReadyRef: { current: null },
    latestUserRef: { current: 'A' },
    useCallback: fn => fn, useEffect: fn => fn(),
    setProfile: p => profiles.push({ owner, profile: p }), setProfileError: noop,
    setProfileLoading: noop, setBetaDeadlineMs: noop, setBetaClockNow: noop,
    applyTheme: (...values) => themes.push({ owner, values }), setLoading: noop,
    setIsPasswordRecovery: noop, rememberPasswordRecovery: noop,
    writeGenderPreference: noop, syncDraftOwner: noop,
    setSession: next => { owner = next?.user?.id ?? null; },
    setTimeout: fn => { timers.push(fn); }, fetchMe: () => response.promise,
    flushOnboardingStash: async () => false,
    supabase: { auth: {
      getSession: () => new Promise(() => {}),
      onAuthStateChange: fn => { callback = fn; return { data: { subscription: { unsubscribe: noop } } }; },
      signOut: async () => { signouts.push(owner); },
    } },
  };
  vm.createContext(context);
  const source = sources['frontend/src/components/AuthContext.jsx'];
  vm.runInContext(between(source, '  const loadProfile = useCallback(', '\n  useEffect(() => {') + '\nthis.loadProfile = loadProfile;', context);
  vm.runInContext(between(source, '  useEffect(() => {\n    let cancelled = false;', '\n  useEffect(() => {\n    if (!session'), context);
  return { context, response, timers, profiles, signouts, themes, change: id => callback('SIGNED_IN', session(id)) };
}
async function run() {
  const results = {};
  const success = authProbe();
  const successPending = success.context.loadProfile(session('A'));
  success.change('B');
  success.response.resolve({ id: 'A', theme_palette: 'terakota', theme_mode: 'dark' });
  await successPending;
  assert.ok(success.profiles.some(entry => entry.owner === 'B' && entry.profile?.id === 'A'));
  results.lateASuccessBeforeBTimer = { reproduced: true, profiles: success.profiles, themes: success.themes, pendingBTimers: success.timers.length };

  const rejection = authProbe();
  const rejectionPending = rejection.context.loadProfile(session('A'));
  rejection.change('B');
  rejection.context.supabase.auth.getSession = async () => ({ data: { session: session('B') } });
  rejection.response.reject(Object.assign(new Error('synthetic A rejection'), { status: 401 }));
  await rejectionPending;
  assert.equal(rejection.signouts.length, 0);
  results.lateA401WithCurrentBSession = { passed: true, signouts: rejection.signouts };

  const waiting = authProbe(), currentSessionRead = deferred();
  waiting.context.supabase.auth.getSession = () => currentSessionRead.promise;
  const waitingPending = waiting.context.loadProfile(session('A'));
  waiting.response.reject(Object.assign(new Error('synthetic A rejection'), { status: 401 }));
  await settle();
  waiting.change('B');
  currentSessionRead.resolve({ data: { session: session('A') } });
  await waitingPending;
  assert.deepEqual(waiting.signouts, ['B']);
  results.accountChangeDuring401SessionRead = { reproduced: true, signouts: waiting.signouts, limitation: 'Held synthetic session snapshot; real SDK scheduling needs integration acceptance.' };

  const saved = deferred(), writes = [];
  let stash = { email: 'a@example.test', gender: 'f', answers: { fixture: 'A' } };
  const flushContext = {
    readOnboardingStash: () => stash,
    clearOnboardingStash: () => { writes.push({ operation: 'clear', email: stash?.email }); stash = null; },
    saveOnboardingAnswers: async (answers, token) => { writes.push({ operation: 'answers', token, answers }); await saved.promise; },
    updateProfile: async (patch, token) => { writes.push({ operation: 'gender', token, patch }); },
  };
  vm.createContext(flushContext);
  vm.runInContext('let flushInFlight = false;\n' + between(sources['frontend/src/components/AuthContext.jsx'], 'async function flushOnboardingStash(', '// Supabase reports auth failures') + '\nthis.flush = flushOnboardingStash;', flushContext);
  const flushing = flushContext.flush(session('A'));
  stash = { email: 'b@example.test', answers: { fixture: 'B' } };
  saved.resolve();
  await flushing;
  assert.equal(stash.email, 'b@example.test');
  assert.deepEqual(writes.map(w => w.token), ['synthetic-A', 'synthetic-A']);
  results.onboardingOwnerPinAndBStash = { passed: true, writes, remainingStash: stash };

  const authMiddleware = between(sources['server.js'], 'async function requireAuth(', '\n// Independent of paid/developer access.');
  results.authMiddleware = [];
  for (const error of [{ name: 'AuthRetryableFetchError', status: 0 }, { name: 'AuthApiError', status: 503 }, { name: 'AuthApiError', status: 401 }]) {
    let status, next = false;
    const ctx = { supabase: { auth: { getUser: async () => ({ data: null, error }) } } };
    vm.createContext(ctx);
    vm.runInContext(authMiddleware + '\nthis.run = requireAuth;', ctx);
    await ctx.run({ headers: { authorization: 'Bearer synthetic-only' } }, { status(code) { status = code; return this; }, json() {} }, () => { next = true; });
    assert.equal(status, error.status === 401 ? 401 : 503);
    assert.equal(next, false);
    results.authMiddleware.push({ input: error, status });
  }

  const draftSource = sources['frontend/src/lib/useDraft.js'].replace(/^import[^\n]*\n/, '').replace(/export /g, '');
  const storage = { 'snm.owner': 'A', 'snm.beta.feedback.message': JSON.stringify('Synthetic A draft') };
  const state = [];
  let cursor = 0;
  const draftContext = { sessionStorage: storage, useCallback: fn => fn, useRef: value => ({ current: value }),
    useState: init => { const slot = cursor++; if (!(slot in state)) state[slot] = typeof init === 'function' ? init() : init; return [state[slot], next => { state[slot] = next; }]; },
    useEffect: fn => fn(),
  };
  Object.defineProperties(storage, {
    getItem: { value: key => Object.hasOwn(storage, key) ? storage[key] : null },
    setItem: { value: (key, value) => { storage[key] = value; } },
    removeItem: { value: key => { delete storage[key]; } },
  });
  vm.createContext(draftContext);
  vm.runInContext(draftSource + '\nthis.hook = useDraft; this.sync = syncDraftOwner;', draftContext);
  draftContext.hook('snm.beta.feedback.message', '');
  draftContext.sync('B');
  assert.equal(storage['snm.beta.feedback.message'], undefined);
  cursor = 0;
  const retained = draftContext.hook('snm.beta.feedback.message', '');
  assert.equal(retained[0], 'Synthetic A draft');
  results.mountedDraftAfterOwnerCleanup = { reproduced: true, retainedText: retained[0], persistedAgain: storage['snm.beta.feedback.message'], limitation: 'Mounted hook only; keyed BetaTools remounts its own subtree. Audit other callers and first-load legacy drafts separately.' };

  const deletionBlock = between(sources['server.js'], "  const bucket = supabase.storage.from('beta-screenshots');", "\napp.post('/api/beta/feedback',");
  const deletionBody = deletionBlock.slice(0, deletionBlock.lastIndexOf('\n});'));
  results.screenshotCleanup = [];
  for (const failRemove of [false, true]) {
    const objects = Array.from({ length: 1001 }, (_, i) => `A/${i}.png`);
    let status, deletedAccounts = 0;
    const ctx = { req: { user: { id: 'A' } },
      res: { status(code) { status = code; return this; }, json() {}, end() {} },
      supabase: { storage: { from: () => ({
        list: async (_prefix, opts) => ({ data: objects.slice(0, opts.limit).map(name => ({ name: name.split('/')[1] })), error: null }),
        remove: async names => { if (failRemove) return { error: { message: 'synthetic failure' } }; for (const name of names) objects.splice(objects.indexOf(name), 1); return { error: null }; },
      }) }, auth: { admin: { deleteUser: async () => { deletedAccounts++; return { error: null }; } } } },
    };
    vm.createContext(ctx);
    await vm.runInContext('(async () => {\n' + deletionBody + '\n})()', ctx);
    assert.equal(status, failRemove ? 502 : 204);
    assert.equal(deletedAccounts, failRemove ? 0 : 1);
    assert.equal(objects.length, failRemove ? 1001 : 1);
    results.screenshotCleanup.push({ failRemove, status, deletedAccounts, objectsRemaining: objects.length });
  }
  return { checkedAtUtc: new Date().toISOString(), sourceHashes: Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, crypto.createHash('sha256').update(source).digest('hex')])), results, limitation: 'No network, real credentials, account changes, bucket operations or full React/SDK journey.' };
}
run().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error); process.exitCode = 1; });
