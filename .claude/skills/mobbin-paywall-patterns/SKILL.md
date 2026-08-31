---
name: mobbin-paywall-patterns
description: Real-shipped-product patterns for paywall and pricing screens, sourced from a 73-search Mobbin survey (~110 products, iOS + web). Use when designing or reviewing a paywall, pricing table, trial-timeline, or checkout screen — most useful for Claude Design. Not ŠkolaMatch-specific; broad reference material.
---

# Paywall & pricing patterns (sourced via Mobbin)

Source survey: `docs/sources/mobbin_pattern_survey.md` §1 (2026-08-25, 63 iOS + 46
web products, 16 searches). Full products-surveyed list and per-pattern citation
links live there — this file has the distilled, actionable version.

## Patterns that separate excellent from generic

- **Dual-unit price display.** Show the small psychological unit large, the actual
  charge small underneath, same card ("$0.20/day ($6 billed monthly)"). Honest when
  both are shown; a trick when only the small one is. *Buddy, Acorns, Function, Runna.*
- **Trial timeline as a 3-beat vertical rail.** Today (unlock) → Day N−2 (reminder)
  → Day N (charge), with real dates. Converts an abstract trial into a calendar
  commitment. *Mimo, Mesh, Nibble, Vocabulary (uses real dates + strikethrough for
  progress), foodpanda.*
- **Trial as an explicit toggle**, not a hidden default — visibly rewrites the CTA.
  *Liven, Paired, Sunlitt.* (Toggle-off-by-default is the anti-pattern — see below.)
- **Recommendation signalled by 2+ redundant cues** (badge + border + fill, not
  badge alone) so it survives greyscale/small screens. *Duolingo, Dub, ElevenLabs,
  Programa.*
- **Two-axis card headers** — tier name + one-line "who is this for" + billing
  cycle, so the reader knows relevance before reading price. *OpenTable, Rox.*
- **Paid column as a raised object** over the free column in a comparison table —
  premium reads as the product, free as background. *Brilliant, Fixtured.* Use
  em-dash for absence, not ✕ ("absence without shaming" — *Deepstash*).
- **Quantified, product-specific value claims** as the headline/anchor, not
  adjectives. "Customers save $300/year on average" beats a crossed-out price.
  *Orbit, Function, Hinge ("twice as many dates").*
- **Named, attributed testimonial adjacent to price** — handle + source, not a
  vague 5-star row. *Fixtured, TIDE (App Store Editor's Choice), The Outsiders.*
- **One-time purchase framed as escape from subscriptions**, with trial/urgency
  machinery dropped entirely, not reused from the subscription paywall. *(Not
  Boring) Timer, timespent (explicit "no dark patterns" pledge), Orbit.*
- **Cancellation reassurance as fixed furniture** in the same slot every screen.
  *Duolingo ("Cancel anytime in the App Store"), Xero (literal cancel-instructions
  link inside the payment form).*
- **Sticky order summary with two separate labelled rows**: what's due today vs
  what recurs, with the recurring date named. *Xero, Codecademy, Laravel Cloud
  (names the open-ended "+ usage" part rather than burying it).*
- **Free tier as a real $0 column** in the grid, not a link — makes paid tiers
  legible as increments. *Dub, Zapier, Substack.*
- **"Everything in X, plus:" cumulative list stems** so later columns don't repeat
  shared rows. *Dub, Typeform, Oku.*
- **Enterprise as a different shape, not a fourth price** — swap the number for a
  panel/illustration so the ladder doesn't end in an unanswerable figure. *Linear,
  Typeform, Teachable (pairs it with "Take the quiz" for the undecided).*
- **Live price calculators** showing the pricing logic, not just the result —
  sliders with visible tier boundaries. *Stripe, Kit.*
- **3–4 non-monetary reassurance chips** under the CTA instead of a legal
  paragraph. *Superpower, Teak, Vinted ("🔒 secure encrypted payment").*
- **Fee transparency as a selling point** — show the breakdown including the
  zeros. *Shipt ("$0 in service fees" + plain-language authorisation note),
  Instacart, Gumroad ("10% flat" as the entire pricing page).*
- **Symmetrical, non-trapping decline paths** — "No, thanks" as a real button the
  same size as accept, naming what's refused. *Pillow, Cleo AI, KOHO ("I don't
  want a free trial").*
- **Retention offers stating the exact new number and a date**, not a duration.
  *Headspace (states what continues even if you cancel — least coercive version
  seen), Oportun ("You won't pay anything until Oct 3, 2026").*
- **Progressive paywalls that show value before price** — a real limit
  experienced, then priced. *TIDAL (30-second preview mid-playback), Skillshare
  (padlocks on lessons 2–4, lesson 1 open).*
- **Personalised-plan paywalls that reference the work already done** — name the
  user, cite their inputs, show the generated artefact with a padlock overlay.
  *Runna, Centr.* (Noom does this well, then undermines it — see anti-patterns.)

## Checklist

**Price legibility**
- [ ] Every card shows both the headline unit and the actual charge, same card?
- [ ] Billing period on the card, not only fine print?
- [ ] If a price is crossed out, is the original genuinely charged elsewhere?
- [ ] Free tier a real $0 column, not a link?

**Choice architecture**
- [ ] Recommended plan marked by 2+ cues (badge + border/fill/scale)?
- [ ] Each tier carries a one-line "who is this for"?
- [ ] Later columns say "Everything in X, plus:" instead of repeating rows?
- [ ] 3–4 tiers max on mobile, or one plan with a duration selector?
- [ ] Top tier drops the number where a number would be meaningless?

**Trial and commitment**
- [ ] 3-beat timeline (today → reminder → charge) with a real date on the charge?
- [ ] Trial is an explicit, visible opt-in that rewrites the CTA?
- [ ] Reminder-before-charge stated as a promise, not implied?
- [ ] CTA names what happens ("Start my 14-day free trial"), not just "Continue"?

**Reassurance**
- [ ] Fixed line under the CTA covering cancellation, same slot every paywall?
- [ ] Trust facts are 3–4 scannable chips, not a legal paragraph?
- [ ] At checkout, "due today" and "recurring after" are separate labelled rows?
- [ ] All fees, including zeros, itemised?

**Proof**
- [ ] Testimonials attributed to a named handle with a source?
- [ ] Headline claim a measured number specific to this product?
- [ ] Would any social-proof number survive "how do you know?"

**Exit**
- [ ] Decline control same width/legibility as accept?
- [ ] Decline names what's being refused?
- [ ] Close affordance reachable within the first screenful?

**One-time purchases**
- [ ] "Pay once" stated in words, not inferred from absence of "/mo"?
- [ ] Trial/urgency machinery removed, not reused from the subscription paywall?

## Anti-patterns

- **The manufactured countdown.** A timer with no external referent — "80% off,
  expires in 4:59." *QUITTR, FocusFlight (admits in a footnote the discount math is
  fake), Cal AI, Tinder ("23:59:59" is just "today").*
