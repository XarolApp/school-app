# Beta and payment readiness handoff — checkpoint

This plan is actionable now, but the full audit is still continuing. Use [REPORT](REPORT.md) for scope/evidence and the detailed findings for reproductions. Do not interpret items absent from this checkpoint as reviewed and safe. Work on one claimed file at a time; check the shared coordination file, working-tree changes and hashes before editing. Never overwrite another reviewer's changes. No new subagents are authorized by this handoff.

## 0. Preserve decisions and define the release boundary

Owner: founder/controller plus implementing agent. First write an access matrix covering every page and API: anonymous, authenticated without access, valid account trial, monthly, season, expired/canceled, developer and beta. Preserve public landing/onboarding and **public school details from the landing map**, along with functional authentication/legal/account-management and scoped share/payment links. Premium catalogue/search, comparison, matrix and account decision tools require valid access. Public detail data is intentionally public; a client-only guard cannot conceal ranking inputs delivered anonymously. Do not use a browser referrer as an access credential.

Record whether the immediate release is strictly no-charge invited beta. Verify the deployed environment does not activate real-money paths for uninvited normal accounts. Do not change plan prices, trial duration, season duration or parental-checkpoint policy as an incidental bug fix.

Founder clarification, 7 October: beta access is free for feedback; payment screens are a preview only and must not create a purchase trial, open Stripe or require payment to continue testing. Ordinary accounts' three-day access trial must start at the **first confirmed sign-in**, not the signup trigger's current timestamp. Implement that change separately from the seasonal deferred-payment trial. Add a once-only server/database transition with confirmation checks and concurrency protection; define migration of existing ordinary accounts explicitly, preserving paid/beta/developer entitlements and preventing sign-in/refresh/reconfirmation from restarting access. Do not run a broad live trial reset.

Acceptance: documented route/API matrix and real HTTP tests for each access state; school detail still opens from a landing dot; expired accounts can manage/cancel/withdraw/delete; public links reveal only their approved projection; beta never enters Stripe.

Trial acceptance: confirmation delayed several days still grants the full normal window on first confirmed sign-in; merely signing up/confirming without sign-in does not consume it; simultaneous first requests initialize one window; repeated sessions/password recovery do not extend it; beta preview does not change billing or tester deadlines. Update schema, access checks, frontend state and active documentation together. Existing mocked tests cover beta checkout rejection and stale webhook/scheduler exclusion, but do not prove deployed SQL or the full UI journey.

## 1. Repair and verify the beta schema

Owner: database/backend agent. Evidence: `services-2026-10-08.json`, B04/B05 and plan 019. `beta_profile.role_note` is now present; retire the missing-column diagnosis. Inspect the latest signup/profile functions and grants and prepare only the still-missing reviewed migration. Column presence does not prove the entire current SQL has been applied. Do not rerun the entire schema on production merely because the table count looks right. The observed beta cutoff is now 18 October at 23:59 Europe/Prague; verify the deployed enrollment/gate configuration agrees with plan 020.

In a disposable database, run a fresh installation and at least two reruns. Assert primary/unique/FK/check constraints, trigger definitions, function `EXECUTE` grants and RLS policies, including the repaired `review_reports` PK. Exercise authenticated repeated reports and anonymous notices. Test accounts A/B/anonymous must not read/write each other's private rows, enumerate share/payment records, call service-only RPCs or access private screenshots. Verify account erasure and orphan screenshot cleanup separately.

Acceptance: saved migration diff and isolated test results; reviewed live application followed by read-only verification of columns/functions/grants and a complete synthetic beta enrollment/profile/feedback/renewal/expiry journey. A table-presence check or mocked JS test is insufficient.

## 2. Make premium boundaries and matching consistent

Owner: backend/frontend agent. Evidence: B01/B02/B08 and founder decision above. Introduce a canonical scoring projection including programmes, extracted fields and merged-school handling at every scorer call. Onboarding enrichment was partly fixed; re-read current code before editing. Compute selectivity against a stable catalogue context rather than each request's subset. Keep exam-point synchronization independent of the decision to create a ranking; confirm whether points-only answers should create a run.

Apply the access matrix coherently to routes and endpoints. Preserve the public school-detail exception and approved bearer-link projections. Reconcile marketing/paywall copy with the result of that matrix.

Acceptance: actual-scoring-engine regression proving the same school/answers/data have identical scores on catalogue, detail, favorites, application picks and comparison for the same backend answers. Separately resolve the intended browser-onboarding versus translated saved-run score contract: the engines differ, so equal display curves do not prove parity. Include private/public programmes, unknown data, extracted activities and merged schools. Tests must not substitute a fake scorer. Verify all access states with real HTTP requests.

## 3. Prevent shortlist and autosave data loss

