# Plan then build: Codex + Claude workflow

Use this workflow for architecture work, multi-system changes, schema/API
changes, or anything expensive to unwind. Do not use it for a small bug fix or a
single local component change.

## Roles

1. **Planner — Claude Opus 5.5 (`high`; `xhigh` for architecture-heavy decisions).**
   Inspect the current repository and write a handoff-ready plan. Use one planner,
   never two competing plans. The supplied benchmark places Opus 5.5 high above
   nearby Astra choices at lower estimated task cost.
2. **Implementer — GPT-6 Sol high by default for an approved plan.** Use Luna max
   when the implementation is straightforward and the lowest cost is the priority.
   Read the approved plan and implement it. Do not re-architect silently.
3. **Reviewer — GPT-6 Sol high.** Review the diff and running behavior after
   implementation. Escalate payment, security, schema, or release-critical findings
   to Claude Opus 5.5 high with fallback.

The standard shared path is **Opus 5.5 plans → Sol high builds → Sol high reviews**.
The same model can do both stages, but keep the review independent: start a fresh
review pass and inspect the implementation against the plan and diff.

## Model and effort guide

Choose the model on the side you can use. The recommendations below follow the
founder's supplied intelligence-versus-cost graph only; they are approximate task
guidance, not guarantees for every repository or prompt.

| Task | Codex | Claude |
|---|---|---|
| Tiny, straightforward edits: typo, label, one obvious CSS value | GPT-6 Luna low | Claude 4.5 Haiku |
| Routine coding and focused fixes: one component bug, a small API/UI adjustment, a clear change with known behavior | GPT-6 Luna max | Claude Opus 5.5 low |
| Larger implementation: several related components or a feature within an established design, with clear requirements | GPT-6 Sol high | Claude Opus 5.5 medium |
| Complex planning or code review: multi-file tradeoffs, unclear behavior, or checking an involved feature diff | GPT-6 Sol xhigh | Claude Opus 5.5 high with fallback |
| Deep planning or high-stakes review: payments, auth/security, schema changes, deletion flows, launch-critical work | GPT-6 Astra high | Claude Opus 5.5 high with fallback |

The graph makes GPT-5.6 Terra and Claude Sonnet 5 poor value for this user's
workload, so they are not recommended in this guide. Use Luna low only for genuinely
small work; use Luna max as the regular Codex implementation choice. Use Opus low
for routine Claude Code changes, medium for larger implementation, and high for the
hardest Claude-only work.

For complex shared work, use **Opus 5.5 high plans → Sol high builds → Sol high
reviews**. The Codex-only fallback is **Astra high/xhigh plans → Sol xhigh builds
→ Sol high reviews**. Use Luna max when a planned implementation is straightforward
enough that its lower cost is more important than Sol's higher chart score.

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
