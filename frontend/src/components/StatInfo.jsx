import Hint from './Hint';

// Explanation for a stat number. `placement="bottom"` opens the tooltip
// downward, as used in SchoolMap.jsx's floating card. The tooltip still needs
// viewport collision handling; the card's overflow is visible.
function StatInfo({ text, placement = 'top' }) {
  return <Hint text={text} wrapClass={`ss-stat-info ss-stat-info-${placement}`} tipClass="ss-stat-tooltip" />;
}

export default StatInfo;
