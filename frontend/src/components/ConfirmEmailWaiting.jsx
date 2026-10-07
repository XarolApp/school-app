import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import Captcha, { captchaEnabled } from './Captcha';
import {
  RESEND_COOLDOWN_SECONDS, readPendingConfirmation, savePendingConfirmation, clearPendingConfirmation,
} from '../lib/pendingConfirmation';

// How often we look for the session the confirmation tab wrote. supabase-js
// also pushes it across tabs, so this is the safety net, not the main route.
const POLL_MS = 2500;

/**
 * "Check your inbox" body shared by the plain sign-up and the onboarding
 * sign-up. It never shows a spinner (that reads as "still sending"); it states
 * that the mail is sent, offers a resend after the cooldown, and calls
 * `onConfirmed` by itself once the link has been opened in another tab.
 *
 * `variant="ob"` uses the onboarding button classes.
 */
export default function ConfirmEmailWaiting({
  email, parent = false, betaCode = null, emailRedirectTo, onConfirmed, onChangeEmail, children, variant = 'page', source = 'signup',
}) {
  const { isSignedIn, emailConfirmed, profileLoading, adoptStoredSession, resendConfirmation } = useAuth();
  const [now, setNow] = useState(Date.now());
  const [sentAt, setSentAt] = useState(() => {
    const pending = readPendingConfirmation(source);
    return pending?.email === email ? pending.sentAt : Date.now();
  });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

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

  const secondsLeft = Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_SECONDS * 1000 - now) / 1000));
  const canResend = secondsLeft === 0 && !sending && (!captchaEnabled || Boolean(captchaToken));

  const resend = useCallback(async () => {
    setSending(true);
    setStatus(null);
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
  }, [resendConfirmation, email, captchaToken, emailRedirectTo, betaCode, parent]);

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
