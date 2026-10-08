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

**Action:** check actual workbook explanation sheets/header definitions, null/suppression cases, legitimate shared REDIZO records and programme ownership. Record confirmed rules in fixtures. Unknown counts must stay distinguishable from measured zero. Do not interpret a website claim or fuzzy match as official register completeness.

## S04 — P2: website backfill can overwrite an intervening correction

`scripts/backfill-school-websites.js` selects rows initially lacking a website, performs potentially slow external lookups, then updates by ID without requiring the website to remain null. A correction made during the batch can be overwritten. Its dry run prevents database writes but still performs Firecrawl requests and can consume paid quota.

**Action:** condition writes on the intended unchanged source value, record skipped conflicts, validate CLI limits and document external-call cost. Apply the same check to other “fill missing” jobs during their remaining review. No concurrent production correction was deliberately induced.

## S05 — workbook contracts need validation before reuse

`scripts/import-maturita-data.js:53–92` relies on fixed column positions and accepts numeric percentages without checking the header contract, finite 0–100 range, year or count consistency. Lines 119–145 overwrite the current maturita fields without comparing source years. A changed layout or older file can publish plausible-looking incorrect data. The script's stated percentage denominator still needs comparison with the actual official workbook; it is not independently verified by a comment.

**Action:** validate both header rows, the year and expected rate/count units before writes; retain year/provenance separately and reject accidental older updates. Add a small official-shape fixture and deliberately shifted/header/range/null cases. Review the development-only vulnerable `xlsx` dependency before accepting untrusted workbooks; production dependency audit success does not cover this path.

## S06 — P2 documentation: Atlas matching is a separate heuristic

`scripts/diff-atlas-schools.js:2–11` describes an old 224-vs-214 snapshot and claims exactly the same matching everywhere. Its noise-word list differs from the admission importer. This comparison is historical supporting evidence, not an authoritative current school count or completeness check. Update the comment and retain the original snapshot's date/source limitation; do not force the algorithms to match merely to make the comment true.

## Optional improvements

Add a compact data-refresh run record: source URL/checksum/year, dry-run diff, validation results, publication ID, inserted/removed counts and rollback location. Prefer extending an existing import path over introducing a separate general job framework. This is a recommendation; no framework or live migration has been created by this review.
