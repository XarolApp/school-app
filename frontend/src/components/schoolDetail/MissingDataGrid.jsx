import { useState } from 'react';
import {
  Wallet,
  Utensils,
  Music,
  GraduationCap,
  Compass,
  Briefcase,
  ClipboardList,
  Presentation,
  Image,
  Video,
} from 'lucide-react';
import { numCz } from '../../lib/comparisonRows';

const EMPTY_INFO = 'Nemáme tuto informaci.';

/**
 * Every §4 feature with no real data source. Each renders as its OWN
 * visible section rather than being silently omitted — per the user's
 * decision, an empty page looks broken, but a labelled "we don't have this
 * yet" is honest and sets an expectation instead of implying the data was
 * never planned.
 *
 * The tuition card is the one exception that isn't a placeholder: a public
 * school's fees are zero by law (školský zákon), which is a real fact we can
 * state from the `zrizovatel` column we already hold — not an invented
 * number, a correct inference from real data.
 */
function tuitionBody(zrizovatel) {
  if (zrizovatel === 'veřejné/státní') {
    return 'Veřejná škola, školné se neplatí. Ostatní poplatky (např. na pomůcky) zatím nemáme.';
  }
  return EMPTY_INFO;
}

// Same "correct inference beats invented text" rule as tuitionBody() above —
// ma_dodatecne_pozadavky/alternativni_pedagogika are real false answers the
// extraction found explicit evidence for, not silence to pad over.
function pripijimaciBody(e) {
  if (e.pripijimaci_pozadavky_detail) return e.pripijimaci_pozadavky_detail;
  if (e.ma_dodatecne_pozadavky === false) return 'Podle webu školy jen jednotná přijímací zkouška (JPZ), nic navíc.';
  return EMPTY_INFO;
}

function vyukovyStylBody(e) {
  if (e.vyukovy_styl_detail) return e.vyukovy_styl_detail;
  if (e.alternativni_pedagogika === false) return 'Web nezmiňuje žádný alternativní pedagogický přístup (Montessori, Waldorf a podobně).';
  return EMPTY_INFO;
}

// Same fallback rule: import-maturita-data.js writes maturita_pass_rate_pct
// straight to Supabase, but a school it never matched (not in Cermat's file)
// can still have a number here from Phase 2's own website extraction, with
// no paired sentence — don't show "no data" when a real number exists.
function maturitaBody(e) {
  if (e.maturita_uspesnost) return e.maturita_uspesnost;
  if (e.maturita_pass_rate_pct != null) return `${e.maturita_pass_rate_pct} % úspěšnost u maturity (dle webu školy).`;
  return EMPTY_INFO;
}

function MissingDataGrid({ zrizovatel, extracted }) {
  const e = extracted || {};
  const [expanded, setExpanded] = useState(() => new Set());
  const cards = [
    { title: 'Školné a poplatky', body: e.skolne_poplatky || tuitionBody(zrizovatel), Icon: Wallet },
    { title: 'Obědy a ubytování', body: e.obedy_ubytovani || EMPTY_INFO, Icon: Utensils },
    { title: 'Kroužky a aktivity', body: e.krouzky_aktivity || EMPTY_INFO, Icon: Music },
    { title: 'Úspěšnost u maturity', body: maturitaBody(e), Icon: GraduationCap, figure: e.maturita_pass_rate_pct != null ? `${numCz(e.maturita_pass_rate_pct)} %` : null },
    { title: 'Kam míří absolventi', body: e.vs_uplatneni || EMPTY_INFO, Icon: Compass },
    { title: 'Uplatnění po vyučení', body: e.uplatneni_po_vyuceni || EMPTY_INFO, Icon: Briefcase },
    { title: 'Přijímací požadavky navíc', body: pripijimaciBody(e), Icon: ClipboardList },
    { title: 'Styl výuky', body: vyukovyStylBody(e), Icon: Presentation },
    { title: 'Fotky školy', body: EMPTY_INFO, Icon: Image },
    { title: 'Video a prohlídka', body: EMPTY_INFO, Icon: Video },
  ];
  const filledCards = cards.filter((card) => card.body !== EMPTY_INFO);
  const emptyTitles = cards.filter((card) => card.body === EMPTY_INFO).map((card) => card.title);
  const lowerFirst = (title) => title.charAt(0).toLocaleLowerCase('cs-CZ') + title.slice(1);
  const emptyList = emptyTitles.map(lowerFirst);
  const joinedEmptyTitles = emptyList.join(', ');

  const toggleExpanded = (title) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <div id="doplnujeme">
      {filledCards.length > 0 && (
        <div className="sd-missing-grid">
          {filledCards.map((c) => {
            const Icon = c.Icon;
            const isLong = c.body.length > 220;
            const isExpanded = expanded.has(c.title);

            return (
              <div className="sd-missing-card" key={c.title}>
                <div className="sd-missing-card-title">
                  <Icon size={16} aria-hidden="true" />
                  {c.title}
                </div>
                {c.figure != null && <div className="sd-card-figure">{c.figure}</div>}
                <div className={`sd-missing-card-body${isLong && !isExpanded ? ' is-clamped' : ''}`}>{c.body}</div>
                {isLong && (
                  <button
                    type="button"
                    className="sd-missing-card-toggle"
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(c.title)}
                  >
                    {isExpanded ? 'Zobrazit méně' : 'Zobrazit celé'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {emptyTitles.length > 0 && (
        <p className="sd-missing-line">
          <strong>Zatím nemáme:</strong> {joinedEmptyTitles}. Doplňujeme je postupně.
        </p>
      )}
    </div>
  );
}

export default MissingDataGrid;
