import { createClient } from '@supabase/supabase-js';

const REMEMBER_KEY = 'skolamatch.remember-me';

// "Remember me" is a question about *where* the session token is stored, not
// about how long it is valid. localStorage survives closing the browser;
// sessionStorage is wiped the moment the tab closes, which is what you want on
// a school or family computer. Both are per-browser, so unchecking it here does
// not sign anyone out on their phone.
const rememberMeStorage = {
  getItem: (key) =>
    window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key),

  setItem: (key, value) => {
    // Written on every token refresh, so the current preference is re-read each
    // time rather than captured once at sign-in. Removing from the other store
    // keeps a single copy of the token around instead of two that drift apart.
    if (window.localStorage.getItem(REMEMBER_KEY) === 'false') {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
      window.sessionStorage.removeItem(key);
    }
  },

  removeItem: (key) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

// Call before signing in, so the very first token lands in the right place.
export function setRememberMe(remember) {
  window.localStorage.setItem(REMEMBER_KEY, remember ? 'true' : 'false');
}

export function getRememberMe() {
  return window.localStorage.getItem(REMEMBER_KEY) !== 'false';
}

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authConfigured = Boolean(URL && ANON_KEY);

// createClient throws outright on missing credentials, which would white-screen
// the whole app — including the onboarding flow, which needs no account at all.
// Degrading to a stub keeps everything except sign-in working, the same choice
// Captcha makes when its site key is absent.
const NOT_CONFIGURED = {
  message: 'Přihlašování zatím není nastavené (chybí frontend/.env).',
};

const stub = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    getUser: async () => ({ data: { user: null }, error: NOT_CONFIGURED }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signUp: async () => ({ data: {}, error: NOT_CONFIGURED }),
    signInWithPassword: async () => ({ data: {}, error: NOT_CONFIGURED }),
    signOut: async () => ({ error: null }),
    resend: async () => ({ error: NOT_CONFIGURED }),
    resetPasswordForEmail: async () => ({ error: NOT_CONFIGURED }),
    updateUser: async () => ({ error: NOT_CONFIGURED }),
  },
};

export const supabase = authConfigured
  ? createClient(URL, ANON_KEY, {
      auth: {
        // Keeps the user signed in across reloads and refreshes the token in
        // the background, so a session does not die mid-visit.
        persistSession: true,
        autoRefreshToken: true,
        storage: rememberMeStorage,
      },
    })
  : stub;
