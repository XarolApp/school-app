---
name: unforget
description: Maintain a single UNFORGET.md file tracking all deferred work — paused plans, mid-task spillover, audit findings, observed-but-unfixed bugs. Use when the user asks "what's blocking this release", "what's left to do", "what did we defer", or when you yourself notice something worth fixing but out of scope for the current task and want to record it instead of losing track. Also use at the start of a session to check what's outstanding, and whenever a task is deliberately deferred, to log it before moving on.
---

# Unforget

A single `UNFORGET.md` at the repo root holds every piece of deferred work — not a scratch TODO list, a durable ledger that survives context resets and session boundaries. This project already tracks a lot of deferred work informally inside `CLAUDE.md` (the "DECISIONS YOU NEED TO MAKE" and "What's NOT Built Yet" sections) — `UNFORGET.md` is for the smaller-grained, noisier stuff that doesn't deserve permanent placement in CLAUDE.md: a bug you noticed while doing something else, a plan the user paused mid-way, a "come back to this" from an audit.

## Why this exists

Deferred work has three ways of dying quietly: it lives only in chat history that gets compacted away, it lives only in the model's memory of "things I meant to mention," or it lives in a comment/TODO buried in a file nobody greps. A single file, always in the same place, checked at natural checkpoints, is cheaper than any of those.

## The file format

Each row is one deferred item:

```markdown
## [Short title]
- **Found:** 2026-08-28, while working on [task/file]
- **Urgency:** low / medium / high
- **Risk of fixing now:** e.g. "touches RLS policy, needs its own review"
- **Risk of NOT fixing:** e.g. "silent data loss on the edge case where..."
- **Effort:** small / medium / large
- **Release/context:** which milestone this blocks, if any (e.g. "blocks Stripe go-live")

Body: what it actually is, in enough detail that a future session with zero
memory of this conversation can act on it without re-deriving the problem.
```

## When to add an entry

- The user explicitly defers something ("not now", "later", "put that on the list")
- You notice a bug, inconsistency, or missing piece while working on something unrelated, and fixing it now would bloat the current change
- A plan or task gets interrupted partway through and won't resume in this session
- An audit (`/improve`, code review, this skill's own review) surfaces a finding that isn't being fixed immediately

Don't log routine TODOs already tracked in CLAUDE.md's own roadmap sections (Stripe integration, trial reminder email, etc.) — that would just duplicate the existing tracking. `UNFORGET.md` is for things that fell out of a specific conversation or task, not the project's known standing backlog.

## When to read it

- At the start of a session if the user asks "what's outstanding" or "what's blocking X"
- Before finalizing/shipping something (a release, a merge) — scan for anything tagged with that context
- Periodically, as a sanity check that nothing quietly rotted

## Workflow

**Adding an entry:** Read the existing file (create it if missing, with a one-line header explaining its purpose), append the new entry under the correct section, keep entries in reverse-chronological order (newest first) so the freshest deferred work is easiest to find.

**Answering "what's blocking this release":** Read the whole file, filter by the `Release/context` field and by urgency, and summarize — don't just paste the raw file back, synthesize it into a short prioritized list.

**Closing an entry:** When deferred work actually gets done, move the entry to a `## Resolved` section at the bottom with the date and a one-line note on what was done, rather than deleting it outright — a short resolved log is useful history and costs nothing to keep.

## What this is not

This is not a replacement for CLAUDE.md's structured roadmap sections, and it's not a replacement for git commit messages or PR descriptions. It's specifically for the connective tissue — things that would otherwise only exist in someone's memory of a conversation that already ended.
