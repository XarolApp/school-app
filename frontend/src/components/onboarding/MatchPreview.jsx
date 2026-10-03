import { useEffect, useMemo, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Welcome-screen preview (phone and tablet; desktop shows the full phone loop
 * in the side panel instead).
 *
 * Shows the product's one idea in five seconds: interests narrow the schools
 * down to a short list. Every number is a REAL count over the loaded
 * /api/schools rows — nothing here is illustrative. The count swaps in steps
 * (crossfade), deliberately not a rolling ticker (DESIGN.md → no number
 * tickers).
 */
const hasProgram = (s, test) => (s.school_programs ?? []).some(test);
const FILTERS = [
  { label: 'IT a technika', test: (p) => /^(18|21|23|26|28|36|39)-/.test(p.kkov ?? '') },
  { label: 'S maturitou', test: (p) => p.maturitni === true },
];

export default function MatchPreview({ schools }) {
  const reduced = usePrefersReducedMotion();
  const counts = useMemo(() => {
    if (!schools?.length) return null;
    const a = schools.filter((s) => hasProgram(s, FILTERS[0].test));
    const b = a.filter((s) => hasProgram(s, (p) => FILTERS[0].test(p) && FILTERS[1].test(p)));
    return [schools.length, a.length, b.length];
  }, [schools]);

  // 0 = nothing picked, 1 = first chip, 2 = both; then hold and loop.
  const [stage, setStage] = useState(reduced ? 2 : 0);
  useEffect(() => {
    if (reduced || !counts) return undefined;
    const t = setTimeout(() => setStage((s) => (s + 1) % 4), stage === 3 ? 2600 : 1400);
    return () => clearTimeout(t);
  }, [stage, reduced, counts]);

  if (!counts) return null;
  const shown = Math.min(stage, 2);
  const n = counts[shown];

  return (
    <div className="ob-mp" aria-hidden="true">
      <div className="ob-mp-chips">
        {FILTERS.map((f, i) => (
          <span key={f.label} className={`ob-mp-chip${shown > i ? ' is-on' : ''}`}>
            {f.label}
          </span>
        ))}
      </div>
      <div className="ob-mp-count">
        <b key={n} className="ob-mp-n">{n}</b>
        <span>{n >= 5 || n === 0 ? 'škol' : n === 1 ? 'škola' : 'školy'} v Praze</span>
      </div>
      <div className="ob-mp-bar">
        <span style={{ transform: `scaleX(${n / counts[0]})` }} />
      </div>
    </div>
  );
}
