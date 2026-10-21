const { haversineMeters, walkMinutes } = require('./commuteWalk');

const MAX_TRAVEL_MINUTES = 90;
const WALK_TRANSFER_METERS = 400;
const SCHOOL_EGRESS_METERS = 1_000;

function buildRoutePatterns(trips) {
  const patterns = new Map();
  for (const trip of trips) {
    if (!trip.stopIds || trip.stopIds.length < 2) continue;
    const key = `${trip.routeId}\u0000${trip.stopIds.join('\u0001')}`;
    let pattern = patterns.get(key);
    if (!pattern) {
      pattern = {
        id: key,
        stopIds: trip.stopIds,
        trips: [],
      };
      patterns.set(key, pattern);
    }
    pattern.trips.push(trip);
  }

  const byStop = new Map();
  for (const pattern of patterns.values()) {
    pattern.trips.sort((a, b) => a.departures[0] - b.departures[0]);
    pattern.tripsByStop = pattern.stopIds.map((_, stopIndex) =>
      pattern.trips
        .map((_, tripIndex) => tripIndex)
        .sort((a, b) => pattern.trips[a].departures[stopIndex] - pattern.trips[b].departures[stopIndex]),
    );
    for (const stopId of new Set(pattern.stopIds)) {
      if (!byStop.has(stopId)) byStop.set(stopId, []);
      byStop.get(stopId).push(pattern);
    }
  }
  return { patterns: [...patterns.values()], byStop };
}

function gridCell(lat, lon, latStep, lonStep) {
  return `${Math.floor(Number(lat) / latStep)}:${Math.floor(Number(lon) / lonStep)}`;
}

