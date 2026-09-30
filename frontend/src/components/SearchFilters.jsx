import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { normalize } from '../lib/schoolSearch';
import { kkovGroupName } from '../lib/kkovGroups';
import StatInfo from './StatInfo';

function FacetSection({ title, activeCount, children }) {
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <div className="ss-facet-section">
      <button
        type="button"
        className="ss-facet-section-head"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <ChevronDown size={14} aria-hidden="true" className={open ? 'is-open' : ''} />
        <span className="ss-label-caps">{title}</span>
        {activeCount > 0 && <span className="ss-facet-badge">{activeCount}</span>}
      </button>
      {open && (
        <div className="ss-facet-section-body" id={bodyId}>
          {children}
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

/**
 * Two number boxes, "od" and "do"; empty means no limit. `maxOnly` drops the
 * "od" box for limits that only make sense as a ceiling (applicants per place).
 */
function RangeField({ label, unit, min, max, onMin, onMax, maxOnly = false, step = 1 }) {
  const box = (value, onChange, word) => (
    <label className="ss-range-box">
      <span className="ss-caption">{word}</span>
      <input
        type="number"
        inputMode="decimal"
        className="input ss-range-input"
        min="0"
        step={step}
        value={value}
        placeholder="—"
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          // 0 limits nothing here, so it reads as "no limit": show the empty box.
          if (event.target.value !== '' && Number(event.target.value) === 0) onChange('');
        }}
        aria-label={`${label} ${word}`}
      />
      {unit && <span className="ss-caption">{unit}</span>}
    </label>
  );
  return (
    <div className="ss-facet-group">
      <p className="ss-caption">{label}</p>
      <div className="ss-range-row">
        {!maxOnly && box(min, onMin, 'od')}
        {box(max, onMax, maxOnly ? 'nejvýš' : 'do')}
      </div>
    </div>
  );
}

function GroupCheckbox({ all, some, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={all}
      ref={(el) => {
        if (el) el.indeterminate = some && !all;
      }}
      onChange={onChange}
      aria-label={label}
    />
  );
}

/**
 * Every obor, grouped by its KKOV group ("37 Doprava a spoje"). A group can be
 * ticked as a whole, or single obory inside it. Values are KKOV codes.
 */
export function OborGroup({ oborOptions, groupCounts, selected, setObory }) {
  const [text, setText] = useState('');
  const needle = normalize(text);
  const picked = new Set(selected);

  const groups = new Map();
  for (const o of oborOptions) {
    if (!groups.has(o.group)) groups.set(o.group, { all: [], shown: [] });
    const g = groups.get(o.group);
    g.all.push(o);
    if (!needle || normalize(o.label).includes(needle) || normalize(kkovGroupName(o.group)).includes(needle)) {
      g.shown.push(o);
    }
  }
  const visible = [...groups.entries()]
    .filter(([, g]) => g.shown.length)
    .sort(([a], [b]) => kkovGroupName(a).localeCompare(kkovGroupName(b), 'cs'));

  const setGroup = (g, on) => {
    const codes = g.all.map((o) => o.value);
    setObory(on ? [...new Set([...selected, ...codes])] : selected.filter((v) => !codes.includes(v)));
  };
  const toggleOne = (v) => setObory(picked.has(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  return (
    <>
      <input
        type="search"
        className="input"
        placeholder="Hledat obor nebo kód…"
        value={text}
        onChange={(event) => setText(event.target.value)}
        aria-label="Hledat obor"
      />
      {visible.map(([group, g]) => {
        const n = g.all.filter((o) => picked.has(o.value)).length;
        const all = n === g.all.length;
        const name = kkovGroupName(group);
        return (
          <div className="ss-obor-group" key={group}>
            <div className="ss-obor-group-head">
              <label>
                <GroupCheckbox all={all} some={n > 0} onChange={() => setGroup(g, !all)} label={`Celá skupina ${name}`} />
                <strong>{name}</strong>
                <span className="ss-facet-count">({groupCounts[group] ?? 0})</span>
              </label>
              <button type="button" className="ss-link-btn" onClick={() => setGroup(g, !all)}>
                {all ? 'Zrušit vše' : 'Vybrat vše'}
              </button>
            </div>
            {g.shown.map((o) => (
              <label className="ss-obor-item" key={o.value}>
                <input type="checkbox" checked={picked.has(o.value)} onChange={() => toggleOne(o.value)} />
                <span>{o.label}</span>
                <span className="ss-facet-count">({o.count})</span>
              </label>
            ))}
          </div>
        );
      })}
      {!visible.length && <p className="ss-caption ss-facet-note">Žádný obor nenalezen.</p>}
      <p className="ss-caption ss-facet-note">
        Škola vyhoví, když má aspoň jeden takový obor. Čísla v ostatních filtrech se pak berou u toho samého oboru.
        V závorce je počet škol.
      </p>
    </>
  );
}

export function FieldGroup({ fieldOptions, toggleIn }) {
  return fieldOptions.map((option) => (
    <CheckOption
      key={option.id}
      checked={option.checked}
      label={option.label}
      count={option.count}
      onChange={() => toggleIn('fields', option.id)}
    />
  ));
}

export function DistrictGroup({ districtOptions, toggleIn }) {
  return (
    <div className="ss-chip-group">
      {districtOptions.map((district) => (
        <button
          key={district.value}
          type="button"
          className={`ss-district-toggle${district.active ? ' is-active' : ''}`}
          onClick={() => toggleIn('districts', district.value)}
        >
          {district.label} <span>{district.count}</span>
        </button>
      ))}
    </div>
  );
}

export function UkonceniGroup({ filters, ukonceniOptions, toggleIn, total }) {
  return (
    <>
      {ukonceniOptions.map((option) => (
        <CheckOption
          key={option.value}
          checked={filters.ukonceni.includes(option.value)}
          label={option.label}
          count={option.count}
          onChange={() => toggleIn('ukonceni', option.value)}
        />
      ))}
      {filters.ukonceni.length !== 1 && (
        <p className="ss-caption ss-facet-note">
          Řada škol nabízí obojí, proto je součet vyšší než {total}.
        </p>
      )}
    </>
  );
}

export function TypGroup({ typOptions, toggleIn }) {
  return (
    <div className="ss-chip-group">
      {typOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`ss-district-toggle${option.checked ? ' is-active' : ''}`}
          onClick={() => toggleIn('typySkoly', option.value)}
        >
          {option.label} <span>{option.count}</span>
        </button>
      ))}
    </div>
  );
}

