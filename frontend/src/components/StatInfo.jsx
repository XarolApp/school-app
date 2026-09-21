import Hint from './Hint';

// Explanation for a stat number. `placement="bottom"` opens the tooltip
// downward — needed inside SchoolMap.jsx's floating card, which scrolls its
// own overflow and would clip a tooltip escaping past its top edge.
function StatInfo({ text, placement = 'top' }) {
  return <Hint text={text} wrapClass={`ss-stat-info ss-stat-info-${placement}`} tipClass="ss-stat-tooltip" />;
}

export default StatInfo;
