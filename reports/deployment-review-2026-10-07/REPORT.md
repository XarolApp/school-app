# Full-project deployment review — in progress

**Status, 7 October 2026:** the requested every-file review is **not complete**. Do not treat this checkpoint, the Claude review, a successful build, or the live table count as beta release approval. Remaining files and exact read ranges are recorded in the coverage ledgers below. Codex is continuing solo at the founder's request; stopped reviewers' saved work remains evidence, not a claim of completed coverage.

## Current release conclusion

**Do not enable real payments.** The current implementation has unresolved duplicate-purchase, cancellation/charge race, event-ordering, recovery and refund-integrity defects. These need a coherent purchase lifecycle change, not a collection of wording patches. See P01–P08 in [backend findings](backend-findings.md) and the ordered [handoff plan](HANDOFF-PLAN.md).

**A restricted, no-charge beta still has release gates.** The live database lacks `beta_profile.role_note`, while the profile endpoint writes it. Premium-route/API boundaries, consistent matching inputs/scores, transactional application picks, classroom rate limits, review moderation, telemetry/storage consent and operational/privacy verification remain unresolved. Latest SQL must pass a disposable fresh-install/rerun and authenticated isolation check before any reviewed live migration. Existing beta/Stripe separation is useful, but does not establish the whole beta journey works.

## Founder decisions to preserve

- Valid trial, paid or beta access is required for the premium app. Landing and onboarding are public. **School details opened through a landing-map dot are an intentional public exception.** Do not gate all school-detail URLs as a shortcut. Authentication, email verification/recovery, legal pages, account/cancellation/withdrawal management and explicitly scoped bearer-link journeys must remain reachable as their purpose requires. Implement one documented frontend/API access matrix; do not infer authorization from `Referer`.
- Prices remain 249 Kč/month and 690 Kč/season; season has a three-day deferred charge, monthly has no free trial. Changing the commercial model is outside a simple audit fix.
- The parental checkpoint was deliberately removed in the September product decision. Resolve legal contracting/evidence questions explicitly; do not reintroduce a checkbox from superseded instructions and call it verified parental consent.
- Fix certain small bugs; report policy, architecture and uncertain legal changes for approval/implementation. No new subagents.

## Verified fixes

Codex fix commit **`14cce20`**, included in `main` and `origin/main`, corrected quiz integer/range and keyboard validation; masked password-derived/status text and redacted feedback text; rejected malformed telemetry items; corrected the admission roadmap dates/current-month wording; distinguished unknown programme qualification/JPZ facts; removed false bilingual-school explanations; corrected seasonal trial cancellation and shared-shortlist wording. These changes have targeted regression coverage where meaningful.

Claude Code independently committed font self-hosting, signed-in report insertion and repeat-schema primary-key repairs, scorer enrichment on onboarding, newer Stripe payload parsing, several verified copy fixes and production dependency updates. Its final source review was also partial. See [Claude report](../claude-review-2026-10-07/REPORT.md); re-review changed hashes rather than counting earlier source reads as current automatically.

Codex fix commit **`f098f6c`**, pushed to `main`, removes fabricated Prague districts, uses “bez maturity” rather than assuming every non-maturita programme awards a vocational certificate, states missing admission data neutrally, corrects Czech plurals and year wording, exposes selected filter states, and restores focus when applying a filter. Synthetic browser checks covered search, map cards, detail and comparison; the missing-data detail fits at 320px without horizontal overflow. [Search evidence](search-missing-data-desktop.jpg), [mobile detail](school-missing-data-mobile.jpg). Lint/build passed after the final changes; the seven existing lint warnings remain.

## Verification evidence and limits

