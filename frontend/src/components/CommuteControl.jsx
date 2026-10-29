import { useEffect, useMemo, useRef, useState } from 'react';
import { Bus } from 'lucide-react';
import { fetchSchools } from '../api';
import { NO_LIMIT, countWithin, limitFromSlider, readSavedStop, saveStop } from '../lib/commute';
import { useCommuteStops, useIsParent, useStopMinutes } from '../lib/useCommute';
import { DEFAULT_STRICTNESS } from '../lib/commuteScore';
import StopPicker from './StopPicker';
import CommuteLimitControl from './CommuteLimitControl';
import CommutePreviewMap from './CommutePreviewMap';
import './commute.css';


// Both pages that draw the map want the same slim school list; fetch it once.
let schoolsPromise = null;
function loadMapSchools() {
  if (!schoolsPromise) {
    schoolsPromise = fetchSchools().catch((error) => { schoolsPromise = null; throw error; });
  }
  return schoolsPromise;
}

/**
 * The commute control: where from (a PID stop), the longest ride (any minute
 * 1-60, or 60+ for no limit) and how strict that limit is, with the live school
 * count and a preview map. One component for the questionnaire and the onboarding
 * quiz, so both ask, count and explain the same way. Only the stop id is ever
 * saved - the address or device location stays in the browser (see StopPicker).
 *
 * Controlled: `stopId`, `limit` (number or null) and `strict` come from the
 * parent; every change is reported as a patch `{ stop?, limit?, strict? }`.
 * `strictOptions`: [{ value, label }] in the right voice. `mapSchools` lets the
 * onboarding flow reuse the schools it already loaded; otherwise they are fetched.
 */
function CommuteControl({ stopId, limit, strict, onChange, strictOptions = [], strictLabel, strictId = 'qz-label-dojezd_prisnost', parent: parentOverride, mapSchools, prefillSaved = true, idPrefix = 'qz-commute', track }) {
  const parentRole = useIsParent();
  const parent = parentOverride ?? parentRole;
  const { stops, unavailable } = useCommuteStops();
  const [fetchedSchools, setFetchedSchools] = useState([]);
  const [editing, setEditing] = useState(false);
  const prefilled = useRef(false);

  const stop = useMemo(() => stops?.find((entry) => entry.id === stopId) || null, [stops, stopId]);
  const sliderValue = Number.isInteger(limit) ? limit : NO_LIMIT;
  const activeLimit = limitFromSlider(sliderValue);
  // The row is requested once there is a limit to count against, not as soon as
  // a remembered stop is pre-filled.
  const { minutes, loading, failed } = useStopMinutes(stop && activeLimit != null ? stop.id : null);

  // A stop picked on a school page is offered once, never forced: only taken
  // when this question has no stop yet.
  useEffect(() => {
    if (prefilled.current || !stops || !prefillSaved) return;
    prefilled.current = true;
    const saved = readSavedStop();
    if (!stopId && saved && stops.some((entry) => entry.id === saved)) onChange({ stop: saved });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the stop list arrives
  }, [stops]);

  // A stop that left the timetable (matrix regenerated) cannot be scored.
  useEffect(() => {
    if (stops && stopId && !stops.some((entry) => entry.id === stopId)) onChange({ stop: '', limit: null, strict: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the list and the saved id only
  }, [stops, stopId]);

  const picture = mapSchools ?? fetchedSchools;
  useEffect(() => {
    if (!stop || mapSchools) return undefined;
    let cancelled = false;
    loadMapSchools().then((list) => { if (!cancelled) setFetchedSchools(Array.isArray(list) ? list : []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [stop, mapSchools]);

  if (unavailable) {
    return (
      <p className="cq-hint">
        {parent ? 'Dojezd MHD teď nejde spočítat. Otázku můžete přeskočit.' : 'Dojezd MHD teď nejde spočítat. Otázku můžeš přeskočit.'}
      </p>
    );
  }
  if (!stops) return <p className="cq-hint">Načítám zastávky…</p>;

  const chooseStop = (picked) => {
    saveStop(picked.id);
    track?.('dojezd_zastavka');
    setEditing(false);
    onChange({ stop: picked.id });
  };
  const clearStop = () => {
    track?.('dojezd_zastavka', true);
    setEditing(false);
    onChange({ stop: '', limit: null, strict: '' });
  };
  const setSlider = (position) => {
    track?.('dojezd_limit');
    const next = limitFromSlider(position);
    onChange(next == null ? { limit: null, strict: '' } : { limit: next, strict: strict || DEFAULT_STRICTNESS });
  };

  const inLimit = activeLimit != null && minutes ? countWithin(minutes, activeLimit) : null;

  return (
    <div className="cq-block">
      {stop && !editing ? (
        <div className="cq-stop">
          <Bus size={18} aria-hidden="true" />
          <div className="cq-stop-main">
            <span className="cq-stop-name">{stop.name}</span>
          </div>
          <button type="button" className="cq-link" onClick={() => setEditing(true)}>Změnit</button>
          <button type="button" className="cq-link" onClick={clearStop}>Nechci zadávat</button>
        </div>
      ) : (
        <>
          <StopPicker
            stops={stops}
            parent={parent}
            idPrefix={idPrefix}
            initialQuery={stop?.name || ''}
            onChoose={chooseStop}
          />
          {stop && <button type="button" className="cq-link" onClick={() => setEditing(false)}>Nechat {stop.name}</button>}
        </>
      )}

      {stop && !editing && (
        <>
          <CommuteLimitControl
            idPrefix={idPrefix}
            value={sliderValue}
            onChange={setSlider}
            minutes={minutes}
            loading={loading}
            failed={failed}
            parent={parent}
          />

          {activeLimit != null && strictOptions.length > 0 && (
            <div className="cq-strict">
              <div className="cq-label" id={strictId}>{strictLabel}</div>
              <div className="cq-options" role="group" aria-labelledby={strictId}>
                {strictOptions.map((option) => {
                  const on = (strict || DEFAULT_STRICTNESS) === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={`cq-option${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => { track?.('dojezd_prisnost'); onChange({ strict: option.value }); }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <CommutePreviewMap schools={picture} minutes={minutes} limit={activeLimit} stop={stop} />
          <p className="cpm-legend">
            <span className="is-stop">{stop.name}</span>
            <span className="is-in">{inLimit == null ? 'školy v limitu' : `v limitu: ${inLimit}`}</span>
            <span>ostatní školy</span>
          </p>
        </>
      )}

      <footer className="sd-commute-attribution">
        <a href="https://pid.cz/o-systemu/opendata/" target="_blank" rel="noopener noreferrer">Jízdní řády PID</a>
        {' · '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
        {' · Odhad je náš výpočet z těchto dat.'}
      </footer>
    </div>
  );
}

export default CommuteControl;
