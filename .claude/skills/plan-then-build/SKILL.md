---
name: plan-then-build
description: Split a genuinely complex task into an Opus planning pass and a Sonnet implementation pass to save cost without losing depth on the hard part. Invoke manually (/plan-then-build) when about to start architecture-level work — schema design, multi-system changes, tradeoff-heavy decisions. Gates itself on both ends: refuses to run on a task that's too simple for the split, and refuses to implement until it confirms the model was actually switched. Do not use for a single feature within existing architecture, a straightforward bug fix, or anything one model could finish start-to-finish alone.
---

# Plan-then-build

Opus is better at architecture and tradeoff reasoning; Sonnet is cheaper and just as
capable at *implementing a spec someone else already thought through*. This skill turns
that split into a repeatable four-phase procedure instead of something to remember to do
manually — and it enforces the two checks that make the split actually pay off: don't
split trivial work, and don't skip the model switch.

There is no tool that can change the active model or effort level — `/model` and
`/effort` are slash commands, not tool calls. Every checkpoint below that needs a model
or effort change is a spoken instruction to the user, followed by a hard stop until it's
confirmed. Never assume a switch happened because you told the user to make it.

## Phase 0 — Complexity gate (always runs first)

Before doing anything else, judge the task itself against this line:

- **Complex enough to split:** multi-system impact, real tradeoff analysis, schema or
  API contract design, "whole codebase" scope, anything where getting the architecture
  wrong is expensive to unwind later.
- **Not complex enough:** a single feature inside an architecture that already exists,
  a straightforward bug fix, a script or tooling change, anything one model could
  reasonably do start to finish without a separate planning pass first.

If the task isn't complex enough, say so plainly, name the model to use instead (usually
Sonnet — the same model this skill would hand off to anyway, so splitting adds a step
for zero benefit), and **stop here.** Do not enter plan mode, do not touch the plan file,
do not call `ExitPlanMode`.

If it's borderline, say what makes the call close and let the user overrule either way —
don't silently guess.

If it clearly qualifies, say in one line what makes it qualify and continue.

## Phase 0.5 — Model and effort check, before planning starts

- **Model:** confirm the session is actually on an Opus-tier model right now. If it
  isn't (still on Sonnet, or on Haiku), say so and tell the user to run `/model` to
  switch to Opus first. **Do not enter plan mode on the wrong model** — wait for
  confirmation.
- **Effort:** name the effort tier the task calls for, using this scale:

  | Class | Effort |
  |---|---|
  | implementation-shaped work | medium |
  | debugging-shaped work | high |
  | architecture-shaped work | xhigh |
  | genuinely extreme (rewrites, migrations, platform-scale) | max |

  Tell the user to run `/effort <tier>` if the current one doesn't already match. Don't
  repeat the instruction if it's already right.

Only move to Phase 1 once both are confirmed (or the user says they've made the switch).

## Phase 1 — Plan (Opus side)

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

> Plan approved and saved to `<path>`. Run `/model claude-sonnet-5` and `/effort medium`
> (adjust if the plan itself calls for more), then tell me to continue — I'll implement
> it from the plan.

No attempt to detect or force the switch. Just the instruction, then stop and wait.

## Phase 3 — Implement (Sonnet side)

This phase has its own gate, run every time — never skip it because Phase 2 already gave
the instruction:

- **Confirm the model actually changed before writing a single line.** If the session is
  still on the Opus-tier model the plan was written on, say so — "Still on Opus — run
  `/model claude-sonnet-5` first" — and **do not start implementing.** This is a hard
  stop: the entire point of the split is cost, and executing the implementation phase on
  Opus defeats it even if the plan is perfect.
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
