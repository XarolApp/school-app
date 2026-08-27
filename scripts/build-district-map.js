/**
 * Builds the Prague district geometry used by two things at once:
 *
 *   frontend/src/lib/pragueDistricts.js  — SVG paths for the picker map
 *   lib/pragueDistricts.js               — point-in-polygon lookup for scoring
 *
 * Run it once; re-run only to change the simplification or refresh boundaries:
 *
 *   node scripts/build-district-map.js [tolerance]
 *
 * ⚠️ BOTH FILES COME FROM ONE RUN, but at DIFFERENT simplifications, and the
 * asymmetry is deliberate:
 *
 *   the map      is simplified (MAP_TOLERANCE) — it ships to every browser, and
 *                a boundary being a few metres off is invisible at any size it
 *                is ever drawn at.
 *   the lookup   is not simplified at all — it decides which schools a student
 *                actually sees, it runs server-side, and its size costs nothing.
 *
 * This is safe because **schools are never plotted on the district map**. The
 * map is a picker for district *names*; membership is decided entirely by the
 * lookup. So there is no visual claim for a coarser outline to contradict —
 * nobody can see that the rendered border sits ~20 m from the scored one.
 *
 * It is also necessary. Measured against the real 60 schools: one of them
 * (Akademie systémové gastronomie) sits **2 metres** from the Praha 9 / Praha 14
 * border. At MAP_TOLERANCE it lands on the wrong side; at full precision it does
 * not. No tolerance makes a school standing on the line robust, so the side that
 * decides what a student sees simply does not round.
 *
 * Never hand-edit either output.
 *
 * WHICH DIVISION, AND WHY IT MATTERS
 * ----------------------------------
 * Prague is carved up three ways at once and OSM carries all three:
 *
 *   admin_level=5  "obvod Praha 1..10"   — the 10 municipal districts; what
 *                                          Czech POSTAL ADDRESSES use.
 *   admin_level=6  "SO Praha 1..22"      — the 22 správní obvody.   << we use
 *   admin_level=9  57 městské části      — Praha 1..22 plus 35 named ones
 *                                          (Zbraslav, Kunratice, Satalice, …).
 *
 * We draw and score the 22 správní obvody. They tile the whole city, they are
 * numbered 1..22 with no named exceptions to explain, and they are the division
 * Praguers actually mean by "Praha 13".
 *
 * The catch, measured against all 60 schools: a postal address and a správní
 * obvod disagree for 18 of them — "Praha 9" addresses that are really in SO
 * Praha 14, 18, 19 or 20; "Praha 4" addresses really in SO Praha 11; "Praha 5"
 * really in SO Praha 13 or 16. So this division CANNOT be scored by parsing the
 * address, which is what `districtOf()` used to do. It is scored from the
 * school's coordinates instead, via `districtForPoint()` in the generated
 * backend module.
 *
 * That makes geocoding a hard prerequisite for location scoring: a school with
 * no latitude/longitude has no district and matches no district preference.
 * Run `node scripts/geocode-schools.js` after every scrape.
 *
 * Boundaries © OpenStreetMap contributors, ODbL — the attribution rendered
 * under the map is required by that licence, not decoration.
 */
const fs = require('fs');
const path = require('path');

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
// Overpass mirrors 429 anonymous callers, same as Nominatim does for the
// geocoder. Identify ourselves and rotate endpoints when one is unwell.
const USER_AGENT = 'skolamatch-districts/1.0 (+http://localhost:5173)';

const EXPECTED = 22;
const VIEW_W = 1000;
const PAD = 8;

// Drawn-only. 1.0 keeps 13.9% of the points and is visually indistinguishable
// from the source at any size the map is rendered at.
const MAP_TOLERANCE = parseFloat(process.argv[2] || '1.0');
// Scoring. Zero: full source precision, because this decides which schools a
// student is shown and it never leaves the server. See the header note.
const LOOKUP_TOLERANCE = 0;

