---
name: skill-reviewer
description: Audit a Claude Code skill (a SKILL.md file and its bundled resources) and report findings with file:line citations and severity ratings, checking safety, discoverability, architecture, and test coverage. Use this before publishing a new skill, or when an existing skill isn't triggering when expected and you can't tell why. Not for reviewing regular application code — that's /code-review; this is specifically for auditing skill definitions themselves.
---

# Skill Reviewer

Audits one skill's `SKILL.md` (and any bundled `scripts/`, `references/`, `assets/`) across four lenses, and reports findings the way a code review does — with citations and severity, not just prose impressions.

## When to run this

- Before publishing/committing a new skill to `.claude/skills/`
- When a skill exists but isn't triggering on prompts that should match it, and it's unclear why
- As a periodic check on skills that have accumulated edits over time and may have drifted

## The four lenses

### 1. Safety
- Does the skill ask for anything that violates the Principle of Lack of Surprise — could following its instructions do something the user wouldn't expect from its name and description?
- Does it request destructive, irreversible, or credential-touching actions without an explicit confirmation step?
- Does it hardcode secrets, tokens, or paths that shouldn't be committed?

### 2. Discoverability
- Is the `description` field specific enough to trigger reliably, and does it name concrete contexts/phrases a real user would type — not just an abstract summary of what the skill does?
- Is the description "a little pushy" (per skill-creator's own guidance) so the model doesn't undertrigger it, without being so broad it triggers on unrelated requests?
- Does the name collide or overlap meaningfully with another skill in `.claude/skills/`, such that Claude might pick the wrong one or never disambiguate?

### 3. Architecture
- Is `SKILL.md` under ~500 lines, with anything larger deferred to `references/` with clear pointers on when to read them?
- Are bundled `scripts/` used for genuinely deterministic/repetitive work (not vague "run this and see"), and are `references/` used for docs rather than being duplicated inline?
- Does the skill duplicate logic that already exists in another skill or in CLAUDE.md, instead of pointing to it?
- Is the instruction style explaining the *why* behind requirements rather than a wall of rigid ALL-CAPS MUSTs — per skill-creator's own writing guidance, heavy-handed rigid phrasing is a yellow flag, not a strength.

### 4. Tests
- Does the skill have `evals/evals.json` test cases, and if not, should it (per skill-creator's own guidance: skills with objectively verifiable output benefit from tests; skills with subjective/stylistic output often don't)?
- If evals exist, do the assertions actually verify something meaningful, or are they trivially always-true?

## Process

1. Read the target `SKILL.md` in full, plus any files it references from `scripts/`, `references/`, `assets/`.
2. Check the skill's `name` and `description` against the other skills already in `.claude/skills/` (and any project-scoped skills) for overlap or ambiguity.
3. Walk each of the four lenses above, noting concrete findings — not "this could be better" but the specific line and specific problem.
4. If the skill isn't triggering as expected, look specifically for: a description phrased as internal documentation rather than a triggering pattern, missing concrete trigger phrases, or an overlap with a broader skill that's likely winning the match.

## Output format

Report findings most-severe first:

```
## Skill Review: <skill-name>

### Safety
- [severity] file:line — finding, and why it matters

### Discoverability
- [severity] ...

### Architecture
- [severity] ...

### Tests
- [severity] ...

## Summary
[1-3 sentences: is this skill ready to ship, and what's the single highest-priority fix]
```

Severity scale: **blocking** (safety issue or the skill won't trigger/work at all), **should-fix** (real problem, not urgent), **nit** (small polish). Use an empty section (just "No findings.") rather than manufacturing something to fill it.

## What this is not

This does not review the *content* the skill produces when run (that's testing the skill via skill-creator's eval loop, or just trying it). This reviews the skill *definition itself* — is it safe, will it trigger, is it well-organized, is it tested.
