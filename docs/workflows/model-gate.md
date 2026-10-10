# Model gate

Use this gate before every task that changes files, plans work, reviews a diff, runs
a browser audit, or performs another substantial repository action.

1. Classify the task using the applicable routing instructions. The table in
   `AGENTS.md` / `CLAUDE.md` routes Claude Code; Codex/GPT follows the
   `.agents/skills/codex-*` workflow and current human/session instructions.
2. Inspect the active model and effort from a trustworthy session indicator when one
   is available. A direct human confirmation for the same continuing task is
   trusted session evidence; preserve it until changed. Do not infer a model
   from a task title, skill name, or this file.
3. If neither a reliable indicator nor an existing same-task human confirmation
   establishes model/effort, ask the user to confirm it before
   starting model-dependent work.
4. Apply the human's explicit model/effort choice before repository defaults. If
   a new required stage still has an unsuitable or unconfirmed choice, state the
   needed model/effort and wait; do not repeat an already-resolved gate.
5. Continue only after the user confirms the switch or the active session exposes a
   matching model and effort.

Simple factual questions do not require this gate unless answering them requires a
repository mutation or a model-specific workflow.

The gate is a behavioral instruction. A project file cannot read the model picker by
itself, so agents must never claim they verified a model they cannot actually see.
