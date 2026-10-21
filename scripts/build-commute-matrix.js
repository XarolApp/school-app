#!/usr/bin/env node
/**
 * Build lib/data/commute-matrix.json from the current PID GTFS feed.
 * Re-run after a meaningful PID timetable change, a school import, or a school
 * coordinate update. Raw feeds stay under the ignored scripts/data/gtfs/ tree.
 */
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { Readable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { execFileSync } = require('node:child_process');
const { createClient } = require('@supabase/supabase-js');
const { haversineMeters } = require('../lib/commuteWalk');
const {
  MAX_TRAVEL_MINUTES,
  SCHOOL_EGRESS_METERS,
  WALK_TRANSFER_METERS,
  buildRoutePatterns,
  buildFootpaths,
  buildSchoolEgress,
  routeFromOrigin,
  minutesToSchool,
  medianTravelMinutes,
} = require('../lib/commuteRouting');

const ROOT = path.resolve(__dirname, '..');
const GTFS_DIR = path.join(__dirname, 'data', 'gtfs');
const DEFAULT_FEED = path.join(GTFS_DIR, 'PID_GTFS.zip');
const EXTRACT_DIR = path.join(GTFS_DIR, 'current');
const MATRIX_PATH = path.join(ROOT, 'lib', 'data', 'commute-matrix.json');
const FEED_URL = 'https://data.pid.cz/PID_GTFS.zip';
const DEPARTURES = [6 * 60 + 30, 6 * 60 + 40, 6 * 60 + 50, 7 * 60, 7 * 60 + 10, 7 * 60 + 20, 7 * 60 + 30];

function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted) {
      if (character === '"' && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === '') {
      quoted = true;
    } else if (character === ',') {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
}

async function* readCsvRows(filePath) {
  const input = fs.createReadStream(filePath);
  const reader = readline.createInterface({ input, crlfDelay: Infinity });
  let headers = null;
  for await (let line of reader) {
    if (headers === null) {
      line = line.replace(/^\uFEFF/, '');
      headers = parseCsvLine(line);
      continue;
    }
    if (!line) continue;
    const values = parseCsvLine(line);
    const row = {};
    for (let index = 0; index < headers.length; index += 1) row[headers[index]] = values[index] ?? '';
    yield row;
  }
}

async function readSmallCsv(directory, name, optional = false) {
  const filePath = findGtfsFile(directory, name);
  if (!filePath && optional) return [];
  if (!filePath) throw new Error(`PID GTFS is missing ${name}.`);
  const rows = [];
  for await (const row of readCsvRows(filePath)) rows.push(row);
  return rows;
}

function findGtfsFile(directory, name) {
  const pending = [directory];
  while (pending.length) {
    const current = pending.pop();
    if (!fs.existsSync(current)) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (entry.name === name) return fullPath;
    }
  }
  return null;
}

function compactDate(value) {
  const text = String(value || '').trim();
  if (/^\d{8}$/.test(text)) return text;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text.replaceAll('-', '');
  return null;
}

function displayDate(value) {
  const compact = compactDate(value);
  return compact ? `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}` : null;
}

