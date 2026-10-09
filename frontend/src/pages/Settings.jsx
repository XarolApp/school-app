import { useEffect, useMemo, useRef, useState } from 'react';
import { SHARING_ENABLED } from '../config/features';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../components/AuthContext';
import Captcha, { captchaEnabled } from '../components/Captcha';
import PasswordInput from '../components/PasswordInput';
import PasswordStrength from '../components/PasswordStrength';
import { useToast } from '../components/ToastContext';
import { deleteAccount, cancelSubscription, withdrawFromContract, updateProfile, fetchShareLinks, deleteShareLink } from '../api';
import { getPlan } from '../config/pricing';
import { supabase, getRememberMe, setRememberMe } from '../supabaseClient';
import { DEFAULT_PALETTE, PALETTE_IDS, palettes } from '../design/tokens';
import { applyTheme, applyThemeAnimated, MODES, readCachedTheme } from '../lib/theme';
import { useBetaTools } from '../components/BetaToolsContext';
import { BetaProgress } from '../components/BetaInstructions';
import { ROLE_KEY } from '../lib/onboardingStorage';
import { SkeletonPage, Sk } from '../components/PageSkeleton';

const SUBSCRIPTION_LABELS = {
  trialing: 'Zkušební období',
  active: 'Aktivní předplatné',
  season: 'Sezónní přístup',
  past_due: 'Platba neproběhla',
  canceled: 'Zrušené předplatné',
  expired: 'Zkušební období skončilo',
  developer: 'Vývojářský účet',
  beta: 'Beta tester',
};

// Named by colour, in the order people scan them: blue, yellow, green, orange.
const THEME_PALETTE_ORDER = ['znacka', 'zvyraznovac', 'smrk', 'terakota'];
const THEME_PALETTE_COPY = {
  znacka: { name: 'Modrá', description: 'Klidná modrá. Výchozí.' },
  zvyraznovac: { name: 'Žlutá', description: 'Černá a žlutá jako zvýrazňovač.' },
  smrk: { name: 'Zelená', description: 'Tmavě zelená, klidná.' },
  terakota: { name: 'Oranžová', description: 'Teplá cihlově oranžová.' },
};

const THEME_MODE_COPY = [
  { id: 'system', label: 'Podle zařízení' },
  { id: 'light', label: 'Světlý' },
  { id: 'dark', label: 'Tmavý' },
];

const formatCzDateLong = (iso) =>
  new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });

// Skeleton: the page header and the first two panels (what is on screen
// before scrolling) with their real titles; only the values are grey.
function SettingsSkeleton() {
  return (
    <SkeletonPage className="page page-settings" label="Načítám nastavení…">
      <div className="settings-layout">
        <div className="page-header">
          <p className="eyebrow">Účet</p>
          <h1>Nastavení</h1>
          <p className="lede">Uprav svůj profil a zabezpečení účtu.</p>
        </div>
        <section className="panel panel-lg settings-section">
          <div className="settings-section-head">
            <h2 className="settings-section-title">Profil</h2>
            <p className="settings-section-text">Jméno a způsob oslovení.</p>
          </div>
          <div className="settings-form"><div style={{ display: 'grid', gap: 8, height: 155, alignContent: 'start' }}><Sk w={80} h={16} /><Sk h={48} /><Sk w="60%" h={14} /></div></div>
          <div className="settings-row"><Sk w="45%" h={36} /></div>
          <div className="settings-row"><Sk w="35%" h={36} /></div>
        </section>
        <section className="panel panel-lg settings-section">
          <div className="settings-section-head">
            <h2 className="settings-section-title">Vzhled</h2>
            <p className="settings-section-text">Barvy a režim se uloží k tvému účtu, takže je uvidíš na každém zařízení.</p>
          </div>
          <div className="settings-theme-group">
            <Sk w={60} h={16} style={{ marginBottom: 8 }} />
            <div className="theme-palette-grid">{[0, 1, 2, 3].map((i) => <Sk key={i} h={72} />)}</div>
          </div>
          <div className="settings-theme-group">
            <Sk w={60} h={16} style={{ marginBottom: 8 }} />
            <Sk w={260} h={40} style={{ marginBottom: 10 }} />
            <Sk w="50%" h={14} />
          </div>
        </section>
      </div>
    </SkeletonPage>
  );
}

