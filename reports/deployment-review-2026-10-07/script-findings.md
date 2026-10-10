# Operational script review — 8 October 2026

These findings come from full source reads. No write script was run against production. Priority applies before the affected maintenance operation; these scripts are not ordinary request handlers. Data interpretation questions remain explicit until checked against an official workbook/register.

## S01 — P1: the test-account reset can strand production billing

**Confirmed control flow:** `scripts/reset-test-account.js:10–16` checks only for a test Stripe key, then connects to whichever Supabase project is configured. Lines 21–33 can replace any matching email's entitlement with a trial and clear its Stripe customer/subscription/method/setup references. It neither verifies a disposable database/account nor cancels/reconciles the corresponding Stripe objects. Combining a production Supabase URL with a test Stripe key therefore passes its safeguard. The source comment's “test-only” label is not enforced for the database.

**Action:** restrict to an explicitly designated nonproduction project and disposable account allowlist; preview the exact intended transition and refuse paid/beta/developer identities unless a separately approved reconciliation procedure handles them. Preserve billing references until their external lifecycle is settled. Test refusal with fake credentials/adapters; do not reproduce on a real account. This is operational/access-state work, not a safe unconditional clearing patch.

## S02 — P1: admission replacement loses the old dataset on partial failure

**Confirmed control flow:** `scripts/import-admission-data.js:411–427` writes school aggregates first. Lines 444–462 delete existing programme rows for the affected year/schools, then insert chunks of 500. An insert failure logs and continues; the old rows are already gone, later chunks may succeed, and the process can finish successfully with a partial dataset. Aggregate and programme data can disagree. Repeating an older workbook can also overwrite the school-level “newest” summary because freshness is compared only among files supplied to that run, not against stored source years.

**Action:** validate/stage the full dataset and atomically publish programme rows and summaries, with explicit rollback and a nonzero failure result. Store authoritative source year/provenance and prevent accidental older replacements. Test a failed second chunk and an older-file rerun in disposable PostgreSQL. The analogous delete/insert pattern in application picks is already B03; both need real transaction tests.

## S03 — source interpretation and duplicate identifier checks remain open

`import-admission-data.js:235–243` converts a blank/null admitted count to zero through `Number(null)`, while the per-programme path preserves null. If official blanks mean suppressed/unknown rather than zero, the aggregate acceptance rate is understated. `halvedCutoff` also assumes every blank means a non-didactic admission path. **Not yet established:** the meaning of blanks in each official source/year; no automatic correction is justified until checked.

`import-admission-data.js:327` chooses the first database row with a REDIZO for aggregates, while lines 359–364 construct a map whose last duplicate wins for programmes. Maturita/website import maps have similar last-wins behavior. **Conditional risk:** this splits attribution if the database contains duplicate institution identifiers. Check aggregate duplicate counts and the intended merged-school mapping without exporting private rows; fail or map explicitly rather than relying on array order.

**8 October follow-up:** [read-only integrity evidence](data-integrity-2026-10-08.json) found **zero duplicate REDIZO groups**, raw or visible. Do not describe the conditional identifier issue as current corruption. Six merged rows still own programme records; preserve their deliberate aggregation/ownership during refreshes.

**Action:** check actual workbook explanation sheets/header definitions, null/suppression cases, legitimate shared REDIZO records and programme ownership. Record confirmed rules in fixtures. Unknown counts must stay distinguishable from measured zero. Do not interpret a website claim or fuzzy match as official register completeness.

## S04 — P2: website backfill can overwrite an intervening correction

`scripts/backfill-school-websites.js` selects rows initially lacking a website, performs potentially slow external lookups, then updates by ID without requiring the website to remain null. A correction made during the batch can be overwritten. Its dry run prevents database writes but still performs Firecrawl requests and can consume paid quota.

**Action:** condition writes on the intended unchanged source value, record skipped conflicts, validate CLI limits and document external-call cost. Apply the same check to other “fill missing” jobs during their remaining review. No concurrent production correction was deliberately induced.

## S05 — workbook contracts need validation before reuse

`scripts/import-maturita-data.js:53–92` relies on fixed column positions and accepts numeric percentages without checking the header contract, finite 0–100 range, year or count consistency. Lines 119–145 overwrite the current maturita fields without comparing source years. A changed layout or older file can publish plausible-looking incorrect data. The script's stated percentage denominator still needs comparison with the actual official workbook; it is not independently verified by a comment.

**Action:** validate both header rows, the year and expected rate/count units before writes; retain year/provenance separately and reject accidental older updates. Add a small official-shape fixture and deliberately shifted/header/range/null cases. Review the development-only vulnerable `xlsx` dependency before accepting untrusted workbooks; production dependency audit success does not cover this path.

