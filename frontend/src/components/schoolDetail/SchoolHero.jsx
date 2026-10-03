import { summarizeCurrentYear, summarizeAdmission, formatCutoffRange } from '../../lib/schoolPrograms';
import { oborWord } from '../../lib/pluralCz';
import { matchBand } from '../../lib/decisionMatrix';
import { Clock } from 'lucide-react';
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
const NO_DATA = 'bez dat';
function fmt(value, unit) {
  return value == null ? NO_DATA : `${String(value).replace('.', ',')}${unit}`;
}

// A fact tile with a hover-to-reveal explanation (CSS-only tooltip, see
// InfoHint) — matches the same pattern as the search list's stat cells.
function FactTile({ value, label, note, oldYear }) {
  return (
    <div className={`sd-fact-tile${oldYear ? ' is-old' : ''}`}>
      <div className={`sd-fact-value${value === NO_DATA ? ' is-empty' : ''}`}>{value}</div>
      <div className="sd-fact-label-row">
        <span className="sd-fact-label">{label}</span>
        <InfoHint text={note} />
      </div>
    </div>
  );
}

function OldDataBadge({ year }) {
  return (
    <span className="sd-old-badge">
      <Clock size={13} strokeWidth={2.2} aria-hidden="true" />
      Starší data, z roku {year}. Novější čísla škola zatím nemá.
    </span>
  );
}

/**
 * Above-the-fold identity + the disqualifying facts, per the Mobbin
 * "identity, price, 3-4 disqualifying facts above the fold" pattern already
 * used elsewhere in this app's design guide.
 */
function SchoolHero({ school, programEntries, extracted }) {
  const zrizovatel = programEntries.find((e) => e.zrizovatel)?.zrizovatel ?? null;
  const ukonceni = ukonceniLabel(programEntries);
  const current = summarizeCurrentYear(programEntries);
  const adm = summarizeAdmission(school);
  const year = adm?.year ?? current.year;
  const oldYear = adm?.isOld ? adm.year : null;
  const band = typeof school.match_score === 'number' ? matchBand(school.match_score) : null;
  const zacatekHodin = extracted?.zacatek_hodin;

  return (
    <div className="sd-hero-main">
      <div className="sd-title-block">
        <h1 className="ss-headline-lg">{school.name}</h1>
        {school.official_name && <div className="sd-address">{school.official_name}</div>}
        <div className="sd-address">{school.location}</div>
      </div>

      <div className="sd-chips">
        {band && (
          <span className={`sd-match-chip sd-match-chip-${band.tone}`}>
            {band.label} · {Math.round(school.match_score)} % shoda s tebou
          </span>
        )}
        {school.district && <span className="sd-chip">{school.district}</span>}
        {zrizovatel && <span className="sd-chip">{zrizovatel}</span>}
        {ukonceni && <span className="sd-chip">{ukonceni}</span>}
        {current.oborCount > 0 && (
          <span className="sd-chip">
            {current.oborCount} {oborWord(current.oborCount)}
            {current.year ? ` pro ${current.year}` : ''}
          </span>
        )}
        {typeof zacatekHodin === 'number' && (
          <span className="sd-chip">Výuka od {zacatekHodin}:00</span>
        )}
      </div>

      {oldYear && (
        <OldDataBadge year={oldYear} />
      )}
      <div className="sd-fact-tiles">
        <FactTile
          value={formatCutoffRange(adm) ?? NO_DATA}
          label={year ? `Hranice přijetí ${year}` : 'Hranice přijetí'}
          oldYear={oldYear}
          note={`Nejnižší počet bodů z češtiny a matematiky (max. 100, tedy 50 + 50), který v roce ${year ?? ''} stačil na přijetí. Každý obor má vlastní hranici, proto ukazujeme rozpětí: od oboru s nejnižší hranicí po obor s nejvyšší. Hranici konkrétního oboru najdeš níž.`}
        />
        <FactTile
          value={fmt(adm?.acceptance ?? null, ' %')}
          label={year ? `Přijato ${year}` : 'Přijato z přihlášených'}
          oldYear={oldYear}
          note={`Kolik procent přihlášených škola v roce ${year ?? ''} přijala: všichni přijatí dělení všemi přihlášenými, ve všech oborech dohromady.`}
        />
        <FactTile
          value={fmt(current.kapacita, '')}
          label={current.year ? `Míst ${current.year}` : 'Míst'}
          oldYear={oldYear}
          note={`Kolik míst škola otevírala ve všech oborech v přijímačkách ${current.year ?? ''}. Na další rok se počet může změnit. Obory, které se už neotevírají, se do čísla nepočítají.`}
        />
        <FactTile
          value={fmt(current.ratio, '×')}
          label={current.year ? `Uchazečů na místo ${current.year}` : 'Uchazečů na místo'}
          oldYear={oldYear}
          note={`Kolik přihlášek připadlo v roce ${current.year ?? ''} na jedno volné místo, ve všech oborech dohromady. Konkurence se obor od oboru liší, podrobnosti najdeš níž.`}
        />
      </div>
      <div className="sd-provenance">
        Čísla z Cermatu, 1. kolo přijímaček {year ?? ''}.
 Předchozí roky najdeš v grafu vývoje níž.
      </div>
    </div>
  );
}

export default SchoolHero;
