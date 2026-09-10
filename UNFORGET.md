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

## Fix school suggestions
- **Found:** 2026-09-09, user request
- **Urgency:** medium

User flagged this needs fixing — no further explanation given, user says
they'll understand the context when it comes back up.

---

## School detail page §4 marginal (🟡) features not built
- **Found:** 2026-09-08, school detail page rebuild
- **Urgency:** low
- **Effort:** each is its own small-to-medium feature
- **Release/context:** feature-brainstorm.md §4; explicitly deferred per the
  user's instruction to build 🔥/✅ only, skip 🟡

- **Virtual 360° tour** — 🟡, expensive to produce; a school would have to
  supply it, we have no pipeline to make one.
- **Notable alumni** — 🟡, no data source and no way to verify a claim like
  this without real risk of getting it wrong about a named person.
- **School news / announcements feed** — 🟡, "only if schools maintain it" —
  no school-side posting surface exists yet (that's §9, B2B/school-side).

---

## Q&A section (ask current students) deferred
- **Found:** 2026-09-08, school detail page rebuild
- **Urgency:** low
- **Effort:** medium — schema/moderation mostly reusable from reviews
- **Release/context:** feature-brainstorm.md §4 ✅; deferred per explicit user decision

Reviews shipped for real (see CLAUDE.md → "User-generated content"); Q&A did
not, on purpose — it doubles the moderation surface and needs current
students actually answering to be worth anything, which reviews alone don't
prove exists yet. When this gets built, reuse `school_reviews`'s moderation
shape (word filter → held, report → held) rather than inventing a new one —
a question/answer thread just needs one more table (`school_questions`,
`school_answers`) following the same `requireAuth`-only, no-client-RLS-policy
pattern as reviews.

---

## Review verification has no mechanism
- **Found:** 2026-09-08, school detail page rebuild
- **Urgency:** low
- **Effort:** depends on which option — manual is trivial, the others are real features
- **Release/context:** every review currently reads "Neověřeno"; `verified`
  exists on `school_reviews` but nothing sets it to true yet

Options to decide later, not decided now:
1. **Manual** — you flip `verified` by hand in Supabase for reviews you have
   some independent reason to trust. Zero engineering, does not scale.
2. **School-domain e-mail** — a reviewer whose account email matches the
   school's own domain (from `schools.website`) gets auto-verified. Cheap,
   but only works for staff/students with a school email, not parents.
3. **School-claimed profile** — ties into the §9 B2B "claimed profile badge"
   feature: a school that has claimed its profile can verify specific
   reviews itself. The most correct long-term answer, but depends on B2B
   tooling that doesn't exist yet.

---

## Comparison view still does not exist — PLANNED 2026-09-10 as plan 006
- **Found:** 2026-09-08, school detail page rebuild
- **Urgency:** medium — there are now two entry points feeding a selection
  into nothing
- **Effort:** medium (§5 of feature-brainstorm.md — its own small feature)
- **Release/context:** feature-brainstorm.md §5 — now specced in
  [`plans/006-comparison-decision-tools.md`](plans/006-comparison-decision-tools.md),
  design canvas at https://claude.ai/code/artifact/688789aa-b54c-4a5e-b2b6-17b3ee775899

`Search.jsx`'s "Porovnat N škol" button (`pages/Search.jsx`, in the sticky
compare bar) has always been `onClick={() => {}}` — a real no-op, not a bug
introduced now. The school detail page's new "Přidat k porovnání" action
(`components/schoolDetail/SchoolActions.jsx`) adds a SECOND way to build a
selection (`lib/searchPrefs.js`'s `toggleCompareSelection`/`getCompareSelection`,
localStorage, same idiom as recently-viewed and saved filters) — but there is
still no page that reads that selection and renders schools side by side.
Building §5 means: a `/porovnani` route reading `getCompareSelection()`,
fetching those schools, and rendering the "attributes as rows, options as
columns" pattern already researched in `.claude/skills/mobbin-core-product-
patterns/SKILL.md` §C.

**Status 2026-09-10:** planned in full, not yet implemented. Plan 006 covers
every §5 row except the two carved out below.

---

## Full share-with-parent link — deferred until parent/child accounts are decided
- **Found:** 2026-09-10, explicit user decision while scoping plan 006
- **Urgency:** medium — it is the parent branch's whole conversion mechanic
- **Effort:** large, and mostly NOT frontend work
- **Release/context:** feature-brainstorm.md §5, the row below "Share shortlist
  with parents"; deliberately excluded from
  [`plans/006-comparison-decision-tools.md`](plans/006-comparison-decision-tools.md)

Plan 006 ships the NARROW version: `/sdileni/:token` shows the student's three
picks, their order, the risk analysis and (opt-in) their notes. That is the
"Share shortlist with parents" 🔥 row and it is self-contained.

The BROADER row — one link giving a parent read-only access to *everything* the
student has done (all saved schools, questionnaire answers and results, match
scores, every note) — **is deliberately not built**, at the user's explicit
instruction, because it cannot be designed without first answering questions
that are commercial, not technical:

- **Who pays, and for what?** If a parent can see the full result set through a
  share link with no account, the parent-branch paywall has nothing left to
  sell. If they cannot, the link is worthless as a conversion mechanic. The
  line between "enough to be worth opening" and "so much there is no reason to
  pay" is a pricing decision, not an engineering one.
- **How do a parent and a child sit on one plan?** `users` currently has no
  concept of a linked account. feature-brainstorm.md §6 lists "Parent account
  linked to student account" 🔥 and "Multiple children per parent account" ✅ —
  both unbuilt. Does one purchase cover both people? Does the parent's
  subscription grant the child access, or the reverse? `subscription_status`
  lives on a single row today and has no answer for this.
- **Does it flow both ways?** feature-brainstorm.md's own note says this ships
  together with the reverse direction (a parent on the parent branch sending
  the questionnaire to their child's device) because it is the same share-token
  + cross-device-session plumbing pointed the other way. Building one half now
  means writing that plumbing twice.
- **GDPR.** A link exposing a minor's full questionnaire answers is a much
  bigger disclosure than three school names. Worth checking against the Art. 8
  work already recorded in the paywall legal entry above.

Until this is resolved, the parent branch keeps the inert, explicitly-unbuilt
"Poslat odkaz dítěti" control on the first quiz question plus the same-device
"hand them the phone" nudge (`QuizQuestion.jsx`) — unchanged by plan 006.

**Do not build this piecemeal.** Settle the pricing/account model first, then
build both directions in one pass.

---

## Share link is copy-only — no email delivery
- **Found:** 2026-09-10, user decision while scoping plan 006 ("Option A for
  now, implement option B later")
- **Urgency:** low — copying a link into WhatsApp is what teenagers actually do
- **Effort:** small once an email provider exists
- **Release/context:** [`plans/006-comparison-decision-tools.md`](plans/006-comparison-decision-tools.md) §8

`POST /api/shares` returns a token the student copies. There is no "e-mail it to
my parent" path, because the app has **no transactional email provider wired up
at all** — Supabase Auth sends confirmation and reset mail through its own
built-in sender, which is not a general-purpose send channel for app content.

Adding email delivery means picking a provider (Resend/Postmark/SES) and adding
the key to `.env`, which is the same prerequisite as the deadline-reminder
emails in feature-brainstorm.md §3 and §11 — all of which are 🔥. **Do that once
for all of them, not separately for this one feature.**

Note the minors angle when it happens: sending mail to a parent's address that a
15-year-old typed in is a disclosure of the child's data to an address nobody has
verified belongs to a parent. A copy-link flow has no such problem, which is part
of why it is a reasonable place to stop for now.

---

## Maturita pass rate, VŠ placement, and six other §4 items have no data source
- **Found:** 2026-09-08, school detail page rebuild
- **Urgency:** low — all render as an honest "Nemáme tuto informaci." on the
  school detail page (`components/schoolDetail/MissingDataGrid.jsx`), never a
  fabricated value
- **Effort:** varies a lot per item, see below
- **Release/context:** feature-brainstorm.md §4 🔥/✅ items the user explicitly
  asked to placeholder rather than skip

- **Maturita pass rate** 🔥 and **VŠ placement (kam míří absolventi)** 🔥 —
  Cermat publishes per-school maturita results as a downloadable file, same
  shape as the JPZ admissions file already imported. **The user is sending
  this file separately; do not build the import until it arrives** — when it
  does, mirror `scripts/import-admission-data.js`'s pipeline (REDIZO-first
  match, fuzzy fallback, per-school aggregation) rather than writing a new
  one from scratch. VŠ placement specifically has NO known public per-school
  dataset — even once the maturita file lands, that one section may stay a
  placeholder.
- **Tuition/školné at private and church schools** — public schools already
  show a real, correct "no fee" line (inferred from `zrizovatel`, not
  invented); private/church schools have no fee data at all. A cowork prompt
  scraping each school's own website for a fee page is the plausible next
  step — ask the user before running it (see `docs/sources/
  platform_onboarding_research.md`-style caution around scraping claims).
- **Obědy/ubytování, kroužky, ředitel/ka name** — same story: each school's
  own website likely has this, but genuinely needs a per-school scrape, not
  something derivable from data already held. A candidate n8n or cowork
  workflow, not a code change.
- **Employment outcomes for vocational schools** ✅ — no data source found;
  unclear one exists publicly at all for Czech vocational schools.

---

## Onboarding: email confirmation gate temporarily disabled

- **Found:** 2026-09-05, user request
- **Urgency:** low now — no real charges happen yet (Paywall is fully mocked) —
  high before Stripe goes live
- **Release/context:** blocks nothing today; must be re-solved before real payments

`CreateAccount.jsx` (`frontend/src/pages/onboarding/screens/CreateAccount.jsx`)
used to block on a "check your email" screen after signup, because Supabase
issues no session until the confirmation link is clicked. That screen was a
dead end: the confirmation link opens in whatever tab/device the email client
uses, and there is no cross-context browser API for one tab to hand control
back to a specific other tab — "return to the same onboarding tab" is not
something a web page can do, regardless of implementation effort. The
confirmation link redirected to `/prihlaseni?potvrzeno=1` (generic Login),
dropping the user out of the onboarding flow entirely.

**Current state:** `CreateAccount.jsx` now calls `goNext()` immediately after
`signUp()` succeeds, regardless of `needsEmailConfirmation`. This is safe
today because `Paywall.jsx` right after it is fully mocked and calls nothing
protected — no `requireAuth`-gated route is hit unconfirmed. Server-side,
`requireAuth` in `server.js` still checks `email_confirmed_at` and rejects
unconfirmed tokens on every protected route (favorites, questionnaire, real
checkout) — that enforcement is untouched. So today: an account is created,
the flow continues, but the user simply won't be able to use anything
protected until they eventually click the confirmation link (whenever, no
longer blocking).

**What needs to happen before Stripe goes live:** either (a) change
`emailRedirectTo` in `AuthContext.jsx`'s `signUp`/`resendConfirmation` to
redirect into `/onboarding/<next-step>` instead of `/prihlaseni` when the
signup happened inside onboarding — this only helps when the same browser
opens the link (common case, not guaranteed) — or (b) require confirmation
again before the real checkout call specifically, with a clear in-flow
"check your email to unlock payment" moment instead of the old full-flow
block. Either way, don't let a real charge process for an unconfirmed email.

---

## Legal check on the paywall — one real open question, one resolved

- **Found:** 2026-09-05, checking `onboarding-architect.md`'s legal constraints
  (§0.4) against primary sources rather than secondary commentary
- **Urgency:** medium now, high before real money moves
- **Release/context:** must be resolved before Stripe goes live (the current
  checkout is mocked)

**Resolved, favorably — GDPR Art. 8 age of consent.** `onboarding-architect.md`
assumed the EU default (16) applies. It does not: **Czech law lowered it to 15**
via Act No. 110/2019 Coll., §7. A 9th grader taking the quiz can legally consent
to that data processing themselves, no parent needed. Source:
[ARROWS](https://arws.cz/en/news-at-arrows/compliance-with-the-requirements-of-the-office-for-personal-data-protection-regarding-consent-to-the-processing-of-personal-data-of-minors).
No action needed, but this is age-sensitive — re-check if the product ever
targets 8th graders (age 14).

**Open, and this is the one that matters — contract capacity to pay.** GDPR
governs consent to *data processing*, not the capacity to *pay money*, which is
a different area of law (Czech Civil Code). A minor's legal capacity there is
only "matters appropriate to their intellectual and volitional maturity" —
deliberately vague, and no source found states whether a 690 Kč purchase falls
inside or outside that line for a 15-year-old.
([Dostupný advokát](https://dostupnyadvokat.cz/en/blog/rights-and-responsibilities-for-children))

The onboarding-v2 paywall design (`design/onboarding-v2/Paywall.dc.html`) already
has a parental-confirmation checkbox before the mocked charge, per ruling C-8.
**That checkbox is a UX safeguard, not a legal fix** — it doesn't transfer
contractual capacity. If the card actually charged is the parent's own, this is
moot. If a minor could ever complete checkout with their own card/account
directly, the contract's validity is an unresolved question a generalist search
cannot answer. **Get this read by someone with Czech consumer/contract law
expertise before Stripe integration goes live with real charges** — this is
squarely gated on that work, not on anything already built.

**2026-09-05 revision (multi-page paywall, `design/paywall-multipage/`):** the
blocking parent-confirmation *screen* was replaced with a single self-attestation
checkbox — "Potvrzuji, že je mi 18 let, nebo že o téhle platbě ví můj rodič či
zákonný zástupce" — matching the industry-standard pattern (App Store, Netflix,
etc. all use unverified 18+ checkboxes). User's explicit call: they expect most
minors will check it without it being true, same as everywhere else, and accept
that risk — the goal is having *a* documented consent step, not verifying it.
A "Ať to zaplatí rodič" (let my parent pay this) option still exists alongside
it, reframed from a demanding "send parent a link to approve" into a neutral
delegation the student chooses. **This does not change the open legal question
above** — still needs real lawyer review before Stripe goes live — but it's a
materially different mitigation shape (self-attestation vs. hard gate) than what
that review was scoped against, so flag the new copy specifically when this
finally gets legal eyes.

**Also confirmed, informational:** the Digital Fairness Act (EU proposal, expected
Q4 2026) *does* name minors specifically — a proposed default ban on "addictive
design" aimed at children (infinite scroll, autoplay, exploitative gamification)
and scrutiny of influencer marketing to minors
([European Parliament, Oct 2025](https://www.europarl.europa.eu/news/en/press-room/20251013IPR30892/new-eu-measures-needed-to-make-online-services-safer-for-minors)).
Nothing currently built or designed violates this, but it applies to the planned
TikTok/Instagram influencer acquisition channel too, not just onboarding screens
— worth remembering when that campaign gets built, not just now.

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

## Multi-page paywall — decisions deferred out of the 2026-09-05 redesign
- **Found:** 2026-09-05, designing the 5-screen paywall
  (`design/paywall-multipage/`, artifact `7b40dacd`)
- **Urgency:** medium — none of these block the design proposal, all block go-live
- **Risk of fixing now:** the one-time offer specifically was deferred by explicit
  user instruction — do not reintroduce it without them raising it
- **Effort:** mixed, per item
- **Release/context:** blocks Stripe go-live alongside the pricing decisions above

1. **One-time discount offer — judgement deliberately postponed.** The user asked
   for it to be left out of the multi-page paywall and revisited later. It still
   exists in code (`ONE_TIME_OFFER` in `pricing.js`, `lib/offerEntitlement.js`,
   ruling C-9) and is *not* being deleted. The open question is whether a 15-minute
   countdown belongs on a paywall aimed at minors at all: the Mobbin survey files
   manufactured countdowns as its headline anti-pattern, and
   `pricing_research.md` §4 puts countdown-plus-minors in the DSA Art. 25 zone.
   Note the discount itself is genuine (the price returns to normal, the product
   never becomes unavailable), which is what keeps it arguable rather than settled.
   **Decide before Stripe go-live; until then it stays out of the flow.**

2. **Real user reviews on the paywall, once there are real users.** Deliberately
   nothing today: `frontend/src/config/socialProof.js` is empty on purpose and the
   paywall says out loud that we don't publish invented reviews. Once the app has
   launched and genuine reviews exist, fill `STUDENTS_HELPED` and `TESTIMONIALS` —
   the count line and an attributed quote then appear above the method claims with
   no component change. Per the Mobbin survey, a review must carry a **named
   attribution and a source** to do any work; a bare five-star row is worth nothing.
   Both persona branches need their own quotes (student and parent read different
   proof — authority for the parent, peer for the student).

3. **Card-gated trial contradicts our own research — accepted knowingly.**
   `pricing_research.md` §4 records that the Digital Fairness Act direction "would
   restrict collecting payment details upfront purely to gate a trial." Not binding
   law, and it is the industry norm — but the audience here is minors, which is the
   exact combination §4 flags. Built per the user's explicit instruction. Revisit if
   the DFA is adopted, or if a Czech consumer-law review ever happens.

4. **Trial moves from Měsíční to Sezónní** (proposed 2026-09-05, awaiting approval
   of the design). Today `pricing.js` has `hasTrial: true` on `monthly` and `false`
   on `season`, which is backwards on two counts: research §2 says trials belong on
   the longer commitment so users can't trial-hop the cheap tier, and `pricing.js`'s
   own `REFUND_GUARANTEE_DAYS` comment complains that the pre-selected season plan
   has no exit at all. A trial solves that better than a refund window. Each plan
   then keeps an exit of its own shape: season = 3 days to change your mind,
   monthly = cancel whenever. **Flipping these two flags also needs the checkout to
   support a one-time charge with a delayed start**, which the subscription-mode-only
   `/api/checkout` cannot do yet (see Stripe integration below).

5. **`/api/schools*` must be gated once the free tier is gone.** CLAUDE.md records
   it as *deliberately* ungated because the onboarding quiz reads school data before
   an account exists. With no free browsing that reasoning partly lapses — but the
   quiz still runs pre-account, so the gate has to distinguish "quiz scoring a
   session" from "browsing the database". **`withMatchScores` must survive whatever
   query replaces it**, or every match percentage in the app disappears silently.

6. **`perDayCzk()` formats money to one decimal.** `pricing.js` uses `toFixed(1)`,
   producing "3,3 Kč" where Czech prices want "3,30 Kč". Cosmetic, one character,
   but it sits on the largest number on the plan card.

7. **Video paywall — recommended, not built.** A 15–20s silent looping screen
   capture (ranked list scrolling, then one explanation card expanding) on the value
   screen would carry the "what am I actually buying" job better than any copy, and
   the Mobbin survey backs showing the artefact over describing it. Not built
   because the video has to be recorded, not coded. If the user records one, it
   drops into screen 1 above the headline. Keep it silent, autoplay, looping, with a
   static poster frame — no audio, no controls, no fake UI.

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

## Search page ships synthesized stand-in data — mostly resolved 2026-09-08
- **Found:** 2026-08-30, Claude Design import of `School Search.dc.html`
- **Resolved 2026-09-08:** `admissionCutoff`, `acceptanceRate`, `hasTalentExam`
  and `schoolType` are now REAL — imported from Cermat's 2026 kolo1 results via
  `scripts/import-admission-data.js` into `schools.admission_cutoff` /
  `acceptance_rate` and the new `school_programs` table (maturita status,
  zřizovatel, typ školy, JPZ requirement, jazyk studia, KKOV, kapacita — one
  row per obor). `frontend/src/pages/Search.jsx` reads all of it for real now;
  13 filters total, reorganized into an accordion (see the design canvas
  linked below) so 13 checkbox groups never render flat/unweighted.
- **Still synthetic:** only `commuteMinutes` and the `districtLabel` fallback
  (used when a school has no real district). The commute filter/sort are
  rendered visibly disabled ("zatím nedostupné"), not deleted, not silently
  inert-looking — see the "Dojezd MHD needs a routing-API decision" entry below.
- **Risk of NOT finishing:** none currently — nothing fabricated ships. The
  original risk (a student choosing a school on an invented cutoff) no longer
  applies to any filter or number rendered on the page.

`differentiator` is deliberately NOT synthesized — it is derived from real
`deriveFeatures()` output, because inventing editorial claims about named schools
reads as researched fact in a way a number in a labelled cell does not.

Design canvas for the redesigned search + map:
https://claude.ai/code/artifact/e2a398f2-e68d-4cda-8409-05070cf0937b

---

## Two schools still have no admission data
- **Found:** 2026-09-08, first real Cermat import
- **Urgency:** low — self-resolving
- **Effort:** none needed unless still empty after all 5 years' files are in

`Bezpečnostně právní akademie, s. r. o., střední škola` (REDIZO 691020515) and
`Hotelová škola, Praha 10, Vršovická 43` (REDIZO 600004741) both have a stored
REDIZO from `scripts/backfill-redizo.js`, so they match instantly on any future
import — they simply had no rows in the 2026 kolo1 file (round-2-only
admission, or some other reason not investigated). No action needed unless
they're still empty after importing the remaining 4 years' files.

---

## Saved filter presets / recently viewed are localStorage-only
- **Found:** 2026-09-08
- **Urgency:** low
- **Effort:** medium — needs a `data/users/<id>/...`-shaped table + RLS if moved to Supabase

`frontend/src/lib/searchPrefs.js` stores recently-viewed school ids and saved
filter presets in `localStorage`, per-device. This was a deliberate choice
(matches the GDPR-minimisation stance already used for quiz answers), not an
oversight — but it means a visitor loses this state on a different device or
after a browser wipe. Revisit if/when account-backed state becomes the norm
elsewhere in the app.

---

## Dojezd MHD needs a routing-API decision
- **Found:** 2026-09-08
- **Urgency:** medium — a 🔥-rated filter (feature-brainstorm.md §1) is currently disabled
- **Effort:** medium (Google) to large (self-hosted)

The commute filter and "Nejkratší dojezd" sort are shipped visibly disabled
("zatím nedostupné") in `Search.jsx`, not deleted. Real MHD (public transit)
time has no free option:
- **Google Distance Matrix, transit mode** — not free, but the $200/mo Google
  Cloud credit covers roughly 20,000 calls/month ≈ 330 users doing a full
  60-school lookup before any real cost.
- **Self-hosted OpenTripPlanner on PID's free GTFS feed** ([pid.cz/en/opendata](https://pid.cz/en/opendata/))
  — free data, but real infrastructure to run and maintain.
- Straight-line (haversine) distance is free but is NOT commute time and
  would need its own honest labelling ("~X km vzdušnou čarou"), not reused as
  a stand-in for "dojezd MHD".

Needs the user's decision before building either path.

---

## Cermat import — resolved 2026-09-08, 3-year average is final (kolo 2 deliberately excluded)
- **Resolved:** 2026-09-08

Only 3 years of kolo1 data exist (2024/2025/2026 — earlier years aren't
published/available); the import was run with all 3
(`node scripts/import-admission-data.js PZ2024_kolo1_....xlsx
PZ2025_kolo1_....xlsx PZ2026_kolo1_....xlsx`). 58/60 schools now have
cutoff/acceptance averaged across 3 years, 697 `school_programs` rows written.
This is the final state — there is no 4th/5th year to add.

**Kolo 2 (2nd round) files were deliberately not requested or imported.**
Kolo 2 only runs at schools that didn't fill up in kolo 1 — it's a
leftover-capacity round, not a second sample of the same admission difficulty.
Blending it in would (a) understate cutoffs in a way that reflects "how much
capacity was left over" rather than "how hard is it to get in," and (b) do so
inconsistently, since only some schools ever run a kolo 2 — making those
schools look artificially easier relative to ones that filled up in round 1
and have no kolo 2 data at all. Kolo 1 only is the correct, comparable signal.
Do not add kolo 2 data back in without re-opening this decision explicitly.

Still real, unresolved: 3 schools have no cutoff (2 have zero data at all —
Bezpečnostně právní akademie s.r.o. and Hotelová škola Vršovická; one, Dívčí
katolická střední škola, has acceptance data but no cutoff score in any of the
3 files). All three render `—`, never a fabricated number. No action needed
unless a future year's file still doesn't cover them.

---

## `frontend/src/api.js` defaults to the wrong backend port
- **Found:** 2026-09-08
- **Urgency:** low — harmless while `frontend/.env` is present and correct
- **Effort:** trivial — one line

`API_BASE_URL` in `frontend/src/api.js` falls back to `http://localhost:5000`
when `VITE_API_BASE_URL` is unset. The real backend on this machine runs on
**5001** — port 5000 is claimed by macOS's AirPlay Receiver (Control Center),
not this app. As long as `frontend/.env` sets `VITE_API_BASE_URL` correctly
this never bites, but the fallback itself is stale and would silently fail if
that env var ever went missing.