function Settings() {
  const {
    loading,
    isSignedIn,
    user,
    profile,
    hasAccess,
    isDeveloper,
    isTester,
    trialDaysLeft,
    changePassword,
    changeEmail,
    updateName,
    signOut,
    signOutEverywhere,
    refreshProfile,
  } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { openFeedback, beta, refreshBeta } = useBetaTools();
  // Access countdown: the server's clock decides the deadline, ours only ticks.
  const [clock, setClock] = useState(Date.now());
  const betaDeadline = useMemo(() => {
    const until = Date.parse(profile?.effectiveAccessUntil), serverNow = Date.parse(profile?.serverNow);
    return Number.isFinite(until) && Number.isFinite(serverNow) ? Date.now() + (until - serverNow) : null;
  }, [profile]);
  const betaLeft = betaDeadline === null ? null : Math.max(0, betaDeadline - clock);
  const countdown = betaLeft === null ? '' : `${Math.floor(betaLeft / 3600000)} h ${String(Math.floor(betaLeft / 60000) % 60).padStart(2, '0')} min ${String(Math.floor(betaLeft / 1000) % 60).padStart(2, '0')} s`;
  useEffect(() => {
    if (!isTester) return undefined;
    void refreshBeta().catch(() => {});
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isTester, refreshBeta]);

  // Only one form is open at a time, so the page stays a readable summary
  // instead of a wall of inputs: 'password' | 'email' | 'delete' | 'cancel' | null.
  const [openForm, setOpenForm] = useState(null);
  const openerRef = useRef(null);
  const lastSection = useRef(null);

  // Opening a section moves focus to its first field; closing it returns focus
  // to the "Změnit" button that opened it (if that section had one).
  useEffect(() => {
    if (openForm) {
      lastSection.current = openForm;
      document.querySelector(`#settings-form-${openForm} input, #settings-form-${openForm} button`)?.focus();
    } else if (lastSection.current && openerRef.current?.isConnected) {
      openerRef.current.focus();
      lastSection.current = null;
    }
  }, [openForm]);
  const [name, setName] = useState('');
  const [nameSaved, setNameSaved] = useState(false);
  const [genderChoice, setGenderChoice] = useState('u');
  const [genderSaved, setGenderSaved] = useState(false);
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
  const [shareLinks, setShareLinks] = useState([]);
  const [shareLinksError, setShareLinksError] = useState(null);
  const [deletingShareToken, setDeletingShareToken] = useState(null);
  const [shareRole] = useState(() => { try { return localStorage.getItem(ROLE_KEY); } catch { return null; } });

  const [cachedTheme] = useState(readCachedTheme);
  const profileTheme = {
    palette: PALETTE_IDS.includes(profile?.theme_palette) ? profile.theme_palette : cachedTheme.palette,
    mode: MODES.includes(profile?.theme_mode) ? profile.theme_mode : cachedTheme.mode,
  };
  const [themePalette, setThemePalette] = useState(() => profileTheme.palette);
  const [themeMode, setThemeMode] = useState(() => profileTheme.mode);
  const [systemMode, setSystemMode] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const savedThemeRef = useRef(profileTheme);
  const chosenThemeRef = useRef(profileTheme);
  const themeChangeRevisionRef = useRef(0);
  const themeSaveQueueRef = useRef(Promise.resolve());
  // Where the last theme option was pressed: the new colours spread from there.
  const themeClickRef = useRef(null);
  const profileIdRef = useRef(profile?.id ?? null);

  useEffect(() => {
    if (loading || !isSignedIn) return undefined;
    let alive = true;
    fetchShareLinks()
      .then((rows) => { if (alive) setShareLinks(rows); })
      .catch((err) => { if (alive) setShareLinksError(err?.message || 'Sdílené odkazy se nepodařilo načíst.'); });
    return () => { alive = false; };
  }, [loading, isSignedIn]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemMode = () => setSystemMode(media.matches ? 'dark' : 'light');
    updateSystemMode();
    media.addEventListener('change', updateSystemMode);
    return () => media.removeEventListener('change', updateSystemMode);
  }, []);

  useEffect(() => {
    if (!profile) return;
    const nextTheme = {
      palette: PALETTE_IDS.includes(profile.theme_palette) ? profile.theme_palette : DEFAULT_PALETTE,
      mode: MODES.includes(profile.theme_mode) ? profile.theme_mode : 'system',
    };

    if (profile.id !== profileIdRef.current) {
      profileIdRef.current = profile.id;
      themeChangeRevisionRef.current = 0;
      themeSaveQueueRef.current = Promise.resolve();
      savedThemeRef.current = nextTheme;
      chosenThemeRef.current = nextTheme;
      setThemePalette(nextTheme.palette);
      setThemeMode(nextTheme.mode);
    } else if (themeChangeRevisionRef.current === 0) {
      savedThemeRef.current = nextTheme;
      chosenThemeRef.current = nextTheme;
      setThemePalette(nextTheme.palette);
      setThemeMode(nextTheme.mode);
    }
  }, [profile, profile?.id, profile?.theme_palette, profile?.theme_mode]);

  useEffect(() => {
    setGenderChoice(profile?.gender || 'u');
  }, [profile?.gender]);

  if (loading) {
    return <SettingsSkeleton />;
  }

  // Deliberately not wrapped in ProtectedRoute: that sends anyone without
  // access to the paywall, which would lock an expired account out of changing
  // its own password or deleting its own data. Signed in is enough here.
  if (!isSignedIn) return <Navigate to="/prihlaseni" replace />;

  const currentName = profile?.name ?? '';
  const nameValue = name || currentName;
  const nameChanged = nameValue.trim() !== currentName.trim();
  const genderChanged = (genderChoice === 'u' ? null : genderChoice) !== (profile?.gender ?? null);

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

  const openSection = (section, opener) => {
    if (opener) openerRef.current = opener;
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

  const handleSaveGender = async (e) => {
    e.preventDefault();
    setError(null);
    setGenderSaved(false);
    setBusy(true);
    const value = genderChoice === 'm' || genderChoice === 'f' ? genderChoice : null;
    try {
      await updateProfile({ gender: value });
      await refreshProfile();
      setGenderSaved(true);
      toast('Oslovení bylo uloženo');
    } catch (saveError) {
      setError(saveError?.message || 'Oslovení se nepodařilo uložit.');
    } finally {
      setBusy(false);
    }
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
        'E-mail se změní, až klikneš na oba. Nepřišel? Mrkni do spamu a do složky Hromadné.'
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
    setError(null);
    setBusy(true);
    const result = await signOutEverywhere();
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate('/prihlaseni', { replace: true });
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await deleteAccount();
      // Half-written answers and drafts live in this tab's sessionStorage; on a
      // shared school computer they must not outlive the account.
      try {
        Object.keys(sessionStorage).filter((k) => k.startsWith('snm.')).forEach((k) => sessionStorage.removeItem(k));
      } catch { /* storage unavailable: nothing to clear */ }
      await signOut();
      navigate('/', { replace: true });
    } catch (err) {
      setBusy(false);
      setError(err.message);
    }
  };

  const status = profile?.subscription_status;
  const statusLabel = SUBSCRIPTION_LABELS[status] || 'Neznámý stav';
  const effectiveMode = themeMode === 'system' ? systemMode : themeMode;

  // A cancel button is only meaningful when there is something Stripe would
  // otherwise keep billing: a recurring monthly plan, or a season pass still
  // inside its 3-day trial (cancelling there prevents the charge outright). A
  // season pass that has already been charged has nothing recurring to stop —
  // cancellationTerms() in pricing.js explains the trial and non-renewal.
  const canCancel =
    (profile?.plan_id === 'monthly' && !profile?.cancel_at_period_end && (status === 'active' || status === 'past_due')) ||
    (status === 'trialing' && (
      Boolean(profile?.stripe_subscription_id) ||
      (profile?.plan_id === 'season' && Boolean(profile?.season_charge_due_at))
    ));

  const handleCancelSubscription = async () => {
    setError(null);
    setBusy(true);
    try {
      const { cancelled, accessUntil } = await cancelSubscription();
      await refreshProfile();
      setOpenForm(null);
      toast(
        cancelled === 'immediately'
          ? 'Zrušeno. Nic ti nebude strženo.'
          : `Zrušeno. Přístup ti běží do ${formatCzDateLong(accessUntil)}.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };


  const saveThemePreference = (field, value) => {
    const revision = themeChangeRevisionRef.current + 1;
    themeChangeRevisionRef.current = revision;
    const nextTheme = { ...chosenThemeRef.current, [field]: value };
    chosenThemeRef.current = nextTheme;
    setThemePalette(nextTheme.palette);
    setThemeMode(nextTheme.mode);
    applyThemeAnimated(nextTheme.palette, nextTheme.mode, themeClickRef.current);

    const save = themeSaveQueueRef.current.catch(() => {}).then(async () => {
      try {
        const updated = await updateProfile(
          field === 'palette' ? { themePalette: value } : { themeMode: value }
        );
        const saved = savedThemeRef.current;
        savedThemeRef.current = {
          palette: PALETTE_IDS.includes(updated?.theme_palette) ? updated.theme_palette : saved.palette,
          mode: MODES.includes(updated?.theme_mode) ? updated.theme_mode : saved.mode,
        };

        if (revision !== themeChangeRevisionRef.current) return;
        chosenThemeRef.current = { ...savedThemeRef.current };
        setThemePalette(chosenThemeRef.current.palette);
        setThemeMode(chosenThemeRef.current.mode);
        await refreshProfile();
        if (revision !== themeChangeRevisionRef.current) {
          applyTheme(chosenThemeRef.current.palette, chosenThemeRef.current.mode);
        }
      } catch {
        if (revision !== themeChangeRevisionRef.current) return;
        const saved = { ...savedThemeRef.current };
        chosenThemeRef.current = saved;
        setThemePalette(saved.palette);
        setThemeMode(saved.mode);
        applyTheme(saved.palette, saved.mode);
        toast('Vzhled se nepodařilo uložit. Zkus to prosím znovu.', { type: 'error' });
        await refreshProfile();
        if (revision !== themeChangeRevisionRef.current) {
          applyTheme(chosenThemeRef.current.palette, chosenThemeRef.current.mode);
        }
      }
    });
    themeSaveQueueRef.current = save;
  };

  const handleDeleteShareLink = async (token) => {
    setDeletingShareToken(token);
    setShareLinksError(null);
    try {
      await deleteShareLink(token);
      setShareLinks((rows) => rows.filter((row) => row.token !== token));
    } catch (err) {
      setShareLinksError(err?.message || 'Sdílený odkaz se nepodařilo zrušit.');
    } finally {
      setDeletingShareToken(null);
    }
  };

  const handleWithdraw = async () => {
    setError(null);
    setBusy(true);
    try {
      const { refundedCzk, at } = await withdrawFromContract();
      await refreshProfile();
      setOpenForm(null);
      setSuccess(
        `Odstoupení od smlouvy jsme přijali ${new Date(at).toLocaleString('cs-CZ')}. ` +
          'Předplatné je zrušené a přístup skončil. ' +
          (refundedCzk > 0
            ? `Vrátili jsme ti ${refundedCzk} Kč; na kartě se objeví do několika pracovních dnů. `
            : 'Nic ti nebylo strženo, není co vracet. ') +
          'Toto potvrzení si můžeš uložit nebo vyfotit.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page page-settings">
      <div className="settings-layout">
        <div className="page-header">
          <p className="eyebrow">Účet</p>
          <h1>Nastavení</h1>
          <p className="lede">
            Uprav svůj profil a zabezpečení účtu.
          </p>
        </div>

        {success && (
          <div className="notice notice-success" role="status" data-private>
            <p className="notice-text">{success}</p>
          </div>
        )}

        {error && !openForm && (
          <div className="notice notice-error" role="alert" data-private>
            <p className="notice-text">{error}</p>
          </div>
        )}

        {/* --- Profil ---------------------------------------------------- */}
        <section className="panel panel-lg settings-section" data-private>
          <div className="settings-section-head">
            <h2 className="settings-section-title">Profil</h2>
            <p className="settings-section-text">
              Jméno a způsob oslovení.
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

          <form onSubmit={handleSaveGender} className="settings-form settings-form-inset">
            <fieldset className="field settings-fieldset">
              <legend className="field-label">Jak tě máme oslovovat?</legend>
              <div className="settings-choice">
                {[
                  ['m', 'Jako žáka'],
                  ['f', 'Jako žákyni'],
                  ['u', 'Nechci uvádět'],
                ].map(([value, label]) => (
                  <label key={value} className="settings-choice-option">
                    <input type="radio" name="settings-gender" value={value} checked={genderChoice === value} onChange={() => { setGenderChoice(value); setGenderSaved(false); }} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <span className="field-hint">Používáme jen správný tvar slov. „Nechci uvádět“ znamená mužské tvary.</span>
            </fieldset>
            <div className="settings-form-actions">
              <button type="submit" className="btn btn-secondary" disabled={busy || !genderChanged}>
                {busy && <span className="btn-spinner" aria-hidden="true" />}
                {genderSaved && !genderChanged ? 'Uloženo' : 'Uložit oslovení'}
              </button>
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
              onClick={(e) => openSection('email', e.currentTarget)}
              aria-label="Změnit e-mail"
              aria-expanded={openForm === 'email'}
              aria-controls="settings-form-email"
            >
              Změnit
            </button>
          </div>

          {openForm === 'email' && (
            <form id="settings-form-email" onSubmit={handleChangeEmail} className="settings-form settings-form-inset">
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

        {/* --- Vzhled ---------------------------------------------------- */}
        <section className="panel panel-lg settings-section" onPointerDown={(e) => { themeClickRef.current = { x: e.clientX, y: e.clientY }; }}>
          <div className="settings-section-head">
            <h2 className="settings-section-title">Vzhled</h2>
            <p className="settings-section-text">
              Barvy a režim se uloží k tvému účtu, takže je uvidíš na každém zařízení.
            </p>
          </div>

          <fieldset className="settings-theme-group">
            <legend className="field-label">Barvy</legend>
            <div className="theme-palette-grid">
              {THEME_PALETTE_ORDER.filter((id) => PALETTE_IDS.includes(id)).map((id) => {
                const colors = palettes[id][effectiveMode];
                const copy = THEME_PALETTE_COPY[id];
                const selected = themePalette === id;
                return (
                  <label className="theme-palette-card" key={id}>
                    <input
                      className="sr-only"
                      type="radio"
                      name="theme-palette"
                      value={id}
                      checked={selected}
                      onChange={() => saveThemePreference('palette', id)}
                    />
                    <span className="theme-palette-copy">
                      <span className="theme-palette-name">
                        {copy.name}
                        {selected && <Check size={16} aria-hidden="true" />}
                      </span>
                      <span className="theme-palette-description">{copy.description}</span>
                    </span>
                    <span className="theme-palette-preview" aria-hidden="true">
                      <span
                        className="theme-palette-swatch"
                        style={{ backgroundColor: colors.bg, border: `1px solid ${colors.line2}` }}
                      />
                      <span
                        className="theme-palette-swatch"
                        style={{ backgroundColor: colors.accent }}
                      />
                      <span
                        className="theme-palette-swatch theme-palette-swatch-ok"
                        style={{ backgroundColor: colors.okSoft }}
                      >
                        <span className="theme-palette-swatch-dot" style={{ backgroundColor: colors.ok }} />
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="settings-theme-group">
            <legend className="field-label">Režim</legend>
            <div className="settings-theme-mode-control" role="radiogroup" aria-label="Režim">
              {THEME_MODE_COPY.map(({ id, label }) => (
                <label className={themeMode === id ? 'is-active' : ''} key={id}>
                  <input
                    className="sr-only"
                    type="radio"
                    name="theme-mode"
                    value={id}
                    checked={themeMode === id}
                    onChange={() => saveThemePreference('mode', id)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="settings-theme-hint">
              „Podle zařízení“ se řídí nastavením telefonu nebo počítače.
            </p>
          </fieldset>
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
              onClick={(e) => openSection('password', e.currentTarget)}
              aria-label="Změnit heslo"
              aria-expanded={openForm === 'password'}
              aria-controls="settings-form-password"
            >
              Změnit
            </button>
          </div>

          {openForm === 'password' && (
            <form
              id="settings-form-password"
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
                {profile?.cancel_at_period_end && status === 'active' ? 'Zrušeno — nic se neobnoví' : statusLabel}
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
                {profile?.access_expires_at && (status === 'active' || status === 'season') && (
                  <>
                    {' — přístup do '}
                    <strong>{formatCzDateLong(profile.access_expires_at)}</strong>
                  </>
                )}
              </span>
            </div>
            {isDeveloper || status === 'beta' ? (
              <span className="badge">{isDeveloper ? 'Vývojář' : 'Beta tester'}</span>
            ) : (
              !hasAccess && (
                <Link to="/predplatne" className="btn btn-primary btn-sm">
                  Aktivovat
                </Link>
              )
            )}
          </div>

          {isTester && (
            <div className="settings-form-inset beta-settings-access">
              {profile?.betaProgramActive ? (
                <>
                  {hasAccess ? (
                    <div className="beta-countdown" role="timer" aria-label="Zbývající čas přístupu">
                      <span className="beta-countdown-label">Přístup zbývá</span>
                      <strong className="beta-countdown-value">{countdown}</strong>
                      <span className="settings-section-text">Každá zpětná vazba ho sama obnoví, nejdéle do konce programu.</span>
                    </div>
                  ) : (
                    <p className="settings-section-text">Přístup je pozastavený. Po odeslání zpětné vazby se znovu otevře.</p>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={openFeedback}>
                    Poslat zpětnou vazbu
                  </button>
                  <BetaProgress checklist={beta?.checklist} />
                </>
              ) : (
                <p className="settings-section-text">Beta program skončil. Přístup se už neobnoví.</p>
              )}
              {profile?.betaFeedbackFormUrl && (
                <a href={profile.betaFeedbackFormUrl} target="_blank" rel="noreferrer">
                  Otevřít externí formulář (přístup neobnoví)
                </a>
              )}
            </div>
          )}

          {canCancel &&
            (openForm === 'cancel' ? (
              <div id="settings-form-cancel" className="settings-form settings-form-inset">
                {error && (
                  <div className="notice notice-error" role="alert">
                    <p className="notice-text">{error}</p>
                  </div>
                )}
                <p className="settings-section-text">
                  {status === 'trialing'
                    ? 'Zrušíš teď, ve zkušební době — nic ti nebude strženo.'
                    : 'Opravdu chceš předplatné zrušit? Přístup ti zůstane do konce už zaplaceného období, pak se neobnoví.'}
                </p>
                <div className="settings-form-actions">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleCancelSubscription}
                    disabled={busy}
                  >
                    {busy && <span className="btn-spinner" aria-hidden="true" />}
                    {busy ? 'Ruším…' : 'Ano, zrušit'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setOpenForm(null);
                      setError(null);
                    }}
                  >
                    Nechat běžet
                  </button>
                </div>
              </div>
            ) : (
              <div className="settings-row-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => openSection('cancel', e.currentTarget)}
                >
                  Zrušit předplatné
                </button>
              </div>
            ))}

          {profile?.canWithdraw &&
            (openForm === 'withdraw' ? (
              <div id="settings-form-withdraw" className="settings-form settings-form-inset">
                {error && (
                  <div className="notice notice-error" role="alert">
                    <p className="notice-text">{error}</p>
                  </div>
                )}
                <p className="settings-section-text">
                  Potvrď odstoupení od smlouvy. Zaplacenou částku ti vrátíme celou, předplatné se zruší
                  a přístup skončí hned.
                </p>
                <ul className="settings-section-text">
                  <li data-private>Jméno: <strong>{profile.name || '—'}</strong></li>
                  <li data-private>E-mail účtu (sem patří potvrzení): <strong>{profile.email}</strong></li>
                  <li>Tarif: <strong>{getPlan(profile.plan_id).name}</strong></li>
                  <li>Smlouva uzavřena: <strong>{formatCzDateLong(profile.plan_started_at)}</strong></li>
                </ul>
                <div className="settings-form-actions">
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleWithdraw}
                    disabled={busy}
                  >
                    {busy && <span className="btn-spinner" aria-hidden="true" />}
                    {busy ? 'Odstupuji…' : 'Potvrdit odstoupení od smlouvy'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setOpenForm(null);
                      setError(null);
                    }}
                  >
                    Ne, ponechat
                  </button>
                </div>
              </div>
            ) : (
              <div className="settings-row-actions">
                <p className="settings-section-text">
                  Do {formatCzDateLong(profile.withdrawalEndsAt)} můžeš od smlouvy odstoupit bez udání
                  důvodu a dostaneš zpět celou zaplacenou částku.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => openSection('withdraw', e.currentTarget)}
                >
                  Odstoupit od smlouvy
                </button>
              </div>
            ))}
        </section>

        {/* --- Sdílené odkazy --------------------------------------------- */}
        {(SHARING_ENABLED || shareLinks.length > 0) && (
        <section className="panel panel-lg settings-section">
          <div className="settings-section-head">
            <h2 className="settings-section-title">Sdílené odkazy</h2>
            <p className="settings-section-text">Tady můžeš kdykoli zrušit výsledkový nebo platební odkaz.</p>
          </div>
          {shareLinksError && <p className="settings-section-text" role="alert">{shareLinksError}</p>}
          {shareLinks.length === 0 ? (
            <p className="settings-section-text">Žádné sdílené odkazy.</p>
          ) : (
            <ul className="settings-share-links">
              {shareLinks.map((item) => (
                <li key={item.token}>
                  <div>
                    <strong>{item.kind === 'results' ? 'Výsledky dotazníku' : 'Odkaz k platbě pro rodiče'}</strong>
                    <span className="settings-section-text">Vytvořeno {formatCzDateLong(item.created_at)}</span>
                    {item.kind === 'payment' && item.expires_at && (
                      <span className="settings-section-text">Platí do {formatCzDateLong(item.expires_at)}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDeleteShareLink(item.token)}
                    disabled={deletingShareToken === item.token}
                  >
                    {deletingShareToken === item.token ? 'Ruším…' : 'Zrušit'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {shareRole === 'parent' ? (
            <p className="settings-section-text">
              Když odkaz k platbě zrušíte, rodič přes něj už nebude moct předplatné spravovat — zrušit ho pak můžete vy tady v Nastavení.
            </p>
          ) : (
            <p className="settings-section-text">
              Když odkaz k platbě zrušíš, rodič přes něj už nebude moct předplatné spravovat — zrušit ho pak můžeš ty tady v Nastavení.
            </p>
          )}
        </section>
        )}

        {/* --- Smazání účtu ---------------------------------------------- */}
        <section className="panel panel-lg settings-section settings-danger">
          <div className="settings-section-head">
            <h2 className="settings-section-title">Smazat účet</h2>
            <p className="settings-section-text">
              Trvale odstraní tvůj účet i všechno, co k němu patří: odpovědi v
              dotazníku, uložené školy, přihlášku, poznámky, zpětné vazby,
              recenze a případné předplatné. Tohle nejde vzít zpět.
            </p>
          </div>

          {openForm === 'delete' ? (
            <form id="settings-form-delete" onSubmit={handleDelete} className="settings-form settings-form-inset">
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
              onClick={(e) => openSection('delete', e.currentTarget)}
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
