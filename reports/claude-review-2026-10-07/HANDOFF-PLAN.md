# Reconciled handoff — original Claude review of 7 October

**Updated 11 October 2026.** This file maps the original T1–T13 tasks to current work; the [full-project handoff](../deployment-review-2026-10-07/HANDOFF-PLAN.md) is authoritative for sequencing, reproductions and acceptance. Read current `AGENTS.md`/`CLAUDE.md`, `UNFORGET.md`, [REPORT.md](REPORT.md) and the coverage ledger first. The full review remains incomplete. Do not treat a historical omission as release approval.

## Rules for every task

- Check shared status, exact hashes and `COORDINATION.md` before editing; skip active Claude files until released. Preserve peer changes. No new subagents are authorized.
- Use the founder-selected GPT-6.1 Sol xhigh for this review. Historical per-task model suggestions do not authorize switching models or starting another agent.
- Verify a coherent change with appropriate tests, frontend lint/build and actual local browser checks when visible. Save the exact snapshot and limits; a mocked test does not establish PostgreSQL or hosted acceptance. Do not start production-backed workers as an incidental local check.
- Follow the current push rules: verified certain small fixes/copy/docs may be pushed; feature/auth/payment/access/deletion/schema/tester-flow changes need a concrete localhost result and founder approval before push. Apply and verify required migrations/configuration first. A push to `main` deploys Vercel/Railway. Stage only owned paths; never commit environment secrets.
- Preserve founder D1/D4 and later decisions. Report uncertain policy/legal/architecture choices; do not replace them with an old fix sketch. Student/parent voice and grammatical preference must remain accurate; never invent numbers, sources, testimonials or admission guarantees.

## T1 — Access matrix · open beta implementation/acceptance

Onboarding is free **but requires sign-in**. Anonymous visitors retain the landing, necessary auth/legal pages and view-only school detail opened from a landing-map dot. Premium catalogue, comparison/matrix, standalone questionnaire, application planning and saved-school tools require valid trial/paid/beta access. Expired users retain account/cancellation/withdrawal/deletion management. Beta is free for feedback; payment screens are previews with zero Stripe/card/purchase-trial activity. Sharing creation/opening stays disabled for beta; owners may list/revoke existing links.

Use the current B01/C35 matrix task across `App.jsx`, `ProtectedRoute`, navigation and every server endpoint. The original suggestion to keep rich `/api/schools` anonymous for onboarding is withdrawn. Preserve the intentional public detail projection, avoid referrer-based authorization, and verify every entitlement state with actual HTTP tests. Several copy/route fixes already exist; re-read stable released source before changing it.

## T2 — Failed seasonal charge · real-payment gate

The original stranded-`past_due` defect belongs to the larger P01–P08 payment lifecycle task. **Do not clear a due timestamp as a standalone recovery fix.** Persist purchase/attempt identity and ambiguous charges, claim scheduled work atomically, reconcile webhook ordering and cancellation races, and offer authenticated retry/SCA/cancel recovery. Keep the 690 Kč season/three-day deferred charge and 249 Kč monthly/no-trial decisions. Acceptance must cover failure, timeout, database outage, retry and refund without duplicate charges; use disposable accounts and Stripe test mode only.

## T3 — Stripe API/SDK compatibility · real-payment gate

The 7 October fix accepted both old and configured newer event shapes. Audit the current SDK, client API and webhook endpoint versions before proposing an upgrade; use current Stripe primary documentation and pin a deliberately supported combination. Test every consumed field and both direct/parent payment paths, monthly renew/cancel/withdraw and season setup/charge/failure. A dependency bump or fixture pass alone does not establish real webhook acceptance.

## T4 — Explanation promises · evidence/product follow-up

Do not retain the old claim that an expired key means no current explanations. Later source includes cached/on-demand explanation paths; provider generation and cache/visibility behavior still need acceptance (C21/C55). Inventory the actual explanation coverage and review C06's unsupported completeness/time/number claims before choosing copy or features. Deterministic scores and AI sentences remain separate; never promise admission probability or explanation coverage without evidence.

## T5 — Grammatical preference · preserve implementation, check remaining copy

Preference-aware helpers, profile fields and many replacements now exist. Do not reopen the original style question or mechanically apply slash forms. Verify student/parent/unknown-preference strings in stable current source, including saved answer labels, email/errors and reviews; keep the active questionnaire/matching files deferred until Claude releases them. Verify stored-value compatibility when labels change.

