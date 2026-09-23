/**
 * Imports real maturita pass rates from Cermat's public "společná část"
 * (common part) school-level results file into school_extracted_details.
 *
 *   node scripts/import-maturita-data.js MZ2026jap_SC_skolobory.xlsx [--dry-run]
 *
 * Source file shape (Cermat's own export, not ours):
 *   - Sheet named after the year (e.g. "2026"), two header rows: row 0 is
 *     merged section titles, row 1 (index 1) has the real column names.
 *   - One row per REDIZO where TŘÍDĚNÍ === 'redizo' — everything else
 *     (TŘÍDĚNÍ === 'total' / 'typ_skoly' / 'kraj' / ...) is an aggregate,
 *     not a school, and must be skipped.
 *   - Column "PODÍL ÚSPĚŠNÝCH (%)" under "SPOLEČNÁ ČÁST MZ CELKEM" is the
 *     official pass rate for the common part of maturita, across all
 *     subjects a student took — exactly school_extracted_details.maturita_pass_rate_pct.
 *
 * Matches by REDIZO only (schools already carry a stored redizo from
 * scripts/import-admission-data.js) — no fuzzy name matching here, this is
 * authoritative government data and a wrong REDIZO match would be worse
 * than skipping the school.
 *
 * This is real, sourced data — it overwrites both maturita_pass_rate_pct AND
 * the free-text maturita_uspesnost, even if Phase 2 (AI extraction from the
 * school's own website) already wrote something there. A government exam
 * result outranks a marketing-page sentence.
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

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const file = args.find((a) => !a.startsWith('--'));

if (!file) {
  console.error('Usage: node scripts/import-maturita-data.js <file.xlsx> [--dry-run]');
  process.exit(1);
}

const COL = {
  trideni: 2,
  rok: 3,
  redizo: 4,
  nazev: 5,
  prihlaseni: 13,
  konali: 14,
  uspeli: 15,
  podilUspesnych: 18,
};

function main() {
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(resolved);
  const sheetName = wb.SheetNames.find((n) => /^\d{4}$/.test(n)) || wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null });

  const schoolRows = rows.slice(2).filter((r) => r[COL.trideni] === 'redizo');
  console.log(`${schoolRows.length} school-level rows found in sheet "${sheetName}".`);

  const results = schoolRows
    .map((r) => ({
      redizo: String(r[COL.redizo] || '').trim(),
      name: r[COL.nazev],
      rok: r[COL.rok],
      konali: Number(r[COL.konali]) || 0,
      passRate: r[COL.podilUspesnych],
    }))
    .filter((r) => r.redizo && typeof r.passRate === 'number' && r.konali > 0);

  console.log(`${results.length} have a usable pass rate (konali > 0, numeric %).`);

  runImport(results);
}

async function runImport(results) {
  const { data: schools, error } = await supabase.from('schools').select('id, redizo, name').not('redizo', 'is', null);
  if (error) {
    console.error('Failed to read schools:', error.message);
    process.exit(1);
  }

  const byRedizo = new Map(schools.map((s) => [String(s.redizo).trim(), s]));

  let matched = 0;
  let unmatched = 0;
  const rowsToUpsert = [];

  for (const r of results) {
    const school = byRedizo.get(r.redizo);
    if (!school) {
      unmatched += 1;
      continue;
    }
    matched += 1;
    const pct = Math.round(r.passRate * 10) / 10;
    rowsToUpsert.push({
      school_id: school.id,
      maturita_pass_rate_pct: pct,
      maturita_uspesnost: `${pct} % maturantů uspělo u společné části maturity (jaro ${r.rok}, ${r.konali} konalo zkoušku) — zdroj: Cermat.`,
    });
  }

  console.log(`Matched ${matched} of our schools by REDIZO. ${unmatched} Cermat rows had no matching school (expected — most are outside Prague).`);

  if (dryRun) {
    console.log('\n--dry-run: nothing written. Sample of what would be upserted:');
    rowsToUpsert.slice(0, 5).forEach((r) => console.log(`  school_id=${r.school_id}: ${r.maturita_pass_rate_pct}%`));
    return;
  }

  if (rowsToUpsert.length === 0) {
    console.log('Nothing to upsert.');
    return;
  }

  // school_extracted_details has NOT NULL-free other columns per row already
  // written by Phase 2 extraction, so this must be a partial upsert, not an
  // insert that would clobber skolne_poplatky/obedy_ubytovani/etc. with nulls.
  const { error: upsertError } = await supabase
    .from('school_extracted_details')
    .upsert(rowsToUpsert, { onConflict: 'school_id' });

  if (upsertError) {
    console.error('Upsert failed:', upsertError.message);
    process.exit(1);
  }

  console.log(`Upserted maturita pass rate for ${rowsToUpsert.length} schools.`);
}

main();
