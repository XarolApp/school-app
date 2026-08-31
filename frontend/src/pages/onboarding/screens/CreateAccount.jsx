import { useState } from 'react';
import { ObScreen } from '../../../components/onboarding/ObKit';
import { useOnboarding } from '../useOnboarding';
import { useAuth } from '../../../components/AuthContext';
import PasswordInput from '../../../components/PasswordInput';
import PasswordStrength from '../../../components/PasswordStrength';
import Captcha, { captchaEnabled } from '../../../components/Captcha';

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
 * Quiz answers stay in sessionStorage and are NOT sent here. Nothing about a
 * minor is written to Supabase during onboarding beyond the account itself.
 */
function CreateAccount() {
  const { role, ranked, goNext, goBack, progress } = useOnboarding();
  const matchCount = ranked?.length || 0;
  const { signUp } = useAuth();
  const parent = role === 'parent';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  // A Turnstile token is single-use, so the widget is re-challenged after every
  // failed submit.
  const [captchaKey, setCaptchaKey] = useState(0);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setError(null);

    const result = await signUp(email, password, name, { captchaToken });

    setBusy(false);
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);

    if (result.error) {
      setError(result.error);
      return;
    }

    // With email confirmation on, Supabase issues no session until the link is
    // clicked — so the flow cannot simply continue to the paywall.
    if (result.needsEmailConfirmation) {
      setSent(true);
      return;
    }

    goNext();
  };

  if (sent) {
    return (
      <ObScreen progress={progress}>
        <h1 className="ob-title">Potvrď e-mail</h1>
        <p className="ob-hint">
          Poslali jsme {parent ? 'vám' : 'ti'} odkaz na <strong>{email}</strong>. Klikni
          na něj a {parent ? 'můžete' : 'můžeš'} pokračovat — tvoje odpovědi zůstanou
          uložené.
        </p>
      </ObScreen>
    );
  }

  return (
    <ObScreen
      onBack={goBack}
      progress={progress}
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

        <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />
      </form>
    </ObScreen>
  );
}

export default CreateAccount;
