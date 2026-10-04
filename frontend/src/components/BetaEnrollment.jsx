import { BETA_ROLES } from '../lib/betaEnrollment';
export default function BetaEnrollment({ role, accepted, onRole, onAccepted }) {
  const parent = role === 'rodic' || role === 'ucitel';
  return <div className="stack beta-enrollment">
    <fieldset className="beta-role-fieldset">
      <legend className="ss-title-sm">{parent ? 'Kdo jste?' : 'Kdo jsi?'}</legend>
      <div className="beta-role-options">{BETA_ROLES.map((r) => <label key={r.id} className={`beta-role-option${role === r.id ? ' is-selected' : ''}`}>
        <input type="radio" name="beta-role" value={r.id} checked={role === r.id} onChange={() => onRole(r.id)} required />{r.label}
      </label>)}</div>
    </fieldset>
    <div className="notice">
      <p className="notice-title">Co během bety zaznamenáváme</p>
      <p className="notice-text">Navštívené stránky, použití funkcí, hledání škol, chyby a typ zařízení nám pomáhají zlepšit web. Nepoužíváme žádné analytické služby třetích stran, nové cookies ani otisk zařízení. Náhodný beta identifikátor uchováváme v úložišti prohlížeče jako součást testování a po registraci ho spojíme s beta účtem.</p>
      <p className="notice-text">Záznamy používání smažeme 6 měsíců po konci bety. Zpětné vazby, závěrečné odpovědi a nepovinné recenze si ponecháme pro vyhodnocení. Snímek stránky vzniká jen na vyžádání, po zakrytí polí; před odesláním ho lze odebrat.</p>
      <p className="notice-text">Základem zpracování je náš oprávněný zájem na testování produktu. Námitku lze jednoduše poslat na <a href="mailto:info@stredninamiru.cz">info@stredninamiru.cz</a>.</p>
    </div>
    <label className="consent-checkbox">
      <input type="checkbox" checked={accepted} onChange={(e) => onAccepted(e.target.checked)} required />
      <span>{parent ? 'Rozumím tomu, co při beta testování zaznamenáváte.' : 'Rozumím tomu, co při beta testování zaznamenáváte.'}</span>
    </label>
  </div>;
}
