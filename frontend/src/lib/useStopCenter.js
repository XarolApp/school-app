import { useEffect, useRef, useState } from 'react';

/**
 * Keeps a Leaflet map centred on the chosen stop: re-centres whenever the stop
 * changes, and reports `off` once the user has dragged it away so a "back to
 * the stop" button can appear. `mapRef` must already hold the map when this
 * hook's effects run (call it after the effect that creates the map).
 */
export function useStopCenter(mapRef, stop, zoom = 12) {
  const [off, setOff] = useState(false);
  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !stop) return;
    map.setView([stop.lat, stop.lon], zoom);
    setOff(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only a different stop re-centres
  }, [stop?.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    const check = () => {
      const current = stopRef.current;
      if (!current) { setOff(false); return; }
      const point = map.latLngToContainerPoint([current.lat, current.lon]);
      setOff(point.distanceTo(map.getSize().divideBy(2)) > 40);
    };
    map.on('moveend zoomend', check);
    return () => { map.off('moveend zoomend', check); };
  }, [mapRef]);

  const recenter = () => {
    const map = mapRef.current;
    const current = stopRef.current;
    if (map && current) map.setView([current.lat, current.lon], map.getZoom());
  };
  return { off, recenter };
}
