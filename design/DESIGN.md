---
version: alpha
name: ŠkolaMatch
description: A high school selection tool for Czech 9th graders and their parents — a searchable school database, an AI-matched questionnaire, and a paywall, built to feel like a trusted advisor rather than an institution grading you.

colors:
  primary: "#AD4F2A"
  primary-strong: "#8A3E20"
  primary-subtle: "#F6E3D6"
  secondary: "#6B6259"
  tertiary: "#4F7143"
  tertiary-subtle: "#E6EDDE"
  neutral: "#F1ECE3"
  surface: "#FAF6EF"
  on-surface: "#221A13"
  on-surface-faint: "#756B5C"
  border: "#E6DFD1"
  border-strong: "#D6CBB6"
  error: "#7A3020"
  error-subtle: "#F5E2DC"

typography:
  display:
    fontFamily: Fraunces
    fontSize: 72px
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: -0.02em
    fontVariation: "'SOFT' 60, 'opsz' 72"
  headline-lg:
    fontFamily: Fraunces
    fontSize: 38px
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: -0.015em
    fontVariation: "'SOFT' 50, 'opsz' 38"
  headline-md:
    fontFamily: Fraunces
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
    fontVariation: "'SOFT' 45, 'opsz' 28"
  headline-sm:
    fontFamily: Fraunces
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
    fontVariation: "'SOFT' 35, 'opsz' 22"
  body-lg:
    fontFamily: Public Sans
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Public Sans
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Public Sans
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Public Sans
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  label-caps:
    fontFamily: Public Sans
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.08em
  label-md:
    fontFamily: Public Sans
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0
  data-md:
    fontFamily: Public Sans
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "'tnum' 1"
  data-sm:
    fontFamily: Public Sans
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "'tnum' 1"

rounded:
  input: 10px
  chip: 12px
  button: 12px
  card: 20px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  xxxl: 64px
  gutter: 24px
  margin: 64px

components:
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  card:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.lg}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  divider-strong:
    backgroundColor: "{colors.border-strong}"
    height: 1px
  input-placeholder:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-faint}"
    typography: "{typography.body-md}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.button}"
    padding: "{spacing.md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-md}"
    rounded: "{rounded.button}"
    padding: "{spacing.md}"
  button-secondary-hover:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary-strong}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.input}"
    padding: "{spacing.sm}"
  input-error:
    backgroundColor: "{colors.error-subtle}"
    textColor: "{colors.error}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.input}"
  option-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.input}"
    padding: "{spacing.md}"
  option-row-selected:
    backgroundColor: "{colors.primary-subtle}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.input}"
    padding: "{spacing.md}"
  checkbox:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.input}"
    size: 22px
  checkbox-checked:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.input}"
    size: 22px
  chip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.chip}"
    padding: "{spacing.xs}"
  match-indicator:
    backgroundColor: "{colors.tertiary-subtle}"
    textColor: "{colors.tertiary}"
    typography: "{typography.label-caps}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  tooltip:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.input}"
    padding: "{spacing.sm}"
---

# ŠkolaMatch

## Overview — read this before anything else

This is the **second** DESIGN.md written for ŠkolaMatch. The first one — Archival
Institutional crossed with Soft Technical, navy primary, monospace numerics, hairline
structure, a metaphor built on report cards and a teacher's red pen — lint-passed at
zero errors and was still wrong. Seeing it rendered, the founder's reaction was
immediate: *it looks like GitHub, n8n, or Supabase.* That diagnosis was correct, and
this file is the correction, built on two inputs the first version didn't have:

1. **A 131KB sourced research document** (`design/research/design_direction_research.md`
   — moved from `docs/sources/` 2026-08-31, see `design/research/`)
   covering warmth-vs-credibility, teen design psychology, colour-and-trust folklore
   vs. evidence, and anxiety-reduction patterns — with `[SOURCED]`/`[CONTESTED]`/
   `[GAP]` flags throughout. Findings are cited by name below; treat `[INFERENCE]`-
   flagged claims as reasoning, not measurement.
2. **Ten reference screens pulled from Mobbin** (listed under each section below,
   with URLs) — not because ŠkolaMatch should resemble any one of them, but because
   every claim in this file about what "warm but credible" looks like in production
   is checked against something that actually shipped.

