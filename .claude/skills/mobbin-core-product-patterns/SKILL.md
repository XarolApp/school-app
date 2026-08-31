---
name: mobbin-core-product-patterns
description: Real-shipped-product patterns for search/filter, match/recommendation results, comparison tools, and detail pages — the post-commitment core product experience. Sourced from a 73-search Mobbin survey (~95 products, iOS + web), weighted toward higher-stakes decisions (real estate, jobs, health) since no direct school-search analog exists. Use when designing or reviewing browse, filter, results, comparison, or detail screens — most useful for Claude Design.
---

# Core-product patterns: search, match results, comparison, detail pages (sourced via Mobbin)

Source survey: `docs/sources/mobbin_pattern_survey.md` §4 (2026-08-25, ~95
product/platform combinations, 20 searches). Weighted toward meaningful,
infrequent, higher-stakes decisions — real estate, jobs, health, finance — since no
university/school-search analog exists on Mobbin (closest available: real estate
search and job matching). Full products-surveyed list and citation links live in
the source doc — this file has the distilled, actionable version.

## A. Search / browse / filter

**Patterns**
- **Live result count on the commit button.** "Show 13 wines" updating live as
  filters change — never apply blind. *Vivino, Airbnb web, Clue.*
- **Per-option counts (or prices) inside the filter itself.** Each checkbox shows
  what it costs you in inventory. *Vivino, TravelPerk, Navan iOS, KAYAK (cheapest
  fare next to each airline).*