async function overpass(query, attempts = 12) {
  let lastErr = 'unknown';
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(ENDPOINTS[i % ENDPOINTS.length], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: new URLSearchParams({ data: query }),
      });
      const text = await res.text();
      if (text.trimStart().startsWith('{')) {
        const json = JSON.parse(text);
        if (json.elements?.length) return json;
        lastErr = 'empty result';
      } else {
        lastErr = `HTTP ${res.status}`;
      }
    } catch (err) {
      lastErr = err.message;
    }
    process.stderr.write(`  attempt ${i + 1}/${attempts} failed (${lastErr}), retrying…\n`);
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  throw new Error(`Overpass failed: ${lastErr}`);
}

/* --- geometry ----------------------------------------------------------- */

const keyOf = (p) => `${p[0].toFixed(7)},${p[1].toFixed(7)}`;

// Overpass returns a boundary as unordered way fragments pointing in arbitrary
// directions. Walk them end-to-end into closed rings.
function stitch(wayGeometries) {
  const pool = wayGeometries.map((w) => w.map((p) => [p.lon, p.lat]));
  const used = new Array(pool.length).fill(false);
  const rings = [];

  for (let i = 0; i < pool.length; i += 1) {
    if (used[i]) continue;
    used[i] = true;
    let ring = pool[i].slice();
    let extended = true;

    while (extended && keyOf(ring[0]) !== keyOf(ring[ring.length - 1])) {
      extended = false;
      const tail = keyOf(ring[ring.length - 1]);
      for (let j = 0; j < pool.length; j += 1) {
        if (used[j]) continue;
        const w = pool[j];
        if (keyOf(w[0]) === tail) ring = ring.concat(w.slice(1));
        else if (keyOf(w[w.length - 1]) === tail) ring = ring.concat(w.slice(0, -1).reverse());
        else continue;
        used[j] = true;
        extended = true;
        break;
      }
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}

// Web Mercator, matching components/SchoolMap.jsx so the two never disagree.
const mercX = (lon) => (lon + 180) / 360;
const mercY = (lat) => {
  const r = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
};

function perpDist(p, a, b) {
  const [px, py] = p, [ax, ay] = a, [bx, by] = b;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function simplify(pts, tol) {
  if (pts.length <= 3) return pts;
  let maxD = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i += 1) {
    const d = perpDist(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= tol) return [pts[0], pts[pts.length - 1]];
  return simplify(pts.slice(0, idx + 1), tol).slice(0, -1).concat(simplify(pts.slice(idx), tol));
}

function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// A centroid falls outside an L-shaped district, which would float the number
// over a neighbour. The pole of inaccessibility — the interior point furthest
// from any edge — is always inside and is also the roomiest spot for a label.
// Its distance-to-edge doubles as "how much room is there", which the map uses
// to size small districts' numbers down instead of overflowing them.
function poleOfInaccessibility(ring) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  let best = null, bestD = -1;
  const search = (x0, y0, x1, y1, steps) => {
    for (let i = 0; i <= steps; i += 1) {
      for (let j = 0; j <= steps; j += 1) {
        const p = [x0 + (i * (x1 - x0)) / steps, y0 + (j * (y1 - y0)) / steps];
        if (!pointInRing(p, ring)) continue;
        let d = Infinity;
        for (let k = 0, l = ring.length - 1; k < ring.length; l = k, k += 1) {
          d = Math.min(d, perpDist(p, ring[l], ring[k]));
        }
        if (d > bestD) { bestD = d; best = p; }
      }
    }
  };
  search(minX, minY, maxX, maxY, 56);
  const w = (maxX - minX) / 56, h = (maxY - minY) / 56;
  search(best[0] - w, best[1] - h, best[0] + w, best[1] + h, 12);
  return { point: best, radius: bestD };
}

/* --- build -------------------------------------------------------------- */

(async () => {
  console.log('Fetching Prague správní obvody (admin_level=6) from OpenStreetMap…');
  const raw = await overpass(`[out:json][timeout:180];
rel["boundary"="administrative"]["admin_level"="6"]["name"~"^SO Praha"];
out geom;`);

  const districts = raw.elements
    .map((rel) => {
      const ways = (rel.members || []).filter((m) => m.type === 'way' && m.geometry);
      return {
        num: parseInt(rel.tags.name.replace(/\D+/g, ''), 10),
        outer: stitch(ways.filter((m) => m.role === 'outer' || m.role === '').map((m) => m.geometry)),
      };
    })
    .sort((a, b) => a.num - b.num);

  if (districts.length !== EXPECTED) {
    throw new Error(`expected ${EXPECTED} správní obvody, got ${districts.length}`);
  }
  const unstitched = districts.filter((d) => !d.outer.length);
  if (unstitched.length) throw new Error(`failed to stitch: ${unstitched.map((d) => d.num).join(', ')}`);

  // One projection shared by every district, fitted to the whole city.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of districts) {
    for (const ring of d.outer) {
      for (const [lon, lat] of ring) {
        minX = Math.min(minX, mercX(lon)); maxX = Math.max(maxX, mercX(lon));
        minY = Math.min(minY, mercY(lat)); maxY = Math.max(maxY, mercY(lat));
      }
    }
  }
  const scale = (VIEW_W - PAD * 2) / (maxX - minX);
  const viewH = Math.round((maxY - minY) * scale + PAD * 2);
  const toView = ([lon, lat]) => [
    (mercX(lon) - minX) * scale + PAD,
    (mercY(lat) - minY) * scale + PAD,
  ];

  // `decimals` controls how much precision survives into the output. The map
  // rounds to 0.1 of a viewBox unit (~2 m) because it is only ever drawn; the
  // lookup keeps 4 decimals so a school standing on a boundary is not rounded
  // across it.
  const ringsAt = (district, tolerance, decimals) =>
    district.outer.map((r) => {
      const s = simplify(r.map(toView), tolerance);
      // Douglas-Peucker can leave a ring open; close it so `fill` behaves.
      if (s[0][0] !== s[s.length - 1][0] || s[0][1] !== s[s.length - 1][1]) s.push(s[0]);
      return s.map(([x, y]) => [+x.toFixed(decimals), +y.toFixed(decimals)]);
    });

  const bboxOf = (rings) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const ring of rings) {
      for (const [x, y] of ring) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
    return [x0, y0, x1, y1].map((v) => +v.toFixed(4));
  };

  let rawPts = 0, mapPts = 0, lookupPts = 0;

  const frontend = [];
  const lookup = [];

  for (const d of districts) {
    rawPts += d.outer.reduce((n, r) => n + r.length, 0);

    const mapRings = ringsAt(d, MAP_TOLERANCE, 1);
    const lookupRings = ringsAt(d, LOOKUP_TOLERANCE, 4);
    mapPts += mapRings.reduce((n, r) => n + r.length, 0);
    lookupPts += lookupRings.reduce((n, r) => n + r.length, 0);

    // The label goes on the drawn shape, so it is placed against the drawn one.
    const pole = poleOfInaccessibility(mapRings.reduce((a, b) => (a.length >= b.length ? a : b)));

    frontend.push({
      id: `Praha ${d.num}`,
      num: d.num,
      d: mapRings.map((r) => `M${r.map(([x, y]) => `${x},${y}`).join('L')}Z`).join(''),
      labelX: +pole.point[0].toFixed(1),
      labelY: +pole.point[1].toFixed(1),
      labelR: +pole.radius.toFixed(1),
    });

    lookup.push({
      id: `Praha ${d.num}`,
      num: d.num,
      bbox: bboxOf(lookupRings),
      rings: lookupRings,
    });
  }

  const frontendDest = path.join(__dirname, '..', 'frontend', 'src', 'lib', 'pragueDistricts.js');
  fs.writeFileSync(
    frontendDest,
    `// GENERATED by scripts/build-district-map.js — do not edit by hand.
//
// Prague's 22 správní obvody (OSM admin_level=6). \`id\` matches the \`casti\`
// option values in lib/questionnaire.js exactly; that string equality is the
// contract between the map and the checkboxes.
//
// \`labelR\` is how much room the number has (distance from the label point to
// the nearest edge), so small districts can shrink their label instead of
// overflowing it.
//
// The identical rings, in the identical coordinate space, are also emitted to
// lib/pragueDistricts.js for scoring — so the shape you click is the shape a
// school is tested against. Regenerate both together.
//
// Boundaries © OpenStreetMap contributors, ODbL.
// Web Mercator, Douglas-Peucker simplified at ${MAP_TOLERANCE}px of a ${VIEW_W}-unit
// viewBox. This is the DRAWN geometry — scoring uses the unsimplified rings in
// lib/pragueDistricts.js, which is why a border here can sit a few metres off.

export const VIEW_BOX = '0 0 ${VIEW_W} ${viewH}';

export const DISTRICTS = ${JSON.stringify(frontend, null, 2)};
`
  );

  /* --- backend: point-in-polygon lookup -------------------------------- */
  const backendDest = path.join(__dirname, '..', 'lib', 'pragueDistricts.js');
  fs.writeFileSync(
    backendDest,
    `// GENERATED by scripts/build-district-map.js — do not edit by hand.
//
// Prague's 22 správní obvody as point-in-polygon regions, in the same projected
// space and at the same simplification as the map in
// frontend/src/lib/pragueDistricts.js. Regenerate both together: if these two
// drift apart, a student can click a district a school is visibly inside and
// still not match it.
//
// This exists because a school's postal address CANNOT name its správní obvod —
// measured over all 60 schools, the two disagree for 18 of them. Location is
// therefore scored from coordinates, which makes geocoding a prerequisite:
// a school with no latitude/longitude has no district.
//
// Boundaries © OpenStreetMap contributors, ODbL.

const PROJECTION = ${JSON.stringify({ minX, minY, scale, pad: PAD })};

const REGIONS = ${JSON.stringify(lookup)};

function project(lat, lon) {
  const x = (lon + 180) / 360;
  const r = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2;
  return [
    (x - PROJECTION.minX) * PROJECTION.scale + PROJECTION.pad,
    (y - PROJECTION.minY) * PROJECTION.scale + PROJECTION.pad,
  ];
}

function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Which správní obvod contains this coordinate? Returns "Praha 1".."Praha 22",
 * or null for a missing/unparseable coordinate or a point outside the city.
 *
 * \`float8\` columns are checked with Number.isFinite rather than a null test, so
 * a malformed row cannot reach the arithmetic — same rule as SchoolMap.jsx.
 */
function districtForPoint(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const pt = project(lat, lon);
  for (const region of REGIONS) {
    if (
      pt[0] < region.bbox[0] || pt[0] > region.bbox[2] ||
      pt[1] < region.bbox[1] || pt[1] > region.bbox[3]
    ) {
      continue;
    }
    let inside = false;
    for (const ring of region.rings) if (pointInRing(pt, ring)) inside = !inside;
    if (inside) return region.id;
  }
  return null;
}

/** The district a school row sits in, or null if it has not been geocoded. */
function districtOfSchool(school) {
  if (!school) return null;
  return districtForPoint(Number(school.latitude), Number(school.longitude));
}

const DISTRICT_IDS = REGIONS.map((r) => r.id);

module.exports = { districtForPoint, districtOfSchool, DISTRICT_IDS };
`
  );

  const pct = (n) => `${((n / rawPts) * 100).toFixed(1)}%`;
  console.log(`\nsource points        : ${rawPts}`);
  console.log(`  map    (tol ${MAP_TOLERANCE})    : ${mapPts} (${pct(mapPts)})  — drawn only`);
  console.log(`  lookup (tol ${LOOKUP_TOLERANCE})      : ${lookupPts} (${pct(lookupPts)})  — decides what a student sees`);
  console.log(`viewBox 0 0 ${VIEW_W} ${viewH}`);
  console.log('label room (viewBox px) — small districts shrink their number:');
  console.log('  ' + frontend.map((b) => `${b.num}:${b.labelR}`).join('  '));
  const rel = (p) => path.relative(path.join(__dirname, '..'), p);
  console.log(`\nwrote ${rel(frontendDest)} (${(fs.statSync(frontendDest).size / 1024).toFixed(1)} kB)`);
  console.log(`wrote ${rel(backendDest)} (${(fs.statSync(backendDest).size / 1024).toFixed(1)} kB)`);
})().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
