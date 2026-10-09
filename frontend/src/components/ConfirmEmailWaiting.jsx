import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useG } from '../lib/gender';
import Captcha, { captchaEnabled } from './Captcha';
import {
  RESEND_COOLDOWN_SECONDS, readPendingConfirmation, savePendingConfirmation, clearPendingConfirmation,
} from '../lib/pendingConfirmation';

// How often we look for the session the confirmation tab wrote. supabase-js
// also pushes it across tabs, so this is the safety net, not the main route.
const POLL_MS = 2500;
// How often we try the password sign-in, which is what works when the link was
// opened in a different browser (or a private window) that shares no storage.
const PASSWORD_POLL_MS = 12000;

/**
 * "Check your inbox" body shared by the plain sign-up and the onboarding
 * sign-up. It never shows a spinner (that reads as "still sending"); it states
 * that the mail is sent, offers a resend after the cooldown, and calls
 * `onConfirmed` by itself once the link has been opened in another tab.
 *
 * `variant="ob"` uses the onboarding button classes.
 */
export default function ConfirmEmailWaiting({
  email, password = '', parent = false, betaCode = null, emailRedirectTo, onConfirmed, onChangeEmail, children, variant = 'page', source = 'signup',
}) {
  const g = useG();
  const { isSignedIn, emailConfirmed, profileLoading, adoptStoredSession, resendConfirmation, signIn } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [sentAt, setSentAt] = useState(() => {
    const pending = readPendingConfirmation(source);
    return pending?.email === email ? pending.sentAt : Date.now();
  });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const checkingRef = useRef(false);
  const captchaTokenRef = useRef(null);

  useEffect(() => {
    savePendingConfirmation({ email, betaCode, parent, emailRedirectTo, sentAt, source });
  }, [email, betaCode, parent, emailRedirectTo, sentAt, source]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const check = () => { void adoptStoredSession(); };
    const timer = setInterval(check, POLL_MS);
    const visible = () => { if (document.visibilityState === 'visible') check(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(timer); window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', visible); };
  }, [adoptStoredSession]);

  useEffect(() => {
    if (isSignedIn && emailConfirmed && !profileLoading) {
      clearPendingConfirmation();
      onConfirmed();
    }
  }, [isSignedIn, emailConfirmed, profileLoading, onConfirmed]);

  useEffect(() => { captchaTokenRef.current = captchaToken; }, [captchaToken]);

  // Same-browser route first; otherwise sign in with the password typed a moment
  // ago (kept in memory only). That succeeds exactly when the link was opened,
  // wherever. `manual` is the button: it reports a "not yet" answer.
  const checkConfirmed = useCallback(async ({ manual = false } = {}) => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    if (manual) { setChecking(true); setStatus(null); }
    try {
      await adoptStoredSession();
      if (!password) {
        if (manual) setStatus({ kind: 'error', text: parent ? 'Potvrzení zatím nevidíme. Pokud jste odkaz otevřeli jinde, přihlaste se tlačítkem „Už mám účet“ níže.' : `Potvrzení zatím nevidíme. Pokud jsi odkaz ${g('otevřel', 'otevřela')} jinde, přihlas se tlačítkem „Už mám účet“ níže.` });
        return;
      }
      const token = captchaTokenRef.current;
      if (captchaEnabled && !token) return; // the next widget token triggers another try
      const result = await signIn(email, password, { captchaToken: token, remember: true });
      if (captchaEnabled) { setCaptchaToken(null); setCaptchaKey((key) => key + 1); }
      if (!result.error) return; // the signed-in effect below continues the flow
      if (manual) {
        setStatus({ kind: result.needsEmailConfirmation ? 'info' : 'error', text: result.needsEmailConfirmation
          ? (parent ? 'Zatím nevidíme potvrzení. Klikněte na odkaz v e-mailu a zkuste to znovu.' : 'Zatím nevidíme potvrzení. Klikni na odkaz v e-mailu a zkus to znovu.')
          : result.error });
      }
    } finally {
      checkingRef.current = false;
      if (manual) setChecking(false);
    }
  }, [adoptStoredSession, signIn, email, password, parent, g]);

  useEffect(() => {
    if (!password) return undefined;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void checkConfirmed(); }, PASSWORD_POLL_MS);
    return () => clearInterval(timer);
  }, [password, checkConfirmed]);

  const secondsLeft = Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000));
  const canResend = secondsLeft === 0 && !sending && (!captchaEnabled || Boolean(captchaToken));

  const resend = useCallback(async () => {
    setSending(true);
    setStatus(null);
    // Supabase sends nothing for an address that is already confirmed, and still
    // answers "ok". Check first so that case signs in instead of waiting.
    if (password && (!captchaEnabled || captchaToken)) {
      const already = await signIn(email, password, { captchaToken, remember: true });
      if (!already.error) { setSending(false); return; }
      if (captchaEnabled) { setCaptchaToken(null); setCaptchaKey((key) => key + 1); setSending(false); setStatus({ kind: 'info', text: 'Ještě to nevypadá potvrzené. Počkej pár sekund na nové ověření a pošli odkaz znovu.' }); return; }
    }
    const result = await resendConfirmation(email, {
      captchaToken, emailRedirectTo, ...(betaCode ? { betaSchoolCode: betaCode } : {}),
    });
    setSending(false);
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);
    if (result.error) {
      setStatus({ kind: 'error', text: result.error });
      return;
    }
    setSentAt(Date.now());
    setNow(Date.now());
    setStatus({ kind: 'ok', text: parent ? 'Poslali jsme nový odkaz. Ten starý přestal platit.' : 'Poslali jsme nový odkaz. Ten starý přestal platit.' });
  }, [resendConfirmation, signIn, password, email, captchaToken, emailRedirectTo, betaCode, parent]);

  const buttonClass = variant === 'ob' ? 'ob-btn ob-btn-secondary' : 'btn btn-secondary btn-block';

  return (
    <>
      <div className="notice confirm-waiting">
        <span className="notice-title">{parent ? 'Potvrďte svůj e-mail' : 'Potvrď svůj e-mail'}</span>
        <p className="notice-text">
          {parent
            ? <>Poslali jsme odkaz na <strong>{email}</strong>. Klikněte na něj. Otevře se v novém okně, které pak můžete zavřít. Tady budeme pokračovat sami.</>
            : <>Poslali jsme odkaz na <strong>{email}</strong>. Klikni na něj. Otevře se v novém okně, které pak můžeš zavřít. Tady budeme pokračovat sami.</>}
        </p>
        {children}
      </div>

      <div className="confirm-resend">
        <p className="notice-text">
          {parent ? 'Mail nepřišel? Zkontrolujte spam a složku Hromadné. Mail může docházet i minutu.' : 'Mail nepřišel? Mrkni do spamu a do složky Hromadné. Mail může docházet i minutu.'}
        </p>
        <Captcha onVerify={setCaptchaToken} resetKey={captchaKey} />
        <button type="button" className={buttonClass} onClick={() => checkConfirmed({ manual: true })} disabled={checking || (captchaEnabled && Boolean(password) && !captchaToken)}>
          {checking ? 'Kontroluji…' : parent ? 'E-mail jsem už potvrdil' : `Už jsem e-mail ${g('potvrdil', 'potvrdila')}`}
        </button>
        <button type="button" className={buttonClass} onClick={resend} disabled={!canResend}>
          {secondsLeft > 0 ? `Poslat odkaz znovu (za ${secondsLeft} s)` : sending ? 'Odesílám…' : 'Poslat odkaz znovu'}
        </button>
        {status && (
          <p className={`field-hint confirm-status is-${status.kind}`} role={status.kind === 'error' ? 'alert' : 'status'}>{status.text}</p>
        )}
        {onChangeEmail && (
          <button type="button" className={variant === 'ob' ? 'ob-inline-link' : 'btn btn-ghost btn-block'} onClick={() => { clearPendingConfirmation(); onChangeEmail(); }}>
            {parent ? 'Špatný e-mail? Změnit adresu' : 'Špatný e-mail? Změnit adresu'}
          </button>
        )}
      </div>
    </>
  );
}
