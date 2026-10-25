import { useEffect, useMemo, useState } from 'react';
import { Bus, LocateFixed } from 'lucide-react';
import { fetchCommuteStops, fetchSchoolCommute } from '../../api';
import { findStopsByName, nearestStopGroup } from '../../lib/commute';
import { useBetaTools } from '../BetaToolsContext';

const STORAGE_KEY = 'commute.stopId';

function readSavedStop() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function saveStop(stopId) {
  try {
    if (stopId) localStorage.setItem(STORAGE_KEY, stopId);
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* the selected stop still works for this page */ }
}

function CommuteTime({ schoolId }) {
  const { beta } = useBetaTools();
  const parent = beta?.role === 'rodic' || beta?.role === 'ucitel';
  const [stops, setStops] = useState(null);
  const [minutes, setMinutes] = useState(null);
  const [unavailable, setUnavailable] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState(readSavedStop);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(!readSavedStop());
  const [activeIndex, setActiveIndex] = useState(-1);
  const [locating, setLocating] = useState(false);
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
  const suggestions = useMemo(() => (stops && query
    ? findStopsByName(stops, query).slice(0, 8)
    : []), [stops, query]);
  const duplicateNames = useMemo(() => {
    if (!stops) return new Set();
    const counts = new Map();
    for (const stop of stops) counts.set(stop.name, (counts.get(stop.name) || 0) + 1);
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  }, [stops]);

  if (unavailable || !stops || !minutes) return null;

  const chooseStop = (stop, walkMinutes = 0) => {
    setSelectedStopId(stop.id);
    saveStop(stop.id);
    setWalkToStopMinutes(walkMinutes);
    setQuery('');
    setActiveIndex(-1);
    setLocationMessage('');
    setEditing(false);
  };

  const locate = () => {
    setLocationMessage('');
    if (!navigator.geolocation) {
      setLocationMessage(parent
        ? 'Polohu se nepodařilo získat. Zastávku můžete vybrat ručně.'
        : 'Polohu se nepodařilo získat. Zastávku můžeš vybrat ručně.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const nearest = nearestStopGroup({ lat: coords.latitude, lon: coords.longitude }, stops);
      setLocating(false);
      if (!nearest) {
        setLocationMessage(parent
          ? 'Polohu se nepodařilo získat. Zastávku můžete vybrat ručně.'
          : 'Polohu se nepodařilo získat. Zastávku můžeš vybrat ručně.');
        return;
      }
      if (nearest.distanceMeters > 2_000) {
        setLocationMessage(parent
          ? 'Zatím umíme jen Prahu — zastávku můžete vybrat ručně.'
          : 'Zatím umíme jen Prahu — vyber zastávku ručně.');
        return;
      }
      chooseStop(nearest.stop, nearest.walkMinutes);
      setLocationMessage(`Nejbližší zastávka: ${nearest.stop.name} (cca ${nearest.walkMinutes} min pěšky)`);
    }, () => {
      setLocating(false);
      setLocationMessage(parent
        ? 'Polohu se nepodařilo získat. Zastávku můžete vybrat ručně.'
        : 'Polohu se nepodařilo získat. Zastávku můžeš vybrat ručně.');
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 });
  };

  const selectSuggestion = (index) => {
    const stop = suggestions[index];
    if (stop) chooseStop(stop);
  };

  const stopIndex = selectedStop ? stops.findIndex((stop) => stop.id === selectedStop.id) : -1;
  const transitMinutes = stopIndex >= 0 ? minutes[stopIndex] : null;
  const totalMinutes = Number.isFinite(transitMinutes) ? transitMinutes + walkToStopMinutes : null;
  const inputId = `commute-stop-${schoolId}`;
  const listId = `${inputId}-list`;
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
              setQuery(selectedStop.name);
              setEditing(true);
              setLocationMessage('');
            }}
          >
            {editLabel}
          </button>
        </div>
      ) : (
        <div className="sd-commute-picker">
          <label htmlFor={inputId}>{parent ? 'Název zastávky' : 'Název zastávky'}</label>
          <input
            id={inputId}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestions.length > 0}
            aria-controls={listId}
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            autoComplete="off"
            value={query}
            placeholder="Např. Anděl"
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(-1); }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' && suggestions.length) {
                event.preventDefault();
                setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
              } else if (event.key === 'ArrowUp' && suggestions.length) {
                event.preventDefault();
                setActiveIndex((index) => Math.max(index - 1, 0));
              } else if (event.key === 'Enter' && activeIndex >= 0) {
                event.preventDefault();
                selectSuggestion(activeIndex);
              } else if (event.key === 'Escape') {
                setActiveIndex(-1);
              }
            }}
          />
          {suggestions.length > 0 && (
            <div className="sd-commute-options" id={listId} role="listbox" aria-label="Nalezené zastávky">
              {suggestions.map((stop, index) => (
                <div
                  id={`${listId}-${index}`}
                  key={stop.id}
                  role="option"
                  aria-selected={activeIndex === index}
                  className={activeIndex === index ? 'is-active' : ''}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseStop(stop)}
                >
                  <span>{stop.name}</span>
                  {duplicateNames.has(stop.name) && <small>Uzel {stop.id.replace(/^pid-/, '').split('-')[0]}</small>}
                </div>
              ))}
            </div>
          )}
          {query && suggestions.length === 0 && (
            <p className="sd-commute-hint">
              {parent ? 'Zastávku jsme nenašli. Zkuste kratší název.' : 'Zastávku jsme nenašli. Zkus kratší název.'}
            </p>
          )}
          <button type="button" className="ss-btn ss-btn-secondary sd-commute-locate" onClick={locate} disabled={locating}>
            <LocateFixed size={17} aria-hidden="true" />
            {locating ? 'Zjišťuji polohu…' : 'Použít moji polohu'}
          </button>
          <p className="sd-commute-hint">Poloha zůstane v tomto zařízení.</p>
          {locationMessage && <p className="sd-commute-location" role="status">{locationMessage}</p>}
        </div>
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
