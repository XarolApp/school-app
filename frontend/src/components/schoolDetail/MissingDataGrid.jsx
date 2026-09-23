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
    return 'Veřejná škola — školné se neplatí. Ostatní poplatky (např. na pomůcky) zatím nemáme.';
  }
  return 'Nemáme tuto informaci.';
}

// Same "correct inference beats invented text" rule as tuitionBody() above —
// ma_dodatecne_pozadavky/alternativni_pedagogika are real false answers the
// extraction found explicit evidence for, not silence to pad over.
function pripijimaciBody(e) {
  if (e.pripijimaci_pozadavky_detail) return e.pripijimaci_pozadavky_detail;
  if (e.ma_dodatecne_pozadavky === false) return 'Podle webu školy jen jednotná přijímací zkouška (JPZ) — nic navíc.';
  return 'Nemáme tuto informaci.';
}

function vyukovyStylBody(e) {
  if (e.vyukovy_styl_detail) return e.vyukovy_styl_detail;
  if (e.alternativni_pedagogika === false) return 'Web nezmiňuje žádný alternativní pedagogický přístup (Montessori, Waldorf a podobně).';
  return 'Nemáme tuto informaci.';
}

function MissingDataGrid({ zrizovatel, extracted }) {
  const e = extracted || {};
  const cards = [
    { title: 'Školné a poplatky', body: e.skolne_poplatky || tuitionBody(zrizovatel) },
    { title: 'Obědy a ubytování', body: e.obedy_ubytovani || 'Nemáme tuto informaci.' },
    { title: 'Kroužky a aktivity', body: e.krouzky_aktivity || 'Nemáme tuto informaci.' },
    { title: 'Úspěšnost u maturity', body: e.maturita_uspesnost || 'Nemáme tuto informaci.' },
    { title: 'Kam míří absolventi', body: e.vs_uplatneni || 'Nemáme tuto informaci.' },
    { title: 'Uplatnění po vyučení', body: e.uplatneni_po_vyuceni || 'Nemáme tuto informaci.' },
    { title: 'Přijímací požadavky navíc', body: pripijimaciBody(e) },
    { title: 'Styl výuky', body: vyukovyStylBody(e) },
    { title: 'Fotky školy', body: 'Nemáme tuto informaci.' },
    { title: 'Video a prohlídka', body: 'Nemáme tuto informaci.' },
  ];

  return (
    <div className="sd-missing-grid" id="doplnujeme">
      {cards.map((c) => (
        <div className="sd-missing-card" key={c.title}>
          <div className="sd-missing-card-title">{c.title}</div>
          <div className="sd-missing-card-body">{c.body}</div>
        </div>
      ))}
    </div>
  );
}

export default MissingDataGrid;
