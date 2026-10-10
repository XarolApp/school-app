import { useCallback, useEffect, useRef, useState } from 'react';

// useState that survives a reload (and a remount) for the life of the tab.
// sessionStorage on purpose: a half-finished form is not worth keeping after
// the tab is closed, and nothing here leaves the browser. A `null` key turns
// persistence off (used until the owner of the draft is known).
export function readDraft(key, fallback) {
  if (!key) return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

export function clearDraftKey(key) {
  try { sessionStorage.removeItem(key); } catch { /* nothing to clear */ }
}

export function useDraft(key, initial) {
  const [value, setValue] = useState(() => readDraft(key, typeof initial === 'function' ? initial() : initial));
  const keyRef = useRef(key);
  keyRef.current = key;
  useEffect(() => {
    if (!key) return;
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* quota or private mode: the form still works */ }
  }, [key, value]);
  const clear = useCallback(() => { if (keyRef.current) clearDraftKey(keyRef.current); }, []);
  return [value, setValue, clear];
}

// Drafts are per tab, not per account. When a different account takes over
// the tab (sign-out, or sign-in as someone else) every `snm.` draft from the
// previous one is dropped, so on a shared school computer nobody sees the
// previous pupil's unsent text (C14). Going from no account to an account
// keeps them: that is the same person finishing sign-up.
const OWNER_KEY = 'snm.owner';
export function syncDraftOwner(userId) {
  try {
    const previous = sessionStorage.getItem(OWNER_KEY);
    if (previous && previous !== (userId || '')) {
      Object.keys(sessionStorage).filter((k) => k.startsWith('snm.')).forEach((k) => sessionStorage.removeItem(k));
    }
    if (userId) sessionStorage.setItem(OWNER_KEY, userId);
    else sessionStorage.removeItem(OWNER_KEY);
  } catch { /* storage blocked: there are no drafts either */ }
}
