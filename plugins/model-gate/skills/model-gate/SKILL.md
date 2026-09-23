---
name: model-gate
description: Check the active model and effort before repository changes, planning, reviews, browser audits, or other substantial work; pause and request a switch when the selected model does not match the project model table.
---

# Model gate

Run this check before acting on every repository task that changes files, creates a
plan, reviews code, audits the browser, or runs a substantial workflow.

- Classify the task using the model table in `AGENTS.md` and `CLAUDE.md`.
- Read the active model and effort from a trustworthy session indicator when available.
- Never infer the active model from the previous turn, the requested skill, or this file.
- If the active model cannot be observed, stop and ask the user to confirm the model and effort.
- If the selected model is wrong, state the exact model and effort required and wait.
- Continue only after the matching model is confirmed.

Simple factual questions may be answered without this gate when no repository action or
model-specific work is needed. The gate cannot inspect the model picker on its own; never
claim that it did.
