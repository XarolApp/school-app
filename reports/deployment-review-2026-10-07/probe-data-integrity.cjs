// Read-only catalogue checks. Emits counts/public school IDs, never credentials/user records.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const dotenv = require('../../node_modules/dotenv');
const { districtForPoint } = require('../../lib/pragueDistricts');
const env = dotenv.parse(fs.readFileSync('.env'));

const extractorPath = path.resolve(__dirname, '../../scripts/extract-school-details.js');
const source = fs.readFileSync(extractorPath, 'utf8');
const entry = source.lastIndexOf('\nmain().catch');
if (entry < 0) throw new Error('Extractor entry boundary changed; review before loading.');
const moduleStub = { exports: {} };
const extractorRequire = createRequire(extractorPath);
vm.runInNewContext(source.slice(0, entry) + '\nmodule.exports = { deriveDining };', {
  module: moduleStub, __dirname: path.dirname(extractorPath),
  process: { argv: [], env: { SUPABASE_URL: 'synthetic', SUPABASE_SERVICE_ROLE_KEY: 'synthetic', OPENROUTER_API_KEY: 'synthetic' } },
  require(name) {
    if (name === 'dotenv') return { config() {} };
    if (name === '@supabase/supabase-js') return { createClient: () => ({}) };
    return extractorRequire(name);
  },
});

(async () => {
  const url = new URL('/rest/v1/schools', env.SUPABASE_URL);
  url.searchParams.set('select', 'id,redizo,merged_into,latitude,longitude,school_programs(id),school_extracted_details(ma_jidelnu,obedy_ubytovani)');
  url.searchParams.set('order', 'id');
  const response = await fetch(url, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, Prefer: 'count=exact' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('Catalogue probe HTTP ' + response.status);
  const schools = await response.json();
  const count = Number(response.headers.get('content-range')?.split('/')[1]);
  if (!Array.isArray(schools) || count !== schools.length) throw new Error('Incomplete catalogue response; pagination required.');
  const visible = schools.filter(school => school.merged_into == null);
  const duplicates = rows => {
    const groups = new Map();
    for (const school of rows) {
      const key = String(school.redizo || '').trim();
      if (key) groups.set(key, (groups.get(key) || 0) + 1);
    }
    return [...groups.values()].filter(n => n > 1).length;
  };
  const mealCandidates = visible.filter(school => {
    const value = school.school_extracted_details;
    const row = Array.isArray(value) ? value[0] : value;
    if (row?.ma_jidelnu !== true) return false;
    return moduleStub.exports.deriveDining(row.obedy_ubytovani).reason === 'canteen denial does not establish whether school-arranged lunches exist elsewhere';
  });
  const report = {
    checkedAt: new Date().toISOString(),
    rawSchools: schools.length, visibleSchools: visible.length,
    duplicateRedizoGroupsRaw: duplicates(schools), duplicateRedizoGroupsVisible: duplicates(visible),
    mergedRowsWithProgrammes: schools.filter(school => school.merged_into != null && school.school_programs.length).length,
    visibleCoordinatesInvalid: visible.filter(school => !Number.isFinite(school.latitude) || !Number.isFinite(school.longitude) || Math.abs(school.latitude) > 90 || Math.abs(school.longitude) > 180).length,
    visibleCoordinatesOutsideDistrictGeometry: visible.filter(school => !districtForPoint(school.latitude, school.longitude)).length,
    storedMealPositivesWithOnlyCanteenDenialCandidate: mealCandidates.length,
    mealCandidateSchoolIds: mealCandidates.map(school => school.id),
    limitation: 'Duplicate identifiers may be legitimate institution/merged records and need explicit ownership rules. Coordinate presence/geometry does not prove building accuracy. Meal candidates need source review, not automatic nulling. No database writes or model calls.',
  };
  fs.writeFileSync(path.join(__dirname, 'data-integrity-2026-10-08.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
