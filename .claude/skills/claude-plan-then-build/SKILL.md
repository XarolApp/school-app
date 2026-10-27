---
name: claude-plan-then-build
description: Claude Code handoff for the canonical shared planning, implementation and independent review workflow.
---

# Claude plan then build

## Current routing and authorization

The canonical routing guide is `docs/workflows/plan-then-build-collaboration.md`,
read together with `AGENTS.md` / `CLAUDE.md`. These are
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

## Default roles

Plan at Opus 5.5 medium, implement at Sonnet 5.5 medium/high, review at Opus 5.5 high (this workflow overrides the CLAUDE.md table's lower review effort; Codex routing lives in the `codex-*` skills). Do not require a second planner; escalate hard review under the guide and current human instructions.

## Plan, implement and review

Use the split only for architecture, multi-system/API/schema changes or work that
is costly to unwind. Handle small fixes with one suitable model. Read the current
status and source before planning; do not infer completion from an old plan.

Write a handoff-ready plan under `plans/`: concrete problem/current behavior, exact
paths and symbols, resolved decisions, compatibility and edge cases, verification
commands, browser checks and explicit scope. Do not leave architectural choices for
the implementer to rediscover. Follow any already-established approval; ask only
for unresolved decisions or a required new model switch.

The implementer reads the current tree and plan. A material mismatch requires a
plan correction before dependent work; routine naming/structuring choices do not.
Run the agreed checks and preserve shared edits. Review independently against the
plan, diff and actual running behavior. Report concrete findings by severity with
file/line evidence and distinguish verified behavior from manual/provider gates.

Do not claim release readiness with unresolved release-critical findings. Follow
repository commit/push requirements after each verified coherent chunk. Never put
secrets in plans, prompts, commits or review evidence.
