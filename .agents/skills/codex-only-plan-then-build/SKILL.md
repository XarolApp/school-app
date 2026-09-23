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
GPT-6 Astra plans → GPT-6 Sol xhigh implements → GPT-6 Sol high reviews
```

Use GPT-6 Astra for planning at `high` by default, or `xhigh` for architecture-heavy
decisions. Implement with GPT-6 Sol xhigh by default when the complexity warrants a
plan-then-build split; use GPT-6 Luna max if the approved implementation is
straightforward and minimizing cost is the priority. Review independently with
GPT-6 Sol high. Escalate payment, security, schema, or release-critical review to
GPT-6 Astra high. Do not use GPT-5.6 Terra in this workflow: the supplied graph shows
it dominated by cheaper or more capable options.

## Planning gate

Before planning, confirm that the task is complex enough to justify two model
switches. Confirm that the active planner is GPT-6 Astra at the appropriate effort.
If the model cannot be confirmed, stop before planning.

Write an approved, handoff-ready plan under `plans/` containing:

- the current behavior and concrete problem;
- exact files, functions, components, routes, and schema objects;
- resolved tradeoffs and compatibility constraints;
- edge cases and explicit scope boundaries;
- test, build, and browser verification commands.

Do not leave architectural choices for the implementer to rediscover.

## Implementation gate

After the plan is approved, switch to GPT-6 Sol xhigh by default, or GPT-6 Luna max
if the implementation is straightforward. Confirm the active model changed from Astra. Read the plan and inspect
the current tree first.
If a material assumption, file path, or interface in the plan is wrong, stop and
report it instead of silently re-architecting. Minor naming and local structuring
choices may be made normally.

Run the plan's verification before handing off for review. Keep the implementation
focused on the approved scope and follow the repository's commit and push rules.

## Review gate

Switch to GPT-6 Sol high and review the diff, tests, and running behavior independently
of the implementation reasoning. Report findings by severity, including concrete
file and line references where possible. Do not declare the task complete while a
high-severity finding remains unresolved. For payment, security, schema, or
release-critical findings, escalate the review to GPT-6 Astra.

Never put secrets in plans, prompts, commits, or review notes.
