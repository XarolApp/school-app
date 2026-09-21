# 012 — Consolidate the existing UI system

**Status:** IMPLEMENTED 2026-09-21 (Claude Sonnet), awaiting Sol/high review. Chunks 1–4 committed and pushed. Verified in the running app (390/320/1440 widths): search mobile layout, filter sheet open/Escape/commit + focus, empty search in list and map, query-only relaxation, detail bar (81px vs 214px before) on `/skoly/32` and `/skoly/219`, toast at top, hint disclosure (no nested links), missing-school and loading states, expired-reset fallback, login/signup shell. `npm run lint`, `npm run build`, root `npm test` (44 pass), `git diff --check` clean.
**Not verified (outstanding):** signed-in Settings layout and focus flow (source-only), ConfirmDialog in the questionnaire (source-only; `onCancel`/`onDismiss` props unchanged), entitled detail action set, controlled offline/slow-network run, iOS keyboard/safe-area, 200% zoom, dark theme, screen reader. `Matice.jsx` confirm dialog still deferred. Commit `223b535` also swept in another agent's uncommitted `pricing.js`/`Settings.jsx` edits; a correcting commit was blocked, so that is left for the owner to sort out.
**Date:** 2026-09-21. **Baseline:** `main`, HEAD `0be882f`, plus the existing local working tree.
**Workflow:** GPT-6 Astra, `xhigh` plans → Claude Sonnet implements → GPT-5.6 Sol, `high` reviews. The founder confirmed the planning model and effort.
**Impact:** High. **Effort:** Medium–large, split into four bounded implementation commits. **Risk:** Medium, mainly shared CSS and dialog consumers.

## Outcome and boundaries

Make search, school detail, auth and settings feel like one product: predictable controls, a clear reading order, usable mobile layouts, accessible overlays, and useful loading/error states. Keep the current product and visual identity.

This plan does **not** install shadcn/ui, Tailwind, Base UI, Radix, a toast library, or a testing framework. It does not change the palette, color assignments, font families, global radii, branding, scoring, school data, API contracts, access rules, payments or questionnaire flow. No application source was edited during this audit.

Use `frontend/src/design/tokens.js` and the already-generated tokens, `frontend/src/styles/ui.css`, and small React components. Keep both existing light/dark palettes unchanged. `design/DESIGN.md` is the design reference; live Lora/Public Sans typography and existing token infrastructure already exist. Do not repeat the completed spacing-token migration or import archived mockup code as a new application.

The reference templates and live code disagree on some radii and old font descriptions. Freeze the current global geometry for this pass. Broad documentation reconciliation and a possible future library migration remain separate decisions.

## What was actually inspected

The running app at `http://localhost:5173` was inspected **before** source analysis. Browser observations used the in-app browser, screenshots, accessibility trees and rendered element bounds. Source inspection then identified causes and shared consumers; the existing Graphify index supplied navigation hints, not proof of current behavior.

| Surface | Browser evidence | Coverage limit |
|---|---|---|
| `/skoly` | Desktop 1440×1000; mobile 390×844; tablet/map 768×1024. Loaded 223 schools. Tested filters, list/map switch, empty search, reset and mobile result navigation. | No signed-in match results, saved-filter changes, address submission or geolocation permission. |
| `/skoly/32`, `/skoly/219` | Long and shorter school names; mobile including 320×740 and 390×844; desktop. Inspected facts, contacts, section navigation and bottom actions. Added then removed one compare selection to inspect toast placement. | Anonymous state only. Favorites, application picks and review submission were not exercised. |
| `/prihlaseni`, `/registrace` | Desktop login; mobile login/registration. Empty login submit exercised native required-field validation. | No account creation, credentials entered, CAPTCHA completion or authentication requests. |
| `/zapomenute-heslo`, `/nove-heslo` | Mobile forgot-password form and reset-link-expired fallback; mobile navigation Escape behavior. | No email sent and no password reset. |
| `/nastaveni` | Anonymous navigation correctly redirected to login. `Settings.jsx` and related styles/handlers inspected. | **Signed-in layout and its forms are source-only findings.** |
| Dialogs | `ConfirmDialog.jsx`, its questionnaire consumers, the matrix confirmation and inline settings/report forms inspected. | **Modal keyboard behavior is inferred from source, not a completed signed-in browser test.** |
| Loading/error | Transient detail loading observed; `/skoly/0` displayed the missing-school error at 1024×768. | No controlled slow-network/offline run, real iOS keyboard/safe-area test, screen-reader session or dark-mode audit. |

