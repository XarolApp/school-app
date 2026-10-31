import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { returnState } from '../lib/internalReturnPath';
import { Maximize2, Minimize2, MapPin, ChevronUp, LocateFixed } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import StatInfo from './StatInfo';
import { escapeHtml } from '../lib/escapeHtml';
import { summarizeAdmission, formatCutoffRange } from '../lib/schoolPrograms';
import { useStopCenter } from '../lib/useStopCenter';
import './commute.css';
import './SchoolMap.css';

const PRAGUE_CENTER = [50.0755, 14.4378];

// Real, per-school data only: the pin's number is the newest year's cutoff
// range across the school's obory (Cermat), the name is the real school name shortened by a
// display heuristic (never a different school, never invented text). A
// school with no admission data yet gets a dashed pin reading "bez dat".

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
  const adm = summarizeAdmission(row.school);
  const range = formatCutoffRange(adm);
  const label = range ? `${range}${adm.isOld ? ` (${adm.year})` : ''}` : 'bez dat';
  const noData = !range;
  const shortName = escapeHtml(shortSchoolName(row.name));
  const fullName = escapeHtml(row.name);
  return (
    `<span class="sm-pin${isSelected ? ' is-selected' : ''}${noData ? ' is-nodata' : ''}" title="${fullName}">` +
    `<span class="sm-pin-name">${shortName}</span>` +
    `<span class="sm-pin-pct">${escapeHtml(label)}</span>` +
    `</span>`
  );
}

/**
 * A plain Leaflet map using the imperative API: one map, school pins, one
 * stop dot and one detail card. `panel` is the stop + minute-limit control
 * (the same one the /skoly filter uses); `stop` is the chosen stop, which the
 * map centres on and a button brings back after the map was dragged away.
 *
 * `rows` is the CURRENTLY FILTERED list from Search.jsx — the map only ever
 * shows what the list would show, never the unfiltered catalogue.
 *
 * Every floating control (locate panel, fullscreen button, detail card) is
 * given z-index: 1000 — Leaflet's own internal panes (tiles, markers,
 * popups) run from 200 to 700, and its OWN controls sit at 1000. Anything
 * of ours below 1000 gets buried under those panes and only flashes into
 * view during Leaflet's zoom transform (which briefly gives the map panes
 * their own stacking context) — matching 1000 is what keeps our UI visible
 * all the time, not just mid-animation.
 */
