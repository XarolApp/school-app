import BetaEnrollment from '../components/BetaEnrollment';
import { betaEnrollmentComplete, readBetaEnrollment, saveBetaEnrollment } from '../lib/betaEnrollment';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { fetchBetaSchool, startBetaVisit } from '../api';
import { normalizeBetaCode, readPendingBetaCode } from '../lib/pendingBetaCode';
import AuthTabs from '../components/AuthTabs';
import Captcha, { captchaEnabled } from '../components/Captcha';
import ConsentCheckbox from '../components/ConsentCheckbox';
import PasswordInput from '../components/PasswordInput';
import PasswordStrength from '../components/PasswordStrength';
import { trialDaysPhrase } from '../config/pricing';
import './beta.css';

function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [consent, setConsent] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [consentError, setConsentError] = useState('');
  const [showBetaErrors, setShowBetaErrors] = useState(false);
  const { signUp, isSignedIn, emailConfirmed, profileLoading, adoptStoredSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const betaParamPresent = searchParams.has('beta');
  const betaInviteProvided = betaParamPresent || Boolean(readPendingBetaCode());
  const betaCode = useMemo(() => normalizeBetaCode(
    betaParamPresent ? searchParams.get('beta') : readPendingBetaCode()
  ), [betaParamPresent, searchParams]);
  const invalidBetaInvite = betaParamPresent && !betaCode;
  const [betaEnrollment, setBetaEnrollment] = useState(() => readBetaEnrollment(betaCode));
  const betaParent=Boolean(betaCode&&['rodic','ucitel'].includes(betaEnrollment.role));
  const updateEnrollment = (patch) => {
    const next = { ...betaEnrollment, ...patch }; setBetaEnrollment(next); saveBetaEnrollment(betaCode, next);
  };
  const [betaState, setBetaState] = useState(betaCode ? 'loading' : 'none');
  const [betaSchool, setBetaSchool] = useState(null);

  useEffect(() => {
    let active = true;
    if (invalidBetaInvite) {
      setBetaState('invalid');
      setBetaSchool(null);
      return () => { active = false; };
    }
    if (!betaCode) {
      setBetaState('none');
      setBetaSchool(null);
      return () => { active = false; };
    }
    setBetaState('loading');
    fetchBetaSchool(betaCode).then((school) => {
      if (!active) return;
      if (school.code !== betaCode || typeof school.school_name !== 'string') {
        setBetaState('invalid');
        return;
      }
      setBetaSchool(school);
      setBetaState(school.programActive ? 'ready' : 'closed');
    }).catch((lookupError) => {
      if (!active) return;
      setBetaState(lookupError.status === 404 ? 'invalid' : 'unavailable');
    });
    return () => { active = false; };
  }, [betaCode, invalidBetaInvite]);

  // The confirmation link signs in from its own tab; supabase-js tells this
  // tab, and it carries on to the next screen without a second login.
  useEffect(() => {
    if (!awaitingConfirmation) return undefined;
    const onFocus = () => { void adoptStoredSession(); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [awaitingConfirmation, adoptStoredSession]);
  useEffect(() => {
    if (awaitingConfirmation && isSignedIn && emailConfirmed && !profileLoading) {
      navigate(betaCode ? `/beta/${encodeURIComponent(betaCode)}` : '/skoly', { replace: true });
    }
  }, [awaitingConfirmation, isSignedIn, emailConfirmed, profileLoading, betaCode, navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password.length < 8) {
      setError('Heslo musí mít alespoň 8 znaků.');
      return;
    }

    if (betaCode && !betaEnrollmentComplete(betaEnrollment)) {
      setShowBetaErrors(true);
      return;
    }

    if (!consent) {
      setConsentError(betaParent
        ? 'Pro vytvoření účtu potřebujeme váš souhlas s podmínkami.'
        : 'Pro vytvoření účtu potřebujeme tvůj souhlas s podmínkami.');
      return;
    }

    if (captchaEnabled && !captchaToken) {
      setError('Počkej prosím na ověření „nejsem robot“.');
      return;
    }

    if (invalidBetaInvite || (betaCode && betaState !== 'ready')) {
      setError(betaState === 'loading'
        ? 'Počkej prosím, než ověříme školní pozvánku.'
        : betaState === 'closed'
          ? 'Beta program právě nepřijímá nové účty.'
          : 'Školní pozvánku se nepodařilo ověřit. Vytvoření účtu je pozastavené.');
      return;
    }

    setSubmitting(true);
    if (betaCode) await startBetaVisit(betaCode,betaEnrollment.role,betaEnrollment.accepted).catch(()=>{});
    const result = await signUp(form.email, form.password, form.name, {
      captchaToken,
      ...(betaCode ? { betaSchoolCode: betaCode, betaRole: betaEnrollment.role, betaRoleNote: betaEnrollment.roleNote, betaNoticeAccepted: betaEnrollment.accepted } : {}),
    });
    setSubmitting(false);

    if (result.error) {
      let errorMessage = result.error;
      if (betaCode) {
        try {
          const latestInvite = await fetchBetaSchool(betaCode);
          if (!latestInvite.programActive) errorMessage = 'Beta program se mezitím uzavřel. Účet nebyl vytvořen jako běžný placený účet.';
        } catch {
          // Keep the original signup failure; never retry without beta metadata.
        }
      }
      setError(errorMessage);
      // The token is single-use; a retry needs a fresh challenge.
      setCaptchaToken(null);
      setCaptchaKey((key) => key + 1);
      return;
    }

    if (result.needsEmailConfirmation) {
      setAwaitingConfirmation(true);
      return;
    }

    navigate('/skoly', { replace: true });
  };

  if (awaitingConfirmation) {
    return (
      <>
      {betaInviteProvided && <meta name="robots" content="noindex, nofollow" />}
      <div className="page page-auth">
        <div className="auth-layout">
          <div className="notice">
            <span className="notice-title">{betaParent?'Potvrďte svůj e-mail':'Potvrď svůj e-mail'}</span>
            <p className="notice-text">
              {betaParent
                ? `Poslali jsme odkaz na ${form.email}. Klikněte na něj — otevře se v novém okně, které pak můžete zavřít.`
                : `Poslali jsme odkaz na ${form.email}. Klikni na něj — otevře se v novém okně, které pak můžeš zavřít.`}
            </p>
            <p className="notice-text email-waiting" role="status">
              <span className="btn-spinner" aria-hidden="true" />
              {betaParent ? 'Tady počkáme a po ověření budeme pokračovat sami.' : 'Tady počkáme a po ověření pokračujeme sami.'}
            </p>
            {!betaCode && (
              <p className="notice-text">Účet se aktivuje i s {trialDaysPhrase()} zkušebním obdobím. Bez potvrzení se do databáze škol nedostaneš.</p>
            )}
            <p className="notice-text">
              {betaParent?'Nepřišel? Zkontrolujte složku se spamem — odkaz umíme poslat znovu z přihlašovací stránky.':'Nepřišel? Zkontroluj složku se spamem — odkaz umíme poslat znovu z přihlašovací stránky.'}
            </p>
          </div>
          <Link to={`/prihlaseni${betaCode ? `?beta=${encodeURIComponent(betaCode)}` : ''}`} className="btn btn-secondary btn-block">
            Zpět na přihlášení
          </Link>
        </div>
      </div>
      </>
    );
  }

  return (
    <>
    {betaInviteProvided && <meta name="robots" content="noindex, nofollow" />}
    <div className={`page page-auth${betaInviteProvided ? ' beta-page' : ''}`}>
      <div className="auth-layout">
        <div className="page-header">
          <p className="eyebrow">{betaInviteProvided ? 'Školní beta program' : `${trialDaysPhrase()} zdarma`}</p>
          <h1>{betaCode && betaSchool ? `Účet pro ${betaSchool.school_name}` : betaInviteProvided ? 'Ověřit školní pozvánku' : 'Vytvořit účet'}</h1>
          <p className="lede">
            {betaInviteProvided && !betaCode
              ? 'Beta účet založíme až po ověření platné školní pozvánky.'
              : betaCode
              ? `Testování je zdarma výměnou za zpětnou vazbu. Potvrzení e-mailu je povinné; platební kartu ${betaParent?'nepotřebujete':'nepotřebuješ'} a beta účet nic nestrhne.`
              : `Vyzkoušej celou databázi škol ${trialDaysPhrase()} zdarma. Platit začneš až potom — a jen když budeš chtít pokračovat.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel panel-lg auth-form">
          <AuthTabs />
          {betaCode && <BetaEnrollment role={betaEnrollment.role} roleNote={betaEnrollment.roleNote} accepted={betaEnrollment.accepted} showErrors={showBetaErrors}
            onRole={(role) => updateEnrollment({ role })} onRoleNote={(roleNote) => updateEnrollment({ roleNote })} onAccepted={(accepted) => updateEnrollment({ accepted })} />}

          {betaCode && betaState === 'loading' && <p className="field-hint" role="status">Ověřuji pozvánku…</p>}
          {betaCode && betaState === 'closed' && (
            <div className="notice" role="status"><span className="notice-title">Beta program je uzavřený</span><p className="notice-text">Nové účty teď nepřijímáme. Pokud už beta účet máš, přihlas se.</p><Link to={`/prihlaseni?beta=${encodeURIComponent(betaCode)}`}>Přihlásit se</Link></div>
          )}
          {(invalidBetaInvite || betaState === 'invalid') && (
            <div className="notice notice-error" role="alert"><span className="notice-title">Tato školní pozvánka neplatí</span><p className="notice-text">Zkontroluj odkaz nebo požádej školu o novou pozvánku.</p></div>
          )}
          {betaCode && betaState === 'unavailable' && (
            <div className="notice notice-error" role="alert"><span className="notice-title">Pozvánku teď nejde ověřit</span><p className="notice-text">Účet můžeme vytvořit, až se podaří ověřit školní pozvánku. Zkus to prosím za chvíli.</p></div>
          )}

          {error && (
            <div className="notice notice-error" role="alert">
              <p className="notice-text">{error}</p>
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="signup-name">
              Jméno
            </label>
            <input
              id="signup-name"
              className="input"
              type="text"
              name="name"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="signup-email">
              E-mail
            </label>
            <input
              id="signup-email"
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <span className="field-hint">
              Pošleme na něj potvrzovací odkaz, tak ať nemá překlep.
            </span>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="signup-password">
              Heslo
            </label>
            <PasswordInput
              id="signup-password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={handleChange}
              required
            />
            {form.password ? (
              <PasswordStrength password={form.password} />
            ) : (
              <span className="field-hint">Alespoň 8 znaků.</span>
            )}
          </div>

          <ConsentCheckbox id="signup-consent" checked={consent} adult={betaParent} error={consentError}
            onChange={(value) => { setConsent(value); if (value) setConsentError(''); }} />

          <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting || (betaCode && betaState !== 'ready') || invalidBetaInvite}
          >
            {submitting && <span className="btn-spinner" aria-hidden="true" />}
            {submitting ? 'Vytvářím účet…' : betaCode ? 'Vytvořit beta účet' : betaInviteProvided ? 'Pozvánku nelze ověřit' : `Začít ${trialDaysPhrase()} zdarma`}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}

export default SignUp;
