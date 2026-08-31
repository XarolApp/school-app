# Design direction — founder interview

Running log of decisions about how ŠkolaMatch should look and feel. Feeds the
`DESIGN.md` rewrite together with (a) the Cowork research output from
`design_direction_research_prompt.md` and (b) Mobbin reference screens.

**Status:** interview complete (rounds 1–4). Two decisions deferred — colour (needs
Mobbin) and score display (needs the real matching engine). Execution plan lives
outside the repo at `~/.claude/plans/concurrent-seeking-wreath.md`.

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

## Round 2 — imagery, results, colour, voice

### 5. Pictures
**No school photos for v1.** Photographing or licensing images for ~60 schools
(later 500+) is too costly now — logged to the future brainstorm instead. Visual
warmth is carried by **animations built in Claude Design**.

*Revised after research (see below):* a small set of **real Czech student photos**
on landing/onboarding is planned **post-launch**, not v1.

### 6. How results arrive
**Walk the user through the top schools one at a time**, each with an AI-written
explanation of why it fits. Ranking is applied across the whole database; only the
top few get generated prose.

Founder's cost constraint: generating AI explanations for 500+ schools per user
would be prohibitively expensive. Detailed text appears **on click**, not for every
school up front.

### 7. Colour
**Deliberately deferred** to the research and Mobbin references. Only standing
instruction: avoid AI slop.

### 8. Voice
**Light touch.** Neutral labels most of the time; genuinely human at the moments
that matter — results, paywall, empty states. This is the most literal expression
of the "counselor + database" answer from Round 1.

---

## Round 3 — score display, tension, motion, dark mode

### 9. What the student sees on a match
**Deferred** until the real matching engine (on the founder's laptop) is available.

Context: the `matching.js` in this repo computes a 0–1 score and ranks every school,
but **deliberately displays bands, never percentages** — its header states that with
only `name`/`location`/`programs` in the database, "97% shoda" would be a lie. The
founder's preference is percentages for v1; the research disagrees strongly. See
"What the research overturned" below.

### 10. The Round 1 tension, resolved
**Trustworthy in a calm way, without being a people-pleaser.** The app gives you
real results you can rely on. Above all it must avoid the
"not-easy-to-use / GitHub-Supabase feeling."

Operationally: **confidence comes from craft and honesty, never from urgency,
energy, or flattery.**

This refines Round 1's "counselor + database" usefully — the app is willing to tell
you a school *isn't* a good fit. Honesty is a trust mechanism, not a coldness.

### 11. Motion
**One big moment + subtle elsewhere.** *Revised after research:* the big moment
belongs on the **landing page**, not the results screen. See below.

### 12. Dark mode
**Both themes, full parity.**

---

## Round 4 — type, shape, density, landing page

### 13. Fonts
**Start fresh — all three current faces dropped** (Newsreader, Hanken Grotesk,
JetBrains Mono). New type system to be chosen against Mobbin references.

### 14. Softness
**Softer** than the current 6–12px radii. Exact values to be set from references.

### 15. Density
**Spacious for results, dense for browsing.** The emotional screens breathe; the
search/browse list stays efficient for someone comparing many schools.

### 16. Landing page (`úvodní page`)
Do all three jobs, in sequence, then hand off to the quiz:
1. Prove it's real and works
2. Make them feel understood
3. Get them into the quiz

---

## Governing rule (2026-08-25)

> "Stick with real facts + successful sites on Mobbin. Ignore my last answers where
> they conflict."

Where founder taste conflicts with sourced evidence or observed successful products,
**evidence wins**. These interview answers are **intent, not specification**.
Anything overruled this way must be flagged in the rewrite, never silently swapped.

---

## What the research overturned

From `design_direction_research.md`. Three Round 2–3 answers conflict with evidence.

**1. Match percentage — evidence is against it (decision deferred).**
Hinge ships no number. The closest-matched study — Corcoran et al., NYC 8th graders
choosing among ~400 high schools, n≈19,109 — worked with **no score**.
GreatSchools' 1–10 rating correlated with student demographics and tracked with
increased housing segregation. OkCupid demonstrated the displayed percentage drives
behaviour **independent of actual compatibility**.

The research offers a third option better than either previously considered:
**show met/unmet criteria the student themselves supplied.** A warm band flatters;
a number fakes precision; a criteria list does neither, and structurally cannot be a
verdict on the person. Final call pending the real engine.

**2. No reveal drama at results.** Somerville et al. (fMRI, n=69) found sensitivity
to social evaluation peaks at **~15.3 years**, with arousal elevated during
**anticipation**, not only evaluation. A "calculating your match…" spinner or a
counting-up number is precisely the flagged pattern. The hero animation goes on the
landing page; results appear calmly and immediately.

**3. Photos partially reinstated.** NN/g found stock photography is detected and
penalised by teens (read as "they want my money"), while authentic imagery earned
*"it seems like it's not about taking your money."* Real student photos also solve
the dual-audience problem in one move. Animations for v1; real photos post-launch.

---

## Still open

1. **Colour** — pending Mobbin references
2. **Score display** — pending the real matching engine
3. **Detail vs airiness** — genuine evidence conflict; needs testing
4. **Warm-soft vs warm-defiant** — taste decision, not an evidence decision
5. **Whether the screen-2 persona branch should exist** — no precedent exists for
   two genuinely independent buyers
