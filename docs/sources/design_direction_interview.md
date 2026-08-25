# Design direction — founder interview

Running log of decisions about how ŠkolaMatch should look and feel. Feeds the
`DESIGN.md` rewrite together with (a) the Cowork research output from
`design_direction_research_prompt.md` and (b) Mobbin reference screens.

**Status:** in progress. Round 1 complete.

**Why this exists:** the first `DESIGN.md` pass produced a system that read as a
developer tool (GitHub / n8n / Supabase). The goal is warm, trustworthy,
easy-to-use. This interview establishes what those words actually mean here before
any tokens get written.

---

## Round 1 — emotional foundation

### 1. What the app *is*, as a person
**A counselor who is on your side, crossed with a mechanical database.**

Not one or the other. It genuinely wants to help you and is on your side — but it
is also honest, factual machinery, not a personality. It does not perform
friendliness.

*Design implication:* warmth must come from **care and framing**, not from
decoration, mascots, or cuteness. The facts themselves stay plain and honest. This
rules out the illustrated-companion register; it does not rule out warmth.

### 2. How the decision feels to a 15-year-old
**Stressful and scary.** A big, irreversible choice they're anxious about getting
wrong.

*Design implication:* the app's job is to **lower felt pressure**. Generous space
over density, calm pacing, nothing that reads as a verdict or a grade, no visual
language that resembles being tested or judged. Reinforces the existing zero-shame
rule rather than merely coexisting with it.

### 3. Student vs parent priority
**Student-first, with three named exceptions.**

Roughly 50% of students pay themselves; for the other 50% a parent pays but **the
student is still the primary user**. The parent's main role is funding, not usage.

Dual-audience surfaces (must work for both student *and* parent):
- Onboarding
- Paywall
- The **úvodní page** — the landing page a parent lands on before any account
  exists, up to the button that starts onboarding

Everything else — search, results, comparison, school detail, saved schools — is
**student-first** and should not be compromised for adult tastes.

### 4. Register
**Revolut / Spotify.** Modern, confident, real personality in the details, but
unmistakably a serious product handling something that matters. Explicitly *not*
Notion/Linear (too quiet, closest to what was just rejected) and *not* Duolingo
(too playful).

---

## Open tension to resolve in a later round

Answers 2 and 4 pull against each other and this is worth deciding consciously
rather than splitting the difference by accident:

- "**Stressful and scary**" argues for calm, soft, slow, reassuring — the
  Headspace/Airbnb end of the scale.
- "**Revolut / Spotify**" argues for confident, energetic, punchy — a register
  that is modern and self-assured rather than soothing.

Both are achievable together, but only in a specific way: **confident structure,
calm content.** Revolut's confidence comes from typography, motion and precision —
not from urgency or visual noise. That's the version that can coexist with an
anxious 15-year-old. To be confirmed explicitly.

---

## Rounds remaining

2. Imagery, how results are presented, color temperature, whether the UI speaks
3. Density, motion, dark mode, first-impression priorities
4. Concrete look — shapes, buttons, type feel
5. Reference-driven (once Mobbin is available)
