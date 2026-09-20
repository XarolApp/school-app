---
name: plan-then-build-collab
description: Shared plan-then-build handoff for Claude Code working with Codex in this repository.
---

# Plan then build with Codex

Read `docs/workflows/plan-then-build-collaboration.md` before starting complex
work. Use one planner, one implementer, and one reviewer; do not have both agents
edit the same files concurrently.

For planning, use Claude Opus when Claude owns the architectural decision, or read
and execute a plan already produced by Codex GPT-6 Astra. For implementation use
Claude Sonnet when the plan is complete. Treat the plan in `plans/` as the contract:
if a material assumption is wrong, stop and report it instead of silently changing
the architecture.

Before editing, check `git status` and identify files owned by another active agent.
After implementation, run the plan's verification and leave the tree ready for a
separate Codex review. Never include secrets in plans or commits.
