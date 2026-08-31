---
name: reference-docs-sources
description: school-app keeps reference/instruction docs in docs/sources/ — check there before frontend work or feature proposals.
metadata: 
  node_type: memory
  type: reference
  originSessionId: d0f132e8-7c74-4943-97de-c7c8bd07c42c
  modified: 2026-08-23T17:50:07.941Z
---

`school-app/docs/sources/` holds standing reference documents, consulted for specific
task types rather than read once and discarded:

- `claude_code_ui_ux_guide.md` — psychological UI/UX principles. Read before any
  frontend work (not just onboarding) — see [[feedback-frontend-ux-guide]].
- `feature-brainstorm.md` — exhaustive pre-rated feature list (🔥/✅/🟡/❌) across search,
  AI, Czech admissions process, monetization, growth, B2B, legal. Read before proposing
  new features, scope changes, or build-order decisions — it likely already has the
  idea rated with reasoning.
- `onboarding.md` — archival only, fully merged into
  `.claude/agents/onboarding-architect.md`. No standing-read requirement.
- `pricing_research.md` — 2025/2026 subscription pricing psychology + EU
  minor-payment regulation research (RevenueCat/Adapty data, Digital Fairness Act
  direction of travel). Read before touching pricing or plan structure. Directly
  reversed an earlier decision (weekly plan) already baked into the onboarding
  agent's ruling C-8 — see [[project-dual-buyer-model]] for the payment-side
  implication (parental confirmation at checkout on the student branch).

Both non-archival files are also cross-referenced directly in the project's CLAUDE.md,
which is the authoritative pointer — this memory exists so the habit of checking
`docs/sources/` survives even if CLAUDE.md context gets trimmed.
