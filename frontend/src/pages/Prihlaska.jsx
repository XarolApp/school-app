import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchPicks,
  savePicks,
  fetchNotes,
  fetchDecisionProfile,
  createShare,
  fetchShares,
  revokeShare,
} from '../api';
import DecisionTabs from '../components/decision/DecisionTabs';
import PickCard from '../components/decision/PickCard';
import PointsInput from '../components/decision/PointsInput';
import RiskSummary from '../components/decision/RiskSummary';
import { useToast } from '../components/ToastContext';
import './decision.css';

function Prihlaska() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [picks, setPicks] = useState([]);
  const [notesBySchool, setNotesBySchool] = useState({});
  const [profile, setProfile] = useState(null);
  const [shares, setShares] = useState([]);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dragIndex, setDragIndex] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([fetchPicks(), fetchNotes(), fetchDecisionProfile(), fetchShares()])
      .then(([picksData, notesData, profileData, sharesData]) => {
        setPicks(picksData);
        setNotesBySchool(Object.fromEntries(notesData.map((n) => [n.school_id, n.body])));
        setProfile(profileData);
        setShares(sharesData.filter((s) => !s.revoked_at));
      })
      .catch((err) => {
        if (!err.isUnauthorized) toast(err.message || 'Nepodařilo se načíst přihlášku.', { type: 'error' });
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load on mount only; `toast` is stable
  useEffect(load, []);

  const writePicks = async (nextPicks) => {
    setPicks(nextPicks); // optimistic
    try {
      await savePicks(
        nextPicks.map((p) => ({ schoolId: p.school.id, oborKkov: p.obor_kkov, oborNazev: p.obor_nazev }))
      );
    } catch (err) {
      toast(err.message || 'Nepodařilo se uložit pořadí.', { type: 'error' });
      load(); // rollback to server state
    }
  };

  const handleMove = (index, direction) => {
    const next = [...picks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    writePicks(next);
  };

  const handleRemove = (index) => {
    const next = picks.filter((_, i) => i !== index);
    writePicks(next);
  };

  const handleChangeObor = (index, oborKkov, oborNazev) => {
    const next = picks.map((p, i) => (i === index ? { ...p, obor_kkov: oborKkov, obor_nazev: oborNazev } : p));
    writePicks(next);
  };

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...picks];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(null);
    writePicks(next);
  };

  const handleCreateShare = async () => {
    try {
      const { token } = await createShare({ includeNotes });
      const url = `${window.location.origin}/sdileni/${token}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      toast('Odkaz zkopírován do schránky.');
      setShares((prev) => [{ token, include_notes: includeNotes, created_at: new Date().toISOString() }, ...prev]);
    } catch (err) {
      toast(err.message || 'Nepodařilo se vytvořit odkaz.', { type: 'error' });
    }
  };

  const handleRevokeShare = async (token) => {
    try {
      await revokeShare(token);
      setShares((prev) => prev.filter((s) => s.token !== token));
      toast('Odkaz zrušen.');
    } catch (err) {
      toast(err.message || 'Nepodařilo se zrušit odkaz.', { type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="decision-page">
        <p className="ss-body-md">Načítám…</p>
      </div>
    );
  }

  return (
    <div className="decision-page">
      <div className="dp-header">
        <div>
          <h1 className="ss-headline-lg h">Moje přihláška</h1>
          <p className="ss-body-md dp-subtitle">
            Tři školy v závazném pořadí — přesně tak, jak je zadáš do DiPSy. Pořadí měníš přetažením nebo šipkami.
          </p>
        </div>
        <div className="dp-header-actions">
          <button type="button" className="ss-btn ss-btn-secondary" onClick={() => window.print()}>
            🖨 Tisk / PDF
          </button>
        </div>
      </div>

      <DecisionTabs pickCount={picks.length} />

      <div className="dp-prihlaska-layout">
        <div className="dp-picks-col">
          {picks.length === 0 && (
            <div className="dp-empty-inline">
              <p className="ss-body-md">
                Zatím nemáš vybranou žádnou školu. Přidej školy na stránce{' '}
                <button type="button" className="dp-link-btn" onClick={() => navigate('/porovnani')}>
                  Porovnání
                </button>{' '}
                nebo přímo na stránce školy.
              </p>
            </div>
          )}

          {picks.map((pick, index) => (
            <PickCard
              key={pick.school.id}
              pick={pick}
              index={index}
              total={picks.length}
              studentPoints={profile?.jpz_points ?? null}
              noteBody={notesBySchool[pick.school.id] || ''}
              onMove={(direction) => handleMove(index, direction)}
              onRemove={() => handleRemove(index)}
              onChangeObor={(kkov, nazev) => handleChangeObor(index, kkov, nazev)}
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              dragging={dragIndex === index}
            />
          ))}

          {picks.length > 0 && picks.length < 3 && (
            <p className="ss-caption">
              Zatím máš {picks.length} ze 3 škol. Přidej další na stránce{' '}
              <button type="button" className="dp-link-btn" onClick={() => navigate('/porovnani')}>
                Porovnání
              </button>
              .
            </p>
          )}

          {picks.length > 0 && (
            <p className="ss-caption dp-footnote">
              Pořadí je závazné: DiPSy tě přijme na nejvýš postavenou školu, kam se dostaneš, a ostatní přihlášky
              tím zaniknou. Proto na 1. místo patří škola, kam se opravdu nejvíc chceš dostat — ne ta, kde máš
              největší šanci.
            </p>
          )}
        </div>

        <div className="dp-rail">
          <div className="dp-rail-card">
            <div className="ss-headline-sm h">Tvoje body z přijímaček</div>
            <PointsInput profile={profile} onSaved={setProfile} />
          </div>

          <div className="dp-rail-card dp-rail-card-accent">
            <div className="ss-headline-sm h">Rozbor tvých tří škol</div>
            <RiskSummary picks={picks} studentPoints={profile?.jpz_points ?? null} />
          </div>

          <div className="dp-rail-card">
            <div className="ss-headline-sm h">Ukázat rodičům</div>
            <p className="ss-body-sm">
              Vytvoří odkaz, kde uvidí tvoje školy, pořadí a rozbor. Nemusí se nikam registrovat.
            </p>
            <label className="dp-share-checkbox">
              <input type="checkbox" checked={includeNotes} onChange={(e) => setIncludeNotes(e.target.checked)} />
              Poslat i moje poznámky
            </label>
            <button type="button" className="ss-btn ss-btn-primary" onClick={handleCreateShare} disabled={!picks.length}>
              Vytvořit odkaz
            </button>

            {shares.length > 0 && (
              <ul className="dp-share-list">
                {shares.map((s) => (
                  <li key={s.token}>
                    <span className="ss-caption">/sdileni/{s.token.slice(0, 8)}…</span>
                    <button type="button" className="dp-link-btn" onClick={() => handleRevokeShare(s.token)}>
                      Zrušit
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="ss-caption">Odkaz můžeš kdykoliv zrušit.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Prihlaska;
