import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';
import { useAuth } from '../../../components/AuthContext';
import PasswordInput from '../../../components/PasswordInput';
import PasswordStrength from '../../../components/PasswordStrength';
import Captcha, { captchaEnabled } from '../../../components/Captcha';
import ConsentCheckbox from '../../../components/ConsentCheckbox';
import { stashOnboardingAnswers } from '../../../lib/pendingOnboardingAnswers';

/**
 * Account creation, inside the flow.
 *
 * This is the canonical signup path for ŠkolaMatch — the standalone
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
 * Quiz answers stay in sessionStorage through the whole quiz and are not sent
 * here directly — on successful signup they are stashed in localStorage
 * (lib/pendingOnboardingAnswers.js) and saved to the account only once this
 * browser sees a CONFIRMED session for this same email (AuthContext's flush).
 * Nothing about a minor reaches Supabase before that point.
 */
function CreateAccount() {
  const { role, ranked, cleanedAnswers, goNext, goBack, phase } = useOnboarding();
  const matchCount = ranked?.length || 0;
  const { signUp } = useAuth();
  const parent = role === 'parent';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [consent, setConsent] = useState(false);
  // A Turnstile token is single-use, so the widget is re-challenged after every
  // failed submit.
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    const resumePath = '/onboarding/plan';
    const confirmationUrl = new URL('/prihlaseni', window.location.origin);
    confirmationUrl.searchParams.set('potvrzeno', '1');
    confirmationUrl.searchParams.set('next', resumePath);
    const result = await signUp(email, password, name, {
      captchaToken,
      emailRedirectTo: confirmationUrl.toString(),
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
    if (Object.keys(cleanedAnswers || {}).length) {
      stashOnboardingAnswers(cleanedAnswers, email);
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
      <ObScreen onBack={() => setAwaitingConfirmation(false)} phase={phase}>
        <h1 className="ob-title">Potvrď svůj e-mail</h1>
        <div className="notice">
          <span className="notice-title">Odkaz jsme poslali na {email}</span>
          <p className="notice-text">
            Klikni na něj a potom se přihlas. Vrátíme tě rovnou k výběru plánu;
            bez potvrzeného účtu platbu nespustíme.
          </p>
          <p className="notice-text">
            Když zprávu nevidíš, zkontroluj spam. Nový odkaz můžeš poslat z
            přihlašovací stránky.
          </p>
        </div>
        <Link to="/prihlaseni?next=/onboarding/plan" className="ob-btn ob-btn-secondary">
          Přejít na přihlášení
        </Link>
      </ObScreen>
    );
  }

  return (
    <ObScreen
      onBack={goBack}
      phase={phase}
      actions={
        <button
          type="submit"
          form="ob-signup"
          className="ob-btn ob-btn-primary"
          disabled={busy || (captchaEnabled && !captchaToken)}
        >
          {busy ? 'Zakládám účet…' : 'Založit účet'}
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
            : `Právě jsme ti seřadili ${matchCount} škol podle toho, cos odpověděl/a. Založ si účet, ať ti výsledek zůstane a nemusíš dotazník vyplňovat znovu.`
          : parent
            ? 'Založte si účet, ať vám výsledek zůstane a nemusíte dotazník vyplňovat znovu.'
            : 'Založ si účet, ať ti výsledek zůstane a nemusíš dotazník vyplňovat znovu.'}
      </p>

      <form id="ob-signup" className="auth-form" onSubmit={submit}>
        {error && (
          <div className="notice notice-error" role="alert">
            <span className="notice-title">Účet se nepodařilo založit</span>
            <p className="notice-text">{error}</p>
          </div>
        )}

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
          />
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
          />
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
          />
          <PasswordStrength password={password} />
        </div>

        <ConsentCheckbox id="signup-consent" checked={consent} onChange={setConsent} />

        <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />
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
