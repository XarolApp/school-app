/**
 * Backfills schools.website + schools.contact for schools that have neither
 * (everything added after the original 60-school Atlas batch — see
 * scripts/import-missing-schools.js and scripts/import-admission-data.js,
 * which both intentionally insert with website/contact null rather than
 * fabricate them).
 *
 * Source: atlasskolstvi.cz's own school profile pages. Two steps:
 *   1. Scrape the 11 paginated Prague directory listing pages
 *      (stredni-skoly?region=hlm-praha&p=1..11) and regex-extract each
 *      school's {name, profileUrl} — the listing markdown is a stable,
 *      repeated pattern: "**<name>** <address>](<profile url>)".
 *   2. Scrape each of the ~214 individual profile pages
 *      (atlasskolstvi.cz/ss<id>-<slug>) and regex-extract email, phone,
 *      website, and REDIZO from that page's own stable markdown structure
 *      (a labelled bullet list: mailto: link, tel: link, a plain www link,
 *      "**Redizo:** <number>").
 *
 * Matched by REDIZO, not fuzzy name — Atlas profile pages publish it
 * directly, and every REDIZO in our own `schools` table was individually
 * verified against the official MŠMT registry in an earlier audit (see
 * UNFORGET.md / CLAUDE.md's REDIZO audit note), so an exact REDIZO match
 * here is unambiguous — no jaccard/threshold judgment call needed.
 *
 *   node scripts/backfill-school-websites.js --dry-run
 *   node scripts/backfill-school-websites.js [--limit N]
 *
 * Only fills schools.website / schools.contact where currently null — never
 * overwrites an existing value. ~225 Firecrawl scrape calls total (11 listing
 * pages + ~214 profile pages) — paced with the same rate-limit retry pattern
 * as scrape-schools.js, so this takes a while; run in the background.
 */

require('dotenv').config();
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

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const limitArg = args.indexOf('--limit');
const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Same rate-limit-aware retry as scrape-schools.js — free/low-tier Firecrawl
// accounts throttle to a handful of requests/min; a 429 here is transient.
async function scrapeWithRetry(url, opts, retries = 5) {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await firecrawl.scrape(url, opts);
    } catch (err) {
      const isRateLimit = /rate limit/i.test(err?.message || '');
      if (!isRateLimit || attempt === retries) throw err;
      const waitMs = 15_000 * (attempt + 1);
      console.log(`    (rate limited, waiting ${waitMs / 1000}s, retry ${attempt + 1}/${retries})`);
      await sleep(waitMs);
    }
  }
}

// ---- Step 1: collect {name, profileUrl} from the 11 directory pages -------

const LISTING_ENTRY_RE = /\*\*(.+?)\*\*[^\]]*\]\((https:\/\/www\.atlasskolstvi\.cz\/ss\d+-[^)]+)\)/g;

async function collectProfileLinks() {
  const found = new Map(); // profileUrl -> name
  for (let page = 1; page <= 11; page += 1) {
    const url = `https://www.atlasskolstvi.cz/stredni-skoly?region=hlm-praha&p=${page}`;
    console.log(`Listing page ${page}/11...`);
    const result = await scrapeWithRetry(url, { formats: ['markdown'] });
    const md = result?.markdown || '';
    let match;
    LISTING_ENTRY_RE.lastIndex = 0;
    while ((match = LISTING_ENTRY_RE.exec(md)) !== null) {
      const [, name, profileUrl] = match;
      if (!found.has(profileUrl)) found.set(profileUrl, name.trim());
    }
    await sleep(3_000);
  }
  return found;
}

// ---- Step 2: extract email/phone/website/redizo from a profile page -------

function extractProfileData(markdown) {
  const emailMatch = markdown.match(/\[([^\]]+@[^\]]+)\]\(mailto:/);
  const phoneMatch = markdown.match(/\[([\d\s]{9,})\]\(tel:/);
  // The website bullet: a markdown link whose visible text starts with
  // "www." (not a mailto/tel/image/map link).
  const websiteMatch = markdown.match(/\[(?:www\.)([^\]]+)\]\((https?:\/\/[^)]+)\)/);
  const redizoMatch = markdown.match(/\*\*Redizo:\*\*\s*(\d+)/);

  const contactParts = [];
  if (emailMatch) contactParts.push(emailMatch[1].trim());
  if (phoneMatch) contactParts.push(phoneMatch[1].trim());

  return {
    contact: contactParts.length ? contactParts.join(', ') : null,
    website: websiteMatch ? websiteMatch[2].trim() : null,
    redizo: redizoMatch ? redizoMatch[1].trim() : null,
  };
}

