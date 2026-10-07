# Frontend audit — critical-path pass 1 (2026-10-07)

> Snapshot of the first pass, with partial coverage. Some items were subsequently fixed or clarified; use [REPORT.md](REPORT.md), [continuation findings](continuation-findings.md) and the handoff for current status. Do not implement a historical finding without re-reading current source.


This is a **partial, read-only audit**, not a claim that every frontend line is finished. Exact files, ranges, initial/final SHA-256 and pending files are in `frontend-coverage.json`. At this handoff 75 files / 11,463 lines were read completely; 93 authored files / 26,856 lines remain pending. Generated lockfile and binary assets are separately inventoried. No source files were edited by this reviewer; root owns fixes and visual/runtime verification. Context read completely: audit playbook, UI/UX guide, design/DESIGN.md. Searches do not count as full reads.

Findings refer to the source snapshot before root's coordinated fixes. Root announced ownership of Cesta.jsx, pricing.js, PasswordStrength.jsx, Settings.jsx, betaCapture.js, BetaFeedbackSheet.jsx and may own QuizQuestion.jsx next. Re-read diffs/hashes before treating those findings as unresolved.

## Confirmed findings

### [FE-01] P1 — Remove the false self-hosted font privacy claim

- **Evidence**: `frontend/index.html:23-28` loads Archivo and Archivo Narrow from `fonts.googleapis.com`, with preconnect to `fonts.gstatic.com`; `frontend/src/pages/Legal.jsx:132` says fonts load from our own server. Google Fonts is absent from Privacy §4.
- **Impact**: Every page contacts Google before any account/beta notice; the privacy notice incorrectly describes third-party data transfer. This is relevant even for free beta testers.
- **Effort**: S (hours).
- **Risk**: LOW if self-hosting the same font files; verify Czech glyph coverage, weights, fallback and loading behavior.
- **Confidence**: HIGH; direct markup and notice mismatch.
- **Fix sketch**: Prefer serving the existing intended Archivo families locally and removing both Google preconnects and stylesheet. Otherwise obtain an accurate processor/transfer disclosure decision before changing legal text.
- **Verification**: Network panel after fresh load must show no Google font requests; visually check Czech names/headings.

### [FE-02] P1 — Correct the application deadline and roadmap's current month

- **Evidence**: `frontend/src/pages/onboarding/screens/Cesta.jsx:36` hardcodes `Teď · září`; `:83` says applications by 1 March; `:87,91` says season pass lasts exactly to that stop. `frontend/src/config/pricing.js:187-193` and `frontend/src/pages/Legal.jsx:220-222` give access through 31 March.
- **Impact**: A family may plan an application after the real deadline, and the same flow states two different access endpoints. October visitors are told the current month is September.
- **Effort**: S (hours).
- **Risk**: LOW for correcting verified dates; MED for defining next year's date rollover.
- **Confidence**: HIGH on internal contradiction/current month; exact external date is source-dependent. Root independently verified **22 February 2027** against an official primary source and owns this fix.
- **Fix sketch**: Centralize year-specific application deadlines and make the current label accurate. Keep the purchase access endpoint distinct and show a year.

### [FE-03] P1 — Validate optional admission points before advancing

- **Evidence**: `frontend/src/pages/onboarding/screens/QuizQuestion.jsx:188` calls goNext directly; `:149-159` Enter also calls it; number input `:241-251` has min/max but no form submit or checkValidity. `frontend/src/pages/onboarding/quizQuestions.js:611-624` preserves arbitrary numeric strings. Server `lib/onboardingAnswers.js:90-95` rejects non-integers and values outside 0–100; `frontend/src/components/AuthContext.jsx:65` clears the entire stash on HTTP 400.
- **Impact**: Typing 101, -1 or a fractional score proceeds through an apparently valid result; signup persistence then rejects and deletes all stashed answers, silently losing the promised saved result. Tester completion reports an avoidable save error. Browser min/max do not enforce custom button navigation.
- **Effort**: S (hours).
- **Risk**: LOW; keep an explicit skip path and valid 0/100 endpoints.
- **Confidence**: HIGH. Read-only Node reproduction returned server rejection for `{points:'101',studyType:'gymnazium'}`.
- **Fix sketch**: Match server's integer 0–100 contract before Continue and Enter, show an inline associated error, and preserve skip behavior. Protect restored invalid answers too; do not just clamp silently.
- **Verification**: Empty/skip, 0, 100, -1, 101, fractions and invalid browser number input; both keyboard and pointer paths; successful persistence after correction.

