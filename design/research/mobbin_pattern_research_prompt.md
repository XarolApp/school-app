# Research brief — Mobbin pattern survey for a custom design skill

> **How to use this file:** paste everything below the line into Claude Cowork as a
> single research task. Cowork has access to the Mobbin MCP. This is a **breadth**
> task, not a depth task — the goal is a large, structured survey that a later step
> turns into a reusable Claude Code skill, not a one-off recommendation for
> ŠkolaMatch specifically.

**Model/effort recommendation (you're budget-constrained on weekly usage):** don't
downgrade the model — pattern synthesis across many screens needs real judgment, and
a weaker model will produce generic, forgettable observations that aren't worth
turning into a skill. Set **effort to medium, not low.** Low effort risks shallow
single-pass browsing that under-serves the explicit "large amount of sites" ask;
high effort is likely overkill for what is fundamentally broad pattern-collection
rather than deep multi-step reasoning. Medium is the right economy tier here — it's
also a one-time task feeding a durable skill, so it's worth spending more on than a
disposable answer.

---

## Context you need

I'm building **ŠkolaMatch**, a Czech web + mobile app that helps 9th graders (14–15)
and their parents choose a high school. It's paid (~250 Kč / ~$10), both students
and parents buy independently, acquisition is TikTok/Instagram influencers, and it's
used once per person, ever. Full product context, if useful, lives in
`design_direction_research.md` and `DESIGN.md` in this same `docs/sources/` /
project-root location — you don't need to read those to do this task, but they exist
if you want grounding.

**This task is different from the previous research pass.** That one was narrow and
ŠkolaMatch-specific (warmth vs. credibility, teen psychology, colour and trust). This
one is broad and **not** ŠkolaMatch-specific — the goal is to build a general,
reusable library of what separates good execution from generic execution across
whole categories of screens, using the Mobbin MCP's access to real shipped products
across web and app. The output will be turned into a **custom Claude Code skill** —
think of yourself as building the reference material a design skill would cite, the
way `anti-slop.md` or `style-directions.md` catalog patterns for a general design
skill, except sourced from real production screens instead of written from
principle.

## What I need you to do

Use the Mobbin MCP (`search_screens`, `search_flows`, `search_sections`) to survey a
**large number of sites and apps** — tens of products per category, not a handful.
You do **not** need most of them to resemble ŠkolaMatch. Pull from genuinely
successful, well-regarded products across as many industries as you can reach:
fintech, health, travel, ecommerce, productivity, education, dating, insurance,
media, developer tools, consumer social — breadth is the point. Search **both web
and app (iOS) platforms** for everything below; do not skip either.

Produce the survey as **four separate, independently-readable sections**, because
each maps to a different real screen category and will likely become a different
part of the eventual skill:

### 1. Paywalls
Survey paywall and pricing-screen patterns broadly. How do successful products:
- Structure plan comparison (number of tiers, how the "recommended" plan is
  signaled, how price is anchored)
- Frame trials, guarantees, and cancellation
- Handle the moment right before a one-time or first-time payment specifically
  (not just recurring subscriptions — also look at one-time-purchase products:
  exam prep, courses, single-use tools)
- Use urgency, scarcity, or social proof — and where that visibly helps vs. reads
  as manipulative
- Design the "what you get" list — iconography, copy density, ordering
No constraint on relevance to ŠkolaMatch here — survey broadly, then flag (don't
filter out) anything that specifically wouldn't work for a payer who might be a
minor or might be paying for someone else.

### 2. Onboarding
Survey onboarding and questionnaire/quiz-style flows broadly — not just apps that
literally ask questions, but any first-run experience that personalizes based on
input. Look at:
- How many steps, how progress is communicated, how skip/back is handled
- How questions are asked (single-select tiles, sliders, free text, conversational)
- How the flow builds investment before an eventual paywall or signup
- How results/personalization get revealed at the end of an onboarding quiz
- Permission requests, account creation timing relative to value delivery
Again — survey broadly. Duolingo, Headspace, fintech onboarding, dating apps,
fitness apps, B2B SaaS setup wizards are all fair game even though none of them sell
school placement.

### 3. Landing pages
Survey pre-signup marketing/landing pages broadly. Look at:
- Hero structure and what the very first viewport tries to accomplish
- How trust/credibility gets established before any product interaction
- How pages handle a visitor who doesn't yet know what the product is
- Social proof patterns — testimonials, logos, stats — and which feel earned vs.
  templated
- CTA placement and how many distinct calls-to-action appear above the fold
Survey broadly across categories again.

### 4. The core product itself (post-commitment)
This is the one category where I want you to **lean toward relevance**, without
being afraid to include strong unrelated examples too. Look specifically at:
- **Search/browse/filter interfaces** — any product where a user filters a list of
  many similar options down to a few (real estate, job boards, course catalogs,
  dating, travel booking, daycare/school finders if you can find any)
- **Match or recommendation result screens** — any product that tells a user "here's
  what fits you" after they provide input, and specifically how it presents
  confidence/fit (numbers, bands, criteria lists, narrative explanation)
- **Comparison tools** — side-by-side or sequential comparison of a few shortlisted
  options
- **Detail/profile pages** for one item in a browsable list (a school, a listing, a
  course, a product)
Weight this section toward products that involve a **meaningful, infrequent,
higher-stakes decision** (choosing a home, a school, a course, a financial product,
a healthcare provider) over products that are browsed casually and often (shopping,
media). But include at least a few strong examples from casual-browse categories
too, if their search/filter or result-presentation execution is genuinely excellent
— excellence elsewhere can still teach something.

## Output format

For **each of the four sections**, structure your findings as:

1. **Products surveyed** — a simple list of every app/site you actually looked at in
   this category (name + platform). This is the evidence trail; don't skip it even
   though it's not "analysis." I want to see the breadth, not just your conclusions
   from it.
2. **Patterns that separate excellent from generic** — the actual synthesis. For
   each pattern: name it, describe the mechanism concretely (not "make it feel
   premium" but the specific structural/visual choice that produces that feeling),
   and cite 2–4 of the products above as examples. This is the part that becomes
   skill content, so favor specificity a future Claude session could act on over
   general advice it already knows.
3. **A short checklist** — the patterns above compressed into scannable yes/no
   prompts a design pass could run through, in the style of a checklist (this is
   the part most directly reusable as skill material).
4. **Anti-patterns** — things you saw repeatedly that look competent but are
   actually generic/templated, the way a design-quality skill would flag "AI slop."
   Name them plainly.

Close with:

5. **Cross-section observations** — anything that appeared across multiple
   categories worth flagging once rather than four times (e.g. a typography or
   motion pattern that shows up in both onboarding and paywalls).
6. **Coverage note** — how many total products you surveyed across all four
   sections, and any category where you ran out of good Mobbin results and had to
   stop short. Don't silently under-cover a section — say so if you did.

Favor **breadth and citation density** over prose quality. This document's job is to
be raw material for building a skill, not a polished report — many named examples
with a one-line mechanism beats fewer examples with longer explanations.
