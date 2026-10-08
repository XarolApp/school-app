# School website scrape, filter and extraction operations

Updated 8 October 2026 against the current scripts. This replaces an obsolete
initial build task: the pipeline, schema and school-detail integration already
exist. Do not rebuild them from the former six-column example or install a direct
Anthropic client on the assumption that it is the current provider.

## Current purpose and data

The pipeline caches school website text, filters it locally, then extracts
source-supported information into `school_extracted_details`. Keep scraping and
extraction separate so a prompt/model change does not require another crawl.
The current catalogue has 223 raw rows and 217 visible schools; these counts do
not prove completeness against the official register. Historical September runs
used 219 cached schools; cache, raw-row and visible counts describe different sets.

The canonical intended schema is `supabase-setup.sql`, not a copied table fragment
in this document. The table is service-role only; the backend and maintenance
scripts use it. RLS does not make service-role writes safe automatically.
Current fields include:

- Eight prose fields: `skolne_poplatky`, `obedy_ubytovani`, `krouzky_aktivity`,
  `maturita_uspesnost`, `vs_uplatneni`, `uplatneni_po_vyuceni`,
  `pripijimaci_pozadavky_detail` (existing spelling) and `vyukovy_styl_detail`.
- Base numbers: `tuition_czk_per_year`, `maturita_pass_rate_pct`, `zacatek_hodin`.
- Base booleans: `ma_dodatecne_pozadavky`, `alternativni_pedagogika`.
- Six additional structure fields: `ma_jidelnu`, `ma_koleje`, `pocet_krouzku`,
  `krouzky_kategorie`, `vs_pokracuje_pct`, `vyukovy_styl_tagy`.
- Provenance/model/timestamp fields; see the schema and script for their shape.

School pages and matching tools already consume subsets of this data. Missing
values must remain unknown; a prompt, quote or successful schema validation does
not establish that a statement is true, current or applies to every programme.
Photos/video are outside this text pipeline.

## 1. Scrape and cache

`scripts/scrape-schools.js` uses Firecrawl and reads the school website list from
Supabase. `scripts/scrape-schools-free.js` is a separate HTML/Jina alternative;
it has different traffic, source and third-party handling, not a drop-in claim of
identical results. Review the current maintenance findings before either full run.

The Firecrawl script writes one `scripts/data/scraped-schools/<id>.md` per school
and `_manifest.json` with crawl date/page count/source URLs. Page boundaries use
`## PAGE-URL: <url>`. This ignored external content must not be committed as if it
were authored application code. A missing website is skipped. Normal runs skip
manifest-cached schools; `--force` requests another scrape.

A bounded listing check, with an actual catalogue ID in place of `123`:

```sh
node scripts/scrape-schools.js --dry-run --school-id 123
```

This scraper's dry run lists targets without calling Firecrawl or writing cache
files. A real crawl requires `FIRECRAWL_API_KEY`, can cost money, and writes files.
The script also accepts `--limit N`; malformed/zero/negative scope validation and
manifest recovery are unresolved maintenance findings, so verify the printed
scope before any real run. A failed manifest parse can currently become an empty
manifest and trigger unnecessary recrawls. Back up the cache/manifest first and
avoid concurrent writers. Do not assume a zero exit means every school succeeded.

## 2. Filter locally after each scrape

The extractor defaults to **filtered**, not raw, text. Refresh the filter after a
new scrape or it can read stale content:

```sh
node scripts/filter-scraped-schools.js --school 123 --dry-run --verbose
node scripts/filter-scraped-schools.js --school 123 --verbose
```

Without `--school`, the filter processes numeric Markdown files and writes a
whole-run `_report.json` under `scripts/data/filtered-schools/`. Filtering makes no
provider calls or database writes. Its dry run writes no files. Inspect flags,
retained pages and source text: preserved keyword groups are not a guarantee that
all relevant facts survived. The raw cache remains the provenance reference.

## 3. Extract from cached text

`scripts/extract-school-details.js` reads the raw manifest and selected input
files. Base extraction normally skips already extracted schools; specifying
`--school-id` explicitly re-extracts that target. `--input-dir` or
`EXTRACT_INPUT_DIR` can change the input directory. Do not point at an old filtered
folder and assume it reflects today's website.

The script needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Provider selection
is automatic: nonempty `GOOGLE_GEMINI_API_KEYS` takes precedence over OpenRouter,
so setting both does not let the model name alone switch providers. Otherwise it
uses `OPENROUTER_API_KEYS` or `OPENROUTER_API_KEY`. Provider/model/route settings are
in the script and `.env.example`; never paste secret values into a report.
The code defaults are Google `gemini-3.6-flash` or OpenRouter
`anthropic/claude-haiku-4.5`; these identifiers are source defaults, not verification
that a deployed credential can use them. September's Luna/flex run is historical,
not an instruction to silently select that provider today. Check availability,
terms, costs and the approved route before a controlled call.

A single-target base preview, **after paid calls are authorized and the selected
database is suitable for usage logging**:

```sh
node scripts/extract-school-details.js --school-id 123 --dry-run
```

**Extraction dry run is not read-only:** it skips school-detail writes, but makes
real model calls and the OpenRouter path writes `ai_usage_log`. When
`EXTRACT_DUMP_DIR` is set it also writes local JSON. Do not use this flag to assert
that production Supabase cannot be changed. The Google path does not provide the
same usage-log coverage. Use a disposable database/project for acceptance tests;
this review did not run paid extraction or modify live school records.

The separate `--structure` mode derives the six additional fields from stored
prose first, with cached text as fallback; it preserves existing values unless
`--force`. It accepts comma-separated IDs and validates a positive `--limit`.
Its `--dry-run` can likewise make paid calls/write usage records. Do not use
`--force` across the catalogue without a reviewed diff and rollback plan.

## Source validation and remaining safeguards

- Unknown means `null`, not zero/false. A no-own-canteen statement is not proof that
  no school-arranged lunch exists; a nearby restaurant is not automatically a
  school meal service. The negated-canteen parsing bug was fixed in `06c704c`.
- Annual tuition needs an explicit billing period and programme applicability.
  Do not invent payment months or select the cheapest programme as the school price.
- Cermat-derived maturita figures must be preserved. Failed preservation lookups
  now abort before extraction; test this in a disposable environment.
- Base refreshes can leave dependent structure fields stale. Source URLs, factual
  applicability, old cache dates and partial-run failures still require review.
  Do not rerun an entire paid batch merely to repair three suspect records.
- Treat cached website text as untrusted input. Inspect current official pages and
  provenance before publishing changes affecting admissions, fees or facilities.

See [maintenance findings](../reports/deployment-review-2026-10-07/script-findings.md)
and [handoff section 8](../reports/deployment-review-2026-10-07/HANDOFF-PLAN.md) for
transactional refresh, safe scope/manifest recovery and existing-data checks.
The initial task's direct Anthropic SDK/model IDs, six-column migration, estimated
full-run prices and claim that the frontend was not wired are superseded.
