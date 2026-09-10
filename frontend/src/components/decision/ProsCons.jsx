/**
 * Renders a school's cached pros/cons (school_ai_summary, written by
 * scripts/generate-school-proscons.js — see that script's header and plan
 * 006 §1.3 for why this is never generated live). A school with no summary
 * yet (script hasn't run, or the school was added since) renders nothing —
 * never a loading spinner, since this is never fetched on demand.
 */
function ProsCons({ summary }) {
  if (!summary || (!summary.pros?.length && !summary.cons?.length)) return null;

  return (
    <div className="dp-proscons">
      {summary.pros?.length > 0 && (
        <ul className="dp-proscons-list dp-proscons-pros">
          {summary.pros.map((p, i) => (
            <li key={i}>
              <span className="dp-proscons-sign" aria-hidden="true">+</span>
              {p}
            </li>
          ))}
        </ul>
      )}
      {summary.cons?.length > 0 && (
        <ul className="dp-proscons-list dp-proscons-cons">
          {summary.cons.map((c, i) => (
            <li key={i}>
              <span className="dp-proscons-sign" aria-hidden="true">−</span>
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProsCons;
