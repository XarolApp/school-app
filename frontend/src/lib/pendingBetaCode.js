const STORAGE_KEY = 'skolamatch.beta-invitation';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export function normalizeBetaCode(value) {
  if (typeof value !== 'string') return null;
  const code = value.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export function rememberBetaCode(value) {
  const code = normalizeBetaCode(value);
  if (!code) return false;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      code,
      expiresAt: Date.now() + MAX_AGE_MS,
    }));
    return true;
  } catch {
    return false;
  }
}

export function readPendingBetaCode() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (
      saved && typeof saved.expiresAt === 'number' && saved.expiresAt > Date.now() &&
      normalizeBetaCode(saved.code)
    ) {
      return normalizeBetaCode(saved.code);
    }
  } catch {
    // Storage can be disabled; invitation navigation still works from the URL.
  }
  clearPendingBetaCode();
  return null;
}

export function clearPendingBetaCode() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage is only navigation context, never access authority.
  }
}
