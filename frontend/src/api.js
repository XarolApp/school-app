import { supabase } from './supabaseClient';
import { DEMO_SCHOOLS } from './lib/demoSchools';
import { withNames, withNamesAll } from './lib/schoolNames';
import { track, betaTracker } from './lib/betaTrack';

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
    if (!path.startsWith('/api/beta/') && !path.startsWith('/api/admin/')) track('api_error', { endpoint: path.split('?')[0], status: res.status });
    if (
      res.status === 402 &&
      (body.code === 'BETA_ACCESS_EXPIRED' || body.code === 'BETA_PROGRAM_ENDED') &&
      session?.user?.id
    ) {
      window.dispatchEvent(new CustomEvent('skolamatch:beta-access-expired', {
        detail: { userId: session.user.id, code: body.code },
      }));
    }
    throw new ApiError(
      body.error || `Požadavek selhal (${res.status})`,
      res.status,
      body.code
    );
  }

  if (path === '/api/questionnaire' && options.method === 'POST') {
    track('q_finish', { run_id: body.run?.id });
    track('result_view', { source: 'questionnaire', schools: (body.run?.matches || []).slice(0, 10).map((m, i) => ({ id: m.school_id, rank: i + 1 })) });
  }
  if (path === '/api/me' && options.method === 'PATCH') {
    const prefs = JSON.parse(options.body || '{}');
    if (prefs.theme_palette || prefs.theme_mode) track('theme_change', { palette: prefs.theme_palette, theme: prefs.theme_mode });
  }
  if (/^\/api\/favorites/.test(path) && ['POST','DELETE'].includes(options.method)) {
    track('favorite_toggle', { id: options.method === 'POST' ? JSON.parse(options.body).schoolId : Number(path.split('/').at(-1)), added: options.method === 'POST' });
  }
  if (path === '/api/picks' && options.method === 'PUT') JSON.parse(options.body).picks.forEach((_, i) => track('prihlaska_pick', { priority: i + 1 }));
  if ((path === '/api/shares' || path === '/api/share-links') && options.method === 'POST') track('share_create');
  if (/^\/api\/schools\/\d+\/reviews$/.test(path) && options.method === 'POST') track('review_write', { id: Number(path.split('/')[3]) });
  return body;
}

export function fetchMe() {
  return request('/api/me');
}

export function fetchBetaSchool(code) {
  return request(`/api/beta/schools/${encodeURIComponent(code)}`);
}
export async function startBetaVisit(code,role,accepted) {
  if (!accepted || !['8','9','rodic','ucitel','jine'].includes(role)) return;
  const anon=betaTracker.startVisit(code,true);
  const result=await request(`/api/beta/schools/${encodeURIComponent(code)}?anon=${encodeURIComponent(anon)}&notice=1&role=${encodeURIComponent(role)}`);
  betaTracker.acceptTicket(result.trackingTicket);
}

export function submitBetaFeedback({ type, pageUrl, message, ...details }) {
  return request('/api/beta/feedback', {
    method: 'POST',
    body: JSON.stringify({ type, page_url: pageUrl, message, ...details }),
  });
}
export async function uploadBetaScreenshot(blob) {
  const signed = await request('/api/beta/feedback/screenshot-url', { method: 'POST', body: JSON.stringify({ mime: blob.type, size: blob.size }) });
  const response = await fetch(signed.url, { method: 'PUT', headers: { 'Content-Type': blob.type }, body: blob });
  if (!response.ok) throw new Error('Snímek se nepodařilo nahrát.');
  return signed.path;
}

export function acknowledgeBetaGuidance() {
  return request('/api/beta/guidance-seen', { method: 'POST', body: JSON.stringify({}) });
}
export const fetchBetaMe = () => request('/api/beta/me');
export const saveBetaProfile = (role, roleNote = '') => request('/api/beta/profile', {
  method: 'POST', body: JSON.stringify({ role, role_note: roleNote, tracking_notice_accepted: true }),
});

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
  return request('/api/schools').then(withNamesAll);
}

/**
 * Full rows — every per-obor program row and the cached pros/cons — for a
 * short list of schools. `fetchSchools()` returns a slimmed list shape that
 * deliberately omits both; anything doing per-obor or pros/cons work has to
 * come through here.
 */
export function fetchSchoolsByIds(ids) {
  if (!ids.length) return Promise.resolve([]);
  return request(`/api/schools?ids=${ids.join(',')}`).then(withNamesAll);
}

export function fetchSchool(id) {
  return request(`/api/schools/${id}`).then(withNames);
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
  return request('/api/picks').then((picks) =>
    picks.map((p) => ({ ...p, school: withNames(p.school) }))
  );
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

async function publicRequest(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(API_BASE_URL + path, { ...options, headers });
  if (res.status === 204) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error || 'Požadavek selhal (' + res.status + ')', res.status, body.code);
  return body;
}

