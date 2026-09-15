# Task: Firecrawl scrape + Claude extraction pipeline for ŠkolaMatch

You are being handed this task with no prior context on the project. Read this
whole document before writing any code — it contains everything you need,
including the exact schema, exact fields, and exact safety rules. Ask the user
if anything below is ambiguous; do not guess on anything that touches data
integrity.

## Project context (minimum you need)

**ŠkolaMatch** is a Czech website (`school-app` repo) that helps 9th graders
pick a high school (*střední škola*) in Prague. It has a Supabase (Postgres)
database with a `schools` table (~223 real Prague schools) and an Express
backend (`server.js` at repo root) that is the only thing allowed to write to
that database with the service-role key (Row Level Security blocks the
browser from writing directly).

Relevant existing columns on `schools`: `id`, `name`, `location`, `programs`,
`contact`, `website`, `zrizovatel`-equivalent info lives in `school_programs`
(see below), `redizo`. Full schema lives in `supabase-setup.sql` at repo root
— read it before writing migrations.

There is already a `school_programs` table (per-obor Cermat admission-results
data) and a `school_ai_summary` table (cached AI-generated pros/cons per
school, regenerated when a `data_fingerprint` column changes) — **use
`school_ai_summary`'s pattern as your model** for how this project caches
AI-generated content: one row per school, a fingerprint/timestamp column, a
`model` column recording which AI model produced it, never regenerated on
every page load.

## The actual task

The school detail page (`frontend/src/components/schoolDetail/MissingDataGrid.jsx`)
currently shows **six placeholder cards** that say "Nemáme tuto informaci"
("We don't have this info") because the site only has admission-stats data
today, not school-life info. Your job: build a two-phase pipeline that scrapes
each school's own website and uses Claude to try to fill these in with real
information — never invented, never guessed.

The six fields (Czech DB column name → what it means → the exact Czech card
title already live on the site, do not change the wording, the frontend will
be updated separately to read your table instead of showing the placeholder):

| DB column | Meaning | Existing card title |
|---|---|---|
| `skolne_poplatky` | Tuition/fees — note: for public schools (`zrizovatel = 'veřejné/státní'`) this is legally zero, already handled elsewhere; you only need to find this for **private** schools | Školné a poplatky |
| `obedy_ubytovani` | School meals / dormitory / boarding availability | Obědy a ubytování |
| `krouzky_aktivity` | Clubs, extracurricular activities, student organizations | Kroužky a aktivity |
| `maturita_uspesnost` | Maturita (school-leaving exam) pass rate, if the school publishes it | Úspěšnost u maturity |
| `vs_uplatneni` | Where graduates go — university placement rate/list, if published | Kam míří absolventi |
| `uplatneni_po_vyuceni` | Post-vocational-training employment outcomes (for SOU/SOŠ schools) | Uplatnění po vyučení |

(Two more placeholder cards, "Fotky školy" and "Video a prohlídka", are
**out of scope** — text only, no photo/video extraction in this pass.)

## Two-phase architecture (deliberate — confirmed with the user)

**Phase 1 — scrape and cache to disk.** Crawl each school's *entire* website
(not just the homepage — as much as Firecrawl can reasonably get: about page,
"pro uchazeče"/admissions page, life-at-school pages, etc.) and save the raw
content to files on disk. This is the expensive, rate-limited, slow step.

**Phase 2 — extract from cached files with Claude.** A completely separate
script reads the cached files and asks Claude to pull out the six fields
above, writing results to a new Supabase table. **This must be re-runnable
without ever re-scraping** — the whole reason for the two-phase split is so
the user can later say "extract this again, I improved the prompt" or "check
this school's cached page for X" without burning Firecrawl credits again.

Do not build this as one combined script. Two scripts, two `npm` invocations,
cache is the seam between them.

## Phase 1 — `scripts/scrape-schools.js`

- Query `schools` for `id, name, website`. **Skip any school where `website`
  is null or empty** — log it, don't error.
- For each remaining school, use Firecrawl to crawl the site (its `/crawl`
  endpoint, or repeated `/scrape` calls following on-site links — whichever
  the Firecrawl SDK makes cleaner; check current Firecrawl docs, don't assume
  an API shape). Get markdown output (Firecrawl returns clean markdown by
  default) — this is what "save it into some file" in the original request
  refers to.
- **Save one file per school** to `scripts/data/scraped-schools/<school_id>.md`
  (create that directory; add it to `.gitignore` — this will be several MB of
  scraped content, it should not be committed to git). Concatenate all crawled
  pages for that school into the one file, with a `## <page URL>` heading
  before each page's content so Phase 2 can cite sources.
- Also write a `scripts/data/scraped-schools/_manifest.json` mapping
  `school_id -> { scrapedAt, pageCount, sourceUrls: [...] }` so Phase 2 (and
  future reruns) can tell what's cached and when, without re-parsing every
  markdown file.
- **Flags:**
  - `--dry-run` — print which schools would be scraped and their websites,
    write nothing, call Firecrawl for nothing.
  - `--limit N` — only process the first N eligible schools (for testing).
  - `--school-id <id>` — scrape just one school, for testing/debugging.
  - No flag — process every school with a website that isn't already cached
    (idempotent: skip a school whose file already exists in the manifest,
    unless...).
  - `--force` — re-scrape even schools already cached.
- **Never fail the whole run on one school's error** — catch per-school,
  log the school name + error, continue to the next. Print a summary at the
  end: N scraped, N skipped (no website), N failed (with reasons), N already
  cached and skipped.
- Needs a `FIRECRAWL_API_KEY` env var (backend `.env`, gitignored — add the
  var name, not a value, to `.env.example`). The user will provide their own
  key when they run this; do not ask them to paste it into chat, they'll set
  it in `.env` themselves.
