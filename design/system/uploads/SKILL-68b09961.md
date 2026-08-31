---
name: mobbin-landing-page-patterns
description: Real-shipped-product patterns for pre-signup marketing/landing pages, sourced from a 73-search Mobbin survey (~130 products, all web). Use when designing or reviewing a hero, landing page, or pre-signup marketing surface — most useful for Claude Design. Not ŠkolaMatch-specific; broad reference material.
---

# Landing-page patterns (sourced via Mobbin)

Source survey: `docs/sources/mobbin_pattern_survey.md` §3 (2026-08-25, ~130 web
products, 19 searches). Full products-surveyed list and per-pattern citation links
live there — this file has the distilled, actionable version.

## Patterns that separate excellent from generic

- **Category line above the headline.** A flat, plain-words eyebrow naming the
  product category, so a poetic headline doesn't have to also identify what the
  thing is. *The Leap ("Bite-sized learning"), Headspace ("therapy by ●
  headspace"), Heidi.* Contrast: Mixpanel's headline identifies nothing.
- **Subhead as the literal what-it-is sentence.** Headline sells, subhead defines.
  *Airwallex, Record Club (starts with the product name), Heidi.*
- **Outcome headline, not feature headline** — names the incumbent's pain
  directly. *Maze ("All the answers, none of the headaches"), Speakeasy
  ("Experience Terraform without the hassle").*
- **One primary CTA, secondaries visually demoted.** Nav CTA repeats the same
  verb and colour as the hero CTA. *Craft, Maze ("Start now" filled vs "Request a
  demo" outlined).* Failure: two equal-weight buttons = the visitor picks neither
  (*Riverside, Speakeasy*).
- **Email capture inline in the hero** for high-intent categories. *Airwallex,
  Kraken (placeholder `satoshi@email.com` — winks at its audience).*
- **Proof stacked into the first viewport** — logos, a stat bar, an award, all
  above the fold. *Kraken, Origin (laurel-wreath awards under the CTA), Grammarly
  (two-row logo wall right below the fold).*
- **Named, attributed, role-specific quotes**, long enough to read as transcript
  not copywriting. *Customer.io ("Jay LeBoeuf, Head of Business Development,
  Descript"), Attio (logo + photo + title + "Read the full story" link), Charma
  (headlines with the person's name and award).*
- **Non-round, footnoted numbers.** "27.5M+ Hours eliminated" (the .5 signals
  measurement), a superscript footnote on a stat, a number scoped in time ("184K
  — In 8 days"). *Ramp, Revolut, Robot.com, Customer.io ("4,700+", not "5,000+").*
- **Evidence with methodology disclosed.** The strongest device in this section:
  before/after with dated labels, named attribution, and a footnote stating the
  actual sample size and caveats. *Hers.*
- **Certification blocks that explain, not just display** — a sentence per
  badge, and honesty about in-process certs. *Dovetail, Linear, Mural (states
  FedRAMP is "In Process," not certified).*
- **Regulatory/eligibility proof for regulated categories** — jurisdiction,
  licence, or insurer named as trust, not a generic badge. *OKX ("Licensed by
  MAS"), Headspace therapy (runs an insurer logo strip instead of customer logos).*
- **Objection-shaped FAQ**, answering what a skeptic actually asks, in the
  visitor's register — not a marketing FAQ. *Savor, DICE, Zendesk (leads with
  "What is Zendesk?" for late-scrolling visitors who still need the definition).*
- **"What it is / what it's not" explicit scoping** in a category prone to
  over-claiming. *Farm Minerals.*
- **Named-competitor comparison with legible, honest rows** including parity, or
  real screenshots captioned with the actual difference instead of a scored
  table. *Whereby vs Twilio, folk vs Airtable.*
- **Numbered steps in the user's own verbs**, kept short. *Railway (Apply / Build
  / Ship), Titan ("It's just three steps," accordion to keep the page short).*
- **Audience self-selection early** — route by outcome or role right under the
  hero, not by feature. *Headspace ("What kind of headspace are you looking
  for?"), Dropbox (For Work / For personal use), Amplemarket (five role tabs).*
- **Risk-removal microcopy directly under the button.** "No credit card
  required," or a benefit-shaped reassurance. *Lyssna, YNAB ("The average YNABer
  saves $600... and you seem above average, honestly").*
- **Ending CTA that restates the promise as a question**, placed after a
  testimonial; or merges into the footer as an email field so there's no dead
  end. *Patreon, Kajabi.*
- **Footer as objection-and-navigation surface** — live status pill, legal/DPA
  links, comparison links, physical address. *Dub, Resend.*
- **Show the product doing the thing, at readable resolution**, with real-looking
  data, not an abstract illustration. *Antimetal (legible code diff), Craft (real
  document with a collaborator comment bubble), Heidi (an actual clinical note).*
- **Pricing that states the free tier's reason honestly**, and shows unflattering
  rows plainly. *Oku ("Help us pay the bills"), Netflix ("Ads: Less than you
  might think").*

## Checklist

- [ ] Can a stranger say what this product is from the first viewport alone?
- [ ] Exactly one visually dominant CTA above the fold?
- [ ] Secondary CTAs use a lower-weight treatment, not a second filled button?
- [ ] Nav CTA uses the same verb as the hero CTA?
- [ ] Primary CTA repeated at the bottom?
- [ ] Any proof (logos, stat, award, rating) visible before the first scroll?
- [ ] Stat numbers non-round, or scoped by time/sample?
- [ ] At least one number footnoted with source or method?
- [ ] Every testimonial carries a full name, role, and company?
- [ ] At least one testimonial links to a longer, verifiable story?
- [ ] Logos are real customers, labelled with the relationship?
- [ ] For regulated categories: jurisdiction, licence, insurer, or lab named?
- [ ] Compliance badges carry a sentence of scope, not just an icon?
- [ ] Does the page ever say what the product is *not*?
- [ ] Does the FAQ answer the skeptic's question and the definition question?
- [ ] Is the product shown doing real work at legible resolution, real-looking data?
- [ ] "How it works" steps three or fewer, each one readable line?
- [ ] Can a visitor self-select role/use case before reading feature copy?
- [ ] Is risk removed in microcopy directly under the button?
- [ ] Does the footer carry status, legal, security, and comparison links?

## Anti-patterns

- **Abstract headline with no anchor.** "Unlock truth for everyone" over an
  abstract cloud gradient — nothing in the viewport says what's being sold. Fine
  when the brand is known, fatal when it isn't. *Mixpanel, Superhuman.*
- **Two equal-weight buttons.** When neither wins, the visitor picks neither.
  *Speakeasy, Riverside.*
- **The AI-slop landing look.** Centred hero, pastel mesh/aurora gradient, a hazy
  abstract blob standing in for a product screenshot, two-line aspirational
  headline, single pill button, zero specifics in the fold. Tell: swap the logo
  for any other company's and the page still makes exactly as much sense.
  *Superhuman, Mixpanel.* Craft's gradient works only because a real, legible
  screenshot sits directly beneath it.
- **Round-number scale claims.** Every figure ends in a plus sign and zeros.
  "50,000+ · $10B+" (Ramp), "1 Million+" (Glide), "200K+" (Mercury).
- **The G2 badge collage.** A rating plus a stack of season badges plus
  unattributed micro-quotes — no name, no company, no date. Vendor-purchasable
  credibility. *Sana.*
- **Badge-grid-as-security-story.** A row of compliance logos asserting
  certification without stating scope, coverage, or date. *Grammarly, Miro.*
- **Self-scored competitor tables.** Ten rows, ten wins, zero parity, no sources
  — reads as marketing, not comparison. *Jasper vs ChatGPT+.*
- **Stock-photo "About us" and generic step icons.** Decorative illustration
  substituting for a screenshot of the actual thing. *ClassPass, Klook Protect,
  Wave.*
- **Newsletter capture disguised as a hero.** A footer newsletter block dressed
  up as a product-signup hero — visually loud, low-intent. Don't confuse the two.
  *Intercom, Kajabi, beehiiv.*
- **Definition buried in the help centre.** If the plainest sentence about the
  product is in a support article, not the marketing page, the landing page has
  an identification problem. *Intercom.*

## Cross-cutting (see full list in the survey's "Cross-section observations")

- **Non-round, footnoted, time-scoped numbers are shared with paywalls** — same
  credibility mechanism, same anti-pattern (everything ending in "+" and zeros).
- **Named attribution beats volume** across landing pages, paywalls, and
  mid-onboarding testimonials alike.
- **"Swap the logo and nothing reads wrong"** is the generic-detector — arrived
  at independently for both the AI-slop gradient hero here and the undifferentiated
  3-card paywall grid. Most useful single heuristic for flagging templated work.
- **Explaining the mechanism beats asserting the outcome** — Dovetail/Linear's
  per-badge sentences, Wellfound's disclosed silent filter, are the same move as
  Stripe's visible pricing-slider tier boundaries.
