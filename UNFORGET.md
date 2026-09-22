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

## Season charge vs account deletion — residual race (mostly closed)
- **Found:** 2026-09-21, Codex handoff
- **Urgency:** Low
- **Risk of fixing now:** Needs an atomic claim on the user row; not worth complexity yet.
- **Risk of NOT fixing:** A scheduler run that already created the PaymentIntent a split second before deletion still charges once; refundable manually.
- **Effort:** Small–medium
- **Release/context:** `DELETE /api/me` deletes the Stripe customer BEFORE the user row, so any charge attempted afterwards fails (`resource_missing`) and cannot succeed. Only the microsecond window remains.

## Launch legal checklist — no lawyer, so transparency by default (2026-09-21)
- **Found:** 2026-09-21, founder cannot afford a lawyer before launch; legal pages rewritten with no lawyer placeholders and the most consumer-friendly option wherever the law leaves a choice
- **Urgency:** Launch blockers (each item below)
- **Risk of NOT fixing:** ČOI fines (up to 5 M Kč for consumer-law breaches), GDPR complaints to ÚOOÚ, refund disputes
- **Effort:** Small to medium each; most are operational, not code
- **Release/context:** `Legal.jsx` (Terms + Privacy), Stripe dashboard, an inbox for the operator e-mail

Before real money, do ALL of these:
1. **Operator facts** — fill every `[DOPLNIT]` in `Legal.jsx`: adult/company name, IČO, address, e-mail, VAT payer or not, Supabase region, e-mail provider. Then set `DRAFT = false`. The same adult must own the live Stripe account and keys.
2. **Withdrawal process (Terms §6)** — one inbox that gets the operator e-mail; on a request: refund in the Stripe dashboard within 14 days, cancel the subscription, set the account to canceled. Same for the "minor paid without parent consent → full refund" promise (§7). `REFUND_GUARANTEE_DAYS` stays 0.
3. **Withdrawal button — BUILT 2026-09-21; legally mandatory from 1 Jan 2027** (Act 159/2026 Sb., per Cowork research `docs/legal-research/01-…`; verify the effective-date article on e-sbirka.cz). `POST /api/subscription/withdraw` + Settings "Odstoupit od smlouvy" → confirm details (name, e-mail, plan, date) → "Potvrdit odstoupení od smlouvy". Stops billing, refunds every payment since the plan started (idempotent), ends access. Still to do: (a) test in Stripe test mode: monthly, season before charge, season after charge; (b) Stripe dashboard → turn ON "Email customers about refunds"; (c) the acknowledgement e-mail with date/time on a durable medium (item 4, needs SMTP); (d) the enacted Czech button labels were only reported by secondary sources — check them.
4. **Every e-mail that law requires but the app does not yet send — all blocked on the SMTP provider (item 5).** None of this exists today: there is no outgoing-mail code beyond Supabase Auth's own confirmation/reset e-mails. Build in this order once SMTP is chosen:
   - **Order confirmation (§1824, durable medium)** — after `checkout.session.completed`, e-mail the account holder: the terms as they stood at purchase (link + timestamp is enough, a PDF is not required), the plan, price, charge date, and the withdrawal form. Stripe's own receipt (once turned on, see item 10) is not a substitute — it doesn't carry the terms.
   - **Withdrawal acknowledgement (§1830a point 4)** — `POST /api/subscription/withdraw` must e-mail an acknowledgement of receipt with the exact date and time of the request, "without undue delay". The endpoint already returns this data (`at`, `refundedCzk`) — just needs a mailer call added.
   - **Review report outcome (DSA Art. 16(4)-(5))** — confirm receipt of a report immediately (in-app receipt already ships), then e-mail the reporter the decision once a human resolves the hold, with redress info.
   - **Review moderation notice (DSA Art. 17)** — the in-app statement of reasons already covers "at the latest when imposed"; an e-mail copy is good practice but not required since the reason is visible in the app immediately.
   - **Season-pass pre-charge reminder** — not a legal requirement, but see the existing UNFORGET entry on Supabase's 2/hour cap; bundle this mailer work with that one.
5. **Custom SMTP + re-enable Supabase e-mail confirmation** (existing entries).
6. **Processor agreements (DPAs)** — accept the standard online DPAs of Supabase, Stripe, Vercel, Railway, OpenRouter, Cloudflare; keep a simple record of processing activities (Art. 30) and a data-breach plan (notify ÚOOÚ within 72 h).
7. **Order button** now reads "Objednat s povinností platby" (Platba.jsx, SubscriptionExpired.jsx) — do not rename it back.
8. **Inactive accounts** are not auto-deleted (stated honestly in the policy); add an automatic rule later.
9. **Minors (Cowork file 02):** monthly (recurring) plan now requires an 18+ attestation; students are told to send the link to a parent. Season (one-off) keeps "18 or parent agrees". Best fix once SMTP exists: parent confirms by e-mail link (store timestamp + e-mail) and the student/parent flows carry `payer = parent`. Also: **Refund abuse by minors:** the minors clause (Terms §7) gives a full refund within 30 days of payment and only a pro-rata refund of the unused period afterwards, so buying a season pass and refunding it after the March DiPSy deadline returns almost nothing. The pro-rata refund is a manual process (Stripe dashboard); an automatic calculation is not built.
10. **Season charge vs account deletion** — mostly closed by deleting the Stripe customer before the user row; only a microsecond window remains.
11. **Accessibility Act** — micro-enterprises are exempt; revisit if the company grows.
12. **DSA follow-ups (Cowork file 06):** review authors see the statement of reasons in-app (Art. 17); report form asks for reason + good faith (Art. 16). Missing: a report is still login-only; receipt/outcome e-mails to the reporter and the author need SMTP; Art. 11 contact point in Terms §9 needs the operator e-mail; DSC in Czechia will be ČTÚ (Czech implementing law still pending).
13. **Re-check the law before launch** — the withdrawal-button status (now known: 1 Jan 2027), ČOI ADR details, and the age-of-consent rule (15) can change.

