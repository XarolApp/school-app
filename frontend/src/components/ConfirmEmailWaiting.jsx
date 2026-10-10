import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useG } from '../lib/gender';
import { fetchConfirmationStatus } from '../api';
import Captcha, { captchaEnabled } from './Captcha';
import {
  RESEND_COOLDOWN_SECONDS, readPendingConfirmation, savePendingConfirmation, clearPendingConfirmation,
} from '../lib/pendingConfirmation';

// How often we look for the session the confirmation tab wrote. supabase-js
// also pushes it across tabs, so this is the safety net, not the main route.
const POLL_MS = 2500;
// How often we ask the server whether the link was opened in any browser. A
// different browser or private window shares no storage with this one, so only
// the server knows; once it says yes we sign in with the password typed here.
const STATUS_POLL_MS = 4000;

/**
 * "Check your inbox" body shared by the plain sign-up and the onboarding
 * sign-up. It never shows a spinner (that reads as "still sending"); it states
 * that the mail is sent, offers a resend after the cooldown, and calls
 * `onConfirmed` by itself once the link has been opened in another tab.
 *
 * `variant="ob"` uses the onboarding button classes.
 */
export default function ConfirmEmailWaiting({
  email, password = '', userId = null, parent = false, betaCode = null, emailRedirectTo, onConfirmed, onChangeEmail, children, variant = 'page', source = 'signup',
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
  const [confirmedElsewhere, setConfirmedElsewhere] = useState(false);
  const checkingRef = useRef(false);
  const captchaTokenRef = useRef(null);

  useEffect(() => {
    savePendingConfirmation({ email, userId, betaCode, parent, emailRedirectTo, sentAt, source });
  }, [email, userId, betaCode, parent, emailRedirectTo, sentAt, source]);

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

  // Same-browser route first; otherwise ask the server, and once the link has
  // been opened anywhere, sign in with the password typed a moment ago (memory
  // only). Without it (after a reload) we say it is confirmed and offer login.
  // `manual` is the button: it reports a "not yet" answer.
  const checkConfirmed = useCallback(async ({ manual = false } = {}) => {
    if (checkingRef.current || confirmedElsewhere) return;
    checkingRef.current = true;
    if (manual) { setChecking(true); setStatus(null); }
    const loginHint = parent ? 'přihlaste se tlačítkem „Už mám účet“ níže.' : 'přihlas se tlačítkem „Už mám účet“ níže.';
    try {
      await adoptStoredSession();
      if (!userId) {
        if (manual) setStatus({ kind: 'error', text: `Potvrzení odsud nevidíme. Pokud ${parent ? 'jste odkaz otevřeli' : `jsi odkaz ${g('otevřel', 'otevřela')}`}, ${loginHint}` });
        return;
      }
      let confirmed = false;
      try { ({ confirmed } = await fetchConfirmationStatus(userId)); } catch (err) {
        if (manual) setStatus({ kind: 'error', text: err.message });
        return;
      }
      if (!confirmed) {
        if (manual) setStatus({ kind: 'info', text: parent ? 'Zatím nevidíme potvrzení. Klikněte na odkaz v e-mailu a zkuste to znovu.' : 'Zatím nevidíme potvrzení. Klikni na odkaz v e-mailu a zkus to znovu.' });
        return;
      }
      const token = captchaTokenRef.current;
      if (password && captchaEnabled && !token) return; // the next poll retries once the widget has a token
      if (password) {
        const result = await signIn(email, password, { captchaToken: token, remember: true });
        if (captchaEnabled) { setCaptchaToken(null); setCaptchaKey((key) => key + 1); }
        if (!result.error) return; // the signed-in effect continues the flow
      }
      setConfirmedElsewhere(true);
      setStatus({ kind: 'ok', text: `E-mail je ${parent ? 'potvrzený. Teď se, prosím,' : 'potvrzený. Teď se'} ${loginHint}` });
    } finally {
      checkingRef.current = false;
      if (manual) setChecking(false);
    }
  }, [adoptStoredSession, signIn, email, password, userId, parent, g, confirmedElsewhere]);

  useEffect(() => {
    if (!userId || confirmedElsewhere) return undefined;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void checkConfirmed(); }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [userId, confirmedElsewhere, checkConfirmed]);

  const secondsLeft = Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000));
  const canResend = secondsLeft === 0 && !sending && (!captchaEnabled || Boolean(captchaToken));

  const resend = useCallback(async () => {
    setSending(true);
    setStatus(null);
    // A CAPTCHA token is single-use: reserve it for the resend operation.
    // Without CAPTCHA, first check whether the address is already confirmed;
    // Supabase's resend answers "ok" without sending mail for that address.
    if (password && !captchaEnabled) {
      const already = await signIn(email, password, { captchaToken, remember: true });
      if (!already.error) { setSending(false); return; }
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
        <button type="button" className={buttonClass} onClick={() => checkConfirmed({ manual: true })} disabled={checking || confirmedElsewhere}>
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
