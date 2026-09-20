---
name: codex-plan-then-build
description: Use the standard GPT-6 Astra plan, Claude Sonnet implementation, and GPT-5.6 Sol review workflow for complex repository work shared with Claude Code.
---

# Codex plan then build

Use this only for architecture-level, multi-system, schema/API, migration, or
high-cost-to-undo work. For a small feature or bug fix, use one suitable model
end-to-end.

Read `docs/workflows/plan-then-build-collaboration.md` first. The canonical
workflow is shared with Claude Code.

## Standard model gates

- Planning: `gpt-6-astra`, effort `xhigh`.
- Implementation: Claude Sonnet.
- Review: `gpt-5.6-sol`, effort `high`; use `gpt-6-astra` only for payment,
  security, schema, or release-critical review.

The normal sequence is always **Astra plans → Sonnet builds → Sol reviews**.

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
