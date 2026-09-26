/**
 * Remove obvious noise from cached school pages before optional AI extraction.
 * The scrape cache is read-only; this script never calls a model or an API.
 *
 * node scripts/filter-scraped-schools.js [--school ID-or-filename] [--dry-run] [--verbose]
 */

const fs = require('node:fs');
const path = require('node:path');
const config = require('./filter-config.json');

const sourceDir = path.join(__dirname, 'data', 'scraped-schools');
const outputDir = path.join(__dirname, 'data', 'filtered-schools');
const pageSeparator = '\n\n---\n\n';
const exactWords = new Set(['vs', 'svp', 'kc', 'dod']);
const timePattern = /\b(?:[6-9]|1[0-2])[:.][0-5]\d\b/;
// A paragraph carrying an amount, a percentage or a time is what the extractor
// actually needs; trimming must drop these last, never by keyword count alone.
const factPattern = /\d[\s,.\-]*(?:Kč|CZK|%|korun)|\b(?:[6-9]|1[0-2])[:.][0-5]\d\b/i;
// A page stating a price is kept even when no keyword hits (e.g. "příspěvek na studium").
const moneyPattern = /\d[\s,.\-]*(?:Kč|CZK|korun)/i;
const imagePattern = /!\[[^\]]*\]\([^)]*\)/g;

