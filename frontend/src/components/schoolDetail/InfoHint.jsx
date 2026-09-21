import Hint from '../Hint';

// Explanation on the hero fact tiles and each obor's own per-stat numbers.
function InfoHint({ text, label }) {
  return <Hint text={text} label={label} size={13} wrapClass="sd-info-hint" tipClass="sd-info-hint-tip" />;
}

export default InfoHint;
