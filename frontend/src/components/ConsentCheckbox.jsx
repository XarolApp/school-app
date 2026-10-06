// `adult` drops the age clause for someone who declared themselves a parent or
// teacher: the age line exists for minors (GDPR Art. 8, Czech threshold 15),
// and accepting the terms is still required. `error` replaces the browser's own
// "Chcete-li pokračovat…" bubble, so the field carries no `required`; the
// caller validates on submit.
export default function ConsentCheckbox({ id, checked, onChange, adult = false, error = '' }) {
  return (
    <div className="consent-field">
      <label className={`checkbox-row consent-row${error ? ' is-invalid' : ''}`} htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <span>
          {adult ? 'Souhlasím s ' : 'Je mi alespoň 15 let, nebo mám souhlas rodiče či zákonného zástupce, a souhlasím s '}
          <a href="/obchodni-podminky" target="_blank" rel="noreferrer">
            obchodními podmínkami
          </a>{' '}
          a beru na vědomí{' '}
          <a href="/ochrana-osobnich-udaju" target="_blank" rel="noreferrer">
            zásady ochrany osobních údajů
          </a>
          .
        </span>
      </label>
      {error && <span className="field-error" id={`${id}-error`} role="alert">{error}</span>}
    </div>
  );
}
