import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import StatInfo from './StatInfo';
import './SchoolMap.css';

const PRAGUE_CENTER = [50.0755, 14.4378];

// Real, per-school data only: the pin's number is admissionCutoff straight
// from Supabase (Cermat), the name is the real school name shortened by a
// display heuristic (never a different school, never invented text). A
// school with no admission data yet gets a dashed pin reading "bez dat".
function haversineKm([lat1, lon1], [lat2, lon2]) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Display-only shortening — strips corporate suffixes and, when the name is
// long enough to survive it, a trailing street-address fragment. Falls back
// to the untouched name whenever stripping would leave too little to
// recognise the school by (e.g. a school whose only identifier IS its
// street). The full, real name is always shown on hover (title) and in the
// detail card — this only shortens what fits on a pin.
const CORPORATE_SUFFIX = /,?\s*(s\.\s*r\.\s*o\.|a\.\s*s\.|o\.\s*p\.\s*s\.|školská právnická osoba)\s*$/i;
const ADDRESS_TAIL = /,\s*Praha[\s\d-]*,.*$/i;

function shortSchoolName(name) {
  let s = name.replace(CORPORATE_SUFFIX, '').trim();
  const withoutAddress = s.replace(ADDRESS_TAIL, '').trim();
  if (withoutAddress.length >= 12) s = withoutAddress;
  if (s.length > 32) s = `${s.slice(0, 31).trim()}…`;
  return s;
}

