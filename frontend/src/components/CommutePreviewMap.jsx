import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { withinLimit } from '../lib/commute';
import './commute.css';

/**
 * Small read-only map under the minute slider: schools reachable within the
 * limit are full dots, the rest faint ones, so the map never looks empty at a
 * short limit. No radius circle on purpose - real commute time is not a
 * circle, and drawing one would repeat the straight-line mistake.
 *
 * `schools`: [{ id, name, latitude, longitude }], `minutes`: the stop's row.
 */
function CommutePreviewMap({ schools, minutes, limit, stop }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const fittedFor = useRef(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;
    const map = L.map(containerRef.current, {
      center: [50.0755, 14.4378],
      zoom: 11,
      zoomControl: false,
      scrollWheelZoom: false,
      // A map inside a long form must not trap a thumb that is only scrolling.
      dragging: !L.Browser.mobile,
      touchZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
    });
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
    const inside = [];
    for (const school of located) {
      const near = limit != null && withinLimit(minutes, school.id, limit);
      const dot = L.circleMarker([school.latitude, school.longitude], {
        radius: near ? 7 : 4,
        className: near ? 'cpm-dot is-in' : 'cpm-dot',
        interactive: true,
      }).bindTooltip(school.name, { direction: 'top' });
      dot.addTo(layer);
      if (near) inside.push([school.latitude, school.longitude]);
    }
    if (stop) {
      L.circleMarker([stop.lat, stop.lon], { radius: 6, className: 'cpm-stop', interactive: false }).addTo(layer);
    }

    // Fit once per stop: re-fitting on every slider tick makes the map jump
    // while a finger is still on the slider.
    if (fittedFor.current !== stop?.id) {
      fittedFor.current = stop?.id ?? null;
      const points = located.map((school) => [school.latitude, school.longitude]);
      if (stop) points.push([stop.lat, stop.lon]);
      if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [16, 16], maxZoom: 13 });
    }
  }, [schools, minutes, limit, stop]);

  return <div ref={containerRef} className="cpm-map" role="img" aria-label="Mapa škol dosažitelných v nastaveném limitu" />;
}

export default CommutePreviewMap;
