import BetaEnrollment from '../components/BetaEnrollment';
import { readBetaEnrollment, saveBetaEnrollment } from '../lib/betaEnrollment';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { fetchBetaSchool, startBetaVisit } from '../api';
import { normalizeBetaCode, rememberBetaCode } from '../lib/pendingBetaCode';
import './beta.css';

function dateLabel(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Prague',
  }).format(date);
}

function BetaLanding() {
  const { code: routeCode } = useParams();
  const code = useMemo(() => normalizeBetaCode(routeCode), [routeCode]);
  const [searchParams] = useSearchParams();
  const [school, setSchool] = useState(null);
  const [lookupState, setLookupState] = useState('loading');
  const [lookupError, setLookupError] = useState('');
  const {
    loading,
    profileLoading,
    profileError,
    isSignedIn,
    emailConfirmed,
    isTester,
    hasAccess,
    signOut,
    refreshProfile,
  } = useAuth();
  const navigate = useNavigate();
  const justConfirmed = searchParams.get('potvrzeno') === '1';

  useEffect(() => {
    let active = true;
    if (!code) {
      setLookupState('invalid');
      setSchool(null);
      return () => { active = false; };
    }
    setLookupState('loading');
    setLookupError('');
    fetchBetaSchool(code).then((result) => {
      if (!active) return;
      if (result.code !== code || typeof result.school_name !== 'string') {
        setLookupState('invalid');
        return;
      }
      setSchool(result);
      setLookupState('ready');
      rememberBetaCode(code);
    }).catch((error) => {
      if (!active) return;
      setLookupError(error.message);
      setLookupState(error.status === 404 ? 'invalid' : 'unavailable');
    });
    return () => { active = false; };
  }, [code]);

  useEffect(() => {
    if (lookupState !== 'ready' || !isSignedIn || loading || profileLoading || profileError) return;
    if (!emailConfirmed) return;
    if (!isTester) return;
    navigate(hasAccess ? '/skoly' : '/predplatne', { replace: true });
  }, [lookupState, isSignedIn, loading, profileLoading, profileError, emailConfirmed, isTester, hasAccess, navigate]);

  const deadline = dateLabel(school?.programEndsAt);
  const closedBeforeStart = school && !school.programEndsAt;
  const closedAfterEnd = school && school.programEndsAt && !school.programActive;
  const [enrollment, setEnrollment] = useState(() => readBetaEnrollment(code));
  const updateEnrollment = (patch) => {
    const next = { ...enrollment, ...patch }; setEnrollment(next); saveBetaEnrollment(code, next.role, next.accepted);
  };
  const [starting,setStarting]=useState(false),[startError,setStartError]=useState('');
  const continueSignup=async()=>{setStarting(true);setStartError('');try{await startBetaVisit(code,enrollment.role,enrollment.accepted);navigate(`/registrace?beta=${encodeURIComponent(code)}`);}catch{setStartError('Pozvánku se nepodařilo připravit. Zkuste to znovu.');}finally{setStarting(false);}};
  const betaQuery = code ? `?beta=${encodeURIComponent(code)}` : '';

  return (
    <>
    <meta name="robots" content="noindex, nofollow" />
    <main className="page page-auth beta-page">
      <div className="auth-layout">
        <div className="page-header">
          <p className="eyebrow">Střední na míru · školní testování</p>
          <h1>{school?.school_name || 'Pozvánka k testování'}</h1>
          <p className="lede">
            Pomoz nám ověřit hledání středních škol a rozhodovací nástroje před spuštěním.
          </p>
        </div>

        {lookupState === 'loading' && (
          <div className="panel panel-lg" role="status">Ověřuji školní pozvánku…</div>
        )}

        {lookupState === 'invalid' && (
          <div className="panel panel-lg stack">
            <div className="notice notice-error" role="alert">
              <span className="notice-title">Tato pozvánka neplatí</span>
              <p className="notice-text">Zkontroluj odkaz nebo požádej školu o novou pozvánku.</p>
            </div>
            <Link className="btn btn-secondary btn-block" to="/">Zpět na úvodní stránku</Link>
          </div>
        )}

        {lookupState === 'unavailable' && (
          <div className="panel panel-lg stack">
            <div className="notice notice-error" role="alert">
              <span className="notice-title">Pozvánku teď nejde ověřit</span>
              <p className="notice-text">{lookupError || 'Zkus to prosím za chvíli znovu.'}</p>
            </div>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => window.location.reload()}>
              Zkusit znovu
            </button>
          </div>
        )}

        {lookupState === 'ready' && (
          <section className="panel panel-lg stack beta-invite-card" aria-labelledby="beta-invite-title">
            <div>
              <h2 id="beta-invite-title">Jak testování funguje</h2>
              <ul className="beta-facts">
                <li><strong>{school.accessHours || 48} hodin přístupu.</strong> Po skončení můžeš pokračovat odesláním zpětné vazby přímo v aplikaci.</li>
                <li><strong>Potvrzení e-mailu je povinné.</strong> Odkaz pošleme na tvoji adresu.</li>
                <li><strong>Bez platební karty a bez platby.</strong> Beta účet nikdy nespustí skutečné placení.</li>
              </ul>
              {deadline && <p className="field-hint">Celý program končí {deadline} (pražského času).</p>}
            </div>

            {closedBeforeStart && (
              <div className="notice" role="status">
                <span className="notice-title">Testování ještě nezačalo</span>
                <p className="notice-text">Střední na míru připravuje časový plán programu. Zkus se vrátit později.</p>
              </div>
            )}
            {closedAfterEnd && (
              <div className="notice" role="status">
                <span className="notice-title">Beta program skončil</span>
                <p className="notice-text">Nové účty už nepřijímáme. Jestli už účet máš, přihlas se a zobraz si jeho stav.</p>
              </div>
            )}

            {loading || (isSignedIn && profileLoading) ? (
              <div role="status">Načítám účet…</div>
            ) : profileError && isSignedIn ? (
              <div className="notice notice-error" role="alert">
                <span className="notice-title">Účet se nepodařilo ověřit</span>
                <p className="notice-text">{profileError}</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={refreshProfile}>Zkusit znovu</button>
              </div>
            ) : isSignedIn && !emailConfirmed ? (
              <div className="notice" role="status">
                <span className="notice-title">Nejdřív potvrď e-mail</span>
                <p className="notice-text">Otevři potvrzovací odkaz, který jsme poslali. Přístup k beta účtu se ověřuje až poté.</p>
                <button type="button" className="btn btn-secondary btn-sm" onClick={signOut}>Odhlásit se</button>
              </div>
            ) : isSignedIn && !isTester ? (
              <div className="stack">
                <div className="notice" role="status">
                  <span className="notice-title">Jsi přihlášený k běžnému účtu</span>
                  <p className="notice-text">Školní pozvánka nezmění existující účet. Můžeš pokračovat ve svém účtu nebo se odhlásit a vytvořit nový beta účet.</p>
                </div>
                <Link className="btn btn-secondary btn-block" to="/skoly">Pokračovat do aplikace</Link>
                {!closedBeforeStart && !closedAfterEnd && (
                  <button type="button" className="btn btn-secondary btn-block" onClick={signOut}>Odhlásit se</button>
                )}
              </div>
            ) : !closedBeforeStart && !closedAfterEnd ? (
              <div className="stack">
                <BetaEnrollment role={enrollment.role} accepted={enrollment.accepted} onRole={(role) => updateEnrollment({ role })} onAccepted={(accepted) => updateEnrollment({ accepted })} />
                <button className="btn btn-primary btn-block" disabled={starting || !enrollment.role || !enrollment.accepted} onClick={continueSignup}>Vytvořit beta účet</button>
                {startError && <p role="alert">{startError}</p>}
                <p className="beta-login-link">Už účet máš? <Link to={`/prihlaseni${betaQuery}`}>Přihlásit se</Link></p>
              </div>
            ) : (
              <Link className="btn btn-secondary btn-block" to={`/prihlaseni${betaQuery}`}>
                Přihlásit se
              </Link>
            )}

            {justConfirmed && !isSignedIn && (
              <div className="notice notice-success" role="status">
                <span className="notice-title">E-mail je potvrzený</span>
                <p className="notice-text">Přihlas se a pokračuj ve svém beta účtu.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
    </>
  );
}

export default BetaLanding;
