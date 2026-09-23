---
name: claude-plan-then-build
description: Claude Opus planning handoff for the shared Opus-plan, GPT-6 Luna max or Sol high implementation, Sol high review workflow.
---

# Claude plan then build

Read `docs/workflows/plan-then-build-collaboration.md` before starting complex
work. Use one planner, one implementer, and one reviewer; do not have both agents
edit the same files concurrently. For task-specific model and effort choices, follow
the table in `docs/workflows/plan-then-build-collaboration.md`.

Claude Opus 5.5 owns the planning pass (`high`, or `xhigh` for architecture-heavy
decisions), following the supplied cost-versus-intelligence benchmark. Once the plan
is approved, GPT-6 Sol high implements by default for work that justified a planning
pass; GPT-6 Luna max is suitable when the approved implementation is straightforward
and minimizing cost is the priority. Treat the plan in `plans/` as the contract:
if a material assumption is wrong, stop and report it instead of silently changing
the architecture.

Before editing, check `git status` and identify files owned by another active agent.
After implementation, run the plan's verification and leave the tree ready for a
separate GPT-6 Sol high review. Escalate payment, security, schema, or release-critical
findings to Claude Opus 5.5 high with fallback. Never include secrets in plans or commits.

For Claude-only work, use Opus 5.5 low for routine fixes, medium for larger
implementation tasks, and high with fallback for complex planning or deep review.
The supplied graph does not support recommending Sonnet 5 for this workflow.