## Privacy policy + terms — Codex fact-check and open placeholders
- **Found:** 2026-09-21, drafted from what the code actually does; 14-day withdrawal right added 2026-09-21
- **Urgency:** Medium — Codex review and placeholder fill before launch
- **Risk of fixing now:** None; the 14-day withdrawal right is EU law, not a promise — we're just stating it clearly
- **Risk of NOT fixing:** Selling with incomplete terms (operator info missing) or undeclared processors
- **Effort:** Small — fill `[DOPLNIT]` placeholders, Codex fact-check, launch ready (no lawyer needed for the 14-day statement itself — it's the law)
- **Release/context:** `frontend/src/pages/Legal.jsx` (routes `/obchodni-podminky`, `/ochrana-osobnich-udaju`, footer links in `Layout.jsx`). Account deletion now deletes Stripe customer. Signup has age/consent checkbox.

Set `DRAFT = false` in `Legal.jsx` after Codex report and placeholders filled.
- **OPERATOR — add BEFORE LAUNCH:** name/firma, IČO, address, e-mail, VAT status. Must be an adult or company. Placeholders `[DOPLNIT]` in both pages; same adult holds live Stripe keys.
- **14-day withdrawal right:** now stated plainly as EU law (no checkbox, no digital-exemption attempt). Compliant as-is; users have the right, most won't use it. Codex should verify the wording matches the Directive.
- **Minors:** signup has required checkbox "15+ or parental consent, I accept terms" and stores `accepted_terms_at`. Self-declaration only (not verified by age); this is a reasonable baseline for a student product, but a lawyer should confirm before real-money launch. The checkbox is not trying to remove consumer protections, just documenting consent.
- **OpenRouter/Gemini:** Codex to verify quiz answers can't carry personal data to the model (policy says name/email never sent).
- **Supabase region, inactive-account retention, SMTP provider name, payment data retention** — fill from actual setup.

## Production test of the season-pass scheduled charge
- **Found:** 2026-09-21, after the first live-site test-mode purchase
- **Urgency:** Launch blocker — must pass before live Stripe keys
- **Risk of fixing now:** None; deferred only to prioritise legal pages.
- **Risk of NOT fixing:** The webhook and card-save path is proven on production, but the Railway scheduler charging 690 Kč when `season_charge_due_at` arrives has only been proven locally.
- **Effort:** Small — set `season_charge_due_at` to a past time for the test account in Supabase, wait for the scheduler, confirm exactly one 690 Kč test charge, `season` status, access until 31 March
- **Release/context:** Stripe test-mode matrix; run on production (Railway) with `sk_test_*` keys

The test account `vojtech.kadlec@montetrida.cz` currently holds a saved SetupIntent with a
charge due 2026-09-24 (the scheduler will charge it on its own then — the test can just
observe that). Also re-run the no-double-charge check after a Railway restart.

## Re-enable Supabase email confirmation before production
- **Found:** 2026-09-21, Stripe test-mode testing on the live site
- **Urgency:** Launch blocker — must be done before any real-money launch
- **Risk of fixing now:** Re-enabling during testing brings back the 2-emails/hour cap and blocks fresh test signups.
- **Risk of NOT fixing:** Anyone can start a trial (and a paid plan) on an email they don't own; `requireAuth` in `server.js` relies on `email_confirmed_at`, which Supabase sets instantly when confirmation is off, so the trial/abuse guard silently stops working.
- **Effort:** Small — dashboard toggle (Authentication → Providers → Email → "Confirm email"), but only after custom SMTP is set up (see the SMTP entry)
- **Release/context:** Pre-launch checklist, together with custom SMTP and live Stripe keys

Email confirmation is deliberately switched OFF in the Supabase dashboard while
testing payments. No code was changed — turn the toggle back on and re-test
signup → confirm → login before launch.

## UI consolidation plan 012 — implementation and signed-in verification pending
- **Found:** 2026-09-21, browser-first UI audit with `/codex-plan-then-build`
- **Urgency:** High for mobile search/detail usability; implement after plan approval
- **Risk of fixing now:** Shared CSS and dialog behavior affect questionnaire/onboarding consumers; an unbounded library migration would enlarge the change substantially.
- **Risk of NOT fixing:** Mobile filters delay results, detail contact links crowd the fixed action bar, empty map results lose recovery, and dialog focus behavior remains incomplete.
- **Effort:** Medium–large, four bounded implementation chunks
- **Release/context:** Existing search, school detail, auth, settings and shared UI quality

The handoff is [plan 012](plans/012-ui-system-consolidation.md). It includes exact
files, resolved design decisions, browser evidence and verification requirements.
It is **proposed, not implemented**. Colors and UI dependencies remain unchanged.
Signed-in settings and confirmation dialogs were inspected in source only because
the audit browser was anonymous; their visual/keyboard checks must be completed
with a suitable development/test session during implementation. Keep the matrix's
separate confirmation migration under its existing review gate below.

## Search map labels overlap; map resize needs a separate check
- **Found:** 2026-09-21, plan 012 browser audit of `/skoly` map view
- **Urgency:** Medium — map usability on mobile/tablet
- **Risk of fixing now:** Marker grouping/selection and Leaflet sizing require a focused map check and could distract from the existing-system consolidation.
- **Risk of NOT fixing:** Dense results are difficult to identify; viewport changes can leave part of the map without tiles.
- **Effort:** Medium; reproduce sizing separately before deciding the label solution
- **Release/context:** Search map; deliberately outside plan 012 except for zero-result recovery

With 223 schools at 768×1024, many full-name labels overlapped into a dense pile.
Changing viewport size also left partially filled map tiles. Inspect
`frontend/src/components/SchoolMap.jsx` marker labels and container resize handling;
verify `invalidateSize` on actual layout changes before choosing a clustering or
selected-label design. Do not infer that this needs a replacement map library.
Recheck filtered results, selected school, fullscreen and mobile/desktop transitions.

## Audit follow-up: current-state documents need deliberate consolidation
- **Found:** 2026-09-20 during the repository cleanup review
- **Urgency:** Medium — resolve before relying on the repository docs as an agent handoff
- **Risk fixing now:** Editing instruction and source-of-truth documents casually could change future agent behavior, erase useful historical context, or hide a real product decision.
- **Risk NOT fixing:** Agents can load conflicting or stale guidance and plan from incorrect product status, especially around payments, design provenance, and completed work.
- **Effort:** Medium; requires a focused documentation pass and one source-of-truth decision
- **Release/context:** Documentation reliability, future Claude Code/Codex collaboration, and launch planning

Potentially dangerous cleanup is intentionally deferred until it can be reviewed as a
single change:

- ~~Reconcile `AGENTS.md` and `CLAUDE.md`.~~ Done 2026-09-21: synchronized current guidance, separated only agent-specific paths/invocation notes, and removed obsolete historical sections.
- Review stale `PROJECT-OVERVIEW.md`, the near-empty root `README.md`, `docs/skolamatch-current-status.md`, and `plans/README.md`; decide which is authoritative before rewriting or deleting anything.
- Mark or replace `plans/009-stripe-payments.md`, which describes a materially superseded payment architecture. Keep the payment safety warning until the current implementation has its own verified plan.
- Decide whether the design provenance copies under `design/system/uploads/` and `design/Logo Concepts Refinement Request/uploads/` should remain, be normalized, or be archived. They may be useful source material even where they duplicate current design files.
- Review `.codex/agents/onboarding-architect.toml` and the imported `.agents/skills/` copies before committing or adapting them; they can affect how future agents act and currently include local/tool-specific assumptions.

---

## 🚨🚨🚨 STOP. DO NOT GO LIVE WITH STRIPE UNTIL THIS IS DONE. 🚨🚨🚨
- **Found:** 2026-09-13, founder request, explicit and urgent
- **Urgency:** MAXIMUM — this is the single highest-consequence item in this
  entire file. Everything else in UNFORGET.md is a product/UX gap. This one is
  "real families get charged real money incorrectly and we get sued for it."
- **Effort:** a real testing session, not a quick look — hours, not minutes
- **Release/context:** plan 009 (`plans/009-stripe-payments.md`), the whole
  payment surface: `server.js`'s `/api/checkout`, `/api/subscription/cancel`,
  `handleStripeWebhook`, and every place `subscription_status` /
  `access_expires_at` get written or read

**The founder's own words, verbatim reasoning, kept because it matters:** a bug
almost anywhere else in this app is annoying. A bug in the payment path is not —
if a family gets **double-charged**, or charged after they cancelled, or charged
a wrong amount, that is not a bug report, that is a **lawsuit risk**, real money
taken from real parents' cards without consent. This is categorically different
from every other item in this file and must be treated that way.

**Before a single real (`sk_live_`) key ever goes into Railway, do ALL of this —
not a spot check, an actual deep review:**

- [ ] Write and run a verification matrix for the **current** implementation
  (plan 009's subscription-based season design is superseded): Stripe test mode
  + CLI, SetupIntent completion, advancing past `season_charge_due_at`, the
  off-session PaymentIntent, webhook retries and access expiry — not just "it
  looked fine in the dashboard."
- [ ] Specifically hammer on the **double-charge scenarios**: does clicking
  "buy" twice in a row ever create two subscriptions for one person? Does a
  webhook retry (Stripe resends on any non-200 response) ever cause a second
  write that bills twice? Does cancelling *during* the exact moment a webhook is
  in flight leave the account in a state where it still gets charged anyway?
- [ ] Specifically verify **cancellation actually stops future money movement**
  — cancel a season pass during its trial, confirm `season_charge_due_at` is
  cleared, then run the scheduler and prove no PaymentIntent is created. Cancel
  a monthly plan and confirm the next renewal genuinely does not fire.
- [ ] Verify the season scheduler creates exactly one PaymentIntent, survives a
  process restart/database retry through its stable idempotency key, and grants
  access only through the intended March 31 boundary.
- [ ] Have a second person (ideally an adult who will eventually own the real
  Stripe account per plan 009 §11) look at the flow with fresh eyes before real
  money is ever involved. A founder who has stared at this code for hours will
  miss things a stranger won't.
- [ ] Only after all of the above: read plan 009 §11's "before real money"
  checklist (adult account owner, trade licence, VAT, refund process, legal
  pages) — that list is necessary but is NOT a substitute for this technical
  review. Passing §11 and skipping this checklist is not safe to launch on.

**This item does not get removed from this file until it has actually been done,
not until it has been remembered.** Checking a box above without actually running
the test it describes defeats the entire point of writing this down.

---

## Rebrand: "ŠkolaMatch" → "Kam na střední?" — decided, not yet executed
- **Found:** 2026-09-13, founder decision
- **Urgency:** medium — doesn't block current work (Stripe test-mode products,
  deployment) since none of that depends on the brand name, but should happen
  before real users/schools see the product, and definitely before the domain
  purchase or the Stripe business name are finalized
- **Effort:** medium — mostly find-and-replace, but touches many surfaces and
  needs a careful pass, not a blind sed
- **Release/context:** the name "ŠkolaMatch" was always a placeholder (CLAUDE.md
  says so explicitly). Founder considered "Moje střední", "Škola pro mě", "Vyber
  si školu", "Kam dál?", "Škola na míru" and settled on **"Kam na střední?"** —
  it's literally the question the target user (a 9th grader or parent) already
  has in mind, reads naturally in speech for word-of-mouth/creator-driven
  acquisition, and doesn't lock the product into one narrow framing the way
  "Moje střední" would.

**What "done" looks like — surfaces that need the rename:**
- `CLAUDE.md` — "branded **ŠkolaMatch**" and every other mention throughout
  (this file references the name dozens of times as the project's identity)
- Every doc in `docs/` (`skolamatch_current_status.md`,
  `skolamatch_90_point_context.md`, `skolamatch_full_launch_marketing_plan_v2.md`)
  — filenames themselves reference the old name, worth considering whether to
  rename the files too or just their content, given they're referenced by path
  elsewhere
- User-facing copy in the frontend (page titles, `index.html`, any literal
  "ŠkolaMatch" string in onboarding/paywall copy — grep for it, don't assume
  the list above is exhaustive)
- The eventual custom domain purchase (founder is buying one specifically to
  drop the `.vercel.app` suffix — should reflect the new name, not the old one)
- The Stripe business name, once an adult owns the account and it goes live
  (not urgent today — test mode doesn't care what anything is called)
- `plans/README.md` / `UNFORGET.md`'s own historical entries can keep saying
  "ŠkolaMatch" where they're describing past decisions — this is a rename of
  the *current* identity, not a rewrite of history

---

## Pricing logic, discounts and offers need a proper pass — not just the one-time offer
- **Found:** 2026-09-13, while planning Stripe (plan 009)
- **Urgency:** medium — nothing is broken or live, but it blocks charging at full
  intent, and one piece of it (the offer) had to be switched off to ship payments
- **Effort:** medium — part product decision, part backend work
- **Release/context:** `frontend/src/config/pricing.js`, plan 009 §7

Plan 009 **disables the one-time 30% first-view offer** (`ONE_TIME_OFFER_ENABLED
= false`) rather than shipping it, because its entitlement was a localStorage
stub: clearing cookies or opening an incognito window resurfaced it, which makes
the "jen teď, jednorázově" claim false in practice. Shown to minors that is a DSA
Art. 25 dark-pattern problem, not a rough edge. The unused localStorage prototype
was removed on 2026-09-19; the disabled offer constants remain as the product decision.

But the founder's own framing was broader than that one flag: **the pricing model
as a whole is not yet what they want.** Things in this area that are known-unsettled:

- **The one-time offer itself** — needs a real server-side entitlement before it
  can be honestly shown: `one_time_offers(user_id pk, offer_id, granted_at,
  expires_at, consumed_at)` plus `POST /api/offers/one-time/claim` and
  `GET /api/offers/one-time/status`, with the server as the only thing that decides
  eligibility. This needs a fresh implementation if the offer survives the product
  decision; there is no client entitlement module to revive.
- **The actual prices** — 249 Kč monthly / 690 Kč season are still explicitly
  marked `PLACEHOLDER` in `pricing.js`. They have never been set as real numbers.
- **`REFUND_GUARANTEE_DAYS = 3`** — a testing placeholder the founder picked, not
  a committed number. 14 days (the EU distance-selling floor) is the benchmark it
  was meant to be reconsidered against, and arguably applies regardless.
- **Discount / affiliate mechanics generally** — the launch plan leans on
  influencer affiliates paid on realized revenue, but there is no promo-code,
  referral-attribution or affiliate-payout concept anywhere in the code or in
  `pricing.js`. Stripe supports promotion codes natively; nothing uses them.
- **Parent + child on one plan** — already carved out of plan 006 for the same
  reason and still unresolved; it interacts directly with what a "plan" even means
  here.

**What "done" looks like:** a deliberate sit-down on the pricing model — real
numbers, whether discounts/promo codes exist at all and in what form, how
affiliates get attributed and paid, and what the refund window actually is —
followed by the server-side entitlement if the one-time offer survives that
conversation. Until then payments ship at full price with no offer, which is the
honest default.

---

## School database: 3 likely duplicate rows + ~8-11 genuinely missing schools found
- **Found:** 2026-09-14, comparing our 224 schools against atlasskolstvi.cz's 214
- **Urgency:** medium — doesn't break anything, but duplicate rows would look
  bad on the search page (two identical-looking cards) and the missing schools
  are real gaps in coverage
- **Effort:** small — mostly verification + a few targeted deletes/inserts,
  not a rebuild
- **Release/context:** `scripts/diff-atlas-schools.js` +
  `scripts/atlas-prague-schools.json` (new, committed 2026-09-14)

Ran a name-fuzzy-match audit between our `schools` table and
atlasskolstvi.cz's Prague listing, using the same matching logic as
`import-admission-data.js`. Verified with a REDIZO/address cross-check
(`schools.redizo` query), not just fuzzy-name guessing:

**Confirmed duplicate-looking rows (verified via query, different REDIZOs, byte-identical name+address):**
- `Obchodní akademie, Praha 3, Kubelíkova 37` — ids 38 (redizo 600006573,
  from the original 2026-08-06 seed) and 88 (redizo 600004929, from the
  2026-09-13 expansion)
- `Obchodní akademie a Gymnázium Bubeneč` — ids 49 (redizo 600004520) and 121
  (redizo 600005721)
- `Anglo-německá obchodní akademie a. s.` / `Anglo - německá obchodní
  akademie a.s.` — ids 45 (redizo 600005941) and 196 (redizo 691001111)
- Plus one genuine REDIZO collision: ids 5 and 36 share redizo 600004741
  despite **different names** (`Střední škola gastronomická a hotelová s. r.
  o.` vs `Hotelová škola, Praha 10, Vršovická 43`) — worth checking whether
  this is one school that was renamed (REDIZOs persist across renames) and
  got inserted twice under both names.

**Not necessarily bugs** — Czech schools commonly register multiple REDIZOs
(one per obor-offering "škola" record) under one legal entity at one address,
so two REDIZOs sharing a name+address *can* be legitimate. But it reads as a
duplicate to a user browsing the search page regardless of the legal nuance,
so it's worth a human decision either way, not an automatic delete.

**Genuinely missing from our database** (verified by address, not just name,
for the "Obchodní akademie" cluster where fuzzy-name matching alone produced
wrong pairings):
- Obchodní akademie Dušní (Dušní 1083/7, Praha 1)
- Obchodní akademie Vinohradská (Vinohradská 1971/38, Praha 2)
- Obchodní akademie Hovorčovická (U Vinohradského hřbitova 2471/3, Praha 3)

**Flagged by the fuzzy matcher as unmatched, NOT yet individually address-verified**
(worth a closer look before assuming they're really missing):
- Akademie VŠEM – střední škola, s. r. o.
- Gymnázium Čakovice, Praha 9, nám. 25. března 100
- Gymnázium Na Pražačce, Praha 3, Nad Ohradou 23
- Gymnázium, Praha 2, Botičská 1
- Gymnázium, Praha 4, Budějovická 680
- Gymnázium, Praha 4, Na Vítězné pláni 1160
- Meridian česko-britská mateřská škola, základní škola a gymnázium s. r. o.
- Střední pedagogická škola SRAZ s. r. o.

**In our database but not on atlasskolstvi.cz's list** — mostly small/new
private schools (several `Gymnázium FOSTRA *` variants, `1. IT Gymnázium`,
`Gymnázium ARTION`, etc.) that appeared in the Cermat JPZ data. Cermat is
authoritative for "this school currently runs entrance exams," so the more
likely explanation is atlasskolstvi.cz is simply behind, not that these
schools are wrong — but not independently confirmed.

**What "done" looks like:** decide what to do with the 3 duplicate-row pairs
(merge/delete one of each pair, or confirm they're legitimately separate
REDIZOs and leave both), and run the official registry lookup
(`isv.gov.cz/rssz` — see `scripts/import-missing-schools.js`) for the 11
"missing" names above to get their real REDIZO and add them if genuine.

---

## Railway backend is on a 30-day trial — will go offline if not upgraded
- **Found:** 2026-09-13, during first production deployment
- **Urgency:** high, but not urgent yet — 30-day runway, must not be forgotten
- **Effort:** small — it's a billing decision + a few clicks, not engineering work
- **Release/context:** the backend (`school-app` service on Railway, project
  `perceptive-friendship`) was deployed 2026-09-13 on Railway's free/trial
  tier — **"Limited Trial Plan," 30 days remaining, $4.99 in credits
  remaining.** Per Railway's own copy: "Your trial expires in 30 days or when
  you are out of credits. Upgrade to keep your services online."

If this isn't upgraded to the **Hobby plan** (or another paid tier) before
the trial/credits run out, the production backend goes offline —
**everything breaks**: `/api/schools`, auth (via `server.js`'s
`requireAuth`), favorites, questionnaire, reviews, the whole site. This is
not a "nice to fix eventually" item — it's a hard cutoff date.

**What "done" looks like:** before ~2026-10-13 (30 days from deploy, sooner
if the $4.99 credit runs out faster from real usage), either upgrade Railway
to Hobby (railway.app → Settings → Plans → Upgrade), or migrate the backend
elsewhere. Set a reminder outside this file too (calendar, phone) — a
30-day-out item is exactly the kind of thing that's easy to lose track of
between now and launch.

---

## "Selectivity" is missing as its own preference — we only ever model admission ease as good
- **Found:** 2026-09-12, user request
- **Urgency:** high — this is a real, systemic gap in how the whole product frames
  admission difficulty, not a cosmetic one
- **Effort:** medium-large — it's one new concept, but it touches many surfaces
  (see list below), each of which currently hardcodes the opposite assumption
- **Release/context:** `admission_cutoff` / `acceptance_rate` (from Cermat data,
  `schools` table) is the underlying data; every place that reads it today only
  ever treats a *lower* cutoff / *higher* acceptance rate as strictly better

The user's point: right now every surface that touches admission difficulty
assumes "easier to get in = better for everyone." That's wrong for a real
chunk of students. Some students specifically want a school that's **hard**
to get into — not for prestige, but because a high cutoff filters the
classroom: the harder the school is to enter, the fewer classmates got there
by accident, and the more likely you are to be surrounded by people who are
actually academically serious. That's a real, opposite preference from
"maximize my chance of getting in," and the product currently has no way to
express it — it only ever optimizes toward "easier."

**Concretely, where this assumption is currently baked in one-directionally:**
- `frontend/src/lib/decisionMatrix.js`'s `sance` criterion (rozhodovací
  matice) — explicitly inverts the cutoff score ("Lower cutoff = easier =
  better, so invert") with no way to flip that direction.
- `lib/questionnaire.js` — no question anywhere asks about wanting a
  selective vs. accessible school; `matching.js` (server-side scorer) has no
  dimension for it at all.
- `frontend/src/lib/matching.js` + `schoolFeatures.js` (onboarding quiz
  engine) — same gap, no selectivity dimension.
- `Search.jsx` / school list filters — cutoff/acceptance rate are shown as
  stats and used in one of the sort options ("Nejnižší hranice přijetí" /
  "Největší šance na přijetí" — see the sort tab copy in Search.jsx), always
  framed as "easier is the good direction." No "hardest to get into" sort.
- Comparison table / `/porovnani` — shows the raw numbers but has no framing
  either way, and definitely no way to weight toward "more selective is
  better."
- School detail page (`CutoffExplainer` component) — checked: its copy is
  neutral (explains "minimum, not average"), doesn't assume a direction. Not
  part of the problem, but also not part of any future fix — it's a separate,
  correct explainer.

**What "done" looks like:** a real preference — e.g. "Chci školu, kam se
dostanou jen fakt šikovní" vs. "Chci mít co nejvyšší šanci se dostat" vs. "Je
mi to jedno" — exists as an actual input the student can set, and every one
of the surfaces above (questionnaire, onboarding quiz, matrix, search sort/
filter, comparison) respects the direction the student actually wants,
instead of all of them silently agreeing that low cutoff is always the win.
This needs product/UX thinking first (how to phrase it so it doesn't read as
elitist or shaming to a 15-year-old — see the zero-shame rule in
CLAUDE.md/the onboarding agent), then the same change propagated through
every scoring engine and UI listed above.

---

## Rozhodovací matice needs a real human review pass
- **Found:** 2026-09-12, user request right after the tooltip/confirm-dialog/
  "jak to funguje" additions landed
- **Urgency:** medium — the tool is live and usable, but nobody has actually
  sat with it and judged whether it's *right*, only whether it runs
- **Effort:** unknown until someone actually does the review — could be "looks
  fine" or could be a real redesign, depending on what falls out
- **Release/context:** applies to `/porovnani/matice` (`Matice.jsx`,
  `decisionMatrix.js`, `decision.css`) as it stands after plan 007 and
  today's tooltip/explainer/confirm-dialog additions

The user's explicit ask: take a proper look at the whole matrix, not just
whether each individual piece works. Three things named specifically:

1. **How well the tool actually behaves** — does the ranking feel right when
   you actually use it with real schools and real weights? Does the Zásadní
   confirm-dialog guard feel helpful or annoying in practice? Does the
   "gap"/"weak spot" callout logic (`gapNote`/`weakNote` in `Matice.jsx`)
   trigger at sensible moments, or does it fire too often / too rarely /
   with confusing phrasing?
2. **Are the explanatory notes good enough** — the per-criterion tooltips
   (`CRITERIA[].tooltip` in `decisionMatrix.js`) and the new "Jak to funguje?"
   panel were written by Claude reasoning about what should be clear, never
   checked against an actual person reading them cold. Same category of gap
   as the "AI feature prompts need real human editing" entry above, but for
   UI copy instead of AI-generated prose.
3. **Do things like "typ školy" actually match your real plans** — the `typ`
   criterion ("Typ školy odpovídá mým plánům") is explicitly a crude
   placeholder today: it only checks whether the school offers a maturitní
   obor, because there's no real "what are you planning" input yet (see its
   comment in `decisionMatrix.js`). Worth asking, criterion by criterion,
   whether what's actually being measured matches what the label promises,
   or whether some of them are placeholders that have quietly become
   permanent.

**What "done" looks like:** the user (or someone else) actually uses the
matrix with real comparisons for a while, and either signs off on it as-is or
comes back with specific things to fix — not a generic "looks fine" without
having exercised it.

---

## AI feature prompts need real human editing, not just structural correctness
- **Found:** 2026-09-10, user request while scoping plan 006's pros/cons generator
- **Urgency:** medium — every AI-generated sentence a user reads is currently
  running on a first-draft prompt
- **Effort:** small per prompt, but needs a human (not Claude) reading the actual
  outputs and judging tone, not just checking the JSON is well-formed
- **Release/context:** applies to every current and planned AI touchpoint

The user's explicit call: the prompts behind ŠkolaMatch's AI features have been
written functionally (produce valid JSON, stay on-topic, don't hallucinate a
school) but never hand-tuned by a human reading real output and deciding "this
sentence sounds right for a 15-year-old" vs. "this sounds like a robot." That
tuning pass hasn't happened yet for any of them, and it needs to before these
are treated as finished, not just working.

**Added 2026-09-19 (plan 011):** the questionnaire's default model moved from
Claude Sonnet 5 to **Gemini 2.5 Flash Lite** (~20x cheaper). Its Czech has never
been read by a human, and the output is shown to 14-15-year-olds — so this pass
now has a second reason to happen, and the model choice itself should be judged
in the same sitting (`OPENROUTER_MODEL` swaps it with no code change).

**Current AI touchpoints, in ascending order of how much attention they've had:**
- `lib/questionnaire.js`'s `SYSTEM_PROMPT` (~line 399) — the onboarding quiz's
  "why this school fits you" sentence. The most mature one; still worth a
  fresh read now that real schools/data exist, not just the synthesized set it
  was likely tuned against originally.
- `scripts/generate-school-proscons.js` (plan 006, not yet built) — the pros/cons
  prompt is specced in `archive/plans/006-comparison-decision-tools.md` §5 with hard
  constraints (Czech, tykání, only use provided numbers, never mention teachers/
  reputation, a con must be a real tradeoff not a discouragement) but those
  constraints were written by Claude reasoning about what *should* work, not
  validated by a human reading actual model output. §7 of that plan already asks
  the user to compare 3 models — **do the prompt-quality pass at the same time**,
  not as a separate later step, since both require reading the same generated
  Czech text.

**What "done" looks like:** the user (or someone else fluent in the target
register — Czech teenager, informal) reads real generated output for each
feature and either approves it or rewrites the prompt directly. This is not a
task Claude can close out alone — grading whether Czech phrasing lands right
for a 15-year-old is exactly the kind of judgment call that started this list.

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
  [`archive/plans/006-comparison-decision-tools.md`](archive/plans/006-comparison-decision-tools.md),
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
  [`archive/plans/006-comparison-decision-tools.md`](archive/plans/006-comparison-decision-tools.md)

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
- **Release/context:** [`archive/plans/006-comparison-decision-tools.md`](archive/plans/006-comparison-decision-tools.md) §8

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

## Legal check on the paywall — one real open question, one resolved

- **Found:** 2026-09-05, checking `onboarding-architect.md`'s legal constraints
  (§0.4) against primary sources rather than secondary commentary
- **Urgency:** medium now, high before real money moves
- **Release/context:** must be resolved before Stripe goes live (checkout is
  implemented but live keys are not approved)

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

The onboarding-v2 paywall has a parental-confirmation checkbox before the Stripe
redirect, per ruling C-8.
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
   for it to be left out of the multi-page paywall and revisited later. Its disabled
   configuration remains in `pricing.js` (ruling C-9); the unsafe localStorage
   entitlement prototype was deleted as dead code. The open question is whether a 15-minute
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

4. **Trial placement — resolved in code, still needs real-user validation.** The
   trial is on Sezónní and Měsíční has no trial. Season Checkout saves the payment
   method and the server schedules one PaymentIntent three days later; monthly is
   a normal recurring subscription. Do not flip the flags independently of those
   backend semantics.

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

## Stripe live activation and end-to-end verification
- **Found:** 2026-08-27; implementation completed in test-mode code 2026-09-19
- **Urgency:** high before launch
- **Risk of NOT fixing:** no real revenue, or real-money failures if keys are enabled prematurely
- **Effort:** medium — account/product setup plus the full test matrix at the top of this file
- **Release/context:** blocks real payments and the trial reminder below

Checkout, cancellation, webhooks and the season one-time scheduler are implemented.
What remains is operational and verification work: choose final prices, create the
adult-owned Stripe account and monthly Price, configure test keys/webhook secret,
run every test-mode scenario, then add live keys only after the legal/reminder/refund
blockers are resolved. The season plan deliberately has no Stripe Price.

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

## Supabase email is capped at 2/hour — custom SMTP needed before launch
- **Found:** 2026-09-21, hit while creating test accounts
- **Urgency:** high — launch blocker
- **Effort:** small — pick a provider, paste SMTP credentials into Supabase
- **Release/context:** Supabase's built-in mailer is fixed at 2 emails/hour and its rate limit cannot be edited without a custom SMTP provider (or a Send Email hook). Signup confirmation and password-reset emails all go through it, so at launch only ~2 people per hour could confirm an account. Set up a real provider (Resend, Brevo, Postmark…) under Authentication → SMTP, on the stredninamiru.cz domain with SPF/DKIM. The same provider will carry the mandatory trial-reminder email. For testing meanwhile: `node scripts/reset-test-account.js <email>` resets an account's paywall state without signing up again.

## Two open checkout sessions can both be paid (double-click edge case)
- **Found:** 2026-09-21, Stripe verification run
- **Urgency:** low-medium — needs a deliberate second payment in a second tab
- **Effort:** small
- **Release/context:** `/api/checkout` now refuses (409 `ALREADY_SUBSCRIBED`) any account that already has a live or scheduled plan, which closes the "reach the paywall again and buy twice" hole. What it cannot stop is two sessions created *before* either is paid (double-click, two tabs) and then both completed. The webhook would attach the second subscription over the first. Fix if wanted: in `checkout.session.completed`, if the account already has a different live `stripe_subscription_id`, cancel the newer subscription and refund it.

## Subscription cancellation flow — polish still owed
- **Found:** 2026-09-21, Stripe test session
- **Urgency:** medium — before real billing
- **Effort:** small–medium
- **Release/context:** cancelling works end to end (`/api/subscription/cancel` plus an inline "ano, zrušit" confirm in Settings). Still owed: (1) a real cancellation flow/page as the EU one-step-cancellation research describes (dated confirmation, what happens to access, symmetrical exit copy, a confirmation email); (2) cancellation of a monthly plan sets `users.cancel_at_period_end`, and Settings now shows "Zrušeno — nic se neobnoví" — verify that against the webhook on a fresh account.

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
2. **Score display resolution** — **RESOLVED 2026-09-19 for the standalone
   questionnaire only (`/dotaznik`): percentages**, per the founder's
   explicit call (with ~220 schools, bands would lump huge groups together and
   lose the 98 % vs 83 % difference). Still open for school-detail surfaces;
   the onboarding quiz stays band-only on purpose. Original note follows —
   still undecided: percentages (user's
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

## Logo design concepts — save direction references for later
- **Found:** 2026-09-17, user request to remember across sessions
- **Urgency:** low — visual reference only, no code dependency
- **Effort:** n/a — just documentation
- **Release/context:** branding direction, to be revisited later

User created 14 logo concept artboards (canvas-based design system, Concepts 01–14) across two design rounds (abstract marks, explanatory marks). Each tested at multiple sizes (40px email avatar, 32px favicon, 16px browser tab) with variants for light/dark backgrounds.

**Key reference to maintain:**
- Concept 14 (Logotyp) — the wordmark + measuring-line system, with three square-mark variants (E: "na míru" text, F: single "m" letter, G: dark-mode versions) designed specifically for email profile pictures and Chrome site logos.
- Instagram saved posts and personal notes per school — the user plans to track research/inspiration per school using Instagram saves + custom notes. This is a personal reference system outside the codebase; mention it back in future sessions when the branding gets revisited.

**Do not delete the logo design files.** They live as `.dc.html` artboards in `design/logo-concepts/` (moved out of the repo root 2026-09-19) and are registered in `design/logo-concepts/canvas.json`. Refer back to them when the time comes to finalize the visual identity.

---

## Questionnaire runs saved without AI sentences never get them — and `.env` pins the old model
- **Found:** 2026-09-19, building plan 011
- **Urgency:** medium — bites the moment OpenRouter credits are added
- **Effort:** small-medium (one endpoint + a button), plus a one-line `.env` edit
- **Release/context:** `lib/questionnaire.js` `requestMatches`, `POST /api/questionnaire`

Two separate things, both surfaced by making the AI optional:

1. **Sentences are generated at submission time only.** A run submitted while
   OpenRouter has no credits is saved with real percentages and empty `reason`
   fields, and nothing ever backfills them — the results screen says so honestly
   ("U téhle sady chybí slovní zdůvodnění") rather than promising it will fill in.
   Once credits exist, every run made before that stays sentence-less unless the
   student retakes the questionnaire, which the UI deliberately discourages. A
   `POST /api/questionnaire/runs/:id/reasons` that re-asks the model for the top
   10 of an *existing* run (no re-scoring, no new run) would close the gap.
   Onboarding runs (`source: 'onboarding'`) never had sentences at all.
2. **The real `.env` still sets `OPENROUTER_MODEL=anthropic/claude-sonnet-5`**,
   which overrides the new Gemini 2.5 Flash Lite default in code and in
   `.env.example`. Sonnet costs ~$0.11/user/month at 10 runs vs ~$0.005 — small
   either way, but it is not the choice that was made. Edit that line (or delete
   it) when credits are added. Deliberately not edited by Claude: `.env` is off
   limits.

---

## Matice.jsx should adopt the shared ConfirmDialog
- **Found:** 2026-09-19, plan 011
- **Urgency:** low
- **Effort:** trivial once its review pass is done

`components/ConfirmDialog.jsx` (+ `.ss-dialog-*` in `styles/ui.css`) was extracted
for `/dotaznik`'s two dialogs from the markup `Matice.jsx` already carried
(`.dp-confirm-*` in `decision.css`). Matice was left untouched on purpose because
it is still awaiting its human review pass (see "Rozhodovací matice needs a real
human review pass"), so the same dialog now exists twice. Swap it over, and delete
the `.dp-confirm-*` block, as part of that review.

---

## Questionnaire form options still use a solid accent fill when selected
- **Found:** 2026-09-19, plan 011
- **Urgency:** low
- **Effort:** small

`.qz-option.is-on` in `pages/questionnaire.css` fills the chosen option solid
terracotta. `tokens.js`'s semantic rule 3 says selection is a 1.5px accent border
+ `accentSoft` fill, never a solid accent fill. Left alone because plan 011
scoped the design work to results / history / dialogs and kept the question form
unchanged. Fix when the form itself is redesigned.

---

## Match percentage: curve exponent and band thresholds are a first guess
- **Found:** 2026-09-19, reworking the match scale
- **Urgency:** low — the shape is measured and sane, but nobody has used it for real yet
- **Effort:** small (two constants), but needs real users to judge
- **Release/context:** `lib/matching.js` `displayScore` / `DISPLAY_EXPONENT`,
  `frontend/src/lib/decisionMatrix.js` `matchBand` and `MATCH_GAP`

The displayed match percentage is now `100 * (1 - (1 - raw/100)^1.4)` — an
absolute, monotone curve over the raw weighted average, never relative to the
other results. 1.4 was chosen by measuring five student profiles against the
real 223-school database: it lifts a typical best match from ~80 to ~90, keeps
the bottom of the list visibly low, and leaves only genuinely near-perfect
schools (raw >= 98) at 100 %. Rejected alternatives and why, so they are not
re-proposed: normalising against the best available school made every student's
top result read 98 % whether it covered nearly everything or barely half;
multiplier-plus-clamp produced 83 schools tied at "100 %" for a humanities
profile; a plain gamma curve inflated the worst school in the database to 28 %.

Still to check against real usage:
- **The exponent.** 1.4 is a judgement call, not a derived constant.
- **`matchBand` thresholds** (85 / 60) were moved up to suit the curve. They are
  arithmetic guesses about where "silná" and "střední" should sit.
- **`MATCH_GAP = 15`** (what counts as "notably better" in the matrix) was tuned
  against the old raw scale. The curve compresses the top, so a 15-point gap is
  now a bigger real difference than it was and the callout will fire less often.

**Measured floor, worth keeping:** the worst best-match any answer combination
can produce is about **59 %** (raw 47) — found by sampling ~9,000 answer sets
plus hill-climbing, so it is an empirical bound, not a proof. No student should
ever see a top result below roughly 59 %, and one meaningfully lower is a signal
that something in the scorer or the data has broken.

---

## Two district adjacency tables now exist and must agree
- **Found:** 2026-09-19
- **Urgency:** low
- **Effort:** small

`lib/pragueDistricts.js` gained `CORE_ADJACENCY` / `OUTER_TO_CORE` /
`districtHops` so the server scorer can grade the `casti` dimension by distance
(same district 1.0, neighbour 0.65, two away 0.35, further 0.2) instead of the
old all-or-nothing rule that cost an otherwise perfect school 20 of 113 weight
for being one district over. `frontend/src/lib/schoolFeatures.js` already had a
byte-identical copy driving "Podobné školy". They are duplicated deliberately
(server CommonJS vs browser ESM) but nothing enforces that they stay in step —
edit one, edit the other.

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

## True `?limit=&offset=` pagination — needed at national scale, not built
- **Found:** pre-2026-08-27; narrowed to this scope 2026-09-17 (plan 010)
- **Urgency:** low — not urgent at 223 schools, only matters past ~1300
  (national scale, once the product expands past Prague)
- **Effort:** large — real server-side filtering, sorting and facet counting,
  which means rewriting the core of `Search.jsx` and moving onboarding-quiz
  scoring off the client
- **Release/context:** must exist before expanding past Prague to other Czech
  cities (CLAUDE.md's "Geographic Scope for V1")

Plan 010 (below, Resolved) fixed the two problems that were bundled under the
old "Backend pagination" entry: the silent 1000-row truncation cliff, and the
843 KB payload every list page downloaded. What's left is genuine `?limit=
&offset=` with server-side filtering/sorting/facets — deliberately not built
now because `Search.jsx` does all 13 filters, per-option counts and sorting
client-side, and the onboarding quiz scores the whole catalogue in the
browser. Building this means rearchitecting both, which isn't worth it while
Prague-only and pre-launch.

**If this gets built:** `withMatchScores` (server.js) must survive whatever
query replaces `fetchAllSchools`/`LIST_SELECT` — see CLAUDE.md's `/api/schools*`
trap note. It already survives plan 010 unmodified because the server scorer
only reads the `programs` text column, never the nested `school_programs`
join; keep that property true of any future rewrite too.

---

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

## Top nav bar overflows horizontally on mobile
- **Found:** 2026-09-12, while browser-verifying plan 007's decision-matrix redesign
- **Urgency:** medium — affects every page, not just the matrix
- **Release/context:** already spun off as its own session (task_c7de19a6)

`.navbar` / `.navbar-links` in `App.css` have zero responsive handling — no
wrap, no hamburger menu. Confirmed 113px of horizontal page overflow at 375px
width on both `/` and `/porovnani/matice`, so this is nav-wide, not specific to
any one page. The "Porovnání" link added 2026-09-11 made the row one item
longer but did not cause the underlying gap — the nav had no mobile handling
before that either. See "Responsive design beyond the fixed 1280px desktop
width" below for the broader context this sits inside.

## Onboarding Reveal ranking can disagree with the server match %
- **Found:** 2026-09-11/12, while building plan 008 (save onboarding answers)
- **Urgency:** low
- **Release/context:** accepted tradeoff, not a bug to silently fix

Two independently-built scoring engines exist by design (see CLAUDE.md): the
onboarding quiz's `frontend/src/lib/matching.js` (band-only, runs in the
browser, scores the Reveal screen) and the server's `lib/matching.js`
(percentage-based, scores everything post-signup: search, school detail,
`/porovnani`, the decision matrix). Plan 008 translates onboarding answers into
the server engine's input shape so match_score is available at all after
signup, but it does not and cannot make the two engines agree pointwise — a
school ranked #1 on Reveal could show a lower % than #2 once the server engine
scores the same translated answers. Consider unifying onto one engine if this
ever causes a support question.

## Onboarding `sport` focus has no server-side matching area
- **Found:** 2026-09-11/12, building `lib/onboardingAnswers.js` (plan 008)
- **Urgency:** low
- **Release/context:** dropped silently on save, not surfaced to the user

The onboarding quiz's `focus` question offers `sport` as an option
(`frontend/src/lib/schoolFeatures.js` FOCUS_CATEGORIES), but the server
matching engine's `AREA_KEYWORDS` (`lib/matching.js`) has no `sport` entry —
there's no keyword family in the scraped `programs` text to match it against.
`lib/onboardingAnswers.js`'s translation table drops `sport` rather than
mapping it to something misleading. Add a `sport` area + keywords to
`lib/matching.js` if sport-focused schools start mattering enough to justify it
(the database currently has very few, if any).

## Onboarding answers only reach the account on the signup device
- **Found:** 2026-09-11/12, building plan 008 (save onboarding answers)
- **Urgency:** low
- **Release/context:** a known limit of the localStorage-stash design, not a bug

`CreateAccount.jsx` stashes quiz answers in `localStorage`
(`lib/pendingOnboardingAnswers.js`) because there is no session yet to save
them under. `AuthContext` flushes that stash to the server the next time this
*same browser* sees a confirmed session for the *same email*. If a student
signs up on their phone but confirms and first signs in on a different
device/browser, the stash never reaches that second device and their match
score never populates from the quiz (they'd need to redo the standalone
questionnaire, or the stash silently expires after 7 days). This resolves
itself naturally if/when the existing "email confirmation gate temporarily
disabled" item (elsewhere in this file) is fixed the way it already proposes —
resuming onboarding in the confirming tab, rather than redirecting to generic
Login — since that keeps everything on one device throughout.

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
   exists. The unrelated abstract purple starter asset was removed as dead code.
   Hidden below 900px, so mobile is unaffected.
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

- **Questionnaire results, run history, unlimited runs, AI-optional** — done
  2026-09-19 (plan 011, `archive/plans/011-questionnaire-results-history.md`). `/dotaznik`
  was a flat list of 8 rows that ignored most of what its backend already
  supported. Now: a results screen (top 10 with reasoning, expandable to the
  full current school ranking), a run history (rename, set as default, archive — the backend's two
  409 refusals are shown up front as a disabled button, not after the click), and
  two confirm dialogs (before retaking; after submitting, offering to keep the
  previous run as default). Backend: submitting no longer 503s without an
  OpenRouter key — scores are computed and saved regardless, and a failed or
  absent AI call degrades to empty sentences; the monthly quota (and its dead
  helpers) is gone, the burst limiter and `requireAccess` stay; the onboarding run
  is now flagged default explicitly instead of only looking default by way of the
  "newest wins" fallback; `model` and `source` are exposed on runs so the UI can
  tell why a sentence is missing. Cost was measured before removing the cap:
  ~1.5k input / ~0.8k output tokens per run, ~$0.0005 on Gemini 2.5 Flash Lite.
  Verified against a stateful mock of the API (the real authenticated routes
  could not be exercised without a login — see the follow-up above) at 1280px
  and 375px, with and without AI, including empty state, expand, rename, archive,
  set-default and both dialogs.

- **Questionnaire follow-up review after Claude Code** — done 2026-09-19/20.
  Reviewed the final component/API/server/scoring path, added deterministic
  validation and no-AI tests, restored the promised Prague map, corrected skip
  copy, hardened database failures, and verified form/results/history at 390px
  and 1280px with no horizontal overflow.

- **Onboarding email-confirmation handoff** — done 2026-09-19. Signup now pauses
  on a clear confirmation screen; the confirmation URL carries a validated local
  `/onboarding/plan` continuation through Login, so an unconfirmed account never
  reaches a checkout call that can only answer 401.

- **Onboarding paywall to access/payment seam** — connected in code 2026-09-19.
  `Platba.jsx` calls `/api/checkout`; webhooks write access state; the unsafe
  localStorage one-time-offer entitlement was removed. Live activation and the
  full real-money verification remain open above.

- **`/api/schools` payload slimming + 1000-row truncation cliff** — done
  2026-09-17 (plan 010, `archive/plans/010-schools-payload-slimming.md`). The list
  endpoint used to nest every raw `school_programs` row (2372 rows across 223
  schools, one row per obor per imported year) plus `school_ai_summary`,
  measured at **843 KB per load** on six surfaces including the onboarding
  quiz on phones. It now collapses `school_programs` to one entry per obor
  (latest year only) carrying just the 7 fields list pages actually read
  (`maturitni`, `jpz_povinna`, `typ_skoly`, `jazyk_studia`, `kkov`,
  `zrizovatel`, `kapacita`) — **measured 215 KB, a 75% cut**, with zero
  rewrite of `Search.jsx`'s client-side filtering/sorting/facets. A new
  `GET /api/schools?ids=1,2,3` (≤50 ids) returns full per-obor rows +
  `school_ai_summary` for `/porovnani` and `/porovnani/matice`, which only
  ever need a handful of schools. `fetchAllSchools()` also pages the
  underlying query in 1000-row chunks so PostgREST's silent truncation cliff
  can't bite once the school count grows past Prague — verified by
  temporarily lowering the page size to 50 and confirming all 223 rows came
  back with no duplicates across the boundary. `withMatchScores` needed no
  changes: the server scorer only ever reads the `programs` text column, not
  the nested join, exactly as CLAUDE.md's `/api/schools*` warning assumes.
  **Side effect, intentional:** summing `kapacita` over the old nested rows
  double/triple-counted capacity for schools with multiple imported years —
  **211 of 223 schools** had an inflated "volných míst" number feeding the
  "Aspoň N míst" search filter. Collapsing to one row per obor fixed this;
  verified live against a school's own detail page (Evropská akademie:
  90+30+10 = 130 míst 2026, matching what search now shows, vs. the old
  summed-across-years figure). If capacity-filter results look different from
  before, this is why — not a regression.

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
 from the plan as written are recorded in `archive/context/CONTEXT-HANDOFF.md` (`search.css` 26px →
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
