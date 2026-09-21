export default function ConsentCheckbox({ id, checked, onChange }) {
  return (
    <label className="checkbox-row" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required
      />
      <span>
        Je mi alespoň 15 let, nebo mám souhlas rodiče či zákonného zástupce, a souhlasím s{' '}
        <a href="/obchodni-podminky" target="_blank" rel="noreferrer">
          obchodními podmínkami
        </a>{' '}
        a{' '}
        <a href="/ochrana-osobnich-udaju" target="_blank" rel="noreferrer">
          zásadami ochrany osobních údajů
        </a>
        .
      </span>
    </label>
  );
}