## S06 — P2 documentation: Atlas matching is a separate heuristic

`scripts/diff-atlas-schools.js:2–11` describes an old 224-vs-214 snapshot and claims exactly the same matching everywhere. Its noise-word list differs from the admission importer. This comparison is historical supporting evidence, not an authoritative current school count or completeness check. Update the comment and retain the original snapshot's date/source limitation; do not force the algorithms to match merely to make the comment true.

**Fixed:** header corrected in pushed commit `cdd56d0`; matching behavior unchanged. Current Atlas/register completeness is still unverified.

## S07 — P2: coordinate presence is not address precision

`scripts/geocode-schools.js` accepts the first Czech result without checking feature type, address precision or whether it is the intended school building. Removing the last address segment can leave only a district/city. Any returned centroid is then saved as a precise location. Requests have no explicit timeout and fill-missing updates do not guard an intervening correction. Per-process pacing also does not coordinate with other application Nominatim traffic (C01).

**Observed:** all 217 visible schools currently have finite, in-range coordinates within the generated Prague district geometry. That does not prove building accuracy, particularly for schools near district boundaries. Review suspicious broad/repeated coordinates and original geocoder matches; never correct them solely from the postal Praha number. Add precision checks/manual approval for broad results and conditional updates before future geocoding batches. Corrected fallback/`--force` comments do not constitute a precision fix.

## S08 — P2: scrape-cache failure can silently change batch scope

Both scrape scripts catch malformed `_manifest.json` and return an empty object. A corrupted manifest therefore makes every eligible school appear uncached, potentially recrawling paid Firecrawl pages; later saves replace the manifest with only the new batch's entries. Saves are not atomic and concurrent runs can lose each other's entries. CLI `--limit` is not validated: zero/NaN means no limit, and a negative value selects all but the trailing records. Partial school failures still allow a successful process exit.

**Action before another batch:** fail with a recoverable manifest error, validate IDs/limits, write cache plus manifest atomically and prevent simultaneous writers. Exit nonzero on a partial failed run while preserving useful completed work. Document that free-scraper “dry run” makes no crawl calls, whereas extraction/website-backfill dry runs may call paid providers. Review robots/site permissions, redirect destinations, sitemap scope and response-size limits before scaling external crawling; the source review does not prove permission for every school website or Jina's current service terms.

## S09 — reproduced canteen negation bug fixed; stored candidates need source review

**Confirmed and fixed in the current source:** `hasExplicitDiningEvidence` matched `má` within `nemá`; a negated canteen could become `ma_jidelnu=true`. A quoted denial could also rescue a model positive. Regression tests failed on the old code and now verify six denial examples return unknown, explicit own/arranged lunches remain true and explicit no meals remains false. Base extraction descriptions were aligned with existing whole-school tuition rules and no longer permit `false` merely because additional admission requirements are omitted.

The [live aggregate probe](data-integrity-2026-10-08.json) flags public school IDs **118, 146, 228** for source review. These are **candidates, not three proven incorrect records**: 118/228 mention named off-site dining; 146 mentions self-heating food, a delivery portal and nearby bistros. Read the stored source URLs/current school pages and confirm whether meals are explicitly arranged through the school. Keep that distinction in the prose; change structured values only after confirming the evidence. No extraction or database update was run.

**Also fixed:** failure to read Cermat preservation records or existing extraction records now aborts before model calls/writes. Previously the run could overwrite protected official rates after a failed lookup or reprocess all previously extracted schools. A mocked preflight-failure regression asserts zero model calls/writes for both cases.

## S10 — remaining extraction assurance and freshness work

Base extraction verifies type/range and limited text guards, but does not prove numeric/boolean values against exact source evidence or validate every source URL against cached pages. Structured mode has stronger evidence rules, but verbatim quote presence alone does not prove a model-assigned category or meal interpretation. Existing values are skipped without revalidation; source/model changes do not automatically refresh dependent structured values. A base re-extraction can leave the six structure fields derived from old prose. Partial provider failures are logged but can end with exit code zero.

**Action:** retain source checksums/year/extraction version, define which dependent values become stale on refresh, validate source URL membership and sample every scoring-relevant field against source text before relying on it. Resolve the tuition prompt's remaining inference that an unqualified single price means “same for all programmes”; absence of another listed price is not proof. Test zero/free tuition, decimals/time rounding and multiple tracks deliberately before changing their data policy. Keep unknown distinct from false/zero. This needs a reviewed data-quality policy and targeted reconciliation, not a blind live re-extraction.