function dateFromDayOffset(compact, offset) {
  const date = new Date(Date.UTC(Number(compact.slice(0, 4)), Number(compact.slice(4, 6)) - 1, Number(compact.slice(6, 8)) + offset));
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function pragueToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}`;
}

function weekdayFor(compact) {
  return new Date(`${displayDate(compact)}T12:00:00Z`).getUTCDay();
}

function activeServiceIds(date, calendars, exceptions) {
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][weekdayFor(date)];
  const active = new Set(calendars
    .filter((row) => date >= compactDate(row.start_date) && date <= compactDate(row.end_date) && row[weekday] === '1')
    .map((row) => row.service_id));
  for (const row of exceptions) {
    if (compactDate(row.date) !== date) continue;
    if (row.exception_type === '1') active.add(row.service_id);
    else if (row.exception_type === '2') active.delete(row.service_id);
  }
  return active;
}

function pickServiceDate(feedInfo, calendars, exceptions, now = new Date()) {
  const calendarDates = calendars.flatMap((row) => [compactDate(row.start_date), compactDate(row.end_date)]).filter(Boolean);
  const start = compactDate(feedInfo?.feed_start_date) || calendarDates.sort()[0];
  const end = compactDate(feedInfo?.feed_end_date) || calendarDates.sort().at(-1);
  if (!start || !end) throw new Error('GTFS does not provide a usable service-date range.');

  const today = pragueToday(now);
  const firstDate = start > today ? start : today;
  const candidates = [];
  for (let date = firstDate; date <= end; date = dateFromDayOffset(date, 1)) {
    if (weekdayFor(date) !== 2) continue;
    const services = activeServiceIds(date, calendars, exceptions);
    if (!services.size) continue;
    const exceptionCount = exceptions.filter((row) => compactDate(row.date) === date).length;
    candidates.push({ date, services, exceptionCount });
  }
  const chosen = candidates.find((candidate) => candidate.exceptionCount === 0)
    || candidates.sort((a, b) => a.exceptionCount - b.exceptionCount)[0];
  if (!chosen) throw new Error('PID GTFS has no Tuesday service date in its validity range.');
  return { date: chosen.date, services: chosen.services, ordinary: chosen.exceptionCount === 0 };
}

function isPragueStop(row) {
  const locationType = row.location_type === '' ? 0 : Number(row.location_type);
  if (locationType !== 0) return false;
  const zones = String(row.zone_id || '').split(/[\s,;|]+/).filter(Boolean);
  return zones.some((zone) => ['P', '0', 'B'].includes(zone.toUpperCase())) || row.zone_region_type === '1';
}

function slug(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'zastavka';
}

function buildStopGroups(stops) {
  const groups = [];
  const byNodeAndName = new Map();
  const fallbackByName = new Map();
  const ordered = [...stops].sort((a, b) => a.id.localeCompare(b.id));

  for (const stop of ordered) {
    const node = String(stop.aswNodeId || '').trim();
    let group;
    if (node) {
      const key = `${node}\u0000${stop.name}`;
      group = byNodeAndName.get(key);
      if (!group) {
        group = { node, name: stop.name, platforms: [], latSum: 0, lonSum: 0 };
        byNodeAndName.set(key, group);
        groups.push(group);
      }
    } else {
      const nameKey = String(stop.name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const candidates = fallbackByName.get(nameKey) || [];
      group = candidates.find((candidate) => haversineMeters(stop, {
        lat: candidate.latSum / candidate.platforms.length,
        lon: candidate.lonSum / candidate.platforms.length,
      }) <= WALK_TRANSFER_METERS);
      if (!group) {
        group = { node: '', name: stop.name, platforms: [], latSum: 0, lonSum: 0, firstId: stop.id };
        candidates.push(group);
        fallbackByName.set(nameKey, candidates);
        groups.push(group);
      }
    }
    group.platforms.push(stop.id);
    group.latSum += Number(stop.lat);
    group.lonSum += Number(stop.lon);
  }

  return groups.map((group) => {
    const lat = group.latSum / group.platforms.length;
    const lon = group.lonSum / group.platforms.length;
    const id = group.node
      ? `pid-${group.node}-${slug(group.name)}`
      : `pid-${slug(group.name)}-${Math.round(lat * 10_000)}-${Math.round(lon * 10_000)}`;
    return { id, name: group.name, lat, lon, platformIds: group.platforms };
  }).sort((a, b) => a.name.localeCompare(b.name, 'cs') || a.id.localeCompare(b.id));
}

async function loadStops(directory) {
  const platforms = new Map();
  const stopsFile = findGtfsFile(directory, 'stops.txt');
  if (!stopsFile) throw new Error('PID GTFS is missing stops.txt.');
  for await (const row of readCsvRows(stopsFile)) {
    const lat = Number(row.stop_lat);
    const lon = Number(row.stop_lon);
    if (!row.stop_id || !row.stop_name || !isPragueStop(row) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    platforms.set(row.stop_id, {
      id: row.stop_id,
      name: row.stop_name,
      lat,
      lon,
      aswNodeId: row.asw_node_id,
    });
  }
  if (!platforms.size) throw new Error('PID GTFS contains no usable Prague stops.');
  return { platforms: [...platforms.values()], byId: platforms, groups: buildStopGroups([...platforms.values()]) };
}

function parseGtfsTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,3}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, hours, minutes, seconds] = match.map(Number);
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

function pickupDropType(value = '') {
  if (value === '') return 0;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 3 ? number : 1;
}

async function loadTrips(directory, activeServices, stopIds) {
  const routes = new Set((await readSmallCsv(directory, 'routes.txt')).map((row) => row.route_id));
  const trips = new Map();
  for (const row of await readSmallCsv(directory, 'trips.txt')) {
    if (!activeServices.has(row.service_id) || !routes.has(row.route_id)) continue;
    trips.set(row.trip_id, { id: row.trip_id, routeId: row.route_id, rows: [] });
  }

  const stopTimes = findGtfsFile(directory, 'stop_times.txt');
  if (!stopTimes) throw new Error('PID GTFS is missing stop_times.txt.');
  for await (const row of readCsvRows(stopTimes)) {
    const trip = trips.get(row.trip_id);
    if (!trip || !stopIds.has(row.stop_id)) continue;
    const arrival = parseGtfsTime(row.arrival_time);
    const departure = parseGtfsTime(row.departure_time);
    const sequence = Number(row.stop_sequence);
    if (arrival == null || departure == null || !Number.isFinite(sequence)) continue;
    trip.rows.push({
      stopId: row.stop_id,
      sequence,
      arrival,
      departure,
      pickup: pickupDropType(row.pickup_type ?? ''),
      drop: pickupDropType(row.drop_off_type ?? ''),
    });
  }

  return [...trips.values()].flatMap((trip) => {
    const rows = trip.rows.sort((a, b) => a.sequence - b.sequence);
    if (rows.length < 2) return [];
    return [{
      tripId: trip.id,
      routeId: trip.routeId,
      stopIds: rows.map((row) => row.stopId),
      arrivals: rows.map((row) => row.arrival),
      departures: rows.map((row) => row.departure),
      pickups: rows.map((row) => row.pickup),
      drops: rows.map((row) => row.drop),
    }];
  });
}

async function loadSchools() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the root .env.');
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const schools = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('schools')
      .select('id, name, latitude, longitude, merged_into, hidden_reason')
      .is('merged_into', null)
      .is('hidden_reason', null)
      .range(offset, offset + 999);
    if (error) throw new Error(`Could not read visible schools: ${error.message}`);
    schools.push(...(data || []));
    if ((data || []).length < 1000) break;
  }
  return schools.filter((school) => Number.isFinite(Number(school.latitude)) && Number.isFinite(Number(school.longitude)));
}

async function downloadFeed(destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  const response = await fetch(FEED_URL);
  if (!response.ok || !response.body) throw new Error(`PID GTFS download failed (${response.status}).`);
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(temporary));
  fs.renameSync(temporary, destination);
}

function parseArguments(args) {
  let feedPath = DEFAULT_FEED;
  let refresh = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--refresh') refresh = true;
    else if (args[index] === '--feed') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error('--feed requires a ZIP path.');
      feedPath = path.resolve(args[index + 1]);
      index += 1;
    } else if (args[index] === '--help' || args[index] === '-h') {
      return { help: true };
    } else {
      throw new Error(`Unknown argument: ${args[index]}`);
    }
  }
  if (refresh && feedPath !== DEFAULT_FEED) throw new Error('--refresh cannot be combined with --feed.');
  return { feedPath, refresh };
}

async function buildMatrix(directory, now = new Date()) {
  const feedInfo = (await readSmallCsv(directory, 'feed_info.txt', true))[0] || {};
  const calendars = await readSmallCsv(directory, 'calendar.txt', true);
  const exceptions = await readSmallCsv(directory, 'calendar_dates.txt', true);
  if (!calendars.length && !exceptions.length) throw new Error('PID GTFS has no calendar service definitions.');
  const service = pickServiceDate(feedInfo, calendars, exceptions, now);
  const feedDate = displayDate(feedInfo.feed_start_date) || pragueToday(now).replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
  const stopData = await loadStops(directory);
  const trips = await loadTrips(directory, service.services, stopData.byId);
  const { byStop } = buildRoutePatterns(trips);
  const footpaths = buildFootpaths(stopData.platforms, WALK_TRANSFER_METERS);
  const schools = await loadSchools();
  const schoolEgress = buildSchoolEgress(schools, stopData.platforms, SCHOOL_EGRESS_METERS);
  const schoolColumns = Object.fromEntries(schools.map((school) => [String(school.id), []]));

  for (let stopIndex = 0; stopIndex < stopData.groups.length; stopIndex += 1) {
    const origin = stopData.groups[stopIndex];
    const runsBySchool = new Map(schools.map((school) => [String(school.id), []]));
    for (const departureMinute of DEPARTURES) {
      const departureSeconds = departureMinute * 60;
      const arrivals = routeFromOrigin({
        originPlatformIds: origin.platformIds,
        departureSeconds,
        routesByStop: byStop,
        footpaths,
      });
      for (const school of schools) {
        runsBySchool.get(String(school.id)).push(minutesToSchool({
          arrivals,
          departureSeconds,
          origin,
          school,
          egress: schoolEgress.get(String(school.id)),
        }));
      }
    }
    for (const school of schools) {
      schoolColumns[String(school.id)].push(medianTravelMinutes(runsBySchool.get(String(school.id))));
    }
    if ((stopIndex + 1) % 100 === 0 || stopIndex + 1 === stopData.groups.length) {
      console.log(`Computed ${stopIndex + 1}/${stopData.groups.length} stop groups`);
    }
  }

  return {
    matrix: {
      generatedAt: new Date().toISOString(),
      feedDate,
      serviceDate: displayDate(service.date),
      stops: stopData.groups.map(({ id, name, lat, lon }) => ({ id, name, lat, lon })),
      schools: schoolColumns,
    },
    serviceOrdinary: service.ordinary,
    schoolsCount: schools.length,
    platformsCount: stopData.platforms.length,
    tripsCount: trips.length,
  };
}

async function main(args = process.argv.slice(2)) {
  const options = parseArguments(args);
  if (options.help) {
    console.log('Usage: node scripts/build-commute-matrix.js [--refresh | --feed path/to/PID_GTFS.zip]');
    return;
  }
  const started = Date.now();
  fs.mkdirSync(GTFS_DIR, { recursive: true });
  if (options.refresh || !fs.existsSync(options.feedPath)) await downloadFeed(options.feedPath);
  fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  execFileSync('unzip', ['-oq', options.feedPath, '-d', EXTRACT_DIR], { stdio: 'ignore' });

  const { matrix, serviceOrdinary, schoolsCount, platformsCount, tripsCount } = await buildMatrix(EXTRACT_DIR);
  if (!serviceOrdinary) console.warn('No Tuesday without calendar exceptions was available; using the least-exception Tuesday in the feed.');
  const serialized = `${JSON.stringify(matrix)}\n`;
  if (Buffer.byteLength(serialized) >= 2 * 1024 * 1024) throw new Error('Commute matrix is at least 2 MB; refusing to write it.');
  fs.mkdirSync(path.dirname(MATRIX_PATH), { recursive: true });
  const temporary = `${MATRIX_PATH}.tmp`;
  fs.writeFileSync(temporary, serialized);
  fs.renameSync(temporary, MATRIX_PATH);

  const values = Object.values(matrix.schools).flat();
  const nullPercent = values.length ? Math.round((values.filter((value) => value == null).length / values.length) * 1000) / 10 : 0;
  console.log(`Service date: ${matrix.serviceDate}${serviceOrdinary ? '' : ' (calendar exceptions present)'}`);
  console.log(`PID GTFS feed date: ${matrix.feedDate}`);
  console.log(`Built ${matrix.stops.length} stop groups × ${schoolsCount} schools (${platformsCount} platforms, ${tripsCount} active trips).`);
  console.log(`Null values: ${nullPercent}% · matrix: ${Math.round(Buffer.byteLength(serialized) / 1024)} KB · runtime: ${Math.round((Date.now() - started) / 1000)} s`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Commute matrix build failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  parseCsvLine,
  readCsvRows,
  compactDate,
  displayDate,
  activeServiceIds,
  pickServiceDate,
  isPragueStop,
  buildStopGroups,
  parseGtfsTime,
  pickupDropType,
  parseArguments,
  buildMatrix,
  main,
  MAX_TRAVEL_MINUTES,
};
