import { useState } from 'react';
import ProgramCard from './ProgramCard';
import { oborWord } from '../../lib/pluralCz';

const COLLAPSED_COUNT = 3;

function ProgramList({ entries }) {
  const [expanded, setExpanded] = useState(false);

  if (!entries.length) return null;

  const shown = expanded ? entries : entries.slice(0, COLLAPSED_COUNT);
  const rest = entries.length - shown.length;

  return (
    <div>
      <div className="sd-programs">
        {shown.map((entry) => (
          <ProgramCard key={`${entry.kkov}-${entry.oborNazev}-${entry.typSkoly}-${entry.delkaStudia}`} entry={entry} />
        ))}
      </div>
      {rest > 0 && (
        <div className="sd-programs-more">
          <button type="button" className="ss-btn ss-btn-secondary" onClick={() => setExpanded(true)}>
            Zobrazit dalších {rest} {oborWord(rest)}
          </button>
        </div>
      )}
    </div>
  );
}

export default ProgramList;
