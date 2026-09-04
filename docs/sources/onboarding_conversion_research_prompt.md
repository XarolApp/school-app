# Research prompt: what makes an onboarding flow actually convert

Paste this into Cowork (or another deep-research tool) as-is. Save the output as
`onboarding_conversion_research.md` in this same folder — Claude will pick it up
from there.

Written 2026-09-05, to fill a specific gap: this project has research on *where*
onboarding should live (`platform_onboarding_research.md`, web vs app) and a
survey of *what onboarding screens look like* (`design/research/mobbin_pattern_survey.md`),
but nothing sourced on **what actually makes one convert**, and nothing at all on
**desktop-width onboarding** — every screen in this product was designed at 390px.

---

## The prompt

I'm redesigning the onboarding flow for **ŠkolaMatch**, a Czech web app that helps
9th graders (age ~15) and their parents choose a high school (*střední škola*).
I need research on what makes onboarding flows convert, grounded in real data and
real shipped products — not general UX advice.

### The product, precisely

These properties matter and several of them break the assumptions most onboarding
advice is built on. Please treat them as binding constraints, and flag explicitly
whenever a finding you report does **not** transfer to a product shaped like this.

- **Used exactly once per person, ever.** One high-school decision, then the user
  is done forever. There is no habit loop, no D7 retention, no re-engagement, no
  "streak." Almost all published onboarding advice optimises for retention in a
  habit product (Duolingo, fitness, meditation). I need to know which findings
  survive when *retention is irrelevant* and the only outcomes are (a) finishing
  the flow and (b) paying, both within a single session.
- **Web first, and desktop is a first-class surface.** Traffic arrives mostly as
  mobile browsers from TikTok/Instagram influencer links, but the parent persona
  researches on a laptop and students use school computers. The entire existing
  design is 390px mobile-first and **desktop is undesigned** — this is the single
  biggest gap I need filled.
- **Anonymous quiz first, account and payment last.** The user answers ~10
  questions with no account, sees their #1 school match free, then hits a paywall
  for the full ranked list. Registration happens *after* the value is shown.
- **Two buyer personas branch at screen 2**: the teenager and the parent. Both
  pay independently — neither is a funnel into the other. Voice, proof type and
  price framing all differ by branch.
- **The audience includes minors in the EU.** GDPR, the DSA (Art. 25) and the
  Digital Fairness Act are binding. No fake scarcity, no countdown timers, no
  manufactured urgency, no guilt or fear-based copy aimed at a 15-year-old.
- **High-stakes, anxiety-adjacent decision.** This is one of the first real
  decisions of a teenager's life, and a parent is often anxious about it. Warmth
  and calm matter; "addictive" and "gamified" are the wrong register.
- **The current flow is 23 screens** containing a 10-question quiz, structured as
  hook → role fork → problem framing → stakes → intent → 10 quiz screens →
  mirroring → honest expectation → calculating → reveal → journey summary →
  commitment → social proof → account → paywall. **I am actively re-opening
  whether 23 is right**, so please treat flow length as a question, not a given.

### What I need from the research

**1. Flow length and question count — with numbers.**
What does the evidence actually say about how many screens and how many questions
an onboarding quiz can hold before drop-off outweighs the investment gained? I
know long quizzes are the fashion (Noom, Cal AI, Duolingo) and that the sunk-cost
/ IKEA effect is the theory behind them. What I don't know is where the curve
turns, and whether it turns *earlier* for a one-time-use product where the user
has no prior relationship with the brand and no reason to expect a long-term
payoff. Cite completion-rate or conversion data with sample sizes and sources
wherever it exists, and say plainly when a claim is vendor marketing rather than
research.

**2. Desktop and wide-viewport onboarding — this is the priority.**
Nearly every onboarding pattern library is iOS-screenshot-based. I need to know
what a *desktop-width* onboarding flow should actually do:
- Does a single-question-per-screen flow (the mobile default) still work at
  1280px+, or does it read as wasteful and slow on a large screen? Is there
  evidence either way, or only convention?
- Which real products ship a genuinely *designed* desktop onboarding or quiz —
  not a phone layout stretched or letterboxed in the middle of a white page?
  Name them and describe the layout: is it centred and narrow, split-pane,
  multi-column, sidebar-with-progress, full-bleed? At least 8–10 named examples,
  across categories, with links where possible.
