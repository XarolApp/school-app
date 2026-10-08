# Solo continuation findings — 7 October 2026

This supplements the original partial-review snapshots. Open items below are not automatically approved implementation changes. Confidence and verification limits matter; the full review is still in progress.

## C01 · P1 beta gate · Public address geocoder is unsuitable without a provider/input decision

**Evidence:** `frontend/src/components/SchoolMap.jsx:231` sends the entered address directly to the hardcoded public Nominatim endpoint. The UI invites a home address and says “Adresu ani polohu nikam neukládáme.” The request has no application-wide budget or cache/provider-switch configuration. No personal address was submitted during this review.

The [official Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) limits total traffic per website/application to one request per second, requires an identifiable request/attribution, and prohibits submitting personal data or confidential material. It also calls for the ability to switch services. A browser-local debounce cannot enforce an aggregate classroom budget. The privacy policy already discloses OSMF/address/IP transfer; do not report the recipient as omitted.

**Action:** controller/provider decision, then implementation. Either use a suitable approved provider/architecture with documented personal-address handling or restrict/disable that input for the beta. Align inline wording with actual storage/recipient behavior; verify aggregate throttling, cache, failure states and provider switching. Proxying alone does not resolve the personal-data restriction.

The [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/) separately requires visible attribution, ordinary browser identification/referrers and caching; service is best effort. Keep these requirements in the security-header/provider design. Current interactive Leaflet usage is not evidence of a bulk/offline violation.

## C02 · P1 · Search does not re-key fetched private state when the account changes

**Evidence:** `frontend/src/pages/Search.jsx:353–374`: the catalogue fetch depends only on `loadTick`, despite authenticated match data being attached by the API. Favorites fetch depends on two booleans rather than the user ID, never clears on sign-out/access loss and has no stale-request cancellation. A direct A → B session change with both flags true does not refetch, and an outstanding A favorites response may update state later.

**Confidence:** confirmed effect/state control flow; a cross-account browser reproduction remains required. Source inspection does not establish that all normal sign-out paths preserve the mounted page. Do not label this as proven server-side cross-account disclosure.

**Action:** use account/access identity in requests and state ownership, cancel or discard stale results, and clear inaccessible private state. Re-read after access-matrix work, which may change mounts. Test same-tab A → sign-out → B, direct identity change, access expiry and delayed A responses. Check analogous fetch effects elsewhere.

## C03 · P2 · Comparison capacity/ratio can lose the source year

**Evidence:** `frontend/src/lib/comparisonRows.js` builds capacities/ratios from each school's newest programme summary, but labels the shared capacity row with the first available school's year. Only cutoff/rate cells append an older-year tag. Mixed-year schools can therefore display an older capacity beneath a newer shared year; ratio has no year at all. The comparison page also hardcodes a 2026 summary/footnote.

**Confidence:** confirmed formatter behavior; an explicit mixed-year regression fixture remains to add. A read-only live probe subsequently found four of 217 visible schools with older admission summaries (`catalogue-quality.json`), so mixed source years are present in the current catalogue. This does not identify every affected comparison or establish source accuracy.

**Action:** give each metric a correct per-value source year and use the configured admission year for shared labels. Decide whether “most/least” highlighting remains meaningful across years. Test current + older + missing schools together, including fallback cutoff/rate years that differ from newest programme capacity.

## C04 · P2 · A closed feedback draft can retain context from a different page

**Evidence:** `frontend/src/components/BetaFeedbackSheet.jsx:19–21` clears success/resets phase, but retains message, selection and screenshot when closed. Submission uses the current `pageUrl` prop (`:81–82`). `BetaTools` can reopen the persistent sheet on another route, associating the previous selection/screenshot with a new page.

**Confidence:** confirmed component state flow; browser reproduction and the intended unsent-draft policy remain required. Retaining an unsent message may be intentional, but silently changing its selected-page context is ambiguous.

**Action:** bind the whole draft to its originating page, or explicitly clear incompatible context on navigation/new request. Preserve or clear text according to the chosen UX. Test close → navigate → reopen → submit, in-flight capture during close, success and failed upload. Avoid clearing another draft from a stale async completion.

## C05 · P2 improvement · Explain map results with no coordinates

**Evidence:** synthetic browser reproduction: filter finds schools 29 and 30, result heading says two schools, map contains only school 29 because school 30 has no coordinates. No missing-location notice explains the difference. This is not an incorrect pin placement; omitting an unknown position is correct.