export function createShareLink(kind) {
  return request('/api/share-links', { method: 'POST', body: JSON.stringify({ kind }) });
}

export function fetchShareLinks() {
  return request('/api/share-links');
}

export function deleteShareLink(token) {
  return request('/api/share-links/' + encodeURIComponent(token), { method: 'DELETE' });
}

export function fetchSharedResults(token) {
  return publicRequest('/api/shared-results/' + encodeURIComponent(token));
}

export function fetchPayLink(token) {
  return publicRequest('/api/pay-links/' + encodeURIComponent(token));
}

export function startPayLinkCheckout(token, planId) {
  return publicRequest('/api/pay-links/' + encodeURIComponent(token) + '/checkout', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
}

export function cancelViaPayLink(token) {
  return publicRequest('/api/pay-links/' + encodeURIComponent(token) + '/cancel', { method: 'POST' });
}

export function withdrawViaPayLink(token) {
  return publicRequest('/api/pay-links/' + encodeURIComponent(token) + '/withdraw', { method: 'POST' });
}

export function createHandoff() {
  return publicRequest('/api/handoffs', { method: 'POST', body: JSON.stringify({}) });
}

export function fetchHandoffStatus(token, ownerSecret) {
  return publicRequest('/api/handoffs/' + encodeURIComponent(token), {
    headers: { 'X-Owner-Secret': ownerSecret },
  });
}

export function revokeHandoff(token, ownerSecret) {
  return publicRequest('/api/handoffs/' + encodeURIComponent(token) + '/revoke', {
    method: 'POST',
    headers: { 'X-Owner-Secret': ownerSecret },
  });
}

export function openHandoff(token) {
  return publicRequest('/api/handoffs/' + encodeURIComponent(token) + '/open', { method: 'POST' });
}

export function completeHandoff(token) {
  return publicRequest('/api/handoffs/' + encodeURIComponent(token) + '/complete', { method: 'POST' });
}

export function createResultSnapshot({ role, topSchoolId, topScore, fittingCount }) {
  return publicRequest('/api/result-snapshots', {
    method: 'POST',
    body: JSON.stringify({ role, topSchoolId, topScore, fittingCount }),
  });
}

export async function fetchSharedShortlist(token) {
  const res = await fetch(`${API_BASE_URL}/api/shared/${token}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(body.error || `Požadavek selhal (${res.status})`, res.status, body.code);
  }
  return Array.isArray(body.picks)
    ? { ...body, picks: body.picks.map((p) => ({ ...p, school: withNames(p.school) })) }
    : body;
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

export function withdrawFromContract() {
  return request('/api/subscription/withdraw', { method: 'POST' });
}

/**
 * Cancels the caller's Stripe subscription (plan 009). During a season pass's
 * 3-day trial this cancels immediately (nothing has been charged yet); once
 * paid, it schedules cancellation for the end of the current period. Returns
 * `{ cancelled: 'immediately' | 'at_period_end', accessUntil: string|null }`.
 */
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

export const submitBetaMicro = (body) => request('/api/beta/micro', { method: 'POST', body: JSON.stringify(body) });
export const submitBetaGate = (message) => request('/api/beta/gate', { method: 'POST', body: JSON.stringify({ message }) });

export const submitBetaClosing = (body) => request('/api/beta/closing', { method: 'POST', body: JSON.stringify(body) });

export const saveBetaOnboardingRanking=(body)=>request('/api/beta/rankings',{method:'POST',body:JSON.stringify(body)});

export const fetchAdminReport=tab=>request('/api/admin/'+tab);
export const fetchAdminFeedback=id=>request('/api/admin/feedback/'+id);
export const updateAdminFeedback=(id,body)=>request('/api/admin/feedback/'+id,{method:'PATCH',body:JSON.stringify(body)});
export const selectAdminReview=(id,selected)=>request('/api/admin/reviews/'+id,{method:'PATCH',body:JSON.stringify({selected})});
export const fetchTesterEmail=id=>request('/api/admin/testers/'+id+'/email');
export async function downloadAdminCsv(table){
  const {data:{session}}=await supabase.auth.getSession();
  const res=await fetch(API_BASE_URL+'/api/admin/export/'+encodeURIComponent(table)+'.csv',{headers:session?{Authorization:'Bearer '+session.access_token}:{}});
  if(!res.ok)throw new ApiError('Export se nepodařilo stáhnout.',res.status);
  const url=URL.createObjectURL(await res.blob()),link=document.createElement('a');
  link.href=url;link.download='beta-'+table+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
