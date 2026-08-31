# ŠkolaMatch — Design System

**Version:** alpha · **Source of truth:** `uploads/DESIGN.md` (v2, the corrected direction)

## What ŠkolaMatch is

A high school selection tool for Czech 9th graders and their parents. Three surfaces
make up the product: a **searchable school database**, an **AI-matched
questionnaire**, and a **paywall**. The positioning, in the founder's own words:
*"trustworthy in a calm way, without being a people-pleaser — real results you can
trust, not flattery."*

Two users, one artifact. A 15-year-old fills in the questionnaire on a phone, stressed
about an irreversible decision. Their parent opens the same result on a laptop days
later, deciding whether to pay. Everything in this system is a resolution of that
tension.

### Register

**Revolut / Spotify — not Notion / Linear, not Duolingo.** The first DESIGN.md for this
product landed on archival-institutional plus soft-technical (navy, monospace numerics,
hairline structure, a report-card metaphor) and the founder's reaction on seeing it
rendered was that it looked like GitHub, n8n, or Supabase. This system is the
correction: warmth in the brand layer, sobriety in the interface layer.

### Anti-references

- **atlasskolstvi.cz** — the incumbent Czech school directory: dense unstyled tables,
  no hierarchy, dated chrome. ŠkolaMatch's value proposition is being what that site
  should have been. Resembling it is a product failure.
- **GitHub / n8n / Supabase** — anything reading as a developer tool, an admin panel,
  or "professional but cold" has failed the brief.
- **Family (crypto wallet)** — cute-mascot illustration overload; what "warm" looks
  like when it tips into childishness this product cannot afford.

### The metaphor rule

There is **no institutional-document metaphor anywhere** in this system — no report
cards, no class register, no teacher's correction pen. Sensitivity to social
evaluation peaks around age 15.3 (Somerville et al., fMRI, n=69), with arousal
elevated during *anticipation* as much as evaluation. A product about to tell a
15-year-old what it thinks of their choices cannot visually rhyme with being graded.
Where a colour or form needs a referent, it comes from something a person owns and
likes — never an instrument that judges them.

### Sources given to this project

- `uploads/DESIGN.md` — the full design direction (tokens + prose). The only source
  supplied.
- Referenced from inside that file but **not supplied to this project**, so not read
  here: `docs/sources/design_direction_research.md` (131KB research doc),
  `docs/sources/design_direction_interview.md`, `docs/sources/landing_animation_research.md`,
  `docs/sources/landing_animation_research_prompt.md`. Ten Mobbin reference screens are
  cited by URL in DESIGN.md; Mobbin was not queried while building this system.
- **No codebase, no Figma file, no logo files, and no font binaries were provided.**
  See Caveats.

---

## CONTENT FUNDAMENTALS

**Language.** Czech, primary. All product copy, labels, and data in this system's
examples is Czech. Keep diacritics intact — both typefaces have full Czech coverage.

**Person.** The student is addressed **informally, second person singular** (*ty* /
"Odpovíš na dvacet otázek"), the way a counselor talks, not an institution. Parent-facing
and payment surfaces switch to formal *vy* ("Zadejte pět číslic"). The product never
says *my* ("we") to claim authority — it states facts and where they came from.

**The load-bearing copy rule: write every result string about the school, never about
the student.**

- Yes: "Nabízí IT zaměření, které jste označili jako důležité." "Loňská hranice přijetí
  byla 54,5 bodu."
- No: "Jsi silný kandidát." "Skvělá shoda pro tebe!" "You're a great fit."

Process feedback about the school is safe. Person feedback is a real risk the moment
a student later sees a rejection letter.

**Casing.** Sentence case everywhere, including buttons — "Zobrazit výsledky", not
"ZOBRAZIT VÝSLEDKY". The only uppercase in the system is `label-caps` (11px, +0.08em),
used for the match indicator and small section eyebrows.

**Tone.** Calm, concrete, sourced. Numbers are given with their year and unit
("Hranice 2025 · 54,5 bodu"). Nothing is invented — no fabricated statistics, no
counting-up counters implying live computation. No urgency, no scarcity, no
exclamation marks in product UI.

**Banned words.** "kid", "junior", "mini", "for young people", "pro mladé" — named
specifically in NN/g's teen research as repellents. Also banned: any flattery, any
superlative about the user.

**Emoji: never.** Not in UI, not in copy, not in section labels. Icons are line SVGs
(see Iconography).