**Action:** show how many matching schools cannot be mapped and offer the list view. Test zero/all/some missing coordinates with radius filtering and accessibility. Do not fabricate coordinates or districts.

**Live qualification:** all 217 currently visible schools have coordinates in the read-only probe. The reproduced omission concerns a supported missing-data case, not a present live count discrepancy.

## C06 · P2 · Unverified catalogue completeness and onboarding number

The landing/onboarding claim all Prague secondary schools are present, and Stakes says students spend 5,800 hours at secondary school. A 217-row catalogue count does not establish official-register completeness; the hours claim has no verified derivation in the reviewed files. Source confirmation was requested from the founder and remains pending. Do not invent evidence, silently substitute a different number or treat these claims as verified. Check register scope (campus/REDIZO/inactive/merged schools), date and the hours calculation before retaining them.

## C07 · Resolved policy, implementation required · First confirmed sign-in starts ordinary access trial

The founder explicitly selected first confirmed sign-in, while `handle_new_user()` currently sets ordinary `trial_expires_at` to signup plus three days. This needs a once-only atomic transition, confirmed-auth verification, concurrent-request tests and an agreed migration for existing users. Keep it separate from seasonal payment trial timing and from the beta feedback window. Beta must remain free; payment previews must never initiate checkout or extend/access a purchase trial. See handoff section 0.

## Verified continuation fixes

Removed deterministic random districts; corrected non-maturita/certificate assumptions in search/map/detail/comparison; removed unsupported “not in the first round” explanations for missing figures; corrected plural/year/data-availability wording; added selected-state semantics for district/type toggles; restored filter trigger focus when applying results. The preview fixture now exercises missing location and admission figures. Lint/build pass; search, selected map card, detail and comparison were checked with synthetic local data, including no horizontal overflow on the detail at 320px. Real-device verification remains separate.

