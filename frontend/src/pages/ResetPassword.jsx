import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import PasswordInput from '../components/PasswordInput';
import PasswordStrength from '../components/PasswordStrength';

function ResetPassword() {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { loading, isSignedIn, isPasswordRecovery, updatePassword } = useAuth();
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

    if (form.password !== form.confirm) {
      setError('Hesla se neshodují.');
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(form.password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate('/skoly', { replace: true });
  };

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Načítám…
      </div>
    );
  }

  // A normal signed-in session is not proof that the recovery link was used.
  // Supabase emits PASSWORD_RECOVERY specifically for that redirect; requiring
  // it here keeps this public route from bypassing Settings' reauthentication.
  if (!isSignedIn || !isPasswordRecovery) {
    return (
      <div className="page page-auth">
        <div className="auth-layout">
          <div className="page-header">
            <p className="eyebrow">Obnova hesla</p>
            <h1>Odkaz už neplatí</h1>
          </div>
          <div className="notice notice-error" role="alert">
            <p className="notice-text">
              Odkaz pro obnovu hesla vypršel nebo byl už použit. Nech si poslat
              nový.
            </p>
          </div>
          <Link to="/zapomenute-heslo" className="btn btn-primary btn-block">
            Poslat nový odkaz
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
          <h1>Nové heslo</h1>
          <p className="lede">
            Zvol si nové heslo. Po uložení tě rovnou přihlásíme.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="panel panel-lg auth-form">
          {error && (
            <div className="notice notice-error" role="alert" id="new-password-error">
              <p className="notice-text">{error}</p>
            </div>
          )}

          <div className="field">
            <label className="field-label" htmlFor="new-password">
              Nové heslo
            </label>
            <PasswordInput
              id="new-password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'new-password-error' : 'new-password-hint'}
              value={form.password}
              onChange={handleChange}
              required
            />
            {form.password ? (
              <PasswordStrength password={form.password} />
            ) : (
              <span className="field-hint" id="new-password-hint">Alespoň 8 znaků.</span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="confirm-password">
              Heslo znovu
            </label>
            <PasswordInput
              id="confirm-password"
              name="confirm"
              autoComplete="new-password"
              minLength={8}
              aria-invalid={error === 'Hesla se neshodují.' ? 'true' : undefined}
              aria-describedby={error === 'Hesla se neshodují.' ? 'new-password-error' : undefined}
              value={form.confirm}
              onChange={handleChange}
              required
              visibleLabel="heslo znovu"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting}
          >
            {submitting && <span className="btn-spinner" aria-hidden="true" />}
            {submitting ? 'Ukládám…' : 'Uložit nové heslo'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
