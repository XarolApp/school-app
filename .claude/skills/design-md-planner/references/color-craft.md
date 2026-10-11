# Color Craft

How to build a palette that looks made rather than picked. Read alongside `anti-slop.md`. These are aesthetic heuristics; verify actual gamut and rendered accessibility, preserve project decisions and do not treat an example palette as physical measurement.

**Contents**
- [Start from a referent](#1-start-from-a-referent)
- [Work in OKLCH](#2-work-in-oklch)
- [Build the ramp](#3-build-the-ramp)
- [Tint the neutrals](#4-tint-the-neutrals)
- [Semantic colors](#5-semantic-colors)
- [Dark mode](#6-dark-mode)
- [Contrast and accessibility](#7-contrast-and-accessibility)
- [Naming and token structure](#8-naming-and-token-structure)
- [Verifying without a browser](#9-verifying-without-a-browser)

---

## 1. Start from a referent

Do not pick a color. **Find** one.

The difference is not mystical — it's that a sourced color has properties you would never arrive at by taste. Weathered copper is a desaturated blue-green with a slightly yellow cast that no color picker would suggest. Sodium street lighting is an orange so narrow-band it makes everything else look grey. A 1968 Braun panel is an off-white with a specific warm grey undertone. These are *specific*, and specificity is exactly what slop lacks.

Productive sources:

| Source type | Examples |
|---|---|
| Materials | oxidized copper, raw brass, unglazed terracotta, anodized aluminum, blued steel, kraft paper, indigo-dyed denim |
| Places | hospital corridors, Tokyo at night, Icelandic winter light, a darkroom safelight, Mediterranean shutters |
| Printed artifacts | Penguin paperback spines, Swiss railway timetables, vintage Kodak packaging, USGS topo maps, Braun manuals |
| Film & optics | Kodachrome, Portra 400, CRT phosphor, sodium vapor, cyanotype, blueprint |
| Domain | the actual color of the thing your product is about — soil, blood plasma, sea charts, circuit boards |

Then write the referent into the DESIGN.md prose. A reader who sees "**Tertiary (#B8422E)** — the vibrant earthy red of oxidized iron, used as the sole driver for interaction" understands both the value and the intent. That sentence is doing real work: it tells a future agent what to do when it needs a color you didn't tokenize.

**Practical note.** If the user names a reference product or image, look at it properly — fetch the site, read its CSS, or examine the image — rather than reconstructing it from memory. Memory of a brand color is usually the generic version of it.

---

## 2. Work in OKLCH

OKLCH is `oklch(L C H)`: perceptual lightness (0–1 or 0–100%), chroma (nonnegative; usable range depends on lightness, hue and target gamut), hue angle (0–360°).

Why it matters here: **in HSL, equal lightness steps are not equally light.** HSL yellow at 50% lightness is dramatically brighter than HSL blue at 50%. Every ramp built in HSL has hot spots and dead zones, and the resulting palette feels subtly wrong in ways that are hard to diagnose. OKLCH's L is perceptually uniform, so a ramp with even L steps actually looks evenly spaced.

Approximate hue angles for orientation:

| Hue | ° | Hue | ° |
|---|---|---|---|
| red | 25–30 | green | 145–150 |
| orange | 55–70 | teal | 180–195 |
| yellow | 90–100 | blue | 250–265 |
| lime | 120–130 | violet | 290–310 |
| | | magenta | 330–350 |

**Gamut caution.** OKLCH can express colors outside sRGB. Chroma above ~0.20 is unreliable at extreme lightness values and will clip on conversion. No single chroma cap guarantees sRGB containment; convert/check each lightness/hue combination and inspect any gamut mapping before accepting the result.

**Output format.** Author in OKLCH, ship hex. The DESIGN.md spec accepts `oklch()` values, but hex is the recommended default for tooling breadth. Use hex in the tokens and mention the OKLCH derivation in the prose if it's interesting.

---

## 3. Build the ramp

A ramp is a family of one hue at multiple lightnesses. Ten steps are common (`50`, then `100` through `900`); this worked example uses nine, ending at `800`. Five may be enough.

Set lightness first, on a perceptual curve rather than linearly:

```
L: 0.97  0.93  0.87  0.78  0.68  0.58  0.47  0.36  0.24
```

Note the steps are tighter at the light end. Linear L steps make the light end feel crowded and the dark end feel like a cliff.

Then apply the two moves that separate hand-built ramps from generated ones:

### Taper the chroma

Chroma should peak in the middle and fall off toward both ends, because the sRGB gamut narrows at extreme lightness — and because real pigments behave this way.

```
C: 0.02  0.05  0.09  0.13  0.16  0.17  0.15  0.12  0.08
```

Flat chroma across a ramp produces washed-out lights and muddy, oversaturated darks. It's one of the most visible signatures of an auto-generated palette.

### Bend the hue

Real materials shift hue as they lighten and darken. Warm colors typically shift toward yellow in the tints and toward red/maroon in the shades; cool colors shift toward cyan in the tints and toward violet in the shades. A 5–20° drift across the ramp is enough.

```
H:  38    35    32    30    28    27    25    22    18     (a red-orange, bending warm→deep)
```

A ramp with a constant hue angle is mathematically clean and visually synthetic. The bend is what makes it read as a material.

### Worked example

A material-inspired terracotta ramp. The hex values are fixed; the approximate OKLCH coordinates below are calculated from those values, not an independently documented physical sample:

| Step | Computed OKLCH (rounded) | Fixed sRGB hex |
|---|---|---|
| 50  | `oklch(0.9685 0.0093 52.1)` | `#FAF3EF` |
| 100 | `oklch(0.9298 0.0230 52.7)` | `#F5E4DA` |
| 200 | `oklch(0.8642 0.0445 52.6)` | `#EBCBB8` |
| 300 | `oklch(0.7738 0.0706 50.6)` | `#DBA98D` |
| 400 | `oklch(0.6755 0.0916 46.2)` | `#C68566` |
| 500 | `oklch(0.5815 0.1008 44.2)` | `#AC6647` |
| 600 | `oklch(0.4905 0.0910 43.3)` | `#8B4E34` |
| 700 | `oklch(0.4021 0.0737 43.3)` | `#693A26` |
| 800 | `oklch(0.3088 0.0547 42.0)` | `#472619` |

Measured lightness descends, chroma peaks at 500, and hue runs approximately 53°→42° after hex rounding. Nothing here is a framework default.

### How many ramps

Most systems need fewer than they build. A primary ramp, a neutral ramp, and one accent covers the majority of products. Add secondary/tertiary only when you can say what each is *for*. Unused ramps also trip the linter's `orphaned-tokens` warning, which is a useful forcing function.

---

## 4. Tint the neutrals

The highest-impact, lowest-visibility change available.

Pure greys (`R=G=B`, or chroma exactly 0) are the loudest signal that a palette was assembled rather than designed. Tinted neutrals can connect a surface to its material-inspired palette; neutral greys remain a valid deliberate choice.

Give the neutral ramp a small chroma, typically `0.004–0.020`, at a hue related to the brand:

- **Warm neutrals** (hue 50–90) — paper, craft, editorial, hospitality, anything that should feel human
- **Cool neutrals** (hue 230–260) — clinical, technical, precision, anything that should feel exact
- **Complement neutrals** (brand hue + 180°) — makes the accent pop harder; use a very low chroma or it reads as a second color

A warm neutral ramp to pair with the terracotta above:

```
oklch(0.9853 0.0029 84.6)  #FBFAF8
oklch(0.9616 0.0057 84.6)  #F4F2EE
oklch(0.9200 0.0104 81.8)  #E8E4DD
oklch(0.8283 0.0165 82.8)  #CCC6BB
oklch(0.6792 0.0179 79.3)  #9E978C
oklch(0.5372 0.0170 80.7)  #736D63
oklch(0.4299 0.0145 79.7)  #544F47
oklch(0.3382 0.0147 84.6)  #3B372F
oklch(0.2451 0.0103 80.6)  #23201B
```

Compare `#736D63` against `#737373`. Individually the difference is nearly imperceptible. Across an entire interface it's the difference between a designed surface and a wireframe.

**Also move off the endpoints.** `#FFFFFF` and `#000000` are both physically harsh and both signal an unmade decision. Use the top and bottom of your tinted ramp instead — unless pure black/white is genuinely the concept (Structural Brutalist, some Luxury Minimal).

---

## 5. Semantic colors

Error, success, warning, and info should look like members of your palette, not imports from someone else's.

Take the conventional hue as a starting point, then pull it toward your system: match the chroma level of your other colors, apply the same lightness curve, and shift the hue slightly toward your primary. A palette with a warm terracotta primary should have a brick-toned error (`oklch(0.52 0.15 28)`), not `#EF4444`.

Two constraints that matter more than the aesthetics:

- **Never encode state with color alone.** Roughly 8% of men have a color vision deficiency, and red/green is the most common axis. Pair color with an icon, a label, a border style, or a position. Write this into Do's and Don'ts.
- **Semantic colors need the same contrast discipline as everything else** — they often appear as small text on tinted backgrounds, which is the worst case.

---

## 6. Dark mode

Dark mode is a separate design, not an inversion. Inverting lightness produces halation (light text on dark bleeds optically and looks bolder), oversaturated colors, and shadows that do nothing.

What actually changes:

- **Reduce chroma by roughly 10–25%.** Colors appear more saturated against dark grounds. A primary that's confident on white becomes garish on near-black.
- **Never pure black.** `#0A0A0A` to `#1A1A1A`, tinted. Pure black creates maximum halation and makes OLED smearing visible during scroll.
- **Invert the elevation logic.** In light mode, raised surfaces cast shadows. In dark mode, raised surfaces get *lighter* — shadows are invisible on dark. Build a surface ladder: `#131313` base → `#1C1C1C` raised → `#242424` overlay.
- **Reduce text contrast slightly.** Pure white on near-black is fatiguing. `#E8E6E3` rather than `#FFFFFF` for body.
- **Recheck every contrast pair.** They do not carry over.
- **Some colors don't survive.** Deep navies and rich purples collapse against dark grounds. If the direction depends on them, the dark variant may need a different accent — that's a legitimate design decision, not a failure.

If the user only needs one mode, build one properly rather than two poorly. Ask.

---

## 7. Contrast and accessibility

WCAG 2.x thresholds:

| Content | AA | AAA |
|---|---|---|
| Body text (<18pt / <14pt bold) | 4.5:1 | 7:1 |
| Large text (≥18pt / ≥14pt bold) | 3:1 | 4.5:1 |
| Required author-styled non-text states/graphics (SC 1.4.11, exceptions apply) | 3:1 against adjacent colors | Separate criteria |

The DESIGN.md linter's `contrast-ratio` rule checks each component's `backgroundColor`/`textColor` pair against 4.5:1, so define those pairs together in the components section — a component with a background and no text color silently skips the check.

Practical guidance:

- **Design to a margin.** Aim for 4.8–5.5:1 rather than exactly 4.5:1. Antialiasing, thin weights, and low-quality displays all erode effective contrast.
- **Check the text pair independently of the button boundary.** A 3:1 accent/white pair fails AA for normal-size white button text and normal-size accent text on white; reversing foreground/background does not change contrast. Qualifying large text has a 3:1 threshold. Choose colors by the actual measured pair. [W3C text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Enabled placeholder text** follows the applicable text threshold (normally 4.5:1). Inactive controls are exempt from that criterion, but keep their text legible as a usability choice.
- **Author-styled non-text state indicators** need the applicable 3:1 contrast against adjacent colors under SC 1.4.11; account for the indicator placement and stated exceptions. Keyboard-focus visibility and stronger focus-area criteria require separate checks. [W3C non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- **Don't rely on color alone**, per above.

---

## 8. Naming and token structure

Two naming layers, and they do different jobs:

**Primitive tokens** name the color: `terracotta-500`, `neutral-200`. They're a palette.

**Semantic tokens** name the role: `primary`, `surface`, `on-surface`, `border`, `error`. They're an interface.

The DESIGN.md spec's recommended color names — `primary`, `secondary`, `tertiary`, `neutral`, `surface`, `on-surface`, `error` — are semantic, and semantic naming is the right default for this format because it's what makes the file useful to an agent. An agent reading `primary` knows what to do; reading `terracotta-500` it has to guess.

A workable hybrid: define the ramp steps you actually use, and give the key ones semantic aliases via token references.

```yaml
colors:
  primary: "#AC6647"
  primary-strong: "#8B4E34"
  primary-subtle: "#F5E4DA"
  neutral: "#F4F2EE"
  surface: "#FBFAF8"
  on-surface: "#23201B"
  border: "#E8E4DD"
  error: "#9B3A2E"
```

Keep it to the tokens the system actually uses. Every unreferenced color token trips `orphaned-tokens` in the historical CLI baseline, and that warning is usually correct — an unused token is a decision nobody needed to make.

**Use the descriptive name in prose, the systematic name in tokens.** The spec explicitly supports this: prose says "Weathered Terracotta," tokens say `primary`. That pairing is what makes the document readable by a human and usable by a machine.

---

## 9. Verifying without a browser

Contrast is arithmetic — compute it rather than guessing. WCAG relative luminance:

```python
def _lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def luminance(hex_color):
    h = hex_color.lstrip('#')
    r, g, b = (int(h[i:i+2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)

def contrast(fg, bg):
    a, b = luminance(fg), luminance(bg)
    lo, hi = sorted((a, b))
    return (hi + 0.05) / (lo + 0.05)

# contrast("#23201B", "#FBFAF8") -> ~15.6:1
```

For OKLCH→hex conversion, use a reviewed converter/library with a defined target gamut; `culori` is a library, so verify its installed API rather than assuming it provides an `npx` CLI. If no converter is at hand, author directly in hex and verify the ramp by checking that computed luminance descends smoothly — an uneven luminance progression is the same defect as an uneven L curve.

Run the contrast check on every foreground/background pair you put in the components section *before* linting. It's faster than discovering them as warnings and it forces you to notice pairs you forgot to define.

Coordinate calculations use the sRGB/OKLab matrices described in [CSS Color 4](https://www.w3.org/TR/css-color-4/#ok-lab). Approximate coordinates and token-pair checks do not replace browser/device/state acceptance.