Owner: database/backend agent, then frontend agent. Evidence: B03 and decision-tool findings. Replace delete-then-insert picks with a service-only transactional RPC serialized per user. Validate school and selected programme before commit; enforce a maximum of three and unique priorities. Handle reorder requests arriving out of order and note edits with explicit save/error/retry states or a versioned mutation protocol.

Acceptance: failed FK/insert leaves the old shortlist intact; two concurrent replacements leave exactly one valid intended set; stale requests cannot overwrite a later confirmed order/note. Run actual PostgreSQL concurrency/rollback tests, not only fake PostgREST assertions.

Also resolve account-scoped search/favorites state and stale feedback context in continuation findings C02/C04. Reset or re-key private state on account/access changes, cancel stale requests, and bind a feedback draft's selection/screenshot to its original page or explicitly clear it. Acceptance includes account A → sign-out → account B in the same tab, a late A response, and closing/reopening feedback on a different page.

## 4. Resolve beta privacy, moderation and capacity gates

Owner: controller/legal adviser for decisions; implementation agent for the approved result. Evidence: LEGAL-01–05 and B06. Assess optional device-storage consent separately from GDPR legal basis, children's balancing/DPIA screening, research retention and screenshots. Provide accurate parent/result-link disclosures. Verify actual controller, region, vendors, DPAs, downstream AI routing and monitored support inbox.

Complete review notice/decision/contact/notification workflow before relying on published promises; alternatively agree a clearly scoped beta restriction until moderation can be operated. Do not invent compliance from an empty reviews table. Agree expected simultaneous classroom size, then set authenticated action budgets and a safe outer IP abuse budget. Verify proxy topology before changing trust settings.

Resolve public Nominatim usage before a classroom cohort (C01). Its one-request-per-second limit applies across the whole application, and its policy prohibits submitting personal data; the current field invites a home address and calls the public endpoint directly. Choose an approved address provider/architecture or restrict/disable that input for beta, then align inline privacy wording and the existing recipient disclosure. Do not introduce a proxy that merely relocates an unassessed personal-address submission. Test aggregate throttling, caching, provider failure and the approved coarse/private-location behavior. Retain visible OpenStreetMap attribution and lawful browser referrer behavior for tiles.

Acceptance: dated controller decisions and accurate notices; no optional collection before any required authorization; withdrawal of analytics choice works; normal accounts produce no beta events; screenshot masking/upload/read/deletion works; reviewer/reporter notifications and operator procedures exist; one shared-IP cohort can finish the intended journey without quotas blocking legitimate users.

## 5. Complete beta runtime and service verification

Owner: implementing/review agent with founder for dashboards/devices. Verify production CSP/security headers, deployment site gate, CAPTCHA/Supabase settings and redirects, configured OpenRouter generation, model identity and error behavior. Local OpenRouter authentication is now HTTP 200 with a prefixed model identifier; actual generation/provider route and deployed state remain unverified. Use test accounts and test money only. Do not launch the normal local backend casually against production: it starts scheduled workers.

Exercise signup → confirmation on a second device → profile → quiz → saved result → search/detail → comparison/picks/notes → screenshot/text feedback → renewal → cutoff/expiry → account erasure. Include resend, password recovery, blocked storage, interrupted network, refresh/back/forward, keyboard/focus and long Czech text.

Acceptance: recorded desktop Chromium plus real iOS Safari and Android/browser journeys at supported sizes; no overflow/hidden CTA or lost choices; external email arrives with correct origin/destination; private data remains masked and inaccessible across accounts. Emulating a mobile viewport does not establish real-device compatibility. Save manual failures to the final report rather than checking them off from source inspection.

Correct and test mixed admission-year labels in comparison (C03), and explain schools absent from the map because coordinates are missing (C05). Use current/older/missing programme fixtures together; every displayed capacity/rate/ratio must retain its source year. Do not imply that missing records prove a school had no admissions or no newer data.

Repair landing readability before beta (C09): the whole-hero scale reduces landscape body text to about 6.5px and the primary button to 25px height. Use a normal-sized layout that can scroll in small/short windows; test 320px, landscape, zoom/text enlargement and dynamic browser chrome. Preserve keyboard/non-WebGL access to the public school-detail exception (C10). Track compact-header polish (C08) and the active onboarding demo's retry/playback/accessibility work (C11) separately; the demo is rendered in Welcome, not only the inactive Home page.

## 6. Redesign the payment lifecycle before real billing

Owner: payment/backend/database agent after architecture review. Evidence: P01/P02/P03/P05/P06/P07/P08. Add a minimal durable purchase/attempt/withdrawal/refund ledger and explicit state transitions. Keep each purchase's agreed terms, price/currency, completion time, access window, Stripe Checkout/SetupIntent/PaymentIntent/subscription IDs and cancellation/withdrawal state. Reserve/reuse/expire checkouts per account; correlate fulfillment and refunds to purchase identity; record processed events and reconcile unordered snapshots against current Stripe state.

