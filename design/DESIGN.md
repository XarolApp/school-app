---
version: alpha
name: ŠkolaMatch
description: A high school selection tool for Czech 9th graders and their parents — a searchable school database, an AI-matched questionnaire, and a paywall, built to feel like a trusted advisor rather than an institution grading you.

colors:
  primary: "#1C58A3"
  primary-strong: "#16467F"
  primary-subtle: "#E1EAF6"
  secondary: "#4B525B"
  tertiary: "#2C7340"
  tertiary-subtle: "#E0EFE3"
  neutral: "#EAEDEF"
  surface: "#F5F6F7"
  on-surface: "#15191E"
  on-surface-faint: "#5F6670"
  border: "#DCE0E4"
  border-strong: "#C4CBD2"
  error: "#B0271F"
  error-subtle: "#F7E1DF"

typography:
  display:
    fontFamily: Archivo Narrow
    fontSize: 72px
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Archivo Narrow
    fontSize: 38px
    fontWeight: 600
    lineHeight: 1.14
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Archivo Narrow
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Archivo Narrow
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
  body-lg:
    fontFamily: Archivo
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Archivo
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Archivo
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Archivo
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  label-caps:
    fontFamily: Archivo
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.08em
  label-md:
    fontFamily: Archivo
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0
  data-md:
    fontFamily: Archivo
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "'tnum' 1"
  data-sm:
    fontFamily: Archivo
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

