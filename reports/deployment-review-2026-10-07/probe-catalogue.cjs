// Read-only public school-data quality probe. No identities, credentials or
// row bodies are written to the report. Does not start the backend/workers.
const fs = require('node:fs');
const dotenv = require('../../node_modules/dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const outputPath = process.argv[2] || 'reports/deployment-review-2026-10-07/catalogue-quality.json';

(async () => {
  const { groupProgramsByObor, summarizeAdmission, CURRENT_ADMISSION_YEAR } = await import('../../frontend/src/lib/schoolPrograms.js');
  const url = new URL('/rest/v1/schools', env.SUPABASE_URL);
  url.searchParams.set('select', 'id,latitude,longitude,school_programs(*)');
  url.searchParams.set('merged_into', 'is.null');
  url.searchParams.set('order', 'id');
  const response = await fetch(url, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`School probe HTTP ${response.status}`);
  const schools = await response.json();
  if (!Array.isArray(schools)) throw new Error('Unexpected school response');
  const programmes = schools.flatMap(school => groupProgramsByObor(school).filter(entry => !entry.isDiscontinued));
  const cutoffYears = entry => Object.values(entry.years).filter(year => year.cutoff != null).length;
  const years = [...new Set(schools.flatMap(school => school.school_programs.map(row => row.rok)))].sort();
  const report = {
    checkedAt: new Date().toISOString(),
    configuredAdmissionYear: CURRENT_ADMISSION_YEAR,
    visibleSchools: schools.length,
    schoolsMissingCoordinates: schools.filter(school => school.latitude == null || school.longitude == null).length,
    schoolsWithoutAdmissionSummary: schools.filter(school => !summarizeAdmission(school)).length,
    schoolsWithOlderAdmissionSummary: schools.filter(school => summarizeAdmission(school)?.isOld).length,
    programmeYears: years,
    activeProgrammeCards: programmes.length,
    cardsWithNoCutoffYear: programmes.filter(entry => cutoffYears(entry) === 0).length,
    cardsWithOneCutoffYear: programmes.filter(entry => cutoffYears(entry) === 1).length,
    cardsWithTwoCutoffYears: programmes.filter(entry => cutoffYears(entry) === 2).length,
    cardsWithAtLeastThreeCutoffYears: programmes.filter(entry => cutoffYears(entry) >= 3).length,
    limitation: 'Catalogue data only; this does not establish completeness against the official register, source accuracy or school-site freshness.',
  };
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