Atomically claim scheduled charge work. Cancellation racing Stripe requires persisted cancellation intent and compensating reconciliation/refund where needed; a single pre-charge re-read does not close the race. Persist ambiguous attempts and reconcile before another create after Stripe's idempotency retention. Distinguish temporary failures, declines and SCA, with an authenticated recovery/cancellation path. Keep withdrawal progress resumable independently of entitlement status; show pending versus succeeded refunds accurately. Refund only charges belonging to the withdrawn purchase.

Acceptance scenarios: simultaneous checkout requests/completions; late prior checkout; duplicate and A/B/A setup events; old success/failure after withdrawal or replacement; subscription update after deletion; cancel/withdraw before claim, during charge and after success; network timeout/5xx/decline/SCA; database/webhook outage beyond 24 hours; unrelated recent customer charge; cancellation webhook followed by refund failure and retry; pending/failed refund. Assert Stripe objects, ledger, entitlement and user-visible outcome. Do not fix a stranded season account merely by clearing its due timestamp while leaving ambiguous charges untracked.

## 7. Correct contractual payment boundaries and communication

Owner: payment agent plus operator/legal adviser. Evidence: P04/P09, FE-06/10, LEGAL-06–10. Use verified Checkout completion time for the seasonal three-day window, not Session creation. Record one authoritative order summary shared by onboarding, parent pay and returning-customer checkout: due today, first charge/date/time zone, amount, recurrence, actual access end/year, cancellation and withdrawal. Remove or qualify the fixed 212-day daily price. Explicitly support the configured Stripe endpoint/client API shapes and newly paid rows with missing expiry.

Define the statutory versus voluntary 30-day refund promise and renewal/calendar boundaries without shortening the existing benefit. The prior 14-day breach allegation was retracted. Resolve minor-contract evidence, seller/business details and parent-payer management/customer separation. Implement reliable durable order/withdrawal confirmations and the project's mandatory day-2 reminder, or obtain an explicit revised founder release decision. Use an outbox with delivery/retry records and cancellation-aware scheduling.

Acceptance: delayed Checkout completion grants the full promised window; season boundary/year and DST cases agree across UI/server/terms; configured-version Stripe fixtures and real test-mode webhooks work; durable emails arrive for the correct payer; reminder and receipt tests are recorded; legal/operator decisions are dated. Test new direct season payer customer creation/method attachment and parent-link purchase independently.

## 8. Safeguard maintenance and data refreshes

Owner: data/backend agent. Evidence: [S01–S06](script-findings.md). Before using `reset-test-account.js`, restrict it to an explicitly designated disposable Supabase project/account and reconcile Stripe objects instead of dropping billing references. A test Stripe key alone is not a database-environment boundary. Keep this helper out of production maintenance until its safeguards are verified.

Before any admission refresh, validate workbook headers/year/ranges and stage the complete replacement. Replace programme rows and associated school summaries transactionally, or publish a validated version atomically. Any failed delete/update/insert must fail the run and preserve or restore the old complete dataset. Resolve duplicate REDIZO ownership explicitly and confirm official blank/suppression semantics before mapping unknown counts to zero. Add a database rollback/failure test and a small known-workbook fixture; do not test data-loss handling against production.

Acceptance: reset refuses production/non-disposable identities and cannot strand live billing; failure in the second programme chunk leaves the previous published dataset unchanged; older imports cannot silently replace newer summaries; required-header changes and malformed years fail before writes. Preserve source year/provenance and produce a reconciliation summary with a nonzero exit on partial failure. Website/extraction backfills must condition their writes on unchanged intended source fields and document when dry runs still consume paid provider calls.

The extractor's reproduced canteen-negation and failed-preservation-query bugs are now fixed with targeted regressions. Do not repeat those code fixes. Review existing meal records 118/146/228 against their stored URLs/current school pages, then propose only evidence-backed corrections. Preserve named off-site school-arranged lunches as a separate case from self-provided food or a generic nearby restaurant. Reconcile dependent structured fields when their base prose is refreshed; do not blindly rerun a paid extraction. Scrape manifests/CLI scope and geocoder precision remain S07–S10 maintenance work.

## 9. Finish documentation and final release review

Owner: reviewing agent. Read every still-pending authored file in the coverage inventory and all changed diffs; distinguish generated/binary/external reference material explicitly. Update authoritative active docs with verified present facts; label historical plans/research rather than inventing completed migration/testing. Deduplicate Claude/Codex findings and retire resolved items with commit/evidence links. Keep improvement suggestions separate from beta blockers and paid-launch blockers.

Acceptance: final report contains complete coverage accounting, fixed/open findings, exact test/service limitations, ordered implementable work and founder manual checks. No claim of “ready” while a required gate or full-review requirement remains unverified. Commit/push coherent verified chunks using specific paths; never stage secrets or unrelated untracked work.
