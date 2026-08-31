# ŠkolaMatch visual system — extracted from Claude Design

Source: Claude Design project "Seven-screen system launch"
(`dd433a0f-052b-4f6e-bace-24294db40df1`, file `SkolaMatch.dc.html`), 2026-08-24.
Seven mobile artboards at 390px. **Desktop/web layout not yet designed** — see the
open question at the bottom.

This file is the token reference for the visual pass. Read it before restyling any
onboarding screen. It does NOT override `pricing.js` or the onboarding-architect
agent's rulings — where the mockup and those conflict, they win (see "Do not copy").

## Typography

Both OFL-licensed via Google Fonts, both with full Czech diacritics.

| Role | Face | Notes |
|---|---|---|
| Headings | **Newsreader** (serif, 300-700) | Editorial, not corporate — gravity without coldness |
| Body + UI | **Hanken Grotesk** (sans, 300-800) | High x-height, open shapes; holds at 13px on mobile |

Heading sizes seen: 46px (hero), 32px (screen title), 30px, 28px, 26px, 23px, 22px,
20px — all `font-weight:400` with `letter-spacing:-.02em` and `line-height` 1.05-1.2.
The serif is used at regular weight, never bold. Body runs 13-17px at 400/500,
line-height 1.45-1.6.

Currently the app loads **no webfont at all** (system-ui only) — adding these two is
part of the port.

## Colour — light

```
--bg:#FBFAF8   --surface:#FFFFFF  --surface2:#F4F2EE
--ink:#17161B  --ink2:#5C5866     --ink3:#8E8A98
--line:#E6E3DD --line2:#D6D2CA
--acc:#aa3bff  --acc-ink:#FFFFFF  --acc-soft:#F6EEFF  --acc-line:#E2CCFF
--ok:#2F7D5F   --ok-soft:#E9F2ED
--board:#EFEDE8
--frost:rgba(255,255,255,.82)
--shadow:0 1px 2px rgba(23,22,27,.05), 0 18px 40px -20px rgba(23,22,27,.18)
--glow:rgba(170,59,255,.13)
```

## Colour — dark

```
--bg:#0C0B0F   --surface:#15141A  --surface2:#1E1C24
--ink:#F2F0F5  --ink2:#A5A1B0     --ink3:#75717F
--line:#262430 --line2:#343141
--acc:#c084fc  --acc-ink:#1A1020  --acc-soft:#221A2E  --acc-line:#3E3054
--ok:#6FCFA6   --ok-soft:#16241E
--board:#08080B
--frost:rgba(28,26,36,.78)
--shadow:0 1px 2px rgba(0,0,0,.5), 0 20px 44px -20px rgba(0,0,0,.75)
--glow:rgba(192,132,252,.20)
```

The existing `--accent` purple survived intact (`#aa3bff` / `#c084fc`) — the brand
seed carried through, so this is an evolution of the current palette, not a reset.
Background is warm paper (`#FBFAF8`), never pure white.

## Rules the mockup is disciplined about — keep these

- **Accent carries exactly one thing per screen**: the primary action, or the result.
  Never decoration.
- **Green (`--ok`) appears only on match strength.** Not on checkmarks-as-decoration,
  not on generic success states.
- **Selection = 1.5px accent outline + `--acc-soft` tint.** Never a solid accent fill.
  Unselected = 1px `--line` on `--surface`.
- **Hairline over shadow.** Borders do the structural work; `--shadow` is reserved for
  the phone frame and the single hero result card.

## Geometry

| Token | Value |
|---|---|
| Card radius | 18px |
| Button radius | 14px |
| Option row radius | 16px |
| Pill / progress radius | 999px |
| Small chip / icon box | 7-10px |
| Spacing rhythm | 8 / 12 / 16 / 24 / 32 |
| Primary button height | 54-56px |
| Screen side padding | 26px |

## Do NOT copy these from the mockup

The design invented product claims we cannot currently honour. Porting them verbatim
would undo deliberate decisions and, on the payment screens, ship false trust signals.

1. **"Vrácení do 14 dnů"** — `REFUND_GUARANTEE_DAYS` is `null`; no refund process
   exists. This is exactly what that constant guards against.
2. **"Zrušíte kdykoli do dalšího zúčtování, bez výpovědní lhůty"** —
   `ONE_STEP_CANCELLATION_IMPLEMENTED` is `false`. This claim was deliberately removed
   from `Paywall.jsx` on 2026-08-24; do not reintroduce it.
3. **199 Kč monthly** — `pricing.js` says 249. `pricing.js` is the source of truth.
4. **"Platí do 30. června 2027"** — config's window is end of March
   (`windowLabel: 'přístup do konce března'`, `SEASON_DAYS = 212`).
5. **"38 %" statistic with "Zdroj: doplnit"** — an invented number with a placeholder
   source, on the one screen whose whole job is credibility. `socialProof.js` is empty
   by design for this reason. Needs a real citable source or it does not ship.
6. **Outcomes promising data we don't hold** — "odhad šance na přijetí podle známek",
   "22 minut od tebe", "termíny s připomenutím". Supabase has only `name`, `location`,
   `programs`, `contact`, `website`, and there is no email system. These are roadmap
   items, not current features.

Also cosmetic: the mockup says "osm otázek" / "3 / 8" / "Krok 1 ze 3"; the real flow
is 10 quiz questions inside 23 screens. Match the real flow, not the mockup's count.

## Open question — desktop

All seven artboards are 390px mobile, which suits the planned mobile app well — that
app is the intended *primary* surface at launch (see CLAUDE.md "Platform Strategy").
But web is a permanent first-class second surface, and **desktop has no design yet**.
Acquisition is influencer-driven (TikTok/Instagram), so mobile traffic dominates, but
desktop matters for the parent persona on a laptop and students on school computers.
Research pass pending before designing it.
