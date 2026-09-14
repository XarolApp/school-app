/**
 * One-off comparison: our 224 Prague schools vs. atlasskolstvi.cz's 214.
 *
 * atlasskolstvi.cz's list was collected manually (its site has no API and no
 * per-school links to scrape reliably) into atlas-prague-schools.json — 214
 * names, paginated ?p=1..11&region=hlm-praha, read directly off the page.
 *
 * Matching reuses the exact same normalize/coreTokens/jaccard logic as
 * scripts/import-admission-data.js, so "is this the same school" is judged
 * identically everywhere in this codebase, not by a second, possibly
 * disagreeing heuristic.
 *
 *   node scripts/diff-atlas-schools.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const atlasNames = require('./atlas-prague-schools.json');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,()/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NOISE_WORDS = new Set([
  's', 'r', 'o', 'a', 'p', 'v', 'spol', 'sro', 'ops', 'vos',
  'stredni', 'skola', 'odborna', 'odborne', 'uciliste', 'sos', 'sou', 'ss',
  'stredisko', 'praha', 'zakladni', 'materska', 'skoly', 'skol',
]);

function coreTokens(name) {
  return normalize(name)
    .split(' ')
    .filter((word) => word.length > 1 && !NOISE_WORDS.has(word));
}

function sameWord(a, b) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  return a.startsWith(b) || b.startsWith(a);
}

function jaccard(aTokens, bTokens) {
  let shared = 0;
  const usedB = new Set();
  for (const wordA of aTokens) {
    const i = bTokens.findIndex((wordB, idx) => !usedB.has(idx) && sameWord(wordA, wordB));
    if (i !== -1) {
      shared += 1;
      usedB.add(i);
    }
  }
  const union = aTokens.length + bTokens.length - shared;
  return union === 0 ? 0 : shared / union;
}

const MATCH_THRESHOLD = 0.4;

function bestMatch(name, candidates, taken) {
  const tokens = coreTokens(name);
  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    if (taken.has(c.id)) continue;
    const score = jaccard(tokens, coreTokens(c.name));
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= MATCH_THRESHOLD ? { school: best, score: bestScore } : null;
}

async function main() {
  const { data: ourSchools, error } = await supabase.from('schools').select('id, name');
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const taken = new Set();
  const atlasMatched = [];
  const atlasUnmatched = [];

  for (const atlasName of atlasNames) {
    const match = bestMatch(atlasName, ourSchools, taken);
    if (match) {
      taken.add(match.school.id);
      atlasMatched.push({ atlasName, ourName: match.school.name, score: match.score.toFixed(2) });
    } else {
      atlasUnmatched.push(atlasName);
    }
  }

  const ourUnmatched = ourSchools.filter((s) => !taken.has(s.id));

  console.log(`atlasskolstvi.cz: ${atlasNames.length} schools`);
  console.log(`our database: ${ourSchools.length} schools`);
  console.log(`matched: ${atlasMatched.length}\n`);

  console.log(`=== On atlasskolstvi.cz but NOT matched in our database (${atlasUnmatched.length}) ===`);
  atlasUnmatched.forEach((n) => console.log(`  - ${n}`));

  console.log(`\n=== In our database but NOT on atlasskolstvi.cz's list (${ourUnmatched.length}) ===`);
  ourUnmatched.forEach((s) => console.log(`  - ${s.name}`));

  // Low-confidence matches worth a human glance — matched, but not cleanly.
  const shaky = atlasMatched.filter((m) => Number(m.score) < 0.6);
  if (shaky.length) {
    console.log(`\n=== Matched, but low confidence (worth double-checking) (${shaky.length}) ===`);
    shaky.forEach((m) => console.log(`  - "${m.atlasName}" ~ "${m.ourName}" (score ${m.score})`));
  }
}

main();
