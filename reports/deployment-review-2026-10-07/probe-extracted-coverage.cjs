// Read-only public-school field coverage. No model calls, data writes or user records.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('../../node_modules/dotenv');
const env = dotenv.parse(fs.readFileSync('.env'));
const fields = ['ma_jidelnu', 'ma_koleje', 'krouzky_kategorie', 'vyukovy_styl_tagy', 'vs_pokracuje_pct', 'pocet_krouzku'];

(async () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Required backend service configuration is missing.');
  const url = new URL('/rest/v1/schools', env.SUPABASE_URL);
  url.searchParams.set('select', `id,merged_into,school_extracted_details(${fields.join(',')})`);
  url.searchParams.set('order', 'id');
  const response = await fetch(url, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, Prefer: 'count=exact' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error('Coverage probe HTTP ' + response.status);
  const schools = await response.json();
  const totalText = response.headers.get('content-range')?.split('/')[1];
  if (!Array.isArray(schools) || !/^\d+$/.test(totalText || '') || Number(totalText) !== schools.length) {
    throw new Error('Incomplete catalogue response; pagination required.');
  }
  const details = school => {
    const value = school.school_extracted_details;
    if (Array.isArray(value) && value.length > 1) throw new Error('Expected at most one extracted row per school.');
    return Array.isArray(value) ? value[0] : value;
  };
  const summarize = rows => ({
    schools: rows.length,
    withExtractedRow: rows.filter(school => details(school) != null).length,
    fields: Object.fromEntries(fields.map(field => {
      const values = rows.map(school => details(school)?.[field]);
      const known = values.filter(value => value != null && (!Array.isArray(value) || value.length > 0));
      return [field, {
        known: known.length,
        coveragePercent: rows.length ? Math.round(1000 * known.length / rows.length) / 10 : null,
        trueValues: known.filter(value => value === true).length,
        falseValues: known.filter(value => value === false).length,
        zeroValues: known.filter(value => value === 0).length,
      }];
    })),
  });
  const report = {
    checkedAt: new Date().toISOString(),
    raw: summarize(schools),
    visible: summarize(schools.filter(school => school.merged_into == null)),
    limitation: 'Stored coverage is not verification of extracted facts. Null and empty arrays count as unknown; explicit false and zero count as known. Raw/visible school denominators differ from cached extraction inputs. No database writes or model calls.',
  };
  fs.writeFileSync(path.join(__dirname, 'extracted-coverage-2026-10-09.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
})().catch(error => { console.error(error.name, error.message); process.exitCode = 1; });