Audit interactions restored the temporary compare selection and search query. Viewport overrides were reset. Existing source changes in `frontend/src/config/pricing.js` and `server.js`, plus unrelated untracked files, belong to other work and must not be included in implementation commits.

## Findings and priority

P1 here means a core interaction is obstructed or unreliable; P2 means clarity/consistency work. These are scoped UI priorities, not launch/security severity claims.

| Priority | Finding and evidence | Starting points |
|---|---|---|
| P1 | Mobile search starts with the entire filter column; the first school is far below the fold. “Zobrazit 223 škol” only scrolls past it. Four stacked sort cards then consume much of the results viewport. | `Search.jsx`: sidebar, mobile commit button, `SORTS`; `search.css`: `.ss-layout`, `.ss-sort-*` |
| P1 | Mobile detail mixes every action and all contact links into one fixed flex row. On `/skoly/32` at 390px the contact column measured about 56px wide, making the bar about 214px tall; `/skoly/219` was taller with a phone link. The reserved bottom space is only 96px. | `schoolDetail/SchoolActions.jsx`; `schoolDetail.css`: mobile `.sd-actions` |
| P1 | Empty search has inconsistent recovery. Entering `zzzzzzzzzz` yields zero schools, but switching to map removes the empty-state explanation. Suggested relaxation also incorrectly says no single filter helps: `criteriaFor(row, f)` reads the outer `filters.query` through `matchesQuery` even when `listFor` receives a cleared query. | `Search.jsx`: `prepared`, `matchesQuery`, `criteriaFor`, `listFor`, `relaxOptions`, empty/map branches |
| P1 | Shared confirmation has initial cancel focus and Escape handling, but no modal focus containment, background inertness or explicit focus restoration. Static title IDs can collide. Matrix has a separate confirmation implementation. | `components/ConfirmDialog.jsx`; `pages/Questionnaire.jsx`; `pages/Matice.jsx` |
| P2 | Controls have overlapping owners: `.btn` rules in App/auth CSS and `.ss-btn` in UI CSS, with inconsistent dimensions, disabled and focus treatment. Auth field text is 15px, creating an iOS zoom risk; this was not tested on an actual iPhone. | `App.css`, `auth.css`, `styles/ui.css`, `PasswordInput.jsx` |
| P2 | Auth route links claim tab semantics without tab panels/keyboard handling. Main navigation does not identify the current page; the mobile menu did not close on Escape. The hamburger itself works, so the old blanket “nav overflows mobile” diagnosis is not repeated. | `AuthTabs.jsx`, `Layout.jsx` |
| P2 | School statistic explanations rely on hover-only spans. Search embeds them inside a large school link. Important meaning such as historical averages is hard to discover by touch or keyboard. | `StatInfo.jsx`, `schoolDetail/InfoHint.jsx`, `SchoolHero.jsx`, `ProgramCard.jsx`, search row markup |
| P2 | Initial loading collapses detail into “Načítám…”. Missing-school error is bare text with no clear route back; search errors similarly lack a deliberate recovery layout. | `Search.jsx`, `SchoolDetail.jsx`; reviews have an existing retry path to preserve |
| P2 | The mobile toast appears over the already crowded detail bar. Its close target is small. A compare tray with zero selection remains mounted and present in the accessibility tree despite being visually translated away. | `ToastContext.jsx`, `auth.css`: `.toast-viewport`; `Search.jsx`: compare tray |
| P2 | Reading hierarchy varies: search has two h1s, result titles/metadata change arrangement by content length, mobile detail section headings compete with metadata, and settings toggles lack expansion associations. | `Search.jsx`, `schoolDetail.css`, `Settings.jsx` |

