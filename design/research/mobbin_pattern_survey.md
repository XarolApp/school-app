---
title: Mobbin pattern survey — paywalls, onboarding, landing pages, core product
date: 2026-08-25
purpose: raw reference material for a reusable design skill
source: Mobbin MCP (search_screens / search_flows / search_sections), iOS + web
---

# Mobbin Pattern Survey

Breadth survey of real shipped product screens, organised into four independently-readable sections. Every pattern names a concrete structural or visual mechanism and cites named products. Screens were examined as images, not inferred from metadata.

**Scope:** 73 searches across iOS and web. ~380–400 distinct product/platform combinations (some products appear in more than one section). Coverage gaps are stated honestly at the end of each section and summarised at the close.

**How to read this:** each section is `products surveyed → patterns → checklist → anti-patterns`. The checklists are the most directly reusable material. The anti-patterns are the "looks competent, is actually templated" list.

---

# Section 1 — Paywalls and pricing screens

## 1.1 Products surveyed

**iOS (63)** — The Outsiders · Acorns · Duolingo · Buddy · Tide Guide · 5 Minute Journal · Liven · Lovi · Paired · Cal AI · Sunlitt · Ten Percent Happier · Nibble · Mesh · Vocabulary · foodpanda · TIDE · Mimo · Orbit · FocusFlight · Ahead · timespent · Peanut · (Not Boring) Timer · Fixtured · QUITTR · Tolan · Placify · Pillow · Tinder · Deepstash · Brilliant · Wanderlog · Cleo AI · Runna · Centr · Equinox+ · Garmin Connect · Strava · Noom · Instacart · Swiggy · Vinted · Shipt · Honest Greens · Woolworths · Bumble · Hinge · happn · Badoo · Lex · KOHO · Formula 1 · Instagram · GoPay · State Farm · Agoda · Turo · Vrbo · eBay · Headspace · Blinkist · Future Pro · Oportun · Headway

**Web (46)** — Homerun · Dub · Linear · Programa · Oku · Clay · Teachable · Rox · incident.io · Typeform · Firecrawl · Zendesk · HoneyBook · OpenTable · TravelPerk · ElevenLabs · TIDAL · Substack · X · Matter · Kajabi · Care.com · Webflow · Teak · Superpower · MasterClass · Skillshare · Function · QuickBooks · Laravel Cloud · Xero · Mixpanel · Selfridges · Codecademy · Stripe · Kit · Grok · Sprout Social · Zapier · Spotify · Readymag · Railway · Popcorn · Lemon Squeezy · Intercom · Gumroad

## 1.2 Patterns

