---
name: codex-only-plan-then-build
description: Use a Codex-only planning, implementation, and review workflow for complex repository work when Claude Code is unavailable.
---

# Codex-only plan then build

Use this for architecture-level, multi-system, schema/API, migration, or
high-cost-to-undo work. Do not use it for a small feature, a local UI change, or
a straightforward bug fix that one model can finish safely.

The workflow is:

```text
GPT-6 Astra plans → GPT-5.6 Terra implements → GPT-5.6 Sol reviews
```

Use GPT-6 Astra for the planning pass at `xhigh` effort. Use GPT-5.6 Terra for
implementation at `medium` effort by default; use `high` when the implementation
has substantial debugging or integration work. Use GPT-5.6 Sol for an independent
review at `high` effort. Escalate the review to GPT-6 Astra only for payment,
security, schema, or release-critical findings.

## Planning gate

Before planning, confirm that the task is complex enough to justify two model
switches. Confirm that the active planner is GPT-6 Astra and the effort is `xhigh`.
If either is wrong, stop before editing and ask the user to switch models/settings.

Write an approved, handoff-ready plan under `plans/` containing:

- the current behavior and concrete problem;
- exact files, functions, components, routes, and schema objects;
- resolved tradeoffs and compatibility constraints;
- edge cases and explicit scope boundaries;
- test, build, and browser verification commands.

Do not leave architectural choices for the implementer to rediscover.

## Implementation gate

After the plan is approved, switch to GPT-5.6 Terra before editing. Confirm the
active model changed from Astra. Read the plan and inspect the current tree first.
If a material assumption, file path, or interface in the plan is wrong, stop and
report it instead of silently re-architecting. Minor naming and local structuring
choices may be made normally.

Run the plan's verification before handing off for review. Keep the implementation
focused on the approved scope and follow the repository's commit and push rules.

## Review gate

Switch to GPT-5.6 Sol and review the diff, tests, and running behavior independently
of the implementation reasoning. Report findings by severity, including concrete
file and line references where possible. Do not declare the task complete while a
high-severity finding remains unresolved. For payment, security, schema, or
release-critical findings, escalate the review to GPT-6 Astra.

Never put secrets in plans, prompts, commits, or review notes.
