import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ObScreen } from '../../../components/onboarding/ObKit';
import TopMatchCard from '../../../components/onboarding/TopMatchCard';
import { useOnboarding } from '../useOnboarding';
import ConfirmEmailWaiting from '../../../components/ConfirmEmailWaiting';
import { confirmationUrl } from '../../../components/AuthContext';
import { readPendingConfirmation, clearPendingConfirmation } from '../../../lib/pendingConfirmation';
import { captchaProblem, consentProblem, emailProblem, focusFirstInvalid, problemSummary, nameProblem, onlyProblems, passwordProblem } from '../../../lib/authValidation';
import { useAuth } from '../../../components/AuthContext';
import { useG } from '../../../lib/gender';
import PasswordInput from '../../../components/PasswordInput';
import PasswordStrength from '../../../components/PasswordStrength';
import Captcha, { captchaEnabled } from '../../../components/Captcha';
import ConsentCheckbox from '../../../components/ConsentCheckbox';
import { stashOnboardingAnswers } from '../../../lib/pendingOnboardingAnswers';
import BetaEnrollment from '../../../components/BetaEnrollment';
import { betaEnrollmentComplete, readBetaEnrollment, saveBetaEnrollment } from '../../../lib/betaEnrollment';
import { normalizeBetaCode } from '../../../lib/pendingBetaCode';
import { fetchBetaSchool, startBetaVisit } from '../../../api';

/**
 * Account creation, inside the flow.
 *
 * This is the canonical signup path for Střední na míru — the standalone
 * /registrace page exists only for direct links and returning users. It sits
 * immediately before the paywall because the trial window is opened by a
 * database trigger on account creation, so there has to be an account before
 * there is anything to charge.
 *
 * Copy is framed as CLAIMING the results that already exist (the ranked list
 * from Reveal), not as a generic "make an account" pitch — confirmed pattern
 * from the Mobbin onboarding research (docs/sources/mobbin_pattern_survey.md,
 * .claude/skills/mobbin-onboarding-patterns/SKILL.md): "does account creation
 * come after the artefact exists, framed as claiming it?". The anti-pattern
 * on the other side is signup before any value is shown — Noom asks for
 * email+password before a single question, "spending all the goodwill before
 * earning any". This screen sits well past that: quiz, reveal, summary,
 * commitment and social proof all come first.
 *
 * Normal signup keeps quiz answers in sessionStorage, then stashes them in
 * localStorage until this browser sees a CONFIRMED session for that same
 * email. Signed-in beta testers bypass signup and save their completed quiz
 * at the final-question transition in OnboardingFlow.
 */
