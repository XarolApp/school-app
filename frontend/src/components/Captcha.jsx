import { useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile. Chosen over reCAPTCHA because it is free at any volume,
// needs no cookie banner, and usually solves itself without showing the user a
// puzzle. Supabase verifies the token server-side once Turnstile is enabled in
// its dashboard, so there is nothing to check in server.js.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Until keys are configured the forms have to keep working, otherwise the app
// is unusable in development. Every caller checks this before requiring a token.
export const captchaEnabled = Boolean(SITE_KEY);

let scriptPromise = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);

  // Cached, so mounting the widget on several pages loads the script once.
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('Turnstile se nepodařilo načíst.'));
      };
      document.head.appendChild(script);
    });
  }

  return scriptPromise;
}

/**
 * Renders the challenge and reports its token upward.
 *
 * `resetKey` exists because a Turnstile token is single-use: once a submit
 * fails, that token is spent and the widget has to be re-challenged before the
 * user can try again. The parent bumps this number after every failure.
 */
function Captcha({ onVerify, resetKey = 0 }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onVerifyRef = useRef(onVerify);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Kept in a ref so an inline arrow function in the parent does not tear down
  // and re-render the widget on every keystroke.
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    if (!captchaEnabled) return undefined;

    let cancelled = false;
    setLoadError(null);

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetIdRef.current = turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'auto',
          callback: (token) => {
            setLoadError(null);
            onVerifyRef.current(token);
          },
          // A token expires after a few minutes. Clearing it means a form left
          // open in a tab asks for a fresh challenge instead of submitting a
          // stale one and failing with a confusing error.
          'expired-callback': () => onVerifyRef.current(null),
          'error-callback': () => {
            setLoadError('Ověření se nepodařilo dokončit. Zkus ho načíst znovu.');
            onVerifyRef.current(null);
          },
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message || 'Ověření se nepodařilo načíst.');
          onVerifyRef.current(null);
        }
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [resetKey, retryKey]);

  if (!captchaEnabled) return null;

  return (
    <div className="captcha-field">
      <div ref={containerRef} />
      {loadError && (
        <div className="notice notice-error" role="alert">
          <p className="notice-text">{loadError}</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setRetryKey((key) => key + 1)}
          >
            Zkusit ověření znovu
          </button>
        </div>
      )}
    </div>
  );
}

export default Captcha;
