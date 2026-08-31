import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import AuthTabs from '../components/AuthTabs';
import Captcha, { captchaEnabled } from '../components/Captcha';
import PasswordInput from '../components/PasswordInput';
import PasswordStrength from '../components/PasswordStrength';
import { trialDaysPhrase } from '../config/pricing';

function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const { signUp } = useAuth();
  const navigate = useNavigate();

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

    if (captchaEnabled && !captchaToken) {
      setError('Počkej prosím na ověření „nejsem robot“.');
      return;
    }

    setSubmitting(true);
    const result = await signUp(form.email, form.password, form.name, {
      captchaToken,
    });
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
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
      <div className="page page-auth">
        <div className="auth-layout">
          <div className="notice">
            <span className="notice-title">Potvrď svůj e-mail</span>
            <p className="notice-text">
              Poslali jsme odkaz na {form.email}. Klikni na něj a účet se
              aktivuje i s tvým sedmidenním zkušebním obdobím. Bez potvrzení se
              do databáze škol nedostaneš.
            </p>
            <p className="notice-text">
              Nepřišel? Zkontroluj složku se spamem — odkaz umíme poslat znovu
              z přihlašovací stránky.
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
          <p className="eyebrow">{trialDaysPhrase()} zdarma</p>
          <h1>Vytvořit účet</h1>
          <p className="lede">
            Vyzkoušej celou databázi škol {trialDaysPhrase()} zdarma. Platit
            začneš až potom — a jen když budeš chtít pokračovat.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel panel-lg auth-form">
          <AuthTabs />

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

          <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting && <span className="btn-spinner" aria-hidden="true" />}
            {submitting ? 'Vytvářím účet…' : `Začít ${trialDaysPhrase()} zdarma`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SignUp;
