import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../SchoolMap.css';

/**
 * A single static pin — deliberately NOT the full SchoolMap component (that
 * one carries an address search box and a radius filter, both of which are
 * about finding schools near a point, not about showing where THIS one is).
 * Reuses SchoolMap.css's `.sm-pin` look so pins read the same everywhere in
 * the app.
 */
function SchoolLocation({ school }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);

  const hasCoords = school.latitude != null && school.longitude != null;

  useEffect(() => {
    if (!hasCoords || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [school.latitude, school.longitude],
      zoom: 15,
      scrollWheelZoom: false,
      zoomControl: false,
    });
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const label =
      school.admission_cutoff != null ? `${String(school.admission_cutoff).replace('.', ',')} b.` : school.name;
    const icon = L.divIcon({
      html: `<span class="sm-pin"><span class="sm-pin-name">${school.name.replace(/"/g, '&quot;')}</span><span class="sm-pin-pct">${label}</span></span>`,
      className: 'sm-pin-wrap',
      iconSize: null,
    });
    L.marker([school.latitude, school.longitude], { icon }).addTo(map);

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [hasCoords, school.latitude, school.longitude, school.name, school.admission_cutoff]);

  const streetViewUrl = hasCoords
    ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${school.latitude},${school.longitude}`
    : null;

  return (
    <div className="sd-location" id="kde-to-je">
      <div className="sd-map">
        {hasCoords ? (
          <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink3)',
              fontSize: 'var(--fs-caption)',
            }}
          >
            Umístění na mapě zatím nemáme.
          </div>
        )}
      </div>

      <div className="sd-location-side">
        <div className="sd-location-card">
          <div>
            <div className="sd-location-field-label">Adresa</div>
            <div className="sd-location-field-value">{school.location}</div>
          </div>
          <div>
            <div className="sd-location-field-label">E-mail</div>
            {school.contact ? (
              <a className="sd-location-field-value" href={`mailto:${school.contact}`}>
                {school.contact}
              </a>
            ) : (
              <div className="sd-location-field-value is-placeholder">Nemáme tuto informaci.</div>
            )}
          </div>
          <div>
            <div className="sd-location-field-label">Web</div>
            {school.website ? (
              <a className="sd-location-field-value" href={school.website} target="_blank" rel="noopener noreferrer">
                {school.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            ) : (
              <div className="sd-location-field-value is-placeholder">Nemáme tuto informaci.</div>
            )}
          </div>
          <div>
            <div className="sd-location-field-label">Ředitel/ka</div>
            <div className="sd-location-field-value is-placeholder">Nemáme tuto informaci.</div>
          </div>
        </div>
        {streetViewUrl && (
          <a
            href={streetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ss-btn ss-btn-secondary"
            style={{ textAlign: 'center', justifyContent: 'center' }}
          >
            Otevřít v Mapách Google
          </a>
        )}
      </div>
    </div>
  );
}

export default SchoolLocation;
