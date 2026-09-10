/**
 * Cutoff is shown in POINTS (max 100 = 50 ČJ + 50 MA), not percent — Cermat's
 * own aggregated skolobory file only ever includes students on the standard
 * 50+50 test (accommodated students taking a modified test are excluded from
 * that file entirely), so 1 % SKÓR literally equals 1 point here and there is
 * nothing lost by showing the number a 15-year-old already knows how to read.
 * Kept as its own callout because the repo owner himself first misread a
 * school's cutoff as an average score rather than a minimum bar — that
 * confusion is about "minimum vs average", not about units, so the copy
 * below still needs to say it out loud.
 */
function CutoffExplainer() {
  return (
    <div className="sd-explainer">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--acc)" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-5" />
        <path d="M12 8h.01" />
      </svg>
      <div>
        <div className="sd-explainer-title">Hranice je minimum, ne průměr</div>
        <div className="sd-explainer-body">
          Je to počet bodů z češtiny a matematiky (max. 100 — 50 + 50), který
          loni stačil na přijetí. Je to spodní hranice pro přijetí, ne
          průměrné skóre, které přijatí uchazeči skutečně měli.
        </div>
      </div>
    </div>
  );
}

export default CutoffExplainer;
