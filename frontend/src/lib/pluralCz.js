/**
 * Czech noun declension by count: 1 → singular, 2-4 → "few" plural, 0 or 5+ →
 * "many" plural ("1 obor", "2 obory", "5 oborů"). Search.jsx has its own
 * copy of this exact rule (`plural`/`obor` etc.) — not consolidated with
 * this one to avoid touching a page that already works; this file is for
 * everything under components/schoolDetail/ so the rule lives in one place
 * there instead of being re-derived (and occasionally gotten wrong, as
 * SchoolHero.jsx's old two-way "1 ? obor : oborů" check was) per component.
 */
export function pluralCz(n, one, few, many) {
  return n === 1 ? one : n >= 2 && n <= 4 ? few : many;
}

export function oborWord(n) {
  return pluralCz(n, 'obor', 'obory', 'oborů');
}
