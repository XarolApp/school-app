import { useState } from 'react';

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.6 10S4.6 4.6 10 4.6 18.4 10 18.4 10 15.4 15.4 10 15.4 1.6 10 1.6 10Z" />
      <circle cx="10" cy="10" r="2.4" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.3 4.8A7.8 7.8 0 0 1 10 4.6c5.4 0 8.4 5.4 8.4 5.4a15.3 15.3 0 0 1-2.5 3.2" />
      <path d="M5.3 6.2A14.9 14.9 0 0 0 1.6 10s3 5.4 8.4 5.4a8 8 0 0 0 3.8-.9" />
      <path d="M8.3 8.3a2.4 2.4 0 0 0 3.4 3.4" />
      <path d="M3 3l14 14" />
    </svg>
  );
}

/**
 * A password field with a reveal toggle.
 *
 * Typing a long password blind is where most sign-in failures actually come
 * from, and it is worse here than on an English site: Czech keyboards put
 * diacritics on a dead key, and a phone keyboard hides the character a moment
 * after it is typed.
 *
 * Everything except `type` is forwarded, so callers keep control of
 * `autoComplete`, `minLength` and the rest — those genuinely differ per field
 * (`current-password` when signing in, `new-password` when choosing one) and
 * getting them wrong breaks password managers.
 */
function PasswordInput({ visibleLabel, ...inputProps }) {
  const [visible, setVisible] = useState(false);

  // The label has to say what the button will DO, not what the field is
  // currently showing — a screen reader announces it as an action.
  const label = visible ? 'Skrýt heslo' : 'Zobrazit heslo';

  return (
    <div className="password-field">
      <input
        {...inputProps}
        className="input password-field-input"
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        className="password-field-toggle"
        onClick={() => setVisible((current) => !current)}
        // Without type="button" this would submit the form it sits in.
        aria-label={visibleLabel ? `${label} — ${visibleLabel}` : label}
        aria-pressed={visible}
        title={label}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default PasswordInput;
