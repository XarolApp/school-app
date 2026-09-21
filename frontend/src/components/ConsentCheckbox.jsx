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
        beru na vědomí{' '}
        <a href="/ochrana-osobnich-udaju" target="_blank" rel="noreferrer">
          zásady ochrany osobních údajů
        </a>
        .
      </span>
    </label>
  );
}
