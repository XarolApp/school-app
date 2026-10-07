import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BrandMark from '../components/BrandMark';
import { openHandoff } from '../api';
import { ROLE_KEY, ANSWERS_KEY } from '../lib/onboardingStorage';
import './decision.css';
import PageSkeleton from '../components/PageSkeleton';

function HandoffStart() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState('loading');
  const [error, setError] = useState(null);

  const open = useCallback(async () => {
    setState('loading');
    setError(null);
    // The parent's lock lives in localStorage, which every tab of this browser
    // shares. Taking over here would land the child on the parent's lock
    // screen, so the parent's own browser is told to use the child's device.
    try {
      const owner = JSON.parse(localStorage.getItem('skolamatch.handoff.owner') || 'null');
      if (owner?.token === token) {
        setState('own-device');
        return;
      }
    } catch {
      // Unreadable storage cannot hold the parent's lock either.
    }
    try {
      await openHandoff(token);
      localStorage.setItem(ROLE_KEY, 'student');
      localStorage.setItem('skolamatch.handoff.child', token);
      sessionStorage.removeItem(ANSWERS_KEY);
      setState('ready');
    } catch (err) {
      if (err?.status === 404) setState('invalid');
      else {
        setState('error');
        setError(err?.status ? err.message : 'Připojení se nepodařilo. Zkus to prosím znovu.');
      }
    }
  }, [token]);

  useEffect(() => { open(); }, [open]);

  return (
    <div className="dp-share-page dp-plan018-page">
      <div className="dp-share-topbar">
        <Link to="/" className="navbar-brand">
          <span className="navbar-mark" aria-hidden="true"><BrandMark size={22} /></span>
          Střední na míru
        </Link>
      </div>
      {state === 'loading' ? (
        <PageSkeleton variant="card" label="Načítám odkaz…" />
      ) : state === 'ready' ? (
        <section className="dp-share-header">
          <div className="ss-label-caps">Dotazník</div>
          <h1 className="ss-headline-md h">Rodič ti poslal dotazník</h1>
          <p className="ss-body-md">
            Pár otázek o tom, co tě baví a kam chceš. Odpovídej podle sebe — výsledky i účet budou tvoje.
          </p>
          <button className="ss-btn ss-btn-primary" type="button" onClick={() => navigate('/onboarding/stakes')}>
            Začít
          </button>
        </section>
      ) : state === 'own-device' ? (
        <div className="dp-share-notfound">
          <h1 className="ss-headline-md h">Tento odkaz je pro vaše dítě</h1>
          <p className="ss-body-md">
            Odkaz jste vytvořili v tomto prohlížeči. Pošlete ho dítěti a otevřete ho na jeho zařízení —
            tady by se dotazník zamkl.
          </p>
          <Link to="/onboarding/welcome" className="ss-btn ss-btn-secondary">Zpět k dotazníku</Link>
        </div>
      ) : state === 'invalid' ? (
        <div className="dp-share-notfound">
          <h1 className="ss-headline-md h">Odkaz už neplatí</h1>
          <p className="ss-body-md">Rodič ho zrušil, nebo vypršel. Můžeš si dotazník vyplnit i bez něj.</p>
          <button className="ss-btn ss-btn-primary" type="button" onClick={() => navigate('/onboarding/welcome')}>
            Začít dotazník
          </button>
        </div>
      ) : (
        <div className="dp-share-notfound">
          <h1 className="ss-headline-md h">Odkaz se nepodařilo otevřít</h1>
          <p className="ss-body-md">{error}</p>
          <button className="ss-btn ss-btn-primary" type="button" onClick={open}>Zkusit znovu</button>
        </div>
      )}
    </div>
  );
}

export default HandoffStart;