- **Filter count badge on the collapsed control.** "Filter ②", "All filters (4)"
  plus per-chip counts. *Zillow iOS, Turo web, Kiwi.com ("2 filters active — Clear
  filters" as a sentence).*
- **Applied criteria as removable chips** in the result region, with a Clear All.
  *Wellfound, Expedia.*
- **Sort as named tradeoffs with their consequence**, not adjectives — tabs that
  each state their own result: "Recommended $817 · 13h / Cheapest $717 · 15h50m."
  *Kiwi.com, Navan web.*
- **Explaining the ranking** with a "how our sort order works" affordance, and
  disclosing when results may not be exhaustive. *Expedia, Vrbo, Tripadvisor.*
- **Map/list as one linked surface with price-labelled pins.** *Redfin, Zillow
  iOS (draw-a-shape boundary search), Realtor.com (explicit List toggle so the map
  isn't inescapable).*
- **Result-set state persisted as a first-class object** — save search, named
  search tabs, per-alert cadence. *Redfin, Wellfound, Opendoor.*
- **Honest disclosure of what's being hidden** — one line naming an invisible
  filter and how to correct it. *Wellfound ("Hiding jobs that don't accept
  applications from your location: San Francisco. Update location.").*
- **No-results states that name the escape hatch** — which specific constraint
  caused the emptiness, with a live reset control. *Mimo ("0 results / Reset
  all"), Shazam.*
- **Result cards sized to the decision, not the photo** — one price line, one
  spec line, a differentiator badge burned into the image corner. *Zillow web,
  Turo web (thumbnail-left row, total price not nightly — removes a comparison
  trap).*

**Checklist**
- [ ] Does the apply button carry the live result count?
- [ ] Does each filter option show its own count (or price range)?
- [ ] Does the collapsed filter control show how many filters are active?
- [ ] Are applied filters removable individually as chips, with a Clear all?
- [ ] Is sort naming a tradeoff and quantifying it, not offering adjectives?
- [ ] Is there a "how ranking works" affordance?
- [ ] Are implicit/system filters disclosed and correctable?
- [ ] Can the result set be saved as a named search, with alert cadence?
- [ ] Does the no-results state name which constraint to relax, with a one-tap fix?
- [ ] On a card, is the differentiating fact visible, or only the photo and price?
- [ ] Do prices compare like with like (total vs per-night)?
- [ ] Do map pins carry values, and can you return to a list?

**Anti-patterns**
- **The blind Apply button.** CTA says only "Apply"/"Show results," no count —
  the user commits, waits, discovers zero. *Depop, Pinterest, Navan iOS.*
- **The unbounded checkbox sidebar.** 30+ unweighted checkboxes, no counts —
  looks thorough, provides no guidance. *Dribbble, Peerlist, Codecademy.*
- **Category chips as the whole filter model.** No applied-state feedback, no
  count, no clear-all. *Unity, Uxcel.*
- **Sort as a bare dropdown.** "Sort by ▾" with no default shown, no
  consequence. *Crate & Barrel.*
- **Generic no-results copy.** "Try less specific search terms," no reset
  control. *Thrive Market, Calm Sleep.*

## B. Match / recommendation results

**Patterns**
- **Score + band + the scale it sits on — never a bare number.** "4.4 on a
  0.0–6.0 gauge, lower than a healthy person's 6.0," with a per-dimension
  breakdown. *Visible, Apple Health ("Anxiety Risk — Minimal" on a labelled
  track), Hers.*
- **Factor lists naming direction and magnitude of each contribution.** Grouped
  by "things you're doing well," tagged HIGH/MEDIUM IMPACT with the underlying
  number, split into actionable vs informational. *Credit Karma, Rocket Money
  (letter grade + weight), CRED (explains a delta: "34 points deducted, here's
  why"), Zopa.*
- **Attributing the result to the user's own stated inputs, verbatim.** Bolded
  tokens are the user's own answers: "Based on your concerns around **acne** and
  **redness**..." *Amazon, Yazio, SKIMS (replays the captured profile as a
  receipt before shopping).*
- **Two-column strengths vs gaps, in sentences — never a percentage.** "The fit
  *is* the list." *Codecademy.*
- **Criteria checklist as the match**, contextualised against the pool. A single
  100% shown beside "128 excellent matches 90%+, 50 high 80–89%..." *Wrangle.*
- **Narrative "why" per item**, explicitly naming the unmatched dimension —
  stating the gap is what makes the match credible. *Contra ("though the
  company's industry isn't specified").*
- **Uncertainty shown rather than hidden.** Missing input rendered as a *locked,
  greyed* bar, not defaulted or silently omitted; scores negotiated and editable
  by the user. *Tinder, Glassdoor (inline "Do you also have these? ✓/✕").*
- **Diagnostic before prescription.** "What's causing this?" heading, flagged
  out-of-range markers with reference ranges, before any recommendation.
  *Superpower, Noom (states provenance: "From your Face Scan on 6/22/2026").*
- **Comparison against a reference, not an absolute.** "Your score is still
  aligned with your actual age — 2 years younger," plotted Below/Aligned/Above.
  *Oura, Grab Driver (shows "your score" beside a greyed "average score" and one
  concrete cause).*

**Checklist**
- [ ] Is a score always accompanied by its scale and a named band?
- [ ] Does the screen say *why* — in the user's own stated terms, quoted back?
- [ ] Are contributing factors listed with direction and magnitude?
- [ ] Is missing input rendered as missing, not silently defaulted?
- [ ] Can the user correct the inputs behind the result (edit, retake)?
- [ ] Is a single result contextualised against the pool or a reference?
- [ ] Is at least one non-fitting dimension acknowledged?
- [ ] Does it read as a reflection of preferences, not a verdict on the person?
- [ ] Is provenance and date of the underlying data stated?

**Anti-patterns**
- **The unexplained percentage.** A large number with a mood sentence, no basis,
  no dimensions, no correction path. Fine as entertainment; **fatal on a
  consequential decision.** *Tolan, Deezer, Spotify Blend, Moonly.*
- **Unlabelled progress bars as evidence.** Coloured bars with no axis, no units,
  no way to know what "longer" means. *Moonly, Tinder, Co–Star.*
- **Recommendations with no attribution.** A "For You" grid that never states its
  basis. *Matter, Curater, Uxcel.*
- **The quiz that produces a shopping list.** Output is a product grid identical
  to the catalogue, with no per-item reason. *Warby Parker.*

## C. Comparison

**Patterns**
- **Attributes as rows, options as columns**, aligned on a shared vocabulary per
  row, legible at mobile width. *Best Buy (zebra-striped bands + ⓘ per attribute),
  Expedia iOS (editable shortlist from inside the comparison itself).*
- **Comparison generated on the fly from the user's own criteria**, including a
  qualitative final row assigning a use case rather than a winner. *ChatGPT.*
- **Holding variables constant so the real difference surfaces** — near-identical
  APR/payment, forcing the eye onto the row that actually differs (fees), dated.
  *Redfin Compare Rates.*
- **Non-alignable attributes as parallel prose, not a forced matrix.** A matrix
  would force false equivalence; bullets differ in length and content on purpose.
  *lululemon (shared headings, differing bullets), Apple Store (renders absence
  as a plain em-dash).*
- **Highlighting the recommended column** with ✓/✕ (not ✓/blank, so a gap is a
  stated no) — or marking the current plan to anchor on where the reader already
  is, or replacing a tick with the actual differentiating value ("0.75% vs 3.00%
  APY"). *Relevance AI, 7shifts, Chime.*
- **Sectioned, collapsible tables with sticky headers** for long attribute sets,
  numbered rows for support reference. *Productboard, Frame.io, Klook.*
- **Choice framed by its risk, not only its price.** Exposure written into the
  option itself, risky selection outlined in red; total interest per plan printed
  next to the tradeoff. *Turo, Affirm.*
- **Shortlists carrying decision-relevant state**, not just a saved picture — "In
  3 stores," "SOLD OUT," "Size: Not Selected" as an unresolved blocker. *Klarna,
  HBX, Under Armour.*

**Checklist**
- [ ] Are attributes rows and options columns, shared vocabulary per row?
- [ ] Is absence drawn explicitly (✕ or em-dash), not left blank?
- [ ] Are constant attributes kept visible so the differing one stands out?
- [ ] Are non-alignable attributes given parallel prose instead of a forced matrix?
- [ ] Is a recommended or current column marked?
- [ ] For long tables: sectioned, collapsible, sticky headers?
- [ ] Is the shortlist editable from inside the comparison?
- [ ] Are consequences and risk stated per option, not just price?
- [ ] Does the shortlist carry state that has changed since saving?

**Anti-patterns**
- **Tick-grid pricing tables.** Undifferentiated ✓ columns, blanks for absence,
  no highlighted recommendation — the reader does the scoring the product
  refused to do. *Mintlify, Frame.io.*
- **Self-scored competitor tables** (see landing-page skill — same failure mode).

## D. Detail / profile pages

**Patterns**
- **Above the fold = identity, price, and the 3–4 disqualifying facts.** Dense
  facts as an iconed tile grid beats a definition list at mobile width. *Zillow
  iOS (price cut badge → price → beds/baths/sqft → address → est. payment → fact
  tile grid → "What's special" chips).*
- **Sticky dual action bar: low-commitment left, commitment right** — CTA names
  the concrete next slot/date, not an abstract action. *Zillow iOS ("Contact" /
  "Request a tour — as early as tomorrow at 11:00am"), Redfin.*
- **Photo gallery pre-sorted by type**, so browsing is navigation, not a raw
  carousel. Listing status as a coloured dot above the price. *Realtor.com
  ("Exterior (6) / Bedroom (5)..."), Airbnb/KAYAK (1-large + 4-small mosaic).*
- **Section nav bar for long detail pages** — a table of contents when the page
  is effectively a document. *Zillow web.*
- **Decision support embedded in the detail page** — the strongest single screen
  in the whole survey. Pick an offer strength → "Under 50% chance of a winning
  offer," beside market context and affordability, editable. Turns a listing page
  into a simulator. *Zillow web "Offer Insights."*
- **Right-rail card that stays while the left column is read**, showing scarcity
  or responsiveness signals concretely. *Airbnb, Preply ("2 new contacts and 5
  bookings in the last 48 hours").*
- **Structured facts before prose** — disqualifiers come first, before "About the
  job/place," with inline coaching on fit. *Wellfound (visa/relocation/skills
  before prose; "Improve your odds" coaching), Braintrust (gauge tiles), Remote
  (urgency as data: "8 DAYS LEFT").*
- **Course/structure pages exposing the whole thing before purchase** — every
  module/lesson listed with runtimes, freshness date included. *Magnific, Uxcel
  ("Updated Apr 11, 2026" in the H1 zone).*
- **Practitioner/profile pages that answer eligibility before charm.** Insurance
  or eligibility status resolved via a progress spine before the reader invests
  in the bio. *Headspace ("✓ In-network," "Check In • Verify Insurance •
  Schedule").*

**Checklist**
- [ ] Above the fold: identity, price, and the 3–4 disqualifying facts?
- [ ] Dense facts as an iconed tile grid rather than a paragraph?
- [ ] Sticky action bar with a low-commitment action beside the committing one?
- [ ] Does the CTA name the concrete next slot/date?
- [ ] Is the gallery organised (labelled, counted) rather than an undifferentiated
  carousel?
- [ ] Section nav for long pages?
- [ ] Any decision support on the page (affordability, odds, market context, fit)?
- [ ] Structured eligibility facts before narrative prose?
- [ ] Freshness / status / provenance stated?

**Anti-patterns**
- **The photo-first result card.** Large image, name, price — nothing that
  distinguishes this from the next. *Skillshare, MasterClass.*
- **Shortlist as a wall of hearts.** Photo + price only, no state that changed
  since saving. *H&M, Deliveroo.*
- **The wall-of-text job/detail post.** Facts buried in 400 words of prose
  instead of a lead table. *Deputy.*

## Cross-cutting (see full list in the survey's "Cross-section observations")

- **Never let the user commit blind** — this section's live-result-count and
  removable-filter-chip patterns are direct instances of the same rule that
  governs paywall dual-unit pricing.
- **Absence must be drawn, not omitted — and the glyph choice is ethical.**
  Blank reads as an oversight, ✕ as a judgment, em-dash as a fact. Applies
  identically to comparison tables here and to paywall free/paid columns.
- **Progress/structure notation should match the shape of the thing** — long
  content earns a table of contents (detail-page section nav, sectioned
  comparison tables); short content earns a fraction. Same logic as onboarding
  progress bars.
- **Quoting the user's own words back is the strongest personalisation signal**
  — match-result attribution ("your concerns around acne and redness") is this
  section's instance; the failure mode (unattributed "For You" grid) is flagged
  above as an anti-pattern.

## Coverage gap — read before applying to a school-search product

No university/school-search or school-match-result product is indexed on Mobbin.
Real-estate search (Zillow, Redfin, Realtor.com) and job matching (Wellfound,
Braintrust, Wrangle, Contra) are the closest available analogues and carry
disproportionate weight in this file for that reason — treat them as the strongest
available reference, not a perfect one.