**Dual-unit price display (headline unit ≠ billing unit).** The card shows the psychologically small unit large and the actual charge small underneath, in the same card. Honest when both are present; a trick when only one is.
- [Buddy](https://mobbin.com/screens/d81d0d25-b0c2-4138-a32e-759950886662): "12 MONTHS / **$71.98** / $1.38 per week / 7 days free" — three units stacked in one card
- [Acorns](https://mobbin.com/screens/02aabc3f-7148-44d7-95e3-2b3126583b0d): "**$0.20**/day ($6 billed monthly)" — the parenthetical is the honest half
- [Function](https://mobbin.com/sites/sections/f5d5c740-7af0-4718-9893-3b8e80e39eed): "**$1**/day — Charged annually at $365"
- [Runna](https://mobbin.com/screens/3fa764cd-6481-433f-bfc3-63c15c5f09da): year price left-aligned, per-week equivalent right-aligned on the same row

**The trial timeline as a three-beat vertical rail.** A left-hand connector line with dated nodes: Today (unlock) → Day N−2 (reminder) → Day N (charge). Converts an abstract trial into a calendar commitment and pre-empts "I'll forget".
- [Mimo](https://mobbin.com/screens/e257555e-bd98-4163-b095-198a8c58473b): Today / In 12 days / In 14 days, each with an icon in a filled circle on the rail
- [Mesh](https://mobbin.com/screens/60db255e-0f7c-4caf-a0a5-4d91c0aa8740): node 1 expands into a 3-bullet feature list — timeline doubles as the value list
- [Nibble](https://mobbin.com/screens/e722f5a0-b638-4060-86cc-2a05426b3f17): copy is instructional — "Day 7: **Cancel in advance to avoid payment**"
- [Vocabulary](https://mobbin.com/screens/32238af5-552f-4ac3-bede-16981f4c23d3): uses *real dates* ("Mar 26 — Trial reminder") and strikes through step 1 ("Install the app") to show progress already made
- [foodpanda](https://mobbin.com/screens/5c330e96-9e24-4420-a703-7612ab830a4b): the rail sits inside the checkout sheet above payment method and consent — timeline as legal disclosure surface

**Trial as an explicit toggle, not a hidden default.** A switch labelled "Enable free trial" that visibly rewrites the CTA and the selected plan. Makes the trial an opt-in the user performed.
- [Liven](https://mobbin.com/screens/a612cffd-939d-471f-9b89-bf734058ab1a): toggle sits *inside* the selected plan card; CTA reads "Continue with 3 days trial"
- [Paired](https://mobbin.com/screens/d28aba85-df93-4912-960a-43b2e2b1a78f): "Free trial enabled" + subline "No payment due today"
- [Sunlitt](https://mobbin.com/screens/1be71829-fa39-4b78-a3c9-c2726c2ef26f): copy-led — "Not sure? Try 7 days free" — framing the trial as a hedge
- [Lovi](https://mobbin.com/screens/b19ae89c-7af8-4485-b23a-2188aaf0522d) ships the same toggle **off** by default, so "Continue" charges immediately — same component, opposite ethics

**Recommendation signalled by two redundant cues, not one.** Generic pages use a badge alone. Strong ones stack badge + border + fill + sometimes scale, so the recommendation survives greyscale and small screens.
- [Duolingo](https://mobbin.com/screens/398a23f4-2df5-40a6-bcba-54aa59dc6cd1): "MOST POPULAR" tab-badge + gradient fill + check-circle + a divider labelled "NO FREE TRIAL" pushing monthly below a semantic line
- [Dub](https://mobbin.com/sites/sections/0d2d583d-2925-4080-a99e-001e46f0437f): badge notched into the card's top border, plus a "2 months free" chip beside the price
- [ElevenLabs](https://mobbin.com/sites/sections/d14c5119-0015-4405-99d0-784b521e51d3): the Creator column inverts to black against 3 white columns, with crossed-out $22 → $11
- [Programa](https://mobbin.com/sites/sections/a954bfe4-b29d-4b79-892b-121d20fb197a): yellow "Recommended Plan" chip + a second chip stating the billing cycle — the badge explains *why* it's cheaper

**Two-axis card headers (tier name + who it's for + billing cycle).** Each card carries a micro-label answering "is this me?" before the price is read.
- [OpenTable](https://mobbin.com/sites/sections/0c81e36a-14f6-471d-9ce7-8930b284a9f2): three *differentiating* pills — "Free to try", "Most popular", "Most features" — rather than a rank
- [Rox](https://mobbin.com/sites/sections/82dafcc7-b269-4406-956c-37fd2ab15188): each tier has a glyph + one-line audience ("For sales professionals aiming to exceed their revenue goals")
- [Duolingo](https://mobbin.com/screens/398a23f4-2df5-40a6-bcba-54aa59dc6cd1): "2–6 MEMBERS" as a header band above Family Plan — eligibility precedes price

**Free-vs-paid table with the paid column as a raised object.** The premium column is drawn as a floating card *on top of* the table grid, so it reads as the product and free reads as background.
- [Brilliant](https://mobbin.com/screens/36a35dc6-cede-421e-8cf1-a4d831fc8a94): Premium is a white card with a gradient glow overhanging the row rules; free uses grey ✕, premium warm ✓
- [Fixtured](https://mobbin.com/screens/663df35e-da48-4908-bd9f-0c41ab999925): the Plus column is a blue gradient bar extending above and below the table body
- [Deepstash](https://mobbin.com/screens/a1cb5f0b-973f-4df9-bfc5-74289a38fb6f): free column uses an em-dash "—" instead of ✕ — absence without shaming
- [Cleo AI](https://mobbin.com/screens/c330c3f7-92f0-4323-8260-19342d065716): the comparison table's **last row is the price itself** ($5.99 vs $14.99) — cost compared like any other feature

**Quantified, product-specific value claims instead of adjectives.** The headline states a measured outcome, which also serves as the price anchor.
- [Orbit](https://mobbin.com/screens/fb696d7b-1e16-4b8f-9494-78be7e7aad5c): "Orbit customers save **$300 a year** on average" above a $24.98 lifetime price — the anchor is the saving, not a crossed-out price
- [Function](https://mobbin.com/sites/sections/f5d5c740-7af0-4718-9893-3b8e80e39eed): "What could cost you **$15,000** is $365"
- [Tolan](https://mobbin.com/screens/bbd76014-dfc6-473f-816b-46a270738aa3): "Unlock **20x more chat time**"
- [Hinge](https://mobbin.com/screens/692479d0-3aa2-4e74-9fc8-a5c363d0d3f6): "Subscribers go on **twice as many dates**" — one stat as the entire headline

**Named, attributed testimonial adjacent to the price.** Review text with a handle and star row placed directly above the plan cards, so proof and cost are in one glance.
- [Fixtured](https://mobbin.com/screens/0576cc85-bcfb-48ce-9115-cc4fbd774e02): "swilks17 — United States", 5 stars, carousel dots
- [TIDE](https://mobbin.com/screens/f16a7a88-a1cc-4517-b6fe-b4697ce4c77c): quotes an **App Store Editor's Choice** blurb — institutional proof, not user proof
- [The Outsiders](https://mobbin.com/screens/2bd8918c-f2f0-4d61-9ee3-7663ac4057d0): laurel-wreath frame reading "Made by Apple Design Award & App of the Year Winning Team", no urgency anywhere on the screen

**One-time purchase framed as escape from subscriptions.** Lifetime products name the thing you're avoiding and drop trial/urgency machinery entirely.
- [(Not Boring) Timer](https://mobbin.com/screens/23f6c07f-d72e-41b0-a4ac-3e96c02de5b1): giant coin illustration, 5 one-word benefits, "$14.99 one-time purchase". No plan grid at all
- [timespent](https://mobbin.com/screens/b00fa672-0e18-4d18-8040-8912c0af8ca7): a signed developer letter promising "**meaningful free tier**… **no dark patterns** — no intrusive pop-ups, no long ass sign-up flow that forces you to subscribe, betting you'll forget to cancel"; prices as three circular stamps
- [Orbit](https://mobbin.com/screens/b41b2f98-a4ed-4a11-b9a4-6f6e3482c477): "Lifetime — Early bird" chip, subline "Pay once and enjoy forever"
- [The Outsiders](https://mobbin.com/screens/2bd8918c-f2f0-4d61-9ee3-7663ac4057d0) and [5 Minute Journal](https://mobbin.com/screens/2494e11b-8fbf-480c-8e33-4bb736f176c3): Lifetime as the *third* card with a clarifying subline ("One time payment, yours forever"), so it reads as a genuine option not a decoy

**Cancellation reassurance as fixed furniture under the CTA.** A permanent quiet line in the same slot every time.
- [Duolingo](https://mobbin.com/screens/398a23f4-2df5-40a6-bcba-54aa59dc6cd1): "Cancel anytime in the App Store"
- [Mimo](https://mobbin.com/screens/e257555e-bd98-4163-b095-198a8c58473b): "No charges yet. Cancel anytime on the App Store"
- [5 Minute Journal](https://mobbin.com/screens/2494e11b-8fbf-480c-8e33-4bb736f176c3): a bordered "SECURED WITH APPLE STORE" chip — platform trust as a badge
- [Xero](https://mobbin.com/screens/2d37d513-1180-4cb5-9b4a-08e811928c9b): a literal "**How to cancel your subscription**" link *inside the payment form*, before the pay button

**Sticky order summary itemising what changes today vs what recurs.** Two separate labelled rows.
- [Xero](https://mobbin.com/screens/2d37d513-1180-4cb5-9b4a-08e811928c9b): "Discounted total **USD $0.00** — For the first month" / "Recurring total **USD $90.00** — Auto-renews monthly"
- [Mixpanel](https://mobbin.com/screens/72337fe6-dc15-4fe8-abc4-cc8169ed915a): "Prorated Total Due Today $0.00" plus a callout answering "Why is a credit card required if my plan costs $0?"
- [Codecademy](https://mobbin.com/screens/26bd938d-c5ca-4492-bc95-a132ef10bfec): "Today's total $0 / Total charged October 8 $39.99" — the future charge date as a line item
- [Laravel Cloud](https://mobbin.com/screens/0c164b6b-112c-460a-bc86-6dc059b753d7): "Due today $15.00 **+ usage**" — the open-ended part named rather than buried

**Free tier shown as a real column, priced $0.** Including it in the grid makes the paid tiers legible as increments.
- [Dub](https://mobbin.com/sites/sections/0d2d583d-2925-4080-a99e-001e46f0437f): "$0 / Free forever" with a full feature list of its own
- [Zapier](https://mobbin.com/screens/cc3d8fe0-f6ec-4ba9-aa0a-5950b9056cbd): Free column plus per-tier task-volume dropdowns that re-price the card in place
- [Substack](https://mobbin.com/screens/1e646fc8-a188-4e6f-92f0-4abd6d7ecb69): a "None / Free" card with its locked benefits in **strikethrough**
- [Oku](https://mobbin.com/sites/sections/f66ba39e-9d4f-4336-955d-8721fef92d47): top tier's list ends with "Our eternal gratitude" — pricing supporter identity rather than features

**Cumulative "Everything in X, plus:" list stems.** Each column inherits the previous one, so the reader never re-scans shared rows. [Dub](https://mobbin.com/sites/sections/0d2d583d-2925-4080-a99e-001e46f0437f), [Typeform](https://mobbin.com/sites/sections/1e1e816f-16ad-4bfd-bd66-b759a9f9252a), [HoneyBook](https://mobbin.com/sites/sections/0f227019-e479-41c4-84ad-3cf6c8bff53e), [Oku](https://mobbin.com/sites/sections/f66ba39e-9d4f-4336-955d-8721fef92d47) (marks it with a **←** glyph rather than repeating text).

**Enterprise as a different shape, not a fourth price.** Removing the number prevents the ladder ending in an unanswerable figure.
- [Linear](https://mobbin.com/sites/sections/27001485-8428-4f37-b7c8-be4ac9461bb2): a separate full-width panel below the grid with capability chips (SCIM, SSO) and one Contact Sales button
- [Typeform](https://mobbin.com/sites/sections/1e1e816f-16ad-4bfd-bd66-b759a9f9252a): swaps the price for an illustration; list is compliance-led (HIPAA, GDPR, data-centre choice) not feature-led
- [Teachable](https://mobbin.com/sites/sections/5b23eb17-d5db-4ef0-a3c3-57ca247a8654): pairs Enterprise with "Still not sure which plan is right for you? → **Take the quiz**" — a non-sales exit for the undecided
- [incident.io](https://mobbin.com/sites/sections/a6fc8b97-6f8c-4280-b8db-5bafdfa236d9): repeats the CTA row as a **sticky footer** while scrolling 40 feature rows

**Live price calculators that resolve uncertainty before commitment.**
- [Stripe](https://mobbin.com/sites/sections/088a670f-2b5e-4b7a-ad9b-680405acd8fb): slider with **visible tier boundaries** (2¢ / 1.8¢ / 1.6¢) labelled beneath the track — the pricing logic is shown, not just the result
- [Kit](https://mobbin.com/sites/sections/bf75ef36-3544-4f1b-b71e-3e91b8456224): subscriber slider re-prices all three cards simultaneously and greys out "Max subscribers reached" on free
- Also [Teak](https://mobbin.com/sites/sections/58c2e515-2f0f-4696-8cc2-d9d0ad4993c7), [Grok](https://mobbin.com/sites/sections/81db7590-2786-489b-af2d-ef506c7388b5) (token calculator), [ElevenLabs](https://mobbin.com/sites/sections/007b0713-0a97-412d-86f9-338456a32367) (feature chips + minutes slider → one recommended card)

**Non-monetary reassurance chips in a row under the CTA.** Three or four short trust facts as inline icon+label, replacing legalese.
- [Superpower](https://mobbin.com/sites/sections/6116ce47-e74a-4afc-a67f-fa7496e8579f): "HSA/FSA eligible · Cancel anytime · **Results in a week**" — the third is a delivery promise, not a payment term
- [Teak](https://mobbin.com/sites/sections/886256c9-3f80-4c85-834d-ee65a225935e): five circular icons including "90-day money-back guarantee" and "Completely free until you launch"
- [HoneyBook](https://mobbin.com/sites/sections/0f227019-e479-41c4-84ad-3cf6c8bff53e): a "60 Money Back Guarantee" seal below the grid, plus dual CTAs per card ("Start free trial" / "Buy now") for trial-averse buyers
- [Vinted](https://mobbin.com/screens/f145846c-fb81-4cd6-9f01-7504da0b04ec): "🔒 This is a secure encrypted payment" directly above the Pay button

**Fee transparency as a selling point.** Showing the breakdown — including the zeros — reads as confidence.
- [Shipt](https://mobbin.com/screens/cf12e15c-5fee-4749-a51e-9a2a5ef3ced5): "You're paying **$0 in service fees**" plus a plain-language note that the card is authorised for $20.51, more than the $15.98 total, and why
- [Swiggy](https://mobbin.com/screens/91875a87-b426-4a2a-94cb-e453691407d0): line items include "Extra discount for you −₹20" and a tappable "Make it FREE" on delivery
- [Instacart](https://mobbin.com/screens/ef9b3d21-2e6e-42d8-b2cf-aa589a56082c): strikethrough on *every* line, then a summary chip "You're saving $15.73"
- [Gumroad](https://mobbin.com/sites/sections/0c7c853b-8214-40b8-9b04-0c5723553f6a): the entire pricing page is the words "**10% flat**"

**Symmetrical, non-trapping decline paths.** The "no" is a real, legible control — not a 10pt grey word.
- [Pillow](https://mobbin.com/screens/06cd6479-d9bb-47eb-8a0e-5440c79b7286): "No, thanks" as a full-width pill directly under accept
- [Cleo AI](https://mobbin.com/screens/c330c3f7-92f0-4323-8260-19342d065716): "Not right now" as an outlined button of identical size
- [Turo](https://mobbin.com/screens/b53c95b3-0641-41db-b4f0-f0a75e838d5e) and [eBay](https://mobbin.com/screens/7def0f6a-c622-48b2-b5cc-be074ec6bd5d): decline inside the same radio group ("No, thanks. I'll get my own protection plan") — a selection, not an escape
- [KOHO](https://mobbin.com/screens/eef14202-1253-43b9-93a7-eb134d830d8b): "I don't want a free trial" — naming the thing being refused

**Retention offers that state the exact new number.**
- [Headspace](https://mobbin.com/screens/c995f167-095b-40b4-b8e1-13e2a3c54cc1): "~~$69.99/yr~~ Your price **$34.99/yr**", and reassures that *even if you cancel* access continues to a stated date — the least coercive version seen
- [Blinkist](https://mobbin.com/screens/0ee44212-8ee5-4d4b-9c04-c44cff089393): translates the annual save into a monthly figure beside the crossed-out original
- [Oportun](https://mobbin.com/screens/8643350d-9873-4fca-9dd7-4b472df590a7): "You won't have to pay anything until **October 3, 2026**" — a date, not a duration
- [Future Pro](https://mobbin.com/screens/30160412-4a42-4daf-b67a-4f886e349b66): "Continue to Cancel" equally prominent as the save offer

**Progressive paywalls that show value before price.**
- [TIDAL](https://mobbin.com/screens/b5771b05-c819-4790-8367-8014812cdaed): "Free accounts can play a **30-second preview**" over a track already playing — the limit is experienced, then priced
- [Matter](https://mobbin.com/screens/dd7a0fe3-54b8-404c-b79b-8b022c094f6b): 3 benefits left, 2 plan cards right, "Not now" as a real button — a whole paywall in one row
- [Care.com](https://mobbin.com/screens/4f2671c5-65fa-431f-8b6c-6d63ec8797f5): 3 duration cards labelled by *saving* ("Full price / Save 33% / Save 65%") rather than by tier name
- [Skillshare](https://mobbin.com/sites/sections/dc05bccf-69d8-4b00-a0d8-aad55f48720c): padlocks on lessons 2–4 while lesson 1 stays open — the wall drawn inside the content

**Personalised-plan paywalls that reference the work already done.**
- [Noom](https://mobbin.com/screens/6984f514-e858-4e66-a587-a9f2f8e450aa): numbered steps, separate "PRICE TODAY" and "PRICE AFTER TRIAL" headings, exact billing date. Undermined by a countdown bar — see anti-patterns
- [Runna](https://mobbin.com/screens/3fa764cd-6481-433f-bfc3-63c15c5f09da): "**Alex**, get started with a free trial", benefits phrased around goals
- [Centr](https://mobbin.com/screens/cbff39d2-731b-4f6c-a44e-1c9938404e6a): shows the actual generated program cards with padlock overlays before "UNLOCK YOUR PLAN NOW"
- [Equinox+](https://mobbin.com/screens/50353d8c-03df-4c3b-bd96-9ac7c8d85ba4): a numbered "How to get started" list instead of a price — sells the process first

## 1.3 Checklist

**Price legibility**
- [ ] Does every card show both the headline unit and the actual amount charged, in the same card?
- [ ] Is the billing period on the card, not only in fine print?
- [ ] If a price is crossed out, is the original a price the product genuinely charges?
- [ ] Is the free tier a real column with a $0 price, not a link?

**Choice architecture**
- [ ] Is the recommended plan marked by at least two cues (badge + border/fill/scale)?
- [ ] Does each tier carry a one-line "who is this for"?
- [ ] Do later columns say "Everything in X, plus:" instead of repeating rows?
- [ ] Are there 3–4 tiers max on mobile, or one plan with a duration selector?
- [ ] Does the top tier drop the number where a number would be meaningless?

**Trial and commitment**
- [ ] Is there a 3-beat timeline (today → reminder → charge) with a real date on the charge?
- [ ] Is the trial an explicit, visible opt-in that rewrites the CTA?
- [ ] Is the reminder-before-charge stated as a promise, not implied?
- [ ] Does the CTA name what happens ("Start my 14-day free trial"), not just "Continue"?

**Reassurance**
- [ ] Is there a fixed line under the CTA covering cancellation, in the same slot on every paywall?
- [ ] Are trust facts 3–4 scannable chips rather than a legal paragraph?
- [ ] At checkout, are "due today" and "recurring after" separate labelled rows?
- [ ] Are all fees, including zeros, itemised?

**Proof**
- [ ] Are testimonials attributed to a named handle with a source?
- [ ] Is the headline claim a measured number specific to this product?
- [ ] Would any social-proof number survive being asked "how do you know?"

**Exit**
- [ ] Is the decline control the same width and legibility as accept?
- [ ] Does the decline name what's being refused?
- [ ] Is the close affordance reachable within the first screenful?

**One-time purchases**
- [ ] Is "pay once" stated in words, not inferred from the absence of "/mo"?
- [ ] Is trial/urgency machinery removed rather than reused from the subscription paywall?

## 1.4 Anti-patterns

**The manufactured countdown.** A timer with no external referent. [QUITTR](https://mobbin.com/screens/09ef2499-dfce-4ec1-8d23-8841b966f54d) — "ONE TIME OFFER / You will never see this again / 80% DISCOUNT / expires in 4:59"; [FocusFlight](https://mobbin.com/screens/5a020989-c20a-4f45-b35c-b7f92a703f1d) — 59:52 flip-clock with a fake barcode and a footnote admitting "*regular price based on monthly subscription rate*" (the −58% is arithmetic, not a discount); [Cal AI](https://mobbin.com/screens/40014cb6-d991-4c5b-bc21-f66ecd969711); [Placify](https://mobbin.com/screens/3866cef7-dea3-4979-bb93-edab028f59ec); [Tinder](https://mobbin.com/screens/01de918a-8861-4b23-a4a8-db1a064e27f5) — "Offer ends in 23:59:59", which is simply "today". Visually competent, structurally dishonest.

**Stacked pressure.** [Peanut](https://mobbin.com/screens/fea3b0ed-9377-41d6-8282-8146146daefc) runs a 47-hour countdown, a strikethrough $132→$80, "39% off", three cards with "Save 73% / Save 56%" badges, a modal, *and* a dense auto-renewal paragraph — simultaneously. Each device is defensible; together they're a wall.

**Save-% on every card.** When all three durations carry a savings badge ([Hinge](https://mobbin.com/screens/ab3d49ac-4e97-4037-ab8d-8ef7bded5ece), [Lex](https://mobbin.com/screens/d53d4cf1-05c7-4ce4-8221-9f25fa1c3172)), the badge stops carrying information and becomes wallpaper.

**Toggle-off-by-default trial.** [Lovi](https://mobbin.com/screens/b19ae89c-7af8-4485-b23a-2188aaf0522d) presents the same "Enable Free Trial" affordance as Liven and Paired but ships it disabled, so the honest-looking component produces an immediate charge.

**Undermining your own good screen.** [Noom's](https://mobbin.com/screens/6984f514-e858-4e66-a587-a9f2f8e450aa) plan screen is one of the clearest surveyed — then pins a "Personalized plan saved: 14:43" countdown to the bottom, implying the personalisation expires.

**The undifferentiated 3-card grid.** Three equal white cards, one purple badge, three identical checkmark lists, identical CTAs. [Zendesk](https://mobbin.com/sites/sections/db55d7e4-744f-49b9-accb-7f9248ca938c), [Readymag](https://mobbin.com/screens/02f4a3f0-a2d8-4d2f-bfe9-573d228bdd74), [Clay](https://mobbin.com/sites/sections/4818354e-594b-4cf0-b62c-25652390154d). **The tell: swap the logos and nothing reads wrong.**

**Feature lists as spec dumps.** [Badoo](https://mobbin.com/screens/2d6e3d16-e923-4ae8-ac5e-dc4e256e83e2) lists 11+ features with 2-line descriptions and no price anywhere; [Formula 1](https://mobbin.com/screens/dd33e988-2bcf-4fdb-a184-06e664dfb9fd) runs three headed sections of dense bullets with footnote daggers and no price above Subscribe. Length substituting for value.

**Price hidden behind a second screen.** [happn](https://mobbin.com/screens/b388c01b-58b7-4394-88d6-a52b00d18d23) shows a locked benefits list and a bare "Subscribe" — cost appears only after tapping.

## 1.5 Flags — payers who may be minors, or paying for someone else

*Flagged, not filtered, per the brief.*

- **Every countdown paywall above.** Time-pressure falls hardest on young users and on anyone buying under stress. FocusFlight and Cal AI additionally use fake-discount arithmetic.
- **Weekly billing with a per-week headline.** [Liven](https://mobbin.com/screens/a612cffd-939d-471f-9b89-bf734058ab1a) ($7.99/wk ≈ $415/yr), [Lovi](https://mobbin.com/screens/b19ae89c-7af8-4485-b23a-2188aaf0522d), [Hinge](https://mobbin.com/screens/ab3d49ac-4e97-4037-ab8d-8ef7bded5ece) ($24.98/wk), [Tinder](https://mobbin.com/screens/01de918a-8861-4b23-a4a8-db1a064e27f5) ($39.99/wk). **No screen surveyed shows the annualised total for a weekly plan.**
- **Trial-off-by-default toggles** — a component whose look implies protection while producing an immediate charge.
- **QUITTR** ([paywall](https://mobbin.com/screens/a55ce65a-240c-4a00-a121-97a00854d738)) — a shame-adjacent behavioural product using maximum-pressure pricing on a likely-young audience. Structurally the worst combination in the survey.
- **No age or payer-identity gate anywhere.** Spotify and TIDAL verify *student status* but not payer age; no paywall surveyed asks whether the cardholder is the user.
- **Family/gift plans lack a "this is for someone else" path.** Duolingo Family, Tide Guide's iCloud share and Spotify Duo all price for multiple people but address copy to a single "you". Only [Substack](https://mobbin.com/screens/1e646fc8-a188-4e6f-92f0-4abd6d7ecb69) (Individual / Group / **Gift** tabs), [MasterClass](https://mobbin.com/sites/sections/34f6ea6b-ceac-49d3-98c7-2d0cd7574a00) and [Instacart](https://mobbin.com/screens/ef9b3d21-2e6e-42d8-b2cf-aa589a56082c) ("Make it a gift") model the third-party payer.
- **Personalised health pricing addressed to the user, not the buyer.** Noom, Runna, Centr and Superpower all assume payer = subject; a parent buying for a teen sees the teen's name and plan with no account-ownership step.
- **Positive counter-examples worth copying:** Headspace's retention offer explaining what continues *if you cancel*; Vocabulary's and Noom's absolute charge dates; Xero's in-form cancellation instructions; KOHO's named refusal link; timespent's no-dark-patterns pledge; Shipt's plain-English explanation of card over-authorisation.

*Coverage: 16 searches, ~106 products. Thinnest direction — "money-back guarantee badge" on web returned strong pricing grids but only Teak and HoneyBook surfaced an actual guarantee seal.*

---

# Section 2 — Onboarding and quiz flows

## 2.1 Products surveyed

**iOS** — Liven · Brilliant · Noom · Life Reset · Duolingo · MyFitnessPal · MacroFactor · Cal AI · QUITTR · Ten Percent Happier · Headspace · Bumble · Tinder · Coffee Meets Bagel · Plenty of Fish · Azar · Chime · Revolut · Fidelity · Acorns · Cleo AI · Rocket Money · Monzo · CRED · Chase UK · Greenlight · Notion · Substack · Fabric · Mimo · Speak · Quizlet · Vocabulary · Nibble · Deepstash · Babbel · Me+ · Bloom · Recime · Hevy · Centr · WHOOP · Bluesky · Medium · Yahoo News · The Weather Channel · Cosmos · Believe · Lex · Bump · Wysa · DeepSeek · Grok Bot · Depop · Best Buy · DoorDash · Agoda · Too Good To Go · Waymo · Polestar · Alan

**Web** — Fabric · Clay · Docusign · Zendesk · Headspace · Mindtrip · Monarch · Klook · HoneyBook · Shop · Vercel · Devin · Langdock · Apollo · Uxcel · Hootsuite · Remote · Melio · Workable · Deputy · OKX

≈81 products.

## 2.2 Patterns

**Question-as-persuasion, not question-as-form.** Each screen asks one thing and the answer options *are* the value proposition. [Duolingo](https://mobbin.com/flows/b0b4f93f-5637-46ec-9d77-49ecda6b991d)'s "What's your daily learning goal?" prices commitment right in the row — `5 min/day — Casual`, `20 min/day — Intense` — and the CTA reads **I'M COMMITTED**, not "Next". [Brilliant](https://mobbin.com/flows/7ffbd4f0-78d1-49be-bf0d-9c90cac00e8c)'s options are bolded lead + lightweight qualifier: **Morning routine** *during breakfast or my commute*. A generic flow ships a time dropdown.

**Answer-triggered reassurance.** Selecting an option injects a coloured card *between* the chosen row and the rest, before you can continue. [Liven](https://mobbin.com/flows/5695ec7e-a531-4d04-8381-746e3591db36): pick "Almost always" on *"It's difficult for me to express emotions"* and a yellow panel appears — "💡 You're not alone — Many people grow up learning to hold back emotions, but expressing them is a skill you can build." **The single highest-craft detail in the survey**: it converts a data-collection tap into a moment of being understood.

**Justify the sensitive question inline, at the field.** Liven's "Select your gender" carries "We only use your gender to personalize your plan". [MacroFactor](https://mobbin.com/flows/03aa6dd8-8128-48c2-8b56-2a76fb0c593e): "Your selection will be used to help you visually determine your body fat percentage." [MyFitnessPal](https://mobbin.com/flows/d6b9fd93-8d2f-49e6-af4e-0a5da9d430ea) adds a tappable "ⓘ Which one should I choose?" under the sex toggle. [Fidelity](https://mobbin.com/flows/f867a470-941d-4d55-9515-e03b2d91cc27) states the legal reason for SSN. Coffee Meets Bagel on ethnicity: "Your answer controls how your profile shows up in filtered results."

**Loading theatre — the computation you can watch.** The strongest version itemises the categories being processed, so the bar doubles as a recap of everything invested. [Noom](https://mobbin.com/flows/0f88ecd3-ceb0-43d1-af33-6feafe56928b) shows per-section percentage rows (DEMOGRAPHIC PROFILE 100%, WEIGHT LOSS GOALS 50%, EATING & NUTRITION 0%) plus "we're building your perfect plan based on millions of data points". [Cal AI](https://mobbin.com/screens/63944ee4-76ea-4bcd-8f0f-543e7240f4ff): a literal **18%** with a card previewing the five outputs. [Life Reset](https://mobbin.com/screens/96ac6812-b174-4dc5-8a8f-e23364e36989) stacks trust laurels under the bar.

**The named archetype as the payoff.** The reveal is a *label about you*, not a settings summary. [Mindtrip](https://mobbin.com/flows/467b5974-b532-4123-a55c-8461bca49b54) ends its travel quiz on **"Curious Independent Explorer"** with a first-person persona paragraph, interest chips, and four pre-seeded questions "matching your profile" — the archetype immediately becomes usable product. [Headspace](https://mobbin.com/flows/7cdc08c0-3bcb-4882-90dd-5cf92019616f) tags the card **"For Calm Explorers like you"** with a *"Why this recommendation"* strip showing the inputs that produced it. [Life Reset](https://mobbin.com/flows/e91bc9a4-db92-449a-8de2-2d5e81381f6b) writes a diagnosis: "You're carrying more mental weight than you let on."

**Show the trajectory, not the number.** A two-line projection chart (you-with vs you-without) placed *mid-flow*, before the paywall. [Liven](https://mobbin.com/screens/f167dd12-0872-4f50-82cd-b2f3a2d38a72) and [Me+](https://mobbin.com/screens/32dd9a7a-5e75-4368-b445-845304e7eaab) plot a rising curve with 5/14/30-day milestone dots against a flat grey control. [Recime](https://mobbin.com/screens/16037767-cc7f-45d5-a56b-411cbc3a2e66) does the minimal version: one curve from "Scattered recipes / Now" to "Organized recipes / Your goal".

**Explicit commitment ritual.** The user *performs* an act of consent. Liven's "Alex Smith, let's make a contract" lists four ticked promises and asks you to **sign your name with your finger** — with "Your signature will not be recorded" as the honest footnote. Duolingo's variant is the CTA verb: **I'M COMMITTED**. [Tinder](https://mobbin.com/flows/cf596bae-7f17-4a14-8be6-b48609af85d1)'s House Rules gate is the safety-flavoured cousin.

**Credential-borrowing and social proof at the doubt point.** [Liven](https://mobbin.com/flows/ba9958ef-dd21-4a03-9ba1-2e5a3f5b51e3) interrupts its question sequence with HARVARD / OXFORD / CAMBRIDGE cards under "developed using evidence-based psychological practices". Headspace: "Just 10 days of Headspace can increase happiness by 16%." [Centr](https://mobbin.com/screens/6e0422b2-53d0-4083-9ccc-a7c3c29ca03c)'s step **3 of 8** is a full testimonial page. Liven's "Over 1M men have chosen Liven" is segment-matched to the answers just given.

**Trial timeline instead of a price wall.** [Brilliant](https://mobbin.com/flows/7ffbd4f0-78d1-49be-bf0d-9c90cac00e8c): a four-node line with the first node **struck through and ticked** ("you've successfully created your profile") → Today → Day 5 reminder → Day 7 charged. [Headspace](https://mobbin.com/flows/31b21791-dec6-448a-8253-648f5ebbba3e) runs the identical lock/bell/star pattern on iOS *and* web. (Same mechanism as §1 — see cross-section notes.)

**Signup as the door to a thing already built.** [Brilliant](https://mobbin.com/flows/7ffbd4f0-78d1-49be-bf0d-9c90cac00e8c): "Create a free account to discover your personalized learning path". [MyFitnessPal](https://mobbin.com/flows/d6b9fd93-8d2f-49e6-af4e-0a5da9d430ea) delays it to a near-full progress bar: "Almost done! Create your account." The counter-example, Noom, asks for email+password on screen 2 of 6, before any question.

**Input type chosen for the shape of the answer.** Sliders where the answer is a *degree*: [Life Reset](https://mobbin.com/flows/e91bc9a4-db92-449a-8de2-2d5e81381f6b)'s "How confident are you…?" with a giant orange **8** and "Be honest — there's no wrong answer"; [Mimo](https://mobbin.com/screens/8878d2af-4b06-4b59-8691-3eae0236159b)'s notched track that captions itself; [Rocket Money](https://mobbin.com/screens/34a6e862-090b-497b-8ace-7a84a8575bb8)'s Slower ↔ Faster with an explanation under each pole. Mindtrip uses **bipolar personality sliders** (Budget conscious ↔ Luxurious) resolving to a written label. Wheel pickers for continuous physical facts. Batched matrix sliders when answers are comparative. Free text only where personality is the point.

**Budgeted multi-select.** Cap the choice and show the count so the user curates instead of ticking everything. [Bumble](https://mobbin.com/flows/c3ad75ad-09e6-42bf-a66b-c8842c37984d): "Choose 5 things you're really into" with a live **1/5 selected**; then "Choose up to 3" with **1/3 selected**. [Cosmos](https://mobbin.com/screens/fac9b942-12fe-4fe8-ac31-497c88318d62) pins a black bar reading **Choose 3 — 0/3**. Yahoo News disables the CTA and labels it **0 selected**. MyFitnessPal splits chips into "Recommended for you" vs "More" so the default is already smart.

**Mascot/persona as the question-asker.** [Duolingo](https://mobbin.com/flows/7d7aacbe-213b-471e-8b1f-b5b7087bcb65) puts every prompt in a speech bubble beside Duo, which lets the flow speak in first person and hand out interpretations — "Since you know a few words, let's start at Score 10!", "I'll cheer you on from your home screen!" (widget ask). [Monarch](https://mobbin.com/flows/adae1760-df5a-4a73-9da8-7c222a14ee8e) uses a photographed human advisor above every question.

**Permission priming that names the payload.** [WHOOP](https://mobbin.com/screens/d579aeed-4fbb-4c7b-b6bd-6f5cd91db2d8) labels the screen **STEP 6/6**, shows blurred example rows behind the dialog, then explains: "when it's best to go to sleep, when there's an activity to review, when there is news from your teammates." [Agoda](https://mobbin.com/screens/a94518a2-f6a1-4007-8b4a-9f1051be6e14) itemises three bullets with a soft "No, thanks". [DoorDash](https://mobbin.com/screens/b77da879-e08d-4b79-936d-0d91d5c190fe) ends on "You're in control. Turn off sharing anytime you want."

**Progress notation carries meaning.** Segmented bars where segments = phases (MacroFactor, MyFitnessPal). Named-phase bars telling you which *chapter* you're in (Noom's rail captioned **DEMOGRAPHIC PROFILE**). Icon rails for regulated multi-stage flows. Explicit fractions where the count is short and finite (Best Buy "Step 1 of 2", Centr "Step 3 of 8"). **Duolingo deliberately shows no count** — just a bar that visibly leaps, so the flow feels short.

**Back is quiet, skip is quieter, and both exist.** Near-universal on good flows: a small chevron top-left. Skip is deliberately downgraded — Bumble's Skip is grey text while ▶ is a filled dark circle; The Weather Channel puts "Maybe later" *under* the black Next; Duolingo offers "NOT NOW" in green text under a full-width "ADD WIDGET". Monzo's "I'm not sure" pill is the humane version of skip.

**Anti-fraud and correction handled as coaching, not error.** [Revolut](https://mobbin.com/flows/24ff924f-1325-4c28-8a5d-2a50cb8ecd1e) returns a red-bordered "Blurry photo detected — Make sure everything is clear" with an *Enlarge image* affordance and a single Retake action. [Chime](https://mobbin.com/flows/9d0a1507-23f6-4dce-8beb-785ebcc3cdff) front-loads KYC as a numbered promise — "1 Snap a pic of your photo ID. 2 Take a selfie – *Cheese*. 3 Get verified!" Revolut also offers the shortcut path first, badged ⚡ *Faster*.

**"Why do you want this?" as a segmentation question the user enjoys.** Revolut asks "What do you want to use Revolut for?" with emoji chips — and admits the motive: "We need to know this for regulatory reasons. And also, we're curious!" [Substack](https://mobbin.com/screens/fbb0f72a-66db-4e8b-beb0-dd79ddf29a11)'s two-option fork branches the entire rest of the app from one tap.

**Web: the wizard that ends in a priced recommendation.** [Zendesk](https://mobbin.com/flows/fc697b1e-d935-4802-b96d-938d510e3a49) runs four questions with a literal "25% completed" bar and a persistent **See all plans** escape hatch, then lands on "Best plans for your business" with the matched tier ticked and badged **MEET YOUR NEEDS**. The quiz *is* the pricing page.

**Web: one-page vs one-per-screen is a deliberate choice.** [Clay](https://mobbin.com/flows/2400b4a4-33a7-4fed-b865-249983fda759) puts everything on one card (high-intent B2B, no ceremony). [Fabric](https://mobbin.com/flows/c1b3da82-b599-4e48-88ee-2d2d8c91e4b9) does the opposite for consumer: full-bleed centred one-question-per-screen with Back bottom-left and a ⏎ key hint.

**Post-signup checklist that pays or shames you into finishing.** [Langdock](https://mobbin.com/screens/065752db-06ad-4118-ad1c-8f95daa3f8a8) shows a ring at **0/595** points with nested groups and **+10/+15/+20** per task. Devin's is inline — "Get started with Devin, 3 of 6" — with "Earned $50" struck through beside a completed step. [HoneyBook](https://mobbin.com/screens/7c915d6b-2a99-4eb0-956d-e7a3a97bb265) shows "6/7 completed" with per-task time estimates (*2 mins*). Clay skips the checklist and instead seeds two real tables so the empty state isn't empty.

## 2.3 Checklist

- [ ] Does each screen ask exactly one thing, with the answer options doing persuasion work?
- [ ] Does any answer get acknowledged (reassurance, interpretation) rather than silently stored?
- [ ] Is every sensitive field justified *at the field* in one line?
- [ ] Is progress shown, and does the notation match the flow (bar for long, "3 of 8" for short, named phases for chaptered)?
- [ ] Is Back present on every question, and Skip present but visually downgraded?
- [ ] Does the input type match the answer's shape — slider for degree, wheel for continuous, capped chips for taste, free text only for personality?
- [ ] Are multi-selects budgeted with a live count and a disabled CTA until minimum?
- [ ] Is there a computation beat that itemises what's being processed?
- [ ] Does the reveal name something about the *user* rather than echo their inputs?
- [ ] Is there a projection showing with-vs-without over a stated horizon?
- [ ] Does account creation come *after* the artefact exists, framed as claiming it?
- [ ] Is the paywall a dated timeline with the charge date named?
- [ ] Are permission asks primed with the *specific* payload and a soft decline?
- [ ] Is there a commitment moment (signature, "I'M COMMITTED", rules agreement)?
- [ ] Post-signup: a checklist with counts/time estimates/rewards, or seeded real content?
- [ ] Web: does the wizard output a priced recommendation, with a persistent escape hatch?

## 2.4 Anti-patterns

- **The 20-tap demographic interrogation with no feedback.** Noom's opening run of identical beige rows never once reacts to an answer. Competent, forgettable.
- **Signup on screen two.** Noom asks for email+password before a single question — spending all the goodwill before earning any.
- **The attribution question dressed as personalisation.** "How did you hear about us?" with 9+ radio rows is marketing attribution charged to the user's patience.
- **Emoji-per-row as the entire visual system.** Liven, Me+, Fabric, Revolut and Monarch all reach for the same trick; with no illustration or layout variation the flow reads as an emoji-decorated list and every option carries equal weight.
- **Progress bars that lie by omission.** Bars with no denominator and no phase label — fine as motivation, hostile when the flow is 23 screens.
- **The "welcome to X" carousel of undifferentiated benefit slides.** Believe, Alan, Too Good To Go, Chase UK. Zero ask anything, so the user arrives at signup no more invested than at launch.
- **Skip that doesn't skip.** Docusign places **Skip ›** directly under Next on a two-dropdown screen — the questions were never needed; the wizard exists to fill a CRM field.
- **Generic centred-icon permission screens.** Grok Bot's "Allow Push Notifications?" states no benefit at all.
- **Consent by toggle-wall.** MacroFactor's two acknowledgement toggles over a wall of disclaimer prose, mid-onboarding, with a disabled Accept button — legally sound, momentum-destroying.
- **Reveal that is just a receipt.** "Personalisation" that echoes the user's own inputs back as a settings summary, with no synthesis, name, or number they didn't already supply.
- **Countdown scarcity on a personalised plan.** Noom's "PERSONALIZED PLAN RESERVED — EXPIRES IN 14:59" is effective and transparently fake.

*Coverage: 18 searches (11 iOS, 7 web), 81 products. Ran thin: insurance quote questionnaires on web (returned purchase pages, not underwriting flows) and ecommerce product-recommendation quizzes (no classic skincare/apparel quiz surfaced).*

---

# Section 3 — Landing pages

## 3.1 Products surveyed

All web. Mixpanel · Superhuman · Aqua · Maze · Craft · Speakeasy · Riverside · Flighty · Headspace · Antimetal · Superpower · The Leap · Analogue Agency · Intercom · Kajabi · Glide · beehiiv · Mailchimp · Daydream · Loom · Mercury · Grammarly · Whereby · Fibery · Customer.io · Attio · Resend · Clay · Charma · Ramp · Coda · Robot.com · Revolut · Titan Intake · Hermes Agent · Savor · Dropbox · Calm · Oryzo · Titan · Railway · Escape Cafe · ClassPass · Trawelt · OpenPhone · ClickUp · Zendesk · DICE · Oku · folk · PamPam · Spline · Grain · Notion · monday.com · Dub · Miro · Sana · Mural · Dovetail · Linear · Jasper · Amplemarket · Selfridges · Shopify Editions · Patreon · Phantom · Airwallex · Kraken · Expensify · Origin · YNAB · OKX · Hims · Hers · Open · Heidi · Care.com · Codecademy · Podia · Coursera · SuperHi · Brilliant · Duolingo · TravelPerk · KAYAK · Kiwi.com · Expedia · Klook · Navan · Mindtrip · Record Club · Posh · Gusto · Zillow · Wave · Linktree · Slash · Teachable · Airtable · Bird · 1Password · Anchor · Farm Minerals · Ditto · mymind · MANA Yerba Maté · NEON · Graza · David · re_ · Tines · Framer · Gamma · Bard · Pi · Elicit · NotebookLM · Disney+ · HBO Max · Telescope · Spotify · Substack · Netflix · Lyssna · Toggl Track · Contra · HoneyBook · Circle

~130 products.

## 3.2 Patterns

**Category line above the headline.** A small eyebrow naming the product category in flat words, so a poetic headline doesn't have to carry identification. [The Leap](https://mobbin.com/sites/sections/956e1213-e4d8-43d4-b02b-f04f6c244c88) puts "Bite-sized learning" above its headline; [Headspace therapy](https://mobbin.com/screens/9ed811c7-c0a0-448e-b781-ccd93a1f7dcb) writes "therapy by ● headspace"; [Heidi](https://mobbin.com/screens/0a03615a-1698-4f74-a579-5aa51f7a0038) uses "AI trusted and loved by clinicians". Contrast [Mixpanel](https://mobbin.com/sites/sections/5f566da6-7d84-4e60-b4e5-a2f5a275d45f) — "Unlock truth for everyone / Let's Build" identifies nothing.

**Subhead as the literal what-it-is sentence.** The headline sells; the line under it defines. [Airwallex](https://mobbin.com/screens/b432a462-e104-41f4-b602-876cb045d039): "The global payments and banking platform for growing businesses". [Record Club](https://mobbin.com/screens/2aec633a-5b37-4afd-af6f-cb84629d6ab5): a full sentence starting with the product name. [Heidi](https://mobbin.com/screens/0a03615a-1698-4f74-a579-5aa51f7a0038): "Your AI scribe capturing notes, summaries, and follow-ups as you go."

**Outcome headline, not feature headline.** [Maze](https://mobbin.com/sites/sections/692025e8-77b8-45c7-9f60-3ee6d44e0688) "All the answers, none of the headaches"; [Heidi](https://mobbin.com/screens/0a03615a-1698-4f74-a579-5aa51f7a0038) "Get time *back*. Move care *forward*."; [Speakeasy](https://mobbin.com/sites/sections/36b6a87d-9ef7-41d3-80b6-d9a2f9a62e87) "Experience Terraform without the hassle" — names the incumbent pain in the headline.

**One primary CTA, secondaries visually demoted.** [Craft](https://mobbin.com/sites/sections/81874e27-d807-48c6-8bf3-c2efd62b8c2f) has exactly one filled button, with the nav repeating the *same verb, same colour*. [Maze](https://mobbin.com/sites/sections/692025e8-77b8-45c7-9f60-3ee6d44e0688) shows "Start now" filled black beside "Request a demo" outlined. [Riverside](https://mobbin.com/sites/sections/601ce269-1efe-407c-9fb5-7272f7504f43) fails: two equal-weight text links plus a nav CTA = three competing choices. [Speakeasy](https://mobbin.com/sites/sections/36b6a87d-9ef7-41d3-80b6-d9a2f9a62e87) shows two identically-styled pills with no visual winner.

**Email capture inline in the hero.** [Airwallex](https://mobbin.com/screens/b432a462-e104-41f4-b602-876cb045d039) and [Kraken](https://mobbin.com/screens/5c032e77-cca1-456e-8180-41c589e2849d) both place a single email field + button in the first viewport — Kraken's placeholder is `satoshi@email.com`, a wink at its audience.

**Proof stacked into the first viewport.** [Kraken](https://mobbin.com/screens/5c032e77-cca1-456e-8180-41c589e2849d) lands hero, payment icons and a stat bar (600 crypto assets / 190+ countries / $550B+ volume) above the fold with a Forbes footnote. [Origin](https://mobbin.com/screens/340f550c-1db9-4e13-b8f7-f4975de2be16) puts two laurel-wreath awards directly beneath the CTA. [Grammarly](https://mobbin.com/screens/8edde093-4739-4a72-9e7d-569c45b888da) runs a two-row logo wall immediately below the fold.

**Named, attributed, role-specific quotes.** [Customer.io](https://mobbin.com/sites/sections/97fbd41c-4d64-4197-930b-f2a24fc65289) — "Jay LeBoeuf, Head of Business Development, Descript"; the quotes are long and specific, which reads as transcript, not copywriting. [Attio](https://mobbin.com/sites/sections/2ce67fb5-10f1-49fa-8ba6-e94d7bf516aa) attaches the customer's logo, photo, title, and a "Read the full story" link — verifiability. [Charma](https://mobbin.com/sites/sections/13c29f0a-f120-4176-a672-b0582600b7c9) headlines with the person: "Take it from manager of the year award winner Lindsey Boggs." [Toggl Track](https://mobbin.com/sites/sections/9de188c2-8684-4dfe-8034-705fa461fd8b) puts one quote directly above the signup form.

**Non-round, footnoted numbers.** [Ramp](https://mobbin.com/sites/sections/b3c99307-fd22-4b51-8d0b-11bc1d750391): "27.5M+ Hours eliminated" — the .5 signals measurement. [Revolut](https://mobbin.com/sites/sections/b5d03099-8332-47e5-bd72-ed80d0d9756b) uses a superscript footnote on "6%¹ saved by our customers". [Robot.com](https://mobbin.com/sites/sections/f85060f2-e490-4793-b11f-86d41a6a2cd0) scopes each number in time: "184K — In 8 days". [Customer.io](https://mobbin.com/sites/sections/97fbd41c-4d64-4197-930b-f2a24fc65289) uses "4,700+ companies", not "5,000+".

**Evidence with methodology disclosed.** The strongest thing in this section: [Hers](https://mobbin.com/screens/3c79e8c3-577e-407b-b5a5-21e8ee1ded28) shows before/after photos with month labels, first-name attribution, a "Real Hers Customer" verification chip, and a footnote stating the sample: "Based on self-reported data as of August 2024 of approximately 2,846 Hers customers after one year of treatment. Paid testimonials… Individual results may vary." [David](https://mobbin.com/sites/sections/16443a75-7287-480c-aca4-7a85e4fd4239) puts a dated third-party lab badge on the product page.

**Certification blocks that explain, not just display.** [Dovetail](https://mobbin.com/sites/sections/3ee471e1-fbad-429e-953e-57a309b5ebfd) gives each of GDPR / SOC 2 Type II / HIPAA a paragraph of what it covers. [Linear](https://mobbin.com/sites/sections/a9b9de76-cd1f-45c8-8a09-a65013b57589) writes a sentence per badge. [Mural](https://mobbin.com/sites/sections/67449691-5625-444d-a2c6-79247168bc3f) is unusually honest — it states FedRAMP is "In Process", not certified.

**Regulatory / eligibility proof for regulated categories.** [OKX](https://mobbin.com/screens/ff04b0af-45fb-46c4-8e97-1409f6bbd789): "Built in Singapore, for Singapore. Licensed by MAS" with "Sign up with Singpass" — jurisdiction as trust. [Headspace therapy](https://mobbin.com/screens/9ed811c7-c0a0-448e-b781-ccd93a1f7dcb) runs an *insurer* logo strip (Cigna, Optum, BlueCross) rather than customer logos.

**Objection-shaped FAQ, not marketing FAQ.** [Savor](https://mobbin.com/sites/sections/357638fb-dbbb-4067-8f40-1f142e921a38) — a company making fat from carbon — asks what a skeptic actually asks: "Is your fat real fat?", "Are your fats processed by the body the same way as conventional fats?" [DICE](https://mobbin.com/sites/sections/39efc6da-f1f5-4a4f-abd1-8f1009712c2e) answers in the customer's casual register ("is it really 22 plus?"). [Zendesk](https://mobbin.com/sites/sections/2e782044-f77a-4989-b191-1dead68e25ae) leads its FAQ with "What is Zendesk?" — the definition question, placed where a late-scrolling visitor still needs it.

**"What it is / what it's not" framing.** [Farm Minerals](https://mobbin.com/sites/sections/a29f1b27-d6f9-4170-b1db-776194255be5) runs two adjacent columns, the second reading "Not a veterinary medicinal product. Not a replacement for balanced premixes. No disease-prevention claims." Explicit scoping in a category where over-claiming is the norm.

**Named-competitor comparison with legible rows.** [Whereby vs Twilio](https://mobbin.com/sites/sections/22732bba-1e9b-4720-aba4-2919031c7b2e) uses prose in both columns, including honest parity rows. [folk vs Airtable](https://mobbin.com/sites/sections/da0522ea-4f29-42eb-a4c9-d1489358be78) shows two real screenshots captioned "folk lists relationships / Airtable lists generic records" — showing beats tabulating.

**Numbered steps in the user's verbs.** [Railway](https://mobbin.com/sites/sections/35a42526-d3b6-4e26-abf7-47667d6e7479): Apply / Build / Ship. [Escape Cafe](https://mobbin.com/sites/sections/68d54554-65f5-4fd2-a974-c30e7c9eaffc): three steps, each legible in one line. [Titan](https://mobbin.com/sites/sections/0d103afa-c85e-4568-a98a-0a1e7cbd5e8f) captions it "It's just three steps" and makes each an accordion so the page stays short.

**Audience self-selection early.** [Headspace](https://mobbin.com/sites/sections/5b44d3ff-891d-4add-9f5f-53b903bb1800) asks "What kind of headspace are you looking for?" with three outcome chips immediately under the hero — routing by outcome, not feature. [Dropbox](https://mobbin.com/sites/sections/74c66f16-858f-4a2e-88ee-aed2c5e18d01) splits "For Work / For personal use" into two full CTAs. [Amplemarket](https://mobbin.com/sites/sections/85de217d-baba-4edb-8805-3d2a76f2244b) offers five role tabs whose panels carry role-specific numbers.

**Risk-removal microcopy under the button.** [Lyssna](https://mobbin.com/sites/sections/71f2c7cc-5594-4515-b8e7-dc017a1813f8): "No credit card required" plus "Join over 320,000+ marketers…". [YNAB](https://mobbin.com/screens/d120d780-89e3-4745-9de0-bde307b714a2) goes further with a benefit-shaped reassurance: "The average YNABer saves $600 in their first month (and you seem above average, honestly)."

**Ending CTA that restates the promise as a question.** [Patreon](https://mobbin.com/sites/sections/6fc28a7a-fec9-4e60-8b9f-2b6268f23f85) "Ready to build your membership business?" placed after a creator testimonial. [Kajabi](https://mobbin.com/sites/sections/493b8bd1-015a-4b77-aeb8-0f7360fb7ef3) merges final CTA into the footer as an email field, so there is no dead end.

**Footer as objection-and-navigation surface.** [Dub](https://mobbin.com/sites/sections/bc31e448-f56a-4b11-939d-55d0b472ebec) carries a live "All systems operational" pill, a Legal column (Trust Center / DPA / Subprocessors), and a "Compare" column. [Resend](https://mobbin.com/sites/sections/09cf66cb-bfeb-40c2-b129-396f27deac8a) surfaces SOC 2 and GDPR plus a physical street address.

**Show the product doing the thing, at readable resolution.** [Antimetal](https://mobbin.com/sites/sections/38557cd6-0834-4d5a-b186-89ac968d8332) shows a code editor with a legible diff. [Craft](https://mobbin.com/sites/sections/81874e27-d807-48c6-8bf3-c2efd62b8c2f) shows a real document with a collaborator comment bubble. [Heidi](https://mobbin.com/screens/0a03615a-1698-4f74-a579-5aa51f7a0038) shows an actual clinical note.

**Pricing that shows the free tier honestly.** [Oku](https://mobbin.com/sites/sections/f66ba39e-9d4f-4336-955d-8721fef92d47) states the reason in plain words ("Help us pay the bills") and on yearly re-derives the price per week. [Netflix](https://mobbin.com/screens/b4c990dc-7b3b-4889-ac17-07872fcc7bc0) uses a uniform attribute grid including the unflattering row ("Ads: Less than you might think").

## 3.3 Checklist

- [ ] Can a stranger say what this product is from the first viewport alone?
- [ ] Is there exactly one visually dominant CTA above the fold?
- [ ] Do secondary CTAs use a lower-weight treatment rather than a second filled button?
- [ ] Does the nav CTA use the same verb as the hero CTA?
- [ ] Is the primary CTA repeated at the bottom?
- [ ] Is any proof (logos, stat, award, rating) visible before the first scroll?
- [ ] Are stat numbers non-round, or scoped by time/sample?
- [ ] Is at least one number footnoted with its source or method?
- [ ] Does every testimonial carry a full name, role, and company?
- [ ] Does at least one testimonial link to a longer, verifiable story?
- [ ] Are logos real customers, and does the label say which relationship?
- [ ] For regulated categories: is jurisdiction, licence, insurer, or lab named?
- [ ] Do compliance badges carry a sentence of scope, not just an icon?
- [ ] Does the page ever say what the product is *not*?
- [ ] Does the FAQ answer the skeptic's question and the definition question?
- [ ] Is the product shown doing real work at legible resolution, with real-looking data?
- [ ] Are "how it works" steps three or fewer, each one readable line?
- [ ] Can a visitor self-select their role or use case before reading feature copy?
- [ ] Is risk removed in microcopy directly under the button?
- [ ] Does the footer carry status, legal, security, and comparison links?

## 3.4 Anti-patterns

**Abstract headline with no anchor.** Mixpanel's "Unlock truth for everyone" and Superhuman's "AI that works everywhere you work" over an abstract cloud gradient — nothing in the viewport says what is being sold. Fine when the brand is known; fatal when it isn't.

**Two equal-weight buttons.** Speakeasy's identical "BOOK A DEMO" / "READ THE DOCS" pills; Riverside's twin "Explore →" links. When neither button wins, the visitor picks neither.

**The AI-slop landing look.** A recognisable cluster that appeared repeatedly: centred hero on a pastel mesh/aurora gradient, a hazy abstract blob or generative-cloud image standing in for a product screenshot, a two-line aspirational headline, a single pill button, and a fold containing zero specifics. Superhuman's blue-cloud hero and Mixpanel's lavender-mesh hero are the polished versions. **The tell: swap the logo for any other company's and the page still makes exactly as much sense.** Craft's gradient works only because a real, legible product screenshot sits directly beneath it.

**Round-number scale claims.** "50,000+ Customers · $10B+ Saved" (Ramp), "1 Million+ / 500K+ / $100K+" (Glide), "200K+ ambitious companies" (Mercury). **The tell: every figure ends in a plus sign and zeros.**

**The G2 badge collage.** Sana stacks a 4.8/5 rating, five G2 season badges, and four unattributed micro-quotes ("Easy to use and beautiful.", "Game-changing.") — no name, no company, no date on any. Vendor-purchasable credibility.

**Badge-grid-as-security-story.** Grammarly's nine-logo compliance grid and Miro's four-badge row assert certification without stating scope, coverage, or date.

**Self-scored competitor tables.** Jasper vs ChatGPT+: ten rows, ten wins, zero parity rows, no sources. A table where you never lose reads as marketing, not comparison.

**Stock-photo "About us" and generic step icons.** ClassPass's three numbered blue circles, Klook Protect's clip-art shields, Wave's cartoon shield. Decorative illustration substituting for a screenshot of the actual thing.

**Newsletter capture disguised as a hero.** Several "hero with signup form" results (Intercom "Keep up with our content", Kajabi "STAY IN THE LOOP", beehiiv Academy) are footer newsletter blocks, not product signup. Visually loud, low-intent — don't confuse the two patterns.

**Definition buried in the help centre.** Intercom's clearest "What is Intercom?" explanation lives in a support article, not on the marketing page. If the plainest sentence about your product is in the docs, the landing page has an identification problem.

*Coverage: 19 searches, ~130 products. Ran thin: dating (returned no dating products at all — drifted to travel/music/events) and insurance (returned logged-in in-app modules rather than pre-signup landing pages). Travel skewed to authenticated booking dashboards.*

---

# Section 4 — Core product (post-commitment)

## 4.1 Products surveyed

**A. Search / browse / filter**
*iOS:* Realtor.com · Opendoor · Zillow · Redfin · Navan · Trip.com · Vivino · Alta · Klarna · Pinterest · inDrive · Depop · Mercury · Clue · ElevenReader · Revolut Business · Thrive Market · Mimo · Swarm · Shazam · Calm Sleep · Vrbo · Nextdoor · Crate & Barrel · Google Drive · Slack · Obsidian · Careem · Booking.com · Vestiaire Collective · Public · Fidelity · Crypto.com
*Web:* Zillow · Airbnb · Mindtrip · Kiwi.com · Turo · TravelPerk · Wellfound · Peerlist · Remote · Dribbble · Upwork · Glassdoor · MasterClass · Uxcel · Skillshare · Unity · Codecademy · SuperHi · KAYAK · Tripadvisor · Expedia · Navan

**B. Match / recommendation results**
*iOS:* Yazio · SKIMS · Amazon Shopping · Warby Parker · Life Reset · Rocket Money · Noom · Visible · Superpower · Oura · Hers · Apple Health · Credit Karma · CRED · Zopa Bank · Grab Driver · Tinder · Co–Star · Moonly · Tolan · Deezer · Spotify
*Web:* Glassdoor · Codecademy · Contra · Braintrust · Wrangle · Mercor · Matter · Shop · Etsy · Uxcel · Curater

**C. Comparison**
*Web:* ChatGPT · Productboard · 7shifts · Relevance AI · Frame.io · Mintlify · Klook · Lyssna · Gusto · Turo · Ferndesk · NordVPN
*iOS:* Apple Store · lululemon · Best Buy · Chime · Natural AI · Expedia · Redfin · Credit Karma · Affirm · ANZ Plus · Zopa Bank · Ubank · Deliveroo · Klarna · Thrive Market · HBX · Under Armour · H&M

**D. Detail / profile pages**
*iOS:* Realtor.com · Opendoor · Redfin · Zillow · Vrbo · Shangri-La Circle · Polestar · Turo
*Web:* Zillow · Airbnb · TravelPerk · KAYAK · komoot · Care.com · Skillshare · Uxcel · Podia · Deel · MasterClass · Magnific · Contra · Wellfound · Braintrust · Remote · Deputy · Glassdoor · Headspace · Preply · Airtasker · Open · Coursera

~95 product/platform combinations.

## 4.2 Patterns

### A. Search / browse / filter

**Live result count on the commit button.** The apply button carries the number the current filter state will produce, so you never apply blind. [Vivino](https://mobbin.com/screens/04bfbabc-1c16-4594-998c-bbdfeb78e24a) reads "Show 13 wines" and updates to "Show 151 wines" as you clear; [Airbnb web](https://mobbin.com/screens/c5567d4d-50b8-4ef7-baf5-caa1dc31dee8) "Show 98 homes"; [Clue](https://mobbin.com/screens/c9c05513-98f5-46c4-9002-6536bae72a19) "Show 28 selected".

**Per-option counts and prices inside the filter.** Each checkbox carries what it costs you in inventory. [Vivino](https://mobbin.com/screens/ddc4fd72-44a8-4251-b2a1-3cabcd85e43c): "Cabernet Sauvignon (69) · Pinot Noir (23)". [TravelPerk](https://mobbin.com/screens/f76aefff-6925-4b4b-aeb1-b46fdcbea07c): "In-policy options only 592 / Breakfast included 312". [Navan iOS](https://mobbin.com/screens/ffde64ce-9a33-4e6e-88ff-b5920d133a85) prices each vehicle class inline. [KAYAK](https://mobbin.com/screens/9d701e52-f7f7-4515-928d-e04d9e1ed383) puts the cheapest fare next to each airline name.

**Filter count badge on the collapsed control.** [Zillow iOS](https://mobbin.com/screens/2aa6dc41-4d7e-4afd-a023-2847dedc0d99) "Filter ②"; [Turo web](https://mobbin.com/screens/e9f0a316-fde8-4a03-869d-9ac8ccbb1039) "All filters (4)" plus per-chip counts; [Kiwi.com](https://mobbin.com/screens/e24a848a-2e22-4f7c-80ca-cca186bbe9bd) states "2 filters active · Clear filters" as a sentence.

**Applied criteria as removable chips in the result region.** [Wellfound](https://mobbin.com/screens/394770cc-b82e-4294-bf26-ea65c8217a98): "$67k–$130k ✕  Figma ✕  Clear All"; [Expedia](https://mobbin.com/screens/3ec6d88a-6f98-4790-8905-740dfd025c3a): "Nonstop ✕ / Departure time – Morning ✕ / Clear all filters".

**Sort presented as named tradeoffs with their consequence.** [Kiwi.com](https://mobbin.com/screens/e24a848a-2e22-4f7c-80ca-cca186bbe9bd) and [Navan web](https://mobbin.com/screens/fb5e63f3-71cc-4f0e-a44e-b476b2bb6c69) render sort as tabs that each state their own result — "Recommended $817 · 13h 7m / Cheapest $717 · 15h 50m" — so the user sees the price of choosing speed.

**Explaining the ranking.** [Expedia](https://mobbin.com/screens/3ec6d88a-6f98-4790-8905-740dfd025c3a) and [Vrbo](https://mobbin.com/screens/de51d4a0-cfdb-4729-a57d-57540d44bed5): "How our sort order works ⓘ". [Tripadvisor](https://mobbin.com/screens/28ce0d0f-f9b5-494b-99f5-c9e8253c3050) discloses "Listing of Flights on Tripadvisor may not be exhaustive" above results.

**Map/list as one linked surface with price-labelled pins.** [Redfin](https://mobbin.com/screens/20316afb-d7e2-491d-9005-b5b1552cdf03) puts the price in every pin so the map itself is scannable data; [Zillow iOS](https://mobbin.com/screens/2aa6dc41-4d7e-4afd-a023-2847dedc0d99) adds draw-a-shape boundary search with "38 results" pinned to the sheet handle; [Realtor.com](https://mobbin.com/screens/08f8cf78-aaaa-4f57-9cd7-2850cf9225bd) offers an explicit "List" toggle rather than making the map inescapable.

**Result-set state persisted as a first-class object.** [Redfin](https://mobbin.com/screens/20316afb-d7e2-491d-9005-b5b1552cdf03) puts "Save search" directly under "236 of 236 results"; [Wellfound](https://mobbin.com/screens/394770cc-b82e-4294-bf26-ea65c8217a98) has named search tabs plus "Get job alerts for this search"; [Opendoor](https://mobbin.com/screens/73ff0041-9f0c-418f-a074-5f5fee01d5d3) lets you set cadence per alert type.

**Honest disclosure of what is being hidden.** [Wellfound](https://mobbin.com/screens/394770cc-b82e-4294-bf26-ea65c8217a98): "Hiding jobs that do not accept applications from your location: San Francisco. Update location." One line converting an invisible filter into a correctable one.

**No-results states that name the escape hatch.** [Mimo](https://mobbin.com/screens/8b058d5f-82d0-4773-b91e-cfc5101a42e1): "0 results / Reset all" as a live control. [Shazam](https://mobbin.com/screens/097457b8-6b9d-41a6-abbc-4a0236e976ae): "Looks like this artist has no concerts with your preferred options" + "View All Dates" — it names *which* constraint caused the emptiness.

**Result cards sized to the decision, not the photo.** [Zillow web](https://mobbin.com/screens/1899b9a4-752f-483c-9798-3b16ea1b074f): photo + one price line + one spec line + address, plus a differentiator badge burned into the image corner ("Basketball court", "Price cut: $150,900 (5/15)"). [Turo web](https://mobbin.com/screens/e9f0a316-fde8-4a03-869d-9ac8ccbb1039) uses a thumbnail-left row so ~6 cars fit a viewport, with "$53 total / Before taxes" — total, not nightly, removing a known comparison trap.

### B. Match / recommendation results

**Score + band + the scale it sits on.** Never a bare number. [Visible](https://mobbin.com/screens/653e065d-97c3-4498-9333-c3d554c5e858) shows "4.4" on a gauge labelled 0.0–6.0 with "Your functional capacity score is lower than a healthy person's score of 6.0" and a per-dimension breakdown. [Apple Health](https://mobbin.com/screens/8a8962d3-7aba-4541-9609-9da559feb039): "Anxiety Risk — Minimal ⓘ" on a track labelled "None (0–4) … Severe (15–21)" with "Your answers indicate…". [Hers](https://mobbin.com/screens/34722beb-5c0b-4c76-91e4-6195a60a65b0) plots "You are here" on a 0–21 axis.

**Factor lists naming direction and magnitude of each contribution.** [Credit Karma](https://mobbin.com/screens/f219b700-6dda-470f-acba-1f5be7c431c9) groups under "Things you're doing well — 6 factors", tags each HIGH / MEDIUM IMPACT with a plain-language claim and the underlying number. [Rocket Money](https://mobbin.com/screens/5efee66e-a17a-4d07-97c4-8c0c3469545f) gives each factor a letter grade plus impact weight. [CRED](https://mobbin.com/screens/b4c37acb-ae4d-4c71-b04f-623b94abd545) explains a *delta*: "34 points were deducted", then the two movements that caused it. [Zopa](https://mobbin.com/screens/f6c11c67-d2fd-476f-8162-130d96ea20dc) splits "Things to do" (actionable) from "What affects your score" (informational).

**Attributing the result to the user's own stated inputs, verbatim.** [Amazon](https://mobbin.com/screens/8a76bb41-a051-4605-af80-1474aaba217c): "Based on your concerns around **acne** and **redness**, these products are recommended for you" — the bolded tokens are the user's own answers. [Yazio](https://mobbin.com/screens/ac726564-f4c4-40fb-9f25-916c59cc2cec): one primary pick with "You might also like:" secondary and "Retake quiz" at the bottom. [SKIMS](https://mobbin.com/screens/48768558-88e3-4694-9379-921c3c79d7e5) replays the captured profile back before shopping — a receipt for the questionnaire.

**Two-column strengths vs gaps, in sentences.** [Codecademy](https://mobbin.com/screens/08a7d945-4b1c-413d-a2fe-0e15a4ea4efe) puts "Compatibility → Strengths" beside "Areas of improvement", then "Skills you know" beside "Skills to learn". **It never emits a percentage; the fit *is* the list.**

**Criteria checklist as the match.** [Wrangle](https://mobbin.com/screens/d2f0be23-842e-4aba-b883-7116bd352710) shows "✓100%" then expands into the named criteria that produced it, grouped "Very Important / Important", plus a cohort histogram ("128 excellent matches 90%+, 50 high 80–89%…") so a single 100% is contextualised against the pool.

**Narrative "why" per item rather than a number.** [Contra](https://mobbin.com/screens/d9bd0246-4075-470d-8982-dd0da402ee4c) labels a card "TOP PICK FOR YOU" and writes: "The role matches your Motion Designer expertise and remote work preference… **though the company's industry isn't specified**." Stating the unmatched dimension is what makes it credible.

**Uncertainty shown rather than hidden.** [Tinder](https://mobbin.com/screens/20347b16-ab5c-46d6-b45b-ac123d008e8a) renders two dimensions as filled bars and two as *locked* greyed bars with "Amelia needs to add more information to reveal your complete compatibility" — missing input is drawn, not defaulted. [Glassdoor](https://mobbin.com/screens/91cec616-ae26-4cd0-b945-f29bb6921c6e) shows confirmed qualifications ticked and asks inline "Do you also have these qualifications? ✓ / ✕" — **the score is negotiated with the user, and editable.**

**Diagnostic before prescription.** [Superpower](https://mobbin.com/screens/fb453f67-c4ef-4e78-ad25-f21cae8cee0e) heads the sheet "What's causing this?", flags "Out Of Range", then lists markers with each value beside its reference range. [Noom](https://mobbin.com/screens/a88ad13d-03d2-4e54-8212-7b08f6c2c9cd) defines the risk in prose first, then "View 5 factors" with provenance ("From your Face Scan on 6/22/2026").

**Comparison against a reference, not an absolute.** [Oura](https://mobbin.com/screens/99f3fb0b-7333-4837-a635-645bd9a86d36): "Your cardiovascular age is still aligned with your actual age… 2 years younger", plotted Below/Aligned/Above. [Grab Driver](https://mobbin.com/screens/5152c40b-c0ec-460f-9a4d-0ed9134099a2) sets "83 Your score" beside a greyed "85 Average score ⓘ" and one concrete cause.

### C. Comparison

**Attributes as rows, options as columns, aligned on a common vocabulary.** [Best Buy](https://mobbin.com/screens/8c8deebf-ad84-4b1b-b54f-bd665f92ab5d) zebra-stripes each attribute label as a full-width band with values beneath, plus ⓘ per attribute — legible at 375pt. [Expedia iOS](https://mobbin.com/screens/2feecb06-ae6a-4429-b43a-11ed7e7b6ecc) compares two hotels in parallel columns with ✓/✕ per amenity and per-column "View" and "Remove" — **the shortlist is editable from the comparison itself.**

**Comparison generated on the fly from the user's own criteria.** [ChatGPT](https://mobbin.com/screens/2efc61d6-cd10-45b0-9649-9f120fdd5697) builds a table whose rows are chosen for the question ("Nutty intensity", "Price per typical pack", "Best for") — including a qualitative final row assigning each column a use case rather than a winner.

**Holding variables constant so the real difference surfaces.** [Redfin Compare Rates](https://mobbin.com/screens/38496637-2e6c-47a8-bf5a-bd0bdad514e1) lists lenders at near-identical APR and identical monthly payment, forcing the eye onto the row that differs — fees ($2,803 vs $2,623 vs $2,272) — plus "As of 6/12" and each NMLS number.

**Non-alignable attributes as prose bullets in parallel columns.** [lululemon](https://mobbin.com/screens/25cd957d-2436-4b96-93ba-774834de2a81) compares two jackets under shared headings "How it fits / How it feels / Features" with bullets that differ in length and content — **a matrix would have forced false equivalence.** [Apple Store](https://mobbin.com/screens/6b4d0ea3-6479-4af2-9969-b44b8bf15eb5) renders *absence* as a plain em-dash.

**Highlighting the recommended column rather than leaving the reader to score.** [Relevance AI](https://mobbin.com/screens/e0501a17-5d16-464a-bc12-16e4f58a4b78) tags its column "Best Choice" and uses ✓/✕ (not ✓/blank) so a gap is a stated no. [7shifts](https://mobbin.com/screens/0a9b21b2-170c-4eb4-b758-ead8060acd38) marks "The Works (current plan)" — anchoring on where you already are. [Chime](https://mobbin.com/screens/fe9115bf-07ce-45d0-b133-de508bf50f63) replaces ticks with the differentiating *value* where one exists ("0.75% vs 3.00% APY") — the tick becomes a number exactly where it matters.

**Sectioned, collapsible tables for long attribute sets.** [Productboard](https://mobbin.com/screens/d5d0d9f5-3629-447b-9662-28bf9eef771e), [Frame.io](https://mobbin.com/screens/0f9f26ab-f037-499b-8208-8b3ac4bd44c0), [Mintlify](https://mobbin.com/screens/d3166501-51b5-4cf9-afa1-cbf677676b50) group rows under category headers with a sticky column header. [Klook](https://mobbin.com/screens/f148c8b3-727b-4af0-b9e5-1050d674a40b) numbers every benefit row so a support conversation can reference row 4.

**Choice framed by its risk, not only its price.** [Turo](https://mobbin.com/screens/8da5880c-2c31-4371-9669-f882adbae6e9) writes exposure into each option ("Decline protection — **High risk** — You're liable for any damage… your personal insurance and credit card may not cover this trip") and outlines the risky selection in red. [Affirm](https://mobbin.com/screens/a2c61ce7-37d0-4060-81ef-cbff293ad6c6) labels the tradeoff on the option itself and prints total interest per plan.

**Shortlists carrying decision-relevant state, not just a picture.** [Klarna](https://mobbin.com/screens/fde08e14-48e7-4d49-bc0b-d2437abf905f) shows "In 3 stores" per saved item; [HBX](https://mobbin.com/screens/87ec532c-d83f-4cda-a215-1c4828a1b962) marks a saved shirt "SOLD OUT"; [Under Armour](https://mobbin.com/screens/bf990634-c31a-4712-bce9-160f4c9d2a3c) surfaces "Size: Not Selected" as an unresolved blocker.

### D. Detail / profile pages

**Above the fold = identity, price, and the 3–4 facts that disqualify.** [Zillow iOS](https://mobbin.com/screens/87065d64-c6c9-4d08-aa5b-0f549db8f669): price cut badge → price → "5 beds · 2 baths · 1,652 sqft" → address → "Est. US$10,794/mo ⓘ" → a 2×3 tile grid of facts (Zestimate, property type, $/sqft, year built, HOA, lot size) → "What's special" as chips. **Dense facts as an iconed tile grid beats a definition list at mobile width.**

**Sticky dual action bar: low-commitment left, commitment right.** [Zillow iOS](https://mobbin.com/screens/87065d64-c6c9-4d08-aa5b-0f549db8f669) pins "Contact" beside "Request a tour — **as early as tomorrow at 11:00 am**"; [Redfin](https://mobbin.com/screens/5575f149-8c82-40f1-bb2c-cbed19a96a34) pins "Next available: Tomorrow at 11 AM". **Putting the next available slot inside the button converts an abstract CTA into a concrete one.**

**Photo gallery pre-sorted by type, so browsing is navigation.** [Realtor.com](https://mobbin.com/screens/4eeaa2b1-f439-4846-97cf-36bdfe84f46a) opens with labelled tiles "Exterior (6) / Bedroom (5) / Living Room (4)" instead of a raw carousel, and states listing status as a coloured dot *above* the price. [Airbnb](https://mobbin.com/screens/908dec75-1f32-4b3a-b0e1-bee0953b91b7) and [KAYAK](https://mobbin.com/screens/c231abba-eaaa-4b22-92f1-975a73d241f3) use the 1-large + 4-small mosaic.

**Section nav bar on long detail pages.** [Zillow web](https://mobbin.com/screens/5ed99d55-8467-4fdd-9d79-b9cb371b5405) runs "Overview | Facts & features | Market value | Payment calculator | Neighborhood" under a persistent header — the page is a document, so it gets a table of contents.

**Decision support embedded in the detail page.** [Zillow web](https://mobbin.com/screens/5ed99d55-8467-4fdd-9d79-b9cb371b5405) "Offer Insights": pick offer strength → "Less than $1.34M — **Under 50% chance of a winning offer**", beside market context ("Balanced market · 3 days on market · fewer days than the median in 78218") and affordability ("Within BuyAbility™ · Your max: $3,228,976 · Edit"). **The strongest single screen in the survey: it turns a listing page into a simulator.**

**Right-rail booking card that stays while the left column is read.** [Airbnb](https://mobbin.com/screens/908dec75-1f32-4b3a-b0e1-bee0953b91b7) ("Rare find! This place is usually booked"); [Preply](https://mobbin.com/screens/312c3174-c101-4528-96d2-fedff36de2fa) ("★5 · 7135 lessons · $41 50-min lesson" + "2 new contacts and 5 lesson bookings in the last 48 hours · Usually responds in 4 hrs").

**Structured facts before prose on job pages.** [Wellfound](https://mobbin.com/screens/cf70b64e-5936-4d48-9ae5-31507b0b01c6) leads with a labelled fact column (Visa Sponsorship: Not Available, Relocation: Not Allowed, Skills) *before* "About the job" — **the disqualifiers come first.** It also coaches inline: "**Improve your odds** — It seems you're outside the years of experience preferred for this role." [Braintrust](https://mobbin.com/screens/4af55186-6ec1-4fbb-8d34-b8b21577ddc2) uses four fact tiles including Experience as a filled-arrow gauge. [Remote](https://mobbin.com/screens/94a9646f-0b81-4a30-b166-86edbfd3dc2c) adds urgency as data: "Applications ends Nov 21, 2025 — **8 DAYS LEFT**".

**Course pages that expose the whole structure before purchase.** [Magnific](https://mobbin.com/screens/0564e247-f8a3-47c2-a992-8376b0a5b109) lists every module and lesson with per-lesson runtimes. [Uxcel](https://mobbin.com/screens/a76d44d0-b217-433a-82c5-b2da8cf702f6) puts the metadata strip in the H1 zone — "Intermediate · 7h · 56541 learners · 4.8 (9.4k) · **Updated Apr 11, 2026**" — freshness date included.

**Practitioner profiles that answer eligibility before charm.** [Headspace](https://mobbin.com/screens/6d26d0ea-2cf7-4bf0-b1cf-51e45442bd08) puts "✓ In-network", credential, specialties and language as ticked rows with a progress spine at the top ("Check In • Verify Insurance • Schedule appointment") — **insurance status resolved before the reader invests in the bio.**

## 4.3 Checklist

**A. Search / filter**
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

**B. Match / recommendation**
- [ ] Is a score always accompanied by its scale and a named band?
- [ ] Does the screen say *why* — in the user's own stated terms, quoted back?
- [ ] Are contributing factors listed with direction and magnitude?
- [ ] Is missing input rendered as missing, not silently defaulted?
- [ ] Can the user correct the inputs behind the result (edit, retake)?
- [ ] Is a single result contextualised against the pool or a reference?
- [ ] Is at least one non-fitting dimension acknowledged?
- [ ] Does it read as a reflection of preferences rather than a verdict on the person?
- [ ] Is provenance and date of the underlying data stated?

**C. Comparison**
- [ ] Are attributes rows and options columns, with a shared vocabulary per row?
- [ ] Is absence drawn explicitly (✕ or em-dash), not left blank?
- [ ] Are constant attributes kept visible so the differing one stands out?
- [ ] Are non-alignable attributes given parallel prose instead of a forced matrix?
- [ ] Is a recommended or current column marked?
- [ ] For long tables: sectioned, collapsible, sticky headers?
- [ ] Is the shortlist editable from inside the comparison?
- [ ] Are consequences and risk stated per option, not just price?
- [ ] Does the shortlist carry state that has changed since saving?

**D. Detail pages**
- [ ] Above the fold: identity, price, and the 3–4 disqualifying facts?
- [ ] Dense facts as an iconed tile grid rather than a paragraph?
- [ ] Sticky action bar with a low-commitment action beside the committing one?
- [ ] Does the CTA name the concrete next slot/date?
- [ ] Is the gallery organised (labelled, counted) rather than an undifferentiated carousel?
- [ ] Section nav for long pages?
- [ ] Any decision support on the page (affordability, odds, market context, fit)?
- [ ] Structured eligibility facts before narrative prose?
- [ ] Freshness / status / provenance stated?

## 4.4 Anti-patterns

- **The blind Apply button.** A filter sheet whose CTA says only "Apply" or "Show results" with no count — [Depop](https://mobbin.com/screens/f3e55651-6e41-4247-a669-8f19b67a9a8c), [Pinterest](https://mobbin.com/screens/90d6d2d1-d874-4040-a22c-58a66997e0bd), [Navan iOS](https://mobbin.com/screens/ffde64ce-9a33-4e6e-88ff-b5920d133a85), [Dribbble](https://mobbin.com/screens/1826e588-59ff-4153-b778-6b2d9f2b614a). The user commits, waits, and discovers zero.
- **The unbounded checkbox sidebar.** A left rail of 30+ unweighted checkboxes with no counts — Dribbble, [Peerlist](https://mobbin.com/screens/3bea82af-a5ed-4fc2-84da-dd3d64ec53ac), [Codecademy](https://mobbin.com/screens/80ece4a1-4f63-4fce-97e1-6ad32502d657). Looks thorough, provides no guidance.
- **Category chips as the whole filter model.** A row of pills with no applied-state feedback, no count, no clear-all — [Unity](https://mobbin.com/screens/33327be3-56c6-4e70-9d0d-bd6c0f3f0592), [Uxcel](https://mobbin.com/screens/638b03a0-136a-4a4e-9d86-b1752a09a388).
- **The unexplained percentage.** A large "92%" with a mood sentence and no basis, no dimensions, no correction path — [Tolan](https://mobbin.com/screens/5c090ad4-b89d-4f66-beaf-c38217b1a4a4), [Deezer](https://mobbin.com/screens/9ae16e4b-afdb-477f-b48a-5958e520c1be), [Spotify Blend](https://mobbin.com/screens/de007fad-f122-4fc1-9f66-23e3d824c185), [Moonly](https://mobbin.com/screens/3789b969-4fd4-460f-a224-0dd5bd621368). **Fine as entertainment; fatal on a consequential decision.**
- **Unlabelled progress bars as evidence.** Rows of coloured bars ("Romance & Sex", "Karmic Destiny") with no axis, no units, no way to know what longer means — Moonly, Tinder, [Co–Star](https://mobbin.com/screens/800af2e7-2aa6-4ca1-9669-ef414d895a95).
- **Recommendations with no attribution.** A "For You" grid that never says on what basis — [Matter](https://mobbin.com/screens/ab0fb6e3-ecea-41d9-ad99-dd5b5adad128), [Curater](https://mobbin.com/screens/570811a7-d458-4a3b-ae87-ecb4cdeb5fac), [Uxcel](https://mobbin.com/screens/2fcbecda-48c5-4fe3-bb32-e305dab73a3c) ("Here's what we recommend" — of what, from what?).
- **The quiz that produces a shopping list.** A questionnaire whose only output is a product grid identical to the catalogue — [Warby Parker](https://mobbin.com/screens/76f48f23-f647-4d14-838e-6d60b7199428) results say "Based on your answers, here are our recommended frames" with **no per-frame reason.**
- **Tick-grid pricing tables.** Columns of undifferentiated ✓ with blanks for absence and no highlighted recommendation — [Mintlify](https://mobbin.com/screens/d3166501-51b5-4cf9-afa1-cbf677676b50), [Frame.io](https://mobbin.com/screens/0f9f26ab-f037-499b-8208-8b3ac4bd44c0). The reader does the scoring the product refused to do.
- **The photo-first result card.** Large image, name, price, nothing that distinguishes this from the next — [Skillshare](https://mobbin.com/screens/d7fd93cd-32ec-425b-abb9-87bbe960c23b), [MasterClass](https://mobbin.com/screens/3d11edf2-12a2-4fc5-91e4-c6064bf1b92a).
- **Shortlist as a wall of hearts.** Photo + price only, none of the state that changed since saving — H&M, [Deliveroo](https://mobbin.com/screens/9850242f-1f2b-4a79-8ac4-a39031ef8450).
- **Sort as a bare dropdown.** "Sort by ▾" with no default shown and no consequence — [Crate & Barrel](https://mobbin.com/screens/6bf4f82b-2f33-4d1a-a5da-c720e484b5fa).
- **The wall-of-text job post.** Employment facts buried in paragraphs — [Deputy](https://mobbin.com/screens/e8bc2875-5765-4470-be81-2266cd3cb9ba): a 5-row fact table before 400 words of prose.
- **Generic no-results copy.** "Try less specific search terms" with no reset control — [Thrive Market](https://mobbin.com/screens/3e1f6d8b-6214-4eaf-9610-74802b1d606c), [Calm Sleep](https://mobbin.com/screens/9fce3b79-09ec-433d-bb49-a26a841191f1).

*Coverage: 20 searches (10 iOS, 10 web), ~95 products. Ran genuinely dry on two requested topics — see closing coverage note.*

---

# Cross-section observations

Things that appeared in more than one category and are worth stating once.

**1. "Never let the user commit blind" is one mechanism wearing four costumes.** The live result count on a filter's apply button (Vivino "Show 13 wines"), the budgeted multi-select count in onboarding (Bumble "1/5 selected"), the dual-unit price on a paywall card, and the "due today vs recurring" split at checkout are all the same move: **put the consequence of the action on the control that performs it.** If a skill encodes one principle from this survey, this is the highest-yield candidate.

**2. The dated three-beat timeline is shared furniture between onboarding and paywalls.** Brilliant, Headspace, Mimo, Mesh, Nibble and foodpanda all use the same vertical rail — Today → reminder → charge. It appears as an onboarding step *and* as the paywall itself, and Headspace ships it identically on iOS and web. Treat it as one component with two placements, not two patterns.

**3. Quoting the user's own words back is the strongest personalisation signal, and it appears in all three of onboarding, match results, and paywalls.** Amazon bolds the user's own answers ("your concerns around **acne** and **redness**"); Headspace's "Why this recommendation" strip lists the inputs that produced it; Runna's paywall opens "**Alex**, get started"; SKIMS replays the captured profile as a receipt. The generic version — a "For You" grid with no stated basis — is flagged as an anti-pattern in Section 4 and as "reveal that is just a receipt" in Section 2. **Attribution is what separates personalisation from decoration.**

**4. Absence must be drawn, not omitted — and the choice of glyph is an ethical one.** Comparison tables (Apple Store's em-dash, Relevance AI's ✕ instead of blank), paywall free-vs-paid columns (Deepstash's em-dash "absence without shaming", Substack's strikethrough), and match results (Tinder's *locked greyed bars* for missing input) all face the same problem. Blank reads as an oversight; ✕ reads as a judgment; em-dash reads as a fact. Pick deliberately.

**5. Non-round, footnoted, time-scoped numbers are the shared credibility mechanism of landing pages and paywalls.** Ramp's "27.5M+", Robot.com's "184K — In 8 days", Revolut's superscript footnote, Hers' disclosed sample of "approximately 2,846 customers", Orbit's "save $300 a year on average". The anti-pattern is identical in both sections: **every figure ending in a plus sign and zeros.**

**6. Named attribution beats volume, everywhere.** Testimonials work when they carry a handle, role, company, or link to a verifiable story — in paywalls (Fixtured's "swilks17 — United States"), landing pages (Customer.io's full titles, Attio's "Read the full story"), and mid-onboarding (Centr's step 3-of-8 testimonial page). The failure mode is also identical: Sana's four unattributed micro-quotes, and any 5-star carousel without names.

**7. The countdown timer is the single most-flagged anti-pattern across the whole survey**, appearing in paywalls (QUITTR, FocusFlight, Cal AI, Placify, Tinder, Peanut) *and* onboarding (Noom's "PERSONALIZED PLAN RESERVED — EXPIRES IN 14:59"). It is also the clearest case of a product undermining its own good work: **Noom appears in this survey as both an exemplar and an anti-pattern, in two different sections.** Worth encoding as a rule — one manipulative element contaminates an otherwise honest screen.

**8. Symmetrical decline paths appear in paywalls and permission requests alike.** Pillow's full-width "No, thanks", Cleo AI's equally-sized "Not right now", KOHO's named refusal, Agoda's soft "No, thanks", Duolingo's "NOT NOW". The test is the same in both: **is the "no" the same width and legibility as the "yes", and does it name what is being refused?**

**9. Progress notation should match the shape of the thing, and this generalises past onboarding.** Segmented bars for phased flows, "3 of 8" for short finite ones, named-phase rails for chaptered ones — and the same logic drives Zillow's section-nav on a long detail page and the sectioned collapsible comparison tables at Productboard and 7shifts. **Long content earns a table of contents; short content earns a fraction.**

**10. "Swap the logo and nothing reads wrong" is the generic-detector across every section.** It was independently arrived at for paywalls (the undifferentiated 3-card grid) and landing pages (the AI-slop gradient hero). It is the most useful single heuristic in this document for flagging templated work.

**11. Explaining the mechanism beats asserting the outcome.** Stripe shows tier boundaries beneath the pricing slider rather than only the result; Expedia and Vrbo ship "How our sort order works"; Wellfound discloses the location filter it applied silently; Dovetail and Linear write a sentence per compliance badge instead of showing a grid. In every case the mechanism disclosure *is* the credibility move.

---

# Coverage note

**Totals:** 73 searches (iOS `search_screens`, web `search_screens`, `search_flows`, `search_sections`). ~412 product/platform entries surveyed across the four sections; deduplicating overlaps (Headspace, Noom, Duolingo, Brilliant, Zillow, Turo and others appear in more than one section), roughly **380–400 distinct products**. Industry spread covers fintech/banking/lending, health and mental health, fitness, travel, ecommerce and grocery, productivity, education and courses, dating, insurance, media and streaming, developer tools, consumer social, B2B SaaS, real estate, jobs and mobility.

**Where Mobbin ran dry — stated rather than silently under-covered:**

- **University / school search and college-match result lists (Section 4).** No such products are indexed. Education queries return course marketplaces (Coursera, Skillshare, Codecademy, Uxcel) and the one Coursera result was a degree *marketing* page, not a match tool. **This is the gap most relevant to a school-choice product** — the closest available analogues are real-estate search (Zillow, Redfin, Realtor.com) and job matching (Wellfound, Braintrust, Wrangle, Contra), which is why those carry disproportionate weight in Section 4.
- **Consumer insurance comparison (Section 4) and insurance landing pages (Section 3).** No dedicated insurer or aggregator products surfaced. Closest analogues used: Klook travel-insurance tiers, Turo protection tiers, Gusto business-insurance cards.
- **Insurance quote questionnaires on web (Section 2).** Returned purchase pages rather than underwriting flows.
- **Dating landing pages (Section 3).** Returned no dating products at all — results drifted to travel, music and events. Dating *app* onboarding (Section 2) was well covered.
- **Ecommerce product-recommendation quizzes (Section 2).** No classic skincare or apparel quiz surfaced; Mindtrip and Shop's AI search came back instead.
- **Money-back guarantee badges on web (Section 1).** Strong pricing grids returned, but only Teak and HoneyBook surfaced an actual guarantee seal — that pattern rests on a narrower evidence base than the others.
- **Travel landing pages (Section 3)** skewed toward authenticated booking dashboards rather than pre-signup marketing.

**Method caveat:** all screens were examined as images. Where copy is quoted it was legible in the screenshot. Mobbin screens are point-in-time captures and may not reflect the product's current state.
