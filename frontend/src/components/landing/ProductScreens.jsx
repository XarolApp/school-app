import { useEffect, useRef, useState } from 'react';
import { fetchSchool, fetchSchools } from '../../api';
import { groupProgramsByObor } from '../../lib/schoolPrograms';
import { QUESTIONS } from '../../pages/onboarding/quizQuestions';
import './productScreens.css';

/**
 * Coded "screenshots" and motion loops of the app for the landing page.
 *
 * Built from live /api/schools rows and the real first quiz question rather
 * than bitmaps, so they follow every colour theme, stay sharp at any size and
 * never go stale. The only invented numbers are the match percentages and the
 * sample exam score, and every screen that shows them says "ukázka". The
 * sample score sits between the three real cutoffs, so the example shows a
 * mix of "nad" and "pod" rather than three rejections.
 *
 * Animation runs only under `.pm-play` (loops) or `.is-in` (added by Home's
 * scroll reveal); without either, every screen renders its finished state.
 */

const QUESTION = QUESTIONS[0];
const OPTIONS = QUESTION.options.slice(0, 7);
const PICKS = [1, 4]; // options the loop "taps"
const MATCH = [94, 89, 85, 81, 77];

// ---------- data (fetched once, shared by every screen) ----------

let dataPromise;
function loadData() {
  if (!dataPromise) {
    dataPromise = fetchSchools()
      .then(async (rows) => {
        const list = (Array.isArray(rows) ? rows : []).filter(
          (s) => s.admission_cutoff != null && s.district && (s.school_programs ?? []).some((p) => p.kkov?.startsWith('79-41')),
        );
        list.sort((a, b) => b.admission_cutoff - a.admission_cutoff);
        // Spread across the range so the list isn't five elite schools.
        const picks = [6, 13, 20, 27, 34].map((i) => list[i]).filter(Boolean);
        let detail = null;
        if (picks[0]) {
          try {
            const full = await fetchSchool(picks[0].id);
            const entry = groupProgramsByObor(full).find(
              (e) => Object.values(e.years).filter((y) => y.cutoff != null).length >= 2,
            );
            if (entry) detail = { name: full.name, entry };
          } catch {
            /* chart falls back to a skeleton */
          }
        }
        return { schools: picks, detail };
      })
      .catch(() => ({ schools: [], detail: null }));
  }
  return dataPromise;
}

