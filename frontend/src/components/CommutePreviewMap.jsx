import { useEffect, useRef } from 'react';
import { LocateFixed } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { withinLimit } from '../lib/commute';
import { useStopCenter } from '../lib/useStopCenter';
import './commute.css';

/**
 * Small map under the minute slider: schools reachable within the limit (or
 * all of them at "60+") are full dots, the rest faint ones, so the map never
 * looks empty at a short limit. A dot opens that school in a new tab, so the
 * answers on this page are never lost. The map is centred on the black stop
 * dot whenever the stop changes; once dragged away, a button brings it back.
 * No radius circle on purpose - real commute time is not a circle, and drawing
 * one would repeat the straight-line mistake.
 *
 * `schools`: [{ id, name, latitude, longitude }], `minutes`: the stop's row.
 */
function CommutePreviewMap({ schools, minutes, limit, stop }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, {
      center: [50.0755, 14.4378],
      zoom: 11,
      zoomControl: false,
      // A wheel over a map inside a long form must keep scrolling the page.
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
    });
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    // © OpenStreetMap contributors attribution is a licence requirement.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const located = schools.filter((school) => school.latitude != null && school.longitude != null);
    for (const school of located) {
      const near = limit == null || withinLimit(minutes, school.id, limit);
      const dot = L.circleMarker([school.latitude, school.longitude], {
        radius: near ? 7 : 4,
        className: near ? 'cpm-dot is-in' : 'cpm-dot',
        interactive: true,
      }).bindTooltip(school.name, { direction: 'top' });
      dot.on('click', () => window.open(`/skoly/${school.id}`, '_blank', 'noopener'));
      dot.addTo(layer);
    }
    if (stop) {
      L.circleMarker([stop.lat, stop.lon], { radius: 6, className: 'cpm-stop', interactive: false }).addTo(layer);
    }
  }, [schools, minutes, limit, stop]);

  const { off, recenter } = useStopCenter(mapRef, stop);

  return (
    <div className="cpm-wrap">
      <div ref={containerRef} className="cpm-map" role="group" aria-label="Mapa škol dosažitelných v nastaveném limitu. Kliknutím na školu otevřeš její stránku." />
      {off && (
        <button type="button" className="cpm-recenter" onClick={recenter}>
          <LocateFixed size={14} aria-hidden="true" /> Vystředit zastávku
        </button>
      )}
    </div>
  );
}

export default CommutePreviewMap;
