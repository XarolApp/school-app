import { analyseSet, VERDICT_COPY, BANDS } from '../../lib/admissionRisk';

const ORDER = ['jistota', 'realna', 'risk'];

/**
 * The right-rail "rozbor" card on /prihlaska and the read-only equivalent on
 * /sdileni/:token. Zero-shame constraint (onboarding-architect §0, applies
 * app-wide): every verdict sentence describes what the DATA says, never what
 * the student is or isn't capable of — see VERDICT_COPY in lib/admissionRisk.js,
 * which is the single place this wording lives.
 */
function RiskSummary({ picks, studentPoints }) {
  const { counts, verdict } = analyseSet(picks, studentPoints);
  const total = counts.jistota + counts.realna + counts.risk;

  return (
    <div className="dp-risk">
      <div className="dp-risk-counts">
        {ORDER.map((key) => (
          <div className={`dp-risk-count dp-risk-count-${BANDS[key].tone}`} key={key}>
            <div className="dp-risk-count-value">{counts[key]}</div>
            <div className="dp-risk-count-label">{BANDS[key].label}</div>
          </div>
        ))}
      </div>

      <p className="dp-risk-verdict">
        <span aria-hidden="true">{verdict === 'vyvazene' ? '✅' : verdict === 'bezBodu' || verdict === 'neuplne' ? 'ℹ️' : '⚠️'}</span>{' '}
        {VERDICT_COPY[verdict]}
      </p>

      {total > 0 && (
        <p className="dp-risk-caveat">
          Odhad, ne záruka. Počítáme z loňské hranice oboru — ta se každý rok mění podle počtu přihlášek a
          obtížnosti testu.
        </p>
      )}
    </div>
  );
}

export default RiskSummary;
