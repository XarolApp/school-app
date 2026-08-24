/**
 * ============================================================================
 * ONE-TIME OFFER ENTITLEMENT — DEVELOPMENT STUB. NOT PRODUCTION SAFE.
 * ============================================================================
 *
 * Ruling C-9 permits a genuine one-time first-paywall offer ONLY if the "one
 * time" claim is actually true. That requires a SERVER-SIDE entitlement:
 *
 *   - one grant per account/identity, stored in Postgres (Supabase), and
 *   - the countdown deadline issued and validated by the server.
 *
 * localStorage is NOT an acceptable production implementation. If clearing
 * cookies or opening an incognito window resurfaces the offer, the "jen teď,
 * jednorázově" claim is false in practice regardless of intent — and under the
 * UCPD / DSA Art. 25 that is a dark pattern, with markedly harsher enforcement
 * because the audience here is minors. The user-visible copy would be a lie,
 * which is also the one thing that kills parent trust fastest.
 *
 * TODO(backend): replace every function below with calls through api.js to:
 *   POST /api/offers/one-time/claim   -> { offerId, expiresAt } | 410 if consumed
 *   GET  /api/offers/one-time/status  -> { eligible, expiresAt, consumedAt }
 * Table sketch:
 *   one_time_offers(user_id pk, offer_id, granted_at, expires_at, consumed_at)
 * The server is the only place allowed to decide `eligible`, and it must
 * refuse to re-grant for a user_id that already has a row. Until that exists,
 * treat the offer shown by this stub as a UI prototype, not a live promise.
 */

import { ONE_TIME_OFFER } from '../config/pricing';

const STORAGE_KEY = 'skolamatch.oneTimeOffer.v1'; // STUB ONLY — see header.

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode — stub silently degrades */
  }
}

/**
 * Grants the offer on the FIRST paywall view and never again.
 * The deadline is stored once; it does NOT reset on refresh, re-login or
 * navigation, because the stored `expiresAt` is what we read back.
 * @returns {{eligible:boolean, expiresAt:number|null, consumed:boolean}}
 */
export function claimOneTimeOffer() {
  const existing = read();
  if (existing) {
    return {
      eligible: !existing.consumedAt && Date.now() < existing.expiresAt,
      expiresAt: existing.expiresAt,
      consumed: Boolean(existing.consumedAt),
    };
  }
  const expiresAt = Date.now() + ONE_TIME_OFFER.windowMinutes * 60 * 1000;
  write({ grantedAt: Date.now(), expiresAt, consumedAt: null });
  return { eligible: true, expiresAt, consumed: false };
}

/** Read-only check — never grants. */
export function getOneTimeOfferStatus() {
  const state = read();
  if (!state) return { eligible: false, expiresAt: null, consumed: false, granted: false };
  return {
    granted: true,
    eligible: !state.consumedAt && Date.now() < state.expiresAt,
    expiresAt: state.expiresAt,
    consumed: Boolean(state.consumedAt),
  };
}

/** Marks the offer used. Once consumed it is gone permanently for this user. */
export function consumeOneTimeOffer() {
  const state = read() || { grantedAt: Date.now(), expiresAt: Date.now() };
  write({ ...state, consumedAt: Date.now() });
}

/** Dev helper — wired to nothing in the UI. Do not expose to users. */
export function __resetOneTimeOfferForDev() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
