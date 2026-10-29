import { useEffect, useMemo, useRef, useState } from 'react';
import { Bus } from 'lucide-react';
import { fetchSchools } from '../api';
import { NO_LIMIT, countWithin, limitFromSlider, readSavedStop, saveStop } from '../lib/commute';
import { useCommuteStops, useIsParent, useStopMinutes } from '../lib/useCommute';
import StopPicker from './StopPicker';
import CommuteLimitControl from './CommuteLimitControl';
import CommutePreviewMap from './CommutePreviewMap';
import './commute.css';

const DEFAULT_STRICTNESS = 'dulezite';

// Both pages that draw the map want the same slim school list; fetch it once.
let schoolsPromise = null;
function loadMapSchools() {
  if (!schoolsPromise) {
    schoolsPromise = fetchSchools().catch((error) => { schoolsPromise = null; throw error; });
  }
  return schoolsPromise;
}

/**
 * The three `dojezd_*` questions as one control: where from (a PID stop), the
 * longest ride (any minute 1-60, or 60+ for no limit), and how strict that
 * limit is. Only the stop id is saved with the answers - the address or the
 * device location stays in the browser (see StopPicker).
 *
 * `questions` carries the server-defined labels/options of the three questions.
 */
function CommuteQuestion({ answers, setAnswers, questions, track }) {
  const parent = useIsParent();
  const { stops, unavailable } = useCommuteStops();
  const [mapSchools, setMapSchools] = useState([]);
  const [editing, setEditing] = useState(false);
  const prefilled = useRef(false);

  const stopId = answers.dojezd_zastavka || '';
  const stop = useMemo(() => stops?.find((entry) => entry.id === stopId) || null, [stops, stopId]);
  const sliderValue = Number.isInteger(answers.dojezd_limit) ? answers.dojezd_limit : NO_LIMIT;
  const limit = limitFromSlider(sliderValue);
  // The row is requested once there is a limit to count against, not as soon as
  // a remembered stop is pre-filled.
  const { minutes, loading, failed } = useStopMinutes(stop && limit != null ? stop.id : null);
  const strictQuestion = questions.dojezd_prisnost;

  const update = (patch) => setAnswers((prev) => {
    const next = { ...prev, ...patch };
    for (const key of Object.keys(next)) if (key.startsWith('dojezd_') && (next[key] === '' || next[key] == null)) delete next[key];
    return next;
  });

  // A stop picked on a school page is offered here once, never forced: it is
  // only taken when the account has not answered this question yet.
  useEffect(() => {
    if (prefilled.current || !stops) return;
    prefilled.current = true;
    const saved = readSavedStop();
    if (!answers.dojezd_zastavka && saved && stops.some((entry) => entry.id === saved)) update({ dojezd_zastavka: saved });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the stop list arrives
  }, [stops]);

  // A stop that left the timetable (matrix regenerated) cannot be scored.
  useEffect(() => {
    if (stops && stopId && !stops.some((entry) => entry.id === stopId)) update({ dojezd_zastavka: '', dojezd_limit: '', dojezd_prisnost: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to the list and the saved id only
  }, [stops, stopId]);

  useEffect(() => {
    if (!stop) return undefined;
    let cancelled = false;
    loadMapSchools().then((list) => { if (!cancelled) setMapSchools(Array.isArray(list) ? list : []); }).catch(() => {});
    return () => { cancelled = true; };
  }, [stop]);

  if (unavailable) {
    return (
      <p className="field-hint">
        {parent ? 'Dojezd MHD teď nejde spočítat. Otázku můžete přeskočit.' : 'Dojezd MHD teď nejde spočítat. Otázku můžeš přeskočit.'}
      </p>
    );
  }
  if (!stops) return <p className="field-hint">Načítám zastávky…</p>;

  const chooseStop = (picked) => {
    saveStop(picked.id);
    track?.('dojezd_zastavka');
    setEditing(false);
    update({ dojezd_zastavka: picked.id });
  };
  const clearStop = () => {
    track?.('dojezd_zastavka', true);
    setEditing(false);
    update({ dojezd_zastavka: '', dojezd_limit: '', dojezd_prisnost: '' });
  };
  const setSlider = (position) => {
    track?.('dojezd_limit');
    const next = limitFromSlider(position);
    update(next == null
      ? { dojezd_limit: '', dojezd_prisnost: '' }
      : { dojezd_limit: next, dojezd_prisnost: answers.dojezd_prisnost || DEFAULT_STRICTNESS });
  };

  const inLimit = limit != null && minutes ? countWithin(minutes, limit) : null;

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
            idPrefix="qz-commute"
            initialQuery={stop?.name || ''}
            onChoose={chooseStop}
          />
          {stop && <button type="button" className="cq-link" onClick={() => setEditing(false)}>Nechat {stop.name}</button>}
        </>
      )}

      {stop && !editing && (
        <>
          <CommuteLimitControl
            idPrefix="qz-commute"
            value={sliderValue}
            onChange={setSlider}
            minutes={minutes}
            loading={loading}
            failed={failed}
            parent={parent}
          />

          {limit != null && strictQuestion && (
            <div className="cq-strict">
              <div className="field-label" id="qz-label-dojezd_prisnost">{strictQuestion.label}</div>
              <div className="qz-options" role="group" aria-labelledby="qz-label-dojezd_prisnost">
                {strictQuestion.options.map((option) => {
                  const on = (answers.dojezd_prisnost || DEFAULT_STRICTNESS) === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={`qz-option${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => { track?.('dojezd_prisnost'); update({ dojezd_prisnost: option.value }); }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <CommutePreviewMap schools={mapSchools} minutes={minutes} limit={limit} stop={stop} />
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

export default CommuteQuestion;
