import { track } from '../lib/betaTrack';
import { Sk } from '../components/PageSkeleton';
import { readHint, writeHint } from '../lib/skeletonHints';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  X,
  SlidersHorizontal,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Check,
  ClipboardCheck,
  ClipboardPlus,
  Scale,
  Monitor,
  FlaskConical,
  ChartColumn,
  BookOpen,
  Palette,
  HeartPulse,
  Users,
  ChefHat,
  ChevronUp,
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
import { summarizeAdmission, formatCutoffRange, isLengthNote } from '../lib/schoolPrograms';
import { kkovGroupOf, kkovGroupName } from '../lib/kkovGroups';
import { useAuth } from '../components/AuthContext';
import FavoriteButton from '../components/FavoriteButton';
import SchoolMap from '../components/SchoolMap';
import SearchFilters, {
  AdmissionsGroup,
  DistrictGroup,
  FieldGroup,
  OborGroup,
  TypGroup,
  UkonceniGroup,
  ZrizovatelGroup,
  DalsiGroup,
} from '../components/SearchFilters';
import FilterPopover from '../components/FilterPopover';
import Modal from '../components/Modal';
import AsyncState from '../components/AsyncState';
import useMediaQuery from '../lib/useMediaQuery';
import useBottomBarSpace from '../lib/useBottomBarSpace';
import { getRecentSchoolIds, getCompareSelection, setCompareSelection } from '../lib/searchPrefs';
import { usePicks } from '../lib/usePicks';
import './search.css';
import { readDraft } from '../lib/useDraft';

// Admission facts come from Cermat programme rows. Districts come from the
// server's coordinate-based mapping; missing data must stay unknown.

// Czech pluralization — three forms: 1 / 2–4 / 5+.
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
const skol = (n) => plural(n, 'škola', 'školy', 'škol');
const skolGen = (n) => plural(n, 'školu', 'školy', 'škol');
const numCz = (v) => String(v).replace('.', ',');
const matchLevel = (score) => (score >= 85 ? 'is-strong' : score >= 70 ? 'is-mid' : 'is-low');

// Cutoffs are POINTS (Czech+Math out of 100 = 50+50, halved from Cermat's
// raw 0–200 sum), newest year only, as a range across the school's obory.
// Always "no data" rather than a fabricated number for an unmatched school.
const cutoffLabel = (adm) => {
  const range = formatCutoffRange(adm);
  if (!range) return 'hranice přijetí zatím bez dat';
  return `hranice přijetí ${adm.year} ${range}${adm.isOld ? ' (starší data)' : ''}`;
};

function zrizovatelLabel(value) {
  if (value === 'veřejné/státní') return 'veřejná';
  if (value === 'soukromé') return 'soukromá';
  if (value === 'církevní') return 'církevní';
  return value;
}

