/**
 * One-time (well, occasional) expansion: adds Prague schools that appear in
 * Cermat's admission-results files but don't exist in `schools` yet — the
 * list `scripts/import-admission-data.js` already logs to
 * `scripts/admission-import-unmatched.txt` every time it can't fuzzy-match a
 * name. This is what actually acts on that list.
 *
 *   node scripts/import-missing-schools.js file2024.xlsx file2025.xlsx ...
 *   node scripts/import-missing-schools.js --dry-run file2026.xlsx   # preview only
 *
 * WHERE THE DATA COMES FROM (three sources, each authoritative for its own
 * field — never guessed, never AI-generated):
 *   - REDIZO, name (fallback), programs (obory) -> the Cermat file itself,
 *     same as import-admission-data.js.
 *   - Official name + address -> isv.gov.cz's public school registry API
 *     (Ministerstvo školství's own "Rejstřík škol a školských zařízení"),
 *     found by inspecting the real network request its search UI makes:
 *       POST https://isv.gov.cz/rssz/api/v1/sub/vyhledej
 *       body: { redIzo: "<redizo>" }
 *       -> { list: [{ nazev, adresa, ico, redIzo, ... }] }
 *     No API key, no auth, no rate-limit documented — this script still
 *     waits between requests (DELAY_MS) to be a polite, identifiable caller
 *     of a government service that isn't ours.
 *   - contact / website -> NOT available from either source. Left null,
 *     same as any other missing field in this app (see the school detail
 *     page's "co zatím doplňujeme" placeholders) — never fabricated.
 *
 * AFTER running this script:
 *   1. node scripts/geocode-schools.js
 *      (fills latitude/longitude for the schools just added, from `location`)
 *   2. node scripts/import-admission-data.js <same files>
 *      (now that these schools exist with a stored redizo, that script's
 *      redizo-first matching picks them up automatically and writes
 *      school_programs + admission_cutoff/acceptance_rate for them — no
 *      new import logic needed here)
 *
 * Writes with the service_role key, same reason as every other script here:
 * RLS on `schools` blocks the anon key from writing at all.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the root .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const REGISTRY_API = 'https://isv.gov.cz/rssz/api/v1/sub/vyhledej';
// Polite pacing for a government service with no documented rate limit —
// same spirit as geocode-schools.js's Nominatim delay, just less strict
// since this one publishes no policy to violate.
const DELAY_MS = 400;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const files = args.filter((a) => a !== '--dry-run');

if (files.length === 0) {
  console.error('Usage: node scripts/import-missing-schools.js [--dry-run] file1.xlsx [file2.xlsx ...]');
  process.exit(1);
}

const COL = {
  redizo: 'REDIZO',
  name: 'NÁZEV ŠKOLY',
  obec: 'OBEC',
  oborNazev: 'OBOR - NÁZEV',
};

async function lookupRegistry(redizo) {
  try {
    const res = await fetch(REGISTRY_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redIzo: redizo }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const entry = body?.list?.[0];
    if (!entry) return null;
    return { name: entry.nazev || null, address: entry.adresa || null };
  } catch (err) {
    console.warn(`  [!] Registry lookup failed for ${redizo}: ${err.message}`);
    return null;
  }
}

async function main() {
  // 1. Read every file, keep only Prague rows, group by REDIZO.
  const byRedizo = new Map();
  for (const file of files) {
    const resolved = path.resolve(file);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      process.exit(1);
    }
    const wb = XLSX.readFile(resolved);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    for (const row of rows) {
      if ((row[COL.obec] || '').trim() !== 'Praha') continue;
      const redizo = String(row[COL.redizo] || '').trim();
      if (!redizo) continue;
      if (!byRedizo.has(redizo)) {
        byRedizo.set(redizo, { redizo, cermatName: row[COL.name], obory: new Set() });
      }
      const obor = row[COL.oborNazev];
      if (obor) byRedizo.get(redizo).obory.add(String(obor).trim());
    }
  }

  console.log(`Found ${byRedizo.size} unique Prague REDIZOs across ${files.length} file(s).`);

  // 2. Diff against what's already in the DB.
  const { data: existing, error: existingError } = await supabase
    .from('schools')
    .select('redizo');
  if (existingError) {
    console.error('Failed to read existing schools:', existingError.message);
    process.exit(1);
  }
  const existingRedizos = new Set(existing.map((r) => r.redizo).filter(Boolean));
  const missing = [...byRedizo.values()].filter((s) => !existingRedizos.has(s.redizo));

  console.log(`${existingRedizos.size} already in the database. ${missing.length} missing.\n`);

  if (missing.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  // 3. Look up each missing school in the official registry, then insert.
  let inserted = 0;
  let skippedNoAddress = 0;
  const failures = [];

  for (const [i, school] of missing.entries()) {
    process.stdout.write(`[${i + 1}/${missing.length}] ${school.redizo} — `);
    const registryResult = await lookupRegistry(school.redizo);
    await sleep(DELAY_MS);

    const name = registryResult?.name || school.cermatName;
    const location = registryResult?.address || null;
    const programs = [...school.obory].sort().join(', ') || null;

    if (!location) {
      console.log(`SKIPPED (no address found) — ${name}`);
      skippedNoAddress += 1;
      failures.push({ redizo: school.redizo, name, reason: 'no address from registry' });
      continue;
    }

    console.log(`${name} — ${location}`);

    if (dryRun) continue;

    const { error: insertError } = await supabase.from('schools').insert({
      name,
      location,
      programs,
      contact: null,
      website: null,
      redizo: school.redizo,
    });

    if (insertError) {
      console.warn(`  [!] Insert failed: ${insertError.message}`);
      failures.push({ redizo: school.redizo, name, reason: insertError.message });
      continue;
    }
    inserted += 1;
  }

  console.log(`\n${dryRun ? '[dry run] Would insert' : 'Inserted'} ${dryRun ? missing.length - failures.length : inserted} school(s).`);
  if (skippedNoAddress > 0) {
    console.log(`${skippedNoAddress} skipped — no address found in the registry (likely closed or a data mismatch).`);
  }
  if (failures.length > 0) {
    const logPath = path.join(__dirname, 'missing-schools-import-failures.txt');
    fs.writeFileSync(
      logPath,
      failures.map((f) => `${f.redizo}\t${f.name}\t${f.reason}`).join('\n') + '\n'
    );
    console.log(`${failures.length} failure(s) logged to ${logPath} for manual review.`);
  }

  if (!dryRun && inserted > 0) {
    console.log(
      '\nNext steps:\n' +
        '  1. node scripts/geocode-schools.js\n' +
        '  2. node scripts/import-admission-data.js ' + files.join(' ') + '\n'
    );
  }
}

main();
