# Model gate

Use this gate before every task that changes files, plans work, reviews a diff, runs
a browser audit, or performs another substantial repository action.

1. Classify the task using the model table in `AGENTS.md` or `CLAUDE.md`.
2. Inspect the active model and effort from a trustworthy session indicator when one
   is available. Do not infer it from previous turns or from this file.
3. If the active model or effort is unavailable, ask the user to confirm it before
   starting model-dependent work.
4. If it is wrong, stop and tell the user exactly which model and effort to select.
5. Continue only after the user confirms the switch or the active session exposes a
   matching model and effort.

Simple factual questions do not require this gate unless answering them requires a
repository mutation or a model-specific workflow.

The gate is a behavioral instruction. A project file cannot read the model picker by
itself, so agents must never claim they verified a model they cannot actually see.