Pushed commit `e335d50` also fixes the landing count retaining fallback 217 after the fixture loaded 30, false universal three-year cutoff coverage, unsupported “last year” language, skipped-answer guarantees and unused-choice personalization promises. The WebGL shader had reversed `smoothstep` edges, which have undefined behavior under the [Khronos specification](https://github.com/KhronosGroup/OpenGL-Refpages/blob/main/gl4/smoothstep.xml); reordered edges preserve the intended core. The touch handler now permits multi-touch and resets canceled gestures. Lint/build pass; browser counters settle at actual targets 30/11/3/0. Real-phone pinch and other-GPU checks are still open.

## C08 · P2 polish · Narrow onboarding header crowds the wordmark

At 320×740, the method screen has no horizontal overflow, but the full wordmark wraps over three lines between the phase label and account link (`method-phone-320.jpg`). Use an intentional compact wordmark/header arrangement at narrow widths, preserving the back/account actions and accessible brand name. Check long parent/student labels, zoom/text enlargement and the fixed bottom CTA before choosing the layout. This is observed visual polish, not an established inaccessible-control or overflow defect.

Base stylesheet fix pushed in `bd8629d`: `index.css` declared `color-scheme: light dark` after generated theme tokens, overriding the intended base light scheme. Removing that duplicate restores token ownership; browser computed scheme changed from `light dark` to `light` with the same light background. Explicit dark tokens remain authoritative. Test forced-light on a dark OS and native controls in supported browsers; that cross-OS scenario has not been run here.

## C09 · P1 beta UI gate · Landing hero becomes unreadable in short viewports

**Reproduced:** at 320×740 the hero is scaled to 0.748815, turning its 15px paragraph into approximately 11.2px rendered text. At 667×375 it is scaled to 0.434853: approximately 6.5px text and a 25.2px main CTA. See [portrait](landing-phone-320.jpg) and [landscape](landing-landscape-667.jpg). `Landing.jsx:176–177` scales the entire hero to fit the stage instead of allowing its content to reflow/scroll. A zero-horizontal-overflow check alone misses this defect.

**Action:** use a readable small/short-screen layout with normal-sized text and controls, and allow vertical scrolling instead of shrinking the full hero. Keep optional map/story interactions independent of the hero's content height. Verify 320px width, phone landscape, short desktop windows, text enlargement/zoom, browser UI expansion and reduced motion. A minimum scale alone will clip content and is not a sufficient fix.

## C10 · P2 accessibility/resilience · Landing map lacks a keyboard/non-WebGL equivalent

**Source evidence:** the interactive school dots exist only on an `aria-hidden` WebGL canvas; pointer selection navigates to school detail. If scene creation throws, the canvas is hidden, but the shortlist is populated by that scene, leaving the mock results/detail without their normal data. No equivalent accessible all-school detail picker or explicit non-WebGL fallback was found in the fully read landing source. This matters when premium gating is applied: the public detail exception should remain usable without a pointer/GPU.

**Action:** provide an approved accessible school list/picker using the same public data projection, plus a clear map-unavailable fallback. Test keyboard/screen reader, disabled/context-lost WebGL and reduced motion. Source control flow is confirmed; disabled-WebGL and assistive-technology runtime tests remain open.

## C11 · P2 improvement · Product demo retry and playback controls

`ProductScreens.jsx` caches its school-data promise globally, including a failed result, so a transient failure persists for the module lifetime and the decorative screens remain loading. Its autoplay has no explicit pause control; interactive chapter tabs lack the usual tab/panel/arrow-key relationships, and the reduced-motion preference is sampled on mount. `DemoLoop` is rendered by the active onboarding `Welcome.jsx`, as well as the inactive `Home.jsx`; the earlier inactive-only classification was incorrect. Add an explicit load/error/retry state and accessible manual playback/chapter behavior, with tests for preference changes and network recovery. The active landing's own detail mock also silently ignores detail-fetch errors; provide an error/retry state there rather than an indefinite/stale mock. These are confirmed source behaviors; network-failure and assistive-technology runtime checks remain open.

## C12 · P2 deployment hardening · Explicit security headers are absent on the production gate

**Observed 8 October:** anonymous HTML responses for www `/`, apex redirect destination and `/skoly` include HSTS, `no-store` and `noindex`, but no CSP, framing protection, `X-Content-Type-Options`, explicit `Referrer-Policy` or `Permissions-Policy`. The sampled Railway JSON responses also omit those headers/HSTS; requirements differ for HTML and a JSON-only API, so do not treat every missing header as an equivalent exploit. No XSS, clickjacking exploitation or authenticated cache disclosure was established. See [HTTP evidence](production-http-2026-10-08.json) and [API evidence](production-api-2026-10-08.json).

**Action:** inventory both unlocked app and gate, define a compatible CSP/framing and other browser policies, then verify Turnstile, Supabase Auth, maps/tiles, screenshot capture, school links and checkout preview. Test authenticated response caching explicitly. Coordinate with plan 020's security phase; avoid duplicate changes. Browser defaults provide some protection, but are not an explicit deployment policy. Preserve tile attribution/referrer requirements from C01.

**Other production evidence:** the shared gate code opens the intended ZŠ Jesenicova invitation with free/no-card preview wording and the 18 October cutoff. No account was created. `/api/me` rejects anonymous requests; `/api/schools` returns all 217 visible schools and nested data anonymously, confirming the open access-matrix item. These are school catalogue data, not a demonstrated private-user-data leak. A disallowed Origin receiving HTTP 200 with `Access-Control-Allow-Origin` set to www does not let that browser origin read the response; CORS is not server authorization.

## C13 · P1 shortlist integrity · New shared picks hook treats a failed read as an empty list

**Source evidence, Phase 3/4 released code:** `frontend/src/lib/usePicks.js` starts with `picks=[]`, swallows the initial `fetchPicks()` failure and sets `loaded=true` in `finally`. A later add serializes that empty-based state and calls the full-set replacement API. A transient initial 500/network error followed by a successful save can therefore replace an existing three-school list with the one newly clicked school. The hook also fetches only on mount, without account identity or refresh ownership, extending C02's stale-account concern. These control flows are confirmed; no production shortlist was changed to reproduce them.

**Action:** distinguish loading/success/error and refuse replacement until the authoritative current set is loaded. Provide explicit retry and account-scoped cancellation/reset; coordinate with transactional/versioned replacement in B03. Test an existing three-pick account with the initial GET rejected and the next PUT succeeding, late A responses after switching to B, simultaneous rapid actions and a stale second tab. A loading spinner or toast alone does not prevent the replacement.

## Matrix language wording correction

The matrix criterion counted `school_programs.jazyk_studia` but called it “Nabídka jazyků” and described languages taught. That field describes the language of instruction, not how many foreign-language subjects the school offers. The label/tooltip now say “Jazyky výuky” and explain the distinction; weights and values are unchanged. The analogous comparison row already uses “Jazyky výuky”. Historical rows still contribute to the matrix count and need current-year/provenance review with C03/S12.

## C14 · P1 privacy verification · Draft ownership needs an account/route policy

The new `useDraft` helper initializes state once and writes it whenever its key changes; it does not reload/clear state for a new owner. Current beta feedback, closing answers/review and school review call sites also use tab-global or school-only keys, without account identity. A later user of the same tab can restore another account's unsent text. Phase 6 was released in `ccfd1cc`; re-reading the current beta/review call sites on 9 October confirmed the global/school-only keys remain. Questionnaire uses a user-specific key, but its mount-only load and write effect also need an A → B account-change test.

**Action:** define draft ownership and sign-out retention explicitly, key private drafts by account plus relevant school/page, and switch state atomically with its owner before persisting. Bind selection/screenshot to the same originating page (C04). Test reload, sign-out/sign-in as another tester, user identity resolving after initial render, switching school IDs without remount, corrupt storage and a late previous-owner completion. Do not assume `sessionStorage` is account-isolated or that changing a key changes React state. No real tester draft was exported or modified during this review.

## C15 · P2 verification · Parent payment UI also needs stale-request ownership

`ParentPayHandoff` fetches links based on sign-in/tester/parent booleans, not user ID, and keeps its link/activation ref between identity changes. `ParentPay` loads by token but does not discard a late prior-token response or reset polling attempts when the token changes. Review these alongside C02/C14 so a stale visible child/plan never accompanies actions using a newer token. Reproduce with delayed A/B responses in synthetic services; this is source-confirmed missing ownership, not a demonstrated production cross-account backend leak. The earlier allegation that every ended plan is shown as active remains retracted: the server intentionally limits which plans it returns.

## Additional investigation and wording proposals

- Email typo handling in `authValidation.js` rejects whole hardcoded domains, with an unsupported comment that no real inbox can exist there. A typo warning with an intentional override would avoid rejecting a legitimate custom-domain address; verify ownership/MX/deliverability before calling any listed domain impossible. This is a validation/product proposal, not a proven failed delivery or an authorized removal of the typo guard.
- The matrix's description of data exclusively as Cermat/questionnaire omits website-derived school-life fields. Match percentages are a heuristic, not an admission probability; capacity alone does not establish lower admission pressure. Align provenance/metric wording with the actual inputs and confidence limits during C03/S12. Do not change weights from these wording observations.

## C16 · P1 account ownership · Onboarding flush can continue under another session

The released Phase 6 `AuthContext.jsx` checks the stash email against the supplied session once, then makes separate `saveOnboardingAnswers()` and optional gender `updateProfile()` requests. `api.js` reads the current Supabase session for each request. It does not bind those writes to the original owner; after success it also unconditionally clears whichever stash is current and can refresh using the old session object.

**Reproduced with the actual function and synthetic mocks:** hold A's answer-save response, switch the current owner to B, then release the response. The following gender update is issued under B and the current stash is cleared under B. Run `node reports/deployment-review-2026-10-07/reproduce-onboarding-owner-race.cjs`. This demonstrates the sequencing defect, not a production exploit or a real user's data alteration. The first answer request also needs owner verification when obtaining its session; no particular Supabase timing interleaving was asserted as reproduced.

**Action:** give the flush an immutable owner/operation identity, verify it before each request and completion, and clear only the matching original stash. Stop old-session profile refreshes from reclaiming current state. Coordinate with C02/C13/C14/C15. Test A → B with delayed first/second requests, B creating a new stash, sign-out, retries, duplicate answer saves and profile failures. This is a multi-step account-state fix, deferred for a focused implementation.

## C17 · Fixed · Ended beta must not open its overdue closing form

`BetaTools.jsx` opened the closing modal from a persisted `closingPaused` flag without checking `betaProgramActive`, while `submit_beta_closing` rejects an ended/null program. An isolated browser fixture reproduced an ended tester being shown the unusable form on load. The modal now also requires an active program; the ended fixture shows no open dialog, while the active/overdue fixture still opens one. [Before](ended-beta-closing-before.png), [ended after](ended-beta-closing-after.png), [active after](active-beta-closing-after.png).

The fixture substitutes only synthetic auth/API state and makes no real submissions. Its Escape action closed the native dialog in this browser, so this report does not claim every browser makes dismissal impossible. The confirmed defect is presenting the forced, unsubmitable form after cutoff. Separate server-state/error-priority and real cutoff/phone acceptance checks remain open. A same-pattern search found existing program-active guards on the banner and beta renewal form; other open feedback/reward state across cutoff still needs the broader lifecycle test.
