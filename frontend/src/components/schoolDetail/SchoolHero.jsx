import { summarizeCurrentYear } from '../../lib/schoolPrograms';
import { oborWord } from '../../lib/pluralCz';
import InfoHint from './InfoHint';

function ukonceniLabel(entries) {
  const anyMaturita = entries.some((e) => e.maturitni === true);
  const anyVyucni = entries.some((e) => e.maturitni === false);
  if (anyMaturita && anyVyucni) return 'maturitní i výuční list';
  if (anyMaturita) return 'maturitní';
  if (anyVyucni) return 'výuční list';
  return null;
}

// Czech decimal comma, matching every other number in the app (Search.jsx's
// numCz, ProgramCard's numCz) — "46,9 %", never "46.9 %".
function fmt(value, unit) {
  return value == null ? '—' : `${String(value).replace('.', ',')}${unit}`;
}

// A fact tile with a hover-to-reveal explanation (CSS-only tooltip, see
// InfoHint) — matches the same pattern as the search list's stat cells.
function FactTile({ value, label, note }) {
  return (
    <div className="sd-fact-tile">
      <div className="sd-fact-value">{value}</div>
      <div className="sd-fact-label-row">
        <span className="sd-fact-label">{label}</span>
        <InfoHint text={note} />
      </div>
    </div>
  );
}

/**
 * Above-the-fold identity + the disqualifying facts, per the Mobbin
 * "identity, price, 3-4 disqualifying facts above the fold" pattern already
 * used elsewhere in this app's design guide.
 */
function SchoolHero({ school, programEntries }) {
  const zrizovatel = programEntries.find((e) => e.zrizovatel)?.zrizovatel ?? null;
  const ukonceni = ukonceniLabel(programEntries);
  const current = summarizeCurrentYear(programEntries);

  return (
    <div className="sd-hero-main">
      <div className="sd-title-block">
        <h1 className="ss-headline-lg">{school.name}</h1>
        <div className="sd-address">{school.location}</div>
      </div>

      <div className="sd-chips">
        {school.district && <span className="sd-chip">{school.district}</span>}
        {zrizovatel && <span className="sd-chip">{zrizovatel}</span>}
        {ukonceni && <span className="sd-chip">{ukonceni}</span>}
        {current.oborCount > 0 && (
          <span className="sd-chip">
            {current.oborCount} {oborWord(current.oborCount)}
            {current.year ? ` pro ${current.year}` : ''}
          </span>
        )}
      </div>

      <div className="sd-fact-tiles">
        <FactTile
          value={fmt(school.admission_cutoff, ' b.')}
          label="Průměrná hranice"
          note="Průměr z posledních 3 let (2024–2026), přes všechny obory školy. Je to nejnižší počet bodů z češtiny a matematiky (max. 100 — 50 + 50), který stačil na přijetí — je to spodní hranice pro přijetí, ne průměrné skóre, které přijatí uchazeči skutečně měli. Přesnou hranici pro konkrétní obor a rok najdeš u jednotlivých oborů níž. (Nové školy mohou mít kratší historii.)"
        />
        <FactTile
          value={fmt(school.acceptance_rate, ' %')}
          label="Přijato z přihlášených"
          note="Průměr z posledních 3 let (2024–2026), přes všechny obory školy. Je to kolik procent uchazečů škola v posledním kole přijala — u jednotlivých oborů se to může dost lišit, podrobnosti najdeš níž. (Nové školy mohou mít kratší historii.)"
        />
        <FactTile
          value={fmt(current.kapacita, '')}
          label={current.year ? `Míst ${current.year}` : 'Míst'}
          note={`Celkový počet míst ve všech oborech, které škola otevírá pro rok ${current.year ?? 'letos'}. Obory, které se už neotevírají, se do tohoto čísla nepočítají.`}
        />
        <FactTile
          value={fmt(current.ratio, '×')}
          label="Uchazečů na místo"
          note="Průměr z posledních 3 let (2024–2026), přes všechny obory školy. Je to kolik uchazečů si podalo přihlášku na jedno volné místo — konkurence se obor od oboru liší, podrobnosti najdeš níž. (Nové školy mohou mít kratší historii.)"
        />
      </div>
      <div className="sd-provenance">
        Čísla z Cermatu, 1. kolo přijímaček. Hranice a míra přijetí jsou průměr
        přes všechny obory školy.
      </div>
    </div>
  );
}

export default SchoolHero;
