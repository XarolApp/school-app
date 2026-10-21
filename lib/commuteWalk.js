const WALK_KMH = 4.5;
const DETOUR = 1.3;
const EARTH_RADIUS_METERS = 6_371_008.8;

function haversineMeters(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = radians(Number(a.lat));
  const lat2 = radians(Number(b.lat));
  const deltaLat = lat2 - lat1;
  const deltaLon = radians(Number(b.lon) - Number(a.lon));
  const h = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, h)));
}

function walkMinutes(a, b) {
  return Math.max(1, Math.round((haversineMeters(a, b) * DETOUR * 60) / (WALK_KMH * 1000)));
}

module.exports = { WALK_KMH, DETOUR, haversineMeters, walkMinutes };