function normalize(value) {
  return value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

function hasTerm(normalized, term) {
  const word = normalize(term);
  if (exactWords.has(word)) return new RegExp(`(?:^|[^a-z0-9])${word}(?:$|[^a-z0-9])`).test(normalized);
  return normalized.includes(word);
}

function groupHits(value) {
  const text = normalize(value);
  const hits = {};
  for (const [group, terms] of Object.entries(config.groups)) {
    const count = terms.filter((term) => hasTerm(text, term)).length;
    if (count) hits[group] = count;
  }
  if (timePattern.test(text)) hits.start_time = (hits.start_time || 0) + 1;
  return hits;
}

function parsePages(text) {
  const chunks = text.replace(/\r\n/g, '\n').trimStart().split(/\n\n---\n\n(?=## PAGE-URL: )/);
  const pages = chunks.map((chunk) => {
    const match = chunk.match(/^## PAGE-URL: ([^\n]+)\n\n([\s\S]*)$/);
    if (!match || !/^https?:\/\//.test(match[1])) return null;
    const page = { url: match[1], body: match[2].trim() };
    return { ...page, title: titleOf(page) };
  });
  return pages.length && pages.every(Boolean) ? pages : null;
}

function titleOf(page) {
  const heading = page.body.match(/^#{1,6}\s+(.+)$/m);
  if (heading) return heading[1];
  const firstLine = page.body.split('\n').find((line) => line.trim() && !/^\s*[-*+]?\s*!?\[/.test(line));
  if (firstLine && firstLine.length < 120) return firstLine;
  try {
    const url = new URL(page.url);
    return decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() || url.hostname).replace(/[-_]/g, ' ');
  } catch {
    return page.url;
  }
}

function isLinkOnly(line) {
  return /^\s*(?:[-*+]\s*)?!?\[[^\]]*\]\([^)]+\)\s*$/.test(line);
}

function isNoise(line) {
  const text = normalize(line);
  if (!text) return false;
  if (isLinkOnly(line)) return true;
  if (/^(preskocit|prejit) (na |k )?(obsah|hlavni obsah)/.test(text)) return true;
  if (/^(sdilet|sledujte nas|socialni site|cookies?|gdpr)(\b|:)/.test(text)) return true;
  if (/(souhlas|nastaveni|prijmout|odmitnout).{0,25}cookies?/.test(text)) return true;
  if (/^(uvod|home|domu)\s*[>›»/]/.test(text)) return true;
  if (/^(facebook|instagram|youtube|tiktok|twitter|linkedin)(\s*[|·,]\s*(facebook|instagram|youtube|tiktok|twitter|linkedin))*$/.test(text)) return true;
  return false;
}

function protectedLine(line) {
  const text = normalize(line);
  return /\b\d[\d\s,.\-]*\s*(?:kc|czk|korun|%)\b/.test(text)
    || /\d\s*%/.test(text)
    || timePattern.test(text)
    || Object.keys(groupHits(text)).length > 0;
}

function cleanBoilerplate(pages) {
  const pageCountByLine = new Map();
  for (const page of pages) {
    const unique = new Set(page.body.split('\n').map(normalize).filter((line) => line.length >= 3));
    for (const line of unique) pageCountByLine.set(line, (pageCountByLine.get(line) || 0) + 1);
  }
  const keptProtected = new Set();
  return pages.map((page) => {
    const lines = [];
    for (const line of page.body.split('\n')) {
      const normalized = normalize(line);
      if (isNoise(line)) continue;
      const count = pageCountByLine.get(normalized) || 0;
      const repeated = count >= config.repeatedLineMinPages && count / pages.length >= config.repeatedLineFraction;
      if (repeated) {
        if (!protectedLine(line)) continue;
        if (keptProtected.has(normalized)) continue;
        keptProtected.add(normalized);
      }
      const text = line.replace(imagePattern, '');
      if (line.trim() && !text.trim()) continue;
      if (!text.trim() && !lines.at(-1)?.trim()) continue;
      lines.push(text);
    }
    return { ...page, body: lines.join('\n').trim() };
  });
}

function pageScore(page) {
  let pathname = page.url;
  try { pathname = decodeURIComponent(new URL(page.url).pathname).replace(/[-_]/g, ' '); } catch { /* use original URL */ }
  const location = `${pathname} ${page.title}`;
  const locationHits = groupHits(location);
  const bodyHits = groupHits(page.body);
  let score = Object.keys(locationHits).length * config.urlTitleScore;
  score += Object.values(bodyHits).reduce((sum, n) => sum + Math.min(n, config.maxBodyHitsPerGroup), 0);
  const important = config.importantPages.some((term) => hasTerm(normalize(location), term));
  const negative = config.negativePages.some((term) => hasTerm(normalize(location), term));
  return { score, bodyHits, locationHits, important, negative };
}

function compactParagraphs(body) {
  const blocks = body.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const keep = new Set();
  let heading = -1;
  for (let i = 0; i < blocks.length; i += 1) {
    if (/^#{1,6}\s/m.test(blocks[i])) heading = i;
    if (!Object.keys(groupHits(blocks[i])).length && !factPattern.test(blocks[i])) continue;
    keep.add(i);
    if (i > 0) keep.add(i - 1);
    if (i + 1 < blocks.length) keep.add(i + 1);
    if (heading >= 0) keep.add(heading);
  }
  if (!keep.size) {
    keep.add(0);
    if (blocks.length > 1) keep.add(1);
  }
  return blocks.filter((_, i) => keep.has(i)).join('\n\n');
}

function render(pages) {
  return pages.filter((page) => page.keep).map((page) => `## PAGE-URL: ${page.url}\n\n${page.output}`).join(pageSeparator);
}

function fitBudget(pages, budget) {
  let text = render(pages);
  if (text.length <= budget) return text;

  // Compact lower-scoring full pages first, then remove low-value context.
  for (const page of pages.filter((page) => page.keep && page.output !== page.compact).sort((a, b) => a.score - b.score)) {
    page.output = page.compact;
    text = render(pages);
    if (text.length <= budget) return text;
  }
  // Retain at least one paragraph per page while there is room for it.
  const blocks = pages.filter((page) => page.keep).flatMap((page) =>
    page.output.split(/\n\s*\n/).map((value, index) => ({ page, value, index, rank: (factPattern.test(value) ? 100 : 0) + Object.keys(groupHits(value)).length * 10 + page.score }))
  );
  for (const block of blocks.sort((a, b) => a.rank - b.rank)) {
    const parts = block.page.output.split(/\n\s*\n/);
    if (parts.length <= 1 || !parts.includes(block.value)) continue;
    parts.splice(parts.indexOf(block.value), 1);
    block.page.output = parts.join('\n\n');
    text = render(pages);
    if (text.length <= budget) return text;
  }
  const pageRank = (page) => (factPattern.test(page.output) ? 1000 : 0) + page.score;
  for (const page of pages.filter((page) => page.keep && !page.home && !page.important).sort((a, b) => pageRank(a) - pageRank(b))) {
    page.keep = false;
    text = render(pages);
    if (text.length <= budget) return text;
  }
  // A single scraped paragraph can be enormous. This last resort only runs
  // for the extractor's hard limit and is reported by the caller.
  if (budget === config.hardMaxChars && text.length > budget) {
    while (text.length > budget) {
      const page = pages.filter((item) => item.keep && item.output.length > 1).sort((a, b) => b.output.length - a.output.length)[0];
      if (!page) break;
      const excess = text.length - budget;
      page.output = page.output.slice(0, Math.max(1, page.output.length - excess - 1)).trimEnd();
      text = render(pages);
    }
  }
  return text;
}

function bodyGroups(text) {
  const pages = parsePages(text);
  return new Set(pages ? pages.flatMap((page) => Object.keys(groupHits(page.body))) : []);
}

function rescueMissingGroups(pages, originals, groups) {
  const rescued = [];
  for (const group of groups) {
    if (bodyGroups(render(pages)).has(group)) continue;
    const candidates = originals.flatMap((page, index) => page.body.split(/\n\s*\n/).map((block) => {
      const plain = block.replace(/!?\[[^\]]*\]\([^)]*\)/g, '').replace(/[#*+-]/g, '').trim();
      if (block.length > 3000 || plain.length < 30 || !groupHits(block)[group]) return null;
      const value = factPattern.test(block) ? 100 : 0;
      return { index, block: block.trim(), rank: value + Math.min(plain.length, 200) / 10 + pages[index].score / 10 };
    }).filter(Boolean));
    const best = candidates.sort((a, b) => b.rank - a.rank)[0];
    if (!best) continue;
    const page = pages[best.index];
    page.output = page.keep ? `${page.output}\n\n${best.block}` : best.block;
    page.keep = true;
    (page.rescueBlocks ||= []).push(best.block);
    rescued.push(group);
  }
  return rescued;
}

function filterSchool(original) {
  const parsed = parsePages(original);
  if (!parsed) return { text: original, totalPages: 0, keptPages: 0, flags: ['unparsed'], originalGroups: Object.keys(groupHits(original)) };

  const originalGroups = new Set(parsed.flatMap((page) => Object.keys(groupHits(page.body))));
  const cleaned = cleanBoilerplate(parsed);
  const pages = cleaned.map((page, index) => {
    const facts = pageScore(page);
    const home = index === 0;
    const keep = home || facts.important || moneyPattern.test(page.body) || (facts.score >= config.lowScore && !(facts.negative && !Object.keys(facts.locationHits).length && facts.score < config.highScore));
    const compact = compactParagraphs(page.body);
    const output = home || page.body.length > config.longPageChars || facts.score < config.highScore ? compact : page.body;
    return { ...page, ...facts, home, keep, compact, output };
  });

  let text = fitBudget(pages, config.targetChars);
  const rescuedGroups = rescueMissingGroups(pages, parsed, originalGroups);
  text = render(pages);
  if (text.length > config.targetChars) {
    const before = pages.map((page) => ({ keep: page.keep, output: page.output }));
    const groupsBefore = bodyGroups(text);
    const fitted = fitBudget(pages, config.targetChars);
    const groupsAfter = bodyGroups(fitted);
    const rescueIntact = pages.every((page) => !page.rescueBlocks || (page.keep && page.rescueBlocks.every((block) => page.output.includes(block))));
    if (rescueIntact && [...groupsBefore].every((group) => groupsAfter.has(group))) text = fitted;
    else {
      pages.forEach((page, index) => Object.assign(page, before[index]));
    }
  }
  const flags = [];
  const reduction = original.length ? 1 - text.length / original.length : 0;
  const anyMatch = pages.some((page) => Object.keys(page.bodyHits).length || Object.keys(page.locationHits).length);
  if (text.length < config.fallbackMinChars || reduction > config.fallbackMaxReduction || !anyMatch) {
    flags.push('fallback');
    if (!anyMatch) flags.push('no_keyword_match');
    for (let i = 0; i < pages.length; i += 1) {
      pages[i].keep = true;
      pages[i].output = pages[i].body || parsed[i].body;
    }
    text = render(pages);
    if (text.length < config.fallbackMinChars && original.length >= config.fallbackMinChars) {
      flags.push('fallback_original');
      text = original;
    }
  }
  if (text.length > config.hardMaxChars) {
    flags.push('hard_cap');
    if (flags.includes('fallback_original')) {
      for (let i = 0; i < pages.length; i += 1) pages[i].output = parsed[i].body;
    }
    text = fitBudget(pages, config.hardMaxChars);
  }
  if (text.length > config.targetChars) flags.push('over_target');
  return { text, totalPages: parsed.length, keptPages: parsePages(text)?.length || 0, flags, originalGroups: [...originalGroups], rescuedGroups };
}

function parseArgs(args) {
  let school = null;
  let dryRun = false;
  let verbose = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--school') school = args[++i];
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--verbose') verbose = true;
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  if (school && !/^\d+(?:\.md)?$/.test(school)) throw new Error('--school must be a numeric school ID or filename');
  if (args.includes('--school') && !school) throw new Error('--school needs a filename or ID');
  return { school: school ? `${school.replace(/\.md$/, '')}.md` : null, dryRun, verbose };
}

function main(args = process.argv.slice(2)) {
  const { school, dryRun, verbose } = parseArgs(args);
  const files = school ? [school] : fs.readdirSync(sourceDir).filter((file) => /^\d+\.md$/.test(file)).sort((a, b) => Number(a.slice(0, -3)) - Number(b.slice(0, -3)));
  if (school && !fs.existsSync(path.join(sourceDir, school))) throw new Error(`School file not found: ${school}`);
  if (!dryRun) fs.mkdirSync(outputDir, { recursive: true });
  const schools = [];
  for (const filename of files) {
    const original = fs.readFileSync(path.join(sourceDir, filename), 'utf8');
    const result = filterSchool(original);
    const filteredGroups = bodyGroups(result.text);
    const lostGroups = result.originalGroups.filter((group) => !filteredGroups.has(group));
    const row = {
      filename,
      originalChars: original.length,
      filteredChars: result.text.length,
      reductionPct: original.length ? Number(((1 - result.text.length / original.length) * 100).toFixed(1)) : 0,
      pagesKept: result.keptPages,
      pagesTotal: result.totalPages,
      keywordGroupsFound: [...filteredGroups],
      possibleLostGroups: lostGroups,
      rescuedGroups: result.rescuedGroups || [],
      flags: result.flags,
    };
    schools.push(row);
    if (!dryRun) fs.writeFileSync(path.join(outputDir, filename), result.text);
    if (verbose) console.log(`${filename}: ${row.originalChars} → ${row.filteredChars} chars; ${row.pagesKept}/${row.pagesTotal} pages; flags=${row.flags.join(',') || '-'}; lost=${lostGroups.join(',') || '-'}`);
  }
  const originalChars = schools.reduce((sum, row) => sum + row.originalChars, 0);
  const filteredChars = schools.reduce((sum, row) => sum + row.filteredChars, 0);
  const report = {
    totals: {
      schools: schools.length,
      originalChars,
      filteredChars,
      originalEstimatedTokens: Math.round(originalChars / 3.5),
      filteredEstimatedTokens: Math.round(filteredChars / 3.5),
      reductionPct: originalChars ? Number(((1 - filteredChars / originalChars) * 100).toFixed(1)) : 0,
      flaggedSchools: schools.filter((row) => row.flags.length).map((row) => row.filename),
      schoolsWithPossibleLostGroups: schools.filter((row) => row.possibleLostGroups.length).map((row) => row.filename),
    },
    schools,
  };
  if (!dryRun && !school) fs.writeFileSync(path.join(outputDir, '_report.json'), JSON.stringify(report, null, 2) + '\n');
  if (!verbose) console.table(schools.map((row) => ({ school: row.filename, before: row.originalChars, after: row.filteredChars, reduction: `${row.reductionPct}%`, pages: `${row.pagesKept}/${row.pagesTotal}`, groups: row.keywordGroupsFound.length, flags: row.flags.join(',') || '-' })));
  console.log(`Total: ${originalChars} → ${filteredChars} chars (${report.totals.reductionPct}% reduction; ~${report.totals.originalEstimatedTokens} → ~${report.totals.filteredEstimatedTokens} tokens).`);
  console.log(`Flagged schools: ${report.totals.flaggedSchools.join(', ') || 'none'}`);
  console.log(`Possible lost keyword groups: ${report.totals.schoolsWithPossibleLostGroups.join(', ') || 'none'}`);
  if (dryRun) console.log('--dry-run: no files written.');
  return report;
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { filterSchool, parsePages, normalize, main };
