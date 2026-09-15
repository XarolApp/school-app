/**
 * Phase 1 of the school-detail extraction pipeline (docs/firecrawl-extraction-task.md).
 *
 * Crawls each school's own website with Firecrawl and caches the raw markdown
 * to disk. This is the expensive, rate-limited step — it does NOT talk to
 * Claude or write anything to Supabase. Phase 2 (scripts/extract-school-details.js)
 * reads what this script writes and is re-runnable without ever coming back here.
 *
 *   node scripts/scrape-schools.js --dry-run [--limit N] [--school-id ID]
 *   node scripts/scrape-schools.js [--limit N] [--school-id ID] [--force]
 *
 * Idempotent: a school already present in the manifest is skipped unless
 * --force is passed. Never fails the whole run on one school's error — each
 * school is caught individually and logged.
 *
 * Each cached page is preceded by "## PAGE-URL: <url>" (not a bare "## <url>")
 * so Phase 2 can tell a page boundary apart from the site's own H2 headings —
 * real school sites routinely have markdown content like "## Mgr. Jan Novák"
 * that would otherwise be indistinguishable from our own separator.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { Firecrawl } = require('firecrawl');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const firecrawlKey = process.env.FIRECRAWL_API_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the root .env.');
  process.exit(1);
}
if (!firecrawlKey) {
  console.error('Missing FIRECRAWL_API_KEY in the root .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const firecrawl = new Firecrawl({ apiKey: firecrawlKey });

const OUT_DIR = path.join(__dirname, 'data', 'scraped-schools');
const MANIFEST_PATH = path.join(OUT_DIR, '_manifest.json');

// Sensible default for ~223 schools, not thousands — see docs/firecrawl-extraction-task.md
// "If anything is unclear". Confirmed with the user before running for real.
const PAGES_PER_SCHOOL = 20;

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveManifest(manifest) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

function schoolFilePath(schoolId) {
  return path.join(OUT_DIR, `${schoolId}.md`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Free/low-tier Firecrawl accounts rate-limit crawl requests per minute (seen
// in practice: ~3/min). A 429 here is transient, not a real per-school
// failure, so it gets retried with backoff instead of counting against the
// school — only a non-rate-limit error, or exhausting retries, is a failure.
async function crawlWithRetry(url, opts, retries = 5) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await firecrawl.crawl(url, opts);
    } catch (err) {
      const isRateLimit = /rate limit/i.test(err?.message || '');
      if (!isRateLimit || attempt === retries) throw err;
      const waitMs = 15_000 * (attempt + 1);
      console.log(`  (rate limited, waiting ${waitMs / 1000}s before retry ${attempt + 1}/${retries})`);
      await sleep(waitMs);
    }
  }
}

async function scrapeSchool(school) {
  const result = await crawlWithRetry(school.website, {
    limit: PAGES_PER_SCHOOL,
    scrapeOptions: { formats: ['markdown'] },
  });

  const pages = (result?.data || []).filter((p) => p?.markdown && p.markdown.trim());
  if (!pages.length) {
    throw new Error('Firecrawl returned no pages with content');
  }

  const pageUrl = (p) => p.metadata?.url || p.metadata?.sourceURL || school.website;

  const fileContent = pages
    .map((p) => `## PAGE-URL: ${pageUrl(p)}\n\n${p.markdown.trim()}`)
    .join('\n\n---\n\n');

  fs.writeFileSync(schoolFilePath(school.id), fileContent);

  return {
    scrapedAt: new Date().toISOString(),
    pageCount: pages.length,
    sourceUrls: pages.map(pageUrl),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');
  const limitArg = args.indexOf('--limit');
  const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : null;
  const schoolIdArg = args.indexOf('--school-id');
  const onlySchoolId = schoolIdArg !== -1 ? args[schoolIdArg + 1] : null;

  const { data: schools, error } = await supabase
    .from('schools')
    .select('id, name, website')
    .order('name');

  if (error) {
    console.error('Could not read schools:', error.message);
    process.exit(1);
  }

  let candidates = schools;
  if (onlySchoolId) {
    candidates = candidates.filter((s) => String(s.id) === String(onlySchoolId));
  }

  const withoutWebsite = candidates.filter((s) => !s.website || !s.website.trim());
  let eligible = candidates.filter((s) => s.website && s.website.trim());

  const manifest = loadManifest();
  let alreadyCached = 0;
  if (!force) {
    eligible = eligible.filter((s) => {
      if (manifest[s.id]) {
        alreadyCached += 1;
        return false;
      }
      return true;
    });
  }

  if (limit) eligible = eligible.slice(0, limit);

  console.log(`${eligible.length} schools to scrape (of ${candidates.length} candidates).`);
  console.log(`Skipping ${withoutWebsite.length} with no website, ${alreadyCached} already cached.`);
  if (dryRun) {
    eligible.forEach((s) => console.log(`  - [${s.id}] ${s.name} -> ${s.website}`));
    console.log('\n--dry-run: nothing scraped, nothing written.');
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  let scraped = 0;
  let failed = 0;
  const failures = [];

  for (const [i, school] of eligible.entries()) {
    try {
      console.log(`Scraping [${school.id}] ${school.name} (${school.website})...`);
      const entry = await scrapeSchool(school);
      manifest[school.id] = entry;
      saveManifest(manifest);
      scraped += 1;
      console.log(`  -> ${entry.pageCount} pages cached.`);
    } catch (err) {
      failed += 1;
      failures.push(`${school.name}: ${err.message}`);
      console.error(`  ! ${school.name}: ${err.message}`);
    }
    // Light pacing between schools so we don't lean on crawlWithRetry's
    // backoff for every single request on a low rate-limit account.
    if (i < eligible.length - 1) await sleep(5_000);
  }

  console.log(
    `\nScraped ${scraped}, skipped ${withoutWebsite.length} (no website), failed ${failed}, ${alreadyCached} already cached.`
  );
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