> **Third revision, 2026-09-24: colour and type changed, everything else kept.**
> The cream paper + warm serif + terracotta combination of the second version had
> become one of the most recognisable looks of AI-generated sites, and it made the
> product read as "vibe coded" even where the layout was right. The founder compared
> three directions rendered on the real /skoly page
> (https://claude.ai/artifact/KziG32Ki2KCagBrM5eZE1G) and chose **Značka** as the
> default, with the other directions kept as user-selectable colour themes (see
> Colors → Themes). The research, the metaphor rules, the match-indicator reasoning,
> the motion rules and the anti-references below all still apply unchanged; only the
> palette, the typefaces and the prose that named them were rewritten.

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
   `design/system`, `design/system` wins, full stop.

   **Match the search platform to the surface being designed.** Mobbin's `platform`
   parameter (`ios` / `web`) must reflect what is actually being built: desktop layout
   → `web`, phone layout → `ios`, both surfaces → run both searches and keep the
   evidence separate. Layout answers legitimately diverge by surface — two plan cards
   sit side by side on essentially every web pricing page and stack on a 390px phone —
   so an iOS reference cannot justify a desktop decision, or the reverse. The ten screens cited here are a
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

**The referent: Czech tourist trail markings (turistické značení).** The white–blue–white
stripe painted on trees, the one every Czech child has followed on a school trip. It is
the most familiar local sign for *this is the way, you are not lost*, which is the exact
feeling a 15-year-old choosing between 223 schools is missing. It is a sign you follow
by choice, never an instrument that grades you, so it obeys the metaphor rule above.
The colours are the KČT trail colours, pulled down in chroma until they read as a
product rather than as paint: blue for the path you take next, green for "this fits
what you asked for", red only for something that needs fixing.

- **Primary (#1C58A3), trail blue:** the next action. Primary CTA, the questionnaire's
  selection state, the active filter's badge, links where a link is the action. Never
  body text, never decoration, never a large fill behind content. Surface text on it
  holds 6.5:1. Blue is the most common trust colour there is, which is exactly why it
  is not allowed to carry the identity on its own: the trail story, the condensed
  signage type and the restraint do that. A generic "trust blue" used everywhere would
  be the median answer this system exists to avoid.
- **Primary-strong (#16467F):** hover and pressed states only.
- **Primary-subtle (#E1EAF6):** the wash behind a selected option row or a selected
  school, always paired with a 1.5px Primary border. Never a solid Primary fill on
  interface chrome. Its one other job: it may tint **one guidance area per screen**
  (on `/skoly`, the "Nevíš, kde začít?" block), the place a student who doesn't know
  what to do next should look first. Icons inside that area may take Primary. Added
  2026-09-26 (plan 015) because a strict "accent on one element only" rule left the
  1280px desktop almost colourless; the phone never had that problem because the same
  few coloured elements fill a small screen. Solid Primary is still one thing per
  screen.
- **Secondary (#4B525B):** blue-leaning graphite for metadata and captions, 7.3:1.
- **Tertiary (#2C7340), trail green:** match strength and nothing else, exactly the
  job moss had in the previous version. 4.85:1 on its own wash, and readable as plain
  text on the page, because 30+ stylesheet rules use it as text.
- **Tertiary-subtle (#E0EFE3):** the wash behind a match indicator.
- **Match strength has three levels** (plan 015): 85 % and up is a solid badge
  (`matchFill` with `matchInk` text, per theme, so Zvýrazňovač can use its real
  highlighter yellow), 70–84 % is the Tertiary-subtle wash with Tertiary text, and
  under 70 % is Tertiary text in a 1px Border-strong outline. Colour lands on the best
  fits instead of sitting evenly on every row. The number is always shown, so the
  level is never colour alone.
- **Neutral (#EAEDEF) and Surface (#F5F6F7):** a cool, faintly blue-grey paper, the
  colour of a trail sign's enamel, not of cream stock. This deliberately gives up the
  Rello & Bigham warm-background reading advantage the previous version cited; that
  study measured reading speed on long passages, and this product's screens are
  scanned rather than read. Long-form reading surfaces (reviews, the privacy policy)
  keep body text at 65–70ch to compensate. Neither value is white; R≠G≠B in both.
- **On-surface (#15191E):** near-black carrying a trace of the blue, 16.3:1. This is
  still the layer doing the credibility work.
- **On-surface-faint (#5F6670):** placeholder, disabled and tertiary text. 4.8:1 on
  Surface and 4.5:1 on Neutral, the tighter of the two.
- **Border (#DCE0E4) and Border-strong (#C4CBD2):** hairlines. Division, not boxes.
- **Error (#B0271F), trail red:** "this needs fixing" (a required field, a failed
  payment), never "this is wrong about you". Always with an icon and a written
  message. 6.2:1.
- **Error-subtle (#F7E1DF):** wash behind an invalid input.

Every neutral carries a small blue chroma; none is `R=G=B`, and neither `#FFFFFF` nor
`#000000` appears anywhere. The logo mark is the one place the trail stripe appears
literally, as a small white–blue–white flag; it is never used as a decorative band,
a card rail or a section divider.

### Themes: the palette is user-selectable

Značka is the default. Three other palettes ship as colour themes the student picks in
Nastavení → Vzhled, each in light and dark, alongside a mode setting (system, light,
dark). The choice is saved to the account. This is the IKEA-effect finding from
`docs/sources/claude_code_ui_ux_guide.md` (people value what they customised), applied
to something cheap to offer because every colour is already a token.

| Theme | Referent | Primary | Match (tertiary) | Gives up |
|---|---|---|---|---|
| **Značka** (default) | Czech trail markings | trail blue `#1C58A3` | trail green `#2C7340` | trendiness |
| **Smrk** | Šumava spruce, birch resin | spruce `#1D5842` | resin amber `#855A13` | energy |
| **Zvýrazňovač** | a student's highlighter | ink `#151412` (buttons are solid ink) | highlighter olive `#6B5300` on yellow `#F9E27E` | calm; yellow must stay rare |
| **Terakota** | the previous version's palette, kept for people who liked it | terracotta `#AD4F2A` | moss `#4F7143` | the AI-cluster look, knowingly |

Rules that make themes safe:

1. **Themes change colour tokens only.** Type, spacing, radius, shadow shape and every
   component are identical across themes. A theme that needs its own CSS rule is not a
   theme, it is a fork; express the difference as a token or drop it. (This is why
   Zvýrazňovač's marker-underline under key numbers, shown in the concept, did not
   survive into the theme.)
2. **Every theme fills every token**, in light and dark, and every text pair passes
   WCAG AA 4.5:1: ink, ink2 and ink3 on bg/surface/surface2, accentInk on accent,
   accent on bg, ok on bg/surface2/okSoft, danger on bg/dangerSoft, ink on accentSoft.
   All eight combinations were checked numerically on 2026-09-24.
3. **Semantic roles hold across themes.** Primary is always the next action, tertiary
   is always match strength, error is always "needs fixing". A theme can change what
   the colour is, never what it means.
4. **No component may hardcode a colour.** A literal hex or rgba in a stylesheet is
   now a bug in three extra themes, not a style nit.

The exact values for all four themes live in `frontend/src/design/tokens.js`
(`palettes`), which is the source of truth for the web app and the future mobile app.

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

Both modes are first-class, per theme. Dark is a separate design, not an inversion:
chroma pulled down, nothing pure black, and elevation inverts (raised surfaces get
*lighter*). Značka dark:

```
bg:               #131518   (near-black with the trail blue's trace, not navy-slate)
surface-raised:   #1A1D21
surface-overlay:  #22262B
on-surface:       #E7EAEE
on-surface-faint: #939BA5
border:           #2A2F35
primary (dark):   #7FA8E6   (lifted and desaturated; #1C58A3 sinks into a dark ground)
tertiary (dark):  #7DC08E
error (dark):     #EE8A80
```

The other themes' dark values are in `tokens.js`.

## Typography

Two families, split by classification, and — this is the single most consequential
change from the previous version — **no monospace anywhere.** The research names
this explicitly: monospace numerics were "the single strongest dev-tool signal in
the first pass and it buys nothing here." Tabular alignment is available in a normal
sans via `'tnum'`; a code-editor typeface is not required to make a column of grades
line up.

**Archivo Narrow** carries the voice: display, every headline, school names in
lists. **Archivo** carries the apparatus: body, labels, buttons, captions and data.
One family in two widths, chosen for the same reason the trail signs use a condensed
grotesque: a narrow face says a lot in little width, stays legible at a glance, and
sounds certain without shouting. On a 390px phone, a condensed heading fits a long
Czech school name on two lines where a serif needed three.

This replaces Lora + Public Sans (2026-09-24). The serif was part of the cream-paper
look the founder rejected, and pairing it with a neutral sans had become a template
rather than a decision. Using one superfamily in two widths is a deliberate exception
to the "pair across classifications" habit: the contrast between the two roles comes
from width and weight, not from a second family, which also halves the font download.
Two weights only, 400 for reading and 700 for anything scanned, with 600 allowed for
headline sizes where 700 closes up the counters. Tabular figures (`'tnum' 1`) on
`data-md`/`data-sm`. Full Czech diacritic support in both widths. Fallbacks:
`"Archivo Narrow", "Arial Narrow", system-ui, sans-serif` and
`Archivo, system-ui, "Segoe UI", sans-serif`. SIL Open Font License, loaded from
Google Fonts until self-hosted.

Themes never change typefaces (Colors → Themes, rule 1).

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

- **Do** treat Primary (trail blue `#1C58A3`, or the active theme's primary) as
  next-action/selection only, plus the icons inside the one Primary-subtle guidance
  area a screen may have. Never body text, never decoration. This is Monzo's own
  stated rule for their accent and it is the load-bearing discipline of every theme.
- **Don't** introduce navy-slate darks, indigo-violet (`#6366F1`–`#9333EA`), or a
  fifth theme without filling every token in both modes and passing the contrast
  pairs in Colors → Themes. Terakota survives only as an opt-in theme, never as a
  default.
- **Do** keep Tertiary (trail green `#2C7340`, or the active theme's tertiary)
  exclusively on match-strength signals. A second
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
- **Do** use `data-md`/`data-sm` (Archivo, tabular figures) for every grade,
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
