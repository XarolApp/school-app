---
name: plan-then-build
description: Split complex work into a Claude Opus 5.5 planning pass, GPT-6 Luna high/max implementation, and Sol high review. Use for architecture-level changes, not routine fixes.
---

# Plan-then-build

Use the canonical shared workflow: Opus 5.5 medium or Astra high plans, Luna high/max implements on Codex (Sonnet 5 medium/high on Claude), and Sol high or Opus 5.5 low reviews. Escalate hard security/payment/schema review under the guide. Explicit current human model choices take precedence.

There is no tool that can change the active model or effort level — `/model` and
`/effort` are slash commands, not tool calls. Every checkpoint below that needs a model
or effort change is a spoken instruction to the user, followed by a hard stop until it's
confirmed. Never assume a switch happened because you told the user to make it.

## Current routing and authorization

The canonical routing guide is `docs/workflows/plan-then-build-collaboration.md`,
read together with `AGENTS.md` / `CLAUDE.md`. Its September routing update
supersedes the older graph-only recommendations in skill copies. These are
repository defaults, not independently verified model benchmarks or a live model
picker. Confirm available models in the current tool/session before requiring one.

Explicit human model/effort choices override these defaults. Preserve a trusted
same-task confirmation across a continuing review; do not ask again merely because
another turn or skill copy repeats the gate. Never infer a switch that was only
requested. A changed model-dependent stage needs confirmation only when its
required choice has not already been established.

A stage is a separate pass, not permission to spawn or message agents. Respect the
human's delegation/cost constraint. One agent can execute sequential passes; claim
shared files and preserve concurrent edits before mutations. Do not activate this
workflow solely to interrupt an already-authorized end-to-end review.

## Phase 0 — Complexity gate (always runs first)

Before doing anything else, judge the task itself against this line:

- **Complex enough to split:** multi-system impact, real tradeoff analysis, schema or
  API contract design, "whole codebase" scope, anything where getting the architecture
  wrong is expensive to unwind later.
- **Not complex enough:** a single feature inside an architecture that already exists,
  a straightforward bug fix, a script or tooling change, anything one model could
  reasonably do start to finish without a separate planning pass first.

If the task isn't complex enough, say so plainly, name the model to use instead (usually
GPT-6 Luna high — per the canonical everyday-implementation row, so splitting adds a step
for zero benefit), and **stop here.** Do not enter plan mode, do not touch the plan file,
do not call `ExitPlanMode`.

If it's borderline, say what makes the call close and let the user overrule either way —
don't silently guess.

If it clearly qualifies, say in one line what makes it qualify and continue.

## Phase 0.5 — Model and effort check, before planning starts

- **Model:** confirm Claude Opus 5.5 is selected. If not, stop before planning and
  ask the user to switch to it or use the Codex-only workflow if Claude is unavailable.
- **Effort:** name the effort tier the task calls for, using this scale:

  | Class | Effort |
  |---|---|
  | implementation-shaped work | medium |
  | review or debugging-shaped work (including a task the implementer already failed on) | low |
  | architecture/planning-shaped work | medium |
  | hard debugging, wide refactors, math/science/security-heavy work | high |
  | long unattended runs (30+ min): migrations, multi-repo changes | xhigh |
  | genuinely extreme (full rewrites, platform-scale) | max |

  Per the 2026-09-23 benchmark data: Opus 5.5 low outscored a higher-effort
  predecessor on bug-catching, and Opus 5.5 medium outscored Opus's own max on
  planning benchmarks — more effort does not always help, so don't raise effort
  by reflex. See the table in `CLAUDE.md`/`AGENTS.md` for the full reasoning.

  Tell the user to run `/effort <tier>` if the current one doesn't already match. Don't
  repeat the instruction if it's already right.

Only move to Phase 1 once both are confirmed (or the user says they've made the switch).

## Phase 1 — Plan (Claude Opus 5.5)

Enter plan mode (`EnterPlanMode` if not already active) and write a plan that is
**handoff-ready** — meaning a different, cheaper model must be able to execute it without
re-deriving any judgment calls:

- Concrete file paths and function/component names. Never "update the relevant files."
- Every non-trivial decision made explicitly in the plan text. No "figure out the best
  approach for X" left open — that's exactly the kind of call the split exists to make
  once, expensively, instead of leaving it for the cheaper model to guess at.
- A verification section: how to confirm the implementation actually matches the plan
  (tests, manual checks, build steps).

Write it to the plan file as usual, then call `ExitPlanMode` for approval — this doesn't
replace the normal plan-mode workflow, it just raises the bar for what "done planning"
means.

## Phase 2 — Handoff

Once the plan is approved, the last thing this phase does is print a short, plain
message — nothing else:

> Plan approved and saved to `<path>`. Select the available GPT-6 Luna entry at high for everyday implementation, or max for larger work, unless the human already chose a suitable implementation model, then continue.

No attempt to detect or force the switch. Just the instruction, then stop and wait.

## Phase 3 — Implement (GPT-6 Luna high/max)

This phase has its own gate, run every time — never skip it because Phase 2 already gave
the instruction:

- **Confirm the model actually changed before writing a single line.** Use the canonical Luna high/max row or the explicit current human choice; do not infer a switch from a requested switch.
- Once confirmed, follow the plan literally. Don't re-derive or second-guess the
  architecture decisions it already made.
- If execution reveals the plan is incomplete or wrong somewhere that matters — a step
  doesn't work as written, a referenced file or function doesn't exist, an edge case the
  plan didn't cover changes the approach — **stop and flag it explicitly** instead of
  improvising a new architectural call. Say what's missing and ask whether to patch the
  plan inline or go back to Opus for that one piece. Making this moment visible instead
  of silently painting over it is the whole reason this phase exists as a separate
  checklist, not just "implement the plan."
- Small in-function judgment calls (naming, minor local structuring) don't need to
  trigger this — only decisions that would change the plan's actual approach.
