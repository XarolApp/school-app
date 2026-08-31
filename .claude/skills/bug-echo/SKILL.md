---
name: bug-echo
description: After fixing a bug, search the rest of the codebase for the same pattern to check whether the same mistake was made elsewhere. Use this immediately after any bug fix, before considering the task done — a bug caused by a specific pattern (a missing check, a wrong assumption, an off-by-one, a forgotten cleanup step) is rarely unique to the one place it was noticed. Also use when the user says "check if this happens anywhere else", "are there other instances of this", or "did we make this mistake elsewhere too".
---

# Bug Echo

A bug you just fixed almost always has siblings. An ordinary code review or audit checks whether code is wrong *on its own terms* — it has no reason to connect one file's defect to the same mistake three files away, because it isn't looking for that specific pattern in the first place. This skill closes that gap: once a bug's *root cause* is understood, go hunt for that exact root cause everywhere else it could exist.

## When to run this

Immediately after fixing any bug, before reporting the fix as complete — not as a separate, optional audit step, but as the natural second half of "fix the bug." A fix that stops at the one reported instance is incomplete if the same mistake was made three other places.

## The process

1. **Identify the actual pattern, not just the symptom.** Don't describe the bug as "the dismiss button was missing" — describe it as the underlying mistake: "this component type doesn't inherit the base dismiss handler, so any screen built the same way is missing it too." The pattern is usually one level of abstraction above the specific bug report.

2. **Search for every place that pattern could recur.** Use Grep for the structural signature of the bug — a specific function call, a missing null check, a hardcoded value that should have come from config, a copy-pasted block. In this codebase specifically, watch for:
   - The same mistake made in both `frontend/src/lib/matching.js` (onboarding scoring) and `lib/matching.js` (standalone questionnaire scoring) — these are separately-maintained, structurally similar files, exactly the kind of pair this skill exists for.
   - The two `Paywall`-shaped surfaces (`pages/onboarding/screens/Paywall.jsx` and `pages/SubscriptionExpired.jsx`) — a payment-flow bug fixed in one is worth checking in the other.
   - Anywhere `requireAuth`/`requireAccess`/`optionalAuth` gating logic is duplicated by hand rather than reused.
   - Anywhere a hardcoded color/radius/font sneaks in despite the "tokens.js only" rule (CLAUDE.md is explicit that this is a recurring temptation).

3. **Rate each hit**, don't just fix everything on autopilot: is it the exact same bug, a near-miss that's fine for a different reason, or a structurally similar spot that isn't actually broken? Say which is which — false positives reported as bugs erode trust in the skill.

4. **Report findings before fixing them**, unless the fix is trivial and obviously safe (same one-line change as the original fix). For anything non-trivial, list what you found and let the user decide whether to fix now or defer (if deferring, this is a natural candidate for `unforget`).

## Output format

```
## bug-echo: [original bug title]

Pattern: [the actual root cause, one sentence]

Found N additional instance(s):
1. path/to/file.js:42 — [same bug / near-miss / false positive], because [why]
2. ...

Recommendation: [fix now / defer / no action needed]
```

## What this is not

This is not a general code review — it has no opinion on code it wasn't specifically looking for. It only activates once a specific bug's root cause is known, then goes looking for that exact thing. Don't use it as a substitute for `/code-review` or `/improve`.
