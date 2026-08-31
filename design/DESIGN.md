---
version: alpha
name: ŠkolaMatch
description: A high school selection tool for Czech 9th graders and their parents — a searchable school database, an AI-matched questionnaire, and a paywall, built to be trusted with a once-in-a-lifetime decision.

colors:
  primary: "#35426E"
  primary-strong: "#263153"
  primary-subtle: "#E4E7F2"
  secondary: "#5C5750"
  tertiary: "#2E6B4E"
  tertiary-subtle: "#E3EDE6"
  neutral: "#F3F0E9"
  surface: "#FBF9F4"
  on-surface: "#1B1912"
  on-surface-faint: "#6E6858"
  border: "#E4DFD2"
  border-strong: "#D2CBB8"
  error: "#8C2F28"
  error-subtle: "#F3E1DE"

typography:
  display:
    fontFamily: Newsreader
    fontSize: 80px
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: 400
    lineHeight: 1.16
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 25px
    fontWeight: 400
    lineHeight: 1.22
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: 0.1em
  label-md:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum' 1"
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.01em
    fontFeature: "'tnum' 1"

rounded:
  input: 6px
  chip: 8px
  button: 8px
  card: 12px
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
  badge-match:
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

## Overview

ŠkolaMatch is used exactly once, by two different people, for the same decision. A
15-year-old fills out a questionnaire on a phone between classes. Their parent opens
the same result on a laptop a few days later, deciding whether to pay for it. Neither
is browsing — both are trying to get a high-stakes, irreversible choice right, and
both need to feel the product is credible enough to trust with it.

The register is **Archival Institutional**, borrowing its structure from an official
school record rather than from a consumer app: a class ledger, a *vysvědčení* (report
card), the stamped finality of an admissions decision. Crossed with **Soft Technical**
for the working screens — search, filter, compare — which need working density, not
archival stillness. The reference point named during intake was UWorld: serious,
unglamorous, built to be trusted with an exam that matters, not to charm.

What this direction commits to: restraint. One interactive color, one success color,
warm paper instead of white, hairline structure instead of shadow. What it gives up,
deliberately: **warmth-through-decoration and any sense of speed-as-a-feature**. This
is not a product that wants to feel fast or fun to open — it wants to feel like the
kind of document you'd keep. For a purchase made once, under real stakes, that felt
like the right trade over a livelier, more "appy" register that a returning-user
product would earn back over time.

**Explicit anti-reference:** atlasskolstvi.cz, the existing Czech school directory —
dense unstyled tables, no visual hierarchy, dated chrome, nothing legible at a glance.
ŠkolaMatch's whole value proposition is "the thing that site should have been," so
resembling it in any way — table-first layouts, undifferentiated rows, no typographic
hierarchy — is a direct product failure, not just a style miss.

**Scope note:** this pass covers **desktop/web** first, since that's what's being
built next. Mobile app layout is deferred to its own pass before public launch, but
reuses these same color, type, and spacing tokens — see "Layout" below for what
carries over and what doesn't.

## Colors

Every named color in this system is sampled from the material world of an actual
Czech school record — a signature, a mark, the paper itself — rather than picked from
a color wheel. That constraint, not preference, set the values.

