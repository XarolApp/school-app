---
name: claude-plan-then-build
description: Claude Code implementation handoff for the shared Astra-plan, Sonnet-build, Sol-review workflow.
---

# Claude plan then build

Read `docs/workflows/plan-then-build-collaboration.md` before starting complex
work. Use one planner, one implementer, and one reviewer; do not have both agents
edit the same files concurrently.

GPT-6 Astra owns the planning pass. Once the plan is approved, Claude Sonnet
implements it. Treat the plan in `plans/` as the contract:
if a material assumption is wrong, stop and report it instead of silently changing
the architecture.

Before editing, check `git status` and identify files owned by another active agent.
After implementation, run the plan's verification and leave the tree ready for a
separate GPT-5.6 Sol review. Never include secrets in plans or commits.
