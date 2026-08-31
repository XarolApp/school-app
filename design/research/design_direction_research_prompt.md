# Research brief — visual direction for ŠkolaMatch

> **How to use this file:** paste everything below the line into Claude Cowork as a
> single research task. It is written to be self-contained — Cowork starts with no
> knowledge of this repo. The output lands back in `docs/sources/` and gets combined
> with (a) the founder interview and (b) Mobbin reference screens before `DESIGN.md`
> is rewritten.

---

## Context you need

I'm building **ŠkolaMatch**, a web + mobile app that helps Czech 9th graders (age
14–15) choose which high school (*střední škola*) to apply to. In the Czech Republic
this choice happens once, around age 15, and it substantially shapes the next 4 years
and the university path after that. There is no good existing tool — the one
directory site that lists all schools (atlasskolstvi.cz) is dated, dense, and
unhelpful, so students end up digging through dozens of individual school websites.

**The product:** a searchable school database, plus a questionnaire that asks about
interests, grades and preferences and then ranks schools by fit, plus save/compare.

**The business model matters for the design.** This is a paid product (roughly
250 Kč / ~10 USD), and — this is unusual and important — **both students and parents
buy it, independently**. A 15-year-old paying with their own money is a real,
deliberate customer segment, not a funnel into a parent purchase. The app asks who
you are up front and branches. So the design has to earn a payment from a teenager
*and* from a 45-year-old parent, without either feeling like it was built for the
other one.

**Acquisition is via Czech teenage TikTok/Instagram influencers.** Most traffic will
be mobile, arriving from a short-form video, with very low initial trust.

**Usage pattern:** used essentially once per person, ever, over a period of days or
weeks during the application season. Not a habit product. There is no "come back
tomorrow" — it has to deliver and be trusted almost immediately.

## The problem I need solved

I had a first pass at a design system. It came out looking like a **developer tool**
— the feedback I gave was that it feels like GitHub, n8n, or Supabase: technically
competent, professional, and cold. Specific things that produced that: a navy-blue
primary color, a monospace font for numbers, tight/sharp corner radii, no shadows,
hairline borders everywhere, and a visual metaphor built around institutional school
paperwork (report cards, class registers, a teacher's red correction pen).

What I actually want is **warm, trustworthy, and easy to use.** The tension I don't
know how to resolve is that "trustworthy" designs tend to drift cold and corporate,
and "warm" designs tend to drift childish or unserious — and I can't afford either.
A 15-year-old must not feel patronized; a parent must not feel it's a toy.

## What I want you to research

Please research the following and report back with **specific, sourced findings** —
real products, real studies, real examples with names — not general design advice.
Where you make a claim about what works, say what it's based on. Flag clearly when
something is your inference rather than a sourced finding.

### 1. Warmth vs. credibility — how real products resolve this
Find and analyze consumer products that handle a **high-stakes, anxiety-adjacent
decision** while still feeling human and warm rather than institutional. Candidate
territories: consumer health and mental-health apps, financial planning tools aimed
at ordinary people (not traders), fertility/pregnancy apps, insurance products that
deliberately rejected the corporate look, university/career-choice tools, legal
services for consumers.

For each: what *specifically* makes it feel warm (color, type, shape, imagery,
copy, motion), and what specifically keeps it feeling credible at the same time?
I want the mechanism, not the vibe.

### 2. Designing for teenagers without being childish
What does research and practice say about visual design for 14–16 year olds who
are making a serious decision? Specifically:
- What signals "this was made for kids" and causes teens to disengage or feel
  patronized? (I need the anti-patterns named concretely.)
- What do teen-facing products that teens actually respect look like? Consider
  products in education, finance (teen banking), health, and productivity.
- Is there evidence on how teenagers assess trustworthiness of a website or app
  differently from adults — what makes them bounce, what makes them believe it?

### 3. The dual-audience problem
The same product must be bought by a teenager and by their parent, and they may
both look at it. Research how products handle a **shared or split audience across a
generation gap** without building two separate visual identities. Real examples
preferred (teen banking apps with parent dashboards, family health products,
tutoring/exam-prep marketplaces, driving schools). What breaks when you try to
serve both, and what strategies work?

### 4. Color: trust without coldness
Blue is the default "trust" color and it is precisely what made my first attempt
feel corporate. Research:
- What's actually known (vs. folklore) about color and perceived trustworthiness?
  Be skeptical here — a lot of "color psychology" content is unsourced nonsense,
  so please distinguish real evidence from repeated marketing claims.
- Which non-blue palettes are used by products that successfully feel both warm
  and credible? Name the products and, where you can, the actual color values.
- Any Czech or Central-European specifics — do local audiences read certain colors
  or styles differently? Are there Czech consumer products or public services with
  notably good, warm, trusted design?

### 5. Reducing anxiety in a high-stakes decision interface
This decision is genuinely stressful for the student. Research design patterns that
**lower** felt pressure while still helping someone decide — how results are framed,
how uncertainty is communicated, how choices are presented so a user doesn't freeze,
how to avoid making someone feel judged or measured. Include anything on how to
present a "match" or "fit" score without it feeling like a grade or a verdict.

Relevant constraint: my product has a standing rule of **zero-shame UX** — nothing
in it may guilt, shame, or scare a 15-year-old. I need patterns compatible with that.

### 6. Paying for something you'll use once
What makes a one-time-use paid product *look* worth paying for? Research how
products that are consumed once (exam prep, test-prep, one-off consultations,
wedding/moving/tax tools) design their paid experience and their paywall so the
purchase feels justified rather than extractive — particularly where the payer may
be young or spending someone else's money.

### 7. Anti-references — what to avoid
Find and describe examples of what I should *not* look like:
- Czech/European school and government directory sites (the dated, dense, unhelpful
  category atlasskolstvi.cz belongs to)
- Products that tried to be "friendly" and ended up feeling cheap or untrustworthy
- Developer-tool / SaaS-dashboard aesthetics as applied to consumer products, and
  why they fail there

## Output format

Please deliver a single markdown document with:
1. **Headline findings** — the 5–8 things that should most change how this app looks,
   stated plainly.
2. **A section per research area above**, with named examples and sources/links.
3. **A concrete "warmth levers" list** — specific, actionable design moves that add
   warmth without costing credibility, ranked by impact. This is the part I'll use
   most directly.
4. **Open questions / conflicts** — anywhere the research disagrees with itself, or
   where a decision genuinely depends on taste rather than evidence. Don't paper
   over these; I'd rather decide them knowingly.

Prioritize depth and specificity over breadth. Named examples with explanations beat
lists of adjectives. If you can't find real evidence for something, say so rather
than filling the gap with plausible-sounding generalities.