export function AdmissionsGroup({ filters, setPatch, jpzOptions, toggleIn, year }) {
  const y = year ? ` ${year}` : '';
  return (
    <>
      <RangeField
        label={`Hranice přijetí${y}`}
        unit="b."
        min={filters.cutoffMin}
        max={filters.cutoffMax}
        onMin={(v) => setPatch({ cutoffMin: v })}
        onMax={(v) => setPatch({ cutoffMax: v })}
      />
      <RangeField
        label={`Přijato z přihlášených${y}`}
        unit="%"
        min={filters.acceptedMin}
        max={filters.acceptedMax}
        onMin={(v) => setPatch({ acceptedMin: v })}
        onMax={(v) => setPatch({ acceptedMax: v })}
      />
      <RangeField
        label={`Uchazečů na místo${y}`}
        maxOnly
        step="0.1"
        max={filters.applicantsMax}
        onMax={(v) => setPatch({ applicantsMax: v })}
      />
      <RangeField
        label={`Míst${y} (v oboru)`}
        min={filters.placesMin}
        max={filters.placesMax}
        onMin={(v) => setPatch({ placesMin: v })}
        onMax={(v) => setPatch({ placesMax: v })}
      />
      <p className="ss-caption ss-facet-note">
        Čísla jsou za jednotlivé obory. Obor bez uvedené hranice (např. talentová zkouška) při zapnutém omezení vypadne.
      </p>

      {jpzOptions.map((option) => (
        <CheckOption
          key={option.value}
          checked={filters.jpz.includes(option.value)}
          label={option.label}
          count={option.count}
          onChange={() => toggleIn('jpz', option.value)}
        />
      ))}
    </>
  );
}

export function ZrizovatelGroup({ zrizovatelOptions, toggleIn }) {
  return (
    <>
      {zrizovatelOptions.map((option) => (
        <CheckOption
          key={option.value}
          checked={option.checked}
          label={option.label}
          count={option.count}
          onChange={() => toggleIn('zrizovatele', option.value)}
        />
      ))}
    </>
  );
}

const JAZYK_NOTE =
  'Jazyk, ve kterém se obor vyučuje. „Český“ je celé studium v češtině. „Český s výukou vybraných předmětů v cizím jazyce“ se učí česky, jen některé předměty cizím jazykem (který jazyk a které předměty, zatím nevíme). „Bilingva“ je dvojjazyčné studium, kde se velká část výuky vede v cizím jazyce. Zdroj: výsledky přijímaček z Cermatu.';