**For whoever builds screens from this file (including `/design` and Claude Design):
query the Mobbin MCP directly before generating anything, but treat it strictly as
reference, never as a source of truth.** Priority order, always:

1. **`design/system/` first** — the real, built component library (`Button`, `Input`,
   `Checkbox`, `Card`, `Chip`, `Divider`, `MatchIndicator`, `Tooltip`, tokens,
   guidelines). This is the template. Its components, colors, spacing, and type scale
   are not negotiable against anything Mobbin turns up.
2. **This file, `DESIGN.md`, second** — the prose reasoning and direction behind that
   template, for anything the built components don't cover yet.
3. **Mobbin third, as a sanity check only.** Before designing any screen, search
   Mobbin for 3–5 real shipped examples of that screen type (warm neutral grounds,
   one desaturated accent, generous radius, real photography — the direction named
   below). Use them to judge whether a layout or interaction choice holds up against
   real products. **Never let a Mobbin example override or blend into this design
   system's own colors, spacing, or components** — if a Mobbin pattern conflicts with
   `design/system`, `design/system` wins, full stop. The ten screens cited here are a
   starting point, not the full research. When evaluating a reference screen, check
   that it's not fundamentally misaligned with the warm-but-credible direction —
   exclude sites serving opposite purposes (cold developer tools, pure entertainment,
   etc.), but don't restrict to only similar categories.

### Who this is for, and the tension that shaped everything

A 15-year-old fills out a questionnaire on a phone, stressed about an irreversible
decision. Their parent opens the same result on a laptop days later, deciding whether
to pay. Founder's own framing, verbatim: *"trustworthy in a calm way, without being a
people-pleaser — real results you can trust, not flattery."* That is the whole brief
in one sentence, and it resolves the register question directly: **Revolut/Spotify,
not Notion/Linear (too cold, what the first version accidentally became) and not
Duolingo (too playful for a decision this heavy).**

The apparent contradiction — "stressed and scared" wants softness, "Revolut/Spotify"
wants confidence — is resolved the way every warm-but-credible product in the
research resolves it: **not with a midpoint, but by zoning.** Monzo's brand book
states this as an explicit rule: hot coral "is exhausting at scale" and product UI
should "default to deep navy on soft white" — warmth in the brand layer, sobriety in
the interface layer. Confidence here comes from **craft and honesty** (real
typography, generous space, an accent used with real restraint), never from urgency,
noise, or flattering the user about a match that isn't actually strong.

### The metaphor problem, and its replacement

The first version's single worst decision, independently flagged by the research as
"the single most damaging idea in the first pass": a visual metaphor built on being
evaluated — report cards, a class register, a teacher's correction pen. Somerville et
al. (fMRI, n=69) found sensitivity to social evaluation **peaks at ~15.3 years old** —
almost exactly this product's primary user — with arousal elevated during
*anticipation*, not only during the evaluation itself. A product about to tell a
15-year-old what it thinks of their choices cannot afford to visually rhyme with being
graded.

This version has **no institutional-document metaphor at all.** Where a colour or
form needs a referent, it's sourced from something a person actually owns and likes —
never from an instrument that judges them. See Colors.

### Explicit anti-references

**atlasskolstvi.cz** (the existing Czech school directory) — dense unstyled tables, no
hierarchy, dated chrome. ŠkolaMatch's entire value proposition is being the thing that
site should have been; resembling it in any way is a direct product failure.

**GitHub / n8n / Supabase** — the first version's actual result. Anything that reads
as a developer tool, an admin panel, or "professional but cold" has failed this
brief, independent of whether it lints clean.

## Colors

**The architecture, before any specific values.** Every warm-but-credible brand
examined in the research — Anthropic, Wise, Ethos, Notion, Air Bank, Zonky — uses the
same three-layer structure, and *none* of them solve the tension with a single magic
warm hue:

```
one warm, desaturated accent  → CTAs, selection states, logo — never long-form text
warm-neutral ground           → 90%+ of every surface
a very dark, warm-tinted anchor → carries the actual credibility work, never pure black
```

Monzo's brand book states this explicitly as a "considerate use" rule: their coral
"is exhausting at scale" and is banned from long-form reading and dense product UI.
The same discipline applies here.

