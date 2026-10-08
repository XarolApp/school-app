// What a page looked like last time in this browser (how many picks, which
// view), so its loading skeleton can take the same shape. Only counts and view
// names — never content. Storage failures just fall back to the default shape.
const KEY = 'snm.sk.';
export function readHint(name, fallback) {
  try { const raw = localStorage.getItem(KEY + name); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
}
export function writeHint(name, value) {
  try { localStorage.setItem(KEY + name, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
