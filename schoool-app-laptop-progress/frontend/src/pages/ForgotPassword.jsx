import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import Captcha, { captchaEnabled } from '../components/Captcha';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { requestPasswordReset } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (captchaEnabled && !captchaToken) {
      setError('Počkej prosím na ověření „nejsem robot“.');
      return;
    }

    setSubmitting(true);

    const result = await requestPasswordReset(email, { captchaToken });

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      // The token is single-use; a retry needs a fresh challenge.
      setCaptchaToken(null);
      setCaptchaKey((key) => key + 1);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <div className="page page-auth">
        <div className="auth-layout">
          <div className="notice">
            <span className="notice-title">Zkontroluj svůj e-mail</span>
            <p className="notice-text">
              Pokud na {email} existuje účet, poslali jsme na něj odkaz pro
              nastavení nového hesla. Platí 10 minut.
            </p>
          </div>
          <Link to="/prihlaseni" className="btn btn-secondary btn-block">
            Zpět na přihlášení
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page page-auth">
      <div className="auth-layout">
        <div className="page-header">
          <p className="eyebrow">Obnova hesla</p>
          <h1>Zapomenuté heslo</h1>
          <p className="lede">
            Zadej e-mail, kterým se přihlašuješ. Pošleme ti odkaz pro nastavení
            nového hesla.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel panel-lg auth-form">
          {error && (
            <div className="notice notice-error" role="alert">
              <p className="notice-text">{error}</p>
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="reset-email">
              E-mail
            </label>
            <input
              id="reset-email"
              className="input"
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting && <span className="btn-spinner" aria-hidden="true" />}
            {submitting ? 'Odesílám…' : 'Poslat odkaz'}
          </button>
        </form>

        <p className="auth-footnote">
          Vzpomněl sis? <Link to="/prihlaseni">Zpět na přihlášení</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