## T6 — Headers/CSP · deployed acceptance

`frontend/vercel.json` now configures enforced nosniff/referrer/framing/permissions headers and report-only CSP; `server.js` disables `x-powered-by`. Preserve these source changes. Verify actual gate, rewritten app, JSON API and authenticated cache responses and provider flows. Report-only CSP is not enforced CSP. Do not blindly duplicate headers, enforce an untested policy or break Turnstile, Auth, maps, screenshots and lawful tile referrers. See C12 and the phase-12 acceptance task.

## T7 — Admission year · current-source acceptance

Several literal-year fixes already shipped. Verify mixed/new/old/missing-year fixtures and provenance through comparison, map/detail, programme cards and risk copy (C03). Re-read active Search after ownership release. Do not replace an explicitly historical year with a current constant or infer missing records mean no admissions.

## T8 — District provenance · preserve fix, recheck changed Search

`f098f6c` removed fabricated districts from the reviewed source. Verify that the current peer version retains null/unknown handling and excludes invented values from filters/facets. Keep C01 geocoder policy/throttling and C05 missing-coordinate disclosure separate; a map or source read does not prove real-provider acceptance.

## T9 — Phone performance · optional improvement

The current count hook still downloads the catalogue; wider route imports remain eager. Consider a small scope-consistent count/category projection and measured route splitting after access/scoring requirements are settled. Initial placeholder counters and payload/chunk sizes quoted on 7 October are historical. Measure the current build and real mobile journey; avoid a stale duplicated count or arbitrary bundle-size threshold as release proof.

## T10 — Hygiene · reconcile before implementing

The old root Google test helpers were removed; `/stara` redirects to the current landing; storage fallback, the onboarding import cycle and several plural/year fixes are already addressed. Do not repeat those tasks. Continue S01–S06/C53/C54 database-script and transactional-pick safeguards; raw error/invalid-school responses, role-year collection and sort-as-filter metrics require stable-source verification before edits. School reviews are disabled for beta, so moderation/role-year work remains a gate for re-enabling them. Account ownership and blocked-storage/device journeys still need acceptance beyond the fallback source fix.

## T11 — Legal/privacy · preserve decisions, close implementation/manual gates

Use the current legal findings, `docs/legal-decisions-2026-10-10.md`, C43/C46/C56 and the full handoff. D1/D4 consent, retention and erasure choices are settled; reliable withdrawal, deletion recovery, consented cohort/statistics suppression and processor/operator acceptance remain open. Sharing and school reviews stay disabled until their notice/moderation work is approved and verified. Founder-reported OpenRouter privacy settings and accepted Brevo beta use are dated evidence, not independent vendor acceptance. Real payments still require contractual calendar boundaries, durable confirmations/reminders, minor-contract/operator and payment lifecycle gates. Do not shorten the voluntary refund benefit or restore the removed checkout checkbox as an audit fix.

## T12 — Tuition/data/scoring · coherent contract

Church-school tuition is unknown unless actual evidence establishes it; preserve the founder's “Zjistit u školy” decision. Align display, decision tools and matching with known/unknown amounts without guessing from provider type. Scoring projection/parity, programme identity and eligibility require current stable source/data acceptance (B02/C52/C53/C54). Returning schools' old choices remain archived until explicit restoration. The 10 October count is 194 visible; cached prose refresh records and counts are not factual school verification. Review schools 15/94 manually and existing paid-run evidence before any rerun.

## T13 — Documentation · earlier corrections completed; full reconciliation continuing

The listed plan 009/019, source-index, legal-research and dated-report corrections have been made in the continuing review. Do not repeat superseded pricing/schema/checkbox instructions. The remaining whole-project Markdown/source/asset coverage is still being checked. Maintain current facts with dated evidence, distinguish historical observations from live acceptance, and append deferred work to `UNFORGET.md` and the full handoff.

## Explicit sequencing limits

C07's first-confirmed-sign-in ordinary-account trial, C32, C38 and C08 are deferred until after beta by founder decision. The current signup trial is known pending work, separate from the seasonal purchase trial and free-feedback beta. All real billing remains blocked by the payment/legal/service checklist. Current Claude-owned matching/search/special-needs/schema files require release and full changed-source review; the saved 198-test checkpoint does not cover those edits.