// `defaultDir` is the direction a sort starts in; the direction button flips it.
// `dirs` names both directions in words, so "sestupně" never has to be guessed.
const SORTS = [
  {
    id: 'relevance', label: 'Shoda s hledáním', short: 'Hledání', tradeoff: 'nejpodobnější tvému hledanému textu', defaultDir: 'desc',
    dirs: { asc: 'od nejméně podobných', desc: 'od nejpodobnějších' },
  },
  {
    id: 'shoda', label: 'Shoda s tebou', short: 'Shoda', tradeoff: 'podle tvého dotazníku', defaultDir: 'desc',
    dirs: { asc: 'od nejnižší shody', desc: 'od nejvyšší shody' },
  },
  {
    id: 'cut', label: 'Hranice přijetí', short: 'Hranice', tradeoff: 'nižší hranice = snazší se dostat', defaultDir: 'asc',
    dirs: { asc: 'od nejnižší hranice', desc: 'od nejvyšší hranice' },
  },
  {
    id: 'acceptance', label: 'Míra přijetí', short: 'Přijato', tradeoff: 'kolik přihlášených škola přijala', defaultDir: 'desc',
    dirs: { asc: 'od nejnižší míry přijetí', desc: 'od nejvyšší míry přijetí' },
  },
  {
    id: 'places', label: 'Počet míst', short: 'Míst', tradeoff: 'míst podle posledních dostupných dat', defaultDir: 'desc',
    dirs: { asc: 'od nejméně míst', desc: 'od nejvíce míst' },
  },
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
  obor: 'filtr oborů, hranice, míst nebo formy studia',
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
 * offering both maturitní and nematuritní programmes is true for both, which is why
 * per-option counts can overlap or omit unknown values (see the note
 * rendered under that filter group).
 */
function summarizePrograms(school) {
  const programs = school.school_programs ?? [];
  // One entry per obor. The list API splits an obor into one row per zaměření
  // (programme), so the row count alone would overstate how many obory a school
  // has. An obor is multi-programme under the same rule as the school detail:
  // 2+ real programmes (length notes like "zkrácené studium" do not count), all
  // named.
  const byObor = new Map();
  for (const p of programs) {
    const key = [p.kkov, p.obor_nazev, p.typ_skoly, p.delka_studia, p.jazyk_studia].join('|');
    if (!byObor.has(key)) byObor.set(key, { names: new Set(), unnamed: false });
    const entry = byObor.get(key);
    if (isLengthNote(p.zamereni)) continue;
    const name = (p.zamereni ?? '').trim().toLowerCase();
    if (name) entry.names.add(name);
    else entry.unnamed = true;
  }
  return {
    count: byObor.size,
    // Total programmes across obory that have several; 0 when none does.
    focusCount: [...byObor.values()].filter((e) => e.names.size > 1 && !e.unnamed).reduce((n, e) => n + e.names.size, 0),
    maturitni: programs.some((p) => p.maturitni === true),
    nematuritni: programs.some((p) => p.maturitni === false),
    jpzPovinna: programs.some((p) => p.jpz_povinna === true),
    jpzNepovinna: programs.some((p) => p.jpz_povinna === false),
    typy: [...new Set(programs.map((p) => p.typ_skoly).filter(Boolean))],
    jazyky: [...new Set(programs.map((p) => p.jazyk_studia).filter(Boolean))],
    kkov: [...new Set(programs.map((p) => p.kkov).filter(Boolean))],
    // One entry per obor, so a range filter can require the SAME obor to fit
    // every limit at once ("IT obor with hranice under 60") instead of matching
    // an easy obor on one number and a hard one on another.
    obory: programs.map((p) => ({
      kkov: p.kkov ?? null,
      nazev: p.obor_nazev ?? null,
      forma: p.forma_vzdelavani ?? null,
      cutoff: p.cutoff ?? null,
      kapacita: p.kapacita ?? null,
      prihlasky: p.prihlasky ?? null,
      prijati: p.prijati ?? null,
      rok: p.rok ?? null,
    })),
    formy: [...new Set(programs.map((p) => p.forma_vzdelavani).filter(Boolean))],
    zrizovatel: programs[0]?.zrizovatel ?? null,
    kapacita: programs.some((p) => p.kapacita != null)
      ? programs.reduce((sum, p) => sum + (p.kapacita || 0), 0)
      : null,
  };
}

function ukonceniText(p) {
  if (p.maturitni && p.nematuritni) return 'maturitní i nematuritní obory';
  if (p.maturitni) return 'maturitní';
  if (p.nematuritni) return 'bez maturity';
  return null;
}

function buildRow(school) {
  const features = deriveFeatures(school);
  const p = summarizePrograms(school);
  const districtLabel = districtOf(school); // "Praha N" or null; never invented

  const allProgs = [...new Set(splitPrograms(school.programs || '').map(baseProgram))].filter(Boolean);

  return {
    id: school.id,
    school,
    name: school.name,
    location: school.location,
    focus: features.focus,
    districtLabel,
    progs: allProgs.slice(0, 2),
    progTotal: allProgs.length,
    p,
    // Newest year only (see summarizeAdmission). null = no Cermat rows, not 0.
    admission: summarizeAdmission(school),
  };
}

// Range filters that apply to one obor's own numbers. Empty string = no limit.
// Data is the latest Cermat year; an obor with no number for a field (e.g.
// talent-exam obory have no hranice) fails an active limit on it — "no data"
// is not "within range".
const RANGES = [
  { id: 'cutoff', label: 'Hranice přijetí', unit: 'b.', get: (o) => o.cutoff },
  { id: 'places', label: 'Počet míst', unit: '', get: (o) => o.kapacita },
  {
    id: 'applicants',
    label: 'Uchazečů na místo',
    unit: '',
    get: (o) => (o.kapacita > 0 && o.prihlasky != null ? o.prihlasky / o.kapacita : null),
  },
  {
    id: 'accepted',
    label: 'Přijato z přihlášených',
    unit: '%',
    get: (o) => (o.prihlasky > 0 && o.prijati != null ? (100 * o.prijati) / o.prihlasky : null),
  },
];

// 0 limits nothing (every count and cutoff is >= 0), so it counts as no limit.
const bound = (v) => (v === '' || v == null || Number.isNaN(Number(v)) || Number(v) === 0 ? null : Number(v));
const rangeActive = (f, r) => bound(f[`${r.id}Min`]) != null || bound(f[`${r.id}Max`]) != null;
const oborFiltersActive = (f) => f.obory.length > 0 || f.formy.length > 0 || RANGES.some((r) => rangeActive(f, r));

function oborPasses(o, f) {
  if (f.obory.length && !f.obory.includes(o.kkov)) return false;
  if (f.formy.length && !f.formy.includes(o.forma)) return false;
  return RANGES.every((r) => {
    if (!rangeActive(f, r)) return true;
    const v = r.get(o);
    const lo = bound(f[`${r.id}Min`]);
    const hi = bound(f[`${r.id}Max`]);
    return v != null && (lo == null || v >= lo) && (hi == null || v <= hi);
  });
}

function rangeLabel(r, f) {
  const lo = bound(f[`${r.id}Min`]);
  const hi = bound(f[`${r.id}Max`]);
  const u = r.unit ? ` ${r.unit}` : '';
  if (lo != null && hi != null) return `${r.label} ${numCz(lo)}–${numCz(hi)}${u}`;
  if (lo != null) return `${r.label} od ${numCz(lo)}${u}`;
  return `${r.label} do ${numCz(hi)}${u}`;
}

const FORMA_LABELS = { den: 'Denní', vec: 'Večerní', dal: 'Dálková', komb: 'Kombinovaná', dist: 'Distanční' };
const formaLabel = (v) => FORMA_LABELS[v] ?? v;

const DEFAULT_FILTERS = {
  query: '',
  fields: [],
  districts: [],
  ukonceni: [], // 'maturitni' | 'nematuritni'
  typySkoly: [],
  zrizovatele: [],
  jazyky: [],
  jpz: [], // 'povinna' | 'nepovinna'
  obory: [], // KKOV codes, matched against one obor at a time — see oborPasses
  formy: [], // Cermat form codes: den | dal | komb | dist
  ...Object.fromEntries(RANGES.flatMap((r) => [[`${r.id}Min`, ''], [`${r.id}Max`, '']])),
  // 'shoda' when the account has a questionnaire behind it; Search falls back
  // to 'cut' at render time when no school carries a match_score.
  sort: 'shoda',
  sortDir: '', // '' = the sort's own default direction; 'asc' | 'desc' once flipped
};

// Real numbered pages, not a growing "load more" cap — each page is a fixed
// slice of the SAME already-filtered-and-sorted list (`sortedAll` below), so
// page 1 and page 5 always agree with the current sort/filter combination.
// Never re-filter or re-sort per page.
const PAGE_SIZE = 40;

// Keep Search, /porovnani and /sdileni on the same five-school limit.
const COMPARE_LIMIT = 5;
const COMPARE_BAR_COLLAPSED_KEY = 'snm.compareBar.collapsed';

function readCompareBarCollapsed() {
  try {
    return localStorage.getItem(COMPARE_BAR_COLLAPSED_KEY) === 'true';
  } catch {
    return false;
  }
}

// Skeleton for the results block: same toolbar, column header and row cells
// as the loaded list, grey where the data goes.
function ResultsSkeleton({ hasScore }) {
  return (
    <div role="status" aria-busy="true">
      <span className="ss-visually-hidden">Načítám školy…</span>
      <div className="ss-toolbar"><Sk w={110} h={28} /><Sk w={420} h={40} /></div>
      <Sk h={42} style={{ margin: '16px 0' }} />
      <div className={`ss-list-head${hasScore ? ' has-score' : ''}`}>
        <span>Škola</span>
        <span className="ss-cell-obory">Obory</span>
        {hasScore && <span className="ss-header-numeric">Shoda</span>}
        <span className="ss-header-numeric">Hranice</span>
        <span className="ss-header-center">Přijato</span>
        <span className="ss-header-numeric">Míst</span>
        <span />
      </div>
      <ul className={`ss-list${hasScore ? ' has-score' : ''}`}>
        {Array.from({ length: 8 }, (_, i) => (
          <li className={`ss-row${hasScore ? ' has-score' : ''}`} key={i}>
            <div className="ss-cell-school"><Sk w="70%" h={22} style={{ marginBottom: 6 }} /><Sk w="55%" h={14} /></div>
            <div className="ss-cell-obory"><Sk w={130} h={24} r="999px" /></div>
            {hasScore && <div className="ss-cell-score"><Sk w={48} h={24} r="999px" /></div>}
            <div className="ss-row-numbers">
              <div className="ss-cell-number ss-cell-cutoff"><Sk w={44} h={20} /></div>
              <div className="ss-cell-number ss-cell-acceptance"><Sk w={60} h={20} /></div>
              <div className="ss-cell-number ss-cell-places"><Sk w={28} h={20} /></div>
            </div>
            <div className="ss-row-actions"><Sk w={40} h={40} /><Sk w={40} h={40} /><Sk w={40} h={40} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Search() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());
  // Per-device preference, default on. Storage can throw (private mode), so
  // it only ever falls back to the default.
  const [savedFirst, setSavedFirstState] = useState(() => {
    try {
      return localStorage.getItem('skolamatch.savedFirst') !== '0';
    } catch {
      return true;
    }
  });
  const setSavedFirst = (on) => {
    setSavedFirstState(on);
    try {
      localStorage.setItem('skolamatch.savedFirst', on ? '1' : '0');
    } catch {
      /* preference just won't survive a reload */
    }
  };
  const [selected, setSelected] = useState(() => new Set(getCompareSelection()));
  const [compareBarCollapsed, setCompareBarCollapsed] = useState(readCompareBarCollapsed);
  // ?q= pre-fills the search box (used by the 404 page's search form).
  // Filters and the list/map choice survive a reload or a trip to another tab.
  const [filters, setFilters] = useState(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) return { ...DEFAULT_FILTERS, query: q };
    const saved = readDraft('snm.search.filters', null);
    return saved && typeof saved === 'object' ? { ...DEFAULT_FILTERS, ...saved } : DEFAULT_FILTERS;
  });
  useEffect(() => {
    try { sessionStorage.setItem('snm.search.filters', JSON.stringify(filters)); } catch { /* the page still works */ }
  }, [filters]);
  const [currentPage, setCurrentPage] = useState(1);
  const [view, setView] = useState(() => (readDraft('snm.search.view', 'list') === 'map' ? 'map' : 'list')); // 'list' | 'map'
  useEffect(() => {
    try { sessionStorage.setItem('snm.search.view', JSON.stringify(view)); } catch { /* the page still works */ }
  }, [view]);
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
  const compareCollapseRef = useRef(null);
  const compareExpandRef = useRef(null);
  const compareFocusTarget = useRef(null);

  const changeCompareBarCollapsed = (collapsed) => {
    compareFocusTarget.current = collapsed ? 'expand' : 'collapse';
    setCompareBarCollapsed(collapsed);
    try {
      localStorage.setItem(COMPARE_BAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      /* The bar still works until this page is closed. */
    }
  };

  useEffect(() => {
    const target = compareFocusTarget.current === 'expand' ? compareExpandRef : compareCollapseRef;
    if (!compareFocusTarget.current) return;
    compareFocusTarget.current = null;
    target.current?.focus();
  }, [compareBarCollapsed]);

  useEffect(() => {
    if (isMobile) setOpenPopover(null);
    else setSheet((current) => (current === 'all' ? current : null));
  }, [isMobile]);

  const { isSignedIn, hasAccess } = useAuth();
  const { pickIds, toggle: togglePick, saving: savingPick } = usePicks();

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

  // Derive display/filter fields once per catalogue load.
  const rows = useMemo(() => schools.map(buildRow), [schools]);

  const prepared = useMemo(() => prepareQuery(filters.query), [filters.query]);
  // Bug fix: prepareQuery('') returns a truthy object with zero tokens. Used
  // naively as a boolean, an empty search box would still take the "must
  // match" branch and — since nothing has zero tokens to satisfy — the whole
  // list would vanish on load. Only treat the query as active once it has an
  // actual token to match against.
  const hasQuery = prepared.tokens.length > 0;

  // match_score only exists for a signed-in account that has a questionnaire
  // behind it (server.js attaches it from the default run). Without one there
  // is nothing to show in the stat cell and nothing to sort by, so both the
  // column and the "Nejlepší shoda" sort disappear rather than rendering "—"
  // on every loaded row.
  const hasMatch = useMemo(
    () => rows.some((r) => typeof r.school.match_score === 'number'),
    [rows]
  );
  const sortOptions = SORTS.filter((s) => (s.id === 'relevance' ? hasQuery : s.id !== 'shoda' || hasMatch));
  // Without a questionnaire (or from an old saved 'match' sort) the list is
  // ordered by lowest cutoff, which is what the removed 'match' sort did anyway.
  // While a query is typed and the student hasn't picked a sort, the best
  // text match leads; picking any sort chip overrides that.
  const activeSort =
    hasQuery && (!filters.sortPicked || filters.sort === 'relevance')
      ? 'relevance'
      : filters.sort === 'match' || filters.sort === 'relevance' || (!hasMatch && filters.sort === 'shoda')
        ? 'cut'
        : filters.sort;
  const activeSortDef = SORTS.find((o) => o.id === activeSort) ?? SORTS[2];
  // A sort that just fell back to 'cut' uses its own default, not a stale flip.
  const sortDir = activeSortDef.id === filters.sort && filters.sortDir ? filters.sortDir : activeSortDef.defaultDir;

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
    if (oborFiltersActive(f)) out.push({ k: 'obor', met: row.p.obory.some((o) => oborPasses(o, f)) });
    if (ctx.hasQuery) out.push({ k: 'q', met: matchesQuery(row, ctx) });
    return out;
  };

  const listFor = (f) => {
    const ctx = queryCtx(f.query);
    return rows.filter((row) => criteriaFor(row, f, ctx).every((c) => c.met));
  };

  const SORT_VALUE = {
    relevance: (r) => {
      const entry = indexById.get(r.id);
      return entry ? scoreSchool(entry, currentCtx.prepared) : 0;
    },
    shoda: (r) => r.school.match_score,
    cut: (r) => r.admission?.cutoffMin,
    acceptance: (r) => r.admission?.acceptance,
    places: (r) => r.p.kapacita,
  };
  // A school with no value sorts after every school that has one, in either
  // direction; "null - 35" would otherwise put it first.
  const sortRows = (list, sortId, dir) => {
    const value = SORT_VALUE[sortId] ?? SORT_VALUE.cut;
    const sign = dir === 'asc' ? 1 : -1;
    // Schools with no current-year (2026) admission data go after everything
    // else, in every sort: they may have closed or stopped taking applicants.
    const stale = (r) => (!r.admission || r.admission.isOld ? 1 : 0);
    return list.slice().sort((a, b) => {
      if (stale(a) !== stale(b)) return stale(a) - stale(b);
      const va = value(a);
      const vb = value(b);
      if (va == null && vb == null) return a.name.localeCompare(b.name, 'cs');
      if (va == null) return 1;
      if (vb == null) return -1;
      return sign * (va - vb) || a.name.localeCompare(b.name, 'cs');
    });
  };

  const total = rows.length;
  const matchedAll = listFor(filters);
  const sortedByChoice = sortRows(matchedAll, activeSort, sortDir);
  // Saved schools lead the list (sort order kept inside each half) unless the
  // student switched it off.
  const sortedAll =
    savedFirst && favorites.size > 0
      ? [...sortedByChoice.filter((r) => favorites.has(r.id)), ...sortedByChoice.filter((r) => !favorites.has(r.id))]
      : sortedByChoice;
  const n = sortedAll.length;
  useEffect(() => {
    const timer = setTimeout(() => {
      const query = filters.query.trim().slice(0, 120);
      const safe = query && schools.some((school) => school.name.toLowerCase().includes(query.toLowerCase())) ? query : undefined;
      if (query) track('search', { length: filters.query.length, query: safe, results: n });
      if (!n) track('search_zero', { query: safe });
    }, 700);
    return () => clearTimeout(timer);
  }, [filters.query, n, schools]);

  const setPatch = (patch) => {
    for (const key of Object.keys(patch)) if (key !== 'query') track(key === 'sort' ? 'sort_used' : 'filter_used', key === 'sort' ? { sort: patch.sort } : { filter: key });
    setFilters((f) => ({ ...f, ...patch }));
  };

  const toggleIn = (key, value) => {
    track('filter_used', { filter: key });
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
  const oborFacet = useMemo(() => collectFacet(rows, (row) => row.p.kkov, compareByCount), [rows]);
  const oborGroupCounts = useMemo(
    () => Object.fromEntries(
      collectFacet(rows, (row) => [...new Set(row.p.kkov.map(kkovGroupOf))], compareByCount).map((g) => [g.value, g.count])
    ),
    [rows]
  );
  // KKOV -> its most common obor name (a school may use its own zaměření name).
  const kkovNames = useMemo(() => {
    const seen = new Map();
    for (const row of rows) {
      for (const o of row.p.obory) {
        if (!o.kkov || !o.nazev) continue;
        const names = seen.get(o.kkov) ?? new Map();
        names.set(o.nazev, (names.get(o.nazev) ?? 0) + 1);
        seen.set(o.kkov, names);
      }
    }
    return new Map([...seen].map(([k, names]) => [k, [...names].sort((a, b) => b[1] - a[1])[0][0]]));
  }, [rows]);
  const formaFacet = useMemo(() => collectFacet(rows, (row) => row.p.formy, compareByCount), [rows]);
  // The Cermat year the numbers come from, shown in the labels ("Počet míst 2026").
  const dataYear = useMemo(
    () => Math.max(0, ...rows.flatMap((row) => row.p.obory.map((o) => o.rok ?? 0))) || null,
    [rows]
  );

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
    { value: 'nematuritni', label: 'Bez maturity', count: listFor({ ...filters, ukonceni: ['nematuritni'] }).length },
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

  // Static counts (schools that have this obor at all), not "if you tick it":
  // with ~165 names the per-option listFor pass would run on every keystroke.
  const oborOptions = oborFacet
    .map((o) => ({
      value: o.value,
      label: `${o.value} - ${kkovNames.get(o.value) ?? ''}`,
      group: kkovGroupOf(o.value),
      checked: filters.obory.includes(o.value),
      count: o.count,
    }))
    .sort((a, b) => a.value.localeCompare(b.value));
  const formaOptions = formaFacet.map((x) => ({
    value: x.value,
    label: formaLabel(x.value),
    checked: filters.formy.includes(x.value),
    count: listFor({ ...filters, formy: [x.value] }).length,
  }));

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
    oborFiltersActive(filters),
    hasQuery,
  ].filter(Boolean).length;

  // Collapsed groups show how many of their own filters are active, per the
  // "filter-count badge on the collapsed control" pattern.
  const rangeCount = (ids) => RANGES.filter((r) => ids.includes(r.id) && rangeActive(filters, r)).length;
  const admissionsActiveCount = rangeCount(['cutoff', 'applicants', 'accepted', 'places']) + filters.jpz.length;
  const moreActiveCount = filters.jazyky.length + filters.formy.length;

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
      label: v === 'maturitni' ? 'Maturitní' : 'Bez maturity',
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
  {
    const byGroup = new Map();
    for (const o of oborOptions) {
      if (!byGroup.has(o.group)) byGroup.set(o.group, []);
      byGroup.get(o.group).push(o.value);
    }
    const covered = new Set();
    for (const [group, codes] of byGroup) {
      if (codes.length > 1 && codes.every((c) => filters.obory.includes(c))) {
        codes.forEach((c) => covered.add(c));
        chips.push({
          key: `og-${group}`,
          label: `${kkovGroupName(group)} (vše)`,
          onRemove: () => setPatch({ obory: filters.obory.filter((v) => !codes.includes(v)) }),
        });
      }
    }
    filters.obory
      .filter((v) => !covered.has(v))
      .forEach((v) =>
        chips.push({ key: `o-${v}`, label: `${v} ${kkovNames.get(v) ?? ''}`.trim(), onRemove: () => toggleIn('obory', v) })
      );
  }
  filters.formy.forEach((v) =>
    chips.push({ key: `fo-${v}`, label: formaLabel(v), onRemove: () => toggleIn('formy', v) })
  );
  RANGES.filter((r) => rangeActive(filters, r)).forEach((r) =>
    chips.push({
      key: `r-${r.id}`,
      label: `${rangeLabel(r, filters)}${r.id === 'places' && dataYear ? ` (${dataYear})` : ''}`,
      onRemove: () => setPatch({ [`${r.id}Min`]: '', [`${r.id}Max`]: '' }),
    })
  );
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
      key: 'obory',
      active: filters.obory.length > 0,
      blame: 'omezení na vybrané obory',
      label: 'Zrušit omezení oborů',
      reset: { obory: [] },
      apply: () => setPatch({ obory: [] }),
    },
    {
      key: 'formy',
      active: filters.formy.length > 0,
      blame: 'omezení formy studia',
      label: 'Zrušit omezení formy studia',
      reset: { formy: [] },
      apply: () => setPatch({ formy: [] }),
    },
    ...RANGES.filter((r) => rangeActive(filters, r)).map((r) => ({
      key: r.id,
      active: true,
      blame: rangeLabel(r, filters).toLowerCase(),
      label: `Zrušit omezení: ${r.label.toLowerCase()}`,
      reset: { [`${r.id}Min`]: '', [`${r.id}Max`]: '' },
      apply: () => setPatch({ [`${r.id}Min`]: '', [`${r.id}Max`]: '' }),
    })),
  ];

  const relaxRaw = filterDefs
    .filter((d) => d.active)
    .map((d) => ({
      blame: d.blame,
      label: d.label,
      gainN: listFor({ ...filters, ...(d.reset ?? { [d.key]: DEFAULT_FILTERS[d.key] }) }).length,
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
    blameSentence = `Nejvíc omezuje ${worst.blame}. Bez něj by ${plural(worst.gainN, 'odpovídala', 'odpovídaly', 'odpovídalo')} ${worst.gainN} ${skol(worst.gainN)} z ${total}.`;
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
      why: `${x.row.districtLabel || 'Městská část neuvedena'} · ${x.row.p.zrizovatel ?? 'zřizovatel neznámý'} · ${cutoffLabel(x.row.admission)}. Nesplňuje ${UNMET_LABELS[x.unmet[0].k]}.`,
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

  // Persist on every change, not only on "Porovnat": otherwise "Zrušit výběr"
  // is undone by the next reload, which re-reads the stale stored selection.
  useEffect(() => {
    setCompareSelection([...selected]);
  }, [selected]);

  const handleCompare = () => navigate('/porovnani');

  const canFavorite = isSignedIn && hasAccess;

  const savedFirstToggle = canFavorite && favorites.size > 0 && (
    <label className="ss-saved-first">
      <input type="checkbox" checked={savedFirst} onChange={(e) => setSavedFirst(e.target.checked)} />
      Zobrazovat uložené školy nahoře
    </label>
  );

  const compareToggle = (row, isSelected, disabled) => (
    <button
      type="button"
      className={`ss-icon-toggle${isSelected ? ' is-active' : ''}`}
      aria-pressed={isSelected}
      disabled={disabled}
      title={disabled ? `Porovnat můžeš nejvýš ${COMPARE_LIMIT} škol.` : isSelected ? 'Odebrat z porovnání' : 'Přidat k porovnání'}
      aria-label={`${isSelected ? 'Odebrat z porovnání' : 'Přidat k porovnání'}: ${row.name}`}
      onClick={() => toggleSelect(row.id)}
    >
      <Scale size={18} aria-hidden="true" />
    </button>
  );
  const pickToggle = (row) => {
    const isPicked = pickIds.has(row.id);
    const title = isPicked ? 'Odebrat z přihlášky' : 'Přidat do přihlášky';
    return (
      <button
        type="button"
        className={`ss-icon-toggle${isPicked ? ' is-active' : ''}`}
        aria-pressed={isPicked}
        aria-label={`${title}: ${row.name}`}
        title={title}
        disabled={savingPick}
        onClick={() => togglePick(row.school)}
      >
        {isPicked ? <ClipboardCheck size={18} aria-hidden="true" /> : <ClipboardPlus size={18} aria-hidden="true" />}
      </button>
    );
  };
  const favoriteToggle = (row, isFavorite) => (
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
  );

  const handleMapSelect = useCallback((id) => setSelectedMapId(id), []);

  useBottomBarSpace(compareBarRef, pageRef, selected.size > 0);

  const activeFacetCount = activeCriteriaCount - (hasQuery ? 1 : 0);
  const hasScore = hasMatch;
  useEffect(() => { if (!loading) writeHint('searchScore', hasScore); }, [loading, hasScore]);
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
      oborOptions={oborOptions}
      oborGroupCounts={oborGroupCounts}
      formaOptions={formaOptions}
      year={dataYear}
      admissionsActiveCount={admissionsActiveCount}
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
      id: 'obory',
      label: 'Konkrétní obory',
      activeCount: filters.obory.length,
      onClear: () => setPatch({ obory: [] }),
      content: (
        <OborGroup
          oborOptions={oborOptions}
          groupCounts={oborGroupCounts}
          selected={filters.obory}
          setObory={(obory) => setPatch({ obory })}
        />
      ),
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
      label: 'Ukončení studia',
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
      label: 'Přijímačky a místa',
      activeCount: admissionsActiveCount,
      onClear: () =>
        setPatch({
          cutoffMin: '', cutoffMax: '', acceptedMin: '', acceptedMax: '', applicantsMax: '',
          placesMin: '', placesMax: '', jpz: [],
        }),
      content: (
        <AdmissionsGroup
          filters={filters}
          setPatch={setPatch}
          jpzOptions={jpzOptions}
          toggleIn={toggleIn}
          year={dataYear}
        />
      ),
    },
    {
      id: 'zrizovatel',
      label: 'Zřizovatel',
      activeCount: filters.zrizovatele.length,
      onClear: () => setPatch({ zrizovatele: [] }),
      content: <ZrizovatelGroup zrizovatelOptions={zrizovatelOptions} toggleIn={toggleIn} />,
    },
    {
      id: 'dalsi',
      label: 'Další',
      activeCount: moreActiveCount,
      onClear: () => setPatch({ jazyky: [], formy: [] }),
      content: (
        <DalsiGroup
          filters={filters}
          setPatch={setPatch}
          jazykOptions={jazykOptions}
          formaOptions={formaOptions}
          toggleIn={toggleIn}
          year={dataYear}
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

  const activeSortLabel = `${activeSortDef.short}, ${activeSortDef.dirs[sortDir]}`;
  const flipDir = () => setPatch({ sort: activeSortDef.id, sortPicked: true, sortDir: sortDir === 'asc' ? 'desc' : 'asc' });
  const DirIcon = sortDir === 'asc' ? ArrowUp : ArrowDown;
  const dirButton = (
    <button
      type="button"
      className="ss-fbtn ss-sort-dir"
      onClick={flipDir}
      aria-label={`Směr řazení: ${sortDir === 'asc' ? 'vzestupně' : 'sestupně'}, ${activeSortDef.dirs[sortDir]}. Kliknutím obrátíš.`}
      title="Obrátit směr řazení"
    >
      <DirIcon size={14} aria-hidden="true" />
      {sortDir === 'asc' ? 'Vzestupně' : 'Sestupně'}
      <span className="ss-sort-dir-note">{activeSortDef.dirs[sortDir]}</span>
    </button>
  );
  const closeSort = showResults;
  const onSortKeyDown = (event, option) => {
    const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    const next = (sortOptions.indexOf(option) + direction + sortOptions.length) % sortOptions.length;
    setPatch({ sort: sortOptions[next].id, sortPicked: true, sortDir: '' });
    event.currentTarget.parentElement.querySelectorAll('[role="radio"]')[next]?.focus();
  };
  const sortList = (
    <div className="ss-sort-options" role="radiogroup" aria-label="Řadit">
      {sortOptions.map((o) => (
        <label
          key={o.id}
          className={`ss-sort-option${activeSort === o.id ? ' is-active' : ''}`}
          // detail > 0 = a real click; arrow keys change the radio without closing.
          onClick={(event) => {
            if (event.detail > 0) closeSort();
          }}
        >
          <input
            type="radio"
            name="ss-sort"
            value={o.id}
            checked={activeSort === o.id}
            onChange={() => setPatch({ sort: o.id, sortPicked: true, sortDir: '' })}
          />
          <span className="ss-sort-option-check" aria-hidden="true">
            {activeSort === o.id && <Check size={16} />}
          </span>
          <span className="ss-sort-option-label">{o.label}</span>
          <span className="ss-sort-option-note">{o.tradeoff}</span>
        </label>
      ))}
      <div className="ss-sort-dir-row">{dirButton}</div>
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
    <div className="ss-sort-chips" role="radiogroup" aria-label="Řadit">
      <span className="ss-sort-prefix">Řadit:</span>
      {sortOptions.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={activeSort === o.id}
          tabIndex={activeSort === o.id ? 0 : -1}
          onKeyDown={(event) => onSortKeyDown(event, o)}
          className={`ss-fbtn${activeSort === o.id ? ' is-on' : ''}`}
          onClick={() => setPatch({ sort: o.id, sortPicked: true, sortDir: '' })}
        >
          {o.short}
        </button>
      ))}
      {dirButton}
    </div>
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
              {total} {skol(total)}. Data o přijímačkách z Cermatu podle posledního dostupného roku každé školy. Starší údaje jsou označené; historii najdeš v detailu školy.
            </p>
          )}
          {loading && <Sk w={520} h={24} className="ss-source-line" />}
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
          Zobrazit {n} {skolGen(n)}
        </button>
      </Modal>

      {!loading && !error && activeCriteriaCount === 0 && view === 'list' && (
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
          {loading && <ResultsSkeleton hasScore={readHint('searchScore', false)} />}
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
                  {view === 'list' && isMobile && savedFirstToggle}
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
                    Řazeno podle: {activeSortDef.label.toLowerCase()}, {sortDir === 'asc' ? 'vzestupně' : 'sestupně'} ({activeSortDef.dirs[sortDir]}). {activeSort === 'cut' && sortDir === 'asc' && <>Nižší historická hranice nezaručuje přijetí. </>}
                    <strong>Hranice</strong> je nejnižší bodový výsledek přijatých uchazečů podle dat z přijímaček (max. 100), od oboru s nejnižší po obor s nejvyšší hranicí. Používáme poslední dostupný rok školy; starší údaje jsou označené a historii najdeš v detailu. <strong>Přijato</strong> je podíl přijatých ze všech přihlášených. <strong>Míst</strong> je počet míst podle dostupných údajů Cermatu.
                    {hasMatch && <> <strong>Shoda</strong> říká, jak škola sedí na tvoje odpovědi z dotazníku, ne jak je dobrá.</>}
                  </span>
                </p>
              )}

              {view === 'map' && n > 0 && (
                <SchoolMap
                  rows={sortedAll}
                  selectedId={selectedMapId}
                  onSelect={handleMapSelect}
                  renderCardActions={(row) => (
                    <>
                      {compareToggle(row, selected.has(row.id), selected.size >= COMPARE_LIMIT && !selected.has(row.id))}
                      {pickToggle(row)}
                      {canFavorite && favoriteToggle(row, favorites.has(row.id))}
                    </>
                  )}
                />
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
                  <div className={`ss-list-head${hasScore ? ' has-score' : ''}`}>
                    <span aria-hidden="true">Škola</span>
                    <span className="ss-cell-obory" aria-hidden="true">Obory</span>
                    {hasScore && <span className="ss-header-numeric" aria-hidden="true">Shoda</span>}
                    <span className="ss-header-numeric" aria-hidden="true">Hranice</span>
                    <span className="ss-header-center" aria-hidden="true">Přijato</span>
                    <span className="ss-header-numeric" aria-hidden="true">Míst</span>
                    <span>{savedFirstToggle}</span>
                  </div>
                  <ul className={`ss-list${hasScore ? ' has-score' : ''}`}>
                    {shown.map((row) => {
                      const isSelected = selected.has(row.id);
                      const isFavorite = favorites.has(row.id);
                      const ukonceni = ukonceniText(row.p);
                      const adm = row.admission;
                      const noAdmissionData = adm?.cutoffMin == null && adm?.acceptance == null;
                      const extra = Math.max(row.p.count, row.progTotal) - row.progs.length;
                      const schoolMeta = [
                        row.districtLabel,
                        zrizovatelLabel(row.p.zrizovatel),
                        ukonceni,
                        adm?.isOld ? `starší údaje o přijímačkách, ${adm.year}` : null,
                      ].filter(Boolean).join(' · ');
                      const compareDisabled = selected.size >= COMPARE_LIMIT && !isSelected;

                      return (
                        <li className={`ss-row${isSelected ? ' is-selected' : ''}${hasScore ? ' has-score' : ''}`} key={row.id}>
                          <div className="ss-cell-school">
                            <h3 className="ss-row-name">
                              <Link to={`/skoly/${row.id}`} className="ss-row-link" title={row.name}>
                                {row.name}
                              </Link>
                            </h3>
                            {row.school.official_name && (
                              <p className="ss-caption ss-row-meta">{row.school.official_name}</p>
                            )}
                            <p className="ss-caption ss-row-meta">{schoolMeta}</p>
                            {row.p.focusCount > 0 && (
                              <span
                                className="ss-row-chip ss-row-focus ss-data-sm"
                                title="Škola otevírá obor ve více zaměřeních (programech), každé s vlastní hranicí. Hranice ve sloupci vpravo je proto rozpětí. Zaměření najdeš na stránce školy."
                              >
                                {row.p.focusCount} zaměření
                              </span>
                            )}
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
                              {typeof row.school.match_score === 'number' ? (
                                <span className={`ss-match-score ${matchLevel(row.school.match_score)}`}>{row.school.match_score} %</span>
                              ) : (
                                <span className="ss-caption ss-cell-missing">bez dat</span>
                              )}
                            </div>
                          )}

                          <div className="ss-row-numbers">
                            {noAdmissionData ? (
                              <span className="ss-caption ss-cell-missing ss-cell-no-admission">
                                Údaje o hranici a míře přijetí zatím nemáme.
                              </span>
                            ) : (
                              <div className="ss-cell-number ss-cell-cutoff">
                                <span className="ss-data-md">
                                  <span className="sr-only">hranice přijetí </span>
                                  {formatCutoffRange(adm) ?? <span className="ss-caption ss-cell-missing">bez dat</span>}
                                </span>
                                <span className="ss-caption ss-number-label">
                                  {adm?.isOld ? `hranice ${adm.year}, starší` : 'hranice'}
                                </span>
                              </div>
                            )}
                            {!noAdmissionData && (
                              <div className="ss-cell-number ss-cell-acceptance">
                                <span className="ss-data-md">
                                  <span className="sr-only">přijato </span>
                                  {adm?.acceptance != null ? `${Math.round(adm.acceptance)} %` : <span className="ss-caption ss-cell-missing">bez dat</span>}
                                </span>
                                {adm?.acceptance != null && (
                                  <span className="ss-accept-bar" aria-hidden="true">
                                    <span style={{ width: `${Math.min(100, Math.round(adm.acceptance))}%` }} />
                                  </span>
                                )}
                                <span className="ss-caption ss-number-label">
                                  {adm?.isOld ? `přijato ${adm.year}, starší` : 'přijato'}
                                </span>
                              </div>
                            )}
                            <div className="ss-cell-number ss-cell-places">
                              <span className="ss-data-md">
                                <span className="sr-only">počet míst </span>
                                {row.p.kapacita != null ? row.p.kapacita : <span className="ss-caption ss-cell-missing">bez dat</span>}
                              </span>
                              <span className="ss-caption ss-number-label">míst</span>
                            </div>
                          </div>

                          <div className="ss-row-actions">
                            {compareToggle(row, isSelected, compareDisabled)}
                            {pickToggle(row)}
                            {canFavorite && favoriteToggle(row, isFavorite)}
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
        <div className={`ss-compare-bar${compareBarCollapsed ? ' is-collapsed' : ''}`} ref={compareBarRef}>
          <div
            className="ss-compare-bar-inner"
            id="ss-compare-bar-content"
            inert={compareBarCollapsed}
            aria-hidden={compareBarCollapsed}
          >
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
            <button
              type="button"
              className="ss-compare-collapse"
              ref={compareCollapseRef}
              aria-label="Skrýt lištu porovnání"
              aria-expanded={!compareBarCollapsed}
              aria-controls="ss-compare-bar-content"
              onClick={() => changeCompareBarCollapsed(true)}
            >
              <ChevronDown size={18} aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            className="ss-compare-bar-tab"
            ref={compareExpandRef}
            aria-label={`Zobrazit lištu porovnání: ${selected.size} ${skol(selected.size)} k porovnání`}
            aria-expanded={!compareBarCollapsed}
            aria-controls="ss-compare-bar-content"
            onClick={() => changeCompareBarCollapsed(false)}
          >
            <ChevronUp size={18} aria-hidden="true" />
            <span>{selected.size} {skol(selected.size)} k porovnání</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default Search;
