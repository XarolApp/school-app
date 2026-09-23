---
name: codex-plan-then-build
description: Use the shared Claude Opus 5.5 planning, GPT-6 Luna max or Sol high implementation, and Sol high review workflow for complex repository work.
---

# Codex plan then build

Use this only for architecture-level, multi-system, schema/API, migration, or
high-cost-to-undo work. For a small feature or bug fix, use one suitable model
end-to-end.

Read `docs/workflows/plan-then-build-collaboration.md` first. The canonical
workflow is shared with Claude Code; use its task table when choosing between
Luna max and Sol high or setting effort.

## Standard model gates

- Planning: Claude Opus 5.5, `high` by default; use `xhigh` for architecture-heavy
  decisions.
- Implementation: GPT-6 Sol high by default for work that justified a planning
  pass; use GPT-6 Luna max if the approved implementation is straightforward and
  minimizing cost is the priority.
- Review: GPT-6 Sol high; escalate payment, security, schema, or release-critical
  review to Claude Opus 5.5 high with fallback.

The normal sequence is **Opus 5.5 plans → Sol high builds → Sol high reviews**.
Keep review independent by starting a fresh pass against the plan and diff.

Before planning, confirm Claude Opus 5.5 and its effort. Before implementing,
confirm the model changed to Sol high (or Luna max for a straightforward plan).
Before reviewing, confirm Sol high is selected and start an independent pass. If a
stage's model cannot be confirmed, stop before that stage.

## Required plan contents

Write a handoff-ready plan in `plans/` with exact paths and symbols, resolved
tradeoffs, edge cases, verification commands, browser checks where relevant, and
explicit scope boundaries. After approval, tell the implementer which plan to read.

## Implementation and review gates

The implementer must stop if a material assumption or file path in the plan is
wrong. The reviewer checks the diff, tests, and running behavior, and reports
findings by severity. Do not declare completion with unresolved high-severity
findings. Follow repository push requirements after each coherent commit.
