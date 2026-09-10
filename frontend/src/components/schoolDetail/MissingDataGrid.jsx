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

function MissingDataGrid({ zrizovatel }) {
  const cards = [
    { title: 'Školné a poplatky', body: tuitionBody(zrizovatel) },
    { title: 'Obědy a ubytování', body: 'Nemáme tuto informaci.' },
    { title: 'Kroužky a aktivity', body: 'Nemáme tuto informaci.' },
    { title: 'Úspěšnost u maturity', body: 'Nemáme tuto informaci.' },
    { title: 'Kam míří absolventi', body: 'Nemáme tuto informaci.' },
    { title: 'Uplatnění po vyučení', body: 'Nemáme tuto informaci.' },
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
