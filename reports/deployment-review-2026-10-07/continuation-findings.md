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

**Confidence:** confirmed formatter behavior; an explicit mixed-year regression fixture remains to add. No claim that all current visible live schools have this mixed-year condition.

**Action:** give each metric a correct per-value source year and use the configured admission year for shared labels. Decide whether “most/least” highlighting remains meaningful across years. Test current + older + missing schools together, including fallback cutoff/rate years that differ from newest programme capacity.

## C04 · P2 · A closed feedback draft can retain context from a different page

**Evidence:** `frontend/src/components/BetaFeedbackSheet.jsx:19–21` clears success/resets phase, but retains message, selection and screenshot when closed. Submission uses the current `pageUrl` prop (`:81–82`). `BetaTools` can reopen the persistent sheet on another route, associating the previous selection/screenshot with a new page.

**Confidence:** confirmed component state flow; browser reproduction and the intended unsent-draft policy remain required. Retaining an unsent message may be intentional, but silently changing its selected-page context is ambiguous.

**Action:** bind the whole draft to its originating page, or explicitly clear incompatible context on navigation/new request. Preserve or clear text according to the chosen UX. Test close → navigate → reopen → submit, in-flight capture during close, success and failed upload. Avoid clearing another draft from a stale async completion.

## C05 · P2 improvement · Explain map results with no coordinates

**Evidence:** synthetic browser reproduction: filter finds schools 29 and 30, result heading says two schools, map contains only school 29 because school 30 has no coordinates. No missing-location notice explains the difference. This is not an incorrect pin placement; omitting an unknown position is correct.

**Action:** show how many matching schools cannot be mapped and offer the list view. Test zero/all/some missing coordinates with radius filtering and accessibility. Do not fabricate coordinates or districts.

## Verified continuation fixes

Removed deterministic random districts; corrected non-maturita/certificate assumptions in search/map/detail/comparison; removed unsupported “not in the first round” explanations for missing figures; corrected plural/year/data-availability wording; added selected-state semantics for district/type toggles; restored filter trigger focus when applying results. The preview fixture now exercises missing location and admission figures. Lint/build pass; search, selected map card, detail and comparison were checked with synthetic local data, including no horizontal overflow on the detail at 320px. Real-device verification remains separate.
