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

export function updateProfile({ name }) {
  return request('/api/me', {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export function deleteAccount() {
  return request('/api/me', { method: 'DELETE' });
}

export function fetchSchools() {
  return request('/api/schools');
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

/**
 * SCAFFOLDING: the backend route exists but no Stripe keys are configured, so
 * this answers 503 (`STRIPE_NOT_CONFIGURED`) until they are. The onboarding
 * paywall does not call this yet — it still runs mockStartSubscription below.
 */
export function createCheckoutSession() {
  return request('/api/checkout', { method: 'POST' });
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

/**
 * MOCKED CHECKOUT — still the only purchase path the onboarding paywall uses.
 *
 * TODO(payments): replace with createCheckoutSession() above once Stripe keys
 * are configured and the season-pass plan has a real one-time price. The client
 * must never see or handle card data.
 */
export function mockStartSubscription({ planId, priceCzk, role, offerApplied }) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        mocked: true,
        planId,
        priceCzk,
        role,
        offerApplied: Boolean(offerApplied),
        startedAt: new Date().toISOString(),
      });
    }, 900);
  });
}
