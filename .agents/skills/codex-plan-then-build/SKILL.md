---
name: codex-plan-then-build
description: Use a GPT-6 Astra planning pass, a lower-cost implementation pass, and a separate review pass for complex repository work shared with Claude Code.
---

# Codex plan then build

Use this only for architecture-level, multi-system, schema/API, migration, or
high-cost-to-undo work. For a small feature or bug fix, use one suitable model
end-to-end.

Read `docs/workflows/plan-then-build-collaboration.md` first. The canonical
workflow is shared with Claude Code.

## Codex model gates

- Planning: `gpt-6-astra`, effort `xhigh`.
- Implementation: `gpt-5.6-terra`, effort `medium`, unless Claude Sonnet is doing
  the implementation.
- Review: `gpt-5.6-sol`, effort `high`; use `gpt-6-astra` for payment, security,
  schema, or release-critical review.

Before planning, confirm the active model and effort. Before implementing, confirm
that the model changed from the planner. If the model cannot be confirmed, stop
before editing.

## Required plan contents

Write a handoff-ready plan in `plans/` with exact paths and symbols, resolved
tradeoffs, edge cases, verification commands, browser checks where relevant, and
explicit scope boundaries. After approval, tell the implementer which plan to read.

## Implementation and review gates

The implementer must stop if a material assumption or file path in the plan is
wrong. The reviewer checks the diff, tests, and running behavior, and reports
findings by severity. Do not declare completion with unresolved high-severity
findings. Follow repository push requirements after each coherent commit.
