import { normalize } from './schoolSearch.js';

// Keep these calculations in sync with lib/commuteWalk.js on the server.
const WALK_KMH = 4.5;
const DETOUR = 1.3;
const EARTH_RADIUS_METERS = 6_371_008.8;

export function haversineMeters(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = radians(Number(a.lat));
  const lat2 = radians(Number(b.lat));
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(Number(b.lon) - Number(a.lon));
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function walkMinutes(a, b) {
  return Math.max(1, Math.round((haversineMeters(a, b) * DETOUR * 60) / (WALK_KMH * 1000)));
}

export function nearestStopGroup(point, stops) {
  if (!Number.isFinite(Number(point?.lat)) || !Number.isFinite(Number(point?.lon))) return null;

  let nearest = null;
  for (const stop of stops) {
    const distanceMeters = haversineMeters(point, stop);
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { stop, distanceMeters, walkMinutes: walkMinutes(point, stop) };
    }
  }
  return nearest;
}

export function findStopsByName(stops, query) {
  const folded = normalize(query).trim();
  if (!folded) return [];
  return stops.filter((stop) => normalize(stop.name).includes(folded));
}

// ---- chosen stop, shared by school detail, /skoly and the questionnaire ----

const STOP_STORAGE_KEY = 'commute.stopId';

export function readSavedStop() {
  try { return localStorage.getItem(STOP_STORAGE_KEY); } catch { return null; }
}

export function saveStop(stopId) {
  try {
    if (stopId) localStorage.setItem(STOP_STORAGE_KEY, stopId);
    else localStorage.removeItem(STOP_STORAGE_KEY);
  } catch { /* the selected stop still works for this page */ }
}

// ---- the minute limit ----

export const COMMUTE_LIMIT_MIN = 1;
export const COMMUTE_LIMIT_MAX = 60;
// The slider has one extra step past 60: "60+", meaning no limit.
export const NO_LIMIT = COMMUTE_LIMIT_MAX + 1;

/** Slider position (1..61) -> stored limit, or null for "60+" / nothing. */
export function limitFromSlider(position) {
  const n = Number(position);
  return Number.isInteger(n) && n >= COMMUTE_LIMIT_MIN && n <= COMMUTE_LIMIT_MAX ? n : null;
}

/** minutes: { schoolId: minutes | null } from the stop-row endpoint. */
export function countWithin(minutes, limit) {
  if (!minutes || limit == null) return 0;
  let count = 0;
  for (const value of Object.values(minutes)) if (value != null && value <= limit) count += 1;
  return count;
}

/** Whether one school fits: null = over 90 min / unreachable, undefined = unknown. */
export function withinLimit(minutes, schoolId, limit) {
  const value = minutes?.[schoolId];
  return value != null && value <= limit;
}

// ---- Czech wording ----

// Genitive after "do": do 1 školy, do 2 / 5 / 42 škol.
export const schoolsAfterDo = (count) => `${count} ${count === 1 ? 'školy' : 'škol'}`;
// Nominative: 1 škola, 2-4 školy, 5+ škol, with the matching "je/jsou dostupn…".
export function schoolsAvailable(count) {
  if (count === 1) return 'je dostupná 1 škola';
  if (count >= 2 && count <= 4) return `jsou dostupné ${count} školy`;
  return `je dostupných ${count} škol`;
}
export const minutesGen = (n) => `${n} ${n === 1 ? 'minuty' : 'minut'}`;

/** The first tidy limit (multiples of 5, above `limit`, at most 60) that reaches at least `enough` schools. */
export function suggestLimit(minutes, limit, enough = 5) {
  for (let candidate = Math.floor(limit / 5) * 5 + 5; candidate <= COMMUTE_LIMIT_MAX; candidate += 5) {
    const count = countWithin(minutes, candidate);
    if (count >= enough) return { limit: candidate, count };
  }
  return null;
}

/**
 * The line under the slider. Students are addressed with tykání, parents with
 * vykání; zero and "only a few" get a calm suggestion instead of a warning.
 */
export function commuteCountText({ minutes, limit, parent }) {
  if (limit == null) {
    return {
      main: 'Bez časového limitu — dojezd se do shody nepočítá.',
      hint: parent
        ? 'Posunutím posuvníku doleva nastavíte nejdelší přijatelnou cestu.'
        : 'Posuň posuvník doleva a nastav nejdelší cestu, která ti ještě vyhovuje.',
    };
  }
  const count = countWithin(minutes, limit);
  const main = count === 0
    ? (parent
      ? `Do ${minutesGen(limit)} odsud MHD nedojedete do žádné školy.`
      : `Do ${minutesGen(limit)} se odsud MHD nedostaneš do žádné školy.`)
    : (parent
      ? `Do ${minutesGen(limit)} ${schoolsAvailable(count)}.`
      : `Do ${minutesGen(limit)} se dostaneš do ${schoolsAfterDo(count)}.`);
  let hint = null;
  if (count < 5) {
    const better = suggestLimit(minutes, limit);
    if (better) {
      hint = parent
        ? `S limitem ${better.limit} minut by to bylo ${better.count} škol.`
        : `S limitem ${better.limit} minut by jich bylo ${better.count}.`;
    } else if (count === 0) {
      hint = parent
        ? 'Zkuste prodloužit limit, nebo vyberte jinou zastávku.'
        : 'Zkus limit prodloužit, nebo vyber jinou zastávku.';
    }
  }
  return { main, hint };
}
