import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import AuthTabs from '../components/AuthTabs';
import Captcha, { captchaEnabled } from '../components/Captcha';
import PasswordInput from '../components/PasswordInput';
import { getRememberMe } from '../supabaseClient';

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

  const destination = location.state?.from?.pathname || '/skoly';
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

    const result = await resendConfirmation(form.email, { captchaToken });
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
    <div className="page page-auth">
      <div className="auth-layout">
        <div className="page-header">
          <p className="eyebrow">Vítej zpátky</p>
          <h1>Přihlásit se</h1>
          <p className="lede">
            Přihlas se ke svému účtu a pokračuj tam, kde jsi skončil.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel panel-lg auth-form">
          <AuthTabs />

          {justConfirmed && !error && (
            <div className="notice notice-success">
              <span className="notice-title">E-mail potvrzen</span>
              <p className="notice-text">
                Účet je aktivní. Přihlas se a zkušební období se rozjede.
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
      </div>
    </div>
  );
}

export default Login;
