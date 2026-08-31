import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase, setRememberMe } from '../supabaseClient';
import { fetchMe, updateProfile } from '../api';

const AuthContext = createContext(null);

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
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      await loadProfile(nextSession);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = async (email, password, name, { captchaToken } = {}) => {
    // The name rides along in user metadata so the database trigger can copy
    // it into the profile row it creates. The trial length is set there too —
    // deliberately not here, where it could be tampered with.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/prihlaseni?potvrzeno=1`,
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
    return error ? { error: translateAuthError(error.message) } : {};
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
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    setProfile(null);
    return error ? { error: translateAuthError(error.message) } : {};
  };

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isSignedIn: Boolean(session),
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
