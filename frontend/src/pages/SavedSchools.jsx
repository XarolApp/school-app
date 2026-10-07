import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Columns3, ExternalLink, Trash2 } from 'lucide-react';
import { deleteNote, fetchFavorites, fetchNotes, removeFavorite, saveNote } from '../api';
import { useAuth } from '../components/AuthContext';
import AsyncState from '../components/AsyncState';
import PageSkeleton from '../components/PageSkeleton';
import { useToast } from '../components/ToastContext';
import { withNamesAll } from '../lib/schoolNames';
import { COMPARE_EVENT, getCompareSelection, toggleCompareSelection } from '../lib/searchPrefs';
import { clearDraftKey, readDraft } from '../lib/useDraft';
import './savedSchools.css';

const NOTE_MAX = 2000;

function useCompareIds() {
  const [ids, setIds] = useState(getCompareSelection);
  useEffect(() => {
    const sync = () => setIds(getCompareSelection());
    window.addEventListener(COMPARE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(COMPARE_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return ids;
}

/** One saved school: link to its page, a note that saves itself, compare + remove. */
function SavedCard({ school, savedNote, userId, inCompare, onToggleCompare, onRemove }) {
  const draftKey = `snm.draft.note.${userId}.${school.id}`;
  // A reload before the note was saved brings the typed text back.
  const [text, setText] = useState(() => readDraft(draftKey, savedNote));
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const lastSaved = useRef(savedNote);
  const { toast } = useToast();

  useEffect(() => {
    if (text === lastSaved.current) { clearDraftKey(draftKey); return; }
    try { sessionStorage.setItem(draftKey, JSON.stringify(text)); } catch { /* quota: saving on blur still works */ }
  }, [text, draftKey]);

  const persist = async () => {
    const body = text.trim();
    if (body === lastSaved.current.trim()) return;
    setStatus('saving');
    try {
      if (body) await saveNote(school.id, body); else await deleteNote(school.id);
      lastSaved.current = body;
      setText(body);
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      toast(err.message || 'Poznámku se nepodařilo uložit.', { type: 'error' });
    }
  };

  const programs = String(school.programs || '').split(/[,;]/).map((p) => p.trim()).filter(Boolean).slice(0, 3);
  return (
    <li className="sv-card">
      <div className="sv-card-head">
        <div className="sv-card-title">
          <h2 className="ss-headline-sm h"><Link to={`/skoly/${school.id}`}>{school.name}</Link></h2>
          {school.official_name && <p className="sv-official">{school.official_name}</p>}
          {school.location && <p className="sv-meta">{school.location}</p>}
          {programs.length > 0 && <p className="sv-meta">{programs.join(' · ')}</p>}
        </div>
        {typeof school.match_score === 'number' && (
          <span className="sv-score" title="Shoda podle tvého dotazníku"><strong>{Math.round(school.match_score)} %</strong><small>shoda</small></span>
        )}
      </div>

      <label className="sv-note">
        <span className="field-label">Moje poznámka</span>
        <textarea
          className="input" rows={3} maxLength={NOTE_MAX} value={text}
          placeholder="Co se ti líbí, na co se zeptat, co tě odrazuje…"
          onChange={(e) => { setText(e.target.value); setStatus('idle'); }}
          onBlur={persist}
        />
        <span className="field-hint sv-note-status" role="status">
          {status === 'saving' ? 'Ukládám…' : status === 'saved' ? 'Uloženo' : status === 'error' ? 'Neuloženo, zkus to znovu' : `${text.length}/${NOTE_MAX}`}
        </span>
      </label>

      <div className="sv-actions">
        <Link to={`/skoly/${school.id}`} className="btn btn-secondary btn-sm"><ExternalLink size={14} aria-hidden="true" /> Detail školy</Link>
        <button type="button" className={`btn btn-secondary btn-sm${inCompare ? ' is-selected' : ''}`} aria-pressed={inCompare} onClick={() => onToggleCompare(school.id)}>
          <Columns3 size={14} aria-hidden="true" /> {inCompare ? 'V porovnání' : 'Přidat k porovnání'}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onRemove(school)}>
          <Trash2 size={14} aria-hidden="true" /> Odebrat z uložených
        </button>
      </div>
    </li>
  );
}

function SavedSchools() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState({ loading: true, error: null, schools: [], notes: {} });
  const compareIds = useCompareIds();

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([fetchFavorites(), fetchNotes()])
      .then(([favorites, notes]) => setState({
        loading: false, error: null,
        schools: withNamesAll(favorites).map((s) => ({ ...s, id: s.id ?? s.school_id })),
        notes: Object.fromEntries(notes.map((n) => [n.school_id, n.body])),
      }))
      .catch((err) => { if (!err.isUnauthorized) setState((s) => ({ ...s, loading: false, error: err.message || 'Uložené školy se nepodařilo načíst.' })); });
  }, []);
  useEffect(load, [load]);

  const schools = useMemo(() => [...state.schools].sort((a, b) =>
    (b.match_score ?? -1) - (a.match_score ?? -1) || String(a.name).localeCompare(String(b.name), 'cs')), [state.schools]);

  const toggleCompare = (id) => {
    try { toggleCompareSelection(id); } catch (err) { toast(err.message, { type: 'error' }); }
  };
  const remove = async (school) => {
    const before = state.schools;
    setState((s) => ({ ...s, schools: s.schools.filter((x) => x.id !== school.id) }));
    try { await removeFavorite(school.id); } catch (err) {
      setState((s) => ({ ...s, schools: before }));
      toast(err.message || 'Školu se nepodařilo odebrat.', { type: 'error' });
    }
  };

  if (state.loading && !state.schools.length) return <PageSkeleton variant="list" label="Načítám uložené školy…" />;
  if (state.error) return <AsyncState kind="error" title="Uložené školy se nepodařilo načíst" onRetry={load}>{state.error}</AsyncState>;

  return (
    <div className="sv-page">
      <header className="sv-header">
        <div>
          <p className="eyebrow">Tvůj výběr</p>
          <h1 className="ss-headline-lg h">Uložené školy</h1>
          <p className="ss-body-md sv-lede">Školy, které sis uložil(a) záložkou. U každé si můžeš psát poznámky, přidat ji k porovnání nebo otevřít její stránku.</p>
        </div>
        {schools.length > 0 && (
          <Link to="/porovnani" className="btn btn-primary">
            <Columns3 size={16} aria-hidden="true" /> Porovnat vybrané{compareIds.length ? ` (${compareIds.length})` : ''}
          </Link>
        )}
      </header>

      {schools.length === 0 ? (
        <div className="sv-empty">
          <Bookmark size={28} aria-hidden="true" />
          <h2 className="ss-headline-md h">Zatím tu nic není</h2>
          <p className="ss-body-md">Školu uložíš záložkou u jejího názvu ve výpisu nebo na její stránce.</p>
          <Link to="/skoly" className="btn btn-primary">Projít databázi škol</Link>
        </div>
      ) : (
        <ul className="sv-list">
          {schools.map((school) => (
            <SavedCard
              key={school.id} school={school} savedNote={state.notes[school.id] ?? ''} userId={user?.id}
              inCompare={compareIds.includes(school.id)} onToggleCompare={toggleCompare} onRemove={remove}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default SavedSchools;