export function useScreenData() {
  const [data, setData] = useState({ schools: [], detail: null });
  useEffect(() => {
    let alive = true;
    loadData().then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

const name = (s) => s?.name ?? 'Načítám…';

// ---------- screens ----------

function Bar({ pct, i = 0 }) {
  return (
    <span className="pm-track">
      <span className="pm-fill" style={{ '--w': `${pct}%`, '--i': i }} />
    </span>
  );
}

export function QuestionScreen() {
  return (
    <div className="pm-screen pm-q">
      <div className="pm-q-top">
        <span>Otázka 1 z {QUESTIONS.length}</span>
        <span className="pm-track pm-q-progress">
          <span className="pm-fill" style={{ '--w': `${100 / QUESTIONS.length}%` }} />
        </span>
      </div>
      <p className="pm-q-title">{QUESTION.student.title}</p>
      <p className="pm-q-hint">{QUESTION.student.hint}</p>
      <div className="pm-q-options">
        {OPTIONS.map((o, i) => {
          const order = PICKS.indexOf(i);
          return (
            <span
              key={o.value}
              className={`pm-opt${order >= 0 ? ' pm-opt--pick' : ''}`}
              style={order >= 0 ? { '--pick': order } : undefined}
            >
              {o.label}
            </span>
          );
        })}
      </div>
      <span className="pm-q-next">Pokračovat</span>
    </div>
  );
}

export function ResultsScreen({ data }) {
  return (
    <div className="pm-screen pm-res">
      <div className="pm-head">
        <b>Tvoje školy</b>
        <em>ukázka</em>
      </div>
      <ol className="pm-rows">
        {MATCH.map((pct, i) => {
          const s = data.schools[i];
          return (
            <li key={i} className={`pm-row${i === 0 ? ' pm-row--open' : ''}`} style={{ '--i': i }}>
              <span className="pm-rank">{i + 1}</span>
              <span className="pm-row-name">
                <b>{name(s)}</b>
                <small>{s?.district ?? ' '}</small>
              </span>
              <span className="pm-row-match">
                <Bar pct={pct} i={i} />
                <b>{pct} %</b>
              </span>
              {i === 0 && s && (
                <span className="pm-why">
                  <i>Gymnázium</i>
                  <i>{s.district}</i>
                  <i>hranice {Math.round(s.admission_cutoff)} b.</i>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Chart({ entry }) {
  const years = Object.keys(entry.years).map(Number).sort();
  const rows = years.map((y) => ({ year: y, ...entry.years[y] }));
  const cut = rows.map((r) => r.cutoff).filter((c) => c != null);
  const lo = Math.max(0, Math.min(...cut) - 12);
  const hi = Math.min(100, Math.max(...cut) + 12);
  const W = 300;
  const H = 120;
  const pts = rows.map((r, i) => ({
    ...r,
    x: 22 + (i * (W - 44)) / Math.max(1, rows.length - 1),
    y: r.cutoff == null ? null : H - 18 - ((r.cutoff - lo) / (hi - lo || 1)) * (H - 44),
  }));
  const d = pts
    .filter((p) => p.y != null)
    .map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`)
    .join(' ');
  return (
    <svg className="pm-chart" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Hranice přijetí: ${pts.map((p) => `${p.year} ${p.cutoff ?? '—'}`).join(', ')}`}>
      {pts.map((p) => (
        <line key={p.year} x1={p.x} x2={p.x} y1="8" y2={H - 18} className="pm-chart-grid" />
      ))}
      <path d={d} pathLength="1" className="pm-chart-line" />
      {pts
        .filter((p) => p.y != null)
        .map((p, i) => (
          <g key={p.year} className="pm-chart-pt" style={{ '--i': i }}>
            <circle cx={p.x} cy={p.y} r="4.5" />
            <text x={p.x} y={p.y - 10}>{Math.round(p.cutoff)}</text>
          </g>
        ))}
      {pts.map((p) => (
        <text key={p.year} x={p.x} y={H - 3} className="pm-chart-year">{p.year}</text>
      ))}
    </svg>
  );
}

export function DetailScreen({ data }) {
  const det = data.detail;
  if (!det) {
    return (
      <div className="pm-screen pm-det">
        <span className="pm-skel" />
        <span className="pm-skel pm-skel--short" />
        <span className="pm-skel pm-skel--chart" />
      </div>
    );
  }
  const { entry } = det;
  return (
    <div className="pm-screen pm-det">
      <b className="pm-det-name">{det.name}</b>
      <small className="pm-det-obor">{entry.oborNazev} · hranice přijetí</small>
      <Chart entry={entry} />
      <dl className="pm-stats">
        <div><dt>Míst</dt><dd>{entry.latest.kapacita ?? '—'}</dd></div>
        <div><dt>Přihlášek</dt><dd>{entry.latest.prihlasky ?? '—'}</dd></div>
        <div><dt>Přijato</dt><dd>{entry.latest.prijati ?? '—'}</dd></div>
      </dl>
      {entry.trend && <p className="pm-det-note">{entry.trend.note}</p>}
    </div>
  );
}

export function CompareScreen({ data }) {
  const [a, b] = data.schools;
  const rows = [
    ['Městská část', a?.district, b?.district],
    ['Hranice přijetí', a && `${Math.round(a.admission_cutoff)} b.`, b && `${Math.round(b.admission_cutoff)} b.`],
    ['Přijato', a?.acceptance_rate != null && `${Math.round(a.acceptance_rate)} %`, b?.acceptance_rate != null && `${Math.round(b.acceptance_rate)} %`],
    ['Zřizovatel', a?.school_programs?.[0]?.zrizovatel, b?.school_programs?.[0]?.zrizovatel],
  ];
  return (
    <div className="pm-screen pm-cmp">
      <div className="pm-head">
        <b>Porovnání</b>
      </div>
      <div className="pm-cmp-grid">
        <span />
        <b>{name(a)}</b>
        <b>{name(b)}</b>
        {rows.map(([label, x, y], i) => (
          <div key={label} className="pm-cmp-row" style={{ '--i': i }}>
            <span>{label}</span>
            <span>{x || '—'}</span>
            <span>{y || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PrihlaskaScreen({ data }) {
  const picks = [0, 1, 2].map((i) => data.schools[i + 2] ?? data.schools[i]);
  const cuts = picks.filter(Boolean).map((s) => Math.round(s.admission_cutoff)).sort((x, y) => x - y);
  const score = cuts.length ? cuts[Math.floor(cuts.length / 2)] + 1 : 64;
  return (
    <div className="pm-screen pm-app">
      <div className="pm-head">
        <b>Tvoje přihláška</b>
        <em>ukázka</em>
      </div>
      <p className="pm-app-score">
        Tvoje skóre z přijímaček <b>{score} b.</b>
      </p>
      <ol className="pm-app-list">
        {[0, 1, 2].map((i) => {
          const s = picks[i];
          const cut = s ? Math.round(s.admission_cutoff) : null;
          const above = cut != null && score >= cut;
          return (
            <li key={i} className="pm-app-item" style={{ '--i': i }}>
              <span className="pm-rank">{i + 1}</span>
              <span className="pm-row-name">
                <b>{name(s)}</b>
                <small>{cut != null ? `loňská hranice ${cut} b.` : ' '}</small>
              </span>
              {cut != null && (
                <span className={`pm-pill${above ? ' pm-pill--ok' : ''}`}>
                  {above ? 'nad hranicí' : 'pod hranicí'}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const SCREENS = {
  question: QuestionScreen,
  results: ResultsScreen,
  detail: DetailScreen,
  compare: CompareScreen,
  prihlaska: PrihlaskaScreen,
};

/** A single static screen in a browser-window frame (step illustrations). */
export function ScreenShot({ screen, data }) {
  const S = SCREENS[screen];
  return (
    <div className="pm-window">
      <div className="pm-chrome" aria-hidden="true">
        <i /><i /><i />
      </div>
      <div className="pm-viewport">
        <S data={data} />
      </div>
    </div>
  );
}

// ---------- loops ----------

function usePlaying(ref) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.25 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [ref]);
  return on;
}

/**
 * Stepper driven by a CSS progress bar: each scene's bar animates for
 * `--dur`, and its animationend advances the loop. Pausing is just
 * animation-play-state, so there are no timers to leak.
 */
function Loop({ scenes, data, className, labels, interactive = false }) {
  const ref = useRef(null);
  const playing = usePlaying(ref);
  const [idx, setIdx] = useState(1); // resting frame (reduced motion): results
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (playing && !started) {
      setStarted(true);
      setIdx(0);
    }
  }, [playing, started]);

  return (
    <div ref={ref} className={`pm-loop ${className}${playing ? ' pm-running' : ''}`}>
      <div className="pm-stack">
        {scenes.map((key, i) => {
          const S = SCREENS[key];
          return (
            <div
              key={key}
              className={`pm-scene${i === idx ? ' is-active pm-play' : ''}${i < idx ? ' is-past' : ''}`}
              aria-hidden={i !== idx}
            >
              <S data={data} />
            </div>
          );
        })}
      </div>
      <div className="pm-steps" role={interactive ? 'tablist' : undefined}>
        {scenes.map((key, i) => {
          const Tag = interactive ? 'button' : 'span';
          return (
            <Tag
              key={key}
              type={interactive ? 'button' : undefined}
              role={interactive ? 'tab' : undefined}
              aria-selected={interactive ? i === idx : undefined}
              className={`pm-step${i === idx ? ' is-active' : ''}${i < idx ? ' is-done' : ''}`}
              onClick={interactive ? () => { setStarted(true); setIdx(i); } : undefined}
            >
              <span className="pm-step-bar">
                <span
                  className="pm-step-fill"
                  onAnimationEnd={() => setIdx((idx + 1) % scenes.length)}
                />
              </span>
              {labels && <span className="pm-step-label">{labels[i]}</span>}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

/** Hero: phone running question → results → detail. */
export function PhoneLoop() {
  const data = useScreenData();
  return (
    <div className="pm-phone">
      <span className="pm-notch" aria-hidden="true" />
      <Loop scenes={['question', 'results', 'detail']} data={data} className="pm-loop--phone" />
    </div>
  );
}

const DEMO_LABELS = ['Dotazník', 'Výsledky', 'Detail školy', 'Porovnání', 'Přihláška'];

/** Wide product demo: the whole path, with clickable chapters. */
export function DemoLoop() {
  const data = useScreenData();
  return (
    <div className="pm-window pm-window--demo">
      <div className="pm-chrome" aria-hidden="true">
        <i /><i /><i />
        <span className="pm-url">skolamatch.cz</span>
      </div>
      <Loop
        scenes={['question', 'results', 'detail', 'compare', 'prihlaska']}
        labels={DEMO_LABELS}
        data={data}
        className="pm-loop--demo"
        interactive
      />
    </div>
  );
}