---

## Backend payload size — school_programs nesting
- **Found:** 2026-09-08
- **Urgency:** low
- **Effort:** revisit together with the existing "Backend pagination" item below

`/api/schools` now returns each school with its full `school_programs` array
nested (`select('*, school_programs(*)')` in `server.js`), adding roughly 250
rows / ~50KB to the response at current data volume (1 year imported). This
will grow proportionally as more years are imported (up to ~5x once all 5
Cermat files are in). Acceptable today; revisit alongside pagination if it
ever becomes a real page-load problem.

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

1. **Photo gallery verification — RESOLVED FALSE, 2026-09-08.** `docs/sources/
   feature-brainstorm.md`'s claim that school photos (and, separately, videos)
   were "already scraped" is wrong. Checked directly against the live
   `schools` table, `school_programs`, and the old laptop dataset — no photo
   or video column/data exists anywhere, and the laptop build's own CLAUDE.md
   said as much explicitly ("Nothing to bind a banner to... don't fake one
   with a placeholder"). Director name is likewise not scraped. All three now
   render as honest placeholders on the school detail page
   (`MissingDataGrid.jsx`) instead of being treated as available. Do not
   re-trust this brainstorm claim in a future session.
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

## App palette neutrals — VISUAL CHECK STILL OWED
- **Found:** 2026-09-04 · **fixed the same day**, see Resolved
- **What is still open:** only the human eyeball pass. The token change itself is
  done and built clean, but the browser tools are blocked on this machine
  (CLAUDE.md, top), so **no screen has actually been looked at** on the new
  palette. Every surface in the app changed at once.
- **Urgency:** medium — a contrast or fill regression would be live and unseen
- **Effort:** minutes, but needs a person at a browser
- **What to look at,** in rough order of how likely they are to break:
  1. **Anything that was a white card on off-white.** `surface` is now the *same*
     value as `bg`, so cards separate by hairline alone (DESIGN.md's own
     elevation rule). Search results, school detail, settings, favourites — check
     nothing reads as a flat undifferentiated sheet.
  2. **`onboarding.css`** (1,882 lines, the largest consumer) — option cards,
     selected states, the progress track.
  3. **Auth pages** (`/prihlaseni`, `/registrace`) — inputs are wells on
     `--surface2`, which moved.
  4. **`.btn-primary`** — soft terracotta fill; confirm the label still reads.
  5. **Dark mode**, if reachable — it was rewritten wholesale from DESIGN.md's
     dark block and has never been rendered.

## Landing page: three gaps carried over from the mockup
- **Found:** 2026-09-04, porting `ui_kits/skolamatch/Landing.jsx` onto `/`
- **Urgency:** low — none of them block the page working
- **Risk of fixing now:** none; each is additive
- **Risk of NOT fixing:** the hero has a visible empty photo slot, which is fine
  internally but not shippable to real visitors
- **Effort:** small each
- **Release/context:** the photograph is a pre-launch blocker; the other two are not

1. **No hero photograph.** `.ls-photo` is a labelled dashed placeholder. DESIGN.md
   calls for real photography of real people, not illustration, and no asset
   exists — `frontend/src/assets/hero.png` is an abstract purple 3D shape left
   over from the retired design system, in a hue DESIGN.md explicitly bans, so it
   cannot be used. Hidden below 900px, so mobile is unaffected.
2. **The ambient idle animation is not implemented.** DESIGN.md's "Motion —
   landing page" section specifies exactly one slow, contained idle loop
   (CSS keyframes on `transform`/`opacity`, Linear/Stripe register — never a
   mascot, never full-screen). The mockup omits it too and says so. This is the
   landing page's one sanctioned piece of ambient motion.
3. **The footer is landing-only.** `Shell.jsx` treats it as chrome shared by every
   screen, but `components/Layout.jsx` has never had a footer and adding one
   globally would change eight pages that were not part of this port. Two of the
   mockup's footer links ("Zdroje dat", "Kontakt") were dropped rather than
   shipped as dead `href="#"`; restore them when those pages exist.

## Resolved

*(Move items here with a date + one-line note when they're actually done, rather than deleting them.)*

- **School Detail Pages — still minimal** — done 2026-09-08. Rebuilt from
  feature-brainstorm.md §4: real per-obor breakdown with a 3-year Cermat
  trend, a single static map pin, real reviews (see CLAUDE.md → "User-
  generated content"), and honest placeholders for the eight §4 items with
  no real data source. See CLAUDE.md's "What's Already Built" item 10 for
  the full description, and the new entries above for what's still open
  (Q&A, review verification, the comparison view, maturita data).
- **App palette neutrals migrated to DESIGN.md's warm paper ramp** — done
  2026-09-04, in `frontend/src/design/tokens.js` (+ `npm run tokens`). The
  2026-08-28 pass had taken the accent and the fonts but left the neutrals on the
  older cooler ramp, which broke DESIGN.md's outright rule against `#FFFFFF` and
  `#000000` in two places (`--surface`, `--acc-ink`). Both light and dark
  palettes were replaced wholesale from DESIGN.md → Colour / Dark mode.
  Two judgement calls worth knowing about:
  **(a)** DESIGN.md names only two paper values but the app's scale has three
  levels, and the file says explicitly *"Surface is the page and any raised
  content; Neutral sits a half-step down for cards and rows."* So `bg` and
  `surface` are both `#FAF6EF` and `surface2` is `#F1ECE3` — raised content
  separates by hairline, not by a brighter fill, which is that same file's
  elevation rule. The alternative was inventing a paper value above Surface, and
  the only thing above Surface is white.
  **(b)** DESIGN.md's dark block does not name an `ink2` or a `line2`; both were
  interpolated inside its own ramp rather than carried over from the retired cool
  palette. Also warm-tinted the two box-shadows, which were mixed from a cool
  near-black. `npx vite build` green; CSS 46.43 kB. **The visual check is still
  owed** — see the open item above.

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
