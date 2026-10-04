import BetaEnrollment from '../components/BetaEnrollment';
import { readBetaEnrollment, saveBetaEnrollment } from '../lib/betaEnrollment';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { fetchBetaSchool } from '../api';
import { normalizeBetaCode, readPendingBetaCode } from '../lib/pendingBetaCode';
import AuthTabs from '../components/AuthTabs';
import Captcha, { captchaEnabled } from '../components/Captcha';
import ConsentCheckbox from '../components/ConsentCheckbox';
import PasswordInput from '../components/PasswordInput';
import PasswordStrength from '../components/PasswordStrength';
import { trialDaysPhrase } from '../config/pricing';

function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [consent, setConsent] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const betaParamPresent = searchParams.has('beta');
  const betaInviteProvided = betaParamPresent || Boolean(readPendingBetaCode());
  const betaCode = useMemo(() => normalizeBetaCode(
    betaParamPresent ? searchParams.get('beta') : readPendingBetaCode()
  ), [betaParamPresent, searchParams]);
  const invalidBetaInvite = betaParamPresent && !betaCode;
  const [betaEnrollment, setBetaEnrollment] = useState(() => readBetaEnrollment(betaCode));
  const updateEnrollment = (patch) => {
    const next = { ...betaEnrollment, ...patch }; setBetaEnrollment(next); saveBetaEnrollment(betaCode, next.role, next.accepted);
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

    if (!consent) {
      setError('Potvrď prosím věk a souhlas s podmínkami.');
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

    if (betaCode && (!betaEnrollment.role || !betaEnrollment.accepted)) { setError('Vyber prosím roli a potvrď seznámení s beta testováním.'); return; }
    setSubmitting(true);
    const result = await signUp(form.email, form.password, form.name, {
      captchaToken,
      ...(betaCode ? { betaSchoolCode: betaCode, betaRole: betaEnrollment.role, betaNoticeAccepted: betaEnrollment.accepted } : {}),
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
            <span className="notice-title">Potvrď svůj e-mail</span>
            <p className="notice-text">
              {betaCode
                ? `Poslali jsme odkaz na ${form.email}. Potvrzení e-mailu je povinné pro beta účet; odkaz tě vrátí k pozvánce od školy.`
                : `Poslali jsme odkaz na ${form.email}. Klikni na něj a účet se aktivuje i s tvým ${trialDaysPhrase()} zkušebním obdobím. Bez potvrzení se do databáze škol nedostaneš.`}
            </p>
            <p className="notice-text">
              Nepřišel? Zkontroluj složku se spamem — odkaz umíme poslat znovu
              z přihlašovací stránky.
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
    <div className="page page-auth">
      <div className="auth-layout">
        <div className="page-header">
          <p className="eyebrow">{betaInviteProvided ? 'Školní beta program' : `${trialDaysPhrase()} zdarma`}</p>
          <h1>{betaCode && betaSchool ? `Účet pro ${betaSchool.school_name}` : betaInviteProvided ? 'Ověřit školní pozvánku' : 'Vytvořit účet'}</h1>
          <p className="lede">
            {betaInviteProvided && !betaCode
              ? 'Beta účet založíme až po ověření platné školní pozvánky.'
              : betaCode
              ? `Testovací přístup trvá ${betaSchool?.accessHours || 48} hodin. Potvrzení e-mailu je povinné; platební kartu nepotřebuješ a beta účet nic nestrhne.`
              : `Vyzkoušej celou databázi škol ${trialDaysPhrase()} zdarma. Platit začneš až potom — a jen když budeš chtít pokračovat.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel panel-lg auth-form">
          <AuthTabs />
          {betaCode && <BetaEnrollment role={betaEnrollment.role} accepted={betaEnrollment.accepted} onRole={(role) => updateEnrollment({ role })} onAccepted={(accepted) => updateEnrollment({ accepted })} />}

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

          <ConsentCheckbox id="signup-consent" checked={consent} onChange={setConsent} />

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
