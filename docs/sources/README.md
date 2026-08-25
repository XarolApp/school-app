# docs/sources — reference documents index

Standing reference material read at specific points in the workflow, not on every
session. CLAUDE.md links directly to files in this folder by path — **don't move or
rename anything here without also updating every reference in `CLAUDE.md` and
`.claude/agents/onboarding-architect.md`**, or those pointers go stale.

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

## Design system

- **`design_system.md`** — the visual system actually being ported into the app,
  extracted from the Claude Design mockup (2026-08-24). Purple accent (`#aa3bff`),
  Newsreader + Hanken Grotesk. Partially wired into `frontend/src/design/tokens.js`.
- **`DESIGN.google-format.md`** — a **separate, conflicting** design system produced
  by the `design-md-planner` skill in Google's DESIGN.md format. Different palette
  (navy `#35426E` / green, not purple), different structure. **This has not been
  reconciled with `design_system.md` — that's a real open decision, not a filing
  question.** Don't treat either as authoritative until the user picks one (or merges
  them deliberately).

## Archival

- **`onboarding.md`** — superseded. Fully merged into
  `.claude/agents/onboarding-architect.md`; kept only for history. No need to read it
  directly.

---

## Why this folder isn't split into subfolders

CLAUDE.md links to files here with 8 hardcoded `docs/sources/...` paths. Moving files
into category subfolders (e.g. `docs/research/`, `docs/design/`) would require
rewriting every one of those links correctly — get one wrong and it's a silently
broken pointer, which is worse than the current flat structure. This README exists to
give the categorization without that risk. Revisit if the folder keeps growing.
