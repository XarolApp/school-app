# Plan then build: Codex + Claude workflow

Use this workflow for architecture work, multi-system changes, schema/API
changes, or anything expensive to unwind. Do not use it for a small bug fix or a
single local component change.

## Roles

1. **Planner — GPT-6 Astra (`high`) or Claude Opus 5.5 (`medium`).** Inspect the
   current repository and write a handoff-ready plan. Use one planner, never two
   competing plans.
2. **Implementer — GPT-6 Luna high for everyday planned coding, Luna max for larger
   implementations, or Claude Sonnet 5 medium/high when using Claude Code.**
   Read the approved plan and implement it. Do not re-architect silently.
3. **Reviewer — GPT-6 Sol high or Claude Opus 5.5 low.** Review the diff and running
   behavior after implementation. Escalate hard debugging, payment, security, schema,
   or release-critical findings to Astra high or Opus high.

The standard shared path is **Astra high plans → Luna high/max builds → Sol high
reviews**, or **Opus medium plans → Sonnet medium/high builds → Opus low reviews**.
The same model can do both stages, but keep the review independent: start a fresh
review pass and inspect the implementation against the plan and diff.

## Model and effort guide

Choose the model on the side you can use. The recommendations below follow the
founder's supplied intelligence-versus-cost graph only; they are approximate task
guidance, not guarantees for every repository or prompt.

| Task | Codex | Claude |
|---|---|---|
| Mechanical edits | GPT-6 Luna medium | Claude Haiku 4.5 |
| Everyday planned coding | GPT-6 Luna high | Claude Sonnet 5 medium |
| Larger implementation | GPT-6 Luna max | Claude Sonnet 5 high |
| Medium debugging or focused review | GPT-6 Sol high | Claude Opus 5.5 low |
| Detailed planning or architecture | GPT-6 Astra high | Claude Opus 5.5 medium |
| Hard debugging or security review | GPT-6 Astra high | Claude Opus 5.5 high |

The September 23 routing guide supersedes the earlier graph-only table. It recommends
Sonnet 5 for implementation because subscription quota and coding behavior differ from
API cost-per-task charts. GPT-5.6 Terra remains excluded. Keep Fast mode off.

For complex shared work, use **Astra high plans → Luna high/max builds → Sol high
reviews**, or **Opus medium plans → Sonnet medium/high builds → Opus low reviews**.
Use the hard-debugging row for security, payment, schema, and release-critical work.

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
