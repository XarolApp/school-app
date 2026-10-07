// Remembers, per browser tab, that a confirmation e-mail is on its way, so a
// reload on the "check your inbox" screen puts the person back there instead of
// at an empty sign-up form. No password or answers: only the address (needed to
// resend) and the time of the last send (needed for the cooldown).

// Must match Supabase → Authentication → Emails → SMTP Settings → "Minimum
// interval per user". A shorter value would offer a resend Supabase refuses.
export const RESEND_COOLDOWN_SECONDS = 60;

const KEY = 'snm.confirm.pending';
const MAX_AGE_MS = 60 * 60 * 1000;

export function readPendingConfirmation(source) {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY));
    if (value?.email && value.source === source && Date.now() - value.sentAt < MAX_AGE_MS) return value;
  } catch { /* storage unavailable or corrupt */ }
  return null;
}

export function savePendingConfirmation(value) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...value, sentAt: value.sentAt ?? Date.now() })); } catch { /* the screen still works */ }
}

export function clearPendingConfirmation() {
  try { sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