async function main() {
  console.log('Backfilling schools.website / schools.contact from atlasskolstvi.cz...\n');

  const { data: allSchools, error: fetchError } = await supabase
    .from('schools')
    .select('id, name, website, contact, redizo');

  if (fetchError) {
    console.error('Error fetching schools:', fetchError.message);
    process.exit(1);
  }

  const byRedizo = new Map();
  allSchools.forEach((s) => {
    if (s.redizo) byRedizo.set(String(s.redizo), s);
  });

  const missingBoth = allSchools.filter((s) => !s.website && !s.contact);
  console.log(`${missingBoth.length} schools currently missing both website and contact.\n`);

  console.log('Step 1: collecting school profile links from the 11 Prague directory pages...');
  const profileLinks = await collectProfileLinks();
  console.log(`Found ${profileLinks.size} unique school profile pages.\n`);

  let profileEntries = [...profileLinks.entries()];
  if (limit) profileEntries = profileEntries.slice(0, limit);

  console.log(`Step 2: scraping ${profileEntries.length} profile pages for contact/website/redizo...`);
  const updates = [];
  const noRedizoMatch = [];
  let scraped = 0;
  let failed = 0;

  for (const [i, [profileUrl, atlasName]] of profileEntries.entries()) {
    try {
      const result = await scrapeWithRetry(profileUrl, { formats: ['markdown'] });
      const { contact, website, redizo } = extractProfileData(result?.markdown || '');
      scraped += 1;

      if (!redizo) {
        noRedizoMatch.push(`${atlasName} (no redizo found on page)`);
      } else {
        const match = byRedizo.get(redizo);
        if (!match) {
          noRedizoMatch.push(`${atlasName} (redizo ${redizo} not in our database)`);
        } else if (!website && !contact) {
          // Nothing usable on this profile page.
        } else {
          updates.push({
            id: match.id,
            ourName: match.name,
            atlasName,
            redizo,
            website: match.website ? null : website, // only fill if currently null
            contact: match.contact ? null : contact,
          });
        }
      }
    } catch (err) {
      failed += 1;
      console.error(`  ! ${atlasName}: ${err.message}`);
    }

    if (i % 10 === 0) console.log(`  ${i + 1}/${profileEntries.length} scraped...`);
    if (i < profileEntries.length - 1) await sleep(3_000);
  }

  console.log(`\nScraped ${scraped} profile pages, ${failed} failed.`);
  console.log(`Redizo-matched updates ready: ${updates.filter((u) => u.website || u.contact).length}\n`);

  const usableUpdates = updates.filter((u) => u.website || u.contact);

  if (dryRun) {
    console.log('[DRY RUN] Would update:');
    usableUpdates.forEach((u) => {
      console.log(`  [${u.id}] ${u.ourName}  (redizo ${u.redizo}, Atlas: "${u.atlasName}")`);
      if (u.website) console.log(`      website: ${u.website}`);
      if (u.contact) console.log(`      contact: ${u.contact}`);
    });
    console.log(`\n${noRedizoMatch.length} profile pages didn't map to our database:`);
    noRedizoMatch.forEach((n) => console.log(`  - ${n}`));

    const matchedIds = new Set(usableUpdates.map((u) => u.id));
    const stillGap = missingBoth.filter((s) => !matchedIds.has(s.id));
    console.log(`\n${stillGap.length} of our gap schools remain unmatched (need manual lookup):`);
    stillGap.forEach((s) => console.log(`  [${s.id}] ${s.name}`));
    return;
  }

  console.log('Writing updates to Supabase (only filling currently-null fields)...');
  let ok = 0;
  let writeFailed = 0;
  for (const u of usableUpdates) {
    const patch = {};
    if (u.website) patch.website = u.website;
    if (u.contact) patch.contact = u.contact;
    if (Object.keys(patch).length === 0) continue;

    const { error } = await supabase.from('schools').update(patch).eq('id', u.id);
    if (error) {
      console.error(`  ! [${u.id}] ${u.ourName}: ${error.message}`);
      writeFailed += 1;
    } else {
      ok += 1;
    }
  }

  console.log(`\nDone. Updated ${ok} schools${writeFailed ? `, ${writeFailed} failed` : ''}.`);

  const matchedIds = new Set(usableUpdates.map((u) => u.id));
  const stillGap = missingBoth.filter((s) => !matchedIds.has(s.id));
  console.log(`\n${stillGap.length} schools still need manual lookup:`);
  stillGap.forEach((s) => console.log(`  [${s.id}] ${s.name}`));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