**Measure.** Body copy capped at 65–70 characters (`--measure: 66ch`). Body and
paragraph content is never centered.

**Interpretation goes inline.** Anything that changes what a student should conclude
about a school sits inline, in the same viewport as the fact it explains — never
behind a tooltip or a "learn more". (Dhami & Mandel: 66% comprehension for inline
bracketed interpretation vs. 40% for a tooltip.)

---

## VISUAL FOUNDATIONS

### Colour architecture

Three layers, never more:

1. **One warm, desaturated accent** (`--primary` #AD4F2A, Prague terracotta at golden
   hour) — CTAs, the questionnaire's selection state, the logo. Banned from body text,
   from long-form reading surfaces, and from dense browsing screens. This restraint is
   the load-bearing discipline of the whole palette.
2. **Warm-neutral ground** — `--surface` #FAF6EF and `--neutral` #F1ECE3, two paper
   values a half-step apart, covering 90%+ of every screen.
3. **A very dark, warm-tinted anchor** — `--on-surface` #221A13, which does the actual
   credibility work. Not #000000.

**Nothing in this system is pure white or pure black, and no neutral has R=G=B.** Warm
backgrounds also read measurably faster than cool ones against black text (Rello &
Bigham, ASSETS 2017, n=341) — a readability finding, cited for that and nothing more.

