import { Info } from 'lucide-react';

// Hover-to-reveal explanation for a stat number — CSS-only tooltip, no click
// state (used inside <Link> row cards, so a <button> isn't valid HTML here).
// `placement="bottom"` opens the tooltip downward instead of upward — needed
// inside SchoolMap.jsx's floating card, which scrolls its own overflow and
// would clip a tooltip trying to escape upward past its top edge.
function StatInfo({ text, placement = 'top' }) {
  return (
    <span className={`ss-stat-info ss-stat-info-${placement}`}>
      <Info size={12} aria-hidden="true" />
      <span className="ss-stat-tooltip">{text}</span>
    </span>
  );
}

export default StatInfo;
