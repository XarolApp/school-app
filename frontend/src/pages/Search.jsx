import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X, ChevronDown } from 'lucide-react';
import { fetchSchools, fetchFavorites } from '../api';
import {
  buildIndex,
  prepareQuery,
  scoreSchool,
  districtOf,
  splitPrograms,
  baseProgram,
  collectFacet,
  compareDistricts,
  compareByCount,
} from '../lib/schoolSearch';
import { deriveFeatures, FOCUS_CATEGORIES } from '../lib/schoolFeatures';
import { useAuth } from '../components/AuthContext';
import FavoriteButton from '../components/FavoriteButton';
import SchoolMap from '../components/SchoolMap';
import StatInfo from '../components/StatInfo';
import { getRecentSchoolIds, setCompareSelection } from '../lib/searchPrefs';
import './search.css';

/**
 * ⚠️ SYNTHETIC STAND-IN DATA — NOT REAL, tracked in UNFORGET.md
 *
 * Everything about admissions (cutoff, acceptance, maturita, typ školy,
 * zřizovatel, jazyk, KKOV, kapacita) is now real — either straight from
 * `schools.admission_cutoff`/`acceptance_rate` or from the nested
 * `school_programs` rows, both filled in by `scripts/import-admission-data.js`
 * from Cermat's real yearly results. A school the import hasn't matched has
 * these as `null`/`[]`, and this file must keep treating that as "no data" —
 * never fabricate a value to fill the gap.
 *
 * Still invented:
 *   commuteMinutes   dojezd MHD — needs a user home address + a routing API,
 *                     neither built yet. Kept in `synth()` only so the parked,
 *                     visibly-disabled UI has *something* to not-display; no
 *                     filter, sort, or row card reads it anymore.
 *   districtLabel     fallback "Praha N" only when the school has no real district
 */
const SYNTHETIC = true;

// FNV-1a style string hash — small, deterministic, no external dependency.
function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — a tiny deterministic PRNG. Seeded from the hash above so the
// same school id always produces the same sequence of "random" values, on
// every render and every reload. Never Math.random() here.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synth(school) {
  const rand = mulberry32(hashSeed(String(school.id)));
  const commuteMinutes = Math.round(16 + rand() * 30); // 16–46, unused except as a placeholder value
  const districtRoll = 1 + Math.floor(rand() * 22); // 1–22, used only as a fallback
  return { commuteMinutes, districtRoll };
}

// Czech pluralization — three forms: 1 / 2–4 / 5+.
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
const skol = (n) => plural(n, 'škola', 'školy', 'škol');
const skolGen = (n) => plural(n, 'školu', 'školy', 'škol');
const obor = (n) => plural(n, 'obor', 'obory', 'oborů');
const misto = (n) => plural(n, 'místo', 'místa', 'míst');
const numCz = (v) => String(v).replace('.', ',');

// admissionCutoff is an average POINTS score (Czech+Math combined out of a
// fixed 100 = 50+50 max, halved from Cermat's raw 0–200 sum). 1 % SKÓR in
// Cermat's file literally equals 1 point here — every student in the
// aggregated file we import sits on that same 50+50 max, accommodated
// students on a modified test are excluded from that file entirely — so
// showing it as points instead of % loses nothing and is what a 15-year-old
// already knows how to read. Always says "no data" rather than a fabricated
// number for a school the import script hasn't matched yet.
const cutoffLabel = (cutoff) =>
  cutoff == null ? 'hranice přijetí zatím bez dat' : `hranice přijetí ${numCz(cutoff)} b.`;

const SORTS = [
  { id: 'match', label: 'Nejvíc splněných kritérií', tradeoff: 'nebere ohled na dojezd' },
  { id: 'cut', label: 'Nejnižší hranice přijetí', tradeoff: 'bezpečnější, ne nutně silnější škola' },
  { id: 'acceptance', label: 'Největší šance na přijetí', tradeoff: 'podle loňské míry přijetí' },
];

const UNMET_LABELS = {
  fields: 'filtr oboru',
  districts: 'filtr městské části',
  ukonceni: 'filtr ukončení studia',
  typySkoly: 'filtr typu školy',
  zrizovatele: 'filtr zřizovatele',
  jazyky: 'filtr jazyka výuky',
  jpz: 'filtr přijímací zkoušky',
  cutoffMax: 'horní hranici přijetí',
  acceptanceMin: 'dolní hranici míry přijetí',
  kapacitaMin: 'minimální kapacitu',
  q: 'hledaný text',
};

/**
 * A true, honest differentiator sentence composed from deriveFeatures()
 * output. Nothing here is invented — if a school's data doesn't tell us
 * anything, this returns null and the row simply omits the line.
 */
function differentiatorFor(features) {
  const parts = [];
  if (features.focusKnown && features.focus.length) {
    const labels = features.focus
      .map((id) => FOCUS_CATEGORIES.find((c) => c.id === id)?.label)
      .filter(Boolean);
    if (labels.length) parts.push(`Zaměření: ${labels.join(', ')}.`);
  }
  if (features.breadth > 1) {
    parts.push(`Nabízí ${features.breadth} ${obor(features.breadth)} v rámci školy.`);
  }
  if (features.language) parts.push('Výuka klade důraz na jazyky.');
  if (features.practice) parts.push('Součástí výuky je odborná praxe.');
  return parts.length ? parts.join(' ') : null;
}

