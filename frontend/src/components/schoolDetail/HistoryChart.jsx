import { useId, useState } from 'react';

/**
 * The ONLY place older admission years are shown (everything else shows the
 * newest year). Same visual language as the landing-page chart: dashed year
 * guides, accent line, value above each point, newest year emphasised.
 *
 * `points` come from lib/schoolPrograms.js yearlyHistory(). A cutoff that
 * differs across obory in a year (a school with several obory) is drawn as a
 * min–max bar, never averaged into one line.
 */
const numCz = (v) => String(v).replace('.', ',');

const METRICS = [
  { id: 'hranice', label: 'Hranice', has: (p) => p.cutoffMin != null },
  { id: 'prihlasky', label: 'Přihlášky', has: (p) => p.prihlasky != null, value: (p) => p.prihlasky, fmt: String },
  { id: 'prijato', label: 'Přijato', has: (p) => p.acceptance != null, value: (p) => p.acceptance, fmt: (v) => `${Math.round(v)} %` },
  { id: 'mista', label: 'Místa', has: (p) => p.kapacita != null, value: (p) => p.kapacita, fmt: String },
];

const NOTES = {
  hranice: {
    range: 'Horní čára je obor s nejvyšší hranicí, dolní obor s nejnižší. Vybarvené pásmo mezi nimi je rozpětí hranic mezi obory školy.',
    line: 'Nejnižší počet bodů z češtiny a matematiky (max. 100), který v daném roce stačil na přijetí.',
  },
  prihlasky: 'Kolik přihlášek přišlo v 1. kole přijímaček.',
  prijato: 'Kolik procent přihlášených bylo přijato.',
  mista: 'Kolik míst se otevíralo.',
};

const W = 520;
const H = 210;
const BASE = H - 36; // year labels sit below this
const TOP = 30; // room for the value label above the highest point

function xAt(i, n) {
  return n === 1 ? W / 2 : 48 + (i * (W - 96)) / (n - 1);
}

function scaleFor(values) {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.35 || Math.max(1, Math.abs(hi) * 0.15);
  const L = Math.max(0, lo - pad);
  const U = hi + pad;
  return (v) => BASE - 14 - ((v - L) / (U - L || 1)) * (BASE - 14 - TOP);
}

function HistoryChart({ points, subject }) {
  const available = METRICS.filter((m) => points.filter(m.has).length >= 2);
  const [picked, setPicked] = useState(available[0]?.id);
  const labelId = useId();
  if (!available.length) return null;
  const metric = available.find((m) => m.id === picked) ?? available[0];

  const shown = points.filter(metric.has);
  const n = shown.length;
  const last = n - 1;
  const isRange = metric.id === 'hranice' && shown.some((p) => p.cutoffMin !== p.cutoffMax);

  let body;
  let aria;
  if (isRange) {
    // Two lines, the hardest obor on top and the easiest below, with the gap
    // between them filled: the band is the spread across the school's obory.
    const y = scaleFor(shown.flatMap((p) => [p.cutoffMin, p.cutoffMax]));
    const pts = shown.map((p, i) => ({ ...p, x: xAt(i, n), yTop: y(p.cutoffMax), yBot: y(p.cutoffMin) }));
    const line = (key) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p[key]}`).join(' ');
    const band = `${line('yTop')} ${[...pts].reverse().map((p) => `L${p.x},${p.yBot}`).join(' ')} Z`;
    aria = pts.map((p) => `${p.year}: ${numCz(p.cutoffMin)} až ${numCz(p.cutoffMax)} bodů`).join(', ');
    body = (
      <>
        <path d={band} className="sd-hc-band" />
        <path key="top" d={line('yTop')} pathLength="1" className="sd-hc-line" />
        <path key="bot" d={line('yBot')} pathLength="1" className="sd-hc-line" />
        {pts.map((p, i) => (
          <g key={p.year} className={`sd-hc-pt${i === last ? ' is-current' : ''}`} style={{ '--i': i }}>
            <circle cx={p.x} cy={p.yTop} r="6" className="sd-hc-dot" />
            <circle cx={p.x} cy={p.yBot} r="6" className="sd-hc-dot" />
            <text x={p.x} y={p.yTop - 15} className="sd-hc-val">{numCz(p.cutoffMax)}</text>
            <text x={p.x} y={p.yBot + 26} className="sd-hc-val">{numCz(p.cutoffMin)}</text>
          </g>
        ))}
      </>
    );
  } else {
    const value = metric.value ?? ((p) => p.cutoffMin);
    const fmt = metric.fmt ?? ((v) => `${numCz(v)} b.`);
    const y = scaleFor(shown.map(value));
    const pts = shown.map((p, i) => ({ ...p, x: xAt(i, n), y: y(value(p)) }));
    aria = pts.map((p) => `${p.year}: ${fmt(value(p))}`).join(', ');
    body = (
      <>
        <path
          key={metric.id}
          d={pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')}
          pathLength="1"
          className="sd-hc-line"
        />
        {pts.map((p, i) => (
          <g key={p.year} className={`sd-hc-pt${i === last ? ' is-current' : ''}`} style={{ '--i': i }}>
            <circle cx={p.x} cy={p.y} r="6" className="sd-hc-dot" />
            <text x={p.x} y={p.y - 15} className="sd-hc-val">{fmt(value(p))}</text>
          </g>
        ))}
      </>
    );
  }

  const note = metric.id === 'hranice' ? NOTES.hranice[isRange ? 'range' : 'line'] : NOTES[metric.id];

  return (
    <div className="sd-hc">
      <div className="sd-hc-head">
        <span className="sd-hc-title" id={labelId}>
          Vývoj {shown[0].year}–{shown[last].year}
        </span>
        {available.length > 1 && (
          <div className="sd-hc-tabs" role="tablist" aria-labelledby={labelId}>
            {available.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={m.id === metric.id}
                className={`sd-hc-tab${m.id === metric.id ? ' is-active' : ''}`}
                onClick={() => setPicked(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <svg
        key={metric.id}
        viewBox={`0 0 ${W} ${H}`}
        className="sd-hc-svg"
        role="img"
        aria-label={`${subject}, ${metric.label.toLowerCase()}: ${aria}`}
      >
        {shown.map((p, i) => (
          <line key={p.year} x1={xAt(i, n)} x2={xAt(i, n)} y1="8" y2={BASE} className="sd-hc-grid" />
        ))}
        {body}
        {shown.map((p, i) => (
          <text key={p.year} x={xAt(i, n)} y={H - 10} className={`sd-hc-year${i === last ? ' is-current' : ''}`}>
            {p.year}
          </text>
        ))}
      </svg>
      <p className="sd-hc-note">{note}</p>
    </div>
  );
}

export default HistoryChart;
