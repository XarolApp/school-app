import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  X,
  SlidersHorizontal,
  ChevronDown,
  Check,
  Monitor,
  FlaskConical,
  ChartColumn,
  BookOpen,
  Palette,
  HeartPulse,
  Users,
  ChefHat,
  Dumbbell,
  Wrench,
  Info,
} from 'lucide-react';
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
import SearchFilters, {
  AdmissionsGroup,
  DistrictGroup,
  FieldGroup,
  TypGroup,
  UkonceniGroup,
} from '../components/SearchFilters';
import FilterPopover from '../components/FilterPopover';
import Modal from '../components/Modal';
import AsyncState from '../components/AsyncState';
import useMediaQuery from '../lib/useMediaQuery';
import useBottomBarSpace from '../lib/useBottomBarSpace';
import { getRecentSchoolIds, getCompareSelection, setCompareSelection } from '../lib/searchPrefs';
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
 *   districtLabel     fallback "Praha N" only when the school has no real district
 */
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
  const districtRoll = 1 + Math.floor(rand() * 22); // 1–22, used only as a fallback
  return { districtRoll };
}

// Czech pluralization — three forms: 1 / 2–4 / 5+.
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
const skol = (n) => plural(n, 'škola', 'školy', 'škol');
const skolGen = (n) => plural(n, 'školu', 'školy', 'škol');
const misto = (n) => plural(n, 'místo', 'místa', 'míst');
const numCz = (v) => String(v).replace('.', ',');
const matchLevel = (score) => (score >= 85 ? 'is-strong' : score >= 70 ? 'is-mid' : 'is-low');

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

function zrizovatelLabel(value) {
  if (value === 'veřejné/státní') return 'veřejná';
  if (value === 'soukromé') return 'soukromá';
  if (value === 'církevní') return 'církevní';
  return value;
}

const SORTS = [
  { id: 'shoda', label: 'Nejlepší shoda', tradeoff: 'podle tvého dotazníku' },
  { id: 'match', label: 'Nejvíc splněných kritérií', tradeoff: 'nebere ohled na dojezd' },
  { id: 'cut', label: 'Nejnižší hranice přijetí', tradeoff: 'bezpečnější, ne nutně silnější škola' },
  { id: 'acceptance', label: 'Největší šance na přijetí', tradeoff: 'podle loňské míry přijetí' },
];

const FIELD_ICONS = {
  it: Monitor,
  prirodni: FlaskConical,
  ekonomie: ChartColumn,
  humanitni: BookOpen,
  umeni: Palette,
  zdravotnictvi: HeartPulse,
  pedagogika: Users,
  gastro: ChefHat,
  sport: Dumbbell,
  remeslo: Wrench,
};

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

  const allProgs = [...new Set(splitPrograms(school.programs || '').map(baseProgram))].filter(Boolean);

  return {
    id: school.id,
    school,
    name: school.name,
    location: school.location,
    focus: features.focus,
    districtLabel,
    districtSynthesized,
    progs: allProgs.slice(0, 2),
    progTotal: allProgs.length,
    p,
    // Real data, average % score across every obor and every year Cermat's
    // file has been imported for — see import-admission-data.js. null means
    // this school hasn't been matched to a Cermat row yet, not a 0.
    admissionCutoff: school.admission_cutoff ?? null,
    acceptanceRate: school.acceptance_rate ?? null,
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
  // 'shoda' when the account has a questionnaire behind it; Search falls back
  // to 'match' at render time when no school carries a match_score, so a signed
  // -out visitor never lands on a sort with nothing to sort by.
  sort: 'shoda',
};

// Real numbered pages, not a growing "load more" cap — each page is a fixed
// slice of the SAME already-filtered-and-sorted list (`sortedAll` below), so
// page 1 and page 5 always agree with the current sort/filter combination.
// Never re-filter or re-sort per page.
const PAGE_SIZE = 40;

// Same cap /sdileni and the comparison table both assume — a 5th column
// stops being a comparison and starts being a spreadsheet.
const COMPARE_LIMIT = 4;