/**
 * Collapses a school's `school_programs` rows (one per obor) into the
 * summary a filter predicate needs. Computed ONCE per school in buildRow(),
 * never recomputed inside a filter predicate — with 13 filters, listFor()
 * already runs ~50 times per keystroke to build option counts, so redoing
 * this per predicate would mean ~50 passes over every school's programs.
 *
 * Every boolean here is "school has AT LEAST ONE obor matching X" — a school
 * offering both maturita and a výuční list is true for both, which is why
 * the per-option counts across a pair like ukončení studia sum to more than
 * 60 (see the note rendered under that filter group).
 */
function summarizePrograms(school) {
  const programs = school.school_programs ?? [];
  return {
    count: programs.length,
    maturitni: programs.some((p) => p.maturitni === true),
    nematuritni: programs.some((p) => p.maturitni === false),
    jpzPovinna: programs.some((p) => p.jpz_povinna === true),
    jpzNepovinna: programs.some((p) => p.jpz_povinna === false),
    typy: [...new Set(programs.map((p) => p.typ_skoly).filter(Boolean))],
    jazyky: [...new Set(programs.map((p) => p.jazyk_studia).filter(Boolean))],
    kkov: [...new Set(programs.map((p) => p.kkov).filter(Boolean))],
    zrizovatel: programs[0]?.zrizovatel ?? null,
    kapacita: programs.some((p) => p.kapacita != null)
      ? programs.reduce((sum, p) => sum + (p.kapacita || 0), 0)
      : null,
  };
}

function ukonceniText(p) {
  if (p.maturitni && p.nematuritni) return 'maturitní i výuční list';
  if (p.maturitni) return 'maturitní';
  if (p.nematuritni) return 'výuční list';
  return null;
}

function buildRow(school) {
  const features = deriveFeatures(school);
  const s = synth(school);
  const p = summarizePrograms(school);
  const realDistrict = districtOf(school); // "Praha N" or null
  const districtLabel = realDistrict || `Praha ${s.districtRoll}`;
  const districtSynthesized = !realDistrict;

  const progs = [...new Set(splitPrograms(school.programs || '').map(baseProgram))]
    .filter(Boolean)
    .slice(0, 3);

  return {
    id: school.id,
    school,
    name: school.name,
    location: school.location,
    focus: features.focus,
    districtLabel,
    districtSynthesized,
    progs,
    diff: differentiatorFor(features),
    p,
    // Real data, average % score across every obor and every year Cermat's
    // file has been imported for — see import-admission-data.js. null means
    // this school hasn't been matched to a Cermat row yet, not a 0.
    admissionCutoff: school.admission_cutoff ?? null,
    acceptanceRate: school.acceptance_rate ?? null,
    commuteMinutes: s.commuteMinutes,
  };
}

const DEFAULT_FILTERS = {
  query: '',
  fields: [],
  districts: [],
  ukonceni: [], // 'maturitni' | 'nematuritni'
  typySkoly: [],
  zrizovatele: [],
  jazyky: [],
  jpz: [], // 'povinna' | 'nepovinna'
  cutoffMax: 100, // 100 == "bez omezení"
  acceptanceMin: 0, // 0 == "bez omezení"
  kapacitaMin: 0, // 0 == "bez omezení"
  sort: 'match',
  page: 10,
};

// Small collapsible section used for every sidebar filter group — open by
// default for the two groups that actually fork the decision (ukončení
// studia, typ školy), collapsed with an active-count badge for the rest.
// This is the fix for "13 flat checkbox groups" (a named anti-pattern): the
// page never shows more than 2 fully-expanded groups at once.
function FacetSection({ title, activeCount, defaultOpen, note, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="ss-facet-section">
      <button
        type="button"
        className="ss-facet-section-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronDown size={14} aria-hidden="true" className={open ? 'is-open' : ''} />
        <span className="ss-label-caps">{title}</span>
        {activeCount > 0 && <span className="ss-facet-badge">{activeCount}</span>}
      </button>
      {open && (
        <div className="ss-facet-section-body">
          {children}
          {note && <p className="ss-caption ss-facet-note">{note}</p>}
        </div>
      )}
    </div>
  );
}

function CheckOption({ checked, label, count, onChange }) {
  return (
    <div className="ss-facet-row">
      <label>
        <input type="checkbox" checked={checked} onChange={onChange} />
        {label}
      </label>
      <span className="ss-data-sm ss-facet-count">{count}</span>
    </div>
  );
}

// StatInfo (hover-to-reveal explanation) moved to components/StatInfo.jsx
// so SchoolMap.jsx's popup card can reuse it too.

// Same cap /sdileni and the comparison table both assume — a 5th column
// stops being a comparison and starts being a spreadsheet.
const COMPARE_LIMIT = 4;