function buildFootpaths(stops, maxMeters = WALK_TRANSFER_METERS) {
  const edges = new Map(stops.map((stop) => [stop.id, []]));
  if (stops.length < 2) return edges;

  const meanLat = stops.reduce((sum, stop) => sum + Number(stop.lat), 0) / stops.length;
  const latStep = maxMeters / 111_320;
  const lonStep = maxMeters / (111_320 * Math.cos((meanLat * Math.PI) / 180));
  const cells = new Map();

  for (const stop of stops) {
    const latCell = Math.floor(Number(stop.lat) / latStep);
    const lonCell = Math.floor(Number(stop.lon) / lonStep);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        for (const other of cells.get(`${latCell + dy}:${lonCell + dx}`) || []) {
          const meters = haversineMeters(stop, other);
          if (meters > maxMeters) continue;
          const minutes = walkMinutes(stop, other);
          edges.get(stop.id).push({ stopId: other.id, minutes });
          edges.get(other.id).push({ stopId: stop.id, minutes });
        }
      }
    }
    const key = `${latCell}:${lonCell}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(stop);
  }
  return edges;
}

function buildSchoolEgress(schools, stops, maxMeters = SCHOOL_EGRESS_METERS) {
  const result = new Map();
  for (const school of schools) {
    const lat = Number(school.latitude);
    const lon = Number(school.longitude);
    const nearby = [];
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const location = { lat, lon };
      for (const stop of stops) {
        if (haversineMeters(location, stop) <= maxMeters) {
          nearby.push({ stopId: stop.id, minutes: walkMinutes(location, stop) });
        }
      }
    }
    result.set(String(school.id), nearby);
  }
  return result;
}

function routeFromOrigin({
  originPlatformIds,
  departureSeconds,
  routesByStop,
  footpaths,
  maxRounds = 4,
  maxMinutes = MAX_TRAVEL_MINUTES,
}) {
  const best = new Map();
  let marks = new Set();
  const maxArrival = departureSeconds + maxMinutes * 60;

  for (const stopId of originPlatformIds) {
    best.set(stopId, departureSeconds);
    marks.add(stopId);
  }
  for (const stopId of originPlatformIds) {
    for (const edge of footpaths.get(stopId) || []) {
      const arrival = departureSeconds + edge.minutes * 60;
      if (arrival > maxArrival || arrival >= (best.get(edge.stopId) ?? Infinity)) continue;
      best.set(edge.stopId, arrival);
      marks.add(edge.stopId);
    }
  }

  for (let round = 1; round <= maxRounds && marks.size; round += 1) {
    // Keep this round's boarding labels fixed. Arrivals from this round can only
    // be used for a transfer in the next round, so one round means one vehicle.
    const source = new Map(best);
    const routeSet = new Set();
    for (const stopId of marks) {
      for (const pattern of routesByStop.get(stopId) || []) routeSet.add(pattern);
    }

    const routeUpdates = new Map();
    for (const pattern of routeSet) {
      const boardIndexes = [];
      for (let index = 0; index < pattern.stopIds.length; index += 1) {
        const readyAt = source.get(pattern.stopIds[index]);
        if (readyAt != null && pattern.trips.some((trip) => trip.pickups[index] !== 1)) {
          boardIndexes.push(index);
        }
      }
      if (!boardIndexes.length) continue;

      const candidateTrips = new Set();
      for (const stopIndex of boardIndexes) {
        const readyAt = source.get(pattern.stopIds[stopIndex]);
        const departures = pattern.tripsByStop[stopIndex];
        let low = 0;
        let high = departures.length;
        while (low < high) {
          const mid = (low + high) >> 1;
          if (pattern.trips[departures[mid]].departures[stopIndex] < readyAt) low = mid + 1;
          else high = mid;
        }
        for (let index = low; index < departures.length; index += 1) {
          const tripIndex = departures[index];
          if (pattern.trips[tripIndex].departures[stopIndex] > maxArrival) break;
          candidateTrips.add(tripIndex);
        }
      }

      for (const tripIndex of candidateTrips) {
        const trip = pattern.trips[tripIndex];
        for (const boardIndex of boardIndexes) {
          const boardStop = pattern.stopIds[boardIndex];
          if (trip.pickups[boardIndex] === 1 || trip.departures[boardIndex] < source.get(boardStop)) continue;
          for (let index = boardIndex + 1; index < pattern.stopIds.length; index += 1) {
            const stopId = pattern.stopIds[index];
            const arrival = trip.arrivals[index];
            if (arrival > maxArrival) break;
            if (trip.drops[index] === 1 || arrival >= (best.get(stopId) ?? Infinity)) continue;
            if (arrival < (routeUpdates.get(stopId) ?? Infinity)) routeUpdates.set(stopId, arrival);
          }
        }
      }
    }

    const nextMarks = new Set();
    for (const [stopId, arrival] of routeUpdates) {
      best.set(stopId, arrival);
      nextMarks.add(stopId);
    }
    for (const [stopId, arrival] of routeUpdates) {
      for (const edge of footpaths.get(stopId) || []) {
        const walkedArrival = arrival + edge.minutes * 60;
        if (walkedArrival > maxArrival || walkedArrival >= (best.get(edge.stopId) ?? Infinity)) continue;
        best.set(edge.stopId, walkedArrival);
        nextMarks.add(edge.stopId);
      }
    }
    marks = nextMarks;
  }
  return best;
}

function minutesToSchool({ arrivals, departureSeconds, origin, school, egress }) {
  let bestArrival = Infinity;
  const schoolLocation = { lat: Number(school.latitude), lon: Number(school.longitude) };
  const walkToSchool = haversineMeters(origin, schoolLocation);
  if (walkToSchool <= SCHOOL_EGRESS_METERS) {
    bestArrival = departureSeconds + walkMinutes(origin, schoolLocation) * 60;
  }
  for (const target of egress || []) {
    const arrival = arrivals.get(target.stopId);
    if (arrival != null) bestArrival = Math.min(bestArrival, arrival + target.minutes * 60);
  }
  return Number.isFinite(bestArrival) ? (bestArrival - departureSeconds) / 60 : null;
}

function medianTravelMinutes(runs) {
  if (!Array.isArray(runs) || !runs.length) return null;
  const sorted = runs.map((value) => value == null ? Infinity : Number(value)).sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
  return Number.isFinite(median) && median <= MAX_TRAVEL_MINUTES ? Math.round(median) : null;
}

module.exports = {
  MAX_TRAVEL_MINUTES,
  WALK_TRANSFER_METERS,
  SCHOOL_EGRESS_METERS,
  buildRoutePatterns,
  buildFootpaths,
  buildSchoolEgress,
  routeFromOrigin,
  minutesToSchool,
  medianTravelMinutes,
};