## Decisions already made

1. **Improve the present CSS system.** Use semantic HTML and the browser's established `<dialog>.showModal()` API. No wholesale component-library migration, form builder, design-system package or new global state store.
2. **Preserve the look; clarify hierarchy.** Keep Lora for page/school headings, Public Sans for controls, metadata and numeric statistics. Use existing spacing/type tokens. Keep factual percentages and explicit missing-data labels; no fabricated information, new badges or new recommendation logic.
3. **Results first on mobile.** At the existing search/detail breakpoint of 860px, expose search plus a filter button with an active count; put facets in a modal sheet. Above 860px keep a sidebar. One filter state and one mounted facet tree, with identical semantics on both layouts.
4. **Live filters, no second Apply state.** Filters update results and counts immediately. “Zobrazit N škol” closes the sheet and focuses the results heading. Close/Escape retains the current filters and returns focus to the trigger. Do not label closing as “Cancel”.
5. **Compact sort, honest help.** A labeled native select replaces the four sort cards on both layouts. Preserve all currently available sort algorithms, conditional match sorting, and the selected sort's tradeoff sentence. Show one compact explanation for unavailable commute sorting/filtering; do not suggest it works.
6. **Two mobile detail actions.** Without favorite access (including anonymous/expired): compare + share. With favorite access: favorite + compare, with application-pick and share controls in normal flow under the hero. Full website/email/phone links remain in the existing location/contact section. Desktop keeps its action rail. Preserve existing permission checks and handlers.
7. **Distinct overlays and inline forms.** Use a modal for confirmations and mobile filters. Keep settings confirmations and `ReportDataDialog` inline—the latter is an inline report form despite its filename. Do not turn every panel into a dialog.
8. **Keep document navigation.** School detail sections remain anchor links with visible focus and appropriate scroll offsets. They are not mutually exclusive tab panels. Auth route switching becomes a labeled navigation element with `aria-current`, not ARIA tabs.
9. **Small shared building blocks only.** Add `Modal.jsx`, `AsyncState.jsx` and a bottom-bar spacing hook used by the two existing fixed bars. Consolidate existing CSS classes rather than introducing a parallel Button/Input component family. Do not rewrite all consumers merely to standardize imports.

