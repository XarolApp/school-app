import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

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

export function AdmissionsGroup({ filters, setPatch, jpzOptions, toggleIn }) {
  return (
    <>
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
          onChange={(event) => setPatch({ cutoffMax: Number(event.target.value) })}
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
          onChange={(event) => setPatch({ acceptanceMin: Number(event.target.value) })}
          className="ss-travel-slider"
          aria-label="Nejnižší míra přijetí"
        />
      </div>

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
      <FacetSection title="Obor a zaměření" activeCount={filters.fields.length}>
        <FieldGroup fieldOptions={fieldOptions} toggleIn={toggleIn} />
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

      <FacetSection title="Přijímačky a šance" activeCount={admissionsActiveCount}>
        <AdmissionsGroup
          filters={filters}
          setPatch={setPatch}
          jpzOptions={jpzOptions}
          toggleIn={toggleIn}
        />
      </FacetSection>

      <hr className="ss-divider" />

      <FacetSection title="Zřizovatel" activeCount={filters.zrizovatele.length}>
        {zrizovatelOptions.map((option) => (
          <CheckOption
            key={option.value}
            checked={option.checked}
            label={option.label}
            count={option.count}
            onChange={() => toggleIn('zrizovatele', option.value)}
          />
        ))}
      </FacetSection>

      <hr className="ss-divider" />

      <FacetSection title="Další" activeCount={moreActiveCount}>
        {jazykOptions.map((option) => (
          <CheckOption
            key={option.value}
            checked={option.checked}
            label={option.label}
            count={option.count}
            onChange={() => toggleIn('jazyky', option.value)}
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
            onChange={(event) => setPatch({ kapacitaMin: Number(event.target.value) })}
            className="ss-travel-slider"
            aria-label="Nejmenší kapacita"
          />
        </div>
      </FacetSection>
    </>
  );
}

export default SearchFilters;