- How do the best of them use the extra horizontal space — persistent progress,
  a live-updating preview of the result being built, contextual reassurance
  beside the question, imagery, or simply generous whitespace?
- Do any products deliberately show *more than one question per screen* on
  desktop while keeping one-per-screen on mobile? Does that help or hurt?
- What breaks when a mobile-first quiz is naively widened (line lengths, tap
  targets becoming tiny click targets, vertical centring on tall monitors,
  progress bars stretched to 1280px)?

**3. Attention: capturing it and holding it, without manipulation.**
I want the flow to genuinely grab and hold attention. I need to know what actually
does that, distinguished carefully from what merely *feels* attention-grabbing:
- What is known about the first screen specifically — how long you have, what
  determines whether someone continues past it, and whether that differs on
  desktop (where the user chose to be there) versus a mobile browser opened from
  a social link (where they arrived by impulse)?
- Which mechanisms hold attention through a long flow: progress indication,
  variable/anticipatory reward, personalisation that visibly accumulates,
  narrative, motion, or something else? Rank by evidence strength, not by how
  often they're recommended.
- **Where is the line between "compelling" and "dark pattern" under EU law for
  a product whose users include minors?** Be specific about the DSA Art. 25 and
  Digital Fairness Act constraints as they apply to onboarding: which common
  attention techniques (countdowns, artificial scarcity, pre-checked boxes,
  confirmshaming, "endowed progress" that misrepresents actual progress) are
  actually prohibited or legally risky, versus merely tasteless. This is a hard
  constraint on the design, so I need it accurate rather than cautious-by-default.

**4. What the evidence says about the specific structural choices I've made.**
For each of these, tell me whether it's supported, contradicted, or simply
untested — and don't invent support that isn't there:
- Asking "who are you?" (student vs parent) at screen 2 and branching voice,
  proof and price framing from it. Does persona-branching early actually improve
  conversion, or does it mostly add build cost?
- Running problem-framing and stakes screens *before* the quiz, rather than
  starting with the first question immediately.
- A "calculating / analysing" loading screen that itemises what's being
  processed, versus going straight to the result.
- Revealing the #1 match free and paywalling the rest, versus paywalling before
  any result, versus revealing everything and paywalling depth.
- Placing account creation *before* the paywall rather than after purchase.
- Showing match results as qualitative bands with reasons rather than a numeric
  percentage score. (This product deliberately does not show a fake precision
  percentage — I want to know whether that costs conversion, and by how much.)

**5. The dual-persona problem.**
Research or real examples of products that onboard two genuinely different buyer
personas through one flow — especially a minor and their parent, or a student and
a payer. How do the good ones handle it: fully separate flows, a branch, a shared
flow with different copy, or a hand-off between the two people? Is there evidence
on which converts better? Include any research on **parent-child joint purchase
decisions** for education products, and on how parental-consent or
parental-confirmation steps affect completion.

**6. What to cut.**
Given everything above: which screens in a flow like mine are most likely to be
dead weight? Is there published evidence on removing steps from an onboarding
flow and what happened to conversion? I would rather cut three screens that don't
earn their place than polish 23 that half-work.

**7. Failure modes, with named examples.**
Real onboarding flows that are widely admired but measurably underperform, or
that read as manipulative/exhausting/untrustworthy. Specifically: what makes a
long quiz feel like *work* rather than *investment*, and what makes a paywall at
the end feel *earned* rather than like a bait-and-switch. I need the anti-pattern
list to be as concrete as the pattern list.

### Format

Structure the output as a markdown file I can drop straight into a docs folder:
YAML frontmatter (`title`, `date`, `status: research reference, not a decision
record`), a short intro, then findings under headers matching the numbered points
above, and close with a short "what this does not answer" section.

Two things I care about more than completeness:

- **Cite real sources with links.** Distinguish clearly between (a) peer-reviewed
  or large-sample studies, (b) company-published case studies and A/B results,
  (c) vendor/agency marketing content, and (d) your own inference. Label which is
  which inline. I would much rather have six well-sourced findings than thirty
  unsourced assertions.
- **Be honest about gaps.** If desktop-specific onboarding data essentially does
  not exist and the honest answer is "convention only, here's what products
  actually do," say exactly that. If a finding comes from habit-retention
  products and probably doesn't transfer to a once-per-lifetime purchase, flag
  it rather than reporting it flat. Stating a gap clearly is more useful to me
  than filling it with something plausible.
