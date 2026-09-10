/**
 * Per-device search preferences: recently viewed schools + saved filter
 * presets. Deliberately localStorage-only, not Supabase — see UNFORGET.md
 * "Saved presets / recently viewed are localStorage-only". Every read/write
 * is wrapped in try/catch because private browsing throws on access, not
 * just on write, in some browsers.
 */

const RECENT_KEY = 'skolamatch.recentSchools';
const PRESETS_KEY = 'skolamatch.savedFilters';
const COMPARE_KEY = 'skolamatch.compareSelection';
const RECENT_LIMIT = 5;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing, storage full, or disabled — the feature just
    // silently doesn't persist. Never let this crash the page.
  }
}

/** Call when a school detail page opens. Most-recent first, deduped, capped. */
export function recordRecentSchool(schoolId) {
  const ids = readJSON(RECENT_KEY, []);
  const next = [schoolId, ...ids.filter((id) => id !== schoolId)].slice(0, RECENT_LIMIT);
  writeJSON(RECENT_KEY, next);
}

export function getRecentSchoolIds() {
  return readJSON(RECENT_KEY, []);
}

export function getSavedFilterPresets() {
  return readJSON(PRESETS_KEY, []);
}

/** `filters` is stored as-is; the caller decides what shape that is. */
export function saveFilterPreset(name, filters) {
  const presets = getSavedFilterPresets();
  const next = [...presets.filter((p) => p.name !== name), { name, filters, savedAt: Date.now() }];
  writeJSON(PRESETS_KEY, next);
}

export function deleteFilterPreset(name) {
  writeJSON(PRESETS_KEY, getSavedFilterPresets().filter((p) => p.name !== name));
}

/**
 * The comparison SELECTION — which school ids are queued up to compare.
 * Deliberately separate from the comparison VIEW, which does not exist yet
 * (Search.jsx's "Porovnat" button is still a no-op — see UNFORGET.md).
 * Reading this from the school detail page persists a selection made there
 * across navigation, ready for whenever the view is built.
 */
export function getCompareSelection() {
  return readJSON(COMPARE_KEY, []);
}

export function isInCompareSelection(schoolId) {
  return getCompareSelection().includes(schoolId);
}

export function toggleCompareSelection(schoolId) {
  const ids = getCompareSelection();
  const next = ids.includes(schoolId) ? ids.filter((id) => id !== schoolId) : [...ids, schoolId];
  writeJSON(COMPARE_KEY, next);
  return next;
}