**Limits of filter/simulation evidence:** all six existing filter tests pass. Preserving a keyword group does not prove every important fact survives truncation. The simulation uses an approximate latest-year projection and random-sort multi-selection; do not call its output a calibrated probability, uniform subset sample or proof of unfair scoring. Review those assumptions before using the report to change matching weights. Uniformly sampled question options do not represent real student preferences.

## Optional improvements

Add a compact data-refresh run record: source URL/checksum/year, dry-run diff, validation results, publication ID, inserted/removed counts and rollback location. Prefer extending an existing import path over introducing a separate general job framework. This is a recommendation; no framework or live migration has been created by this review.

## S11 — dry runs have paid-call and database-logging side effects

The Phase 5 usage logger is invoked by OpenRouter calls in both the extractor and pros/cons generator, regardless of `--dry-run`. It inserts `ai_usage_log` records even when content-table writes are skipped. The extractor can also write `EXTRACT_DUMP_DIR` JSON during a preview. The old console claim “nothing written to Supabase” is therefore false. This was established from source; no paid call or production write was performed to reproduce it. Retaining cost accounting can be intentional, so this audit does not disable it silently.

**Action:** correct operational wording, keep usage logging explicit, and use a designated disposable database for test calls. The base extractor's `--limit`/`--school-id` parsing is also less strict than structure mode: malformed/zero limits can leave the whole batch selected, and an explicit missing ID can fail late after preflight. Add shared validated scope parsing before future paid batches; test invalid/missing/unknown IDs and zero/negative/fractional/NaN limits without provider/database calls. Do not assume a dry-run flag proves a production project is untouched.


## S12 — pros/cons generation uses a different school projection

`scripts/generate-school-proscons.js` fetches raw schools without excluding merged
records or merging their programmes into the visible parent. Its summary groups
programmes only by KKOV/name, rather than the frontend's newest-year focus-aware
programme identity. Schools with multiple focuses sharing a KKOV can therefore
get an understated programme count. Historical language/type rows also influence
current descriptors. The school-level cutoff/rate and newest programme year are
not guaranteed to describe the same source year; older school aggregates are
present in the live catalogue. These are input/provenance inconsistencies, not a
verified claim that each cached AI sentence is wrong.

**Action:** use the canonical visible-school/merged-programme projection from B01,
retain each metric's actual year, and compare a school with shared KKOV focuses,
merged records and mixed years against frontend summaries. Review existing cached
sentences before any paid regeneration. CLI limits and partial-success exit
behavior share S08/S11 risks. Fingerprints currently omit model/prompt version, so
a model-only change will skip unchanged data unless `--force` is used. Deliberate
refresh planning is required; do not overwrite all summaries to repair one input.


## S13 — provider diagnostic body handling fixed

`test-google-api.js` consumed an HTTP-200 response as JSON and then tried to read
it again as text when no candidate answer existed, reporting a body-consumption
exception instead of the actual unusable response. It now reads once, accepts only
nonblank text, reports the HTTP result without dumping upstream error bodies, and
does not equate a short credential probe with extraction readiness. Three mocked
regressions pass for empty success, errors, invalid JSON and valid/blank text. No
Google call was made. The separate `test-google-simple.js` still lacks a reliable
failure exit/result contract; neither probe verifies extraction tools, quality,
costs or provider terms. Both are manual paid-call diagnostics, outside `npm test`.


## S14 — malformed pipeline CLI scopes fixed

Five scripts converted `--limit` using Number without checking it. NaN/zero bypassed the truthiness slice and selected the whole target list; negative limits selected nearly all entries. The normal extract/scrape school selector likewise treated an explicitly missing value as no restriction. These are confirmed command-scope defects, independent of which live records happen to need work. generate-school-proscons, extract-school-details, scrape-schools, scrape-schools-free and backfill-school-websites now reject invalid limits; supported school/model value flags reject missing/blank/next-flag values before work. Structure mode already rejected malformed/negative limits and now consistently requires a safe integer/valid model value. Valid and omitted options retain the existing processing behavior.

`tests/script-cli-boundaries.test.cjs` evaluates each actual full script with its terminal main invocation controlled, synthetic credentials and blocked service/filesystem-write dependencies. Sixteen tests cover missing/malformed/negative/zero/fractional/infinite/unsafe/flag limits, missing/blank/flag school/model values, structure mode and positive/omitted limits reaching the blocked work boundary. All 173 root tests and five script syntax checks pass. No production pipeline, query, model, scrape or write was executed. This does not close S11 paid dry-run semantics or S12 cache/input identity, source-year coverage, model/prompt refresh and failure-exit behavior. See [verification](script-cli-verification-2026-10-10.json) and [test output](script-cli-all-tests-2026-10-10.txt).
