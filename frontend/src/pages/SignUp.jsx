import BetaEnrollment from '../components/BetaEnrollment';
import { betaEnrollmentComplete, readBetaEnrollment, saveBetaEnrollment } from '../lib/betaEnrollment';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import ConfirmEmailWaiting from '../components/ConfirmEmailWaiting';
import { confirmationUrl } from '../components/AuthContext';
import { readPendingConfirmation, clearPendingConfirmation } from '../lib/pendingConfirmation';
import {
  captchaProblem, consentProblem, emailProblem, focusFirstInvalid, problemSummary, nameProblem, onlyProblems, passwordProblem,
} from '../lib/authValidation';
import './beta.css';

function FieldError({ id, message }) {
  return message ? <span className="field-error" id={id} role="alert">{message}</span> : null;
}

function SignUp() {
  // A reload on the "check your inbox" screen returns there, not to an empty form.
  const [resumed] = useState(() => readPendingConfirmation('signup'));
  const [form, setForm] = useState({ name: '', email: resumed?.email || '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(Boolean(resumed));
  const [userId, setUserId] = useState(resumed?.userId || null);
  const [submitted, setSubmitted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [consent, setConsent] = useState(false);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const betaParamPresent = searchParams.has('beta');
  const [pendingBetaCode] = useState(() => readPendingBetaCode());
  const configuredBetaCode = import.meta.env.VITE_BETA_SCHOOL_CODE || null;
  const betaInviteProvided = betaParamPresent || Boolean(pendingBetaCode) || Boolean(configuredBetaCode);
  const betaCode = useMemo(() => normalizeBetaCode(
    betaParamPresent ? searchParams.get('beta') : pendingBetaCode || configuredBetaCode
  ), [betaParamPresent, pendingBetaCode, configuredBetaCode, searchParams]);
  const invalidBetaInvite = betaInviteProvided && !betaCode;
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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Every problem is computed on each render once the person has pressed the
  // button, so all of them show together and each clears the moment it is fixed.
  const problems = submitted ? onlyProblems({
    name: nameProblem(form.name, betaParent),
    email: emailProblem(form.email, betaParent),
    password: passwordProblem(form.password, { parent: betaParent }),
    consent: consentProblem(consent, betaParent),
    captcha: captchaProblem(captchaToken, captchaEnabled, betaParent),
  }) : {};
  const betaIncomplete = Boolean(betaCode && !betaEnrollmentComplete(betaEnrollment));
  // One count per message actually shown, so the summary never disagrees with the list.
  const betaProblemCount = !betaCode ? 0
    : (betaEnrollment.role ? 0 : 1) + (betaEnrollment.role === 'jine' && !betaEnrollment.roleNote.trim() ? 1 : 0) + (betaEnrollment.accepted ? 0 : 1);
  const problemCount = Object.keys(problems).length + (submitted ? betaProblemCount : 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitted(true);

    const blocking = onlyProblems({
      name: nameProblem(form.name, betaParent),
      email: emailProblem(form.email, betaParent),
      password: passwordProblem(form.password, { parent: betaParent }),
      consent: consentProblem(consent, betaParent),
      captcha: captchaProblem(captchaToken, captchaEnabled, betaParent),
    });
    if (Object.keys(blocking).length || betaIncomplete) {
      requestAnimationFrame(() => focusFirstInvalid());
      return;
    }

    if (invalidBetaInvite || (betaCode && betaState !== 'ready')) {
      setError(betaState === 'loading'
        ? 'Počkej prosím, než ověříme testovací přístup.'
        : betaState === 'closed'
          ? 'Beta program právě nepřijímá nové účty.'
          : 'Testovací přístup se nepodařilo ověřit. Vytvoření účtu je pozastavené.');
      return;
    }

    setSubmitting(true);
    if (betaCode) await startBetaVisit(betaCode,betaEnrollment.role,betaEnrollment.accepted).catch(()=>{});
    const result = await signUp(form.email.trim(), form.password, form.name.trim(), {
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
      setUserId(result.userId);
      setAwaitingConfirmation(true);
      return;
    }

    navigate('/skoly', { replace: true });
  };

  const confirmedCode = betaCode || resumed?.betaCode || null;
  const goAfterConfirm = useCallback(() => {
    navigate(confirmedCode ? `/beta/${encodeURIComponent(confirmedCode)}` : '/skoly', { replace: true });
  }, [navigate, confirmedCode]);

  if (awaitingConfirmation) {
    return (
      <>
      {betaInviteProvided && <meta name="robots" content="noindex, nofollow" />}
      <div className="page page-auth">
        <div className="auth-layout">
          <ConfirmEmailWaiting
            email={form.email.trim()}
            password={form.password}
            userId={userId}
            parent={betaParent || Boolean(resumed?.parent)}
            betaCode={confirmedCode}
            emailRedirectTo={confirmationUrl(confirmedCode)}
            onConfirmed={goAfterConfirm}
            onChangeEmail={() => setAwaitingConfirmation(false)}
          >
            {!confirmedCode && (
              <p className="notice-text">Účet se aktivuje i s {trialDaysPhrase()} zkušebním obdobím. Bez potvrzení se do databáze škol nedostaneš.</p>
            )}
          </ConfirmEmailWaiting>
          <Link to={`/prihlaseni${confirmedCode ? `?beta=${encodeURIComponent(confirmedCode)}` : ''}`} className="btn btn-ghost btn-block" onClick={clearPendingConfirmation}>
            Už mám účet — přihlásit se
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
          <h1>{betaCode && betaSchool ? 'Vytvořit testovací účet' : betaInviteProvided ? 'Ověřuji testovací přístup' : 'Vytvořit účet'}</h1>
          <p className="lede">
            {betaInviteProvided && !betaCode
              ? 'Testovací účet založíme, až ověříme přístupový kód.'
              : betaCode
              ? `Testování je zdarma výměnou za zpětnou vazbu. Potvrzení e-mailu je povinné; platební kartu ${betaParent?'nepotřebujete':'nepotřebuješ'} a beta účet nic nestrhne.`
              : `Vyzkoušej celou databázi škol ${trialDaysPhrase()} zdarma. Platit začneš až potom — a jen když budeš chtít pokračovat.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel panel-lg auth-form" noValidate>
          <AuthTabs />
          {problemCount > 0 && (
            <div className="notice notice-error" role="alert">
              <p className="notice-text">{problemSummary(problemCount, betaParent)}</p>
            </div>
          )}
          {betaCode && <BetaEnrollment role={betaEnrollment.role} roleNote={betaEnrollment.roleNote} accepted={betaEnrollment.accepted} showErrors={submitted}
            onRole={(role) => updateEnrollment({ role })} onRoleNote={(roleNote) => updateEnrollment({ roleNote })} onAccepted={(accepted) => updateEnrollment({ accepted })} />}

          {betaCode && betaState === 'loading' && <p className="field-hint" role="status">Ověřuji přístup…</p>}
          {betaCode && betaState === 'closed' && (
            <div className="notice" role="status"><span className="notice-title">Beta program je uzavřený</span><p className="notice-text">Nové účty teď nepřijímáme. Pokud už beta účet máš, přihlas se.</p><Link to={`/prihlaseni?beta=${encodeURIComponent(betaCode)}`}>Přihlásit se</Link></div>
          )}
          {(invalidBetaInvite || betaState === 'invalid') && (
            <div className="notice notice-error" role="alert"><span className="notice-title">Přístupový kód neplatí</span><p className="notice-text">Zkontroluj kód v e-mailu od školy.</p></div>
          )}
          {betaCode && betaState === 'unavailable' && (
            <div className="notice notice-error" role="alert"><span className="notice-title">Přístup teď nejde ověřit</span><p className="notice-text">Účet můžeme vytvořit, až se podaří ověřit testovací přístup. Zkus to prosím za chvíli.</p></div>
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
              aria-invalid={Boolean(problems.name)}
              aria-describedby={problems.name ? 'signup-name-error' : undefined}
            />
            <FieldError id="signup-name-error" message={problems.name} />
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
              aria-invalid={Boolean(problems.email)}
              aria-describedby={problems.email ? 'signup-email-error' : undefined}
            />
            <FieldError id="signup-email-error" message={problems.email} />
            {!problems.email && (
              <span className="field-hint">
                Pošleme na něj potvrzovací odkaz, tak ať nemá překlep.
              </span>
            )}
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
              aria-invalid={Boolean(problems.password)}
              aria-describedby={problems.password ? 'signup-password-error' : undefined}
            />
            <FieldError id="signup-password-error" message={problems.password} />
            {form.password ? (
              <PasswordStrength password={form.password} />
            ) : (
              <span className="field-hint">Alespoň 8 znaků.</span>
            )}
          </div>

          <ConsentCheckbox id="signup-consent" checked={consent} adult={betaParent} error={problems.consent} onChange={setConsent} />

          <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />
          <FieldError id="signup-captcha-error" message={problems.captcha} />

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting || (betaCode && betaState !== 'ready') || invalidBetaInvite}
          >
            {submitting && <span className="btn-spinner" aria-hidden="true" />}
            {submitting ? 'Vytvářím účet…' : betaCode ? 'Vytvořit beta účet' : betaInviteProvided ? 'Přístup nelze ověřit' : `Začít ${trialDaysPhrase()} zdarma`}
          </button>
        </form>
      </div>
    </div>
    </>
  );
}

export default SignUp;
