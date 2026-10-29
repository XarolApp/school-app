import { useEffect, useState } from 'react';
import { Bus } from 'lucide-react';
import { fetchCommuteStops, fetchSchoolCommute } from '../../api';
import { readSavedStop, saveStop } from '../../lib/commute';
import { useBetaTools } from '../BetaToolsContext';
import StopPicker from '../StopPicker';

function CommuteTime({ schoolId }) {
  const { beta } = useBetaTools();
  const parent = beta?.role === 'rodic' || beta?.role === 'ucitel';
  const [stops, setStops] = useState(null);
  const [minutes, setMinutes] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState(readSavedStop);
  const [initialQuery, setInitialQuery] = useState('');
  const [editing, setEditing] = useState(!readSavedStop());
  const [locationMessage, setLocationMessage] = useState('');
  const [walkToStopMinutes, setWalkToStopMinutes] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCommuteStops(), fetchSchoolCommute(schoolId)])
      .then(([stopData, commuteData]) => {
        if (cancelled) return;
        if (!Array.isArray(stopData.stops) || !Array.isArray(commuteData.minutes)) throw new Error('Invalid commute data');
        setStops(stopData.stops);
        setMinutes(commuteData.minutes);
      })
      .catch(() => { if (!cancelled) setUnavailable(true); });
    return () => { cancelled = true; };
  }, [schoolId]);

  useEffect(() => {
    if (!stops || !selectedStopId || stops.some((stop) => stop.id === selectedStopId)) return;
    setSelectedStopId(null);
    setEditing(true);
    saveStop(null);
  }, [stops, selectedStopId]);

  const selectedStop = stops?.find((stop) => stop.id === selectedStopId) || null;
  if (unavailable || !stops || !minutes) return null;

  const chooseStop = (stop, walkMinutes = 0, message = '') => {
    setSelectedStopId(stop.id);
    saveStop(stop.id);
    setWalkToStopMinutes(walkMinutes);
    setLocationMessage(message);
    setEditing(false);
  };

  const stopIndex = selectedStop ? stops.findIndex((stop) => stop.id === selectedStop.id) : -1;
  const transitMinutes = stopIndex >= 0 ? minutes[stopIndex] : null;
  const totalMinutes = Number.isFinite(transitMinutes) ? transitMinutes + walkToStopMinutes : null;
  const editLabel = 'Změnit';

  return (
    <section className="sd-commute" aria-label={parent ? 'Doba cesty MHD' : 'Doba cesty MHD'}>
      <div className="sd-commute-heading">
        <Bus size={20} aria-hidden="true" />
        <h3>{parent ? 'Jak dlouho sem pojedete MHD?' : 'Jak dlouho sem pojedeš MHD?'}</h3>
      </div>

      {selectedStop && !editing ? (
        <div className="sd-commute-result">
          {locationMessage && <p className="sd-commute-location" role="status">{locationMessage}</p>}
          {totalMinutes == null ? (
            <p className="sd-commute-unavailable">Přes 90 minut nebo bez rozumného spojení.</p>
          ) : (
            <>
              <p className="sd-commute-time">cca {totalMinutes} min</p>
              <p className="sd-commute-route">MHD ze zastávky {selectedStop.name} · ranní špička, podle jízdních řádů PID</p>
              {walkToStopMinutes > 0 && <p className="sd-commute-walk">Včetně cca {walkToStopMinutes} min pěšky k zastávce.</p>}
              <p className="sd-commute-walk">Čas je orientační a nemusí být vždy přesný – skutečná cesta se může lišit (zpoždění, přestupy, tempo chůze).</p>
            </>
          )}
          <button
            type="button"
            className="ss-btn ss-btn-secondary sd-commute-change"
            onClick={() => {
              setInitialQuery(selectedStop.name);
              setEditing(true);
              setLocationMessage('');
            }}
          >
            {editLabel}
          </button>
        </div>
      ) : (
        <StopPicker
          stops={stops}
          parent={parent}
          idPrefix={`commute-${schoolId}`}
          initialQuery={initialQuery}
          onChoose={chooseStop}
        />
      )}

      <footer className="sd-commute-attribution">
        <a href="https://pid.cz/o-systemu/opendata/" target="_blank" rel="noopener noreferrer">Jízdní řády PID</a>
        {' · '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
        {' · Odhad je náš výpočet z těchto dat.'}
      </footer>
    </section>
  );
}

export default CommuteTime;
