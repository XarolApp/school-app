import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, setRememberMe } from '../supabaseClient';
import { fetchMe, updateProfile, saveOnboardingAnswers } from '../api';
import { readOnboardingStash, clearOnboardingStash } from '../lib/pendingOnboardingAnswers';

const AuthContext = createContext(null);
const PASSWORD_RECOVERY_KEY = 'skolamatch.password-recovery';

function readPasswordRecovery() {
  try {
    return sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberPasswordRecovery(active) {
  try {
    if (active) sessionStorage.setItem(PASSWORD_RECOVERY_KEY, 'true');
    else sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
  } catch {
    // The in-memory state still protects the route when storage is unavailable.
  }
}

// Module-level, not component state: getSession() and the first
// onAuthStateChange firing can both resolve with the same fresh session, and
// this guard is what stops that from posting the stash twice.
let flushInFlight = false;

/**
 * Saves a stashed onboarding answer set to the account, once — and only if —
 * this browser sees a session for the SAME email the stash was written under.
 * That email check is what stops a shared/school computer from attaching
 * student A's quiz answers to whichever account happens to sign in next.
 *
 * Never awaited by its caller: this must not delay setLoading(false) or block
 * the auth-state effect. A failure (still unconfirmed, offline, server error)
 * just leaves the stash for the next session to try again; only a 400 (the
 * stash itself is malformed) or a successful/duplicate save clears it.
 */
async function flushOnboardingStash(activeSession) {
  if (!activeSession || flushInFlight) return;
  const stash = readOnboardingStash();
  if (!stash) return;

  const email = activeSession.user?.email?.toLowerCase();
  if (!email || email !== stash.email) return;

  flushInFlight = true;
  try {
    await saveOnboardingAnswers(stash.answers);
    clearOnboardingStash();
  } catch (err) {
    if (err?.status === 400) clearOnboardingStash();
    // 401/403 (not confirmed yet), 5xx, or a network error: keep the stash,
    // the next session (or the next auth-state change) tries again.
  } finally {
    flushInFlight = false;
  }
}

// Supabase reports auth failures in English. Map the ones users actually hit.
const AUTH_ERRORS = [
  [/already registered|already exists/i, 'Na tento e-mail už účet existuje. Zkus se přihlásit.'],
  [/invalid login credentials/i, 'Nesprávný e-mail nebo heslo.'],
  [/email not confirmed/i, 'Účet ještě není potvrzený — zkontroluj svůj e-mail.'],
  [/password should be at least/i, 'Heslo je příliš krátké.'],
  [/should be different from the old password/i, 'Nové heslo musí být jiné než to staré.'],
  [/rate limit|only request this after/i, 'Příliš mnoho pokusů. Zkus to prosím za chvíli.'],
  [/unable to validate email|invalid format/i, 'E-mail nemá platný formát.'],
  [/captcha/i, 'Ověření „nejsem robot“ se nezdařilo. Zkus to prosím znovu.'],
];

function translateAuthError(message) {
  const match = AUTH_ERRORS.find(([pattern]) => pattern.test(message || ''));
  return match ? match[1] : message;
}

// Everything here is for deciding what to SHOW. Whether a request is actually
// allowed is decided by server.js and by Row Level Security — a value in this
// file can be edited in devtools, a policy in Postgres cannot.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(readPasswordRecovery);

  const loadProfile = useCallback(async (activeSession) => {
    if (!activeSession) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await fetchMe());
    } catch {
      // A missing profile should not blank the app; the user stays signed in
      // and protected routes fall back to treating them as without access.
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      await loadProfile(data.session);
      if (!cancelled) setLoading(false);
      flushOnboardingStash(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY') {
        rememberPasswordRecovery(true);
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        rememberPasswordRecovery(false);
        setIsPasswordRecovery(false);
      }
      setSession(nextSession);
      await loadProfile(nextSession);
      flushOnboardingStash(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = async (email, password, name, { captchaToken, emailRedirectTo } = {}) => {
    // The name rides along in user metadata so the database trigger can copy
    // it into the profile row it creates. The trial length is set there too —
    // deliberately not here, where it could be tampered with.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, accepted_terms_at: new Date().toISOString() },
        emailRedirectTo: emailRedirectTo || `${window.location.origin}/prihlaseni?potvrzeno=1`,
        captchaToken,
      },
    });

    if (error) return { error: translateAuthError(error.message) };

    // A duplicate signup does not come back as a Supabase error. With email
    // confirmation on, Supabase answers with a decoy user carrying an empty
    // identities array — its own response never distinguishes new from
    // duplicate. Checking identities is the documented way to tell them apart
    // on our side, and we deliberately surface it as "you already have an
    // account, log in instead": hiding it here would mean an existing user
    // gets no error, submits the form, and waits for a confirmation e-mail
    // that never comes. That UX cost was judged worse than the enumeration
    // risk, especially with Turnstile CAPTCHA already gating this form — it
    // blocks the scripted, check-thousands-of-emails version of the attack.
    // Login and password reset stay fully generic instead: hiding the
    // distinction there costs a genuine user nothing.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { error: 'Na tento e-mail už účet existuje. Zkus se přihlásit.' };
    }

    // With email confirmation switched on, Supabase returns a user but no
    // session until the link is clicked.
    return { needsEmailConfirmation: !data.session };
  };

  const signIn = async (email, password, { captchaToken, remember = true } = {}) => {
    // Set before the call, so the very first token is written to the store the
    // checkbox asked for rather than moved there afterwards.
    setRememberMe(remember);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });

    if (error) {
      return {
        error: translateAuthError(error.message),
        // Worth telling apart from a wrong password: the fix is clicking a link
        // in their inbox, not typing a different password.
        needsEmailConfirmation: /email not confirmed/i.test(error.message),
      };
    }

    return {};
  };

  // Supabase only resends while the account is still unconfirmed, and applies
  // its own cooldown, so this cannot be used to mailbomb an address.
  const resendConfirmation = async (email, { captchaToken } = {}) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/prihlaseni?potvrzeno=1`,
        captchaToken,
      },
    });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const signOut = async () => {
    clearOnboardingStash();
    rememberPasswordRecovery(false);
    setIsPasswordRecovery(false);
    await supabase.auth.signOut();
    setProfile(null);
  };

  // Sends the reset link. Always reports success, even for an unknown address,
  // so the form cannot be used to check whether an email has an account.
  const requestPasswordReset = async (email, { captchaToken } = {}) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/nove-heslo`,
      captchaToken,
    });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const updatePassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: translateAuthError(error.message) };
    rememberPasswordRecovery(false);
    setIsPasswordRecovery(false);
    return {};
  };

  // Proves the person at the keyboard is the account owner, not someone who
  // sat down at an unlocked laptop. Supabase is happy to change a password or
  // an email on nothing but an open session, so without this an unattended
  // browser is a full account takeover: change the email, then "forget" the
  // password, and the real owner is locked out of their own account.
  const reauthenticate = async (currentPassword, { captchaToken } = {}) => {
    const email = session?.user?.email;
    if (!email) return { error: 'Nejsi přihlášený.' };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
      options: { captchaToken },
    });

    if (!error) return {};

    // Safe to be specific: they are already signed in, so naming a wrong
    // password reveals nothing an attacker could not already try.
    return {
      error: /invalid login credentials/i.test(error.message)
        ? 'Současné heslo není správné.'
        : translateAuthError(error.message),
    };
  };

  const changePassword = async (currentPassword, newPassword, options = {}) => {
    const check = await reauthenticate(currentPassword, options);
    if (check.error) return check;

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? { error: translateAuthError(error.message) } : {};
  };

  // Supabase's "Secure email change" sends a confirmation to the old address as
  // well as the new one, and swaps the address only once both are clicked. So a
  // typo'd or hostile new address cannot quietly capture the account.
  const changeEmail = async (newEmail, currentPassword, options = {}) => {
    const check = await reauthenticate(currentPassword, options);
    if (check.error) return check;

    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: `${window.location.origin}/nastaveni` }
    );
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const updateName = async (name) => {
    try {
      await updateProfile({ name });
      await loadProfile(session);
      return {};
    } catch (err) {
      return { error: err.message };
    }
  };

  // Revokes every refresh token on the account, so other browsers and phones
  // are signed out too. Worth having after changing a password on a computer
  // you no longer trust.
  const signOutEverywhere = async () => {
    clearOnboardingStash();
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) return { error: translateAuthError(error.message) };
    setProfile(null);
    return {};
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isSignedIn: Boolean(session),
    isPasswordRecovery,
    emailConfirmed: Boolean(session?.user?.email_confirmed_at),
    hasAccess: Boolean(profile?.hasAccess),
    isDeveloper: Boolean(profile?.isDeveloper),
    trialDaysLeft: profile?.trialDaysLeft ?? 0,
    signUp,
    signIn,
    signOut,
    resendConfirmation,
    requestPasswordReset,
    updatePassword,
    changePassword,
    changeEmail,
    updateName,
    signOutEverywhere,
    refreshProfile: () => loadProfile(session),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
