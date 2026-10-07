# Legal, privacy and deployment documentation review — 2026-10-07

> Snapshot of the first pass, with partial coverage. Some items were subsequently fixed or clarified; use [REPORT.md](REPORT.md), [continuation findings](continuation-findings.md) and the handoff for current status. Do not implement a historical finding without re-reading current source.


This is an evidence-backed engineering/documentation audit, not a legal sign-off. Only this report and `legal-docs-coverage.json` were written by this reviewer. Original code, legal copy and documentation were not edited; Claude/other reviewers may be editing the same checkout.

## Coverage and current evidence

The assignment contains 44 files and 14,377 lines. This pass read **27 files fully and two partially: 3,786 lines**, leaving **10,591 lines** for continuation. Actual ranges and before/after SHA-256 hashes are recorded individually in `legal-docs-coverage.json`; no assigned file changed between those snapshots. Large remaining root documents, status/marketing material and other plans remain explicitly pending; this report does **not** claim those lines were reviewed. Every completed file was read as numbered source, with truncated sections reread in smaller chunks. Code outside the assignment was inspected selectively to verify findings, not claimed as fully reviewed.

Live read-only results in `services.json` establish 223 raw school rows and **217 visible catalogue rows**, all 26 probed application tables present, email confirmation enabled, a configured beta cutoff of **12 October 2026 at 23:10 Europe/Prague**, and Stripe **test mode**, with the monthly Price active at 249 CZK/month and an enabled test webhook. These results do not establish latest function/column/grant migration, authenticated RLS isolation, mail delivery, Storage lifecycle, live payment behavior or a complete legal configuration.

## Findings affecting a free beta

### [LEGAL-01] Resolve the separate consent requirement for beta analytics storage

- **Evidence:** `plans/019-beta-feedback-and-analytics.md:44-46` concludes legitimate interest means no parental consent/cookie banner is needed. `frontend/src/pages/Legal.jsx:145-154` repeats that basis and describes browser identifiers as part of the service. `frontend/src/components/BetaEnrollment.jsx:21-27` requires acknowledgement rather than an optional analytics choice. `frontend/src/lib/betaTrack.js:6-20,43-55` reads/writes persistent anonymous, visit and session identifiers and sends behavioral events.
- **Impact:** A child can join only by acknowledging tracking, while the current rationale conflates GDPR legal basis with the separate rule for storing/accessing nonessential browser data. This is a beta launch gate requiring a documented legal decision, not a confirmed instruction to silently switch everything to consent.
- **Effort:** M (decision, state/API/copy changes and verification).
- **Risk:** HIGH — affects enrollment, existing telemetry and under-15 handling.
- **Confidence:** HIGH on implementation; MED on legal classification of this particular research service.
- **Fix sketch:** Have the controller/counsel assess strictly necessary service storage separately from product analytics. Document the legitimate-interest balancing assessment for children. If analytics identifiers require consent, provide a genuine optional choice, withdrawal and appropriate under-15 authorization, with collection disabled until satisfied; alternatively redesign the measurement so the unnecessary storage/processing is removed. Do not treat a required “I understand” checkbox as consent.