function SchoolMap({ rows, selectedId, onSelect, renderCardActions, commute = null, stop = null, panel = null }) {
  const location = useLocation();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const stopMarkerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const [isFullscreen, setIsFullscreen] = useState(false);
  // Phones start with the panel folded: open it covers half the map.
  const [panelOpen, setPanelOpen] = useState(() => !window.matchMedia?.('(max-width: 860px)').matches);

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
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
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

  // School pins — real coords, real cutoff values.
  const visibleRows = rows.filter((row) => row.school.latitude != null && row.school.longitude != null);

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

    // Only auto-fit to the result set while no stop is chosen; with a stop the
    // map stays centred on it (useStopCenter) and the user moves it freely.
    if (!stop && visibleRows.length) {
      const bounds = L.latLngBounds(visibleRows.map((row) => [row.school.latitude, row.school.longitude]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleRows, selectedId, onSelect, commute]);

  // The black stop dot — same look as the preview map in the questionnaire.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (stopMarkerRef.current) {
      stopMarkerRef.current.remove();
      stopMarkerRef.current = null;
    }
    if (stop) {
      stopMarkerRef.current = L.circleMarker([stop.lat, stop.lon], { radius: 8, className: 'cpm-stop', interactive: false }).addTo(map);
    }
  }, [stop]);

  const { off, recenter } = useStopCenter(mapRef, stop, 13);

  const selectedRow = rows.find((row) => row.id === selectedId) || null;
  // Schools beyond the limit are filtered out of `rows`, so every pin is in the limit.
  const commuteInLimit = visibleRows.length;
  const selectedCommute = commute && selectedRow ? commute.minutes?.[selectedRow.id] : undefined;
  const selectedAdm = selectedRow ? summarizeAdmission(selectedRow.school) : null;

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

      {off && (
        <button type="button" className="sm-recenter-btn" onClick={recenter}>
          <LocateFixed size={14} aria-hidden="true" /> Vystředit zastávku
        </button>
      )}

      {panel && (!panelOpen ? (
        <button type="button" className="sm-locate-btn sm-panel-show" onClick={() => setPanelOpen(true)} aria-expanded="false">
          <MapPin size={14} aria-hidden="true" /> {stop ? `Zastávka: ${stop.name}` : 'Vybrat zastávku'}
        </button>
      ) : (
        <div className="sm-locate-panel">
          <button type="button" className="sm-panel-hide" onClick={() => setPanelOpen(false)} aria-expanded="true">
            <ChevronUp size={14} aria-hidden="true" /> Skrýt výběr zastávky
          </button>
          {panel}
        </div>
      ))}

      {commute && (
        <p className="sm-commute-legend" role="status">
          Do {commute.limit} min MHD{commute.stopName ? ` ze zastávky ${commute.stopName}` : ''} · {commuteInLimit}{' '}
          {commuteInLimit === 1 ? 'škola' : commuteInLimit >= 2 && commuteInLimit <= 4 ? 'školy' : 'škol'}
        </p>
      )}

      {selectedRow && (
        <div className="sm-card">
          <div className="sm-card-head">
            <div>
              <h3 className="ss-headline-sm">{selectedRow.name}</h3>
              <p className="ss-caption">
                {selectedRow.districtLabel}
                {selectedRow.p.zrizovatel ? ` · ${selectedRow.p.zrizovatel}` : ''}
                {selectedRow.p.maturitni || selectedRow.p.nematuritni
                  ? ` · ${selectedRow.p.maturitni && selectedRow.p.nematuritni ? 'maturitní i nematuritní obory' : selectedRow.p.maturitni ? 'maturitní' : 'bez maturity'}`
                  : ''}
                {selectedRow.p.count ? ` · ${selectedRow.p.count} ${selectedRow.p.count === 1 ? 'obor' : selectedRow.p.count <= 4 ? 'obory' : 'oborů'}` : ''}
              </p>
            </div>
            <button type="button" className="sm-card-close" onClick={() => onSelect(null)} aria-label="Zavřít">
              ×
            </button>
          </div>
          {commute && selectedCommute !== undefined && (
            <p className="ss-caption sm-card-commute">
              {selectedCommute == null ? 'MHD: přes 90 minut nebo bez rozumného spojení' : `cca ${selectedCommute} min MHD`}
              {commute.stopName ? ` ze zastávky ${commute.stopName}` : ''}
            </p>
          )}
          <div className="ss-stat-grid sm-card-stats">
            <div className="ss-stat-cell">
              <p className="ss-data-md">
                {formatCutoffRange(selectedAdm) ?? 'bez dat'}
              </p>
              <p className="ss-stat-label">
                hranice {selectedAdm?.year ?? ''}{selectedAdm?.isOld ? ', starší data' : ''}
                <StatInfo
                  placement="bottom"
                  text={selectedAdm?.year
                    ? `Nejnižší bodový výsledek přijatých uchazečů podle dat Cermatu za rok ${selectedAdm.year} (max. 100, tedy 50 + 50). Rozpětí od oboru s nejnižší po obor s nejvyšší hranicí. Historická hranice nezaručuje budoucí přijetí; historii najdeš v detailu školy.`
                    : 'Údaje o bodové hranici této školy zatím nemáme.'}
                />
              </p>
            </div>
            <div className="ss-stat-cell">
              <p className="ss-data-md">
                {selectedAdm?.acceptance != null ? `${Math.round(selectedAdm.acceptance)} %` : 'bez dat'}
              </p>
              <p className="ss-stat-label">
                přijato {selectedAdm?.year ?? ''}{selectedAdm?.isOld ? ', starší data' : ''}
                <StatInfo
                  placement="bottom"
                  text={selectedAdm?.year
                    ? `Kolik procent přihlášených škola v roce ${selectedAdm.year} přijala, ve všech oborech dohromady. Podrobnosti po oborech a starší roky najdeš v detailu školy.`
                    : 'Údaje o míře přijetí této školy zatím nemáme.'}
                />
              </p>
            </div>
            <div className="ss-stat-cell">
              <p className="ss-data-md">{selectedRow.p.kapacita ?? 'bez dat'}</p>
              <p className="ss-stat-label">
                míst
                <StatInfo
                  placement="bottom"
                  text="Počet míst podle dostupných údajů Cermatu ve všech oborech dohromady. Na další rok se počet může změnit."
                />
              </p>
            </div>
            <div className="ss-stat-cell">
              {typeof selectedRow.school?.match_score === 'number' ? (
                <p className="ss-data-md">
                  <span className={`ss-match-score ${selectedRow.school.match_score >= 85 ? 'is-strong' : selectedRow.school.match_score >= 70 ? 'is-mid' : 'is-low'}`}>
                    {selectedRow.school.match_score} %
                  </span>
                </p>
              ) : (
                <p className="ss-data-md ss-cell-missing">bez dat</p>
              )}
              <p className="ss-stat-label">
                shoda
                <StatInfo
                  placement="bottom"
                  text="Jak škola sedí na tvoje odpovědi z dotazníku, ne jak je dobrá. Bez vyplněného dotazníku ji nespočítáme."
                />
              </p>
            </div>
          </div>
          {selectedAdm?.cutoffMin == null && selectedAdm?.acceptance == null && (
            <p className="ss-caption ss-no-data-note">
              Údaje o hranici a míře přijetí zatím nemáme.
            </p>
          )}
          <div className="sm-card-actions">
            <Link to={`/skoly/${selectedRow.id}`} state={returnState(location, 'mapu')} className="ss-btn ss-btn-primary ss-btn-sm">
              Detail školy
            </Link>
            {renderCardActions && <div className="sm-card-toggles">{renderCardActions(selectedRow)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolMap;
