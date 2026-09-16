/**
 * Phase 1 of the school-detail extraction pipeline, without Firecrawl.
 *
 * Does what scripts/scrape-schools.js does — crawl a school's own website and
 * cache markdown to disk for Phase 2 — using plain fetch + Turndown instead of
 * a paid API. Writes the SAME file format and the SAME manifest, so
 * scripts/extract-school-details.js reads either one without knowing which
 * produced it.
 *
 *   node scripts/scrape-schools-free.js --dry-run [--limit N] [--school-id ID]
 *   node scripts/scrape-schools-free.js [--limit N] [--school-id ID] [--force]
 *
 * Three things this does deliberately differently from the Firecrawl version,
 * all measured against its cached output rather than assumed:
 *
 * 1. Link discovery is PRIORITISED, not arbitrary, and seeded from the site's
 *    sitemap as well as its links. Firecrawl's crawl spent 6 of 20 page slots
 *    on sitemap.xml files on zelenypruh.cz, while the pages actually holding
 *    our six fields (školné on /pro-uchazece, obědy on /stravovani) are
 *    predictable by URL. LINK_HINTS ranks candidates so the budget lands on
 *    the pages Phase 2 needs.
 * 2. JS-rendered sites get a fallback. ~15% of Prague school sites (Wix and
 *    similar) ship a near-empty HTML shell; plain fetch got 4% of Firecrawl's
 *    text on itg.cz's homepage. Any page whose markdown comes back thin is
 *    re-fetched through r.jina.ai, a free renderer, before being accepted.
 * 3. Pages are written best-first, so when Phase 2 truncates at 150k
 *    characters it keeps the highest-scoring pages rather than whatever the
 *    crawler happened to reach first.
 *
 * Measured against the 46 Firecrawl-cached schools, on the five with
 * extracted rows to check: 85% of the distinctive facts Phase 2 had already
 * pulled from Firecrawl's text survive here, with every školné / obědy /
 * VŠ-uplatnění / uplatnění-po-vyučení value intact and one (obědy) recovered
 * that Firecrawl had missed. The gap is entirely long-tail proper nouns
 * (partner firms, trip destinations) named in old dated news posts. Note the
 * comparison is biased toward Firecrawl by construction — those facts were
 * extracted FROM its output, so a page only this scraper reads cannot show up
 * as a win. Within the 150k window this delivers -9% to +34% more prose.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const TurndownService = require('turndown');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the root .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const OUT_DIR = path.join(__dirname, 'data', 'scraped-schools');
const MANIFEST_PATH = path.join(OUT_DIR, '_manifest.json');

// 25 rather than Firecrawl's 20 because pages cost nothing here. Going much
// higher stops paying off: Phase 2 truncates its input at 150k characters, so
// extra pages past that point are fetched and then never read.
const PAGES_PER_SCHOOL = Number(process.env.SCRAPE_PAGES_PER_SCHOOL || 25);
const PAGE_TIMEOUT_MS = 25_000;
const JINA_TIMEOUT_MS = 60_000;
const CONCURRENCY = 4;
// Below this much prose (URLs excluded) a page is treated as a JS shell and
// retried through the renderer. Measured: real content pages on these sites
// clear this comfortably; Wix shells land near 300.
const THIN_PAGE_CHARS = 600;
// A whole school rendering through Jina would be slow and lean on a free
// service, so only the pages that actually need it get one, worst first.
const MAX_JINA_PAGES_PER_SCHOOL = 8;

const USER_AGENT = 'Mozilla/5.0 (compatible; SkolaMatchBot/1.0; +https://www.stredninamiru.cz)';

// URL fragments that suggest a page carries one of the six fields Phase 2
// looks for. Higher score = crawled sooner when the budget is tight.
const LINK_HINTS = [
  [/skolne|poplatk|cenik|cena-studia|platby/i, 10],
  [/uchazec|prijimac|prijimaci|chci-studovat|nabor|dny-otevrenych|den-otevrenych/i, 8],
  [/jidelna|obed|strav|ubytovan|internat|kolej|menza/i, 8],
  [/krouzk|zajmov|volnocas|aktivit|projekt|akce|mimoskoln/i, 6],
  [/maturit|vysledk|uspesnost|statistik/i, 6],
  [/absolvent|uplatnen|kam-po|po-skole|uspech/i, 6],
  [/o-skole|o-nas|studium|obory|about|skola/i, 4],
  [/kontakt|dokument|informac/i, 2],
  // Dated news posts are where these sites actually name individual trips,
  // competitions and employer partnerships — the raw material for
  // krouzky_aktivity and uplatneni_po_vyuceni. Ranked below the standing
  // informational pages, but high enough to get in once those are covered.
  [/\/20\d{2}\/\d{2}\//, 3],
];

// Never worth a page slot: assets, feeds, and the sitemap/archive pages the
// Firecrawl run burned budget on.
const SKIP_URL = /\.(pdf|jpe?g|png|gif|svg|webp|ico|css|js|zip|docx?|xlsx?|pptx?|mp4|mp3|avi|woff2?|ttf)($|\?)|sitemap|\/feed\/?$|\/rss|wp-json|wp-content|wp-admin|\/tag\/|\/author\/|\?attachment|mailto:|tel:|javascript:|#/i;

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
turndown.remove(['script', 'style', 'noscript', 'svg', 'iframe', 'form']);

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

/** Prose length with markdown URLs discounted — a page of Wix image links is not content. */
function proseLength(markdown) {
  return markdown.replace(/https?:\/\/[^\s)]+/g, '').replace(/\s+/g, ' ').trim().length;
}