### [FE-04] P2 — Stop document Enter from bypassing focused quiz controls

- **Evidence**: `frontend/src/pages/onboarding/screens/QuizQuestion.jsx:149-159` prevents Enter on everything except `.ob-header,.ob-actions,a,textarea` and immediately advances. `frontend/src/components/onboarding/ObKit.jsx:155-179` renders answer choices as buttons; ProfilePanel's expandable strip and the role switch/parent-handoff are also buttons outside excluded wrappers.
- **Impact**: A keyboard user tabs to an answer and presses Enter; their choice is not selected and the next question appears. Enter on the profile/role/handoff controls can advance the question instead of performing their labeled action.
- **Effort**: S (hours).
- **Risk**: LOW if native controls retain their own behavior; inspect all Enter targets.
- **Confidence**: HIGH; preventDefault suppresses native button activation.
- **Fix sketch**: Restrict the shortcut to intended non-control/number-input targets, or use a real form. Preserve Enter/Space on buttons and radio semantics; consider native radios or arrow-key support separately.

### [FE-05] P2 — Preserve the current account at onboarding's account step

- **Evidence**: `frontend/src/pages/onboarding/screens/CreateAccount.jsx:71-118` waits for signed-in profile but only bypasses signup for beta testers; all resolved signed-in normal users fall through to a blank new-account form. `:308` offers generic `/prihlaseni` without `next`.
- **Impact**: A signed-in customer who reopens/reruns onboarding is asked to register again; using their existing email produces the duplicate-account error. The visible account step has no continue-as-current-account path to plan selection.
- **Effort**: S–M (hours/day including persistence decision).
- **Risk**: MED; decide whether an existing onboarding result is replaced or preserved (server currently saves onboarding once).
- **Confidence**: HIGH on navigation/form behavior; saving replacement results is a product decision.
- **Fix sketch**: Show the existing account and a clear continuation. Preserve safe next destination on login. Explicitly define whether a rerun becomes a standalone run or the original onboarding remains; do not silently overwrite personal answers.

### [FE-06] P2 — Give all checkout entry points the same date and trial terms

- **Evidence**: `frontend/src/pages/ParentPay.jsx:164-209` and `frontend/src/pages/SubscriptionExpired.jsx:120-195` start checkout with trial length and price but no computed first charge date. `frontend/src/pages/onboarding/screens/Platba.jsx:69-73,116-128` shows the date; Terms `Legal.jsx:219-223` says the charge date is shown when ordering. `frontend/src/config/pricing.js:320-321` says a one-time plan has nothing to cancel even though Settings and Terms permit trial cancellation.
- **Impact**: Parents/returning users receive weaker money disclosure than onboarding users, and trial cancellation wording contradicts the actual feature. Near a season boundary the frontend also omits the exact end year granted by the backend.
- **Effort**: M (day-ish including checkout contract tests).
- **Risk**: MED; derive dates from server checkout terms instead of independent browser clocks if possible.
- **Confidence**: HIGH on differing screens and cancellation wording; legal sufficiency needs legal review.
- **Fix sketch**: Use one reusable order summary based on authoritative server terms: due today, exact first charge date/time zone, amount, recurrence, access end date, cancellation and withdrawal. Root owns the simple trial-cancellation wording correction; full summary is a planned improvement before real billing.

### [FE-07] P2 — Mask sensitive status text as well as form controls in beta captures

