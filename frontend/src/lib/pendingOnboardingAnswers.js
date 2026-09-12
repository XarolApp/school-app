/**
 * A short-lived localStorage stash for onboarding quiz answers, bridging the
 * gap between account creation and a confirmed sign-in.
 *
 * Why this exists: Supabase issues no session until the confirmation email's
 * link is clicked, and that link normally opens in a NEW tab/window, where
 * sessionStorage (what the quiz itself uses, see OnboardingFlow.jsx) is empty.
 * localStorage is the one thing that survives across tabs on the same
 * browser, so the answers ride here until AuthContext sees a real session and
 * flushes them to the server (POST /api/me/onboarding-answers).
 *
 * The email is stashed alongside the answers so the flush can refuse to save
 * student A's answers into account B on a shared computer — see AuthContext.
 */

const KEY = 'skolamatch.pendingOnboardingAnswers';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function stashOnboardingAnswers(answers, email) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ answers, email: (email || '').trim().toLowerCase(), savedAt: Date.now() })
    );
  } catch {
    // Private browsing, storage full, or disabled — the flush just never
    // finds anything to save. Not worth surfacing to a 15-year-old mid-signup.
  }
}

export function readOnboardingStash() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const stash = JSON.parse(raw);
    if (!stash?.answers || !stash?.email || typeof stash.savedAt !== 'number') {
      localStorage.removeItem(KEY);
      return null;
    }
    if (Date.now() - stash.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return stash;
  } catch {
    return null;
  }
}

export function clearOnboardingStash() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}