ÚOOÚ explicitly distinguishes a possible legitimate-interest basis for first-party analytics from consent to access nontechnical cookies/device storage. This applies even without third-party analytics: [ÚOOÚ cookies Q&A](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies). GDPR consent to online services and contract validity are distinct questions; the Czech consent age is 15: [ÚOOÚ basic guide](https://uoou.gov.cz/verejnost/zakladni-prirucka-k-ochrane-udaju).

### [LEGAL-02] Complete review notice-and-action and correct its promised notifications

- **Evidence:** `frontend/src/pages/Legal.jsx:303-306` promises receipt in the app and a decision sent to the reporter's account email. `server.js:1572-1601` collects only review id, optional account id, reason and good faith, holds the review and returns `{received:true}`. `frontend/src/components/schoolDetail/ReviewCard.jsx:87-111` has no reporter name/contact fields. The report table adds only a reason at `supabase-setup.sql:302-321`.
- **Impact:** An anonymous reporter cannot supply the required contact details or receive a decision. No reviewed route implements a decision/notification workflow, including for signed-in reporters. Public school reviews therefore remain an unfinished moderation/compliance surface even during a free beta. The currently empty live reviews table does not resolve what happens after the first submission.
- **Effort:** M.
- **Risk:** MED — changes moderation records and personal-data handling.
- **Confidence:** HIGH.
- **Fix sketch:** Add a precise electronic notice mechanism with location, reason, required name/contact where applicable and good-faith statement; record receipt, decision, automated action and redress information, and send the relevant notifications. Define a practical operator review procedure. Until implemented, the published copy must describe the actual mechanism truthfully; consider disabling public review publication if the workflow cannot be operated safely for beta.

DSA Articles 16–17 require notice handling, contact information with a limited exception, notification of the decision/redress and reasons for restrictions; micro/small status does not exempt these hosting duties. [Official DSA, Articles 16–19](https://eur-lex.europa.eu/eli/reg/2022/2065/oj?eliuri=eli%3Areg%3A2022%3A2065%3Aoj&locale=en).

### [LEGAL-03] Update the privacy disclosure for implemented parent and result links

- **Evidence:** `frontend/src/pages/Legal.jsx:40-48` describes answers/results and old shortlist sharing, but does not explain payment links exposing the child's first name or pre-account server result snapshots. `plans/018-parent-child-share-links.md:59-68,252-266,673-679` specifies those behaviors and explicitly defers privacy copy to human review.
- **Impact:** Readers are not told about all recipients, bearer-link behavior, data sent before account creation or retention of those records. The first name shown to anyone with a parent payment URL is personal data even though the email and full profile are withheld.
- **Effort:** S after controller decisions.
- **Risk:** LOW for accurate disclosure; MED if retention/permissions change.
- **Confidence:** HIGH.
- **Fix sketch:** Explain separately the live read-only result link, payment/management link and pre-account snapshot: what each shows, who can access forwarded links, how expiry/revocation works and what is retained. Document that expiry stops public access but currently does not delete expired snapshot/handoff rows. Verify all claims against the routes after other agents finish.

### [LEGAL-04] Define retention and assess children's profiling and beta monitoring

- **Evidence:** `frontend/src/pages/Legal.jsx:113-117` keeps account data for the account's lifetime and explicitly states inactive accounts are not automatically deleted. `frontend/src/pages/Legal.jsx:164-167` supplies six months for events/rankings but only “for evaluation and improvement” for feedback/closing answers/reviews. `plans/019-beta-feedback-and-analytics.md:9,27-38` targets up to 170 testers including 8th graders and records detailed behavior. `lib/questionnaire.js:360-476` includes pressure/personality, family tuition affordability and church-school preference questions.
- **Impact:** Retention criteria for research material/screenshots and links are insufficiently specific to establish when the testing purpose ends. Children's scoring/profiling plus longitudinal behavior collection warrants a recorded high-risk/DPIA threshold assessment. Church-school preference is not automatically proof of religion; assess what the complete dataset reveals before classifying it as ordinary or special-category data.
- **Effort:** M (controller decisions plus retention implementation if required).
- **Risk:** MED — deletion can affect analytics and support evidence.
- **Confidence:** HIGH on missing specificity; MED on whether a full DPIA is legally required.
- **Fix sketch:** Create a data/recipient/retention inventory, explicit review/deletion dates or objective criteria, screenshot cleanup policy and a record of processing. Record the children's legitimate-interest balancing and DPIA screening before recruitment; perform a DPIA if the actual risk assessment requires it. Avoid retaining identified research data indefinitely merely because the account still exists.

GDPR requires storage limitation and retention information/criteria, with additional protection for children and high-risk assessment where appropriate. [GDPR Articles 5, 13, 35 and recital 38](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679). ÚOOÚ describes the need to assess legitimate interest and competing rights, particularly for children: [ÚOOÚ DPIA guidance](https://uoou.gov.cz/profesional/qa-otazky-a-odpovedi/posouzeni-vlivu-na-ochranu-osobnich-udaju).

### [LEGAL-05] Verify processor contracts, actual vendors and the operator before publishing categorical claims

- **Evidence:** `frontend/src/pages/Legal.jsx:26-28,80-93` names the controller, Ireland/eu-west-1, Brevo, hosts, model vendor and SCC transfer safeguards as settled facts. `.env`/table probes cannot establish contract acceptance, sender configuration or all production log/backup locations. The prior handoff correctly identifies those as outside-code verification at `docs/reports/2026-09-21-legal-privacy-remediation-handoff.md:86-91`.
- **Impact:** Legal pages can be inaccurate despite working app code. Structured child questionnaire selections sent to an AI service are not made anonymous merely by excluding name/email/free text.
- **Effort:** S–M, primarily controller/provider configuration.
- **Risk:** LOW to verify; MED if provider routing needs restriction.
- **Confidence:** HIGH that evidence is missing; no finding that the stated identities or region are necessarily false.
- **Fix sketch:** Confirm controller authority/contact mailbox, Supabase project region, actual production hosts and log retention, SMTP sender/vendor and all applicable DPAs/transfer safeguards. Confirm OpenRouter input/output logging, training and downstream provider routing settings. Store verification dates and links; change legal copy only to verified facts. An environment override of `OPENROUTER_MODEL` also requires the named model provider to stay accurate.

OpenRouter states downstream providers have differing retention/training practices and that a DPA, when present, governs API/enterprise processing. [OpenRouter privacy policy](https://openrouter.ai/privacy), [OpenRouter data collection settings](https://openrouter.ai/docs/guides/privacy/data-collection). Provider DPAs are available but their existence does not prove this operator's configuration: [Supabase DPA](https://supabase.com/legal/customer-resources/data-processing-addendum), [Stripe DPA](https://stripe.com/legal/dpa).

## Additional gates before real payments

**Free-beta scope decision:** zero money does not automatically exclude consumer digital-service duties. Consumer Rights Directive Article 3(1a) also covers a digital service supplied in exchange for personal data when processing goes beyond supplying that service or meeting legal duties. The required beta feedback and product analytics warrant counsel's assessment of whether that rule applies here; if it does, applicable information, contract-confirmation and withdrawal duties cannot all be postponed until paid launch. [Official Consumer Rights Directive, Article 3(1a)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02011L0083-20260927).

### [LEGAL-06] Clarify the extended refund deadline; initial statutory-breach claim retracted

- **Evidence, corrected by root:** `WITHDRAWAL_DAYS` is **30**, and `withdrawalWindowEnd` adds `30*86400000` to the later of contract/charge timestamps. Terms §6 promises the statutory 14 days; §7 additionally promises a full refund within 30 days and access to the same button. The initial report incorrectly described the implementation as 14 days.
- **Impact:** The current wider window does not establish the alleged loss of the statutory 14-day right. Calendar-day, holiday and DST handling still needs an agreed interpretation of the additional 30-day promise. Treat this as a policy/legal clarification and boundary-test task, not a proven statutory breach.
- **Effort:** S–M.
- **Risk:** MED — affects money and entitlement.
- **Confidence:** HIGH on the arithmetic; legal interpretation of the extended promise requires confirmation.
- **Fix sketch:** Agree statutory versus voluntarily extended eligibility, calendar rules and renewal treatment with the operator/counsel; then implement one server deadline shared with the UI if needed. Test last-day evening, DST, weekends/holidays and year boundaries. Preserve the existing 30-day benefit and do not silently shorten the fresh window after monthly renewal.

ČOI explains that the next day is day one, weekend/holiday deadlines move to the next working day, and sending the withdrawal on the last day is sufficient. [ČOI withdrawal timing for services, section c](https://coi.gov.cz/faq/5-odstoupeni-od-smlouvy-do-14-dnu-u-sluzeb-4/).

### [LEGAL-07] Deliver durable order and withdrawal confirmations

- **Evidence:** `frontend/src/pages/Legal.jsx:210-212` offers access to the mutable terms page. `server.js:2923-3008` returns a withdrawal JSON timestamp but sends no durable confirmation. `plans/018-parent-child-share-links.md:582-583` leaves email delivery out of scope. No reviewed server mail/outbox integration provides contract confirmation, accepted terms version or withdrawal acknowledgement.
- **Impact:** A Stripe setup session saving the card is not itself proof the consumer received all contract terms on a durable medium. A toast/JSON result and a mutable webpage are insufficient evidence of lasting contractual information. The parent payer may not have an account and can lose the child-owned management URL.
- **Effort:** M.
- **Risk:** MED — needs reliable delivery, retries and avoidance of duplicate transactional messages.
- **Confidence:** HIGH on missing implementation; legal document scope to confirm with counsel.
- **Fix sketch:** Snapshot accepted plan/price, trial/charge date, expiry, terms version, withdrawal information and payer contact at the contract boundary; send a durable contract confirmation using a reliable outbox and record successful delivery/retries. Send withdrawal receipt content/date/time and cancellation result independently of the browser's continued existence. Verify the parent-payer recipient and preserve a support/management route if the child revokes a link. Test email deliverability in test mode.

Consumer Rights Directive Article 8(7) requires a durable contract confirmation. Existing Article 11(3) already requires durable acknowledgement without delay when a trader offers website withdrawal submissions: [Official Consumer Rights Directive, Articles 8 and 11](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02011L0083-20260927). This is separate from the new mandatory withdrawal function and timestamped confirmation, which the Czech Ministry of Finance says applies from **1 January 2027**, including non-financial online consumer contracts with withdrawal rights: [MF ČR announcement, 7 September 2026](https://mf.gov.cz/cs/ministerstvo/media/tiskove-zpravy/2026/od-ledna-2027-zacnou-platit-nova-pravidla-na-ochra-65128). The UI is partly built already; January is not a reason to omit the existing website-withdrawal acknowledgement.

### [LEGAL-08] Obtain a decision on minor contracting and the refund cap

- **Evidence:** `frontend/src/pages/Legal.jsx:264-273` accepts minor purchases without verifying parental consent and limits later refunds to unused time after 30 days. `plans/018-parent-child-share-links.md:65-68` deliberately removes the parent-payment checkbox in favor of a contractual statement. Signup records `accepted_terms_at` in mutable auth metadata at `frontend/src/components/AuthContext.jsx:230-235`, without an age/parent authorization branch or accepted document version.
- **Impact:** A statement made by the child or holder of a forwarded payment URL is not independently verified parental authority. A commercial refund policy cannot by itself resolve remedies where a contract is invalid for lack of capacity. This needs founder/counsel resolution; no assertion is made that every 690 CZK minor purchase is invalid or that every under-18 user needs identity verification.
- **Effort:** M, depending on approved evidence model.
- **Risk:** HIGH — changes purchase eligibility and minors' data collection.
- **Confidence:** HIGH on implementation; MED on legal assessment of each actual contracting scenario.
- **Fix sketch:** Identify who contracts on student-direct and parent-link branches, agree an age-appropriate and proportionate authorization/evidence model, and explicitly preserve statutory remedies rather than making the 30-day/prorata policy appear exhaustive. Test actual parent-payer correspondence and refunds. Respect existing founder decisions until this legal issue is resolved, rather than adding a checkbox and calling it verification.

The Czech Civil Code distinguishes age-appropriate acts and representative consent: [official e-Sbírka, Civil Code §§31–32](https://e-sbirka.gov.cz/sb/2012/89). The official indexed text was available; full e-Sbírka rendering was not available through the text browser, so counsel should confirm the current consolidated wording and its application here. GDPR's online-consent age does not settle capacity to contract.

### [LEGAL-09] Confirm seller information and digital-service compatibility disclosures

- **Evidence:** `frontend/src/pages/Legal.jsx:187` names an individual and non-VAT status but no IČO/business-register information. `frontend/src/pages/Legal.jsx:194-200` describes service content but not actual browser/network/storage prerequisites. `PROJECT-OVERVIEW.md:58` says the founder is 25, contradicting the explicitly minor-founder premise of `plans/009-stripe-payments.md:15-20`; neither is evidence of the legal seller's actual status.
- **Impact:** Trader details, contracting party, VAT and compatibility information may be incomplete or incorrect. This cannot be safely fixed by inventing founder age, licence, IČO or legal identity.
- **Effort:** S, after founder/account verification.
- **Risk:** LOW.
- **Confidence:** HIGH that verification/information is missing, not that the stated operator is false.
- **Fix sketch:** Confirm the actual adult operator, business/registration details and tax status; publish the required applicable details. Add factual compatibility/functionality information based on browsers actually tested (internet, account/email and browser storage requirements), including a clear distinction between the available web app and the planned native mobile app.

ČOI explains the technical/software/network compatibility information duty for digital content/services: [ČOI consumer guide](https://coi.gov.cz/pro-spotrebitele/spotrebitelsky-pruvodce/). Stripe permits standard account creation from 13 but requires a guardian owner before under-18 accounts accept charges or receive transfers; “cannot hold any Stripe account” is overly broad: [Stripe age requirement](https://support.stripe.com/questions/can-i-use-stripe-if-i-am-under-18).

### [LEGAL-10] Preserve the promised minor-payment and pre-charge-reminder release gates

- **Evidence:** `frontend/src/pages/Legal.jsx:222-223` openly says no pre-charge reminder is sent. `frontend/src/config/pricing.js:113` sets `TRIAL_REMINDER_IMPLEMENTED=false`. Historical project rules require day-2 reminders before real billing; `plans/009-stripe-payments.md:532-533` treats reminders as out of scope.
- **Impact:** The UI is honest about no reminder, but that does not satisfy the project's stronger real-payment release requirement. A 3-day deferred charge to a minor-heavy audience should not be enabled merely by exchanging test keys for live keys.
- **Effort:** M for reliable scheduling/delivery and cancellation interaction.
- **Risk:** MED.
- **Confidence:** HIGH.
- **Fix sketch:** Parent reviewer should confirm the latest explicit founder decision, then either implement and verify the required reminder or record an explicit revised release decision. Do not present speculative Digital Fairness Act proposals as existing law. A reminder is also product/trust work, independently of what legislation requires.

## Confirmed documentation corrections for the parent to apply

These are precise edit targets, not instructions to overwrite concurrently edited files. Recheck hashes/current diffs first. Preserve dated research/history and add a current-status banner instead of rewriting a historical snapshot as though it was always current.

| File / lines | Wrong or stale claim | Safe correction |
|---|---|---|
| `plans/009-stripe-payments.md:32-82,161-188,218-278,466-500` | Both plans are subscriptions; season must have a yearly Price; all handled webhooks should return 200; old test-clock expectations. | Mark this architecture/verification plan **SUPERSEDED**, with a current summary: monthly is subscription; season uses Checkout setup, saved method and one scheduled PaymentIntent; no season Price; webhook failures must follow the actual retry strategy. Link current source/tests and the new report. Preserve old design as history, never use it for new Stripe setup. |
| `plans/009-stripe-payments.md:20-21,512-526` | Only swapping keys is required; all remaining blockers are non-code; final prices are placeholders. | State test/live Price and endpoint configuration, approved legal identity, durable confirmations, withdrawal calendar bug, reminder gate and live verification remain; 249/690 are locked in current pricing config. |
| `DEPLOY.md:19-23,48-58` | Add every variable with real values; unrestricted proxy trust; CAPTCHA may be omitted and forms still work; only `/beta/*` redirect assumptions elsewhere. | Distinguish no-charge beta from paid rollout; document current server-only beta/admin/ticket/site-gate settings, confirm actual proxy topology, and require matching Turnstile/Supabase CAPTCHA setup. Add current confirmation callback `/email-overen?beta=CODE` and password-recovery allowlist checks rather than relying on obsolete beta landing callbacks. |
| `docs/beta_testing_operations.md:72-75` | Beta signup/resend links return to `/beta/CODE`. | Current `AuthContext.jsx:10-13,238` uses `/email-overen?beta=CODE`. Update URL configuration and cross-device verification accordingly. |
| `PROJECT-OVERVIEW.md:5,15,33,43,52-58` | Native app already exists; ~50–60 schools; universal trial; payments mocked; founder age25. | Web app exists, native mobile app remains planned; 223 raw /217 visible now; season trial only, monthly charges immediately; real Stripe code verified only in test mode. Remove unsupported founder age rather than substituting an assumed age. |
| `docs/beta_testing_logic.md:3-8,43-45,70-72,126,131` | Initial migration entirely pending; generic is_tester/tester status; cutoff is environment constant. | Current authority is `subscription_status='beta'` with database `beta_program_settings.ends_at`. Live tables/cutoff verified on7Oct; latest function/grant/Storage rollout still requires explicit verification. Label original sections as design history or update current facts. |
| `docs/beta_testing_logic.md:92-102,150-156` | External form may automatically prefill account identity; screenshots/dashboard out of scope. | Plan016 explicitly rejected automatic identity prefill and plan019 supersedes v1 scope with private screenshots/admin UI. Keep historical exclusions labeled as superseded. |
| `plans/019-beta-feedback-and-analytics.md:44-46` | Legitimate interest alone proves no storage/parental consent is needed. | Replace categorical legal conclusion with LEGAL-01's unresolved assessment gate; accurately distinguish device-storage consent from GDPR legal basis. |
| `plans/019-beta-feedback-and-analytics.md:54,77` | Script is `simulate-matching.js`; table-presence check5 is complete rollout verification. | Current script is `scripts/simulate-matching.mjs`; include `beta_rankings` and separately verify functions/grants/columns/Storage. Five tables alone cannot prove rollout. |
| `docs/reports/2026-09-21-legal-privacy-remediation-handoff.md:7,74-80,92-96` | Current prose says pages remain drafts, Google Fonts/refund placeholders/current absence of cancellation. | Add an **as-of21September historical report** banner plus present-day verification link. Do not erase useful historical risk evidence; code now self-hosts fonts and publishes filled identity/refund/withdrawal copy, while operational/legal verification remains. |
| `docs/legal-research/01-withdrawal-button.md:30-31`; `03-digital-consent-age.md:23`; `05-pre-contract-information.md:44-47`; `06-dsa-user-reviews.md:29-32` | “Your app” snapshots assert no withdrawal UI, old contradictory privacy text, placeholder seller identity and login-only no-reason reports. | Date those implementation snapshots and add current status: UI/reason/good-faith/contact-point changes exist, but LEGAL-02/07 and manual verification remain. Keep historical legal research dated. |
| `docs/sources/paywall_copy_framing_research.md:3,53-64,90,128,141-143,151` | DMA Art25/gatekeepers/10% fines is described as the dark-pattern rule; unsupported UK/German precedent; copy “passes” compliance. | Correct legal attribution to **DSA (Reg2022/2065) Art25**, explain Art19 micro/small exemption and Art25(2) relationship to consumer/GDPR rules, remove unsupported case-law/enforcement and automatic-pass claims. Generic regulator homepages do not support the alleged precedents. The ordinary consumer/privacy rules still matter. |
| `docs/sources/claude_code_ui_ux_guide.md:17-18,47,65-66,82,93-105` | Required implementation checklist directs7-day trial, monthly trial, fake precision/progress, Claude-generated explanations and unsupported numbers. | Put a clear current implementation override above the reference notes: season3-day trial, no monthly trial, no unimplemented reminder promise, deterministic JS ranking, Gemini default explanations only for standalone questionnaire, dual buyers, dynamic visible count. Treat video-derived psychological percentages as unverified hypotheses, not product facts or mandates. |
| `docs/sources/pricing_research.md:27,61` | Sept–March called a six-month window. | Use seven calendar months for that interval. Historical250–500CZK positioning is not the current690CZKseason price; label original context as dated rather than silently changing research. |
| `docs/sources/README.md:31-33` | `docs/sources/onboarding.md` exists here. | The inventory has no such file; correct to actual archive location after locating it, or remove the nonexistent link. |
| `frontend/src/pages/Legal.jsx:125` | GDPR response promised “within30days”. | Prefer “do jednoho měsíce” for the statutory period, with applicable extension wording if counsel approves; February can be shorter than30days. A voluntary faster internal target is fine. |

The Czech digital-economy bill is still pending as of7October: print69 passed second reading and is proposed for the13October sitting. Therefore the dated legal research's pending-bill statement should not be “corrected” to enacted without new evidence. [Official Chamber history, print69](https://www.psp.cz/sqw/historie.sqw?o=10&T=69). The Digital Fairness Act was still listed as a plannedQ4/2026 initiative, not binding law: [European Parliament legislative train](https://www.europarl.europa.eu/legislative-train/carriage/digital-fairness-act/report?sid=10201).

## Handoff order and acceptance evidence

1. **Controller/founder decisions before child testers:** resolve LEGAL-01, assess children's processing/retention (04) and free-beta consumer-law scope, verify operator/vendors/mailbox (05), decide whether public reviews remain enabled until LEGAL-02 is complete. Confirm whether 12 October is the intended cohort cutoff. Record decisions as dated facts, not assumed legal conclusions.
2. **Beta engineering:** implement the approved telemetry choice, review workflow and privacy disclosures; verify private Storage upload/read/deletion and account erasure with synthetic tester accounts. Confirm normal accounts generate zero beta events. Update the real callback deployment runbook. Use independent review of every changed security boundary.
3. **Paid engineering:** implement06 and07; obtain08/09 decisions; resolve the reminder gate10. Run Stripe test-mode end-to-end for season/monthly, SCA/off-session failure, duplicate/reordered events, retries, cancellation, withdrawal/refunds, deletion/charge races and parent payer/customer separation. Coordinate with backend report for concrete money-path defects.
4. **Documentation:** apply the table above only after current code and live configuration are verified; update authoritative current docs together, keep historical snapshots visibly dated and preserve uncertainty. Do not mark disposable-DB transaction tests or live SMTP as done from JS mocks/table count.
5. **Manual checks the reviewer cannot establish from repo/probes:** actual legal seller/licence/VAT; controller/DPAs/transfer safeguards; monitored support inbox; external confirmation/recovery delivery and spam handling; a real phone/email confirmation on another device; real Supabase RLS/grants/Storage administration; Stripe account ownership/live payout eligibility; counsel's child/consumer/privacy conclusions. Use test money only until all paid gates are resolved.

Grounded improvements after blockers: give the parent payer a durable independent management/support reference; show the actual seasonal expiry year near the purchase button; explain that 217 is the visible catalogue and distinguish removed/filtered raw rows; add a concise child-friendly privacy summary reflecting the approved tracking choice; measure beta usability using minimum data required by approved research questions instead of collecting every available event by default.
