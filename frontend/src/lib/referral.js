import { useEffect, useState } from 'react';
import { checkReferralCode } from '../api';

// An invitation link carries ?pozvanka=CODE. It is remembered in this browser
// until a purchase uses it; the server decides whether it still applies.
const KEY = 'snm.referral';
const SHAPE = /^[A-HJ-NP-Z2-9]{8}$/;

export function captureReferralFromUrl() {
  try {
    const raw = new URLSearchParams(window.location.search).get('pozvanka');
    const code = raw ? raw.trim().toUpperCase() : '';
    if (SHAPE.test(code)) localStorage.setItem(KEY, code);
  } catch { /* storage blocked: the code just is not remembered */ }
}

export function getReferralCode() {
  try {
    const code = localStorage.getItem(KEY);
    return code && SHAPE.test(code) ? code : null;
  } catch {
    return null;
  }
}

/** `{ code, valid }`: valid is true only after the server said the code can apply. */
export function useReferral() {
  const [state, setState] = useState(() => ({ code: getReferralCode(), valid: false }));
  useEffect(() => {
    const code = getReferralCode();
    if (!code) return undefined;
    let alive = true;
    checkReferralCode(code)
      .then((res) => { if (alive) setState({ code, valid: Boolean(res?.valid) }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return state;
}
