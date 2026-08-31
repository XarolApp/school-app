---
name: prompter
description: Silently check whether the user's own prompt is clear and specific enough before acting on it, and propose a rewrite if not — only when the prompt is genuinely vague or ambiguous enough to risk a wrong-turn response, never for prompts that are already clear. Use this as a quick pre-check on any substantial task request, especially multi-step or open-ended ones, before diving into implementation. Do not use it for simple, unambiguous requests — it should be invisible when the prompt is already fine.
---

# Prompter

A cheap check that runs before acting on a request: is this prompt specific enough that acting on it now won't burn a full turn producing the wrong thing? Most prompts are fine as-is — this skill should be silent for those. It exists for the ones that aren't.

## When to actually intervene

Only when the prompt has a real ambiguity that would change the shape of the work — not stylistic nitpicking, not "I could ask a clarifying question about anything." Concrete signals worth flagging:

- **Missing scope boundary** on a request that could reasonably mean a tiny fix or a large refactor ("clean up the auth code" — one file? the whole auth layer?)
- **Ambiguous referent** — "fix it" / "that thing" / "the other one" where more than one candidate plausibly matches, and picking wrong means redoing the whole task
- **Conflicting or missing constraint** that changes the approach entirely (e.g. asking for a change that would touch a file CLAUDE.md marks as a trap, without acknowledging that)
- **Underspecified output** where the format matters and isn't stated (a report vs. code changes vs. just an answer)
- **A request that silently contradicts an established decision** in this project's CLAUDE.md/DESIGN.md (e.g. asking to add a third pricing tier when the doc explicitly locked in exactly two, or asking to animate the results reveal when DESIGN.md explicitly forbids it) — in this case the "rewrite" is really a flag that the request conflicts with a recorded decision, not just a clarity issue.

## When to stay quiet

If the prompt names a specific file, a specific behavior change, and enough context to act — just act. Do not manufacture ambiguity to justify running this skill. A prompt like "fix the typo in the SignUp.jsx trial copy" needs no intervention. Overtriggering this skill is worse than never triggering it — it trains the user to see it as friction rather than a safety net.

## What to do when a prompt does need it

1. State briefly what's ambiguous and why it matters for the outcome (not just "this could be clearer" — say what the two or more readings actually are and how they'd lead to different work).
2. Propose a specific rewrite, or ask a targeted question (use `AskUserQuestion` if the choice is genuinely the user's to make and can't be inferred from context).
3. Wait for the user's confirmation or correction before proceeding — don't rewrite the prompt and immediately act on your own rewrite without their sign-off, since the whole point is that you might have inferred wrong too.

## Output format when intervening

```
Before I start — [the request] could mean either:
1. [reading A] — would involve [rough shape of that work]
2. [reading B] — would involve [rough shape of that work]

Which did you mean? (Or if it's actually both / something else, say so.)
```

Keep it short. This is a fast gate, not an essay.
