// Executes the current profile loader and auth callback with synthetic services.
// No accounts, tokens, network calls or persistent storage are used.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/AuthContext.jsx'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
const between = (text, start, end) => {
  const a = text.indexOf(start), b = text.indexOf(end, a);
  assert.ok(a >= 0 && b > a, 'Changed boundaries require a fresh source review');
  return text.slice(a, b);
};
let currentOwner = 'A', rejectProfile, callback;
const pendingProfile = new Promise((_, reject) => { rejectProfile = reject; });
const timers = [], signouts = [];
const noop = () => {};
const context = {
  profileRequestRef: { current: 0 }, profileIdentityRef: { current: null }, profileReadyRef: { current: null },
  useCallback: (fn) => fn, useEffect: (fn) => fn(),
  setProfile: noop, setProfileError: noop, setProfileLoading: noop, setBetaDeadlineMs: noop,
  setBetaClockNow: noop, applyTheme: noop, setLoading: noop, setIsPasswordRecovery: noop,
  rememberPasswordRecovery: noop, writeGenderPreference: noop,
  setSession: (session) => { currentOwner = session?.user?.id ?? null; },
  setTimeout: (fn) => { timers.push(fn); }, fetchMe: () => pendingProfile,
  flushOnboardingStash: async () => false,
  supabase: { auth: {
    getSession: () => new Promise(() => {}),
    onAuthStateChange: (fn) => { callback = fn; return { data: { subscription: { unsubscribe: noop } } }; },
    signOut: async () => { signouts.push(currentOwner); },
  } },
};
vm.createContext(context);
const loader = between(source, '  const loadProfile = useCallback(', '\n  useEffect(() => {');
vm.runInContext(loader + '\nthis.loadProfile = loadProfile;', context);
vm.runInContext(between(source, '  useEffect(() => {\n    let cancelled = false;', '\n  useEffect(() => {\n    if (!session'), context);

(async () => {
  const pending = context.loadProfile({ user: { id: 'A' } });
  callback('SIGNED_IN', { user: { id: 'B' } });
  rejectProfile(Object.assign(new Error('Synthetic rejected A token'), { status: 401 }));
  await pending;
  assert.deepEqual(signouts, ['B'], 'Control flow changed: re-review before reusing this evidence');
  assert.equal(timers.length, 1, 'B profile refresh has not run yet');

  let responseStatus, nextCalled = false;
  const serverContext = { supabase: { auth: { getUser: async () => ({ data: null,
    error: { name: 'AuthRetryableFetchError', status: 503, message: 'Synthetic upstream outage' } }) } } };
  vm.createContext(serverContext);
  vm.runInContext(between(server, 'async function requireAuth(', '\n// Independent of paid/developer access.') + '\nthis.run = requireAuth;', serverContext);
  const res = { status(code) { responseStatus = code; return this; }, json() { return this; } };
  await serverContext.run({ headers: { authorization: 'Bearer synthetic-only' } }, res, () => { nextCalled = true; });
  assert.equal(responseStatus, 401);
  assert.equal(nextCalled, false);
  console.log(JSON.stringify({ authSourceSha256: crypto.createHash('sha256').update(source).digest('hex'),
    delayedA401: { currentOwner, signedOutOwners: signouts, deferredBRefresh: true },
    upstream503: { clientStatus: responseStatus, note: 'Synthetic getUser failure classified as invalid login' } }, null, 2));
})().catch((err) => { console.error(err.message); process.exitCode = 1; });
