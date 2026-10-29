import { useEffect, useState } from 'react';
import { fetchCommuteStops, fetchStopSchools } from '../api';
import { useBetaTools } from '../components/BetaToolsContext';
import { ROLE_KEY } from './onboardingStorage';

// One request per page load for the stop list and one per stop for its row;
// both are static timetable data, so there is nothing to invalidate.
let stopsPromise = null;
const rowPromises = new Map();

export function loadCommuteStops() {
  if (!stopsPromise) {
    stopsPromise = fetchCommuteStops()
      .then((data) => {
        if (!Array.isArray(data?.stops)) throw new Error('Invalid commute stops');
        return data.stops;
      })
      .catch((error) => { stopsPromise = null; throw error; });
  }
  return stopsPromise;
}

export function loadStopRow(stopId) {
  if (!rowPromises.has(stopId)) {
    rowPromises.set(stopId, fetchStopSchools(stopId)
      .then((data) => {
        if (!data || typeof data.minutes !== 'object') throw new Error('Invalid commute row');
        return data.minutes;
      })
      .catch((error) => { rowPromises.delete(stopId); throw error; }));
  }
  return rowPromises.get(stopId);
}

/** { stops, unavailable } - `unavailable` when the API answers 503 or fails. */
export function useCommuteStops() {
  const [state, setState] = useState({ stops: null, unavailable: false });
  useEffect(() => {
    let cancelled = false;
    loadCommuteStops()
      .then((stops) => { if (!cancelled) setState({ stops, unavailable: false }); })
      .catch(() => { if (!cancelled) setState({ stops: null, unavailable: true }); });
    return () => { cancelled = true; };
  }, []);
  return state;
}

/** Minutes from one stop to every school: { minutes: {schoolId: min|null}|null, loading, failed }. */
export function useStopMinutes(stopId) {
  const [state, setState] = useState({ stopId: null, minutes: null, failed: false });
  useEffect(() => {
    if (!stopId) return undefined;
    let cancelled = false;
    loadStopRow(stopId)
      .then((minutes) => { if (!cancelled) setState({ stopId, minutes, failed: false }); })
      .catch(() => { if (!cancelled) setState({ stopId, minutes: null, failed: true }); });
    return () => { cancelled = true; };
  }, [stopId]);
  const current = stopId && state.stopId === stopId;
  return {
    minutes: current ? state.minutes : null,
    loading: Boolean(stopId) && !current,
    failed: Boolean(current && state.failed),
  };
}

/** Parents get vykání: the beta role or the onboarding role says so. */
export function useIsParent() {
  const { beta } = useBetaTools();
  if (beta?.role === 'rodic' || beta?.role === 'ucitel') return true;
  try { return localStorage.getItem(ROLE_KEY) === 'parent'; } catch { return false; }
}
