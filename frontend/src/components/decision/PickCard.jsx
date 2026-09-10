import { useState } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import { groupProgramsByObor } from '../../lib/schoolPrograms';
import { cutoffForPick, bandFor, BANDS } from '../../lib/admissionRisk';
import NoteEditor from './NoteEditor';

const numCz = (v) => (v == null ? null : v.toLocaleString('cs-CZ', { maximumFractionDigits: 1 }));

/**
 * One school in the 3-pick planner (/prihlaska). Reordering has two paths on
 * purpose: HTML5 drag-and-drop for a mouse, and the ↑/↓ buttons for keyboard
 * and touch — dragging three items doesn't justify a DnD library, but it
 * does need a non-drag path to actually be accessible (plan 006 §4.4).
 */
function PickCard({ pick, index, total, studentPoints, noteBody, onMove, onRemove, onChangeObor, onDragStart, onDragOver, onDrop, dragging }) {
  const [oborOpen, setOborOpen] = useState(false);
  const school = pick.school;
  const entries = groupProgramsByObor(school).filter((e) => !e.isDiscontinued);

  const { cutoff, source, year } = cutoffForPick(pick, school);
  const band = bandFor({ studentPoints, cutoff });
  const tone = band ? BANDS[band].tone : null;

  const oborLabel = pick.obor_nazev || (entries.length === 1 ? entries[0].oborNazev : null);

  return (
    <div
      className={`dp-pick-card${dragging ? ' is-dragging' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="dp-pick-rank">
        <div className="dp-pick-rank-num">{index + 1}</div>
        <div className="dp-pick-reorder">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Posunout výš">
            <ChevronUp size={16} />
          </button>
          <span className="dp-pick-drag-handle" aria-hidden="true">⠿</span>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Posunout níž">
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      <div className="dp-pick-body">
        <div className="dp-pick-head">
          <div>
            <h3 className="dp-pick-name">{school.name}</h3>
            <div className="ss-caption">{school.location}</div>
          </div>
          <div className="dp-pick-head-right">
            {tone && <span className={`dp-pill dp-pill-${tone}`}>{BANDS[band].label}</span>}
            <button type="button" className="dp-pick-remove" onClick={onRemove} aria-label="Odebrat z přihlášky">
              <X size={18} />
            </button>
          </div>
        </div>

        {entries.length > 0 && (
          <div className="dp-pick-obor">
            <span className="ss-label-caps">Obor</span>
            <div className="dp-pick-obor-value">{oborLabel || 'Vyber obor'}</div>
            <button type="button" className="dp-pick-obor-change" onClick={() => setOborOpen((o) => !o)}>
              Změnit ▾
            </button>
            {oborOpen && (
              <div className="dp-pick-obor-menu">
                {entries.map((e) => (
                  <button
                    type="button"
                    key={e.kkov || e.oborNazev}
                    onClick={() => {
                      onChangeObor(e.kkov, e.oborNazev);
                      setOborOpen(false);
                    }}
                  >
                    {e.oborNazev}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`dp-pick-stats${tone ? ` dp-pick-stats-${tone}` : ''}`}>
          <div>
            <div className="ss-label-caps">Hranice {source === 'skola' ? '(průměr školy)' : year ? year : ''}</div>
            <div className="ss-headline-sm">{cutoff != null ? `${numCz(cutoff)} b.` : '—'}</div>
          </div>
          <div className="dp-pick-stats-divider" />
          <div>
            <div className="ss-label-caps">Tvoje body</div>
            <div className="ss-headline-sm">{studentPoints != null ? `${numCz(studentPoints)} b.` : '—'}</div>
          </div>
          <div className="dp-pick-stats-note">
            {cutoff == null
              ? 'Hranici pro tuto školu zatím nemáme.'
              : studentPoints == null
                ? 'Zadej svoje body vpravo a spočítáme rozdíl.'
                : studentPoints - cutoff >= 0
                  ? `Máš o ${numCz(studentPoints - cutoff)} bodu víc, než loni stačilo.`
                  : `Chybí ti ${numCz(cutoff - studentPoints)} bodu na loňskou hranici.`}
            {source === 'skola' && cutoff != null && ' Bez vybraného oboru jde o průměr celé školy.'}
          </div>
        </div>

        <NoteEditor schoolId={school.id} initialBody={noteBody} />
      </div>
    </div>
  );
}

export default PickCard;
