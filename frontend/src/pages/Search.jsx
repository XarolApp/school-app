import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
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
} from '../lib/schoolSearch';
import { deriveFeatures, FOCUS_CATEGORIES } from '../lib/schoolFeatures';
import { useAuth } from '../components/AuthContext';
import FavoriteButton from '../components/FavoriteButton';
import './search.css';

/**
 * ⚠️ SYNTHETIC STAND-IN DATA — NOT REAL, REMOVE BEFORE PUBLIC RELEASE
 *
 * The Search design needs fields the `schools` table does not have yet. Rather
 * than ship a half-built page, these are generated deterministically from the
 * school id so the whole UI is functional and reviewable.
 *
 * These numbers are INVENTED. They are attached to REAL Prague school names.
 * Shipping them to real 9th-graders would mean a student could choose a school
 * on a fabricated admission cut-off. Tracked in UNFORGET.md → "Search page ships
 * synthesized stand-in data".
 *
 * Replace each field with a real column, then delete this block:
 *   admissionCutoff  jednotná přijímací zkouška score   (35.0–70.0)
 *   acceptanceRate   % přijatých z přihlášených          (19–82)
 *   commuteMinutes   dojezd MHD                          (16–46) — also needs a user home address
 *   hasTalentExam    boolean
 *   schoolType       veřejná / soukromá / církevní
 *   districtLabel    fallback "Praha N" only when the school has no real district
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

const round1 = (n) => Math.round(n * 10) / 10;

function synth(school) {
  const rand = mulberry32(hashSeed(String(school.id)));
  const admissionCutoff = round1(35 + rand() * 35); // 35.0–70.0
  const acceptanceRate = Math.round(19 + rand() * 63); // 19–82
  const commuteMinutes = Math.round(16 + rand() * 30); // 16–46
  const hasTalentExam = rand() < 0.18;
  const typeRoll = rand();
  const schoolType = typeRoll < 0.82 ? 'veřejná' : typeRoll < 0.94 ? 'soukromá' : 'církevní';
  const districtRoll = 1 + Math.floor(rand() * 22); // 1–22, used only as a fallback
  return { admissionCutoff, acceptanceRate, commuteMinutes, hasTalentExam, schoolType, districtRoll };
}

// Czech pluralization — three forms: 1 / 2–4 / 5+.
const plural = (n, one, few, many) => (n === 1 ? one : n >= 2 && n <= 4 ? few : many);
const skol = (n) => plural(n, 'škola', 'školy', 'škol');
const skolGen = (n) => plural(n, 'školu', 'školy', 'škol');
const obor = (n) => plural(n, 'obor', 'obory', 'oborů');
const numCz = (v) => String(v).replace('.', ',');

const SORTS = [
  { id: 'match', label: 'Nejvíc splněných kritérií', tradeoff: 'nebere ohled na dojezd' },
  { id: 'travel', label: 'Nejkratší dojezd', tradeoff: 'může vynechat tvůj obor' },
  { id: 'cut', label: 'Nejnižší hranice přijetí', tradeoff: 'bezpečnější, ne nutně silnější škola' },
];

const UNMET_LABELS = {
  fields: 'filtr oboru',
  districts: 'filtr městské části',
  travel: 'dojezd',
  talent: 'podmínku bez talentové zkoušky',
  q: 'hledaný text',
};

/**
 * A true, honest differentiator sentence composed from deriveFeatures()
 * output. Nothing here is invented — if a school's data doesn't tell us
 * anything, this returns null and the row simply omits the line. See
 * plan §2b: fabricated editorial prose about named schools reads as
 * researched fact, which a labelled placeholder number does not.
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

function buildRow(school) {
  const features = deriveFeatures(school);
  const s = synth(school);
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
    admissionCutoff: s.admissionCutoff,
    acceptanceRate: s.acceptanceRate,
    commuteMinutes: s.commuteMinutes,
    hasTalentExam: s.hasTalentExam,
    schoolType: s.schoolType,
  };
}

const DEFAULT_FILTERS = {
  query: '',
  fields: [],
  districts: [],
  maxMin: 60, // 60 == "bez omezení", slider range is 10–60
  noTalent: false,
  sort: 'match',
  page: 10,
};

function Search() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

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
    return entry ? scoreSchool(entry, prepared) > 0 : false;
  };

  const criteriaFor = (row, f) => {
    const out = [];
    if (f.fields.length) out.push({ k: 'fields', met: row.focus.some((x) => f.fields.includes(x)) });
    if (f.districts.length) out.push({ k: 'districts', met: f.districts.includes(row.districtLabel) });
    if (f.maxMin < 60) out.push({ k: 'travel', met: row.commuteMinutes <= f.maxMin });
    if (f.noTalent) out.push({ k: 'talent', met: !row.hasTalentExam });
    if (hasQuery) out.push({ k: 'q', met: matchesQuery(row) });
    return out;
  };

  const listFor = (f) => rows.filter((row) => criteriaFor(row, f).every((c) => c.met));

  const sortRows = (list, sortId) => {
    const arr = list.slice();
    const byName = (a, b) => a.name.localeCompare(b.name, 'cs');
    if (sortId === 'travel') arr.sort((a, b) => a.commuteMinutes - b.commuteMinutes || byName(a, b));
    else if (sortId === 'cut') arr.sort((a, b) => a.admissionCutoff - b.admissionCutoff || byName(a, b));
    else arr.sort((a, b) => a.commuteMinutes - b.commuteMinutes || byName(a, b));
    return arr;
  };

  const total = rows.length;
  const matchedAll = listFor(filters);
  const sortedAll = sortRows(matchedAll, filters.sort);
  const n = sortedAll.length;

  const setPatch = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const toggleIn = (key, value) => {
    setFilters((f) => {
      const cur = f[key];
      const next = cur.includes(value) ? cur.filter((x) => x !== value) : cur.concat([value]);
      return { ...f, [key]: next };
    });
  };

  // ---- facet options (district list built from real data, bug #2 fix: sorted numerically) ----
  const districtFacet = useMemo(
    () => collectFacet(rows, (row) => [row.districtLabel], compareDistricts),
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

  const talentCount = listFor({ ...filters, noTalent: true }).length;
  const travelLabel = filters.maxMin >= 60 ? 'bez omezení' : `do ${filters.maxMin} minut`;

  const activeCriteriaCount = [
    filters.fields.length > 0,
    filters.districts.length > 0,
    filters.maxMin < 60,
    filters.noTalent,
    hasQuery,
  ].filter(Boolean).length;

  const chips = [];
  filters.fields.forEach((id) => {
    const c = FOCUS_CATEGORIES.find((x) => x.id === id);
    if (c) chips.push({ key: `f-${id}`, label: c.label, onRemove: () => toggleIn('fields', id) });
  });
  filters.districts.forEach((d) =>
    chips.push({ key: `d-${d}`, label: d, onRemove: () => toggleIn('districts', d) })
  );
  if (filters.maxMin < 60) {
    chips.push({ key: 'travel', label: `Dojezd do ${filters.maxMin} min`, onRemove: () => setPatch({ maxMin: 60 }) });
  }
  if (filters.noTalent) {
    chips.push({ key: 'talent', label: 'Bez talentové zkoušky', onRemove: () => setPatch({ noTalent: false }) });
  }
  if (hasQuery) {
    chips.push({ key: 'q', label: `„${filters.query.trim()}“`, onRemove: () => setPatch({ query: '', page: 10 }) });
  }

  const clearAll = () => setFilters(DEFAULT_FILTERS);

  // ---- empty-state: blame sentence + ranked relax options + near misses ----
  const relaxRaw = [];
  if (hasQuery) {
    relaxRaw.push({
      blame: `hledaný text „${filters.query.trim()}“`,
      label: `Zrušit hledaný text „${filters.query.trim()}“`,
      gainN: listFor({ ...filters, query: '' }).length,
      onApply: () => setPatch({ query: '', page: 10 }),
    });
  }
  if (filters.maxMin < 60) {
    const relaxed = Math.min(60, filters.maxMin + 20);
    relaxRaw.push({
      blame: `dojezd do ${filters.maxMin} minut`,
      label: `Dojezd do ${relaxed} minut místo ${filters.maxMin}`,
      gainN: listFor({ ...filters, maxMin: relaxed }).length,
      onApply: () => setPatch({ maxMin: relaxed }),
    });
  }
  if (filters.districts.length) {
    relaxRaw.push({
      blame: `omezení na ${filters.districts.join(', ')}`,
      label: `Zrušit omezení na ${filters.districts.join(', ')}`,
      gainN: listFor({ ...filters, districts: [] }).length,
      onApply: () => setPatch({ districts: [] }),
    });
  }
  if (filters.noTalent) {
    relaxRaw.push({
      blame: 'podmínku bez talentové zkoušky',
      label: 'Zrušit filtr bez talentové zkoušky',
      gainN: listFor({ ...filters, noTalent: false }).length,
      onApply: () => setPatch({ noTalent: false }),
    });
  }
  if (filters.fields.length) {
    const labels = filters.fields.map((id) => FOCUS_CATEGORIES.find((x) => x.id === id)?.label).filter(Boolean);
    relaxRaw.push({
      blame: `obor ${labels.join(', ')}`,
      label: 'Zrušit omezení oboru',
      gainN: listFor({ ...filters, fields: [] }).length,
      onApply: () => setPatch({ fields: [] }),
    });
  }
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
        `${x.row.districtLabel} · ${x.row.commuteMinutes} min MHD · hranice ${numCz(x.row.admissionCutoff)} bodu — ` +
        `nesplňuje ${UNMET_LABELS[x.unmet[0].k]}`,
    }));

  // ---- pagination ----
  const shown = sortedAll.slice(0, filters.page);
  const rest = n - shown.length;
  const moreLabel = rest === 1 ? 'Zobrazit další školu' : `Zobrazit dalších ${rest} ${skolGen(rest)}`;

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canFavorite = isSignedIn && hasAccess;

  return (
    <div className="school-search">
      <h1 className="ss-headline-lg">Databáze škol</h1>

      <div className="ss-layout">
        <aside className="ss-sidebar">
          <div className="ss-search-input-wrap">
            <SearchIcon aria-hidden="true" />
            <input
              type="search"
              className="ss-search-input"
              placeholder="Hledat podle názvu nebo oboru"
              value={filters.query}
              onChange={(e) => setPatch({ query: e.target.value, page: 10 })}
              aria-label="Hledat školu"
            />
          </div>

          <div className="ss-facet-group">
            <p className="ss-label-caps">Obor a zaměření</p>
            {fieldOptions.map((o) => (
              <div className="ss-facet-row" key={o.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={o.checked}
                    onChange={() => toggleIn('fields', o.id)}
                  />
                  {o.label}
                </label>
                <span className="ss-data-sm ss-facet-count">{o.count}</span>
              </div>
            ))}
          </div>

          <hr className="ss-divider" />

          <div className="ss-facet-group">
            <p className="ss-label-caps">Dojezd MHD z domova</p>
            <div className="ss-travel-head">
              <span className="ss-body-sm">{travelLabel}</span>
              <span className="ss-data-sm">{n} {skol(n)}</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={filters.maxMin}
              onChange={(e) => setPatch({ maxMin: Number(e.target.value) })}
              className="ss-travel-slider"
              aria-label="Maximální dojezd MHD"
            />
            <p className="ss-caption">Počet se přepočítá při tažení. Nic se nepotvrzuje.</p>
          </div>

          <hr className="ss-divider" />

          <div className="ss-facet-group">
            <p className="ss-label-caps">Městská část</p>
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
          </div>

          <hr className="ss-divider" />

          <div className="ss-facet-group">
            <p className="ss-label-caps">Přijímací zkouška</p>
            <div className="ss-facet-row">
              <label>
                <input
                  type="checkbox"
                  checked={filters.noTalent}
                  onChange={(e) => setPatch({ noTalent: e.target.checked })}
                />
                Jen školy bez talentové zkoušky
              </label>
              <span className="ss-data-sm ss-facet-count">{talentCount}</span>
            </div>
          </div>
        </aside>

        <section className="ss-results">
          {loading && <p className="ss-status">Načítám školy…</p>}
          {error && <p className="ss-status is-error">Školy se nepodařilo načíst: {error}</p>}

          {!loading && !error && (
            <>
              <div className="ss-results-head">
                <div className="ss-count-row">
                  <h1 className="ss-headline-md">{n} {skol(n)} z {total}</h1>
                  <p className="ss-caption">
                    {activeCriteriaCount
                      ? `odpovídá ${activeCriteriaCount} ${plural(activeCriteriaCount, 'filtru', 'filtrům', 'filtrům')} · seznam se mění průběžně, nic se nepotvrzuje`
                      : 'bez filtrů · vyber obor nebo městskou část'}
                  </p>
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
                </div>
              </div>

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

              {n > 0 && (
                <div className="ss-list">
                  {shown.map((row) => {
                    const isSelected = selected.has(row.id);
                    const isFavorite = favorites.has(row.id);
                    const rowCriteria = criteriaFor(row, filters);
                    const metCount = rowCriteria.filter((c) => c.met).length;
                    const metTotal = rowCriteria.length;
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
                                {row.districtLabel} · {row.commuteMinutes} min MHD · {row.schoolType}
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
                                <p className="ss-data-md">{numCz(row.admissionCutoff)} b.</p>
                                <p className="ss-stat-label">hranice 2025</p>
                              </div>
                              <div className="ss-stat-cell">
                                <p className="ss-data-md">{row.acceptanceRate} %</p>
                                <p className="ss-stat-label">přijato z přihlášených</p>
                              </div>
                              <div className="ss-stat-cell">
                                <p className="ss-data-md">{row.commuteMinutes} min</p>
                                <p className="ss-stat-label">dojezd MHD</p>
                              </div>
                              <div className="ss-stat-cell">
                                <p className="ss-data-md">{metTotal > 0 ? `${metCount} / ${metTotal}` : '—'}</p>
                                <p className="ss-stat-label">splněných kritérií</p>
                              </div>
                            </div>
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

              {rest > 0 && (
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
                    'Ukázková data: hranice přijetí, míra přijetí, dojezd MHD a typ školy jsou placeholder hodnoty, ne reálná data — viz UNFORGET.md.'}
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
            Vybráno k porovnání: {selected.size} {skol(selected.size)} · porovnání ukáže stejné řádky vedle sebe
          </p>
          <button type="button" className="ss-btn ss-btn-secondary" onClick={() => setSelected(new Set())}>
            Zrušit výběr
          </button>
          <button type="button" className="ss-btn ss-btn-primary" onClick={() => {}}>
            Porovnat {selected.size} {skolGen(selected.size)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Search;
