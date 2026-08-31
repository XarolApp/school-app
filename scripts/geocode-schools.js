/**
 * One-time backfill: turns each school's text address into coordinates.
 *
 *   node scripts/geocode-schools.js          # fill in what is missing
 *   node scripts/geocode-schools.js --force  # redo every school
 *
 * Run it after adding the `latitude`/`longitude` columns from
 * `supabase-setup.sql`, and again after the scraper adds a city. Schools that
 * already have coordinates are skipped, so a re-run costs one request per new
 * school rather than sixty.
 *
 * Uses Nominatim, OpenStreetMap's own geocoder. It is free with no account,
 * and its usage policy is the price: an identifying User-Agent and at most one
 * request per second, both enforced below. Those are conditions of the
 * service, not suggestions — a script that hammers it gets the IP blocked.
 * Sixty schools therefore take about a minute, which is fine for something
 * that runs approximately never.
 *
 * Writes with the service_role key because RLS on `schools` grants the browser
 * nothing at all (that is what makes the paywall real), so an anon key cannot
 * update a row here.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

// One request per second is Nominatim's stated limit; the extra 100ms is slack
// for clock jitter so a burst never lands inside the same second.
const DELAY_MS = 1100;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the root .env.'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Address strings come from the scraper and are not consistent — some read
 * "Praha 6, Evropská 33", others carry a postal code or a building name. Rather
 * than parse them, hand Nominatim the whole thing and let it do the matching,
 * with the country pinned so a Czech street name cannot resolve to a namesake
 * abroad. The second attempt drops everything before the last comma, which
 * turns a decorated address back into a plain street line.
 */
// Scraped addresses often carry Prague's cadastral neighbourhood name — the
// historical district (Stodůlky, Vršovice, Chodov, ...) — in the middle,
// separate from the numbered "Praha N" postal district: e.g.
// "Prusíkova 2577/16, Stodůlky, 155 00 Praha 5". Nominatim's parser fails on
// that whole three-part shape rather than falling back gracefully — dropping
// just the cadastral-name segment (keeping the postal code and "Praha N")
// resolves every address of this shape correctly. Confirmed on all 7 schools
// that failed a first geocoding pass: each one matched within ~0m–30m of a
// street-only query once the cadastral name was removed, i.e. the same
// building, not a different match.
function withoutCadastralName(location) {
  const match = location.match(/^(.*?),\s*[^,]+,\s*(\d{3}\s?\d{2}\s*Praha\s*\d+)\s*$/i);
  return match ? `${match[1]}, ${match[2]}` : null;
}

function queriesFor(location) {
  const trimmed = location.trim();
  const attempts = [trimmed];

  const stripped = withoutCadastralName(trimmed);
  if (stripped) attempts.push(stripped);

  const lastComma = trimmed.lastIndexOf(',');
  if (lastComma > 0) attempts.push(trimmed.slice(0, lastComma).trim());

  return [...new Set(attempts)].filter(Boolean);
}

async function geocode(location) {
  for (const query of queriesFor(location)) {
    const url = `${NOMINATIM}?${new URLSearchParams({
      q: query,
      format: 'json',
      limit: '1',
      countrycodes: 'cz',
    })}`;

    const response = await fetch(url, {
      headers: {
        // Nominatim rejects requests without something identifying behind them.
        'User-Agent': `skolamatch-geocoder/1.0 (+${
          process.env.FRONTEND_URL || 'http://localhost:5173'
        })`,
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const results = await response.json();
    await sleep(DELAY_MS);

    if (results.length > 0) {
      return {
        latitude: Number(results[0].lat),
        longitude: Number(results[0].lon),
        matched: results[0].display_name,
      };
    }
  }

  return null;
}

async function main() {
  const force = process.argv.includes('--force');

  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, name, location, latitude, longitude')
    .order('name');

  if (error) {
    console.error('Could not read schools:', error.message);
    process.exit(1);
  }

  const pending = schools.filter((school) => {
    if (!school.location) return false;
    return force || school.latitude == null || school.longitude == null;
  });

  const noAddress = schools.filter((school) => !school.location).length;

  console.log(
    `${schools.length} schools, ${pending.length} to geocode` +
      (noAddress ? `, ${noAddress} with no address to work from` : '')
  );

  if (!pending.length) {
    console.log('Nothing to do.');
    return;
  }

  console.log(`About ${Math.ceil((pending.length * DELAY_MS) / 1000)}s at one request per second.\n`);

  const failed = [];
  let done = 0;

  for (const school of pending) {
    let found = null;
    try {
      found = await geocode(school.location);
    } catch (err) {
      console.error(`  ! ${school.name}: ${err.message}`);
      failed.push(school);
      continue;
    }

    if (!found) {
      console.log(`  ? ${school.name} — no match for "${school.location}"`);
      failed.push(school);
      continue;
    }

    const { error: updateError } = await supabase
      .from('schools')
      .update({ latitude: found.latitude, longitude: found.longitude })
      .eq('id', school.id);

    if (updateError) {
      console.error(`  ! ${school.name}: ${updateError.message}`);
      failed.push(school);
      continue;
    }

    done += 1;
    console.log(
      `  ✓ ${school.name} → ${found.latitude.toFixed(5)}, ${found.longitude.toFixed(5)}`
    );
  }

  console.log(`\nGeocoded ${done} of ${pending.length}.`);

  // Named rather than counted: a school with no coordinates shows no map, and
  // the only way to fix one is to know which it was.
  if (failed.length) {
    console.log('\nStill without coordinates:');
    for (const school of failed) {
      console.log(`  - ${school.name} (${school.location})`);
    }
    console.log(
      '\nUsually the address is too vague for Nominatim. Setting latitude/longitude\n' +
        'by hand in the Supabase table editor works — nothing here overwrites a row\n' +
        'that already has both.'
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
