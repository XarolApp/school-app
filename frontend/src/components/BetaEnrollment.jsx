import { BETA_ROLES, BETA_ROLE_NOTE_MAX } from '../lib/betaEnrollment';
export default function BetaEnrollment({ role, roleNote = '', accepted, onRole, onRoleNote, onAccepted, showErrors = false }) {
  const parent = role === 'rodic' || role === 'ucitel';
  const noteMissing = role === 'jine' && !roleNote.trim();
  return <div className="stack beta-enrollment">
    <fieldset className="beta-role-fieldset">
      <legend className="ss-headline-sm">{parent ? 'Kdo jste?' : 'Kdo jsi?'}</legend>
      <div className="beta-role-options">{BETA_ROLES.map((r) => <label key={r.id} className={`beta-role-option${role === r.id ? ' is-selected' : ''}`}>
        <input type="radio" name="beta-role" value={r.id} checked={role === r.id} onChange={() => onRole(r.id)} aria-invalid={showErrors && !role} />{r.label}
      </label>)}</div>
      {showErrors && !role && <span className="field-error" role="alert" id="beta-role-error">{parent ? 'Vyberte, kdo jste.' : 'Vyber, kdo jsi.'}</span>}
      {role === 'jine' && <div className="field beta-role-note">
        <label className="field-label" htmlFor="beta-role-note">Kdo tedy jsi?</label>
        <input id="beta-role-note" className="input" type="text" maxLength={BETA_ROLE_NOTE_MAX} value={roleNote}
          placeholder="Např. 7. třída, student SŠ, výchovný poradce…" onChange={(e) => onRoleNote(e.target.value)}
          aria-invalid={showErrors && noteMissing} />
        {showErrors && noteMissing && <span className="field-error" role="alert">Napiš prosím krátce, kdo jsi.</span>}
      </div>}
    </fieldset>
    <div className="notice">
      <p className="notice-title">Co během bety zaznamenáváme</p>
      <p className="notice-text">Navštívené stránky, použití funkcí, hledání škol, chyby a typ zařízení nám pomáhají zlepšit web. Nepoužíváme žádné analytické služby třetích stran, nové cookies ani otisk zařízení. Náhodný beta identifikátor ukládáme do úložiště prohlížeče a po registraci ho spojíme s beta účtem.</p>
      <p className="notice-text">Záznamy používání smažeme 6 měsíců po konci bety, zpětné vazby a závěrečné odpovědi nejpozději po 12 měsících. Snímek stránky vzniká jen na vyžádání, po zakrytí polí; před odesláním ho lze odebrat.</p>
      <p className="notice-text">Zaznamenáváme to jen s tvým souhlasem. Odvolat ho můžeš kdykoli jedním klepnutím v Nastavení (přepínač „Záznam používání“) — testovat můžeš dál. Je-li ti méně než 15 let, souhlas dáváš společně s rodičem nebo zákonným zástupcem.</p>
    </div>
    <label className={`checkbox-row consent-row${showErrors && !accepted ? ' is-invalid' : ''}`}>
      <input type="checkbox" checked={accepted} onChange={(e) => onAccepted(e.target.checked)} aria-invalid={showErrors && !accepted} />
      <span>Souhlasím s tím, že se při testování zaznamenává, jak web používám (viz výše). Souhlas mohu kdykoli odvolat.</span>
    </label>
    {showErrors && !accepted && <span className="field-error" role="alert">{parent ? 'Bez souhlasu se záznamem používání se testování nelze zúčastnit.' : 'Bez souhlasu se záznamem používání se testování nejde zúčastnit.'}</span>}
  </div>;
}