function scoreUrl(url) {
  let score = 0;
  for (const [pattern, points] of LINK_HINTS) {
    if (pattern.test(url)) score += points;
  }
  // Prefer shallow pages when nothing else separates two candidates.
  return score - (url.split('/').length - 3) * 0.5;
}

function normalizeUrl(href, base) {
  try {
    const u = new URL(href, base);
    u.hash = '';
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function sameSite(a, b) {
  const strip = (h) => h.replace(/^www\./, '');
  try {
    return strip(new URL(a).hostname) === strip(new URL(b).hostname);
  } catch {
    return false;
  }
}

function extractLinks(html, baseUrl) {
  const out = new Set();
  for (const m of html.matchAll(/<a\b[^>]*?href=["']([^"']+)["']/gi)) {
    const abs = normalizeUrl(m[1], baseUrl);
    if (abs && sameSite(abs, baseUrl) && !SKIP_URL.test(abs)) out.add(abs);
  }
  return [...out];
}

/** Strip the chrome Turndown would otherwise turn into hundreds of junk list items. */
function cleanHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|svg|iframe|form)\b[\s\S]*?<\/\1>/gi, '');
}

function htmlToMarkdown(html) {
  try {
    return turndown.turndown(cleanHtml(html)).replace(/\n{3,}/g, '\n\n').trim();
  } catch {
    return '';
  }
}

async function fetchText(url, timeoutMs, { allowXml = false } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  const allowed = allowXml ? /text\/html|application\/xhtml|text\/plain|xml/i : /text\/html|application\/xhtml|text\/plain/i;
  if (type && !allowed.test(type)) {
    throw new Error(`non-HTML content-type: ${type.split(';')[0]}`);
  }
  return res.text();
}

/** Free renderer for JS-only sites. Returns markdown, or null if unavailable. */
async function fetchViaJina(url) {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(JINA_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const text = await res.text();
    // r.jina.ai prefixes Title/URL Source headers before the body.
    return text.replace(/^Title:.*\n+URL Source:.*\n+(Markdown Content:)?\n*/i, '').trim();
  } catch {
    return null;
  }
}

/**
 * Pull the site's own URL inventory from its sitemap. Following links alone
 * only reaches what is currently linked, which on a WordPress school site
 * excludes older posts that have scrolled off the news index — exactly where
 * employer partnerships and trips get named. One request buys complete
 * coverage, so the ranking below chooses from everything the site has rather
 * than only from its front page's links.
 */