`--tertiary` (#4F7143, warm moss) has exactly **one** job: marking match strength. Not
a generic success colour, not a decorative checkmark. `--error` (#7A3020) is a muted
warm brick drawn from the same warm family as Primary — deliberately not a stock alert
red and explicitly not "a teacher's red pen".

Primary, Tertiary and Error each exist as short ramps (700/500/300/100) with chroma
peaking mid-lightness, so each reads as a material rather than a flat swatch.

**Dark mode is a separate design, not an inversion.** Chroma pulled down 15–20%,
nothing pure black, elevation logic inverted (raised surfaces get *lighter*), and
Primary/Tertiary/Error lifted so they still read as interactive on a dark ground.
Scoped under `[data-theme="dark"]`.

### Type

Two families. **No monospace exists in this system** — tabular alignment comes from
`'tnum' 1` in a normal sans; monospace numerics were the strongest dev-tool signal in
the rejected first version.

- **Fraunces** (variable serif, SIL OFL) carries the voice: Display and all headlines,
  weight 500–600 with the `SOFT` axis engaged (35–60, easing down as size drops) and
  `opsz` matched to size. Warmth without losing authority.
- **Public Sans** (SIL OFL) carries the apparatus: body, labels, buttons, captions,
  data. Two weights only — 400 for reading, 600 for scanning.

Scale 11 → 72px. Tracking is optical: −0.02em at Display, easing toward neutral through
body, +0.08em on uppercase labels. Line-height moves inversely with size: 1.06 at
Display, 1.55–1.6 at body.

### Layout & spacing

12-column grid, 1280px max content width, 24px gutters, 64px outer margin. Below
1024px: 6 columns, 32px margins. Below 768px: single column, 16px margins. Spacing is a
strict 8px base with a 4px half-step.

**Density varies on purpose, and the contrast is how a user knows what kind of screen
they are on.** Marketing and result screens breathe — generous rhythm, the full
Display/Headline range, read once and slowly. Search, filter and compare screens stay
dense — 8–12px row padding, `body-sm`/`data-sm` — because someone comparing thirty
schools is served by efficiency, not air.

Layout is **asymmetric and flush-left**. Wide viewports reserve the right margin for
secondary context rather than centering content. Centered body text appears nowhere.

### Backgrounds & imagery

Flat warm-neutral fills. **No gradients as decoration, no repeating patterns, no
textures, no grain, no full-bleed colour washes.** (The one exception is the landing
page's single ambient loop, which may be a very subtle gradient/shape drift — see
Motion.) Where warmth needs to come from imagery, it comes from **real photography of
real people**, warm-toned and unfiltered — not illustration, not mascots, not stock
gradients. **No illustration assets were supplied**, so no illustration appears in this
system; the UI kit uses neutral placeholder blocks where photography belongs, labelled
as such.

### Elevation & depth

Three devices, in order of preference:

1. **Tonal layering** — the surface → neutral half-step. Primary separation for
   anything not genuinely floating.
2. **Soft, palette-tinted shadow** — `0 1px 2px rgba(34,26,19,.06), 0 8px 24px
   rgba(34,26,19,.10)`, top-down, tinted from On-surface, never neutral black.
   Noticeably softer and lower-contrast than a typical SaaS shadow: present, not heavy.
   Allowed on cards and raised rows, not only modals — a deliberate trade of some of
   the rejected version's institutional gravity for warmth.
3. **Hairline rules** — `--border` divides related groups, `--border-strong` divides
   unrelated ones. Hairlines divide; they never frame a card as a box.

Shadow goes on things that genuinely benefit from separation — cards, modals,
dropdowns. Never on something flat by convention alone.

### Shape

Radius is **hierarchical, never uniform, never inverted**: inputs 10px, chips and
buttons 12px, cards 20px, `full` (9999px) reserved for the match indicator and
pill-style progress so they read as a distinct visual class. The generous end of this
range (8–20px, up from the first version's 6–12px) is deliberate: weak visual
signifiers cost real time (NN/g eyetracking: +22% time, +25% fixations).

Borders are 1px solid `--border` at rest. Selected and focused states switch to
**1.5px `--primary`** — with padding reduced by 0.5px so nothing shifts.

### Cards

`--neutral` fill, 20px radius, `--space-lg` padding, soft tinted shadow, **no border**.
Reserved for genuinely discrete objects — one school, one saved comparison — not a
default wrapper around any group of facts. `raised={false}` swaps shadow for a hairline
border when a card sits inside an already-raised container.

### Interaction states

- **Hover, primary button:** fill darkens to `--primary-strong`. **Never** opacity.
- **Hover, secondary button:** fill goes `--surface` → `--neutral`, label darkens, a
  `--border-strong` border appears (it is invisible at rest).
- **Hover, rows and cards:** fill goes `--surface` → `--neutral`; interactive cards lift
  1px. No scale-up, no colour flashes.
- **Press:** no shrink, no bounce — the darkened fill is the whole feedback.
- **Selected:** `--primary-subtle` wash plus a 1.5px `--primary` border. Never a solid
  Primary fill on interface chrome; that reads as a button, not a considered choice.
- **Focus:** 1.5px `--primary` outline, 2px offset, always visible for keyboard users.
- **Disabled:** 45% opacity, `not-allowed` cursor.

### Motion

Short and purposeful: **~150ms state changes, ~250ms transitions**, standard ease-out.
Motion confirms an action or explains a spatial change — nothing else.

**Banned on the evaluation surfaces:** no scroll-triggered section entrances inside the
quiz, no animated results reveal, no "calculating your match…" spinner, no counting-up
percentage, no staged reveal of any kind. Evaluative arousal peaks during anticipation.

**The landing page is the one deliberate exception:** exactly one small, contained,
slow ambient loop (multi-second cycle, eased, `transform`/`opacity` only) — a corner
element or subtle gradient drift, never full-screen, never the hero's subject. No
mascot, no confetti, no second competing ambient element. Fully disabled under
`prefers-reduced-motion: reduce` with a static resting frame.

⚠️ **The ambient landing animation is DESIGN ONLY and is not implemented in this
system.** DESIGN.md gates it behind an explicit user trigger and a dedicated animation
pass. Do not merge it into routine frontend work.

### Transparency & blur

Effectively unused. No glassmorphism, no backdrop blur, no translucent chrome. Overlays
use an opaque `--surface` panel over a plain `rgba(34,26,19,.4)` scrim. Transparency
appears only inside the shadow recipes and the link underline tint.

---

## ICONOGRAPHY

**No icon set, icon font, sprite sheet, or SVG assets were supplied with DESIGN.md**,
and DESIGN.md itself specifies no icon system. Nothing has been drawn or invented to
fill the gap.

What this system therefore uses, and what it needs from you:

- **Inline stroked SVG glyphs, drawn from a Lucide-compatible geometry** — 24×24
  viewBox, `stroke="currentColor"`, `fill="none"`, 2–2.2px stroke, round caps and
  joins, no fills. Rendered at 12–20px. Only a handful appear anywhere in this system:
  a check (`OptionRow`, `Checkbox`, `MatchIndicator`), a dash (unmet criterion), an
  alert circle (`Input` error), an ✕ (`Chip` dismiss), and a magnifier + chevron in
  the UI kit.
- ⚠️ **SUBSTITUTION FLAGGED:** the stroke geometry above is the Lucide house style,
  chosen as the closest match to a warm-but-credible system with generous radii. It is
  a substitution, not a source-derived decision. If ŠkolaMatch has an icon set, supply
  it and this should be replaced. If it does not, add Lucide from CDN
  (`https://unpkg.com/lucide@latest`) rather than growing the hand-inlined set.
- **Emoji: never**, in any surface, per Content Fundamentals.
- **Unicode as iconography: never** — no ✓ ✕ → characters standing in for icons in
  product UI. (The one exception is the Do/Don't specimen card, which is documentation,
  not product.)
- **No logo mark exists.** No logo file was supplied and none has been drawn. The
  wordmark "ŠkolaMatch" is set in **Fraunces 600 with `SOFT` engaged**, in
  `--primary` on light grounds or `--surface` on a Primary ground. This is the
  documented placeholder wherever a mark would go — including the project thumbnail —
  until real logo files arrive.

---

## Index

### Root
- `styles.css` — the single entry point consumers link. `@import` lines only.
- `readme.md` — this file.
- `SKILL.md` — Agent Skills front-matter, for use in Claude Code.
- `thumbnail.html` — homepage tile.
- `uploads/DESIGN.md` — the original supplied direction.

### `tokens/`
`fonts.css` (webfont loading) · `colors.css` (ramps, semantic aliases, dark theme) ·
`typography.css` (scale + `.sm-*` type classes) · `spacing.css` · `shape.css` ·
`elevation.css` · `motion.css` · `base.css` (resets, link and focus styles).

### Components

`components/forms/`
- **Button** — primary / secondary, sm / md / lg, sentence case only.
- **Input** — label, hint, and an error state that is always fill + icon + message.
- **OptionRow** — the questionnaire's answer choice; single or multi marker.
- **Checkbox** — 22px, for filters and consents.

`components/core/`
- **Card** — discrete objects only; soft tinted shadow.
- **Chip** — metadata pill, dismissible variant for active filters.
- **Divider** — hairline rule, plain or strong, horizontal or vertical.
- **MatchIndicator** — met/unmet criteria the student supplied. The only place
  Tertiary appears. No headline score.
- **Tooltip** — the one colour inversion; optional supplementary detail only.

Each component directory carries a `.card.html` specimen, and each component has a
sibling `.d.ts` (props contract) and `.prompt.md` (what & when, usage, variants).

### Intentional additions

None. Every component above corresponds to an entry in DESIGN.md's `components` block
(`button-primary`/`-secondary`, `input`/`input-error`/`input-placeholder`,
`option-row`/`-selected`, `checkbox`/`-checked`, `card`, `chip`, `divider`/`-strong`,
`match-indicator`, `tooltip`, `page`). Nothing has been added that DESIGN.md does not
define — no Toast, Avatar, Tabs, Select, or Modal, because the source defines none.

### `guidelines/`
16 specimen cards across Colors, Type, Spacing and Brand groups, visible in the Design
System tab.

### `ui_kits/skolamatch/`
Click-through recreation of the product's three surfaces — landing, questionnaire,
results — plus a school detail view and the paywall. See its `README.md`.

---

## Caveats

1. **Fonts are CDN-loaded, not self-hosted.** DESIGN.md specifies self-hosted Fraunces
   and Public Sans; no binaries were supplied, so `tokens/fonts.css` loads both from
   Google Fonts. Both are the correct families (not substitutes) — only the delivery
   differs. Supply `.woff2` files to close this.
2. **No logo, no icon set, no illustration or photography assets were supplied.** The
   wordmark placeholder and the Lucide-geometry glyph substitution are both documented
   above and both flagged as needing real assets.
3. **The research and interview documents cited throughout DESIGN.md were not
   supplied**, and Mobbin was not queried. Every research claim in this readme is
   restated from DESIGN.md, not independently verified.
4. **The match indicator's final format is unresolved in the source itself.** DESIGN.md
   flags the founder's preference for a percentage as under active reconsideration
   pending access to the production scoring engine. This system implements the
   met/unmet-criteria form, which is DESIGN.md's recommendation.
5. **The landing page's ambient animation is intentionally not built** — DESIGN.md gates
   it behind an explicit trigger and a separate pass.
6. **The UI kit is a design-direction recreation, not a recreation of shipped screens.**
   No codebase, Figma file, or screenshots of the real product were provided, so screen
   composition is derived from DESIGN.md's prose (three surfaces, density rules, layout
   grid) rather than copied from a source. Treat layout as proposed, tokens and
   component styling as specified.