**On "blue = trust."** The one direct experimental test (Alberts & van der Geest,
n=200+) found blue rated most trustworthy — but the effect was **modest relative to
other trust factors**, and the study never tested warm hues, warm neutrals, or an
accent-vs-dominant application at all. The more useful finding is Bottomley & Doyle:
**congruence beats hue** — there is no universally trustworthy colour, only colours
congruent with a stated position. (The claim that "62–90% of judgements are colour
alone" is untraceable marketing folklore, not a real finding — it does not appear
anywhere in this file for that reason.)

- **Primary (#AD4F2A):** *The colour of Prague's terracotta rooftops at golden hour* —
  warm, confident, distinctly Czech rather than borrowed from any fintech's brand
  book. Desaturated deliberately: full-saturation terracotta reads as decorative;
  this value is pulled down until it reads as a decision made under the same
  restraint Monzo applies to its coral. Its **only** jobs are the primary CTA, the
  questionnaire's selection state, and the logo. It is banned from body text, from
  long-form reading surfaces, and from dense browsing screens — the exact rule
  Monzo's own brand book states for its accent. White text on this fill holds
  4.96:1 (`button-primary`); as text on Surface it holds 4.96:1 in the other
  direction, so a rare small-label use stays AA-safe, but the standing rule is:
  reach for weight and space before reaching for Primary.
- **Primary-strong (#8A3E20):** The same terracotta, darker — hover and active
  states only.
- **Primary-subtle (#F6E3D6):** A wash of Primary, used only as the fill behind a
  selected option row, paired with a 1.5px Primary border. Never a solid Primary
  fill on interface chrome — that would read as a button, not a considered choice.
- **Secondary (#6B6259):** Warm graphite — metadata, captions, unselected chip text.
  Holds 5.54:1 on Surface.
- **Tertiary (#4F7143):** *A muted, warm-leaning moss green* — sourced the way Air
  Bank (`#99CC33`/`#497D00`, the KPMG-surveyed Czech CX leader in a category where
  every incumbent bank is blue) and Wise (`#9FE870`/`#163300`) source theirs: bright
  hue plus dark anchor, not a stock alert green. Its **only** job is marking a
  strong match — never a generic success toast, a decorative checkmark, or
  confirmation copy. Holds 5.16:1 on Surface and 4.64:1 on its own subtle wash.
- **Tertiary-subtle (#E6EDDE):** Wash of Tertiary, used only behind a match
  indicator.
- **Neutral (#F1ECE3) and Surface (#FAF6EF):** Two warm paper values a half-step
  apart. This is the one piece of *actual evidence* in the whole colour picture:
  Rello & Bigham (ASSETS 2017, n=341, 89 with dyslexia) tested ten background
  colours against black text and found **warm backgrounds — peach, orange, yellow —
  read significantly faster than cool ones**, with the same ordering in both
  dyslexic and control groups. That is a readability finding, not a trust finding —
  it is cited here for exactly that and no more. Surface is the page and any raised
  content; Neutral sits a half-step down for cards and rows. Neither is white:
  R≠G≠B in both.
- **On-surface (#221A13):** Near-black with real warmth, not `#000000`. This is the
  layer that actually does the credibility work — every brand in the research table
  (Wise `#163300`, Ethos `#054742`, Mailchimp `#231E15`, Anthropic `#141413`) pairs
  a warm accent with a very dark, warm anchor rather than relying on the accent
  itself to seem serious. Holds 15.9:1 on Surface.
- **On-surface-faint (#756B5C):** Placeholder and disabled text. Holds 4.86:1 on
  Surface — clears the linter's 4.5:1 floor with real margin.
- **Border (#E6DFD1) and Border-strong (#D6CBB6):** Hairline rules, used for
  division, never to frame a card as a box — see Elevation.
- **Error (#7A3020):** A muted brick-red, deliberately **not** "a teacher's red
  pen" — that framing is gone from this system entirely, per the metaphor
  discussion above. It means "this needs fixing" (a required field, a failed
  payment), never "this is wrong about you." Derived from the same warm family as
  Primary rather than a stock alert red — closer in hue to Primary than a
  typical error/accent pair, which is intentional: this system has one warm
  family, not two competing ones. Holds 8.28:1 on Surface.
- **Error-subtle (#F5E2DC):** Wash of Error, fill behind an invalid input — always
  paired with an icon and written message, never colour alone.

Every neutral carries a small warm chroma; none is `R=G=B`. Primary, Tertiary, and
Error were each built as short ramps with chroma peaking mid-lightness and a hue
bend across the ramp, so each reads as a material rather than a flat swatch.

### Mobbin references — colour and warmth in production

- [Rocket Money — landing page](https://mobbin.com/screens/d6f98612-c267-4ede-ac5b-458571396f0e) —
  warm without illustration-heavy; real photography of real people carries the
  warmth instead of colour or mascots.
- [YNAB — landing page](https://mobbin.com/screens/c893d1db-0d97-4210-a982-6f41381ca6d0) —
  soft colour and illustration on a genuinely anxiety-adjacent financial product;
  the test case for "does warmth read as childish here" (it doesn't).
- [Family — crypto wallet landing](https://mobbin.com/screens/2a5126c9-091d-4870-b52a-12f586941c75) —
  **anti-reference.** Cute-mascot illustration overload; this is what "warm" looks
  like when it tips into the childishness this product cannot afford.

### Dark mode

Both themes are first-class — this is a decision app people return to over days,
sometimes at night, and light-only would be a real gap. Dark mode is a **separate
design**, not an inversion: chroma is pulled down roughly 15–20% from the light
values, nothing is pure black, and elevation logic inverts (raised surfaces get
*lighter*).

```
bg:               #17130E   (near-black, warm-tinted — never #000)
surface-raised:   #1F1911
surface-overlay:  #2A2216
on-surface:       #F2ECE2   (not pure white)
on-surface-faint: #B3A895
border:           #362C1E
primary (dark):   #E08A5C   (lifted + desaturated — #AD4F2A sinks into a dark
                              ground and stops reading as interactive)
tertiary (dark):  #8FB57E   (lifted Tertiary, same reasoning)
error (dark):     #C97F6A   (lifted Error, same reasoning)
```

Specified here as the design decision; wiring a dark `components` block is an
implementation task, since the DESIGN.md schema has no first-class per-theme
component variant.

## Typography

Two families, split by classification, and — this is the single most consequential
change from the previous version — **no monospace anywhere.** The research names
this explicitly: monospace numerics were "the single strongest dev-tool signal in
the first pass and it buys nothing here." Tabular alignment is available in a normal
sans via `'tnum'`; a code-editor typeface is not required to make a column of grades
line up.

> **Superseded 2026-09-05 — see CLAUDE.md's "Design tokens — tokens.js" section.**
> Fraunces was replaced by **Lora** for headings site-wide: its curled/swash "J" is
> baked into the typeface's identity at every optical size and weight, not a
> rendering default, and read as odd rather than characterful. The `SOFT`/`opsz`
> guidance below (and in the type-scale table above) no longer applies — Lora has
> no such variable axes. This section is kept for history; CLAUDE.md is
> authoritative on the current font pair until this file gets a proper rewrite pass.

**Fraunces** carries the voice — display and every headline. This replaces
Newsreader, and the difference is not cosmetic: Newsreader was locked at weight 400
everywhere, which read as hushed and document-like once paired with hairline
structure. Fraunces is a variable serif with `SOFT` and `WONK` optical axes built
specifically to carry warmth *without* losing authority — used here at weight
500–600 with the `SOFT` axis engaged (35–60 depending on size), which is a
materially different typographic personality from a flat-400 editorial serif. Full
Czech diacritic support. Fallback: `Fraunces, Georgia, "Times New Roman", serif`.
SIL Open Font License, self-hosted.

**Public Sans** carries the apparatus — body, labels, buttons, captions, and now
data. Chosen specifically because its own design brief (USWDS) targets "neutral,
legible, institutionally credible" without reading cold — it is the sans the
DESIGN.md format's own spec examples use, and it is not Inter, which would make the
Fraunces pairing read as an accident rather than a decision. Two weights only — 400
for reading, 600 for anything scanned rather than read. Tabular figures
(`'tnum' 1`) on `data-md`/`data-sm` so a column of grade thresholds aligns without
reaching for a different typeface family to do it. Full Czech diacritic support.
Fallback: `"Public Sans", system-ui, "Segoe UI", sans-serif`. SIL Open Font
License, self-hosted.

The scale runs 11 → 72px. Tracking is optical: −0.02em at Display, easing toward
neutral through body, +0.08em on uppercase labels. Line-height moves inversely with
size: 1.06 at Display, 1.55–1.6 at body.

### Mobbin references — type doing the credibility work without going cold

- [Revolut — landing page](https://mobbin.com/screens/0e44445e-9382-4582-aaed-22251eb5f9df) —
  the named register touchstone. Confident scale and real photography, minimal
  chrome — check this before finalising how "confident structure" should actually
  read in production, since prose can't fully specify it.
- [Hims — quiz result screen](https://mobbin.com/screens/0cfcf67d-b709-4ee2-b980-aa681732cac8) —
  plain numbers set with restraint and supporting context text, muted palette, zero
  drama at the reveal. The direct anti-reference for what the results screen must
  *not* do — see "No reveal drama," below.

## Layout

**Desktop (current focus):** 12-column grid, 1280px max content width, 24px
gutters, 64px outer margin. Below 1024px the grid collapses to 6 columns with 32px
margins; below 768px, a single column with 16px margins.

> **Resolved 2026-08-31.** The live app's container (`frontend/src/components/Layout.jsx`
> → `.app-content` in `App.css`) was widened from an earlier 960px cap to match this
> spec's 1280px, with the 1024px/32px and 768px/16px breakpoints above implemented as
> real media queries (`App.css` had none before). This is a fixed-width port of the
> desktop spec, not a full responsive redesign — there's no intermediate tuning between
> the three stated breakpoints, and no per-component responsive behavior beyond the
> container's own padding. See `UNFORGET.md` for the remaining cross-device work.

**Spacing** runs on a strict 8px base with a 4px half-step for micro-adjustments.

Density varies on purpose, and this did not change from the previous version because
it was already right: **marketing and result screens breathe** — generous rhythm,
the full Display/Headline range, read once and slowly. **Search, filter, and compare
screens stay dense** — 8–12px row padding, `body-sm`/`data-sm` — because someone
comparing many schools is being served by efficiency there, not by air.

Layout is asymmetric where the grid allows it: content flush-left, wide viewports
reserving the right margin for secondary context rather than centering. Centered
body text does not appear anywhere in this system.

### Mobbin references — structure for a matching product

- [Care.com — daycare match results](https://mobbin.com/screens/0c456eb5-3dc2-4b76-820b-f332ddff43d8) —
  ranked matches with a map, verified badges, urgency handled calmly rather than
  frantically. The closest production analog to "help a family make a high-stakes
  choice" this research turned up.
- [Monarch — "Getting personalized advice" flow](https://mobbin.com/flows/adae1760-df5a-4a73-9da8-7c222a14ee8e) —
  a checkbox questionnaire that opens with "Hello Sam, I'm Natalie, a Certified
  Financial Planner" rather than a bare form. The clearest production example of
  "counselor" as a structural pattern, not just a tone of voice.
- [Mindtrip — persona-based recommendation](https://mobbin.com/screens/b68ecccf-7c6b-4c9f-a216-9b55bde7fbc7) —
  a quiz result framed as a named persona with reasoning prose, not a bare score.
  Directly relevant to how match strength should be presented — see Components.

## Elevation & Depth

The previous version banned shadow almost entirely and relied on hairlines for all
structure. That discipline is partially kept — hairlines still divide — but the
total absence of any softness was part of what read as a spreadsheet rather than a
product. This version allows a **soft, palette-tinted shadow on cards**, not only on
modals, as one of the concrete costs of choosing warmth over austere precision. That
is a real trade, not a free upgrade: some of the previous version's "institutional
gravity" is deliberately given up here.

1. **Tonal layering** — the Surface → Neutral half-step, still the primary
   separation device for anything that isn't genuinely floating.
2. **Soft shadow on cards and raised rows** — tinted from On-surface
   (`rgba(34,26,19,.06)` tight + `rgba(34,26,19,.10)` wide at 24px blur), top-down
   light direction, never neutral black. Noticeably softer and lower-contrast than a
   typical SaaS shadow — present, not heavy.
3. **Hairline rules** (`divider`, `divider-strong`) still divide unrelated groups
   from related ones, but no longer carry the *entire* structural load alone.

Shadow is reserved for things that benefit from separation — cards, modals,
dropdowns — never applied to something flat by convention alone.

## Shapes

Radius moved from the previous version's 6–12px to a noticeably more generous
8–20px, following the evidence the research surfaced for this exact tension: a
third-party reconstruction of Headspace's token system (`[SOURCED — weak, not
official]`) reports an 8/12/24/32 radius scale with **no elevation at all**, and
NN/g's eyetracking work puts a real cost on weak visual signifiers — **22% more
time, 25% more fixations** — which is the actual argument for generosity here, not
just taste. Inputs at 10px, chips and buttons at 12px, cards at 20px — hierarchical,
never uniform, never inverted. `full` (9999px) stays reserved for the match
indicator and pill-style progress, marking them as a distinct visual class.

This is a direct reversal of the first version's stated sacrifice — where that file
tightened radius specifically to read as "less consumer-app friendly," this one
widens it specifically because friendliness was never optional in the first place.

Borders stay 1px solid Border at rest; selected/focused states use 1.5px Primary,
unchanged from the prior system, since that rule was never the problem.

## Components

**Buttons.** Primary: solid Primary fill, Surface text, `label-md`, sentence case —
still not uppercase; this is a decision app, and shouting labels undercuts trust
regardless of how warm the palette is. Secondary: Surface fill, Primary-colored
label, no visible border until hover. No tertiary or ghost button.

**Inputs.** Surface fill, 1px Border, `body-md`. Placeholder text uses
On-surface-faint. Error state switches fill to Error-subtle and text to Error,
always with an icon and a written message — this is unchanged, and it was already
one of the things the research independently confirmed as correct (never encode
state with colour alone; ~8% of the audience cannot reliably separate red from
green).

**Option rows** (questionnaire answer choices). Unselected: Surface fill, 1px
Border. Selected: Primary-subtle fill, 1.5px Primary border — never a solid fill,
which would read as a button rather than a considered choice.

**Cards.** Neutral fill, `card` radius, `lg` padding, soft shadow (see Elevation).
Reserved for genuinely discrete objects — one school, one saved comparison — not a
default wrapper for any group of facts.

**Match indicator — rebuilt from the previous system's `badge-match`, and this is
the component most directly shaped by the research.** The previous version showed a
band label ("Silná shoda") and explicitly ruled out a bare percentage. The research
goes further than that and recommends against a headline number in *any* form:
Hinge, the market leader in intentional matching, ships **no number at all**, just
one recommendation with a stated reason; the closest-matched real study (Corcoran et
al., NYC 8th graders choosing among ~400 high schools, n≈19,109) achieved its
results with **a one-page list, no score**; GreatSchools' 1–10 rating was found to
correlate with student demographics and tracked alongside increased housing
segregation; OkCupid proved its displayed compatibility percentage moves user
behaviour **independent of whether it was accurate**.

The `match-indicator` component here is deliberately built to support **met/unmet
criteria the student themselves supplied** — reflecting the student's own stated
values back at them, which structurally cannot be a verdict on the person — rather
than a headline score. **This is not yet finalized against the real matching
engine** (see `design/research/design_direction_interview.md`, "still open" — the
founder's preference for a percentage is under active reconsideration against this
evidence, pending access to the production scoring engine). Whatever is decided,
one rule from the research is non-negotiable regardless of format: **write every
result string about the school, never about the student.** "This school offers the
IT focus you said mattered" is process feedback about the school. "You're a great
fit for selective schools" is person feedback, and Brummelman's finding on praise
and shame makes that exact framing a real risk the moment a student sees a
rejection letter later.

**Chips.** Neutral fill, Secondary text, `data-sm` — metadata, not calls to action.

**Tooltips.** The one color inversion — On-surface fill, Surface text. But per the
research (Dhami & Mandel: 66% comprehension for inline bracketed interpretation vs.
40% for a tooltip vs. 32% control), **tooltips are not where consequential
interpretation lives.** Anything that changes what a student should conclude about a
school belongs inline, in the same viewport as the number or fact it explains —
tooltips here are for genuinely optional supplementary detail only.

## Motion — landing page (úvodní stránka)

**Sourcing:** researched via a dedicated prompt
(`design/research/landing_animation_research_prompt.md`), findings in
`design/research/landing_animation_research.md` (2026-08-28). Unlike the Mobbin
citations elsewhere in this file, the researcher had no live-browser/devtools
access — treat the *pattern classification* below as reliable, and any
specific "site X currently uses library Y" claim as inference, flagged
inline in the source file. Two things in that file ARE solidly sourced and
should be treated as settled: the accessibility guidance, and Duolingo's
general approach (small, character-centered idle loops via Lottie — per
LottieFiles' own published case study) even though the researcher could not
verify today's exact homepage frame-by-frame behavior.

**The actual pattern, corrected from an earlier draft of this section:** this
is an **idle animation** — ambient motion that plays continuously on its own,
no user action required — not a **scroll reveal** (entrances triggered by
scroll position) and not **hover effect**/**press feedback** (both of those
are ordinary interaction motion, covered in Do's/Don'ts below, and are a
different thing from what's being specified here). The landing page is the
one screen in the product where this kind of warmth-building motion belongs
at all — see the Do's/Don'ts note on why the quiz and results screens are the
opposite case.

**What ships:**
- **Exactly one idle animation**, small and contained — a corner
  illustration, an icon, or a subtle background gradient/shape **float** (a
  gentle, continuous drift with no fixed destination — the closest glossary
  term for this effect; there's no exact "gradient drift" entry). Never
  full-screen, never the literal subject of the hero (the headline and CTA
  stay the focal point). Research finding: scale and containment are what
  separate "polish" from "trying too hard" — a large central character
  playing its own idle animation reads as juvenile for a decision-context
  audience, a parent evaluating whether to pay specifically.
- **Slow and unvarying** — multi-second **loop**, eased (see Easing below),
  no sudden bursts or escalating gestures. Research finding: speed is the
  strongest signal here — slow, **ease-in-out** motion (the Linear/Stripe
  gradient-float register) reads premium/calm; a fast loop with **bounce**
  (spring overshoot) reads young, which is exactly the territory this
  product's parent-facing side cannot afford.
- **Technique, in priority order for this product's mobile-first, budget
  constraints:**
  1. CSS **keyframes** (gradient/shape float) — cheapest, GPU-cheap via
     `transform`/`opacity` only (**compositing**, not layout-triggering
     properties — see Performance below), zero JS cost after paint. Default
     choice.
  2. A single small Lottie or Rive **loop** (the actual Duolingo-style
     character/illustration idle-animation technique) — only if a designed
     illustration asset exists to animate. Cap the frame size, and pause it
     via `IntersectionObserver` when it scrolls off-screen — Lottie still
     executes JS per frame and is a real battery/perf cost on low-end
     Android, which is this product's actual acquisition-channel device
     profile (TikTok/Instagram referral, not flagship phones).
  3. WebGL/canvas and autoplay video loops are explicitly **not** recommended
     for this product — highest implementation and performance cost, and the
     research flags mobile load-time/Core Web Vitals cost as a documented,
     recurring critique of exactly this category on high-traffic sites.

**Explicitly out of scope, landing page included:**
- No mascot, no character playing a **bounce**-heavy idle animation, no
  confetti — confetti stays reserved for the in-product student reveal screen
  (see onboarding); spending it pre-signup burns the one payoff it has.
  Research names confetti/particle effects as the single highest-risk pattern
  for reading as childish/gamified on a first-impression, trust-building
  screen.
- No **number ticker** (digits rolling/counting up) or fake "calculating"
  states — a real stat can be present via an ordinary **fade in**, but does
  not get a live-computation-implying counter effect (see Colors → tertiary
  rule and the no-invented-numbers rule elsewhere in this file).
- No second competing idle animation — one loop only. Multiple simultaneous
  ambient loops dilute the "made, not templated" signal into visual noise,
  and compete with the CTA for attention.

**Always:** the idle animation is fully disabled under **reduced motion**
(`prefers-reduced-motion: reduce`), falling back to a static illustration or
the gradient's resting frame — no partial-motion compromise. This isn't just
house style here: the research confirms this setting exists because motion
(background/ambient motion specifically) can trigger real vestibular
symptoms, not just a stylistic preference. Matches the pattern already used
throughout onboarding (`usePrefersReducedMotion`), extended to the landing
page.

**Open question, flagged honestly by the research itself:** there is no hard
data quantifying "ambient motion vs. perceived trust" for this specific
teen+parent audience — Section 4 of the research file is design-practice
consensus, not a measured study. Validate the final choice with a few real
teen/parent reactions before treating this section as fully settled.

---

## ⚠️ ANIMATION BUILD INSTRUCTION — DO NOT IMPLEMENT YET

**This motion spec is DESIGN ONLY. Do not build these animations as part of normal frontend UI work.**

When the user explicitly says to build them:
1. Use **Claude Design's dedicated animation tool ONLY** — pass this entire "Motion — landing page" section + `design/research/landing_animation_research.md` to that tool
2. The animation tool handles implementation (Lottie/Rive/CSS, accessibility, performance), NOT hand-written component CSS
3. This is a separate, gated pass — do not merge animation implementation into routine frontend tasks
4. Needs explicit user trigger + right configuration before it runs

---

## Do's and Don'ts

- **Do** treat Primary (`#AD4F2A`) as CTA/selection/logo only — never body text,
  never a dense browsing screen. This is Monzo's own stated rule for their accent
  and it is the load-bearing discipline of this whole palette.
- **Don't** reintroduce navy, indigo-violet (`#6366F1`–`#9333EA`), or any prior
  accent from either previous version. Both were replaced for sourced reasons; see
  Colors.
- **Do** keep Tertiary (`#4F7143`) exclusively on match-strength signals. A second
  use anywhere — a generic success toast, a decorative checkmark — destroys the one
  signal it carries.
- **Don't** write a result, a label, or a headline that evaluates the student.
  "This school fits what you asked for" — yes. "You're a strong candidate" / "great
  match for you" — no. This is the direct, permanent replacement for the deleted
  report-card metaphor, and it applies to copy as much as to visual design.
- **Don't** build a "calculating your match…" spinner, a counting-up percentage, or
  any staged reveal at the results screen. Evaluative arousal peaks during
  *anticipation*, not just evaluation, at almost exactly this product's target age.
  If a hero moment belongs anywhere, it's the landing page, not the moment a
  15-year-old is about to learn what the app thinks.
- **Do** ship any consequential interpretation inline, in the same viewport as the
  fact it explains — never gated behind a tooltip or a "learn more."
- **Don't** add a shadow to something flat by convention; do add it where a card is
  genuinely meant to feel raised — see Elevation for the tinted-shadow recipe.
- **Do** pair every Error state with an icon and a written message, never color
  alone.
- **Don't** use pure `#FFFFFF` or `#000000` anywhere, including exported material.
  Every neutral in this system carries warmth.
- **Do** cap body measure at 65–70 characters.
- **Don't** center body or paragraph content.
- **Do** let search/filter/compare screens run denser than result and marketing
  screens — the density contrast is the primary way a user knows what kind of
  screen they're on.
- **Don't** build anything that resembles atlasskolstvi.cz: undifferentiated rows,
  no type hierarchy, dense unstyled data with no grouping.
- **Don't** use "kid," "junior," "mini," or "for young people" anywhere in copy or
  section labels. NN/g's research names this specifically as a teen repellent, and
  the market evidence (Greenlight's "kids" framing vs. Step's direct address) backs
  it up directly.
- **Do** use `data-md`/`data-sm` (Public Sans, tabular figures) for every grade,
  cutoff score, deadline, and DiPSy round number. No monospace anywhere in this
  system — see Typography.
- **Do** limit motion to **press/tap feedback** confirming an action, or a **layout
  animation** explaining a spatial change, using short, purposeful durations (~150ms
  for press feedback, ~250ms for a **crossfade**/state transition). **Don't** use a
  **scroll reveal** for section entrances *inside the quiz or at the results screen*,
  and don't animate the results reveal — see above. This rule is scoped to the
  evaluation surfaces specifically, where anticipation has to peak before the
  reveal, not the reveal itself. The landing page is the deliberate exception —
  see "Motion — landing page" above for what's allowed there and why the same
  logic doesn't apply pre-signup.