- **Stacked pressure.** Countdown + strikethrough price + savings badges + modal +
  dense auto-renewal paragraph, simultaneously. *Peanut.* Each device alone is
  defensible; together they're a wall.
- **Save-% on every card.** When all durations carry a savings badge, the badge
  stops carrying information. *Hinge, Lex.*
- **Toggle-off-by-default trial.** Same "Enable Free Trial" affordance as the
  honest version, shipped disabled, producing an immediate charge. *Lovi.*
- **Undermining your own good screen.** A genuinely clear plan screen, then a
  "Personalized plan saved: 14:43" countdown implying the personalisation expires.
  *Noom.*
- **The undifferentiated 3-card grid.** Equal white cards, one badge, identical
  checkmark lists. Tell: swap the logos and nothing reads wrong. *Zendesk, Clay.*
- **Feature lists as spec dumps.** 11+ features, no price anywhere until Subscribe.
  Length substituting for value. *Badoo, Formula 1.*
- **Price hidden behind a second screen.** Locked benefits list, bare "Subscribe,"
  cost revealed only after tapping. *happn.*

## Payer-may-be-a-minor flags

Relevant given a payer could be a teen or someone paying for a dependent:
- Countdown timers fall hardest on young/stressed buyers.
- Weekly billing headlined without ever showing the annualised total (no screen
  surveyed did this honestly).
- No screen surveyed gates on payer age or asks "is the cardholder the user?"
- Family/gift plans mostly address copy to one "you" with no third-party-payer
  path — *Substack (Individual/Group/Gift tabs), MasterClass, Instacart ("Make it
  a gift")* are the rare counter-examples.
- Best practice worth copying directly: Headspace's cancel-and-still-keep-access-
  until-date framing, Xero's in-form cancel instructions, KOHO's named refusal.

## Cross-cutting (see full list in the survey's "Cross-section observations")

- **Never let the user commit blind** — put the consequence of an action on the
  control that performs it (dual-unit price, due-today-vs-recurring split).
- **The dated 3-beat timeline is shared with onboarding** — same component, two
  placements.
- **One manipulative element contaminates an otherwise honest screen** — a single
  countdown or fake-discount undoes an otherwise well-built paywall.
- **Symmetrical decline paths** apply to both paywalls and permission prompts —
  same test: same width, names what's refused.
