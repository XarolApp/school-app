import { COMMUTE_LIMIT_MAX, COMMUTE_LIMIT_MIN, NO_LIMIT, commuteCountText, limitFromSlider } from '../lib/commute';
import './commute.css';

const TICKS = [
  { position: COMMUTE_LIMIT_MIN, label: '1' },
  { position: 15, label: '15' },
  { position: 30, label: '30' },
  { position: 45, label: '45' },
  { position: NO_LIMIT, label: '60+' },
];

/**
 * Draggable scale for "how long may the ride take", any whole minute from 1 to
 * 60 and a "60+" end meaning no limit, with the live school count right under
 * it. The same control sits in the questionnaire and in the /skoly filter, so
 * the number a student sees in one place is the number in the other.
 *
 * `value` is the slider position (1..NO_LIMIT); `minutes` is the stop's row
 * ({ schoolId: minutes | null }) or null while it loads.
 */
function CommuteLimitControl({ idPrefix, value, onChange, minutes, loading, failed, parent = false, stopName }) {
  const limit = limitFromSlider(value);
  const fill = ((value - COMMUTE_LIMIT_MIN) / (NO_LIMIT - COMMUTE_LIMIT_MIN)) * 100;
  const inputId = `${idPrefix}-limit`;
  const text = minutes || limit == null ? commuteCountText({ minutes: minutes || {}, limit, parent }) : null;
  const readout = limit == null ? `${COMMUTE_LIMIT_MAX}+ min` : `${limit} min`;

  return (
    <div className="cl-control">
      <div className="cl-head">
        <label htmlFor={inputId} className="cl-label">Nejdelší cesta MHD</label>
        <output htmlFor={inputId} className="cl-readout" aria-hidden="true">{readout}</output>
      </div>

      <input
        id={inputId}
        type="range"
        className="cl-slider"
        min={COMMUTE_LIMIT_MIN}
        max={NO_LIMIT}
        step="1"
        value={value}
        style={{ '--cl-fill': `${fill}%` }}
        aria-valuetext={limit == null ? 'bez limitu, 60 minut a více' : `${limit} ${limit === 1 ? 'minuta' : limit < 5 ? 'minuty' : 'minut'}`}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="cl-ticks" aria-hidden="true">
        {TICKS.map((tick) => (
          <span
            key={tick.position}
            style={{ left: `${((tick.position - COMMUTE_LIMIT_MIN) / (NO_LIMIT - COMMUTE_LIMIT_MIN)) * 100}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>

      <div className="cl-count" aria-live="polite">
        {failed && <p className="cl-count-main">Počet škol se teď nepodařilo načíst. Limit můžeš nastavit i tak.</p>}
        {!failed && loading && <p className="cl-count-main cl-muted">Počítám školy v dosahu…</p>}
        {text && (
          <>
            <p className="cl-count-main">{text.main}</p>
            {text.hint && <p className="cl-count-hint">{text.hint}</p>}
          </>
        )}
        {stopName && !failed && <p className="cl-count-hint">Ze zastávky {stopName} · cca, ranní špička podle jízdních řádů PID.</p>}
      </div>
    </div>
  );
}

export default CommuteLimitControl;
