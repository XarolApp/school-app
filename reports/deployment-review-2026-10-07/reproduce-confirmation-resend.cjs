// Actual callback, synthetic Supabase operations; never sends mail or signs in.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/ConfirmEmailWaiting.jsx'), 'utf8');
const start = source.indexOf('  const resend = useCallback(');
const end = source.indexOf('\n  const buttonClass', start);
assert.ok(start >= 0 && end > start, 'Re-review changed callback boundaries');
async function exercise(captchaEnabled) {
  const calls = [];
  const noop = () => {};
  const context = { useCallback: (fn) => fn, setSending: noop, setStatus: noop,
    setCaptchaToken: noop, setCaptchaKey: noop, setSentAt: noop, setNow: noop,
    password: 'synthetic-in-memory', email: 'synthetic@example.test', captchaEnabled,
    captchaToken: 'synthetic-once-only', emailRedirectTo: 'https://example.test', betaCode: null, parent: false,
    signIn: async () => { calls.push('signIn'); return { error: 'Email not confirmed', needsEmailConfirmation: true }; },
    resendConfirmation: async () => { calls.push('resend'); return { error: null }; } };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end) + '\nthis.run = resend;', context);
  await context.run();
  return { captchaEnabled, calls };
}
(async () => {
  const result = await Promise.all([exercise(true), exercise(false)]);
  if (process.argv.includes('--expect-fixed')) {
    assert.deepEqual(result[0].calls, ['resend']);
    assert.deepEqual(result[1].calls, ['signIn', 'resend']);
  } else {
    assert.deepEqual(result[0].calls, ['signIn']);
    assert.deepEqual(result[1].calls, ['signIn', 'resend']);
  }
  console.log(JSON.stringify(result, null, 2));
})().catch((err) => { console.error(err.message); process.exitCode = 1; });
