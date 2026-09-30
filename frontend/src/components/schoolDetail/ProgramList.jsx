import { useState } from 'react';
import { Search } from 'lucide-react';
import ProgramCard from './ProgramCard';
import { oborWord } from '../../lib/pluralCz';
import { normalize } from '../../lib/schoolSearch';

const COLLAPSED_COUNT = 3;

function ProgramList({ entries }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');

  if (!entries.length) return null;

  // Search only helps once there are more obory than the collapsed list shows.
  const searchable = entries.length > COLLAPSED_COUNT;
  const needle = normalize(text.trim());
  const matching = needle
    ? entries.filter((e) => normalize(`${e.oborNazev ?? ''} ${e.kkov ?? ''} ${(e.latest.variants ?? []).map((v) => v.zamereni).join(' ')}`).includes(needle))
    : entries;
  const shown = expanded || needle ? matching : matching.slice(0, COLLAPSED_COUNT);
  const rest = matching.length - shown.length;

  return (
    <div>
      {searchable && (
        <label className="sd-program-search">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            className="input"
            placeholder={`Hledat obor nebo kód (${entries.length} na této škole)…`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-label="Hledat obor na této škole"
          />
        </label>
      )}
      {needle && (
        <p className="sd-program-search-count" aria-live="polite">
          {matching.length ? `Nalezeno ${matching.length} ${oborWord(matching.length)}.` : 'Žádný obor tomu neodpovídá.'}
        </p>
      )}
      <div className="sd-programs">
        {shown.map((entry) => (
          <ProgramCard key={`${entry.kkov}-${entry.oborNazev}-${entry.typSkoly}-${entry.delkaStudia}-${entry.jazykStudia}`} entry={entry} />
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
