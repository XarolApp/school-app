# docs/sources — reference documents index

Standing reference material read at specific points in the workflow, not on every
session. CLAUDE.md links directly to files in this folder by path — **don't move or
rename anything here without also updating every reference in `CLAUDE.md` and
`.claude/agents/onboarding-architect.md`**, or those pointers go stale.

**Design-system-specific material lives in `design/` at the repo root, not here** —
see `design/DESIGN.md` and `design/research/`. This folder now holds only general
product/research docs, not visual design work. That split happened 2026-08-31; see
"Why the split happened" at the bottom for what moved and why.

## Research

- **`pricing_research.md`** — 2025/2026 subscription pricing + EU minor-payment
  research. Read before touching pricing or plan structure.
- **`platform_onboarding_research.md`** — web-vs-app onboarding placement research
  (where the quiz should live given the app is the intended primary surface).
- **`feature-brainstorm.md`** — full feature roadmap/ratings (🔥/✅/🟡/❌). Read before
  proposing new features or scope — this is the backlog behind CLAUDE.md's shorter
  MVP list, not a duplicate of it.

## Guides (apply ongoing, not just once)

- **`claude_code_ui_ux_guide.md`** — psychological UX principles (dopamine loops,
  IKEA effect, cognitive load, emotional design levels). Required reading before any
  frontend work, app-wide — not just onboarding.

## Archival

- **`onboarding.md`** — superseded. Fully merged into
  `.claude/agents/onboarding-architect.md`; kept only for history. No need to read it
  directly.

---

## Where the design-system docs went

`design/` at the repo root, created 2026-08-31:

- **`design/DESIGN.md`** — the authoritative design system (moved from repo root).
  Terracotta `#AD4F2A` / moss `#4F7143`, Fraunces + Public Sans. **Check this before
  any non-trivial frontend visual change** — see CLAUDE.md's standing rule.
- **`design/system/`** — the real, built design-system output from Claude Design:
  actual component code (`Button`, `Input`, `Checkbox`, `Card`, `Chip`, …), tokens,
  guideline preview pages, and example screen mockups. This is the current template
  for all new `/design` work.
- **`design/archive/`** — finished, already-implemented design work, kept for history.
- **`design/research/`** — the design-direction research and Mobbin pattern surveys
  that used to live here in `docs/sources/`, including `design_system-archived.md`
  (the *prior* palette, superseded before the current terracotta/moss system).

## Why the split happened

This README previously described `DESIGN.md`'s palette as "Navy `#35426E` / green
`#2E6B4E`" — that was already stale by the time it was read; the real design system
had moved to terracotta/moss with Fraunces + Public Sans days earlier and this file
was never updated. Splitting design material into its own top-level `design/` folder
(rather than leaving it flat in here alongside general product docs) makes the design
system discoverable as one coherent unit — for `/design`, for a human, and for future
Claude Design imports — instead of scattered across `docs/sources/` and ad-hoc
root-level folders with names like `# ŠkolaMatch School Search Wireframe`.

## Why *this* folder stays flat

The docs remaining here are general product/research material, not design-system
work, and CLAUDE.md links to them with hardcoded `docs/sources/...` paths. Splitting
these into further category subfolders would mean rewriting every one of those links
correctly — get one wrong and it's a silently broken pointer, worse than a flat
structure. This README exists to give the categorization without that risk.