function Search() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [selectedMapId, setSelectedMapId] = useState(null);

  const { isSignedIn, hasAccess } = useAuth();

  useEffect(() => {
    setLoading(true);
    fetchSchools()
      .then(setSchools)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isSignedIn || !hasAccess) return;
    fetchFavorites()
      .then((rows) => setFavorites(new Set(rows.map((r) => r.school_id ?? r.id))))
      .catch(() => {});
  }, [isSignedIn, hasAccess]);

  // Rows carry both the real fields and the synthetic stand-ins. Stable
  // across reloads because synth() is a pure function of school.id.
  const rows = useMemo(() => schools.map(buildRow), [schools]);

  // Recently viewed — per-device only (localStorage, see searchPrefs.js),
  // most-recent first. Only worth showing when nothing is filtered yet; once
  // the visitor starts narrowing down, their own filtered list matters more.
  const recentRows = useMemo(() => {
    const byId = new Map(rows.map((r) => [r.id, r]));
    return getRecentSchoolIds().map((id) => byId.get(id)).filter(Boolean);
  }, [rows]);

  // Search index built over the same effective districts the rows use, so a
  // "praha 6" query and the district facet agree on what "Praha 6" means even
  // for ungeocoded schools.
  const index = useMemo(() => {
    const effectiveSchools = schools.map((school, i) => ({
      ...school,
      district: rows[i]?.districtLabel ?? school.district,
    }));
    return buildIndex(effectiveSchools);
  }, [schools, rows]);

  const indexById = useMemo(() => {
    const map = new Map();
    index.forEach((entry) => map.set(entry.school.id, entry));
    return map;
  }, [index]);

  const prepared = useMemo(() => prepareQuery(filters.query), [filters.query]);
  // Bug fix: prepareQuery('') returns a truthy object with zero tokens. Used
  // naively as a boolean, an empty search box would still take the "must
  // match" branch and — since nothing has zero tokens to satisfy — the whole
  // list would vanish on load. Only treat the query as active once it has an
  // actual token to match against.
  const hasQuery = prepared.tokens.length > 0;

  const matchesQuery = (row) => {
    if (!hasQuery) return true;
    const entry = indexById.get(row.id);
    if (entry && scoreSchool(entry, prepared) > 0) return true;
    // KKOV codes ("79-41-K") aren't in the fuzzy name/programs/location
    // index — matched separately here as a plain substring so one search
    // bar covers both a school name and an obor code, instead of two boxes.
    const raw = filters.query.trim().toLowerCase();
    return row.p.kkov.some((k) => k.toLowerCase().includes(raw));
  };

  const criteriaFor = (row, f) => {
    const out = [];
    if (f.fields.length) out.push({ k: 'fields', met: row.focus.some((x) => f.fields.includes(x)) });
    if (f.districts.length) out.push({ k: 'districts', met: f.districts.includes(row.districtLabel) });
    if (f.ukonceni.length) {
      out.push({
        k: 'ukonceni',
        met: f.ukonceni.some((v) => (v === 'maturitni' ? row.p.maturitni : row.p.nematuritni)),
      });
    }
    if (f.typySkoly.length) {
      out.push({ k: 'typySkoly', met: row.p.typy.some((t) => f.typySkoly.includes(t)) });
    }
    if (f.zrizovatele.length) {
      out.push({ k: 'zrizovatele', met: row.p.zrizovatel != null && f.zrizovatele.includes(row.p.zrizovatel) });
    }
    if (f.jazyky.length) {
      out.push({ k: 'jazyky', met: row.p.jazyky.some((j) => f.jazyky.includes(j)) });
    }
    if (f.jpz.length) {
      out.push({
        k: 'jpz',
        met: f.jpz.some((v) => (v === 'povinna' ? row.p.jpzPovinna : row.p.jpzNepovinna)),
      });
    }
    if (f.cutoffMax < 100) {
      out.push({ k: 'cutoffMax', met: row.admissionCutoff != null && row.admissionCutoff <= f.cutoffMax });
    }
    if (f.acceptanceMin > 0) {
      out.push({ k: 'acceptanceMin', met: row.acceptanceRate != null && row.acceptanceRate >= f.acceptanceMin });
    }
    if (f.kapacitaMin > 0) {
      out.push({ k: 'kapacitaMin', met: row.p.kapacita != null && row.p.kapacita >= f.kapacitaMin });
    }
    if (hasQuery) out.push({ k: 'q', met: matchesQuery(row) });
    return out;
  };

  const listFor = (f) => rows.filter((row) => criteriaFor(row, f).every((c) => c.met));

  const sortRows = (list, sortId, f) => {
    const arr = list.slice();
    const byName = (a, b) => a.name.localeCompare(b.name, 'cs');
    // A school with no admission data yet sorts after every school that has
    // some — never before, which "null - 35 = -35" would otherwise do.
    const byCutoffAsc = (a, b) => {
      if (a.admissionCutoff == null && b.admissionCutoff == null) return byName(a, b);
      if (a.admissionCutoff == null) return 1;
      if (b.admissionCutoff == null) return -1;
      return a.admissionCutoff - b.admissionCutoff || byName(a, b);
    };
    const byAcceptanceDesc = (a, b) => {
      if (a.acceptanceRate == null && b.acceptanceRate == null) return byName(a, b);
      if (a.acceptanceRate == null) return 1;
      if (b.acceptanceRate == null) return -1;
      return b.acceptanceRate - a.acceptanceRate || byName(a, b);
    };

    if (sortId === 'cut') arr.sort(byCutoffAsc);
    else if (sortId === 'acceptance') arr.sort(byAcceptanceDesc);
    else {
      // 'match' — most active criteria satisfied first (dead default now
      // that commute is parked; previously defaulted to a commute sort with
      // nothing behind it).
      arr.sort((a, b) => {
        const am = criteriaFor(a, f).filter((c) => c.met).length;
        const bm = criteriaFor(b, f).filter((c) => c.met).length;
        return bm - am || byCutoffAsc(a, b);
      });
    }
    return arr;
  };

  const total = rows.length;
  const matchedAll = listFor(filters);
  const sortedAll = sortRows(matchedAll, filters.sort, filters);
  const n = sortedAll.length;

  const setPatch = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const toggleIn = (key, value) => {
    setFilters((f) => {
      const cur = f[key];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : cur.concat([value]);
      return { ...f, [key]: next };
    });
  };

  // ---- facet options ----
  const districtFacet = useMemo(
    () => collectFacet(rows, (row) => [row.districtLabel], compareDistricts),
    [rows]
  );
  const typFacet = useMemo(() => collectFacet(rows, (row) => row.p.typy, compareByCount), [rows]);
  const zrizovatelFacet = useMemo(
    () => collectFacet(rows, (row) => (row.p.zrizovatel ? [row.p.zrizovatel] : []), compareByCount),
    [rows]
  );
  const jazykFacet = useMemo(() => collectFacet(rows, (row) => row.p.jazyky, compareByCount), [rows]);

  const fieldOptions = FOCUS_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    checked: filters.fields.includes(c.id),
    count: listFor({ ...filters, fields: [c.id] }).length,
  })).filter((o) => o.count > 0 || o.checked);

  const districtOptions = districtFacet.map((d) => ({
    value: d.value,
    label: d.value,
    count: listFor({ ...filters, districts: [d.value] }).length,
    active: filters.districts.includes(d.value),
  }));

  const ukonceniOptions = [
    { value: 'maturitni', label: 'Maturitní', count: listFor({ ...filters, ukonceni: ['maturitni'] }).length },
    { value: 'nematuritni', label: 'Výuční list', count: listFor({ ...filters, ukonceni: ['nematuritni'] }).length },
  ];

  const typOptions = typFacet
    .map((t) => ({
      value: t.value,
      label: t.value,
      checked: filters.typySkoly.includes(t.value),
      count: listFor({ ...filters, typySkoly: [t.value] }).length,
    }))
    .filter((o) => o.count > 0 || o.checked);

  const zrizovatelOptions = zrizovatelFacet
    .map((z) => ({
      value: z.value,
      label: z.value,
      checked: filters.zrizovatele.includes(z.value),
      count: listFor({ ...filters, zrizovatele: [z.value] }).length,
    }))
    .filter((o) => o.count > 0 || o.checked);

  const jazykOptions = jazykFacet
    .map((j) => ({
      value: j.value,
      label: j.value,
      checked: filters.jazyky.includes(j.value),
      count: listFor({ ...filters, jazyky: [j.value] }).length,
    }))
    .filter((o) => o.count > 0 || o.checked);

  const jpzOptions = [
    { value: 'povinna', label: 'JPZ povinná', count: listFor({ ...filters, jpz: ['povinna'] }).length },
    { value: 'nepovinna', label: 'JPZ nepovinná', count: listFor({ ...filters, jpz: ['nepovinna'] }).length },
  ];

  const activeCriteriaCount = [
    filters.fields.length > 0,
    filters.districts.length > 0,
    filters.ukonceni.length > 0,
    filters.typySkoly.length > 0,
    filters.zrizovatele.length > 0,
    filters.jazyky.length > 0,
    filters.jpz.length > 0,
    filters.cutoffMax < 100,
    filters.acceptanceMin > 0,
    filters.kapacitaMin > 0,
    hasQuery,
  ].filter(Boolean).length;

  // Collapsed groups show how many of their own filters are active, per the
  // "filter-count badge on the collapsed control" pattern.
  const admissionsActiveCount =
    (filters.cutoffMax < 100 ? 1 : 0) + (filters.acceptanceMin > 0 ? 1 : 0) + filters.jpz.length;
  const moreActiveCount = filters.jazyky.length + (filters.kapacitaMin > 0 ? 1 : 0);

  const chips = [];
  filters.fields.forEach((id) => {
    const c = FOCUS_CATEGORIES.find((x) => x.id === id);
    if (c) chips.push({ key: `f-${id}`, label: c.label, onRemove: () => toggleIn('fields', id) });
  });
  filters.districts.forEach((d) =>
    chips.push({ key: `d-${d}`, label: d, onRemove: () => toggleIn('districts', d) })
  );
  filters.ukonceni.forEach((v) =>
    chips.push({
      key: `u-${v}`,
      label: v === 'maturitni' ? 'Maturitní' : 'Výuční list',
      onRemove: () => toggleIn('ukonceni', v),
    })
  );
  filters.typySkoly.forEach((v) => chips.push({ key: `t-${v}`, label: v, onRemove: () => toggleIn('typySkoly', v) }));
  filters.zrizovatele.forEach((v) =>
    chips.push({ key: `z-${v}`, label: v, onRemove: () => toggleIn('zrizovatele', v) })
  );
  filters.jazyky.forEach((v) => chips.push({ key: `j-${v}`, label: v, onRemove: () => toggleIn('jazyky', v) }));
  filters.jpz.forEach((v) =>
    chips.push({
      key: `p-${v}`,
      label: v === 'povinna' ? 'JPZ povinná' : 'JPZ nepovinná',
      onRemove: () => toggleIn('jpz', v),
    })
  );
  if (filters.cutoffMax < 100) {
    chips.push({ key: 'cutoffMax', label: `Hranice do ${filters.cutoffMax} b.`, onRemove: () => setPatch({ cutoffMax: 100 }) });
  }
  if (filters.acceptanceMin > 0) {
    chips.push({
      key: 'acceptanceMin',
      label: `Přijato aspoň ${filters.acceptanceMin} %`,
      onRemove: () => setPatch({ acceptanceMin: 0 }),
    });
  }
  if (filters.kapacitaMin > 0) {
    chips.push({
      key: 'kapacitaMin',
      label: `Aspoň ${filters.kapacitaMin} ${misto(filters.kapacitaMin)}`,
      onRemove: () => setPatch({ kapacitaMin: 0 }),
    });
  }
  if (hasQuery) {
    chips.push({ key: 'q', label: `„${filters.query.trim()}“`, onRemove: () => setPatch({ query: '', page: 10 }) });
  }

  const clearAll = () => setFilters(DEFAULT_FILTERS);

  // ---- empty-state: blame sentence + ranked relax options + near misses ----
  // Generic over every filter dimension — each one knows how to reset itself
  // back to DEFAULT_FILTERS' value for that key, so this list stays short
  // even as filters grow.
  const fieldLabels = filters.fields.map((id) => FOCUS_CATEGORIES.find((x) => x.id === id)?.label).filter(Boolean);
  const filterDefs = [
    {
      key: 'query',
      active: hasQuery,
      blame: `hledaný text „${filters.query.trim()}“`,
      label: `Zrušit hledaný text „${filters.query.trim()}“`,
      apply: () => setPatch({ query: '', page: 10 }),
    },
    {
      key: 'districts',
      active: filters.districts.length > 0,
      blame: `omezení na ${filters.districts.join(', ')}`,
      label: 'Zrušit omezení na městskou část',
      apply: () => setPatch({ districts: [] }),
    },
    {
      key: 'fields',
      active: filters.fields.length > 0,
      blame: `obor ${fieldLabels.join(', ')}`,
      label: 'Zrušit omezení oboru',
      apply: () => setPatch({ fields: [] }),
    },
    {
      key: 'ukonceni',
      active: filters.ukonceni.length > 0,
      blame: 'omezení ukončení studia',
      label: 'Zrušit omezení ukončení studia',
      apply: () => setPatch({ ukonceni: [] }),
    },
    {
      key: 'typySkoly',
      active: filters.typySkoly.length > 0,
      blame: 'omezení typu školy',
      label: 'Zrušit omezení typu školy',
      apply: () => setPatch({ typySkoly: [] }),
    },
    {
      key: 'zrizovatele',
      active: filters.zrizovatele.length > 0,
      blame: 'omezení zřizovatele',
      label: 'Zrušit omezení zřizovatele',
      apply: () => setPatch({ zrizovatele: [] }),
    },
    {
      key: 'jazyky',
      active: filters.jazyky.length > 0,
      blame: 'omezení jazyka výuky',
      label: 'Zrušit omezení jazyka výuky',
      apply: () => setPatch({ jazyky: [] }),
    },
    {
      key: 'jpz',
      active: filters.jpz.length > 0,
      blame: 'omezení přijímací zkoušky',
      label: 'Zrušit omezení přijímací zkoušky',
      apply: () => setPatch({ jpz: [] }),
    },
    {
      key: 'cutoffMax',
      active: filters.cutoffMax < 100,
      blame: `hranici přijetí do ${filters.cutoffMax} b.`,
      label: 'Zrušit horní hranici přijetí',
      apply: () => setPatch({ cutoffMax: 100 }),
    },
    {
      key: 'acceptanceMin',
      active: filters.acceptanceMin > 0,
      blame: `míru přijetí od ${filters.acceptanceMin} %`,
      label: 'Zrušit dolní hranici míry přijetí',
      apply: () => setPatch({ acceptanceMin: 0 }),
    },
    {
      key: 'kapacitaMin',
      active: filters.kapacitaMin > 0,
      blame: `minimální kapacitu ${filters.kapacitaMin}`,
      label: 'Zrušit minimální kapacitu',
      apply: () => setPatch({ kapacitaMin: 0 }),
    },
  ];

  const relaxRaw = filterDefs
    .filter((d) => d.active)
    .map((d) => ({
      blame: d.blame,
      label: d.label,
      gainN: listFor({ ...filters, [d.key]: DEFAULT_FILTERS[d.key] }).length,
      onApply: d.apply,
    }));
  relaxRaw.sort((a, b) => b.gainN - a.gainN);
  const helpfulRelax = relaxRaw.filter((r) => r.gainN > n);
  const relaxOptions = helpfulRelax.map((r, i) => ({
    label: r.label,
    gain: `→ ${r.gainN} ${skolGen(r.gainN)}`,
    variant: i === 0 ? 'primary' : 'secondary',
    onApply: r.onApply,
  }));

  let blameSentence = 'Žádný jednotlivý filtr to sám neuvolní — zruš celou kombinaci a začni od jednoho kritéria.';
  if (helpfulRelax.length) {
    const worst = helpfulRelax[0];
    blameSentence = `Nejvíc omezuje ${worst.blame} — bez něj by odpovídalo ${worst.gainN} ${skolGen(worst.gainN)} z ${total}.`;
  }

  const nearMisses = rows
    .map((row) => {
      const cs = criteriaFor(row, filters);
      const unmet = cs.filter((c) => !c.met);
      return { row, unmet };
    })
    .filter((x) => x.unmet.length === 1)
    .slice(0, 3)
    .map((x) => ({
      name: x.row.name,
      why:
        `${x.row.districtLabel} · ${x.row.p.zrizovatel ?? 'zřizovatel neznámý'} · ${cutoffLabel(x.row.admissionCutoff)} — ` +
        `nesplňuje ${UNMET_LABELS[x.unmet[0].k]}`,
    }));

  // ---- pagination ----
  const shown = sortedAll.slice(0, filters.page);
  const rest = n - shown.length;
  const moreLabel = rest === 1 ? 'Zobrazit další školu' : `Zobrazit dalších ${rest} ${skolGen(rest)}`;

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < COMPARE_LIMIT) {
        next.add(id);
      }
      return next;
    });
  };

  const handleCompare = () => {
    setCompareSelection([...selected]);
    navigate('/porovnani');
  };

  const canFavorite = isSignedIn && hasAccess;

  const handleMapSelect = useCallback((id) => setSelectedMapId(id), []);

  return (
    <div className="school-search">
      <h1 className="ss-headline-lg">Databáze škol</h1>

      <div className="ss-layout">
        <aside className="ss-sidebar" id="ss-sidebar">
          <div className="ss-search-input-wrap">
            <SearchIcon aria-hidden="true" />
            <input
              type="search"
              className="ss-search-input"
              placeholder="Hledat podle názvu, oboru nebo KKOV kódu"
              value={filters.query}
              onChange={(e) => setPatch({ query: e.target.value, page: 10 })}
              aria-label="Hledat školu"
            />
          </div>

          <FacetSection title="Ukončení studia" activeCount={filters.ukonceni.length} defaultOpen>
            {ukonceniOptions.map((o) => (
              <CheckOption
                key={o.value}
                checked={filters.ukonceni.includes(o.value)}
                label={o.label}
                count={o.count}
                onChange={() => toggleIn('ukonceni', o.value)}
              />
            ))}
            {filters.ukonceni.length !== 1 && (
              <p className="ss-caption ss-facet-note">
                Řada škol nabízí obojí, proto je součet vyšší než {total}.
              </p>
            )}
          </FacetSection>

          <hr className="ss-divider" />

          <FacetSection title="Typ školy" activeCount={filters.typySkoly.length} defaultOpen>
            <div className="ss-chip-group">
              {typOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`ss-district-toggle${o.checked ? ' is-active' : ''}`}
                  onClick={() => toggleIn('typySkoly', o.value)}
                >
                  {o.label} <span>{o.count}</span>
                </button>
              ))}
            </div>
          </FacetSection>

          <hr className="ss-divider" />

          <FacetSection title="Městská část" activeCount={filters.districts.length}>
            <div className="ss-chip-group">
              {districtOptions.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={`ss-district-toggle${d.active ? ' is-active' : ''}`}
                  onClick={() => toggleIn('districts', d.value)}
                >
                  {d.label} <span>{d.count}</span>
                </button>
              ))}
            </div>
          </FacetSection>

          <hr className="ss-divider" />

          <FacetSection title="Obor a zaměření" activeCount={filters.fields.length}>
            {fieldOptions.map((o) => (
              <CheckOption
                key={o.id}
                checked={o.checked}
                label={o.label}
                count={o.count}
                onChange={() => toggleIn('fields', o.id)}
              />
            ))}
          </FacetSection>

          <hr className="ss-divider" />

          <FacetSection title="Zřizovatel" activeCount={filters.zrizovatele.length}>
            {zrizovatelOptions.map((o) => (
              <CheckOption
                key={o.value}
                checked={o.checked}
                label={o.label}
                count={o.count}
                onChange={() => toggleIn('zrizovatele', o.value)}
              />
            ))}
          </FacetSection>

          <hr className="ss-divider" />

          <FacetSection title="Přijímačky a šance" activeCount={admissionsActiveCount}>
            <div className="ss-facet-group">
              <div className="ss-travel-head">
                <span className="ss-body-sm">
                  {filters.cutoffMax >= 100 ? 'bez omezení' : `do ${filters.cutoffMax} b.`}
                </span>
              </div>
              <p className="ss-caption">Průměrná hranice přijetí nejvýš</p>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.cutoffMax}
                onChange={(e) => setPatch({ cutoffMax: Number(e.target.value) })}
                className="ss-travel-slider"
                aria-label="Nejvyšší průměrná hranice přijetí"
              />
            </div>

            <div className="ss-facet-group">
              <div className="ss-travel-head">
                <span className="ss-body-sm">
                  {filters.acceptanceMin <= 0 ? 'bez omezení' : `aspoň ${filters.acceptanceMin} %`}
                </span>
              </div>
              <p className="ss-caption">Míra přijetí alespoň</p>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.acceptanceMin}
                onChange={(e) => setPatch({ acceptanceMin: Number(e.target.value) })}
                className="ss-travel-slider"
                aria-label="Nejnižší míra přijetí"
              />
            </div>

            {jpzOptions.map((o) => (
              <CheckOption
                key={o.value}
                checked={filters.jpz.includes(o.value)}
                label={o.label}
                count={o.count}
                onChange={() => toggleIn('jpz', o.value)}
              />
            ))}
          </FacetSection>

          <hr className="ss-divider" />

          <FacetSection title="Další" activeCount={moreActiveCount}>
            {jazykOptions.map((o) => (
              <CheckOption
                key={o.value}
                checked={o.checked}
                label={o.label}
                count={o.count}
                onChange={() => toggleIn('jazyky', o.value)}
              />
            ))}

            <div className="ss-facet-group">
              <div className="ss-travel-head">
                <span className="ss-body-sm">
                  {filters.kapacitaMin <= 0 ? 'bez omezení' : `aspoň ${filters.kapacitaMin}`}
                </span>
              </div>
              <p className="ss-caption">Volných míst alespoň</p>
              <input
                type="range"
                min="0"
                max="150"
                step="10"
                value={filters.kapacitaMin}
                onChange={(e) => setPatch({ kapacitaMin: Number(e.target.value) })}
                className="ss-travel-slider"
                aria-label="Nejmenší kapacita"
              />
            </div>

          </FacetSection>

          <hr className="ss-divider" />

          {/* Parked, not deleted — real MHD commute time needs a routing API
              we haven't wired (see UNFORGET.md). Visibly disabled rather than
              silently doing nothing, per the plan's D5. */}
          <div className="ss-facet-group ss-parked">
            <div className="ss-parked-head">
              <p className="ss-label-caps">Dojezd MHD</p>
              <span className="ss-parked-badge">zatím nedostupné</span>
            </div>
            <input type="range" className="ss-travel-slider" disabled aria-label="Dojezd MHD (nedostupné)" />
            <p className="ss-caption">
              Skutečný čas dojezdu MHD zatím neumíme spočítat, tak ho radši neukazujeme.
            </p>
          </div>

          {/* Mobile-only — the sidebar stacks above the results at <860px, so
              this is the live-count "commit" affordance: never a blind Apply,
              always the current count, jumps straight to the list below. */}
          <button
            type="button"
            className="ss-mobile-commit"
            onClick={() => document.getElementById('ss-results')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Zobrazit {n} {skol(n)}
          </button>
        </aside>

        <section className="ss-results" id="ss-results">
          {loading && <p className="ss-status">Načítám školy…</p>}
          {error && <p className="ss-status is-error">Školy se nepodařilo načíst: {error}</p>}

          {!loading && !error && (
            <>
              {activeCriteriaCount === 0 && recentRows.length > 0 && view === 'list' && (
                <div className="ss-recent">
                  <p className="ss-label-caps">Naposledy zobrazené</p>
                  <div className="ss-chip-group">
                    {recentRows.map((r) => (
                      <Link key={r.id} to={`/skoly/${r.id}`} className="ss-district-toggle">
                        {r.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="ss-results-head">
                <div className="ss-count-row">
                  <h1 className="ss-headline-md">{n} {skol(n)} z {total}</h1>
                  <p className="ss-caption">
                    {activeCriteriaCount
                      ? `odpovídá ${activeCriteriaCount} ${plural(activeCriteriaCount, 'filtru', 'filtrům', 'filtrům')} · seznam se mění průběžně, nic se nepotvrzuje`
                      : 'bez filtrů · vyber obor nebo městskou část'}
                  </p>
                  <div className="ss-view-toggle">
                    <button
                      type="button"
                      className={view === 'list' ? 'is-active' : ''}
                      onClick={() => setView('list')}
                    >
                      Seznam škol
                    </button>
                    <button
                      type="button"
                      className={view === 'map' ? 'is-active' : ''}
                      onClick={() => setView('map')}
                    >
                      Mapa škol
                    </button>
                  </div>
                </div>
                <div className="ss-chips-row">
                  {chips.map((c) => (
                    <span className="ss-chip" key={c.key}>
                      {c.label}
                      <button type="button" onClick={c.onRemove} aria-label={`Odebrat filtr ${c.label}`}>
                        <X size={13} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  {chips.length > 0 && (
                    <button type="button" className="ss-clear-all" onClick={clearAll}>
                      Zrušit všechny filtry
                    </button>
                  )}
                </div>
              </div>

              <div className="ss-sort-row">
                <p className="ss-label-caps">Řadit</p>
                <div className="ss-sort-options">
                  {SORTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`ss-sort-toggle${filters.sort === s.id ? ' is-active' : ''}`}
                      onClick={() => setPatch({ sort: s.id })}
                    >
                      <span className="ss-sort-label">{s.label}</span>
                      <span className="ss-sort-tradeoff">{s.tradeoff}</span>
                    </button>
                  ))}
                  <button type="button" className="ss-sort-toggle is-disabled" disabled aria-disabled="true">
                    <span className="ss-sort-label">Nejkratší dojezd</span>
                    <span className="ss-sort-tradeoff">zatím nedostupné</span>
                  </button>
                </div>
              </div>

              {view === 'map' && n > 0 && (
                <SchoolMap rows={sortedAll} selectedId={selectedMapId} onSelect={handleMapSelect} />
              )}

              {view === 'list' && n === 0 && (
                <div className="ss-empty">
                  <div className="ss-empty-head">
                    <h2 className="ss-headline-sm">Žádná škola nesplňuje všechny filtry současně</h2>
                    <p className="ss-body-md">{blameSentence}</p>
                  </div>

                  {relaxOptions.length > 0 && (
                    <div className="ss-facet-group">
                      <p className="ss-label-caps">Uvolnit jeden filtr</p>
                      <div className="ss-relax-list">
                        {relaxOptions.map((r) => (
                          <div className="ss-relax-row" key={r.label}>
                            <p className="ss-body-sm">{r.label}</p>
                            <div className="ss-relax-meta">
                              <span className="ss-data-sm ss-relax-gain">{r.gain}</span>
                              <button
                                type="button"
                                className={`ss-btn ss-btn-sm ${r.variant === 'primary' ? 'ss-btn-primary' : 'ss-btn-secondary'}`}
                                onClick={r.onApply}
                              >
                                Použít
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <hr className="ss-divider" />

                  <div className="ss-clear-row">
                    <button type="button" className="ss-btn ss-btn-secondary" onClick={clearAll}>
                      Zrušit všechny filtry ({total} {skol(total)})
                    </button>
                    <p className="ss-caption">Filtry v levém panelu zůstávají nastavené, dokud je nezrušíš.</p>
                  </div>

                  {nearMisses.length > 0 && (
                    <div className="ss-near-misses">
                      <p className="ss-label-caps">Blízko tvému zadání</p>
                      {nearMisses.map((nm) => (
                        <div className="ss-near-miss" key={nm.name}>
                          <p className="ss-headline-sm">{nm.name}</p>
                          <p className="ss-caption">{nm.why}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {view === 'list' && n > 0 && (
                <div className="ss-list">
                  {shown.map((row) => {
                    const isSelected = selected.has(row.id);
                    const isFavorite = favorites.has(row.id);
                    const rowCriteria = criteriaFor(row, filters);
                    const metCount = rowCriteria.filter((c) => c.met).length;
                    const metTotal = rowCriteria.length;
                    const ukonceni = ukonceniText(row.p);
                    const noAdmissionData = row.admissionCutoff == null && row.acceptanceRate == null;
                    return (
                      <div className={`ss-row${isSelected ? ' is-selected' : ''}`} key={row.id}>
                        <div className="ss-row-select">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(row.id)}
                            aria-label={`Vybrat ${row.name} k porovnání`}
                          />
                        </div>
                        <div className="ss-row-body">
                          <Link to={`/skoly/${row.id}`} className="ss-row-link">
                            <div className="ss-row-title">
                              <h2 className="ss-headline-sm">{row.name}</h2>
                              <p className="ss-caption">
                                {row.districtLabel}
                                {row.p.zrizovatel ? ` · ${row.p.zrizovatel}` : ''}
                                {ukonceni ? ` · ${ukonceni}` : ''}
                                {row.p.count > 0 ? ` · ${row.p.count} ${obor(row.p.count)}` : ''}
                              </p>
                            </div>
                            {row.progs.length > 0 && (
                              <div className="ss-row-chips">
                                {row.progs.map((p) => (
                                  <span className="ss-row-chip" key={p}>{p}</span>
                                ))}
                              </div>
                            )}
                            {row.diff && <p className="ss-row-diff ss-body-sm">{row.diff}</p>}
                            <div className="ss-stat-grid">
                              <div className="ss-stat-cell">
                                <p className="ss-data-md">
                                  {row.admissionCutoff != null ? `${numCz(row.admissionCutoff)} b.` : '—'}
                                </p>
                                <p className="ss-stat-label">
                                  průměrná hranice
                                  <StatInfo text="Průměr z posledních 3 let (2024–2026). Nejnižší počet bodů z češtiny a matematiky (max. 100 — 50 + 50), které stačily na přijetí — je to hranice pro přijetí, ne průměrné skóre přijatých žáků. Průměr přes všechny obory školy; hranici pro konkrétní obor a rok najdeš po rozkliknutí školy. (Nové školy mohou mít kratší historii.)" />
                                </p>
                              </div>
                              <div className="ss-stat-cell">
                                <p className="ss-data-md">
                                  {row.acceptanceRate != null ? `${numCz(row.acceptanceRate)} %` : '—'}
                                </p>
                                <p className="ss-stat-label">
                                  přijato z přihlášených
                                  <StatInfo text="Průměr z posledních 3 let (2024–2026): kolik procent uchazečů škola v posledním kole přijala, v průměru přes všechny obory. Podrobnosti po jednotlivých oborech a letech najdeš po rozkliknutí školy. (Nové školy mohou mít kratší historii.)" />
                                </p>
                              </div>
                              <div className="ss-stat-cell">
                                <p className="ss-data-md">{row.p.kapacita ?? '—'}</p>
                                <p className="ss-stat-label">
                                  volných míst
                                  <StatInfo text="Celkový počet míst ve všech oborech, které škola otevírá pro aktuální rok." />
                                </p>
                              </div>
                              <div className="ss-stat-cell">
                                <p className="ss-data-md">{metTotal > 0 ? `${metCount} / ${metTotal}` : '—'}</p>
                                <p className="ss-stat-label">
                                  splněných kritérií
                                  <StatInfo text="Kolik ze zvolených filtrů tahle škola splňuje." />
                                </p>
                              </div>
                            </div>
                            {noAdmissionData && (
                              <p className="ss-caption ss-no-data-note">
                                Tahle škola nebyla v prvním kole přijímaček 2026, takže o ní zatím čísla nemáme.
                              </p>
                            )}
                          </Link>
                        </div>
                        <div className="ss-row-actions">
                          <Link to={`/skoly/${row.id}`} className="ss-btn ss-btn-secondary ss-btn-sm">
                            Detail
                          </Link>
                          {canFavorite && (
                            <FavoriteButton
                              schoolId={row.id}
                              isFavorite={isFavorite}
                              onChange={(next) =>
                                setFavorites((prev) => {
                                  const nextSet = new Set(prev);
                                  if (next) nextSet.add(row.id);
                                  else nextSet.delete(row.id);
                                  return nextSet;
                                })
                              }
                              className="ss-favorite"
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {view === 'list' && rest > 0 && (
                <div className="ss-more">
                  <button
                    type="button"
                    className="ss-btn ss-btn-secondary"
                    onClick={() => setPatch({ page: filters.page + 10 })}
                  >
                    {moreLabel}
                  </button>
                </div>
              )}

              {n > 0 && (
                <p className="ss-caption ss-footnote">
                  {SYNTHETIC &&
                    'Hranice přijetí, míra přijetí, typ školy, zřizovatel, jazyk výuky a kapacita jsou reálná data z Cermatu. Dojezd MHD je zatím vypnutý — viz UNFORGET.md.'}
                </p>
              )}
            </>
          )}
        </section>
      </div>

      <div
        className="ss-compare-bar"
        style={{
          transform: selected.size > 0 ? 'translateY(0)' : 'translateY(100%)',
          opacity: selected.size > 0 ? 1 : 0,
          pointerEvents: selected.size > 0 ? 'auto' : 'none',
        }}
      >
        <div className="ss-compare-bar-inner">
          <p className="ss-body-sm">
            Vybráno k porovnání: {selected.size} {skol(selected.size)} / {COMPARE_LIMIT} · porovnání ukáže stejné
            řádky vedle sebe
          </p>
          <button type="button" className="ss-btn ss-btn-secondary" onClick={() => setSelected(new Set())}>
            Zrušit výběr
          </button>
          <button type="button" className="ss-btn ss-btn-primary" onClick={handleCompare}>
            Porovnat {selected.size} {skolGen(selected.size)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Search;
