import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import Captcha, { captchaEnabled } from '../components/Captcha';
import PasswordInput from '../components/PasswordInput';
import PasswordStrength from '../components/PasswordStrength';
import { useToast } from '../components/ToastContext';
import { deleteAccount } from '../api';
import { supabase, getRememberMe, setRememberMe } from '../supabaseClient';

const SUBSCRIPTION_LABELS = {
  trialing: 'Zkušební období',
  active: 'Aktivní předplatné',
  past_due: 'Platba neproběhla',
  canceled: 'Zrušené předplatné',
  expired: 'Zkušební období skončilo',
  developer: 'Vývojářský účet',
};

function Settings() {
  const {
    loading,
    isSignedIn,
    user,
    profile,
    hasAccess,
    isDeveloper,
    trialDaysLeft,
    changePassword,
    changeEmail,
    updateName,
    signOut,
    signOutEverywhere,
  } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Only one form is open at a time, so the page stays a readable summary
  // instead of a wall of inputs: 'password' | 'email' | 'delete' | null.
  const [openForm, setOpenForm] = useState(null);
  const [name, setName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [remember, setRemember] = useState(getRememberMe);
  const [passwordForm, setPasswordForm] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [emailForm, setEmailForm] = useState({ email: '', password: '' });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  if (loading) {
    return (
      <div className="route-loading" role="status">
        Načítám…
      </div>
    );
  }

  // Deliberately not wrapped in ProtectedRoute: that sends anyone without
  // access to the paywall, which would lock an expired account out of changing
  // its own password or deleting its own data. Signed in is enough here.
  if (!isSignedIn) return <Navigate to="/prihlaseni" replace />;

  const currentName = profile?.name ?? '';
  const nameValue = name || currentName;
  const nameChanged = nameValue.trim() !== currentName.trim();

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('cs-CZ', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // A Turnstile token is single-use, so every attempt needs a fresh challenge.
  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);
  };

  const openSection = (section) => {
    setOpenForm((current) => (current === section ? null : section));
    setError(null);
    setSuccess(null);
    resetCaptcha();
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    setError(null);
    setNameSaved(false);
    setBusy(true);
    const result = await updateName(nameValue.trim());
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setName('');
    setNameSaved(true);
    toast('Jméno bylo uloženo');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (passwordForm.next.length < 8) {
      setError('Nové heslo musí mít alespoň 8 znaků.');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setError('Nová hesla se neshodují.');
      return;
    }
    if (captchaEnabled && !captchaToken) {
      setError('Počkej prosím na ověření „nejsem robot“.');
      return;
    }

    setBusy(true);
    const result = await changePassword(passwordForm.current, passwordForm.next, {
      captchaToken,
    });
    setBusy(false);
    resetCaptcha();

    if (result.error) {
      setError(result.error);
      return;
    }

    setPasswordForm({ current: '', next: '', confirm: '' });
    setOpenForm(null);
    // A toast rather than the page banner: this needs no follow-up, and closing
    // the form scrolls the confirmation out of view on a page this long. The
    // e-mail change below keeps the banner precisely because it *does* need
    // follow-up — two links to click — and must survive being read twice.
    toast('Heslo bylo změněno');
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (emailForm.email.trim().toLowerCase() === (user?.email || '').toLowerCase()) {
      setError('Zadej jiný e-mail, než na který jsi přihlášený.');
      return;
    }
    if (captchaEnabled && !captchaToken) {
      setError('Počkej prosím na ověření „nejsem robot“.');
      return;
    }

    setBusy(true);
    const result = await changeEmail(emailForm.email.trim(), emailForm.password, {
      captchaToken,
    });
    setBusy(false);
    resetCaptcha();

    if (result.error) {
      setError(result.error);
      return;
    }

    const pending = emailForm.email.trim();
    setEmailForm({ email: '', password: '' });
    setOpenForm(null);
    setSuccess(
      `Poslali jsme potvrzovací odkaz na ${pending} i na tvůj současný e-mail. ` +
        'E-mail se změní, až klikneš na oba.'
    );
  };

  // The stored flag is read on every token write, but the next write is only
  // due at the next refresh — up to an hour away. Refreshing now moves the
  // token immediately, so unchecking this on a shared computer takes effect
  // straight away rather than silently later.
  const handleRememberChange = async (checked) => {
    setRemember(checked);
    setRememberMe(checked);
    await supabase.auth.refreshSession();
  };

  const handleSignOutEverywhere = async () => {
    setBusy(true);
    await signOutEverywhere();
    setBusy(false);
    navigate('/prihlaseni', { replace: true });
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await deleteAccount();
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      setBusy(false);
      setError(err.message);
    }
  };

  const status = profile?.subscription_status;
  const statusLabel = SUBSCRIPTION_LABELS[status] || 'Neznámý stav';

  return (
    <div className="page page-settings">
      <div className="settings-layout">
        <div className="page-header">
          <p className="eyebrow">Účet</p>
          <h1>Nastavení</h1>
          <p className="lede">
            Uprav svůj profil, zabezpečení účtu a vzhled aplikace.
          </p>
        </div>

        {success && (
          <div className="notice notice-success" role="status">
            <p className="notice-text">{success}</p>
          </div>
        )}

        {error && !openForm && (
          <div className="notice notice-error" role="alert">
            <p className="notice-text">{error}</p>
          </div>
        )}

        {/* --- Profil ---------------------------------------------------- */}
        <section className="panel panel-lg settings-section">
          <div className="settings-section-head">
            <h2 className="settings-section-title">Profil</h2>
            <p className="settings-section-text">
              Jméno, které se zobrazuje v aplikaci.
            </p>
          </div>

          <form onSubmit={handleSaveName} className="settings-form">
            <div className="field">
              <label className="field-label" htmlFor="settings-name">
                Jméno
              </label>
              <div className="settings-inline">
                <input
                  id="settings-name"
                  className="input"
                  type="text"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  value={nameValue}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameSaved(false);
                  }}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={busy || !nameChanged}
                >
                  {busy && <span className="btn-spinner" aria-hidden="true" />}
                  {nameSaved && !nameChanged ? 'Uloženo' : 'Uložit'}
                </button>
              </div>
            </div>
          </form>

          <div className="settings-row">
            <div className="settings-row-body">
              <span className="settings-row-label">E-mail</span>
              <span className="settings-row-value">{user?.email}</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openSection('email')}
            >
              Změnit
            </button>
          </div>

          {openForm === 'email' && (
            <form onSubmit={handleChangeEmail} className="settings-form settings-form-inset">
              {error && (
                <div className="notice notice-error" role="alert">
                  <p className="notice-text">{error}</p>
                </div>
              )}

              <div className="field">
                <label className="field-label" htmlFor="settings-new-email">
                  Nový e-mail
                </label>
                <input
                  id="settings-new-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={emailForm.email}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, email: e.target.value })
                  }
                  required
                />
                <span className="field-hint">
                  Potvrzovací odkaz pošleme na starou i novou adresu — změna
                  proběhne, až klikneš na oba.
                </span>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="settings-email-password">
                  Současné heslo
                </label>
                <PasswordInput
                  id="settings-email-password"
                  autoComplete="current-password"
                  value={emailForm.password}
                  onChange={(e) =>
                    setEmailForm({ ...emailForm, password: e.target.value })
                  }
                  required
                />
              </div>

              <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />

              <div className="settings-form-actions">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy && <span className="btn-spinner" aria-hidden="true" />}
                  {busy ? 'Odesílám…' : 'Poslat potvrzení'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpenForm(null)}
                >
                  Zrušit
                </button>
              </div>
            </form>
          )}

          {memberSince && (
            <div className="settings-row">
              <div className="settings-row-body">
                <span className="settings-row-label">Účet vytvořen</span>
                <span className="settings-row-value">{memberSince}</span>
              </div>
            </div>
          )}
        </section>

        {/* --- Zabezpečení ----------------------------------------------- */}
        <section className="panel panel-lg settings-section">
          <div className="settings-section-head">
            <h2 className="settings-section-title">Zabezpečení</h2>
            <p className="settings-section-text">
              Heslo a přihlášení na tomhle i ostatních zařízeních.
            </p>
          </div>

          <div className="settings-row">
            <div className="settings-row-body">
              <span className="settings-row-label">Heslo</span>
              <span className="settings-row-value settings-row-muted">
                Pro změnu potřebuješ zadat současné heslo.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => openSection('password')}
            >
              Změnit
            </button>
          </div>

          {openForm === 'password' && (
            <form
              onSubmit={handleChangePassword}
              className="settings-form settings-form-inset"
            >
              {error && (
                <div className="notice notice-error" role="alert">
                  <p className="notice-text">{error}</p>
                </div>
              )}

              <div className="field">
                <div className="field-label-row">
                  <label className="field-label" htmlFor="settings-current-password">
                    Současné heslo
                  </label>
                  <Link to="/zapomenute-heslo" className="field-label-link">
                    Nepamatuju si ho
                  </Link>
                </div>
                <PasswordInput
                  id="settings-current-password"
                  autoComplete="current-password"
                  value={passwordForm.current}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current: e.target.value })
                  }
                  required
                  visibleLabel="současné heslo"
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="settings-next-password">
                  Nové heslo
                </label>
                <PasswordInput
                  id="settings-next-password"
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordForm.next}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, next: e.target.value })
                  }
                  required
                  visibleLabel="nové heslo"
                />
                {passwordForm.next ? (
                  <PasswordStrength password={passwordForm.next} />
                ) : (
                  <span className="field-hint">Alespoň 8 znaků.</span>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="settings-confirm-password">
                  Nové heslo znovu
                </label>
                <PasswordInput
                  id="settings-confirm-password"
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordForm.confirm}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirm: e.target.value })
                  }
                  required
                  visibleLabel="nové heslo znovu"
                />
              </div>

              <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />

              <div className="settings-form-actions">
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy && <span className="btn-spinner" aria-hidden="true" />}
                  {busy ? 'Ukládám…' : 'Uložit nové heslo'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setOpenForm(null)}
                >
                  Zrušit
                </button>
              </div>
            </form>
          )}

          <div className="settings-row">
            <label className="checkbox-row" htmlFor="settings-remember">
              <input
                id="settings-remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => handleRememberChange(e.target.checked)}
              />
              <span>
                Zůstat přihlášený
                <span className="checkbox-hint">
                  Vypni na cizím nebo školním počítači — přihlášení pak skončí
                  zavřením prohlížeče.
                </span>
              </span>
            </label>
          </div>

          <div className="settings-row">
            <div className="settings-row-body">
              <span className="settings-row-label">Odhlásit všude</span>
              <span className="settings-row-value settings-row-muted">
                Ukončí přihlášení na všech zařízeních včetně tohoto.
              </span>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSignOutEverywhere}
              disabled={busy}
            >
              {busy && <span className="btn-spinner" aria-hidden="true" />}
              {/* This one had no busy label at all — it signs out every device
                  and then redirects, so the gap between click and navigation was
                  the one place in Settings with no sign anything was happening. */}
              {busy ? 'Odhlašuji…' : 'Odhlásit všude'}
            </button>
          </div>
        </section>

        {/* --- Předplatné ------------------------------------------------ */}
        <section className="panel panel-lg settings-section">
          <div className="settings-section-head">
            <h2 className="settings-section-title">Předplatné</h2>
            <p className="settings-section-text">Stav tvého přístupu k databázi škol.</p>
          </div>

          <div className="settings-row">
            <div className="settings-row-body">
              <span className="settings-row-label">Stav</span>
              <span className="settings-row-value">
                {statusLabel}
                {status === 'trialing' && (
                  <>
                    {' — zbývá '}
                    <strong>
                      {trialDaysLeft}{' '}
                      {trialDaysLeft === 1
                        ? 'den'
                        : trialDaysLeft >= 2 && trialDaysLeft <= 4
                          ? 'dny'
                          : 'dní'}
                    </strong>
                  </>
                )}
              </span>
            </div>
            {isDeveloper ? (
              <span className="badge">Vývojář</span>
            ) : (
              !hasAccess && (
                <Link to="/predplatne" className="btn btn-primary btn-sm">
                  Aktivovat
                </Link>
              )
            )}
          </div>
        </section>

        {/* --- Smazání účtu ---------------------------------------------- */}
        <section className="panel panel-lg settings-section settings-danger">
          <div className="settings-section-head">
            <h2 className="settings-section-title">Smazat účet</h2>
            <p className="settings-section-text">
              Trvale odstraní tvůj účet, uložené oblíbené školy i případné
              předplatné. Tohle nejde vzít zpět.
            </p>
          </div>

          {openForm === 'delete' ? (
            <form onSubmit={handleDelete} className="settings-form settings-form-inset">
              {error && (
                <div className="notice notice-error" role="alert">
                  <p className="notice-text">{error}</p>
                </div>
              )}

              <div className="field">
                <label className="field-label" htmlFor="settings-delete-confirm">
                  Pro potvrzení opiš svůj e-mail
                </label>
                <input
                  id="settings-delete-confirm"
                  className="input"
                  type="text"
                  autoComplete="off"
                  placeholder={user?.email}
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  required
                />
              </div>

              <div className="settings-form-actions">
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={
                    busy ||
                    deleteConfirm.trim().toLowerCase() !==
                      (user?.email || '').toLowerCase()
                  }
                >
                  {busy && <span className="btn-spinner" aria-hidden="true" />}
                  {busy ? 'Mažu…' : 'Nenávratně smazat účet'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setOpenForm(null);
                    setDeleteConfirm('');
                  }}
                >
                  Zrušit
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-danger-ghost"
              onClick={() => openSection('delete')}
            >
              Smazat účet
            </button>
          )}
        </section>
      </div>
    </div>
  );
}

export default Settings;