const FORMA_NOTE =
  'Jak se obor studuje. Denní je běžné studium každý den ve škole, tedy to, co hledá většina deváťáků. Večerní, dálková a kombinovaná forma jsou určené hlavně dospělým a nástavbám. Distanční je studium z domova. Zdroj: výsledky přijímaček z Cermatu.';

function NamedGroup({ title, note, children }) {
  return (
    <div className="ss-facet-group">
      <p className="ss-caption ss-facet-group-title">
        {title}
        <StatInfo text={note} placement="bottom" />
      </p>
      {children}
    </div>
  );
}

export function JazykGroup({ jazykOptions, toggleIn }) {
  return (
    <NamedGroup title="Jazyk studia" note={JAZYK_NOTE}>
      {jazykOptions.map((option) => (
        <CheckOption
          key={option.value}
          checked={option.checked}
          label={option.label}
          count={option.count}
          onChange={() => toggleIn('jazyky', option.value)}
        />
      ))}
    </NamedGroup>
  );
}

export function FormaGroup({ formaOptions, toggleIn }) {
  if (formaOptions.length < 2) return null;
  return (
    <NamedGroup title="Forma studia" note={FORMA_NOTE}>
      {formaOptions.map((option) => (
        <CheckOption
          key={option.value}
          checked={option.checked}
          label={option.label}
          count={option.count}
          onChange={() => toggleIn('formy', option.value)}
        />
      ))}
    </NamedGroup>
  );
}

export function DalsiGroup({ jazykOptions, formaOptions, toggleIn }) {
  return (
    <>
      <JazykGroup jazykOptions={jazykOptions} toggleIn={toggleIn} />
      <FormaGroup formaOptions={formaOptions} toggleIn={toggleIn} />
    </>
  );
}

function SearchFilters({
  filters,
  setPatch,
  toggleIn,
  total,
  ukonceniOptions,
  typOptions,
  districtOptions,
  fieldOptions,
  zrizovatelOptions,
  jpzOptions,
  jazykOptions,
  oborOptions,
  oborGroupCounts,
  formaOptions,
  year,
  admissionsActiveCount,
}) {
  return (
    <>
      <FacetSection title="Obor a zaměření" activeCount={filters.fields.length}>
        <FieldGroup fieldOptions={fieldOptions} toggleIn={toggleIn} />
      </FacetSection>

      <hr className="ss-divider" />

      <FacetSection title="Konkrétní obory" activeCount={filters.obory.length}>
        <OborGroup
          oborOptions={oborOptions}
          groupCounts={oborGroupCounts}
          selected={filters.obory}
          setObory={(obory) => setPatch({ obory })}
        />
      </FacetSection>

      <hr className="ss-divider" />

      <FacetSection title="Městská část" activeCount={filters.districts.length}>
        <DistrictGroup districtOptions={districtOptions} toggleIn={toggleIn} />
      </FacetSection>

      <hr className="ss-divider" />

      <FacetSection title="Ukončení studia" activeCount={filters.ukonceni.length}>
        <UkonceniGroup
          filters={filters}
          ukonceniOptions={ukonceniOptions}
          toggleIn={toggleIn}
          total={total}
        />
      </FacetSection>

      <hr className="ss-divider" />

      <FacetSection title="Typ školy" activeCount={filters.typySkoly.length}>
        <TypGroup typOptions={typOptions} toggleIn={toggleIn} />
      </FacetSection>

      <hr className="ss-divider" />

      <FacetSection title="Přijímačky a místa" activeCount={admissionsActiveCount}>
        <AdmissionsGroup
          filters={filters}
          setPatch={setPatch}
          jpzOptions={jpzOptions}
          toggleIn={toggleIn}
          year={year}
        />
      </FacetSection>

      <hr className="ss-divider" />

      <FacetSection title="Zřizovatel" activeCount={filters.zrizovatele.length}>
        <ZrizovatelGroup zrizovatelOptions={zrizovatelOptions} toggleIn={toggleIn} />
      </FacetSection>

      <hr className="ss-divider" />

      <FacetSection title="Jazyk studia" activeCount={filters.jazyky.length}>
        <JazykGroup jazykOptions={jazykOptions} toggleIn={toggleIn} />
      </FacetSection>

      {formaOptions.length > 1 && (
        <>
          <hr className="ss-divider" />

          <FacetSection title="Forma studia" activeCount={filters.formy.length}>
            <FormaGroup formaOptions={formaOptions} toggleIn={toggleIn} />
          </FacetSection>
        </>
      )}
    </>
  );
}

export default SearchFilters;
