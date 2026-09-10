import { Info } from 'lucide-react';

// Hover-to-reveal explanation, CSS-only (no click state) — matches the
// pattern already used on the search list's stat cells. Works on both the
// hero fact tiles and each obor's own per-stat numbers.
function InfoHint({ text, label }) {
  return (
    <span className="sd-info-hint">
      <Info size={13} aria-hidden="true" />
      <span className="sd-info-hint-tip" role="tooltip">
        {label ? <strong>{label}: </strong> : null}
        {text}
      </span>
    </span>
  );
}

export default InfoHint;
