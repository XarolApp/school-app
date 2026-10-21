const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRoutePatterns,
  routeFromOrigin,
  minutesToSchool,
  medianTravelMinutes,
} = require('../lib/commuteRouting');
const { walkMinutes: serverWalkMinutes } = require('../lib/commuteWalk');
const {
  parseCsvLine,
  parseGtfsTime,
  buildStopGroups,
} = require('../scripts/build-commute-matrix');

const h = (hour, minute) => hour * 3600 + minute * 60;

function routeFixture() {
  const { byStop } = buildRoutePatterns([
    {
      tripId: 'A-B', routeId: 'ab', stopIds: ['A', 'B'],
      arrivals: [h(7, 0), h(7, 10)], departures: [h(7, 0), h(7, 10)], pickups: [0, 0], drops: [0, 0],
    },
    {
      tripId: 'A-E', routeId: 'direct', stopIds: ['A', 'E'],
      arrivals: [h(7, 45), h(8, 2)], departures: [h(7, 45), h(8, 2)], pickups: [0, 0], drops: [0, 0],
    },
    {
      tripId: 'C-E-missed', routeId: 'ce', stopIds: ['C', 'E'],
      arrivals: [h(7, 11), h(7, 18)], departures: [h(7, 11), h(7, 18)], pickups: [0, 0], drops: [0, 0],
    },
    {
      tripId: 'C-E-next', routeId: 'ce', stopIds: ['C', 'E'],
      arrivals: [h(7, 20), h(7, 30)], departures: [h(7, 20), h(7, 30)], pickups: [0, 0], drops: [0, 0],
    },
  ]);
  const footpaths = new Map([
    ['A', []],
    ['B', [{ stopId: 'C', minutes: 2 }]],
    ['C', [{ stopId: 'B', minutes: 2 }]],
    ['E', []],
  ]);
  return { byStop, footpaths };
}

const farSchool = { id: 1, latitude: 51, longitude: 15 };
const egress = [{ stopId: 'E', minutes: 0 }];

test('CSV parser preserves quoted commas and escaped quotes; GTFS times allow 24+ hours', () => {
  assert.deepEqual(parseCsvLine('"a,b","say ""hi""",c'), ['a,b', 'say "hi"', 'c']);
  assert.equal(parseGtfsTime('25:10:00'), 90_600);
  assert.equal(parseGtfsTime('07:61:00'), null);
});

test('PID platforms group by ASW node and name, not node alone', () => {
  const groups = buildStopGroups([
    { id: '1040/1', name: 'Anděl', lat: 50.07, lon: 14.40, aswNodeId: '1040' },
    { id: '1040/2', name: 'Anděl', lat: 50.071, lon: 14.401, aswNodeId: '1040' },
    { id: '1040/3', name: 'Nádražní', lat: 50.072, lon: 14.402, aswNodeId: '1040' },
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups.find((group) => group.name === 'Anděl').platformIds.length, 2);
  assert.ok(groups.every((group) => group.id.startsWith('pid-1040-')));
});

test('RAPTOR handles a direct trip, a footpath transfer, a missed connection, and unreachable schools', () => {
  const { byStop, footpaths } = routeFixture();
  const directArrivals = routeFromOrigin({
    originPlatformIds: ['A'], departureSeconds: h(7, 45), routesByStop: byStop, footpaths,
  });
  assert.equal(minutesToSchool({
    arrivals: directArrivals, departureSeconds: h(7, 45), origin: { lat: 50, lon: 14 }, school: farSchool, egress,
  }), 17);

  const transferArrivals = routeFromOrigin({
    originPlatformIds: ['A'], departureSeconds: h(7, 0), routesByStop: byStop, footpaths,
  });
  assert.equal(transferArrivals.get('E'), h(7, 30));
  assert.equal(minutesToSchool({
    arrivals: transferArrivals, departureSeconds: h(7, 0), origin: { lat: 50, lon: 14 }, school: farSchool, egress,
  }), 30);

  const unreachableArrivals = routeFromOrigin({
    originPlatformIds: ['X'], departureSeconds: h(7, 0), routesByStop: byStop, footpaths,
  });
  assert.equal(minutesToSchool({
    arrivals: unreachableArrivals, departureSeconds: h(7, 0), origin: { lat: 50, lon: 14 }, school: farSchool, egress,
  }), null);
});

test('nearby schools use their converted coordinates for direct walking and transit comparison', () => {
  const origin = { lat: 50, lon: 14 };
  const school = { id: 12, latitude: 50, longitude: 14.005 };
  const departureSeconds = h(7, 0);
  assert.equal(minutesToSchool({
    arrivals: new Map(), departureSeconds, origin, school, egress: [],
  }), 6);
  assert.equal(minutesToSchool({
    arrivals: new Map([['E', departureSeconds + 5 * 60]]),
    departureSeconds, origin, school, egress: [{ stopId: 'E', minutes: 0 }],
  }), 5);
});

test('median uses seven departures and reports null when the median exceeds 90 minutes', () => {
  assert.equal(medianTravelMinutes([20, 22, 21, 22.4, 24, 100, null]), 22);
  assert.equal(medianTravelMinutes([89, 91, 92, null, null, null, null]), null);
  assert.equal(medianTravelMinutes([null, null, null, null, null, null, null]), null);
});

test('browser and server walking estimates match and stop matching folds diacritics', async () => {
  const browser = await import('../frontend/src/lib/commute.js');
  const from = { lat: 50.075, lon: 14.4 };
  const to = { lat: 50.08, lon: 14.42 };
  assert.equal(browser.walkMinutes(from, to), serverWalkMinutes(from, to));
  const stops = [{ id: 'pid-1040-andel', name: 'Anděl', lat: 50.07, lon: 14.4 }];
  assert.deepEqual(browser.findStopsByName(stops, 'andel'), stops);
  assert.equal(browser.nearestStopGroup(from, stops).stop.id, stops[0].id);
});

test('request stops (PID pickup/drop type 3) are boardable; type 1 is not', () => {
  const trip = (pickup, drop) => buildRoutePatterns([{
    tripId: 'R', routeId: 'r', stopIds: ['A', 'B'],
    arrivals: [h(7, 0), h(7, 10)], departures: [h(7, 0), h(7, 10)], pickups: [pickup, 0], drops: [0, drop],
  }]).byStop;
  const reach = (byStop) => routeFromOrigin({
    originPlatformIds: ['A'], departureSeconds: h(6, 55), routesByStop: byStop,
    footpaths: new Map([['A', []], ['B', []]]),
  }).get('B');
  assert.equal(reach(trip(3, 3)), h(7, 10));
  assert.equal(reach(trip(1, 0)), undefined);
  assert.equal(reach(trip(0, 1)), undefined);
});