function pinHtml(row, isSelected) {
  const label = row.admissionCutoff != null ? `${row.admissionCutoff} b.` : 'bez dat';
  const noData = row.admissionCutoff == null;
  const shortName = shortSchoolName(row.name).replace(/"/g, '&quot;');
  const fullName = row.name.replace(/"/g, '&quot;');
  return (
    `<span class="sm-pin${isSelected ? ' is-selected' : ''}${noData ? ' is-nodata' : ''}" title="${fullName}">` +
    `<span class="sm-pin-name">${shortName}</span>` +
    `<span class="sm-pin-pct">${label}</span>` +
    `</span>`
  );
}

function homePinHtml() {
  return '<span class="sm-home-pin" title="Tvoje zadaná adresa">🏠</span>';
}

/**
 * A plain Leaflet map, not react-leaflet — react-leaflet's peer dependency
 * range doesn't yet cover React 19, and the imperative Leaflet API is a
 * small, well-contained surface here (one map, N pins, one home pin, one
 * detail card).
 *
 * `rows` is the CURRENTLY FILTERED list from Search.jsx — the map only ever
 * shows what the list would show (further narrowed by the radius filter
 * below), never all 60 schools regardless of the sidebar filters.
 *
 * Every floating control (locate panel, fullscreen button, detail card) is
 * given z-index: 1000 — Leaflet's own internal panes (tiles, markers,
 * popups) run from 200 to 700, and its OWN controls sit at 1000. Anything
 * of ours below 1000 gets buried under those panes and only flashes into
 * view during Leaflet's zoom transform (which briefly gives the map panes
 * their own stacking context) — matching 1000 is what keeps our UI visible
 * all the time, not just mid-animation.
 */
function SchoolMap({ rows, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const homeMarkerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Home location lives ONLY in this component's memory for this page view —
  // never written to localStorage, sessionStorage or the backend. Reloading
  // the page or leaving Search clears it. This is stated to the user in the
  // UI, not just here.
  const [homePos, setHomePos] = useState(null); // [lat, lng] | null
  const [addressQuery, setAddressQuery] = useState('');
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState(null);
  const [radiusKm, setRadiusKm] = useState(15);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: PRAGUE_CENTER,
      zoom: 12,
      scrollWheelZoom: true,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // © OpenStreetMap contributors attribution is a licence requirement, not
    // a nicety — never remove it.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    // Clicking empty map background (not a pin — markers don't bubble their
    // clicks up to the map) clears the selection, same as clicking a
    // selected pin again or the card's close button.
    map.on('click', () => onSelectRef.current(null));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Fullscreen toggles a CSS class on the same mounted map — never
  // remounts Leaflet — but the container's on-screen size still changes,
  // so Leaflet needs telling to re-measure once the new layout settles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = requestAnimationFrame(() => map.invalidateSize());
    return () => cancelAnimationFrame(id);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // School pins — real coords, real cutoff values, narrowed by the radius
  // filter when a home location is set.
  const withCoords = rows.filter((row) => row.school.latitude != null && row.school.longitude != null);
  const visibleRows = homePos
    ? withCoords.filter((row) => haversineKm(homePos, [row.school.latitude, row.school.longitude]) <= radiusKm)
    : withCoords;

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();

    for (const row of visibleRows) {
      const icon = L.divIcon({
        html: pinHtml(row, row.id === selectedId),
        className: 'sm-pin-wrap',
        iconSize: null,
      });
      const marker = L.marker([row.school.latitude, row.school.longitude], { icon })
        .addTo(map)
        .on('click', () => onSelect(row.id === selectedId ? null : row.id));
      markersRef.current.set(row.id, marker);
    }

    // Only auto-fit to the result set while browsing freely. Once a home
    // location is set the map stays centred on the radius search instead of
    // jumping back to fit whatever pins remain — the whole point of setting
    // a home point is to hold that view still.
    if (!homePos && visibleRows.length) {
      const bounds = L.latLngBounds(visibleRows.map((row) => [row.school.latitude, row.school.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, selectedId, onSelect]);

  // Home pin — a distinct marker, added/removed independently of school pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (homeMarkerRef.current) {
      homeMarkerRef.current.remove();
      homeMarkerRef.current = null;
    }
    if (homePos) {
      const icon = L.divIcon({ html: homePinHtml(), className: 'sm-pin-wrap', iconSize: null });
      homeMarkerRef.current = L.marker(homePos, { icon, zIndexOffset: 1000 }).addTo(map);
      map.setView(homePos, 13);
    }
  }, [homePos]);

  const selectedRow = rows.find((row) => row.id === selectedId) || null;

  const setHomeFromCoords = (lat, lng) => {
    setAddressError(null);
    setHomePos([lat, lng]);
  };

  const centerOnMe = () => {
    if (!navigator.geolocation) {
      setAddressError('Tento prohlížeč neumí zjistit polohu.');
      return;
    }
    setAddressError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => setHomeFromCoords(pos.coords.latitude, pos.coords.longitude),
      () => setAddressError('Polohu se nepodařilo zjistit — zkus zadat adresu ručně.')
    );
  };

  const searchAddress = async (e) => {
    e.preventDefault();
    const q = addressQuery.trim();
    if (!q) return;
    setAddressLoading(true);
    setAddressError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cz&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('lookup failed');
      const results = await res.json();
      if (!results.length) {
        setAddressError('Tuto adresu se nepodařilo najít. Zkus ji upřesnit.');
        return;
      }
      setHomeFromCoords(Number(results[0].lat), Number(results[0].lon));
    } catch {
      setAddressError('Vyhledání adresy se nepodařilo. Zkus to znovu.');
    } finally {
      setAddressLoading(false);
    }
  };

  const clearHome = () => {
    setHomePos(null);
    setAddressError(null);
    setAddressQuery('');
  };

  return (
    <div className={`sm-wrap${isFullscreen ? ' is-fullscreen' : ''}`}>
      <div ref={containerRef} className="sm-map" />

      <button
        type="button"
        className="sm-fullscreen-btn"
        onClick={() => setIsFullscreen((v) => !v)}
        aria-label={isFullscreen ? 'Zmenšit mapu' : 'Zobrazit mapu na celou obrazovku'}
        title={isFullscreen ? 'Zmenšit mapu' : 'Zobrazit na celou obrazovku'}
      >
        {isFullscreen ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
      </button>

      <div className="sm-locate-panel">
        <form className="sm-address-form" onSubmit={searchAddress}>
          <input
            type="text"
            value={addressQuery}
            onChange={(e) => setAddressQuery(e.target.value)}
            placeholder="Zadej adresu (např. domov)"
            className="sm-address-input"
            aria-label="Adresa"
          />
          <button type="submit" className="ss-btn ss-btn-primary ss-btn-sm" disabled={addressLoading}>
            {addressLoading ? 'Hledám…' : 'Najít'}
          </button>
        </form>
        <button type="button" className="sm-locate-btn" onClick={centerOnMe}>
          Najít mě podle polohy
        </button>
        <p className="ss-caption sm-privacy-note">Adresu ani polohu nikam neukládáme.</p>
        {addressError && <p className="ss-caption sm-address-error">{addressError}</p>}

        {homePos && (
          <div className="sm-radius-control">
            <div className="sm-radius-head">
              <span className="ss-caption">Vzdálenost: do {radiusKm} km</span>
              <button type="button" className="sm-radius-clear" onClick={clearHome}>
                Zrušit
              </button>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="sm-radius-slider"
              aria-label="Maximální vzdálenost v kilometrech"
            />
            <p className="ss-caption sm-privacy-note">
              Vzdušná čára, ne skutečná trasa MHD — zobrazuje {visibleRows.length} {visibleRows.length === 1 ? 'školu' : 'škol'}.
            </p>
          </div>
        )}
      </div>

      {selectedRow && (
        <div className="sm-card">
          <div className="sm-card-head">
            <div>
              <h3 className="ss-headline-sm">{selectedRow.name}</h3>
              <p className="ss-caption">
                {selectedRow.districtLabel}
                {selectedRow.p.zrizovatel ? ` · ${selectedRow.p.zrizovatel}` : ''}
                {selectedRow.p.maturitni || selectedRow.p.nematuritni
                  ? ` · ${selectedRow.p.maturitni && selectedRow.p.nematuritni ? 'maturitní i výuční list' : selectedRow.p.maturitni ? 'maturitní' : 'výuční list'}`
                  : ''}
                {selectedRow.p.count ? ` · ${selectedRow.p.count} ${selectedRow.p.count === 1 ? 'obor' : 'oborů'}` : ''}
              </p>
            </div>
            <button type="button" className="sm-card-close" onClick={() => onSelect(null)} aria-label="Zavřít">
              ×
            </button>
          </div>
          <div className="ss-stat-grid sm-card-stats">
            <div className="ss-stat-cell">
              <p className="ss-data-md">
                {selectedRow.admissionCutoff != null ? `${selectedRow.admissionCutoff} b.` : '—'}
              </p>
              <p className="ss-stat-label">
                hranice
                <StatInfo
                  text="Průměr z posledních 3 let (2024–2026). Nejnižší počet bodů z češtiny a matematiky (max. 100 — 50 + 50), které stačily na přijetí — je to hranice pro přijetí, ne průměrné skóre přijatých žáků. Průměr přes všechny obory školy; hranici pro konkrétní obor a rok najdeš po rozkliknutí školy. (Nové školy mohou mít kratší historii.)"
                />
              </p>
            </div>
            <div className="ss-stat-cell">
              <p className="ss-data-md">
                {selectedRow.acceptanceRate != null ? `${selectedRow.acceptanceRate} %` : '—'}
              </p>
              <p className="ss-stat-label">
                přijato
                <StatInfo
                  text="Průměr z posledních 3 let (2024–2026): kolik procent uchazečů škola v posledním kole přijala, v průměru přes všechny obory. Podrobnosti po jednotlivých oborech a letech najdeš po rozkliknutí školy. (Nové školy mohou mít kratší historii.)"
                />
              </p>
            </div>
            <div className="ss-stat-cell">
              <p className="ss-data-md">{selectedRow.p.kapacita ?? '—'}</p>
              <p className="ss-stat-label">
                míst
                <StatInfo text="Celkový počet míst ve všech oborech, které škola otevírá pro aktuální rok." />
              </p>
            </div>
          </div>
          {selectedRow.admissionCutoff == null && selectedRow.acceptanceRate == null && (
            <p className="ss-caption ss-no-data-note">
              Tahle škola nebyla v prvním kole přijímaček, takže o ní zatím čísla nemáme.
            </p>
          )}
          <div className="sm-card-actions">
            <Link to={`/skoly/${selectedRow.id}`} className="ss-btn ss-btn-primary ss-btn-sm">
              Detail školy
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolMap;
