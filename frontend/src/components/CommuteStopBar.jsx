import { useState } from 'react';
import { Bus } from 'lucide-react';
import { useIsParent } from '../lib/useCommute';
import StopPicker from './StopPicker';
import './commute.css';

/** One-line "ride from this stop" chooser for the comparison and the decision matrix. */
function CommuteStopBar({ stops, stop, onChoose, idPrefix, editing: editingProp, onEditingChange }) {
  const parent = useIsParent();
  const [ownEditing, setOwnEditing] = useState(false);
  // Controlled when the page needs to open the chooser from elsewhere (the stop name in a table row).
  const editing = editingProp ?? ownEditing;
  const setEditing = onEditingChange ?? setOwnEditing;
  if (!stops) return null;

  if (stop && !editing) {
    return (
      <div className="csb">
        <Bus size={18} aria-hidden="true" />
        <span className="csb-text">Dojezd MHD ze zastávky <strong>{stop.name}</strong></span>
        <button type="button" className="cq-link" onClick={() => setEditing(true)}>Změnit</button>
      </div>
    );
  }
  return (
    <div className="csb csb-picker" id={`${idPrefix}-bar`}>
      <StopPicker
        stops={stops}
        parent={parent}
        idPrefix={idPrefix}
        onChoose={(picked) => { setEditing(false); onChoose(picked.id); }}
      />
      {stop && <button type="button" className="cq-link" onClick={() => setEditing(false)}>Nechat {stop.name}</button>}
    </div>
  );
}

export default CommuteStopBar;
