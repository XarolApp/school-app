import { DISTRICTS, VIEW_BOX } from '../../lib/pragueDistricts';

/**
 * A flat, click-to-select map of Prague's 22 správní obvody, shown beside the
 * `districts` question's checkbox list.
 *
 * Ported from the earlier laptop build's questionnaire (`docs` there call it
 * `casti`) into the onboarding quiz. Inline SVG generated ahead of time from
 * real OpenStreetMap boundaries — no tiles, no mapping library, no network
 * call at render time, nothing to rate-limit, works offline.
 *
 * ⚠️ Deliberately `aria-hidden`. Every district here is also a real checkbox
 * in the option list next to it, so exposing both would double every option
 * for a screen reader. The checkboxes are the accessible path; this is a
 * faster pointer-driven shortcut onto the same state.
 *
 * `hovered`/`onHover` link the map to the checkbox list in both directions —
 * a student who doesn't know Prague's numbering can hover "Praha 6" and see
 * where that is.
 *
 * The geometry's `id` field is "Praha 6" (matching the older questionnaire's
 * option values); this quiz's own `districts` question instead uses the bare
 * number "6" as its answer value, so `lib/matching.js` can `Number()` it
 * directly. `numOf`/`idOf` below are the one place that translates between
 * the two — `selected`, `onToggle` and `hovered`/`onHover` all speak in bare
 * numbers, matching the option values everywhere else on this screen.
 */
function labelSize(district) {
  return Math.round(Math.min(26, Math.max(13, district.labelR * 0.72)));
}

const numOf = (district) => String(district.num);

function DistrictMap({ selected = [], onToggle, max, hovered, onHover }) {
  const chosen = new Set(selected);
  const atMax = typeof max === 'number' && chosen.size >= max;

  return (
    <div className="ob-district-map">
      <svg
        className="ob-district-map-svg"
        viewBox={VIEW_BOX}
        aria-hidden="true"
        focusable="false"
      >
        {DISTRICTS.map((district) => {
          const num = numOf(district);
          const isSelected = chosen.has(num);
          const isBlocked = atMax && !isSelected;

          return (
            <g
              key={district.id}
              className={[
                'ob-district-map-region',
                isSelected ? 'is-selected' : '',
                isBlocked ? 'is-blocked' : '',
                hovered === num ? 'is-peer-hovered' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={isBlocked ? undefined : () => onToggle(num)}
              onMouseEnter={onHover ? () => onHover(num) : undefined}
              onMouseLeave={onHover ? () => onHover(null) : undefined}
            >
              <title>{district.id}</title>
              <path className="ob-district-map-shape" d={district.d} />
              <text
                className="ob-district-map-number"
                x={district.labelX}
                y={district.labelY}
                fontSize={labelSize(district)}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {district.num}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Required by OSM's licence, not decoration — do not remove. */}
      <p className="ob-district-map-credit">
        Hranice{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © přispěvatelé OpenStreetMap
        </a>
      </p>
    </div>
  );
}

export default DistrictMap;
