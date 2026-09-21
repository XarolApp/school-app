import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Small collapsible section used for every sidebar filter group — open by
// default for the two groups that actually fork the decision (ukončení
// studia, typ školy), collapsed with an active-count badge for the rest.
// This is the fix for "13 flat checkbox groups" (a named anti-pattern): the
// page never shows more than 2 fully-expanded groups at once.
function FacetSection({ title, activeCount, defaultOpen, note, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <div className="ss-facet-section">
      <button
        type="button"
        className="ss-facet-section-head"
        onClick={() => setOpen((v) => !v)}
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

/**
 * The whole facet tree. Rendered exactly once by Search — in the sidebar above
 * 860px, inside a modal sheet below it — so both layouts share one state and
 * one set of semantics. Options (with live counts) are computed by the caller,
 * which owns the scoring/filtering; this only renders and reports changes.
 */
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
  admissionsActiveCount,
  moreActiveCount,
}) {
  return (
    <>
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
      <div className="ss-facet-group ss-parked">
        <div className="ss-parked-head">
          <p className="ss-label-caps">Dojezd MHD</p>
          <span className="ss-parked-badge">zatím nedostupné</span>
        </div>
        <p className="ss-caption">
          Skutečný čas dojezdu MHD zatím neumíme spočítat, proto podle něj neřadíme ani nefiltrujeme.
        </p>
      </div>
    </>
  );
}

export default SearchFilters;