function CreateAccount() {
  const {
    role,
    gender,
    ranked,
    cleanedAnswers,
    goNext,
    goBack,
    phase,
    isTester,
    profileResolved,
    profileError,
    refreshProfile,
    startBetaPreview,
    leaveBetaPreview,
  } = useOnboarding();
  const matchCount = ranked?.length || 0;
  const { signUp, isSignedIn, user } = useAuth();
  const g = useG();
  const parent = role === 'parent';

  const [resumed] = useState(() => readPendingConfirmation('ob'));
  const configuredBetaCode = import.meta.env.VITE_BETA_SCHOOL_CODE || resumed?.betaCode || '';
  const betaCode = normalizeBetaCode(configuredBetaCode);
  const [betaEnrollment, setBetaEnrollment] = useState(() => readBetaEnrollment(betaCode));
  const [betaSchool, setBetaSchool] = useState(null);
  const [betaState, setBetaState] = useState(configuredBetaCode ? (betaCode ? 'loading' : 'invalid') : 'none');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(resumed?.email || '');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // A Turnstile token is single-use, so the widget is re-challenged after every
  // failed submit.
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(Boolean(resumed));

  useEffect(() => {
    if (!betaCode) return undefined;
    let active = true;
    setBetaState('loading');
    fetchBetaSchool(betaCode).then((school) => {
      if (!active) return;
      if (school.code !== betaCode || typeof school.school_name !== 'string') {
        setBetaState('invalid');
        return;
      }
      setBetaSchool(school);
      setBetaState(school.programActive ? 'ready' : 'closed');
    }).catch((fetchError) => {
      if (!active) return;
      setBetaState(fetchError.status === 404 ? 'invalid' : 'unavailable');
    });
    return () => { active = false; };
  }, [betaCode]);

  const updateEnrollment = (patch) => {
    const next = { ...betaEnrollment, ...patch };
    setBetaEnrollment(next);
    saveBetaEnrollment(betaCode, next);
  };

  // Wait for the signed-in account to resolve before ever showing signup.
  if (isSignedIn && user && !profileResolved) {
    return (
      <ObScreen chrome={false}>
        <h1 className="ob-title">Ověřujeme účet</h1>
        <p className="ob-hint">
          {profileError
            ? (parent ? 'Účet se nepodařilo ověřit. Před pokračováním načtěte profil znovu.' : 'Účet se nepodařilo ověřit. Před pokračováním načti profil znovu.')
            : (parent ? 'Chvilku prosím počkejte, než ověříme účet.' : 'Chvilku prosím počkej, než ověříme účet.')}
        </p>
        {profileError && (
          <button type="button" className="ob-btn ob-btn-secondary" onClick={refreshProfile}>
            Zkusit znovu
          </button>
        )}
      </ObScreen>
    );
  }

  // A tester already has a confirmed account. Never invite them to create a
  // second one if this step is opened directly or the preview marker is lost.
  if (isTester && isSignedIn && user) {
    return (
      <ObScreen chrome={false}>
        <h1 className="ob-title">{parent ? 'Už máte tester účet' : 'Už máš tester účet'}</h1>
        <p className="ob-hint">
          {parent
            ? 'Nový účet nepotřebujete. Můžete pokračovat s tímto účtem, bez platby.'
            : 'Nový účet nepotřebuješ. Můžeš pokračovat s tímto účtem, bez platby.'}
        </p>
        <div className="ob-actions">
          <button
            type="button"
            className="ob-btn ob-btn-primary"
            disabled={!profileResolved}
            onClick={() => startBetaPreview('plan')}
          >
            Prohlédnout si ukázku
          </button>
          <button type="button" className="ob-btn ob-btn-secondary" onClick={leaveBetaPreview}>
            Pokračovat v testování
          </button>
        </div>
      </ObScreen>
    );
  }

  // The link opens a new tab on "e-mail ověřen"; this tab continues by itself.
  const confirmUrl = confirmationUrl(betaCode, '/onboarding/plan');
  const currentProblems = () => onlyProblems({
    name: nameProblem(name, parent),
    email: emailProblem(email, parent),
    password: passwordProblem(password, { parent }),
    consent: consentProblem(consent, parent),
    captcha: captchaProblem(captchaToken, captchaEnabled, parent),
  });
  const problems = submitted ? currentProblems() : {};
  const betaIncomplete = Boolean(betaCode && !betaEnrollmentComplete(betaEnrollment));
  const betaProblemCount = !betaCode ? 0
    : (betaEnrollment.role ? 0 : 1) + (betaEnrollment.role === 'jine' && !betaEnrollment.roleNote.trim() ? 1 : 0) + (betaEnrollment.accepted ? 0 : 1);
  const problemCount = Object.keys(problems).length + (submitted ? betaProblemCount : 0);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setSubmitted(true);
    if (Object.keys(currentProblems()).length || betaIncomplete) {
      requestAnimationFrame(() => focusFirstInvalid());
      return;
    }

    if (configuredBetaCode && !betaCode) {
      setError('Školní kód bety není platný. Zkus to prosím později znovu.');
      return;
    }
    if (betaCode && betaState !== 'ready') {
      setError(betaState === 'closed'
        ? 'Beta program teď nové účty nepřijímá.'
        : 'Testovací přístup se nepodařilo ověřit. Účet teď nejde založit.');
      return;
    }

    setBusy(true);
    setError(null);

    if (betaCode) {
      try {
        await startBetaVisit(betaCode, betaEnrollment.role, betaEnrollment.accepted);
      } catch {
        setBusy(false);
        setError(parent ? 'Přístup se nepodařilo připravit. Zkuste to znovu.' : 'Přístup se nepodařilo připravit. Zkus to znovu.');
        return;
      }
    }

    const result = await signUp(email.trim(), password, name.trim(), {
      captchaToken,
      emailRedirectTo: confirmationUrl(betaCode, '/onboarding/plan'),
      ...(betaCode ? {
        betaSchoolCode: betaCode,
        betaRole: betaEnrollment.role,
        betaRoleNote: betaEnrollment.roleNote,
        betaNoticeAccepted: betaEnrollment.accepted,
      } : {}),
    });

    setBusy(false);
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Answers are stashed locally, not sent anywhere yet: there is no session
    // until the confirmation link is clicked, and that link usually opens in
    // a different tab/device than this one (see lib/pendingOnboardingAnswers.js).
    // AuthContext flushes this stash to the server the next time this browser
    // sees a confirmed session for this same email.
    if (Object.keys(cleanedAnswers || {}).length || (role !== 'parent' && (gender === 'm' || gender === 'f'))) {
      stashOnboardingAnswers(cleanedAnswers || {}, email, role === 'parent' ? null : gender);
    }

    // Real checkout requires a confirmed Supabase session. Advancing without
    // one strands the user at the payment button with a 401, so pause here.
    // The confirmation link carries a validated internal continuation through
    // Login and returns this browser to plan selection after sign-in.
    if (result.needsEmailConfirmation) {
      setAwaitingConfirmation(true);
      return;
    }

    goNext();
  };

  if (awaitingConfirmation) {
    return (
      <ObScreen onBack={() => { clearPendingConfirmation(); setAwaitingConfirmation(false); }} phase={phase}>
        <h1 className="ob-title">{parent ? 'Potvrďte svůj e-mail' : 'Potvrď svůj e-mail'}</h1>
        <ConfirmEmailWaiting
          variant="ob"
          source="ob"
          email={email.trim()}
          parent={parent}
          betaCode={betaCode}
          emailRedirectTo={confirmUrl}
          onConfirmed={goNext}
          onChangeEmail={() => setAwaitingConfirmation(false)}
        >
          <p className="notice-text">
            {parent
              ? 'Hned potom vás vrátíme k výběru plánu. Bez potvrzeného účtu platbu nespustíme.'
              : 'Hned potom tě vrátíme k výběru plánu. Bez potvrzeného účtu platbu nespustíme.'}
          </p>
        </ConfirmEmailWaiting>
        <Link to="/prihlaseni?next=/onboarding/plan" className="ob-inline-link" onClick={clearPendingConfirmation}>
          {parent ? 'Už máte účet? Přihlásit se' : 'Už máš účet? Přihlásit se'}
        </Link>
      </ObScreen>
    );
  }

  // Desktop side panel: the result being saved, so signup reads as claiming
  // something that already exists rather than as a gate.
  const saved = (
    <TopMatchCard
      result={ranked?.[0]}
      answers={cleanedAnswers}
      role={role}
      label={parent ? 'Tohle si uložíte' : 'Tohle si uložíš'}
      footer={
        <ul className="ob-tm-list">
          <li>{parent ? `Celé pořadí ${matchCount} škol s důvody` : `Celé pořadí ${matchCount} škol s důvody`}</li>
          <li>{parent ? 'Odpovědi, abyste je nemuseli vyplňovat znovu' : 'Tvoje odpovědi, ať je nemusíš vyplňovat znovu'}</li>
          <li>Porovnání škol a plán přihlášek</li>
        </ul>
      }
    />
  );

  return (
    <ObScreen
      onBack={goBack}
      phase={phase}
      login={false}
      center
      asideVariant="showcase"
      aside={saved}
      actions={
        <button
          type="submit"
          form="ob-signup"
          className="ob-btn ob-btn-primary"
          disabled={busy || Boolean(betaCode && betaState !== 'ready') || Boolean(configuredBetaCode && !betaCode)}
        >
          {busy ? 'Zakládám účet…' : betaCode ? 'Založit beta účet' : 'Založit účet'}
        </button>
      }
    >
      <h1 className="ob-title">
        {parent ? 'Uložte si svůj výběr škol' : 'Ulož si svůj výběr škol'}
      </h1>
      <p className="ob-hint">
        {matchCount > 0
          ? parent
            ? `Právě jsme vám seřadili ${matchCount} škol podle toho, co jste odpověděli. Založte si účet, ať vám výsledek zůstane a nemusíte dotazník vyplňovat znovu.`
            : `Právě jsme ti seřadili ${matchCount} škol podle toho, cos ${g('odpověděl', 'odpověděla')}. Založ si účet, ať ti výsledek zůstane a nemusíš dotazník vyplňovat znovu.`
          : parent
            ? 'Založte si účet, ať vám výsledek zůstane a nemusíte dotazník vyplňovat znovu.'
            : 'Založ si účet, ať ti výsledek zůstane a nemusíš dotazník vyplňovat znovu.'}
      </p>

      <form id="ob-signup" className="auth-form" onSubmit={submit} noValidate>
        {problemCount > 0 && (
          <div className="notice notice-error" role="alert">
            <p className="notice-text">{problemSummary(problemCount, parent)}</p>
          </div>
        )}
        {parent && (
          <div className="notice">
            <span className="notice-title">Tip</span>
            <p className="notice-text">
              Doporučujeme založit účet na jméno a e-mail vašeho dítěte — aplikaci bude nejspíš používat hlavně ono. Za přístup pak můžete zaplatit vy.
            </p>
          </div>
        )}
        {error && (
          <div className="notice notice-error" role="alert">
            <span className="notice-title">Účet se nepodařilo založit</span>
            <p className="notice-text">{error}</p>
          </div>
        )}

        {configuredBetaCode && !betaCode && <p className="field-error" role="alert">Školní kód bety není platný. Účet teď nejde založit.</p>}

        {betaCode && <>
          <div className="notice">
            <span className="notice-title">Testování Střední na míru</span>
            <p className="notice-text">Testování je zdarma výměnou za zpětnou vazbu. Platební kartu nepotřebuješ a beta účet nic nestrhne.</p>
          </div>
          <BetaEnrollment
            role={betaEnrollment.role}
            roleNote={betaEnrollment.roleNote}
            accepted={betaEnrollment.accepted}
            showErrors={submitted}
            onRole={(nextRole) => updateEnrollment({ role: nextRole })}
            onRoleNote={(roleNote) => updateEnrollment({ roleNote })}
            onAccepted={(accepted) => updateEnrollment({ accepted })}
          />
          {betaState === 'loading' && <p className="field-hint" role="status">Ověřuji testovací přístup…</p>}
          {betaState === 'closed' && <p className="field-hint" role="status">Beta program teď nové účty nepřijímá.</p>}
          {(betaState === 'invalid' || betaState === 'unavailable') && <p className="field-error" role="alert">Testovací přístup se nepodařilo ověřit. Účet teď nejde založit.</p>}
        </>}

        <div className="field">
          <label className="field-label" htmlFor="ob-name">
            Jméno
          </label>
          <input
            id="ob-name"
            className="input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            aria-invalid={Boolean(problems.name)}
          />
          {problems.name && <span className="field-error" role="alert">{problems.name}</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ob-email">
            E-mail
          </label>
          <input
            id="ob-email"
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            aria-invalid={Boolean(problems.email)}
          />
          {problems.email && <span className="field-error" role="alert">{problems.email}</span>}
        </div>

        <div className="field">
          <label className="field-label" htmlFor="ob-password">
            Heslo
          </label>
          <PasswordInput
            id="ob-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            visibleLabel="Heslo"
            aria-invalid={Boolean(problems.password)}
          />
          {problems.password && <span className="field-error" role="alert">{problems.password}</span>}
          <PasswordStrength password={password} />
        </div>

        <ConsentCheckbox id="signup-consent" checked={consent} adult={parent} error={problems.consent} onChange={setConsent} />

        <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />
        {problems.captcha && <span className="field-error" role="alert">{problems.captcha}</span>}
      </form>

      <p className="ob-microcopy ob-signin-hint">
        {parent ? 'Už máte účet?' : 'Už máš účet?'}{' '}
        <Link to="/prihlaseni" className="ob-inline-link">
          Přihlásit se
        </Link>
      </p>
    </ObScreen>
  );
}

export default CreateAccount;