- **Evidence**: `frontend/src/pages/Settings.jsx:282-284` puts a pending email in success text; `:451-454` renders that notice outside the private profile section. `frontend/src/components/BetaFeedbackSheet.jsx:34` collects text_before directly, bypassing `publicElementText` email redaction. `frontend/src/components/PasswordStrength.jsx:38` renders a matched substring of the typed password; strength UI is outside a data-private wrapper in the security form. `frontend/src/lib/betaCapture.js:17` masks only input/textarea/data-private.
- **Impact**: An intentional beta screenshot or text suggestion can automatically include email/pieces of credentials despite the private-field masking promise. Preview and explicit submission reduce risk but do not make the mask complete.
- **Effort**: S (hours).
- **Risk**: LOW; verify screenshot layout remains stable and public copy suggestions still function.
- **Confidence**: HIGH on the exposed DOM paths; no live screenshot or upload performed.
- **Fix sketch**: Mark all auth/security/personal status output private, mask strength output, and apply consistent redaction to text_before/text_after. Root has claimed these files for this safe fix.

### [FE-08] P2 — Stop explanations from contradicting school language data

- **Evidence**: `frontend/src/lib/matching.js:119` gives `hit:false` for every `language:'trochu'` answer; `:394-399` interprets this as the school having standard language coverage rather than expanded. `schoolFeatures.js` can simultaneously set `language:true` for a foreign-language/bilingual gymnázium.
- **Impact**: Results can tell the student a bilingual school does not have expanded language teaching, a false school fact on a core decision surface.
- **Effort**: S (hours).
- **Risk**: LOW if copy reflects the actual criterion/preference and scoring stays unchanged.
- **Confidence**: HIGH. Node reproduction with English-taught `79-43-K/61` returned `features.language:true`, language score0.7/hitfalse, and `Jazyky tu jedou v běžném rozsahu, ne rozšířeně.`
- **Fix sketch**: Distinguish failing a requested expanded-language criterion from answering that basic languages suffice. Use actual feature data to state school facts; add a focused positive/negative explanation check.

### [FE-09] P2 — Handle blocked browser storage without crashing auth pages

- **Evidence**: `frontend/src/supabaseClient.js:11-35` directly accesses localStorage/sessionStorage without guards; `getRememberMe` directly reads localStorage. Login.jsx:11 and Settings.jsx:84 invoke it as render initializers. Other project storage helpers correctly catch access exceptions.
- **Impact**: Browsers/embedded contexts that deny storage can white-screen Login/Settings or fail token persistence instead of showing a usable auth error. This matters for school devices and in-app browsers.
- **Effort**: S (hours).
- **Risk**: MED; storage fallback affects session lifetime/security promises.
- **Confidence**: HIGH on unhandled access exception path; target-browser prevalence is unverified.
- **Fix sketch**: Introduce guarded access and a documented in-memory/session fallback, with explicit user feedback when persistent auth cannot work. Verify with storage throwing on both read/write, plus normal remember-me behavior.

### [FE-10] P3 — Qualify daily prices by actual season duration

- **Evidence**: `frontend/src/config/pricing.js:62,182,355-357` always divides the seasonal price by212 days; `frontend/src/pages/onboarding/screens/Plan.jsx:122-125` displays it as `na den`. Actual access ends at a fixed March deadline, so October/February purchases get fewer days; rollover can grant longer. The savings comparison at Plan:255-261 names seven months, but the daily figure has no equivalent qualifier.
- **Impact**: The same 690Kč pass appears to cost3.25Kč/day even when the buyer receives a shorter period. This is a misleading price comparison candidate, not an arithmetic rounding error.
- **Effort**: M (day-ish to share authoritative date terms).
- **Risk**: MED; current/completed season rollover must match backend and Terms.
- **Confidence**: HIGH on hardcoded denominator; disclosure/legal decision belongs to maintainer.
- **Fix sketch**: Either show only the total price/end date, or calculate/qualify the daily average using the granted window. Do not modify price or pass duration as an audit bug fix.

## Decisions / investigations, not automatic fixes

