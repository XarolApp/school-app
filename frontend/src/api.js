import { DEMO_SCHOOLS } from './lib/demoSchools';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

async function request(path) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

export function fetchSchools() {
  return request('/api/schools');
}

export function fetchSchool(id) {
  return request(`/api/schools/${id}`);
}

/**
 * Schools for the matcher.
 *
 * Supabase is paused right now, so /api/schools answers 200 with []. An empty
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
 * MOCKED CHECKOUT — no payment provider is integrated.
 *
 * TODO(payments): replace with a real call that creates a Stripe Checkout
 * Session server-side and redirects. The client must never see or handle card
 * data. Recurring billing + a 3-day trial means the subscription is created
 * with trial_period_days=3 on the server, not here.
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