Native modal behavior and keyboard requirements are grounded in [MDN's dialog reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) and the [WAI-ARIA modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Mobile navigation follows the [disclosure navigation pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/), not an application-menu pattern. Product hierarchy also uses the repository's existing Mobbin core-product survey; no fresh Mobbin browsing was performed.

## Implementation sequence

Paths below are relative to the repository root. Each chunk must be runnable and verified before its commit. One agent owns these frontend files at a time. Check the actual working tree before starting; if a material assumption is wrong, amend this handoff before proceeding.

### 1. Shared controls, modal behavior and navigation

**Files:** `frontend/src/styles/ui.css`, `frontend/src/App.css`, `frontend/src/auth.css`, `frontend/src/components/{Layout,AuthTabs,ConfirmDialog,PasswordInput,ToastContext}.jsx`; new `frontend/src/components/Modal.jsx`; narrowly scoped additions to `frontend/src/design/tokens.js` and regenerated `tokens.css` only if needed for missing control-size tokens.

- Give shared button, input, notice and toast rules one owner in `styles/ui.css`; leave auth/layout positioning in their page styles. Keep `.btn` and `.ss-btn` as compatibility selectors. Preserve existing primary/secondary/danger variants and their colors. A change must not rely on stylesheet import order to override an accidental duplicate.
- Use a minimum 44px interactive target for ordinary buttons, icon buttons and menu toggles. Preserve the existing 56px auth submit size. Keep native checkboxes compact visually but put them inside a sufficiently padded clickable label. Inputs/selects use the existing 16px body token, visible labels, and consistent focus/invalid/disabled states.
- Reuse existing palette tokens for focus outlines; do not recolor semantic states or global borders as part of this work. Add only missing geometry tokens to JS; never hand-edit generated CSS. Keep existing token names and global values stable for onboarding consumers.
- `Modal({ open, title, children, onDismiss, busy, initialFocusRef, returnFocusRef, role = 'dialog', className })`: use a native dialog, unique title ID via `useId`, and `showModal()`/`close()` in a StrictMode-safe effect. Keep state controlled by the caller; confirmation callers can retain `alertdialog` semantics. Associate a short confirmation description where appropriate, without flattening a complex filter form into one announcement. Handle native `cancel` and backdrop dismissal through `onDismiss`; prevent them while busy. Clicking/dragging within the content must not dismiss it. Restore focus to `returnFocusRef` when supplied, otherwise the invoking control if still connected. Lock background scroll with cleanup that restores the prior style. The panel scrolls within `100dvh`, with a `100vh` fallback and safe-area padding.
- Keep `ConfirmDialog`'s current external props, including the distinction between **`onCancel` and `onDismiss`**. The questionnaire's after-submit dialog deliberately gives them different meanings. Use the shared modal shell; preserve confirmation semantics, focus the safe action initially, block repeat submission/dismissal while busy, and do not focus a destructive action by default.
- `Layout`: add a skip link and main target, identify current routes, and retain ordinary navigation links. Escape closes the expanded mobile navigation and returns focus to its trigger. Navigation after selecting a link closes it as today. Do not trap focus in this non-modal disclosure.
- `AuthTabs`: retain the visual route-switcher, replace tab roles with a labeled `nav` and route links using `aria-current="page"`.
- Mobile toasts appear at the top with safe-area spacing, avoiding all bottom action bars. Keep the current queue/lifetime and polite announcements; enlarge the close hit area. Do not introduce a second notification provider. Confirm long Czech messages wrap within the viewport.

**Accept:** existing controls retain their actions and colors; native focus is visible; no hidden navigation link remains focusable when collapsed; Escape works. Confirm dialog cannot tab into the background, restores focus, respects busy, and calls the correct callback once. Smoke-test existing questionnaire dialogs because they consume this component; do not redesign the questionnaire.

### 2. Search layout, states and recovery

**Files:** `frontend/src/pages/{Search.jsx,search.css}`, new `frontend/src/components/SearchFilters.jsx`, new `frontend/src/components/AsyncState.jsx`, new `frontend/src/lib/useBottomBarSpace.js`; use shared styles/modal from chunk 1.

- Extract the existing facet markup and `FacetSection` into `SearchFilters`, passing current values, counts and existing change handlers. Do not move scoring/ranking logic into it. Keep search text outside the sheet, above the results/sidebar split, so it is always reachable. Preserve reset, saved filters and all current facet options.
- Render facets as a sidebar above 860px and in `Modal` at/below 860px, with one mounted instance. Use a matchMedia subscription with cleanup; crossing to desktop closes the modal without clearing filters or leaving the body locked. Maintain unique label/control IDs and disclosure `aria-expanded`/`aria-controls` associations.
- Mobile order: page title → search → filter button/count + result count → selected filter chips → compact view/sort controls → school list/map. Use only one page h1; make the results heading focusable for the sheet's completion action. On default 390×844, the first result's title must be visible without scrolling through facets or sort explanations.
- Replace sort cards with the native select and one tradeoff line. List/map buttons expose their selected state (`aria-pressed`). Preserve sort fallback when match scores are absent and current pagination/filter reset behavior.
- Render zero-result content outside the list-vs-map branch so both views offer explanation and recovery. Keep the current helpful relaxation/near-match features, fixing the query dependency: `listFor(f)` must prepare its query from **`f.query`**, and pass that query context into `criteriaFor`/`matchesQuery`. Precompute once per filter evaluation; preserve diacritics, typo tolerance, KKOV matching and ranking. Do not change `schoolSearch.js` scoring to solve a state-closure bug.
- For `zzzzzzzzzz` with no other constraints, clearing just the query must produce the full dataset and the recovery suggestion must reflect that. With multiple filters, counts must reflect each hypothetical relaxed filter rather than the current outer state.
- Give rows a stable reading order: school name, locality/type, programs, then a compact aligned statistics grid. Use existing data typography and tabular numerals, wrap long names naturally and avoid fixed row heights. Keep compare selection outside the navigation link. Keep title/summary navigation; move explanatory controls outside that link as described in chunk 3.
- Conditionally mount the compare tray only for nonzero selection; retain the 2-school minimum and 4-school limit. At narrow widths let it wrap without forcing a 200px minimum text column alongside controls.
- `useBottomBarSpace(barRef, containerRef)` observes the actual rendered fixed bar height with ResizeObserver and writes a local `--bottom-bar-space` property on the page container. Measure zero when it is not fixed/visible; disconnect and clear on cleanup. Include safe-area padding in the bar's measured height. Page bottom padding consumes that property. Use this for search and detail; no global store or hardcoded 96px assumption.
- `AsyncState({ kind, title, children, onRetry, action })` is a small presentational region for loading/error/empty content, not a data-fetching abstraction. Loading uses one polite status plus `aria-hidden` structural placeholders; errors have a meaningful heading, explanation and recovery action. Keep the search shell visible during initial loading, distinguish loading from a genuine zero count, and retain user filters on retry. Keep any new retry request safe against stale/unmounted updates.
- Remove the internal “viz UNFORGET.md” reference from product copy. Explain unavailable data in user language without inventing a replacement metric.

**Accept:** filters give identical results in desktop and mobile presentations; changing viewport preserves selection; live counts/chips/reset work. Empty list and map both recover. A zero-selection compare tray is absent from DOM/focus order. Loading/error/retry retain a stable page shell. No horizontal page overflow at 320px.

### 3. School detail hierarchy and mobile actions

**Files:** `frontend/src/pages/{SchoolDetail.jsx,schoolDetail.css}`, `frontend/src/components/schoolDetail/{SchoolActions,SchoolHero,InfoHint,ProgramCard,SchoolLocation,ReportDataDialog,SchoolReviews}.jsx`, `frontend/src/components/StatInfo.jsx`; only the necessary search row markup/CSS and `SchoolMap.jsx` call-site adjustments for explanatory controls.

- Split the action rail into primary actions, secondary actions and contact links. Apply the exact mobile action mapping in decision 6. Reuse the existing action handlers, entitlement checks, busy states and optimistic rollback. Contacts must never be a narrow third column inside a fixed button row. Keep them fully readable in `SchoolLocation`; avoid a second mobile contact list in the bar.
- Use two equal flexible columns for the mobile bar, with labels allowed to wrap and at least 44px targets. Reserve its real height using the chunk-2 hook. On desktop keep the normal rail and reserve no mobile space. Do not reduce text size to make long labels fit.
- Keep school title and location dominant, use Public Sans/tabular numerals for facts, and put explanatory metadata below a section heading when horizontal room is insufficient. Preserve explicit historical averages, missing values and program-specific/year-specific distinctions. Do not translate missing values into zero.
- Retain anchor navigation for programs/location/reviews/practical information and ensure focused/targeted content is not obscured. Preserve the existing extracted practical-data branch and honest missing-data grid; improve alignment/spacing without hiding unknown facts or inventing amenities.
- Keep essential interpretation inline (for example that a cutoff is a historical average, not an admission guarantee). For longer explanations, use a small labeled button/disclosure with `aria-expanded` and associated text, operable by click/tap/keyboard and dismissible with Escape when expanded. `InfoHint` and `StatInfo` must no longer require hover. Keep their current props compatible; use a shared implementation only if the markup/behavior is actually the same.
- Before putting buttons into `StatInfo`, find every consumer: some currently sit inside a school `<Link>`. Restructure those specific rows/popups so an explanatory button is a sibling, never a nested interactive element. Verify that opening help does not navigate or select a school. Do not globally change comparison/matrix layouts as collateral work.
- Keep a title/back-navigation shell while detail loads; show structural placeholders for the hero/facts and one loading announcement. Add a retry path for request failures using the existing cancellation guard. Missing-school handling offers “Zpět na školy”; preserve the available API error distinction rather than assuming every error is a 404. Use `AsyncState` without flattening all failures into one generic message.
- Reviews keep their section heading/anchor while loading, preserve existing empty/retry states and moderation/access rules, and expose the selected review filter. The report form remains inline, gains a visible textarea label, associated hint/error text, initial focus on opening, and return focus on cancel. Preserve unsent text during a failed request.

**Accept:** both long-name `/skoly/32` and contact-rich `/skoly/219` have readable contacts and no obscured last content at 320/390px. Toasts do not cover bottom actions. Test anonymous and entitled action sets separately. Help is reachable without hover, with no nested-button/link violations. Detail loading/error states have clear navigation and recovery.

### 4. Auth/settings consistency and cross-page verification

**Files:** `frontend/src/pages/{Login,SignUp,ForgotPassword,ResetPassword,Settings}.jsx`, remaining page-specific `frontend/src/auth.css` rules, and narrowly scoped shared control styles from chunk 1.

- Keep the existing focused auth-column width and settings-column width. Use a consistent heading/lede/form rhythm, removing accidental global h1 margins inside page-header flex gaps. Keep Lora/Public Sans and existing colors. Include an h1 and the normal auth shell in expired/reset-link fallback states.
- Associate every field hint/error with its control via stable IDs/`aria-describedby`, set invalid state where validation identifies a field, and announce submission errors without repeating every keystroke. Preserve native required validation, password reveal, autocomplete/input types, password strength and CAPTCHA reset behavior.
- Preserve safe login return URLs, generic forgot-password success copy, confirmation/resend behavior and duplicate-submit protection. Do not send email or alter credentials simply to verify styling.
- Settings: retain profile/security/subscription/delete section order and the current inline confirmation steps. Give each “Změnit” control a contextual accessible name, expanded state and panel association; focus the first relevant field on opening and restore focus when closing. At narrow widths stack action controls below the value instead of squeezing them beside long email addresses.
- Keep settings accessible to expired accounts. Preserve all subscription-status branches, typed-email deletion confirmation, reauthentication, and email/password validation. No handler/API changes are required. Remove the header's promise of appearance controls if those controls remain absent; do not add a theme settings feature.
- Inspect all `.btn`, `.input`, `.panel`, `.notice` and `ConfirmDialog` consumers after moving shared CSS. Smoke-test one onboarding account screen and questionnaire/decision surfaces for collateral layout/focus regressions. Their product flows are not in redesign scope.
- Keep the matrix's standalone confirmation migration deferred with its existing UNFORGET review gate. The shared `ConfirmDialog` improvement must land safely for its current consumers without turning this plan into a matrix refactor.

**Accept:** login, signup, forgot-password and expired-reset pages have a consistent shell; focus/errors remain usable. Settings is checked in a real signed-in development/test session, including long text and expired access. If no suitable session is available, mark those checks outstanding—do not claim the settings implementation is visually verified.

## Verification and review gate

Run these from the specified directories after relevant source changes:

```bash
# frontend/ — only when tokens.js changed
npm run tokens

# frontend/ — after each coherent implementation chunk
npm run lint
npm run build

# repository root — once after final integration
npm test
git diff --check
```

**Audit baseline already run:** frontend lint passed with six existing `react(only-export-components)` warnings; production build passed with an existing >500kB JS chunk warning. These warnings are not introduced by this plan. Root tests were not run for this documentation-only audit. Do not add bundle splitting or lint cleanup to this scope.

No frontend browser-test runner is currently configured. Use the running app and record actual results; do not install infrastructure just to satisfy a checklist. If the query-context correction is extracted into a pure helper, add a focused regression using existing Node test infrastructure. Otherwise explicitly record the live query-relaxation reproduction and results, rather than writing an implementation-mirroring test.

| Check | Required evidence after implementation |
|---|---|
| Responsive layout | 320×740, 390×844, 768×1024, 1024×768, 1440×1000; spot-check both sides of existing 768px nav and 860px content breakpoints. Before/after screenshots for search and long school detail at 390px and desktop. No page-level horizontal overflow. |
| Search | Default results; facets and chips; zero query in list **and** map; query-only relaxation; mixed-query/facet relaxation; reset; all available sorts; match-sort unavailable fallback; pagination; compare selection 0/1/2/4 and limit rejection. Preserve existing search matching. |
| Dialogs/navigation | Keyboard-only open → initial focus → Tab/Shift+Tab containment → Escape → focus restoration. Backdrop behavior, busy blocking, unique IDs, StrictMode mount/unmount and mobile→desktop resize. Verify questionnaire `onCancel` vs `onDismiss` semantics without changing its scoring or answer persistence. |
| Detail | Long title and website/email/phone; missing facts; program/year labels; anchor jumps; inline report open/cancel; review loading/error; mobile action sets; toast placement; missing-school recovery. Do not submit reviews/reports against a real user account as a visual check. |
| Auth/settings | Empty/invalid fields, show/hide password, long errors, expired reset link. Signed-in settings expanded/collapsed, long profile text, expired-account access. Successful/destructive submission checks require appropriate test data; real password changes/deletion/payment actions are not part of this UI audit. |
| Loading/failure | Controlled slow/offline response then recovery for search/detail and reviews, with no misleading zero state, lost inputs, duplicate announcement or stale update after navigation. |
| Accessibility/resilience | 200% zoom, text wrapping, keyboard focus, touch-sized controls; reduced-motion avoids forced smooth scroll/shimmer; current dark theme remains readable without palette changes. Real iOS keyboard/safe area where available—desktop emulation does not prove these. |
| Shared regressions | Existing questionnaire dialogs, compare/decision controls and onboarding account screen retain behavior/styles after CSS changes. Map can still be opened and results correspond to filters. |

Completion requires passing relevant checks and a **Sol/high review of both diff and running behavior**, with no unresolved high-severity findings. Record untested branches explicitly. Follow repository instructions to commit/push each verified chunk, staging only the implementer's files. Update this plan's status and its linked UNFORGET entry only as work is actually verified.

## Deferred deliberately

- **Map density and resize behavior:** with 223 schools, many labels/pins substantially overlapped at the observed tablet map size; resizing also left partially filled tiles. Investigate label clustering/selection and Leaflet container-size invalidation in a separate focused task. This plan fixes empty-map recovery, not map rendering architecture.
- Palette changes, global radius reconciliation, rebranding, fresh design-system direction, shadcn/Tailwind adoption, and a full onboarding/quiz/paywall redesign.
- Broader comparison/matrix redesign, saved-search features, school data enrichment, backend/auth/payments changes, bundle splitting and whole-repo accessibility certification.
- Broad reconciliation of historical docs/plans already tracked in UNFORGET. Current source and live observations supersede old “not implemented yet” descriptions for this handoff.

The signed-in coverage gap is an implementation verification requirement, not evidence that those screens are broken. The map follow-up and this proposed plan are recorded in `UNFORGET.md`.

## Handoff prompts

After the founder approves this plan, use Claude Code with **Sonnet**:

> Use `/claude-plan-then-build` to implement the approved `plans/012-ui-system-consolidation.md`. Start by checking the working tree and assumptions. Follow its four chunks, preserve colors, install no UI dependencies, and verify each chunk in the running browser. Stop on material plan mismatches. Commit and push only your verified changes.

After implementation, use Codex with **GPT-5.6 Sol, high**:

> Review the implementation against `plans/012-ui-system-consolidation.md`. Inspect the diff, verification results and running desktop/mobile UI. Focus on shared CSS regressions, filter equivalence, dialog focus/callbacks, mobile action bars and preserved auth behavior. Report findings by severity and distinguish verified behavior from source-only inference.
