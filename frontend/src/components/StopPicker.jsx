import { useMemo, useState } from 'react';
import { LocateFixed } from 'lucide-react';
import { findStopsByName, nearestStopGroup } from '../lib/commute';
import './commute.css';

/**
 * Stop-name combobox plus "Použít moji polohu". Shared by the school detail
 * page, the questionnaire and the /skoly filter, so a stop is chosen the same
 * way everywhere. Geolocation is read once in the browser, mapped to the
 * nearest stop group and discarded: only the stop reaches `onChoose`.
 *
 * `onChoose(stop, walkMinutes, message)`: walkMinutes is 0 for a typed stop.
 */
function StopPicker({ stops, parent = false, idPrefix, initialQuery = '', onChoose }) {
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');

  const suggestions = useMemo(() => (query ? findStopsByName(stops, query).slice(0, 8) : []), [stops, query]);
  const duplicateNames = useMemo(() => {
    const counts = new Map();
    for (const stop of stops) counts.set(stop.name, (counts.get(stop.name) || 0) + 1);
    return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
  }, [stops]);

  const inputId = `${idPrefix}-stop`;
  const listId = `${inputId}-list`;
  const manual = parent ? 'Zastávku můžete vybrat ručně.' : 'Zastávku můžeš vybrat ručně.';
  const failed = `Polohu se nepodařilo získat. ${manual}`;

  const choose = (stop, walkMinutes = 0, message = '') => {
    setQuery('');
    setActiveIndex(-1);
    setLocationMessage('');
    onChoose(stop, walkMinutes, message);
  };

  const locate = () => {
    setLocationMessage('');
    if (!navigator.geolocation) {
      setLocationMessage(failed);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const nearest = nearestStopGroup({ lat: coords.latitude, lon: coords.longitude }, stops);
      setLocating(false);
      if (!nearest) {
        setLocationMessage(failed);
        return;
      }
      if (nearest.distanceMeters > 2_000) {
        setLocationMessage(parent
          ? 'Zatím umíme jen Prahu — zastávku můžete vybrat ručně.'
          : 'Zatím umíme jen Prahu — vyber zastávku ručně.');
        return;
      }
      choose(nearest.stop, nearest.walkMinutes, `Nejbližší zastávka: ${nearest.stop.name} (cca ${nearest.walkMinutes} min pěšky)`);
    }, () => {
      setLocating(false);
      setLocationMessage(failed);
    }, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 0 });
  };

  return (
    <div className="sd-commute-picker">
      <label htmlFor={inputId}>Název zastávky</label>
      <div className="sd-commute-field">
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
          } else if (event.key === 'Enter') {
            // Never submit the surrounding form (the questionnaire) from here.
            event.preventDefault();
            if (activeIndex >= 0) choose(suggestions[activeIndex]);
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
              onClick={() => choose(stop)}
            >
              <span>{stop.name}</span>
              {duplicateNames.has(stop.name) && <small>Uzel {stop.id.replace(/^pid-/, '').split('-')[0]}</small>}
            </div>
          ))}
        </div>
      )}
      </div>
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
  );
}

export default StopPicker;