- **Guardian checkpoint discrepancy**: Platba.jsx:33-39 documents an unticked age/guardian checkpoint; headline at215 still says `potvrzení rodiče`, but no checkpoint appears in the rendered order form. Current Terms:259-261 say consent/age is not checked at ordering; signup's ConsentCheckbox only asserts age15+ OR guardian permission for the account. The project instruction requires a real student-side parental-confirmation checkpoint, yet newer implementation may deliberately have changed this. Confirm the current policy and adult Stripe owner/contracting identity; do not add a legal checkbox based solely on stale comments.
- **Password-reset expiry**: ForgotPassword.jsx:51 says reset links expire10minutes. Source cannot prove the live Supabase Auth email OTP expiry setting; check the actual dashboard and delivered template (not API key exposure).
- **Trial reminders**: pricing.js TRIAL_REMINDER_IMPLEMENTED=false; Zkusebni explicitly says not promised, Terms says none sent. Project instruction calls day2 reminder mandatory before real billing. Beta is not charged, so log a real-money gate, not a beta access blocker.
- **Misleading guide/design drift**: docs/sources/claude_code_ui_ux_guide.md was fully read and still mandates endowed progress, fake labor waiting, seven-day trial and Claude explanations. Current steps.js intentionally removes artificial progress; pricing uses3-day seasonal trial; DESIGN.md forbids fake calculating yet Calculating.jsx still stages3×1050ms; design states no percentage yet some real surfaces now use it. Root/docs auditor should annotate historical guidance and resolve present specification. Existing design/DESIGN.md also says Google Fonts until self-hosted and references223schools, conflicting with privacy/facts217.
- **Confidence caveat misattributes unknown data**: matching.js:342-350 blames skipped questions whenever confidence<0.6, although confidence also falls when school-side facts are missing. Improve the explanation only after distinguishing skipped answers vs unknown facts; do not imply a student skipped when they answered every question.
- **Per-option reassurance overpromises**: quizQuestions.js:178-180 says choosing odborná school increases interest weights; weightsFor only changes weights for priority. certainty reassurance similarly claims more focus weight while implementation changes breadth score. This is copy/implementation decision drift; reconcile copy with actual math, preserve scoring until owner approves algorithm changes.
- **Public development preview**: frontend/public/mobile-preview.html ships an iframe hardcoded to localhost5173. It is a local authoring utility, not a functioning production preview; remove from public deployment or label/relocate it if not intentionally exposed.
- **Browser APIs**: native dialog showModal, matchMedia.addEventListener, crypto.randomUUID and Web Share/Clipboard need target-device tests; no browser compatibility claim is made from source alone. Web Share is invoked after an async network request in parent/payment links, which can lose transient activation on some browsers; check real iOS Safari before altering fallback semantics.

## Considered and rejected

- **Normal Supabase onAuthStateChange→getSession deadlock**: AuthContext.jsx:168-179 awaits loadProfile→fetchMe→request→getSession, matching older Supabase warnings. Root inspected the installed current auth-js implementation and confirmed default lockless getSession and queued initialization notifications. Therefore the old-version deadlock claim is **rejected for this installed version**; do not apply an unneeded fix based solely on old documentation. Nested TOKEN_REFRESHED/stale-token cases remain a separate runtime investigation if evidence appears.
- **ParentPay always says active for ended plans**: source initially looked suspicious, but server.js:2050-2056 only returns a plan when paidAccessActive or a season charge remains scheduled. No unconditional ended-plan finding is claimed. Verify scheduled-overdue behavior with payment audit rather than guessing from frontend alone.
- **Slim programme response loses per-obor cutoffs**: API comments omitted cutoff, but server.js:1170 includes cutoff and slimProgramsForList computes it. No scorer defect is claimed from the stale API comment.

## Next pass — required to satisfy full-project request

Read every pending file in frontend-coverage.json, especially Search.jsx, Questionnaire.jsx, landing2/Landing.jsx+PragueScene.js, Home.jsx, school detail/decision tools, Reveal/Activated/handoff/share routes, every CSS file and generated token source/scripts. Inspect called helpers fully. Then re-read diffs of coordinated fixes and refresh SHA coverage. Root owns browser/device checks and baseline build/lint; this reviewer does not claim either was performed.
