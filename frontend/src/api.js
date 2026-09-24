import { supabase } from './supabaseClient';
import { DEMO_SCHOOLS } from './lib/demoSchools';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  // The backend answers 402 when the trial is over and there is no
  // subscription. Pages use this to show the paywall instead of an error.
  get isPaymentRequired() {
    return this.status === 402;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
}

async function request(path, options = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = { ...options.headers };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return null;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body.error || `Požadavek selhal (${res.status})`,
      res.status,
      body.code
    );
  }

  return body;
}

export function fetchMe() {
  return request('/api/me');
}

export function updateProfile({ name, themePalette, themeMode }) {
  const body = {};
  if (name !== undefined) body.name = name;
  if (themePalette !== undefined) body.theme_palette = themePalette;
  if (themeMode !== undefined) body.theme_mode = themeMode;

  return request('/api/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteAccount() {
  return request('/api/me', { method: 'DELETE' });
}

/** Saves the onboarding quiz's stashed answers to the account, once a session
 *  is confirmed — see lib/pendingOnboardingAnswers.js and AuthContext's flush. */
export function saveOnboardingAnswers(answers) {
  return request('/api/me/onboarding-answers', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

/**
 * The standalone questionnaire (server-side lib/questionnaire.js) — a separate
 * surface from the onboarding quiz, see CLAUDE.md. GET returns the question set,
 * the account's active/default run and its full run history; POST submits new
 * answers (unlimited; scores always, AI sentences when a model is reachable) and
 * the new run becomes the default.
 */
export function fetchQuestionnaire() {
  return request('/api/questionnaire');
}

export function submitQuestionnaire(answers) {
  return request('/api/questionnaire', {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export function renameQuestionnaireRun(id, label) {
  return request(`/api/questionnaire/runs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ label }),
  });
}

export function setDefaultQuestionnaireRun(id) {
  return request(`/api/questionnaire/runs/${id}/default`, { method: 'PUT' });
}

export function archiveQuestionnaireRun(id, archived) {
  return request(`/api/questionnaire/runs/${id}/archive`, {
    method: 'PATCH',
    body: JSON.stringify({ archived }),
  });
}

// Returns a SLIMMED shape: each school's school_programs is collapsed to one
// entry per obor (latest year only) carrying just the fields list pages read
// (maturitni, jpz_povinna, typ_skoly, jazyk_studia, kkov, zrizovatel,
// kapacita) — no per-year rows, no school_ai_summary. Anything needing full
// per-obor history or pros/cons should use fetchSchoolsByIds instead.
export function fetchSchools() {
  return request('/api/schools');
}

/**
 * Full rows — every per-obor program row and the cached pros/cons — for a
 * short list of schools. `fetchSchools()` returns a slimmed list shape that
 * deliberately omits both; anything doing per-obor or pros/cons work has to
 * come through here.
 */
export function fetchSchoolsByIds(ids) {
  if (!ids.length) return Promise.resolve([]);
  return request(`/api/schools?ids=${ids.join(',')}`);
}

export function fetchSchool(id) {
  return request(`/api/schools/${id}`);
}

export function fetchFavorites() {
  return request('/api/favorites');
}

export function addFavorite(schoolId) {
  return request('/api/favorites', {
    method: 'POST',
    body: JSON.stringify({ schoolId }),
  });
}

export function removeFavorite(schoolId) {
  return request(`/api/favorites/${schoolId}`, { method: 'DELETE' });
}

export function fetchSchoolReviews(schoolId) {
  return request(`/api/schools/${schoolId}/reviews`);
}

export function addSchoolReview(schoolId, { role, roleYear, oborNazev, body, showName }) {
  return request(`/api/schools/${schoolId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ role, roleYear, oborNazev, body, showName }),
  });
}

export function deleteReview(id) {
  return request(`/api/reviews/${id}`, { method: 'DELETE' });
}

export function reportReview(id, { reason, goodFaith }) {
  return request(`/api/reviews/${id}/report`, {
    method: 'POST',
    body: JSON.stringify({ reason, goodFaith }),
  });
}

export function reportSchoolData(schoolId, { field, message }) {
  return request(`/api/schools/${schoolId}/report`, {
    method: 'POST',
    body: JSON.stringify({ field, message }),
  });
}

/**
 * Comparison & decision tools (feature-brainstorm.md §5, plan 006).
 * `fetchSharedShortlist` is the one exception — it is a public route, so it
 * bypasses `request()`'s auth header entirely rather than sending a token
 * that belongs to whoever happens to be signed in on this device.
 */

export function fetchPicks() {
  return request('/api/picks');
}

export function savePicks(picks) {
  return request('/api/picks', {
    method: 'PUT',
    body: JSON.stringify({ picks }),
  });
}

export function removePick(schoolId) {
  return request(`/api/picks/${schoolId}`, { method: 'DELETE' });
}

export function fetchNotes() {
  return request('/api/notes');
}

export function saveNote(schoolId, body) {
  return request(`/api/notes/${schoolId}`, {
    method: 'PUT',
    body: JSON.stringify({ body }),
  });
}

export function deleteNote(schoolId) {
  return request(`/api/notes/${schoolId}`, { method: 'DELETE' });
}

export function fetchDecisionProfile() {
  return request('/api/decision-profile');
}

export function saveDecisionProfile({ jpzPoints, jpzSource }) {
  return request('/api/decision-profile', {
    method: 'PUT',
    body: JSON.stringify({ jpzPoints, jpzSource }),
  });
}

export function createShare({ includeNotes }) {
  return request('/api/shares', {
    method: 'POST',
    body: JSON.stringify({ includeNotes }),
  });
}

export function fetchShares() {
  return request('/api/shares');
}

export function revokeShare(token) {
  return request(`/api/shares/${token}`, { method: 'DELETE' });
}

export async function fetchSharedShortlist(token) {
  const res = await fetch(`${API_BASE_URL}/api/shared/${token}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error || `Požadavek selhal (${res.status})`, res.status, body.code);
  }
  return body;
}

/**
 * Creates a real Stripe Checkout session (plan 009). Answers 503
 * (`STRIPE_NOT_CONFIGURED`) if the backend's Stripe env vars aren't set.
 * `returnTo` is where the user lands after a successful payment, before the
 * account has necessarily updated yet — see SubscriptionExpired.jsx's
 * platba=ok handling.
 */
export function createCheckoutSession({ planId, returnTo } = {}) {
  return request('/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId, returnTo }),
  });
}

/**
 * Cancels the caller's Stripe subscription (plan 009). During a season pass's
 * 3-day trial this cancels immediately (nothing has been charged yet); once
 * paid, it schedules cancellation for the end of the current period. Returns
 * `{ cancelled: 'immediately' | 'at_period_end', accessUntil: string|null }`.
 */
export function redeemBetaCode(code) {
  return request('/api/me/redeem-beta-code', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function withdrawFromContract() {
  return request('/api/subscription/withdraw', { method: 'POST' });
}

export function cancelSubscription() {
  return request('/api/subscription/cancel', { method: 'POST' });
}

/**
 * Schools for the onboarding matcher.
 *
 * /api/schools answers 200 with [] when Supabase is empty or paused. An empty
 * reveal screen after a 10-question quiz is the worst possible outcome, so we
 * fall back to a clearly-labelled fixture and hand the caller `isDemo` so the
 * UI can say out loud that these are ukázková data.
 *
 * @returns {Promise<{schools:Array, isDemo:boolean, error:string|null}>}
 */
export async function fetchSchoolsForMatching() {
  try {
    const data = await fetchSchools();
    if (Array.isArray(data) && data.length > 0) {
      return { schools: data, isDemo: false, error: null };
    }
    return { schools: DEMO_SCHOOLS, isDemo: true, error: null };
  } catch (err) {
    return { schools: DEMO_SCHOOLS, isDemo: true, error: err.message };
  }
}