- **Primary (#35426E):** *Fountain-pen ink blue* — the color of a signature on a
  *vysvědčení*. The system's only interactive color: buttons, links, active states,
  the questionnaire's selection outline. Text-safe on Surface at ~8.5:1, so
  interaction never needs a lighter stand-in variant. This deliberately replaces an
  earlier brand purple (`#aa3bff`) that sat inside the `#6366F1`–`#9333EA`
  indigo-violet range — the single most common unconsidered "AI brand color." Ink
  blue reads as chosen; that purple, on reflection, read as arrived-at.
- **Primary-strong (#263153):** The same ink, dried and set. Hover and active states
  only — never a standalone token elsewhere.
- **Primary-subtle (#E4E7F2):** A wash of the same ink on paper. Used only as the
  fill behind a selected option row, paired with a 1.5px Primary border — never a
  solid Primary fill on interface chrome, which would read as a button rather than
  a selection.
- **Secondary (#5C5750):** *Pencil graphite* — warm, not neutral grey. Metadata,
  captions, muted labels, unselected chip text.
- **Tertiary (#2E6B4E):** *Ledger green* — the color of a passing mark entered in a
  *třídní kniha* (class register). This is the **only** color in the system allowed
  to mean "good outcome," and it has exactly one job: marking match strength on a
  school result. It never appears as a generic success state, a decorative
  checkmark, or a confirmation toast — those use Primary or plain type weight
  instead. Its scarcity is what makes a strong match legible at a glance on a page
  of otherwise restrained color.
- **Tertiary-subtle (#E3EDE6):** Wash of Ledger Green, used only as the fill behind
  a match-strength badge.
- **Neutral (#F3F0E9) and Surface (#FBF9F4):** Two paper values a half-step apart —
  *vysvědčení* cardstock and the slightly lighter stock beneath it. Surface is the
  page and any raised content; Neutral is a half-step down, used for cards and
  option rows to separate them from the page without a shadow. Neither is white:
  R≠G≠B in both, carrying a trace of warmth so nothing in the interface reads as
  screen-glow.
- **On-surface (#1B1912):** Near-black ink, not `#000000` — it carries the same warm
  hue as the paper it sits on, which is what keeps body text from looking pasted on
  top rather than printed into the page.
- **On-surface-faint (#6E6858):** Placeholder text, disabled states, the least
  important label on a screen. Holds 5.27:1 against Surface — the linter enforces
  the same 4.5:1 floor for placeholder text as for body copy, so this is set to
  clear that bar with margin rather than at the lower threshold placeholder text
  is sometimes technically exempt from.
- **Border (#E4DFD2) and Border-strong (#D2CBB8):** Hairline rules. Border divides
  within a group; Border-strong separates groups from each other. Neither is ever
  used to "frame" a card — see Elevation.
- **Error (#8C2F28):** *Correction red* — the color of a teacher's red-pen mark on a
  wrong answer. Derived from the same warm family as Primary and Neutral, not
  imported from a stock alert palette, so a validation error still looks like it
  belongs to this document rather than to a different, more generic one.
- **Error-subtle (#F3E1DE):** Wash of Correction Red, used as the fill behind an
  invalid input — always paired with an icon and written message, never color alone.

All neutrals carry a small warm chroma (OKLCH hue ≈ 55–65, chroma 0.004–0.012); none
are `R=G=B`. Primary, Tertiary, and Error were each built as short OKLCH ramps with
chroma peaking mid-lightness and hue bending 6–10° across the ramp, so each reads as
a material rather than a flat swatch — the visible artifact of that is
Primary-strong sitting slightly more violet-shifted than Primary itself, the way ink
actually darkens.

### Dark mode

Both themes are first-class — this is a decision app people return to over the
trial period, sometimes at night, and a light-only interface would be a real gap,
not a deferred nice-to-have. Dark mode here is a **separate design**, not an
inversion, per the standard cautions: chroma is pulled down roughly 15–20% from the
light values above, nothing is pure black, and elevation logic inverts (raised
surfaces get *lighter*, not shadowed).

```
bg:              #0F0E0C   (near-black, warm-tinted — never #000)
surface-raised:  #17150F
surface-overlay: #201D16
on-surface:      #EDE9E0   (not pure white — reduces fatigue on long reads)
on-surface-faint: #A39C8C
border:          #2C2820
primary (dark):  #8FA3D6   (lifted + desaturated — the light-mode ink blue,
                             #35426E, sinks into a dark ground and stops reading
                             as interactive; this is the "some colors don't
                             survive" case, not an inconsistency)
tertiary (dark): #7FC49F   (lifted Ledger Green, same reasoning)
error (dark):    #D98A80   (lifted Correction Red, same reasoning)
```

These are specified here as the design decision, not yet as `components` tokens —
the DESIGN.md component schema has no first-class per-theme variant mechanism, so
wiring a dark `components` block is an implementation task for whoever builds theme
switching, not a gap in this document. The values above are normative regardless.

## Typography

Two families, split by job, plus a mono for anything counted rather than read.

**Newsreader** carries the voice — display and every headline. It is used at a
single weight, 400, everywhere, on purpose: gravity comes from size and slightly
negative tracking, never from bold. A serif that got heavier at every heading level
would start to feel like a stack of headlines shouting over each other; this one
stays quiet and lets scale do the work. It also carries full Czech diacritics
cleanly at every size tested, which a lot of display serifs do not. Fallback:
`Newsreader, Georgia, "Times New Roman", serif`. SIL Open Font License, self-hosted.

**Hanken Grotesk** carries the apparatus — body copy, UI labels, buttons, captions.
A humanist grotesque with a high x-height that holds up at 13px on a phone screen
without going ragged, and full Czech diacritic support. It is deliberately not
Inter: functionally similar, but Inter's ubiquity would make the Newsreader pairing
read as an accident rather than a decision. Two weights only — 400 for reading, 600
for anything that needs to be scanned rather than read (labels, buttons, uppercase
eyebrows) — spaced far enough apart that the jump reads as intentional. Fallback:
`"Hanken Grotesk", system-ui, "Segoe UI", sans-serif`. SIL Open Font License,
self-hosted.

**JetBrains Mono** carries counted things — grades, deadlines, the DiPSy
application-round numbers, admission-cutoff scores. Tabular figures are enabled
(`'tnum' 1`) so a column of grade thresholds actually aligns instead of jittering.
Nothing else uses it; a mono applied to prose reads as a mistake, not a choice.
Fallback: `"JetBrains Mono", ui-monospace, Consolas, monospace`.

The scale runs 11 → 80px, generated at a 1.25 ratio from a 16px body and hand-broken
at the top — the generated top step (61px) was too timid for the marketing/hero
context, so Display was pushed to 80px to create a real jump rather than a
progression. Tracking is optical: −0.03em at Display, tightening less at each
smaller headline step, neutral through body, +0.1em on uppercase labels.
Line-height moves inversely with size: 1.04 at Display, 1.55–1.6 at body, 1.3–1.45
at labels and captions.

## Layout

**Desktop (current focus):** a 12-column grid, 1280px max content width, 24px
gutters, 64px outer margin. This is deliberately wide-margined rather than
edge-to-edge — the parent persona is reading and comparing on a laptop, not
scanning a dashboard, and margin is what makes a page feel considered rather than
stretched to fill the viewport. Below 1024px the grid collapses to 6 columns with
32px margins; below 768px, a single column with 16px margins picks up where the
existing mobile onboarding flow's 26px screen padding leaves off — the two aren't
identical yet, and reconciling them is part of the mobile pass, not this one.

**Spacing** runs on a strict 8px base (`sm`/`md`/`lg`/`xl`/`xxl`/`xxxl`) with a 4px
half-step (`xs`) for micro-adjustments inside chips and form controls. Nothing sits
off this scale.

Density varies on purpose. **Marketing and result screens** (the paywall, the match
explanation) get generous rhythm and the full Display/Headline range — they're read
once, slowly, and need to justify a payment. **Search, filter, and compare screens**
tighten to 8–12px row padding and lean on `body-sm`/`data-sm` — these are used
repeatedly, by someone comparing many schools, and density there is a feature. This
contrast — not color, not weight — is the primary signal for which kind of screen a
user is on.

Layout is asymmetric where the grid allows it: content flush-left, with the right
margin on wide viewports reserved for secondary context (a comparison rail, a
"why this match" annotation) rather than centered on the page. Centered body text
does not appear anywhere in this system.

## Elevation & Depth

Structure comes from **hairlines and tone**, not shadow — this carries over from the
existing mobile onboarding work and is one of the few decisions from before this
pass worth keeping unchanged, because it's already correct.

1. **Tonal layering** — the Surface → Neutral half-step. A card or option row is a
   slightly different paper stock laid on the page, not a floating object.
2. **Hairline rules** — `divider` (1px Border) between related items, `divider-strong`
   (1px Border-strong) between unrelated groups. Rules divide; they do not wrap
   around content to fake a box.
3. **Space** — the primary grouping device. Related fields sit at `sm`/`md`
   distance, unrelated sections at `xxl`/`xxxl`. Most apparent "needs a shadow"
   problems in this system are actually spacing problems.

Shadow is reserved for things genuinely above the page: modals, dropdowns, the
phone-frame chrome in the mobile onboarding mockups. When used, it is tinted from
On-surface (`rgba(27,25,18,.05)` tight + `rgba(27,25,18,.18)` wide at 40px blur), a
top-down light direction, never neutral black. A static card is never shadowed.

## Shapes

Radius is small and hierarchical, and noticeably tighter than the existing mobile
onboarding system (which ran 14–18px). That tightening is a deliberate sacrifice:
less soft, more precise — the register this pass is targeting is "an institution
you'd trust with a decision," and generous rounding reads as consumer-app friendly
in a way that undercuts that. Inputs and chips get the smallest radius (6–8px),
buttons a touch more (8px), cards the most (12px) — never inverted, and never
uniform. `full` (9999px) is reserved for the match-strength badge and any pill-style
progress indicator, marking them as a distinct visual class rather than a container.

Borders are 1px solid Border at rest; selected/focused states use 1.5px Primary,
never a heavier weight — the selection rule from the existing system (1.5px accent
border + tinted fill, never a solid fill) carries over unchanged.

## Components

**Buttons.** Primary is a solid Primary fill with Surface text in `label-md` —
sentence case, not uppercase; this is a decision app, not a landing page, and
shouting labels would undercut the register. Secondary is a Surface fill with a
Primary-colored label, no visible border unless hovered. There is no tertiary or
ghost button — if a screen needs a third action, the screen has too many actions.

**Inputs.** Surface fill, 1px Border, `body-md` — full body size rather than a
smaller UI size, because these are often filled out carefully, once, for something
that matters. Placeholder text uses On-surface-faint (`input-placeholder`) — still
legible, clearly secondary. Error state switches fill to Error-subtle and text to
Error, always paired with an inline icon and message, never color alone.

**Option rows** (the questionnaire's answer choices). Unselected: Surface fill, 1px
Border. Selected: Primary-subtle fill, 1.5px Primary border — never a solid Primary
fill, which would read as a button and undercut the sense that this is a considered
choice, not a click.

**Cards.** Neutral fill, `card` radius, `lg` padding, no border and no shadow — the
Surface→Neutral tonal step does the separating work alone. Cards are for genuinely
discrete objects (one school, one saved comparison) — a list of facts about a school
is a list with hairline rules, not a stack of nested cards.

**Chips** (program tags, filter pills). Neutral fill, Secondary text, `data-sm` —
these are metadata, not calls to action, and use the graphite color accordingly.

**Match badge.** The only component allowed to use Tertiary. Pill-shaped,
Tertiary-subtle fill, Tertiary text, `label-caps`. Shows a band ("Silná shoda,"
"Dobrá shoda"), never a bare percentage — this matches the existing scoring engine's
decision to drop unearned precision, and the visual treatment should reinforce that
rather than fight it with a number-shaped UI.

**Tooltips.** The one color inversion in the system: On-surface fill, Surface text.
150ms delay in, no delay out.

## Do's and Don'ts

- **Do** keep Tertiary (`#2E6B4E`) exclusively on match-strength indicators. A
  second use anywhere — a generic success toast, a decorative checkmark — destroys
  the one signal it's meant to carry.
- **Don't** reintroduce the previous brand purple (`#aa3bff`) or anything in the
  `#6366F1`–`#9333EA` range as a primary color. It's the most common unconsidered
  AI-brand-color range and this system replaced it with a sourced value on purpose.
- **Do** use Primary for exactly one job per screen: the primary action, or the
  active/selected state. Never decoration, never a heading color, never a border
  applied just for visual interest.
- **Don't** add a shadow to a static card or row. If something needs to feel raised,
  use the Surface→Neutral tonal step or a hairline rule first.
- **Do** pair every Error state with an icon and a written message — never color
  alone. Roughly 8% of the audience (skewed toward the parent persona, statistically)
  cannot reliably distinguish red from green.
- **Don't** use pure `#FFFFFF` or `#000000` anywhere, including exported PDFs or
  print styles. Every neutral in this system carries a trace of warmth, and an
  untinted value next to them reads as a defect, not a highlight.
- **Do** cap body text measure at 65–70 characters. Match explanations and school
  descriptions are read, not skimmed.
- **Don't** center body text or paragraph content. Headlines may center only on the
  narrowest mobile breakpoint where a flush-left headline would look accidental;
  everything else is flush-left.
- **Do** let search/filter/compare screens run denser than result and marketing
  screens. That density contrast is the primary way a user knows what kind of
  screen they're on — don't flatten it for visual consistency.
- **Don't** build anything that resembles atlasskolstvi.cz: undifferentiated table
  rows, no type hierarchy, dense unstyled data with no visual grouping. If a screen
  starts to look like a spreadsheet, that's a structural regression, not a styling
  detail to fix later.
- **Do** use `data-md`/`data-sm` for every grade, cutoff score, deadline, and DiPSy
  round number. Set in Hanken Grotesk, columns of figures will not align.
- **Do** limit motion to confirming an action or explaining a spatial change —
  a selection filling in, a card expanding — using short, purposeful durations
  (~150ms state changes, ~250ms transitions). **Don't** animate section entrances
  on scroll or fade anything the user is actively trying to read; both delay
  comprehension for decoration this register doesn't want.