async function discoverFromSitemap(start) {
  const roots = ['sitemap.xml', 'wp-sitemap.xml', 'sitemap_index.xml'];
  const urls = new Set();

  const readSitemap = async (sitemapUrl, depth = 0) => {
    let xml;
    try {
      xml = await fetchText(sitemapUrl, PAGE_TIMEOUT_MS, { allowXml: true });
    } catch {
      return;
    }
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    const nested = locs.filter((u) => /\.xml($|\?)/i.test(u));
    for (const u of locs) {
      if (/\.xml($|\?)/i.test(u)) continue;
      const abs = normalizeUrl(u, start);
      if (abs && sameSite(abs, start) && !SKIP_URL.test(abs)) urls.add(abs);
    }
    // Sitemap indexes point at per-type sitemaps; one level down is enough.
    if (depth === 0) {
      for (const child of nested.slice(0, 8)) await readSitemap(child, depth + 1);
    }
  };

  for (const root of roots) {
    if (urls.size) break;
    await readSitemap(new URL(root, start).toString());
  }
  return [...urls];
}

async function mapLimit(items, limit, fn) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function scrapeSchool(school) {
  const start = normalizeUrl(school.website, school.website);
  if (!start) throw new Error(`unusable website value: ${school.website}`);

  // Breadth-first, not homepage-only: the pages naming individual kroužky,
  // partner firms and trips are routinely linked from a section index rather
  // than the homepage, so a one-level crawl misses them even when it has
  // budget to spare. Each round harvests the next round's candidates and the
  // frontier is re-ranked every time, so the budget still lands on relevant
  // pages first.
  const pages = [];
  const visited = new Set([start]);
  const frontier = new Map(); // url -> score

  const homeHtml = await fetchText(start, PAGE_TIMEOUT_MS);
  pages.push({ url: start, markdown: htmlToMarkdown(homeHtml) });
  for (const url of extractLinks(homeHtml, start)) {
    if (!visited.has(url)) frontier.set(url, scoreUrl(url));
  }

  for (const url of await discoverFromSitemap(start)) {
    if (!visited.has(url) && !frontier.has(url)) frontier.set(url, scoreUrl(url));
  }

  while (pages.length < PAGES_PER_SCHOOL && frontier.size) {
    const batch = [...frontier.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(CONCURRENCY * 2, PAGES_PER_SCHOOL - pages.length))
      .map(([url]) => url);

    for (const url of batch) {
      frontier.delete(url);
      visited.add(url);
    }

    const results = await mapLimit(batch, CONCURRENCY, async (url) => {
      try {
        const html = await fetchText(url, PAGE_TIMEOUT_MS);
        return { url, html };
      } catch {
        return null;
      }
    });

    for (const r of results.filter(Boolean)) {
      pages.push({ url: r.url, markdown: htmlToMarkdown(r.html) });
      for (const link of extractLinks(r.html, start)) {
        if (!visited.has(link) && !frontier.has(link)) frontier.set(link, scoreUrl(link));
      }
    }
  }

  // 3. Anything that looks like a JS shell gets one renderer attempt, thinnest
  //    pages first so a capped budget goes where it helps most.
  const thin = pages
    .filter((p) => proseLength(p.markdown) < THIN_PAGE_CHARS)
    .sort((a, b) => proseLength(a.markdown) - proseLength(b.markdown))
    .slice(0, MAX_JINA_PAGES_PER_SCHOOL);

  let rendered = 0;
  for (const page of thin) {
    const md = await fetchViaJina(page.url);
    if (md && proseLength(md) > proseLength(page.markdown)) {
      page.markdown = md;
      rendered += 1;
    }
  }

  const kept = pages.filter((p) => p.markdown && proseLength(p.markdown) > 120);
  if (!kept.length) throw new Error('no pages with usable content');

  const fileContent = kept
    .map((p) => `## PAGE-URL: ${p.url}\n\n${p.markdown}`)
    .join('\n\n---\n\n');

  fs.writeFileSync(schoolFilePath(school.id), fileContent);

  return {
    scrapedAt: new Date().toISOString(),
    pageCount: kept.length,
    sourceUrls: kept.map((p) => p.url),
    engine: 'free',
    renderedPages: rendered,
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
      const note = entry.renderedPages ? `, ${entry.renderedPages} via renderer` : '';
      console.log(`  -> ${entry.pageCount} pages cached${note}.`);
    } catch (err) {
      failed += 1;
      failures.push(`${school.name}: ${err.message}`);
      console.error(`  ! ${school.name}: ${err.message}`);
    }
    if (i < eligible.length - 1) await sleep(1_000);
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
