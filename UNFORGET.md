# UNFORGET

Single ledger for all deferred work on ŠkolaMatch — paused plans, pending decisions,
audit findings, "come back to this later" items. See
`.claude/skills/unforget/SKILL.md` for the format and workflow this file follows.

**Every session must log new deferred work here, not in CLAUDE.md or DESIGN.md.**
Those files describe current architecture and locked-in decisions; this file is
the only place open questions and TODO-shaped items belong. See CLAUDE.md's
"Keeping This File Useful" section for the full instruction.

Migrated 2026-08-28 from CLAUDE.md's "DECISIONS YOU NEED TO MAKE", "WHAT NEEDS TO
BE BUILT NEXT", parts of "What's NOT Built Yet", and the "Pending" list under
"Design system update — DESIGN.md rewritten".

---

## Pricing decisions not yet finalized
- **Found:** 2026-08-24, pricing research passes
- **Urgency:** high
- **Risk of fixing now:** none — these are the user's calls, not a coding risk
- **Risk of NOT fixing:** cannot go live with real payments until settled
- **Effort:** small (they're decisions, not implementation)
- **Release/context:** blocks Stripe go-live

Three things need a final number before real money can move, tracked as
placeholders in `frontend/src/config/pricing.js`:
1. **Exact prices** — Season pass placeholder: 690 Kč. Monthly placeholder: 249 Kč.
2. **Trial length** — currently 3 days (schema + config both agree). Research
   flags 3 days as carrying the highest Day-0/Day-1 rushed-cancellation risk of
   any trial length. Keep as-is per the user's explicit prior choice, or extend
   to 5–7 days — watch conversion data rather than deciding blind.
3. **Plan display order** — currently Season Pass (one-time, pre-selected) shown
   before Měsíční (recurring). Keep or flip?
4. **`REFUND_GUARANTEE_DAYS`** — set to `3` as a testing placeholder
   (2026-08-24), not a committed number. **Do not display this to a real paying
   user without both a final number and a working refund process behind it.**
   14 days (EU distance-selling floor) is the benchmark to reconsider against.

---

## Stripe integration
- **Found:** 2026-08-27 merge, deferred explicitly by user 2026-08-28
- **Urgency:** high, but explicitly gated on user decision
- **Risk of fixing now:** user said "not just now" — do not start without them raising it again
- **Risk of NOT fixing:** the paywall stays mocked indefinitely; no real revenue
- **Effort:** medium — routes exist as scaffolding, need real keys + testing
- **Release/context:** blocks real payments, blocks trial-reminder-email and cancellation-screen below (both assume a real subscription to act on)

Create the Stripe product, pick real prices (see pricing decisions above), add
`STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` to `.env`,
uncomment the real checkout logic in `/api/checkout` and the webhook handler.
Also needs a one-time-mode path for the season pass — checkout is
subscription-mode only today, and `'season'` status has nowhere to be written
from until this exists.

**Do not start this without the user explicitly re-raising it** — they said
"I don't want to connect Stripe just now" on 2026-08-28.

---

## EU-required billing features (legal blockers)
- **Found:** pricing research, 2026-08-23/24
- **Urgency:** high — legal requirement, not optional polish
- **Risk of fixing now:** none, but depends on Stripe integration existing first
- **Risk of NOT fixing:** cannot legally run real recurring billing in the EU
- **Effort:** medium (email: needs a transactional email service; cancellation: needs a real subscription-management UI + API route)
- **Release/context:** blocks real recurring billing specifically (season pass, being one-time, is less exposed but should still get a lawyer look)

- **Trial reminder email** — a day-2 reminder before billing starts. Tracked as
  `TRIAL_REMINDER_IMPLEMENTED: false` in `pricing.js`; the paywall currently
  tells users this honestly rather than lying about it.
- **One-step cancellation screen** — tracked as
  `ONE_STEP_CANCELLATION_IMPLEMENTED: false` in `pricing.js`. The Mobbin
  paywall-patterns research (dated 3-beat trial timeline, symmetrical decline
  paths, due-today-vs-recurring split) has concrete sourced patterns to build
  this against once started.
- **Czech consumer-law lawyer review** — have someone actually qualified check
  the whole flow is legal before charging real users. Not a coding task, but
  blocks going live regardless of what else is done.

---

## Search page ships synthesized stand-in data
- **Found:** 2026-08-30, Claude Design import of `School Search.dc.html`
- **Urgency:** high — blocks public release
- **Risk of fixing now:** none technically; needs real data sources, not code
- **Risk of NOT fixing:** a student could pick a school based on an invented
  admission cut-off. The numbers are fabricated but attached to real Prague
  school names, which is what makes them dangerous rather than merely wrong.
- **Effort:** large — each field needs a column plus a scraper or geocoding pass
- **Release/context:** **hard blocker for public launch**

`frontend/src/pages/Search.jsx` implements the full Search design, but the
`schools` table has no column for several fields the design shows. They are
generated deterministically from `school.id` in a single block at the top of the
file marked `⚠️ SYNTHETIC STAND-IN DATA`. Delete that block once real columns exist.

Fields needing real data:
- `admissionCutoff` — jednotná přijímací zkouška score ("hranice 2025")
- `acceptanceRate` — % přijatých z přihlášených
- `commuteMinutes` — dojezd MHD; needs school coords **and** a user home address
- `hasTalentExam` — boolean
- `schoolType` — veřejná / soukromá / církevní

`differentiator` is deliberately NOT synthesized — it is derived from real
`deriveFeatures()` output, because inventing editorial claims about named schools
reads as researched fact in a way a number in a labelled cell does not.

User decision (2026-08-30): ship as designed for now, fix before public release.

---

## Paywall mockup promises that outran the product
- **Found:** 2026-08-24, comparing `docs/sources/design_system.md` mockup against real config
- **Urgency:** high for the two payment-screen items (false trust signals), low for the rest
- **Risk of fixing now:** the two payment-screen claims are actively unsafe to ship as-is
- **Risk of NOT fixing:** displaying a refund/cancellation promise with nothing behind it is a real user-trust and possibly legal problem
- **Effort:** small once the underlying feature (refund process, cancellation) exists
- **Release/context:** blocks real payments (the two flagged items); the rest is roadmap-shaped, not blocking

The 2026-08-24 Claude Design mockup invented plausible product copy that
doesn't have a real feature behind it yet. The *visual system* was good and
got ported into the real `DESIGN.md`; these specific claims were not, and
still aren't real:

**Blocking before real payments:**
- "Vrácení do 14 dnů" — no refund process exists yet (see pricing decisions above)
- "Zrušíte kdykoli do dalšího zúčtování" — deliberately removed from
  `Paywall.jsx` already since `ONE_STEP_CANCELLATION_IMPLEMENTED` is false

**Needs real data/source before it can ship:**
- "38 %" statistic (students who'd choose differently) — mockup itself labels
  it "Zdroj: doplnit" (source: TBD). Find a real citable Czech source or drop
  it. `config/socialProof.js` stays deliberately empty until then.
- Outcome bullets promising admission-chance estimates from pololetí grades,
  commute times ("22 minut od tebe"), deadline reminders — none of this data
  exists in Supabase (`schools` only has name/location/programs/contact/
  website) and there's no email system. Real roadmap features, not close.

**Cosmetic, low priority:**
- Mockup says 199 Kč/month; `pricing.js` says 249 — `pricing.js` is always the
  source of truth, mockup is stale.
- Mockup's season-pass end date (30.6.2027) vs config's actual window (end of March) — reconcile whenever season pass is actually wired up.
- Mockup says "osm otázek"/"3 / 8"/"Krok 1 ze 3" — real flow is 10 quiz questions across 23 screens.

---

## Post-launch feature roadmap (not blocking, just don't forget)
- **Found:** 2026-08-24
- **Urgency:** low
- **Effort:** large (both are substantial features)
- **Release/context:** after launch, once there's real usage to justify them

- **Better school matching** — add real admission-grade/capacity data so match
  scores are more than name/location/programs text-matching.
- **Priority optimizer** — help students rank their top 3 schools for the
  Czech DiPSy admissions system. Flagged as "the killer feature nobody else
  has" — worth prioritizing once the core product is solid.

---

## Design system: two open research-dependent decisions
- **Found:** 2026-08-25, Mobbin research pass
- **Urgency:** medium
- **Risk of NOT fixing:** DESIGN.md's imagery/score-display guidance stays provisional
- **Effort:** small (verification) / medium (score display needs a real decision + possible rework)
- **Release/context:** should resolve before a big visual polish pass on school-detail or results screens

1. **Photo gallery verification** — `docs/sources/feature-brainstorm.md` (~line
   93) claims school photos were "already scraped." If true, this changes the
   imagery plan for school profile pages (cheaper to ship real photos in v1
   than currently assumed). Verify against the actual `schools` table/scrape
   output before finalizing imagery plans in DESIGN.md.
2. **Score display resolution** — still undecided: percentages (user's
   preference) vs. criteria list + factor magnitudes (research + Mobbin
   patterns both point this way) vs. a plain band (what's actually shipped
   in the onboarding quiz today, per matching.js's own hard rule against fake
   percentages). The onboarding quiz already resolved this for itself — a
   BAND, never a percentage — so this item is really about whether the
   *standalone questionnaire* (once it gets a UI) and school-detail pages
   should match that or do something else.

---

## Landing-page ambient animation — spec written, NOT implemented
- **Found:** 2026-08-28
- **Urgency:** low — explicitly gated, do not build without the user re-raising it
- **Risk of fixing now:** user was explicit this needs their trigger + Claude Design's dedicated animation tool, not a normal frontend pass
- **Effort:** medium, mostly asset-dependent (CSS-only is cheap; a Lottie/Rive character loop needs a designed asset first)
- **Release/context:** landing page only, cosmetic — not blocking anything

Full spec lives in `DESIGN.md` under "Motion — landing page (úvodní stránka)",
grounded in `docs/sources/landing_animation_research.md`. Summary: one small
ambient autoplay loop (CSS gradient/shape drift by default, or a small Lottie/
Rive idle character loop if a designed asset exists), slow and unvarying, never
scroll/hover/click-triggered, never a mascot or confetti pre-signup, always
disabled under `prefers-reduced-motion`.

**Gate, repeated from DESIGN.md because it matters:** build this ONLY when the
user explicitly triggers it, using Claude Design's dedicated animation tool —
not as part of routine frontend/UI work, not hand-authored CSS by a general
session.

---

## Waiting on the user (not a coding task)
- **Found:** 2026-08-25
- **Urgency:** none — explicitly deferred by the user's own choice
- **Effort:** n/a

**Big visual/graphic design pass on the onboarding.** Deliberately not started
— the user has an already-built site (with a questionnaire + other features)
on their laptop they were waiting to get access to, and wants to do the visual
redesign once fully available rather than designing twice. Current onboarding
is functionally complete (all 23 screens, both role branches, real scoring)
but visually plain by design — built to the UX guide's structural rules, not
final visual polish. **Do not start a design overhaul on this proactively;
wait for the user to say the go-ahead.**

---

## `/improve` audit checkpoints not yet run
- **Found:** 2026-08-25
- **Urgency:** low until the triggering milestone is actually about to happen
- **Effort:** the audit itself is small (read-only); fixing what it finds varies

`/improve` is a read-only codebase audit (bugs/security/perf/tech-debt, never
edits code). Run it as a pre-transition checkpoint at each of these, not on a
schedule:
- Before wiring real Stripe payments (money + real card flows — highest priority of these)
- Before re-enabling/changing Supabase RLS policies (security-boundary change)
- Before doing serious work on `server.js` — it hasn't had a critical pass since the initial fix (flat routes, no validation layer, no structured error handling)
- Before merging in any remaining questionnaire/features from the laptop build, if anything further gets pulled from `schoool-app-laptop-progress/`

**Not needed** on the onboarding/paywall specifically — already got a
dedicated deep pass from the onboarding-architect agent (2026-08-23/24), found
and fixed 4 real bugs. Re-auditing now would mostly re-surface already-tracked
gaps above.

---

## Housekeeping
- **Found:** 2026-08-27 merge
- **Urgency:** low
- **Effort:** trivial

`schoool-app-laptop-progress/` is kept as read-only reference from the merge;
nothing in the live app imports from it. Delete it once confident nothing else
is needed from there (the questionnaire UI, forest/teal design system, and
map/match-score components were deliberately NOT ported and aren't coming
back).

---

## Backend pagination
- **Found:** pre-2026-08-27
- **Urgency:** low — not urgent at ~60 schools
- **Risk of NOT fixing:** Supabase's PostgREST silently truncates at 1000 rows — a silent data-loss bug once the school count crosses that, not an error
- **Effort:** small
- **Release/context:** must fix before expanding past Prague to other Czech cities

`GET /api/schools` has no pagination. Fine today at ~60 rows; add it before the
geographic-scope expansion mentioned in CLAUDE.md's "Geographic Scope for V1".

---

## School Detail Pages — still minimal
- **Found:** pre-2026-08-27
- **Urgency:** low
- **Effort:** medium
- **Release/context:** revisit once the design tokens (done 2026-08-28) have had time to inform a real layout, and once the photo-gallery/score-display decisions above are resolved

Currently minimal. Not broken, just not a finished surface yet.

---

## Onboarding paywall not connected to real access state
- **Found:** 2026-08-27 merge
- **Urgency:** medium, gated on the Stripe decision above
- **Effort:** medium — this is the actual seam between the onboarding flow and the real auth/payment layer
- **Release/context:** the single biggest remaining gap between "functionally complete demo" and "real product"

The onboarding's purchase button still calls `mockStartSubscription`, and the
one-time-offer entitlement (`lib/offerEntitlement.js`) is a localStorage stub
explicitly marked not production-safe. Connecting this to real Stripe checkout
and real trial/access state is blocked on the Stripe decision above — don't
start this independently of that.

## `ObKit.jsx` / `auth.css` primitives predate the real design-system template
- **Found:** 2026-08-31 (file-mtime comparison, at user's request)
- **Urgency:** medium
- **Risk of fixing now:** none identified yet — not started
- **Risk of NOT fixing:** the app's hand-built components (`ObKit.jsx`,
  `auth.css`'s `.btn`/`.input`/`.panel`/etc.) diverge further from the real
  design system the longer both exist in parallel
- **Effort:** large — replacing these means restyling onboarding + auth pages
- **Release/context:** sequence AFTER the spacing/typography migration above,
  not simultaneously — both are app-wide visual changes and doing them at once
  makes any regression much harder to attribute

`frontend/src/components/onboarding/ObKit.jsx` and `frontend/src/auth.css` were
last touched 2026-08-27. `design/system/` (the real Claude Design output, with
actual `Button`/`Input`/`Checkbox`/`Card`/`Chip`/`Divider`/`MatchIndicator`/
`Tooltip` component code) was created 2026-08-30 — three days later. Per the
user's own rule (if the real template is newer, prefer it over hand-built
equivalents), these should eventually be replaced by the real template
components rather than the other way around. Not started — sequence this after
the spacing/typography migration lands and is verified stable.

## Responsive design beyond the fixed 1280px desktop width
- **Found:** 2026-08-31, alongside widening `.app-content` to 1280px
- **Urgency:** medium
- **Risk of fixing now:** none — this is scoping future work, not a live bug
- **Risk of NOT fixing:** the app looks right at exactly three breakpoints
  (1280px, 1024px, 768px margins) and untested in between; no per-component
  responsive behavior exists beyond the shared container's own padding
- **Effort:** large — a real pass across every page, not a token change
- **Release/context:** explicitly deferred by the user 2026-08-31 — "for now
  lets stick with that original claude design width and height"

`.app-content` was widened from 960px to `design/DESIGN.md`'s stated 1280px, with
its three documented breakpoint margins (64px / 32px / 16px) implemented as real
media queries in `App.css` (there were none before). This is a fixed-width port
of the desktop spec, not a responsive redesign — no intermediate tuning, no
per-component adaptation, and no verification yet that every page (not just
Search, which the plan above did explicitly test at 375px and 1280px) holds up
across phone/tablet/ultrawide sizes. Do this properly once the spacing/typography
and component-library work above have landed, so it isn't done twice.

## onboarding.css still on the old spacing/type scale
- **Found:** 2026-08-31, during the site-wide spacing/typography migration (plan 005)
- **Urgency:** medium — deliberately deferred, not forgotten
- **Risk of fixing now:** the work would be discarded; onboarding is slated for a
  full /design redesign against design/system, which will restyle it natively
- **Risk of NOT fixing:** onboarding renders on a different spacing and type scale
  than the rest of the site until that redesign happens. Visible only if a user
  moves between onboarding and the main app in one session.
- **Effort:** large on its own (130 spacing values + ~10 display-type decisions);
  near-zero if folded into the planned redesign
- **Release/context:** do this AS PART OF the onboarding redesign, not before it

Plan 005 migrated `index.css`, `App.css`, `auth.css`, and `search.css` onto the
design system's real scales (`--space-*`, `--fs-*`, emitted from `tokens.js`).
`onboarding.css` was explicitly excluded by the user: it holds 130 of the 246
hardcoded spacing values and nearly all the hard display-type calls, and hand-migrating
it now would be thrown away by the redesign.

It also carries the only genuinely hard typography problem: the template's scale
offers just 22/28/38/72 above 18px, and its 72px display is unusable on onboarding's
390px mobile-first screens. **The template has no documented mobile type steps** —
that gap needs resolving in `design/DESIGN.md` before or during the redesign, not
guessed at.

Known pre-existing bug in that file, already tracked as `plans/003`: `.ob-title`
*shrinks* 32px → 30px at the 640px breakpoint (`onboarding.css:107` vs `:1168`).
Fold that fix into the redesign rather than patching it separately.

## Resolved

*(Move items here with a date + one-line note when they're actually done, rather than deleting them.)*

- **Site-wide spacing and typography migration to design/system's real scale** —
  done 2026-09-04 (plan `005-spacing-typography-migration.md`). The app previously
  had **no** spacing or font-size CSS variables at all and `tokens.js`'s scales
  silently disagreed with the template's (app `space.md` was 12, template's is 16);
  the template's scale was adopted as canonical per the user's 2026-08-31 call.
  Phase A emitted `--space-*` / `--fs-*` from `tokens.js` (once in `:root`, not
  per-theme); Phases B and C migrated `index.css`, `App.css`, `auth.css` and
  `search.css`. Verified: no hardcoded `font-size` px in any of the four, only 8
  documented spacing exceptions left (1–2px hairlines, the `-1px` sr-only clip, the
  derived 36px icon inset, the 88px sticky-bar clearance), each var emitted exactly
  once, `npm run lint` clean (4 pre-existing `only-export-components` warnings),
  build succeeds, and three consecutive `npm run tokens` runs are byte-identical.
  `onboarding.css` was deliberately excluded and is **still open above** — see
  "onboarding.css still on the old spacing/type scale". Two deliberate deviations
  from the plan as written are recorded in `CONTEXT-HANDOFF.md` (`search.css` 26px →
  28px to preserve a heading level, and `.ss-row` → `--row-pad-dense` per DESIGN.md's
  density rule).
- **Reorganized design files into `design/` folder** — done 2026-08-31.
  `DESIGN.md` moved from repo root to `design/DESIGN.md`; the Claude Design
  template moved from `Škola Match system design (new)/` to `design/system/`;
  the finished Search wireframe archived to
  `design/archive/school-search-wireframe/`; design-specific research docs
  moved from `docs/sources/` to `design/research/`. Every reference updated
  (`CLAUDE.md`, `docs/sources/README.md`, `DESIGN.md` itself). The redundant
  `ui_kits/skolamatch/Search.jsx` mockup deleted — superseded by the real
  implementation. See `CLAUDE.md`'s "Design system — `design/` folder" section.
- **Widened `.app-content` from 960px to 1280px** — done 2026-08-31, matching
  `design/DESIGN.md`'s stated content width, with real breakpoint media queries
  added (there were none before). Verified live at 1600px (1280px content, 64px
  padding) and 375px (16px padding, no real overflow). See the responsive-design
  entry above for what's still not done.
- **Fixed site-wide font drift (Newsreader/Hanken Grotesk → Fraunces/Public
  Sans)** — done 2026-08-31. `design/DESIGN.md` and `tokens.js`'s own comments
  already specified Fraunces + Public Sans; `index.html` and `tokens.js`'s
  `webOnly` export had never been updated to match. Fixed both, regenerated
  `tokens.css`, verified both fonts actually load (not falling back).
- **Apply DESIGN.md colors to tokens.js** — done 2026-08-28. `tokens.js` now
  has terracotta `#AD4F2A` / moss `#4F7143`, Fraunces + Public Sans fonts.
  `npm run tokens` was run, `tokens.css` regenerated. Site renders in the new
  palette.
- **Supabase setup + schools seeded** — done, confirmed 2026-08-28.
  `schoolCount: 60` after a backend restart to pick up fresh `.env`.
- **Developer email full-access bypass** — confirmed working 2026-08-28. Logic
  was already fully implemented from the earlier laptop merge (`server.js`
  `DEVELOPER_EMAILS` allowlist, auto-promotion to `subscription_status:
  'developer'` on first `/api/me` call); just needed a backend restart to pick
  up the `.env` addition.
