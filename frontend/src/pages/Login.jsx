import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import Captcha, { captchaEnabled } from '../components/Captcha';
import PasswordInput from '../components/PasswordInput';
import { getRememberMe } from '../supabaseClient';
import { normalizeBetaCode } from '../lib/pendingBetaCode';

function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [remember, setRemember] = useState(getRememberMe);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resent, setResent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { signIn, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const requestedDestination = searchParams.get('next');
  const betaCode = normalizeBetaCode(searchParams.get('beta'));
  const safeDestination =
    requestedDestination?.startsWith('/') && !requestedDestination.startsWith('//')
      ? requestedDestination
      : null;
  const destination = location.state?.from?.pathname || safeDestination ||
    (betaCode ? `/beta/${encodeURIComponent(betaCode)}` : '/skoly');
  const justConfirmed = searchParams.get('potvrzeno') === '1';

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // A Turnstile token is spent once it is submitted, so any failed attempt has
  // to re-challenge before the user can try again.
  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setNeedsConfirmation(false);

    if (captchaEnabled && !captchaToken) {
      setError('Počkej prosím na ověření „nejsem robot“.');
      return;
    }

    setSubmitting(true);
    const result = await signIn(form.email, form.password, {
      captchaToken,
      remember,
    });
    setSubmitting(false);

    if (result.error) {
      // Supabase returns the same failure for a wrong password and an unknown
      // email on purpose — telling them apart would reveal which addresses
      // have accounts. Other cases (unconfirmed email, rate limit) are worth
      // naming, so the translated message is shown as-is.
      setError(result.error);
      setNeedsConfirmation(Boolean(result.needsEmailConfirmation));
      resetCaptcha();
      return;
    }

    navigate(destination, { replace: true });
  };

  const handleResend = async () => {
    setResent(false);

    // The failed sign-in that revealed this button also spent the token, and
    // the widget needs a moment to re-challenge.
    if (captchaEnabled && !captchaToken) {
      setError('Počkej prosím na ověření „nejsem robot“ a zkus to znovu.');
      return;
    }

    const result = await resendConfirmation(form.email, {
      captchaToken,
      ...(betaCode ? { betaSchoolCode: betaCode } : {}),
    });
    resetCaptcha();

    if (result.error) {
      setError(result.error);
      return;
    }

    setError(null);
    setNeedsConfirmation(false);
    setResent(true);
  };

  return (
    <>
    {betaCode && <meta name="robots" content="noindex, nofollow" />}
    <div className="page page-auth">
      <div className="auth-layout">
        <div className="page-header">
          <p className="eyebrow">{betaCode ? 'Školní beta program' : 'Vítej zpátky'}</p>
          <h1>{betaCode ? 'Přihlášení k beta účtu' : 'Přihlásit se'}</h1>
          <p className="lede">
            {/* Tester status belongs to the account (set from the invitation at
                sign-up), not to this page: any login page signs a tester into
                the same beta account, and the invitation never upgrades a
                regular account. */}
            {betaCode
              ? 'Přihlas se e-mailem, se kterým sis zakládal(a) beta účet. Testování pak pokračuje tam, kde jsi skončil(a).'
              : 'Přihlas se ke svému účtu a pokračuj tam, kde jsi skončil.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel panel-lg auth-form">
          {justConfirmed && !error && (
            <div className="notice notice-success">
              <span className="notice-title">E-mail potvrzen</span>
              <p className="notice-text">
                {betaCode
                  ? 'Účet je aktivní. Přihlas se a vrať se ke školní beta pozvánce.'
                  : 'Účet je aktivní. Teď se můžeš přihlásit.'}
              </p>
            </div>
          )}

          {resent && (
            <div className="notice notice-success">
              <p className="notice-text">
                Poslali jsme nový potvrzovací odkaz na {form.email}.
              </p>
            </div>
          )}

          {error && (
            <div className="notice notice-error" role="alert">
              <p className="notice-text">{error}</p>
              {needsConfirmation && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResend}
                >
                  Poslat potvrzovací odkaz znovu
                </button>
              )}
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="login-email">
              E-mail
            </label>
            <input
              id="login-email"
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <div className="field-label-row">
              <label className="field-label" htmlFor="login-password">
                Heslo
              </label>
              <Link to="/zapomenute-heslo" className="field-label-link">
                Zapomněl jsem heslo
              </Link>
            </div>
            <PasswordInput
              id="login-password"
              name="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          <label className="checkbox-row" htmlFor="login-remember">
            <input
              id="login-remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>
              Zůstat přihlášený
              <span className="checkbox-hint">
                Nech vypnuté na cizím nebo školním počítači — přihlášení pak
                skončí zavřením prohlížeče.
              </span>
            </span>
          </label>

          <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting && <span className="btn-spinner" aria-hidden="true" />}
            {submitting ? 'Přihlašuji…' : 'Přihlásit se'}
          </button>
        </form>

        {/* Accounts are created at the end of the onboarding quiz, so the
            way in for newcomers is the quiz, not a bare signup form. Beta
            invitees keep the direct signup that carries their code. */}
        <div className="auth-newcomer">
          <p>Ještě nemáš účet?</p>
          <Link
            to={betaCode ? `/registrace?beta=${encodeURIComponent(betaCode)}` : '/onboarding'}
            className="btn btn-secondary btn-block"
          >
            {betaCode ? 'Vytvořit účet' : 'Začít dotazník zdarma'}
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}

export default Login;
