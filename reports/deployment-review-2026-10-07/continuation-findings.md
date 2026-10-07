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

`ProductScreens.jsx` caches its school-data promise globally, including a failed result, so a transient failure persists for the module lifetime and the decorative screens remain loading. Its autoplay has no explicit pause control; interactive chapter tabs lack the usual tab/panel/arrow-key relationships, and the reduced-motion preference is sampled on mount. This component currently belongs to the inactive `Home.jsx` page, so do not call it an active landing beta blocker. Before reusing it, add an explicit load/error/retry state and accessible manual playback/chapter behavior, with tests for preference changes and network recovery. The active landing's own detail mock also silently ignores detail-fetch errors; provide an error/retry state there rather than an indefinite/stale mock.