- Respect whatever reasonable rate limit/concurrency Firecrawl's docs
  recommend — this is a few hundred schools, not thousands, so it doesn't
  need to be fast, it needs to not get the account rate-limited or banned.

## Phase 2 — `scripts/extract-school-details.js`

- Read `scripts/data/scraped-schools/_manifest.json` to know which schools
  have cached content.
- For each cached school (respecting the same `--limit` / `--school-id` /
  `--dry-run` flags as Phase 1), read its `.md` file and send it to Claude
  (direct Anthropic API — the user specifically asked for "Claude by
  Anthropic," not the OpenRouter proxy this repo also uses elsewhere) with an
  extraction prompt that:
  - Lists the six fields above with their meanings.
  - **Explicitly instructs Claude to return `null` for any field it cannot
    find real evidence for in the provided text — never infer, guess, or
    fill in a plausible-sounding placeholder.** This is the single most
    important instruction in the whole prompt; the app has an existing
    written policy (see `frontend/src/components/schoolDetail/MissingDataGrid.jsx`'s
    header comment) that it never shows fabricated data to users — a wrong
    "yes we have a dorm" is worse than an honest "we don't know."
  - Asks for a short citation/quote or the source URL for each non-null
    field it does return, if the source text makes that identifiable — this
    goes in a `source_urls` jsonb column, not shown to end users necessarily,
    but useful for someone spot-checking later.
  - Requests strict JSON output (use Claude's structured output support /
    a JSON schema, or a very explicit "respond with only this JSON shape"
    instruction — whichever the current Anthropic SDK makes more reliable).
- **Never fabricate.** If the model returns something that looks like a
  generic non-answer ("many extracurricular activities are offered") rather
  than a specific fact, treat that as equivalent to null — write a brief
  sanity check for this (e.g. reject values under some minimum specificity,
  or just trust the prompt and spot check manually — use your judgment, but
  err toward under-filling rather than shipping vague filler text).
- Write one row per school to the new Supabase table (see schema below) —
  upsert on `school_id`, so a rerun with an improved prompt overwrites
  cleanly rather than duplicating.
- Needs `ANTHROPIC_API_KEY` in `.env` — add to `.env.example`. Pick a
  reasonably capable current Claude model for extraction quality (check
  what's current — this repo's `OPENROUTER_MODEL` env var currently defaults
  to `anthropic/claude-sonnet-5` as a hint of what "current" meant when this
  was written, but verify rather than trust that blindly, since models move
  fast).
- Uses the `SUPABASE_SERVICE_ROLE_KEY` to write, same as every other script
  in `scripts/` — RLS blocks anything else.
- Print a summary: N schools processed, and for each, which of the 6 fields
  came back non-null (e.g. "Gymnázium X: 3/6 fields found") — this gives the
  user a fast way to see extraction coverage without opening Supabase.

## New Supabase table — add to `supabase-setup.sql`

Follow that file's existing conventions (idempotent `CREATE TABLE IF NOT
EXISTS`, RLS enabled, no client policy — same as `schools` and
`school_programs`, since this is scraped/AI-derived content the browser
should only ever read through `server.js`, never write to directly).

```sql
CREATE TABLE IF NOT EXISTS school_extracted_details (
  school_id integer PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  skolne_poplatky text,
  obedy_ubytovani text,
  krouzky_aktivity text,
  maturita_uspesnost text,
  vs_uplatneni text,
  uplatneni_po_vyuceni text,
  source_urls jsonb,
  model text,
  extracted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE school_extracted_details ENABLE ROW LEVEL SECURITY;
-- No client policy — server.js (service role) is the only writer/reader from
-- the app's perspective, same rule as `schools`.
```

Do not wire this into `server.js`/the frontend as part of this task unless
the user asks — the scope here is the scraping + extraction pipeline and the
table it writes to. Getting real data into the table safely is the deliverable;
surfacing it on the school detail page (replacing the relevant
`MissingDataGrid` placeholder cards) is a natural next step but a separate
one — mention it's ready to wire up when you're done, don't do it unprompted.

## Dependencies

Add to root `package.json` (this is backend/scripts tooling, same place
`xlsx` lives): the official Firecrawl SDK (`@mendable/firecrawl-js` — verify
current package name against Firecrawl's docs, it may have changed) and the
official Anthropic SDK (`@anthropic-ai/sdk`).

## Non-negotiable constraints (reasons given so you don't relitigate them)

1. **Never fabricate data.** This app is used by 14-18-year-olds making a
   real, consequential decision. A wrong "yes this school has a cafeteria" is
   actively harmful, not a minor bug. Null is always the safe default.
2. **Two-phase, not combined.** Re-extraction without re-scraping is a
   deliberate, explicitly-requested capability — don't collapse this into one
   script "for simplicity."
3. **Text only, this pass.** No photo/video scraping or extraction — those
   two placeholder cards stay as-is.
4. **Skip schools with no website** rather than erroring or trying to guess
   one.
5. **`--dry-run` and `--limit` on both scripts** — this will be tested on a
   handful of schools before the user commits to running it on all ~223.
6. **Don't touch `frontend/` or `server.js`** in this task — scripts and the
   new table only, unless the user explicitly asks you to wire up the
   frontend too.

## If anything is unclear

Ask the user directly. In particular, check with them before you:
- Pick the exact Firecrawl crawl parameters (max pages per site, depth) —
  propose a sensible default (e.g. up to ~20 pages per school site) and
  confirm rather than silently picking a number that could be slow or
  expensive across ~200 schools.
- Pick the exact Claude model for extraction.
- Do anything that would touch `frontend/` or `server.js`.

When done, tell the user exactly how to run both phases (the two npm/node
commands, in order, with the recommended flags for a first small test run
before a full run).