function Search() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set(getCompareSelection()));
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState('list'); // 'list' | 'map'
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [openPopover, setOpenPopover] = useState(null);
  const isMobile = useMediaQuery('(max-width: 860px)');
  const filterTriggerRef = useRef(null);
  const filterReturnRef = useRef(null);
  const searchInputRef = useRef(null);
  const resultsHeadingRef = useRef(null);
  const pageRef = useRef(null);
  const compareBarRef = useRef(null);

  useEffect(() => {
    if (isMobile) setOpenPopover(null);
    else setSheet((current) => (current === 'all' ? current : null));
  }, [isMobile]);

  const { isSignedIn, hasAccess } = useAuth();

  const [loadTick, setLoadTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSchools()
      .then((list) => !cancelled && setSchools(list))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loadTick]);

  useEffect(() => {
    if (!isSignedIn || !hasAccess) return;
    fetchFavorites()
      .then((rows) => setFavorites(new Set(rows.map((r) => r.school_id ?? r.id))))
      .catch(() => {});
  }, [isSignedIn, hasAccess]);

  // Any change to filters (a new checkbox, a slider drag, a sort switch, a
  // typed query) changes which schools are in the list and/or their order —
  // staying on page 5 of a now-8-result list would show nothing. setFilters
  // always produces a new object, so this fires on every real filter change.
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Rows carry both the real fields and the synthetic stand-ins. Stable
  // across reloads because synth() is a pure function of school.id.
  const rows = useMemo(() => schools.map(buildRow), [schools]);

  // match_score only exists for a signed-in account that has a questionnaire
  // behind it (server.js attaches it from the default run). Without one there
  // is nothing to show in the stat cell and nothing to sort by, so both the
  // column and the "Nejlepší shoda" sort disappear rather than rendering "—"
  // on all 223 rows.
  const hasMatch = useMemo(
    () => rows.some((r) => typeof r.school.match_score === 'number'),
    [rows]
  );
  const sortOptions = useMemo(() => (hasMatch ? SORTS : SORTS.filter((s) => s.id !== 'shoda')), [hasMatch]);
  const activeSort = !hasMatch && filters.sort === 'shoda' ? 'match' : filters.sort;

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

  // The query a filter set is evaluated against comes from THAT set, not from
  // the current page state — otherwise a hypothetical "same filters, no query"
  // (empty-state relaxation) would still be scored against the typed query.
  const currentCtx = { prepared, hasQuery, raw: filters.query.trim().toLowerCase() };
  const queryCtx = (q) => {
    if (q === filters.query) return currentCtx;
    const pq = prepareQuery(q);
    return { prepared: pq, hasQuery: pq.tokens.length > 0, raw: q.trim().toLowerCase() };
  };

  const matchesQuery = (row, ctx) => {
    if (!ctx.hasQuery) return true;
    const entry = indexById.get(row.id);
    if (entry && scoreSchool(entry, ctx.prepared) > 0) return true;
    // KKOV codes ("79-41-K") aren't in the fuzzy name/programs/location
    // index — matched separately here as a plain substring so one search
    // bar covers both a school name and an obor code, instead of two boxes.
    return row.p.kkov.some((k) => k.toLowerCase().includes(ctx.raw));
  };

  const criteriaFor = (row, f, ctx = queryCtx(f.query)) => {
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
    if (ctx.hasQuery) out.push({ k: 'q', met: matchesQuery(row, ctx) });
    return out;
  };

  const listFor = (f) => {
    const ctx = queryCtx(f.query);
    return rows.filter((row) => criteriaFor(row, f, ctx).every((c) => c.met));
  };

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

    if (sortId === 'shoda') {
      arr.sort((a, b) => {
        const am = a.school.match_score ?? -1;
        const bm = b.school.match_score ?? -1;
        return bm - am || byName(a, b);
      });
    } else if (sortId === 'cut') arr.sort(byCutoffAsc);
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
  const sortedAll = sortRows(matchedAll, activeSort, filters);
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
      apply: () => setPatch({ query: '' }),
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

  let blameSentence = 'Žádný jednotlivý filtr to sám neuvolní. Zruš celou kombinaci a začni od jednoho kritéria.';
  if (helpfulRelax.length) {
    const worst = helpfulRelax[0];
    blameSentence = `Nejvíc omezuje ${worst.blame}. Bez něj by odpovídalo ${worst.gainN} ${skolGen(worst.gainN)} z ${total}.`;
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
      why: `${x.row.districtLabel} · ${x.row.p.zrizovatel ?? 'zřizovatel neznámý'} · ${cutoffLabel(x.row.admissionCutoff)}. Nesplňuje ${UNMET_LABELS[x.unmet[0].k]}.`,
    }));

  // ---- pagination ----
  // sortedAll is already the full filtered+sorted list (computed above, once,
  // before any slicing) — pagination only ever slices it, never re-derives
  // it, so page 1 and page 6 can never disagree about order or membership.
  const totalPages = Math.max(1, Math.ceil(n / PAGE_SIZE));
  // Defensive clamp only — the [filters] effect above already resets to 1 on
  // every filter change, this just guards the render itself against a stale
  // currentPage from, e.g., the schools list finishing a reload with fewer
  // rows than before.
  const safePage = Math.min(currentPage, totalPages);
  const shown = sortedAll.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const goToPage = (page) => {
    const clamped = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(clamped);
    document.getElementById('ss-results')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Compact page-number list: always show first, last, current, and one
  // neighbour on each side; everything else collapses to a single "…" per
  // gap so the control stays a fixed, glanceable width even at 20+ pages.
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
    const out = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) out.push('…');
      out.push(p);
    });
    return out;
  }, [totalPages, safePage]);

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

  useBottomBarSpace(compareBarRef, pageRef, selected.size > 0);

  const activeFacetCount = activeCriteriaCount - (hasQuery ? 1 : 0);
  const hasScore = hasMatch || activeCriteriaCount > 0;
  const filtersEl = (
    <SearchFilters
      filters={filters}
      setPatch={setPatch}
      toggleIn={toggleIn}
      total={total}
      ukonceniOptions={ukonceniOptions}
      typOptions={typOptions}
      districtOptions={districtOptions}
      fieldOptions={fieldOptions}
      zrizovatelOptions={zrizovatelOptions}
      jpzOptions={jpzOptions}
      jazykOptions={jazykOptions}
      admissionsActiveCount={admissionsActiveCount}
      moreActiveCount={moreActiveCount}
    />
  );

  const filterGroups = [
    {
      id: 'fields',
      label: 'Zaměření',
      activeCount: filters.fields.length,
      onClear: () => setPatch({ fields: [] }),
      content: <FieldGroup fieldOptions={fieldOptions} toggleIn={toggleIn} />,
    },
    {
      id: 'districts',
      label: 'Městská část',
      activeCount: filters.districts.length,
      onClear: () => setPatch({ districts: [] }),
      content: <DistrictGroup districtOptions={districtOptions} toggleIn={toggleIn} />,
    },
    {
      id: 'ukonceni',
      label: 'Maturita / výuční list',
      activeCount: filters.ukonceni.length,
      onClear: () => setPatch({ ukonceni: [] }),
      content: (
        <UkonceniGroup
          filters={filters}
          ukonceniOptions={ukonceniOptions}
          toggleIn={toggleIn}
          total={total}
        />
      ),
    },
    {
      id: 'typ',
      label: 'Typ školy',
      activeCount: filters.typySkoly.length,
      onClear: () => setPatch({ typySkoly: [] }),
      content: <TypGroup typOptions={typOptions} toggleIn={toggleIn} />,
    },
    {
      id: 'admissions',
      label: 'Šance na přijetí',
      activeCount: admissionsActiveCount,
      onClear: () => setPatch({ cutoffMax: 100, acceptanceMin: 0, jpz: [] }),
      content: (
        <AdmissionsGroup
          filters={filters}
          setPatch={setPatch}
          jpzOptions={jpzOptions}
          toggleIn={toggleIn}
        />
      ),
    },
  ];
  const activeSheetGroup = filterGroups.find((group) => group.id === sheet);

  const openAllFilters = () => {
    filterReturnRef.current = filterTriggerRef.current;
    setSheet('all');
  };
  const openMobileFilter = (groupId, event) => {
    filterReturnRef.current = event.currentTarget;
    setSheet(groupId);
  };
  const closeFilters = () => setSheet(null);
  const showResults = () => {
    filterReturnRef.current = resultsHeadingRef.current ?? filterTriggerRef.current;
    setSheet(null);
  };

  const activeSortLabel = sortOptions.find((o) => o.id === activeSort)?.label ?? sortOptions[0].label;
  const closeSort = () => (isMobile ? showResults() : setOpenPopover(null));
  const sortList = (
    <div className="ss-sort-options" role="radiogroup" aria-label="Řadit">
      {sortOptions.map((o) => (
        <label
          key={o.id}
          className={`ss-sort-option${activeSort === o.id ? ' is-active' : ''}`}
          // detail > 0 = a real click; arrow keys change the radio without closing.
          onClick={(event) => {
            if (event.detail === 0) return;
            event.currentTarget.closest('.ss-filter-popover')?.querySelector('.ss-fbtn')?.focus();
            closeSort();
          }}
        >
          <input
            type="radio"
            name="ss-sort"
            value={o.id}
            checked={activeSort === o.id}
            onChange={() => setPatch({ sort: o.id })}
          />
          <span className="ss-sort-option-check" aria-hidden="true">
            {activeSort === o.id && <Check size={16} />}
          </span>
          <span className="ss-sort-option-label">{o.label}</span>
          <span className="ss-sort-option-note">{o.tradeoff}</span>
        </label>
      ))}
    </div>
  );
  const sortTrigger = (
    <span>
      <span className="ss-sort-prefix">Řadit:</span> {activeSortLabel}
    </span>
  );
  const sortControl = isMobile ? (
    <button
      type="button"
      className="ss-fbtn ss-sort-trigger"
      aria-expanded={sheet === 'sort'}
      aria-haspopup="dialog"
      onClick={(event) => openMobileFilter('sort', event)}
    >
      {sortTrigger}
      <span className={`ss-fbtn-chevron${sheet === 'sort' ? ' is-open' : ''}`} aria-hidden="true">
        <ChevronDown size={14} />
      </span>
    </button>
  ) : (
    <FilterPopover
      id="sort"
      label="Řadit"
      trigger={sortTrigger}
      footer={false}
      activeCount={0}
      open={openPopover === 'sort'}
      onOpenChange={(open) => setOpenPopover(open ? 'sort' : null)}
    >
      {sortList}
    </FilterPopover>
  );

  const allFiltersButton = (
    <button
      type="button"
      ref={filterTriggerRef}
      className={`ss-fbtn ss-fbtn-all${activeFacetCount > 0 ? ' is-set' : ''}`}
      aria-expanded={sheet === 'all'}
      aria-haspopup="dialog"
      onClick={openAllFilters}
    >
      <SlidersHorizontal size={16} aria-hidden="true" />
      {isMobile ? 'Filtry' : 'Všechny filtry'}
      {activeFacetCount > 0 && <span className="ss-facet-badge">{activeFacetCount}</span>}
    </button>
  );

  const mobileGroupButton = (group) => (
    <button
      key={group.id}
      type="button"
      className={`ss-fbtn${group.activeCount > 0 ? ' is-set' : ''}`}
      aria-expanded={sheet === group.id}
      aria-haspopup="dialog"
      onClick={(event) => openMobileFilter(group.id, event)}
    >
      {group.label}
      {group.activeCount > 0 && <span className="ss-facet-badge">{group.activeCount}</span>}
      <span className={`ss-fbtn-chevron${sheet === group.id ? ' is-open' : ''}`} aria-hidden="true">
        <ChevronDown size={14} />
      </span>
    </button>
  );

  const filterBar = (
    <div className="ss-filterbar-scroll">
      <div className="ss-filterbar">
        {isMobile ? (
          <>
            {allFiltersButton}
            {filterGroups.map(mobileGroupButton)}
          </>
        ) : (
          <>
            {filterGroups.map((group) => (
              <FilterPopover
                key={group.id}
                id={group.id}
                label={group.label}
                activeCount={group.activeCount}
                open={openPopover === group.id}
                onOpenChange={(open) => setOpenPopover(open ? group.id : null)}
                onClear={group.onClear}
                resultCount={n}
              >
                {group.content}
              </FilterPopover>
            ))}
            {allFiltersButton}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="school-search" ref={pageRef}>
      <header className="ss-page-header">
        <div className="ss-page-title-source">
          <h1 className="ss-headline-lg">Střední školy v Praze</h1>
          {!loading && !error && (
            <p className="ss-body-md ss-source-line">
              {total} {skol(total)}. Data o přijímačkách z Cermatu, roky 2024 až 2026.
            </p>
          )}
        </div>
        {!loading && !error && activeCriteriaCount === 0 && recentRows.length > 0 && view === 'list' && (
          <div className="ss-recent" aria-label="Naposledy zobrazené školy">
            <span>Naposledy:</span>{' '}
            {recentRows.slice(0, 3).map((row, index) => (
              <span className="ss-recent-item" key={row.id}>
                {index > 0 && ', '}
                <Link to={`/skoly/${row.id}`} title={row.name}>
                  {row.name}
                </Link>
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="ss-search-controls">
        <div className="ss-search-input-wrap">
          <SearchIcon aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="search"
            className="ss-search-input"
            placeholder="Název školy, obor nebo třeba „gympl“"
            value={filters.query}
            onChange={(e) => setPatch({ query: e.target.value })}
            aria-label="Hledat školu"
          />
          {filters.query && (
            <button
              type="button"
              className="ss-search-clear"
              aria-label="Vymazat hledání"
              onClick={() => {
                setPatch({ query: '' });
                searchInputRef.current?.focus();
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        {filterBar}
        {chips.length > 0 && (
          <div className="ss-chips-row">
            {chips.map((chip) => (
              <span className="ss-chip" key={chip.key}>
                {chip.label}
                <button type="button" onClick={chip.onRemove} aria-label={`Odebrat filtr ${chip.label}`}>
                  <X size={13} aria-hidden="true" />
                </button>
              </span>
            ))}
            <button type="button" className="ss-clear-all" onClick={clearAll}>
              Zrušit vše
            </button>
          </div>
        )}
      </div>

      <Modal
        open={sheet !== null}
        title={sheet === 'all' ? 'Filtry' : sheet === 'sort' ? 'Řadit' : activeSheetGroup?.label ?? 'Filtry'}
        onDismiss={closeFilters}
        returnFocusRef={filterReturnRef}
        className="ss-filter-sheet"
      >
        <button type="button" className="ss-sheet-close" onClick={closeFilters} aria-label="Zavřít filtry">
          <X size={20} aria-hidden="true" />
        </button>
        {sheet === 'all' ? filtersEl : sheet === 'sort' ? sortList : activeSheetGroup?.content}
        <button type="button" className="ss-mobile-commit" onClick={showResults}>
          Zobrazit {n} {skol(n)}
        </button>
      </Modal>

      {!loading && !error && activeCriteriaCount === 0 && (
        <section className="ss-browse" aria-labelledby="ss-browse-title">
          <h2 id="ss-browse-title">Nevíš, kde začít? Vyber zaměření.</h2>
          <p className="ss-body-sm">
            Zúží seznam na školy s obory v té oblasti. Další filtry můžeš přidat potom.
          </p>
          <div className="ss-browse-grid">
            {fieldOptions.map((option) => {
              const FieldIcon = FIELD_ICONS[option.id];
              return (
                <button
                  type="button"
                  className="ss-browse-tile"
                  key={option.id}
                  onClick={() => {
                    toggleIn('fields', option.id);
                    resultsHeadingRef.current?.focus();
                  }}
                >
                  {FieldIcon && <FieldIcon size={18} aria-hidden="true" />}
                  <span>{option.label}</span>
                  <span className="ss-data-sm">{option.count}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="ss-results" id="ss-results">
          {loading && <AsyncState kind="loading" title="Načítám školy…" />}
          {error && !loading && (
            <AsyncState
              kind="error"
              title="Školy se nepodařilo načíst"
              onRetry={() => setLoadTick((t) => t + 1)}
            >
              Zkontroluj připojení a zkus to znovu. Tvoje filtry zůstanou, jak jsou. ({error})
            </AsyncState>
          )}

          {!loading && !error && (
            <>
              <div className="ss-toolbar">
                <h2 className="ss-headline-sm ss-toolbar-count" ref={resultsHeadingRef} tabIndex={-1}>
                  {n} {skol(n)}
                  {n !== total && <span className="ss-body-sm"> z {total}</span>}
                </h2>
                <div className="ss-toolbar-controls">
                  {view === 'list' && sortControl}
                  <div className="ss-view-toggle">
                    <button
                      type="button"
                      className={view === 'list' ? 'is-active' : ''}
                      aria-pressed={view === 'list'}
                      onClick={() => setView('list')}
                    >
                      Seznam
                    </button>
                    <button
                      type="button"
                      className={view === 'map' ? 'is-active' : ''}
                      aria-pressed={view === 'map'}
                      onClick={() => setView('map')}
                    >
                      Mapa
                    </button>
                  </div>
                </div>
              </div>

              {view === 'list' && n > 0 && (
                <p className="ss-legend ss-body-sm">
                  <Info size={16} aria-hidden="true" />
                  <span>
                    {activeSort === 'cut' && <>Řazeno od nejnižší hranice: bezpečnější volba, ne nutně lepší škola. </>}
                    {activeSort === 'acceptance' && <>Řazeno podle loňské míry přijetí. </>}
                    <strong>Hranice</strong> je nejnižší počet bodů z přijímaček (max. 100), se kterým se dalo dostat, průměr za 3 roky přes všechny obory. <strong>Přijato</strong> je podíl přijatých ze všech přihlášených. <strong>Míst</strong> je počet míst, která škola letos otevírá.
                    {hasMatch && <> <strong>Shoda</strong> říká, jak škola sedí na tvoje odpovědi z dotazníku, ne jak je dobrá.</>}
                    {!hasMatch && activeCriteriaCount > 0 && <> <strong>Splňuje</strong> je počet tvých filtrů, které škola splňuje.</>}
                  </span>
                </p>
              )}

              {view === 'map' && n > 0 && (
                <SchoolMap rows={sortedAll} selectedId={selectedMapId} onSelect={handleMapSelect} />
              )}

              {n === 0 && (
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
                    <p className="ss-caption">Filtry zůstávají nastavené, dokud je nezrušíš.</p>
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
                <>
                  <div className={`ss-list-head${hasScore ? ' has-score' : ''}`} aria-hidden="true">
                    <span />
                    <span>Škola</span>
                    <span className="ss-cell-obory">Obory</span>
                    {hasScore && <span className="ss-header-numeric">{hasMatch ? 'Shoda' : 'Splňuje'}</span>}
                    <span className="ss-header-numeric">Hranice</span>
                    <span className="ss-header-center">Přijato</span>
                    <span className="ss-header-numeric">Míst</span>
                    <span />
                  </div>
                  <ul className={`ss-list${hasScore ? ' has-score' : ''}`}>
                    {shown.map((row) => {
                      const isSelected = selected.has(row.id);
                      const isFavorite = favorites.has(row.id);
                      const rowCriteria = criteriaFor(row, filters);
                      const metCount = rowCriteria.filter((criterion) => criterion.met).length;
                      const metTotal = rowCriteria.length;
                      const ukonceni = ukonceniText(row.p);
                      const noAdmissionData = row.admissionCutoff == null && row.acceptanceRate == null;
                      const extra = Math.max(row.p.count, row.progTotal) - row.progs.length;
                      const schoolMeta = [
                        row.districtLabel,
                        zrizovatelLabel(row.p.zrizovatel),
                        ukonceni,
                      ].filter(Boolean).join(' · ');
                      const compareDisabled = selected.size >= COMPARE_LIMIT && !isSelected;

                      return (
                        <li className={`ss-row${isSelected ? ' is-selected' : ''}${hasScore ? ' has-score' : ''}`} key={row.id}>
                          <div className="ss-row-foot">
                            <label className="ss-row-select">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={compareDisabled}
                                title={compareDisabled ? `Porovnat jde nejvýš ${COMPARE_LIMIT} školy.` : undefined}
                                onChange={() => toggleSelect(row.id)}
                                aria-label={`Vybrat ${row.name} k porovnání`}
                              />
                              <span>Porovnat</span>
                            </label>
                          </div>

                          <div className="ss-cell-school">
                            <h3 className="ss-row-name">
                              <Link to={`/skoly/${row.id}`} className="ss-row-link" title={row.name}>
                                {row.name}
                              </Link>
                            </h3>
                            <p className="ss-caption ss-row-meta">{schoolMeta}</p>
                          </div>

                          <div className="ss-cell-obory">
                            {row.progs.map((program) => (
                              <span className="ss-row-chip ss-data-sm" key={program} title={program}>
                                {program}
                              </span>
                            ))}
                            {extra > 0 && <span className="ss-caption ss-row-extra">+ {extra}</span>}
                          </div>

                          {hasScore && (
                            <div className="ss-cell-score">
                              {hasMatch ? (
                                typeof row.school.match_score === 'number' ? (
                                  <span className={`ss-match-score ${matchLevel(row.school.match_score)}`}>{row.school.match_score} %</span>
                                ) : (
                                  <span className="ss-caption ss-cell-missing">bez dat</span>
                                )
                              ) : (
                                <span className="ss-data-md">{metCount} z {metTotal}</span>
                              )}
                            </div>
                          )}

                          <div className="ss-row-numbers">
                            {noAdmissionData ? (
                              <span className="ss-caption ss-cell-missing ss-cell-no-admission">
                                Nebyla v prvním kole přijímaček 2026, čísla zatím nemáme.
                              </span>
                            ) : (
                              <div className="ss-cell-number ss-cell-cutoff">
                                <span className="ss-data-md">
                                  <span className="sr-only">hranice přijetí </span>
                                  {row.admissionCutoff != null ? `${numCz(row.admissionCutoff)} b.` : <span className="ss-caption ss-cell-missing">bez dat</span>}
                                </span>
                                <span className="ss-caption ss-number-label">hranice</span>
                              </div>
                            )}
                            {!noAdmissionData && (
                              <div className="ss-cell-number ss-cell-acceptance">
                                <span className="ss-data-md">
                                  <span className="sr-only">přijato </span>
                                  {row.acceptanceRate != null ? `${Math.round(row.acceptanceRate)} %` : <span className="ss-caption ss-cell-missing">bez dat</span>}
                                </span>
                                {row.acceptanceRate != null && (
                                  <span className="ss-accept-bar" aria-hidden="true">
                                    <span style={{ width: `${Math.min(100, Math.round(row.acceptanceRate))}%` }} />
                                  </span>
                                )}
                                <span className="ss-caption ss-number-label">přijato</span>
                              </div>
                            )}
                            <div className="ss-cell-number ss-cell-places">
                              <span className="ss-data-md">
                                <span className="sr-only">volných míst </span>
                                {row.p.kapacita != null ? row.p.kapacita : <span className="ss-caption ss-cell-missing">bez dat</span>}
                              </span>
                              <span className="ss-caption ss-number-label">míst</span>
                            </div>
                          </div>

                          <div className="ss-row-favorite">
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
                              />
                            )}
                          </div>

                        </li>
                      );
                    })}
                  </ul>
                </>
              )}

              {view === 'list' && totalPages > 1 && (
                <nav className="ss-pager" aria-label="Stránkování výsledků">
                  <p className="ss-caption ss-pager-status">
                    Strana {safePage} z {totalPages}
                  </p>
                  <div className="ss-pager-controls">
                    <button
                      type="button"
                      className="ss-btn ss-btn-secondary ss-btn-sm ss-pager-nav"
                      onClick={() => goToPage(safePage - 1)}
                      disabled={safePage === 1}
                    >
                      Předchozí
                    </button>
                    <div className="ss-pager-numbers">
                      {pageNumbers.map((p, i) =>
                        p === '…' ? (
                          <span className="ss-pager-ellipsis" key={`ellipsis-${i}`} aria-hidden="true">
                            …
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            className={`ss-pager-number${p === safePage ? ' is-active' : ''}`}
                            onClick={() => goToPage(p)}
                            aria-current={p === safePage ? 'page' : undefined}
                            aria-label={`Strana ${p}`}
                          >
                            {p}
                          </button>
                        )
                      )}
                    </div>
                    <button
                      type="button"
                      className="ss-btn ss-btn-secondary ss-btn-sm ss-pager-nav"
                      onClick={() => goToPage(safePage + 1)}
                      disabled={safePage === totalPages}
                    >
                      Další
                    </button>
                  </div>
                </nav>
              )}

              {n > 0 && (
                <p className="ss-caption ss-footnote">
                  Hranice, míra přijetí, typ školy, zřizovatel, jazyk výuky a počet míst jsou reálná data z Cermatu.
                </p>
              )}
            </>
          )}
      </section>

      {selected.size > 0 && (
        <div className="ss-compare-bar" ref={compareBarRef}>
          <div className="ss-compare-bar-inner">
            <p className="ss-body-sm">
              {isMobile ? (
                <strong>{selected.size} {plural(selected.size, 'vybraná škola', 'vybrané školy', 'vybraných škol')}</strong>
              ) : (
                <>
                  <strong>{selected.size} {skol(selected.size)}</strong> k porovnání (max. {COMPARE_LIMIT})
                </>
              )}
            </p>
            <button
              type="button"
              className="ss-compare-clear"
              onClick={() => setSelected(new Set())}
            >
              {isMobile ? 'Zrušit' : 'Zrušit výběr'}
            </button>
            <button type="button" className="ss-btn ss-btn-primary ss-compare-action" onClick={handleCompare}>
              Porovnat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Search;
