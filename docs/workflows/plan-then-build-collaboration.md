# Plan then build: Codex + Claude workflow

Use this workflow for architecture work, multi-system changes, schema/API
changes, or anything expensive to unwind. Do not use it for a small bug fix or a
single local component change.

## Roles

1. **Planner — GPT-6 Astra (Codex, `xhigh`) or Claude Opus.** Inspect the current
   repository and write a handoff-ready plan. Choose one planner, never two
   competing plans.
2. **Implementer — GPT-5.6 Terra (`medium`) or Claude Sonnet.** Read the approved
   plan and implement it. Do not re-architect silently.
3. **Reviewer — GPT-5.6 Sol (`high`) for normal deep review, GPT-6 Astra (`high` or
   `xhigh`) for payment, security, schema, or release-critical work.** Review the
   diff and running behavior after implementation.

The default cost/quality path is **Astra plan → Sonnet or Terra build → Sol
review**. Use Astra again for the review when a missed defect would be expensive.

## The handoff artifact

The planner writes an approved plan under `plans/` with:

- the problem and current behavior;
- exact files, functions, routes, and schema objects to change;
- decisions and tradeoffs already resolved;
- edge cases and compatibility constraints;
- verification commands and manual browser checks;
- explicit out-of-scope items.

The implementer starts by reading that plan and checking the current tree. If a
planned file or assumption is materially wrong, stop and report the mismatch. Patch
the plan or return to the planner; do not make a new architectural decision in the
implementation pass.

## Collaboration rules

- Only one agent edits a given file at a time.
- Use Git commits as the synchronization boundary. Check `git status` before and
  after each stage.
- The implementer runs the plan's verification and records the result in the final
  response or plan status.
- The reviewer is read-only until a concrete fix is agreed, then owns the fix in a
  separate commit.
- Never copy secrets into the plan, prompts, or commits.
- For this repository, follow `AGENTS.md`, the design files, and the relevant source
  research before making frontend or product decisions.

## Completion gate

The work is complete only when the implementation passes the planned checks, the
review has no unresolved high-severity finding, and the resulting commit is pushed
according to the repository instructions.