- Root tests: **127 passed**, including the new redaction, malformed analytics and language-explanation regressions. [Output](backend-tests-after-fixes.txt).
- Current production dependency audits: backend and frontend both report zero known advisories. The full backend audit still reports the development-only `xlsx` dependency as high severity; review the importer/update path before consuming untrusted workbooks. See `*-audit-*-current.json`.
- Frontend lint: zero errors, seven warnings in the recorded run. Production build passes. [Lint](frontend-lint-after-fixes.txt), [build](frontend-build-after-fixes.txt). Large bundles remain a performance concern; a build is not a device test.
- Synthetic local browser checks verified quiz `-1`, `101`, fractional and restored-invalid rejection, valid 0/100/skip, native answer-button Enter behavior, unknown programme labels and the corrected mobile roadmap. These used a local fake backend, not customer records. [Mobile roadmap](admission-roadmap-mobile.jpg).
- Read-only service checks on 7 October: **223 raw school rows / 217 visible catalogue schools**, 26 declared tables present, anonymous table probes returned zero rows, email confirmation enabled, beta rolling window 48 hours, configured cutoff **12 October 2026 at 23:10 Europe/Prague**. Latest profile column is missing. Anonymous reads do **not** prove cross-account RLS, RPC grants, constraints, triggers or Storage isolation. [Structured evidence](services.json).
- Stripe probe: test mode, active CZK 249 monthly Price and enabled HTTPS webhook with API version `2026-08-26.dahlia`. No live-money lifecycle, receipt delivery or payout eligibility was established. The installed older SDK and newer endpoint still require an explicit supported-version contract despite the added payload adapter.
- Configured local OpenRouter credential returned HTTP 401. This proves that local configuration fails authentication; deployed credentials were not inspected and must be checked independently. Do not silently substitute a new model/provider.
- No production SQL/data writes, real charges, mail sends, account deletions or deployments were performed. Real-phone/browser, mailbox, legal-operator and provider-contract checks remain manual/staging gates.

## Findings and corrections to earlier drafts

Detailed evidence, confidence and remediation are in [backend findings](backend-findings.md), [frontend findings](frontend-findings.md), and [legal/privacy findings](legal-docs-findings.md). Those first-pass documents describe their original snapshots; use this report and the handoff for current resolved/open status.

Additional solo-review findings and their confidence are tracked in [continuation findings](continuation-findings.md). These include the public geocoding provider's aggregate traffic/personal-data restrictions, account-change state handling, mixed admission years, and feedback drafts attached to a later page. Items supported only by control-flow inspection explicitly remain to reproduce in the browser.

**Retracted:** LEGAL-06 originally assumed a 14-day implementation cutoff. The actual code grants **30 days**. A statutory 14-day breach was not established. Interpretation of the additional commercial promise and calendar/DST/renewal boundaries remains a clarification/test task, not a proven legal violation. The installed Supabase version also did not substantiate the initially suspected ordinary auth-callback deadlock; do not present an old-version warning as a reproduced current defect.

**Historical documentation:** plan 009's season subscription architecture and key-swap-only launch claim are superseded. Current season payments use Checkout Setup mode and one scheduled PaymentIntent. The UI guide's seven-day/monthly trial, fake progress/waiting and unverified psychology numbers are not current implementation requirements. The paywall research confused DSA Article 25 with the DMA and overstated enforcement examples; corrected references do not constitute legal approval. Legitimate interest for personal-data processing does not alone settle optional browser-storage consent; [ÚOOÚ explains the distinction](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies).

## Coverage and remaining work

The baseline inventory contains 769 relevant files and 180,568 text lines, including generated/reference material. It is an inventory, **not a completed-read count**. Source can change during the review. Read ranges and SHA-256 snapshots are maintained in [backend](backend-coverage.json), [frontend](frontend-coverage.json), [legal/docs](legal-docs-coverage.json), [tooling](tooling-coverage.json) and [root continuation](root-coverage.json) ledgers. Generated dependency lockfiles, district geometry, binary assets and scraped external corpora require explicit structural/provenance treatment, not a false claim of line-by-line authored-code inspection.

Still required: remaining frontend pages/components/CSS, scripts/tooling, root instructions and long active docs/marketing/design/reference files; review all subsequent diffs; finish Markdown corrections; verify deployed headers/configuration and isolated database behavior; complete available browser journeys; produce the final release checklist and manual verification list. Deferred work is also tracked in [UNFORGET](../../UNFORGET.md).

Recommendations beyond defects will be separated from release requirements in the final report: a consistent server-derived order summary, clear missing-data provenance/year labels, a concise child-friendly privacy summary, resilient autosave/retry feedback and measured mobile bundle reduction. These are proposals, not silently approved product changes.
