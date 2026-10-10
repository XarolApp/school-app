---
name: model-gate
description: Check the active model and effort before repository changes, planning, reviews, browser audits, or other substantial work; pause and request a switch when the selected model does not match the project model table.
---

# Model gate

Run this check before acting on every repository task that changes files, creates a
plan, reviews code, audits the browser, or runs a substantial workflow.

- Classify the task using the applicable routing instructions. The table in `AGENTS.md` / `CLAUDE.md` routes Claude Code; Codex/GPT routing is in `.agents/skills/codex-*` and the current session instructions. Do not apply the Claude table to GPT models.
- Read the active model and effort from a trustworthy session indicator when available.
- Never infer the active model from the task title, the requested skill, or this file. A direct human confirmation already given for the same continuing task is valid session evidence; preserve it and do not ask again unless it changes or the task requires a different model. This matches the plugin hook.
- If neither a trustworthy indicator nor an existing same-task human confirmation establishes model/effort, ask the user to confirm them. A prior valid confirmation satisfies this gate until changed.
- If the selected model is wrong, state the exact model and effort required and wait.
- Continue only after the matching model is confirmed.

Simple factual questions may be answered without this gate when no repository action or
model-specific work is needed. The gate cannot inspect the model picker on its own; never
claim that it did.
