---
name: mobbin-onboarding-patterns
description: Real-shipped-product patterns for onboarding, quiz, and first-run personalization flows, sourced from a 73-search Mobbin survey (~81 products, iOS + web). Use when designing or reviewing an onboarding sequence, questionnaire, or signup flow — most useful for Claude Design. Not ŠkolaMatch-specific; broad reference material.
---

# Onboarding & quiz-flow patterns (sourced via Mobbin)

Source survey: `docs/sources/mobbin_pattern_survey.md` §2 (2026-08-25, ~60 iOS + 21
web products, 18 searches). Full products-surveyed list and per-pattern citation
links live there — this file has the distilled, actionable version.

## Patterns that separate excellent from generic

- **Question-as-persuasion, not question-as-form.** The answer options *are* the
  value proposition. Duolingo's daily-goal options price commitment right in the
  row and the CTA reads "I'M COMMITTED," not "Next." *Duolingo, Brilliant.*
- **Answer-triggered reassurance.** Selecting an option injects a coloured card
  *between* the row and the next question, before continuing — converts a
  data-collection tap into feeling understood. The single highest-craft detail in
  the whole survey. *Liven.*
- **Justify sensitive questions inline, at the field.** One line at the exact
  field explaining why it's asked. *Liven ("only use gender to personalize your
  plan"), MacroFactor, MyFitnessPal (tappable "which one should I choose?"),
  Fidelity (legal reason for SSN).*
- **Loading theatre that itemises what's being processed.** Per-section progress
  rows doubling as a recap of everything invested, not a bare spinner. *Noom
  (DEMOGRAPHIC PROFILE 100%, WEIGHT LOSS GOALS 50%...), Cal AI.*
- **The named archetype as the payoff.** The reveal is a label *about the user*,
  immediately usable as product — not a settings summary. *Mindtrip ("Curious
  Independent Explorer" + first-person paragraph + pre-seeded questions),
  Headspace ("For Calm Explorers like you" + "Why this recommendation" strip).*
- **Show the trajectory, not the number.** A two-line with/without projection
  chart mid-flow, before the paywall. *Liven, Me+, Recime (minimal one-curve
  version).*
- **Explicit commitment ritual.** The user performs an act of consent — sign your
  name, tick four promises. *Liven ("let's make a contract," honest footnote that
  the signature isn't recorded), Duolingo (CTA verb "I'M COMMITTED").*
- **Credential-borrowing at the doubt point.** Interrupt the question sequence
  with institutional or stat-based proof exactly where hesitation would occur.
  *Liven (HARVARD/OXFORD/CAMBRIDGE cards), Headspace ("10 days can increase
  happiness by 16%"), Centr (a full testimonial page as step 3 of 8).*
- **Trial timeline instead of a price wall** — same dated 3-beat rail as paywalls,
  with the first node struck through to show progress already made. *Brilliant,
  Headspace (identical on iOS and web).*
- **Signup as the door to a thing already built**, not a gate before value. "Create
  a free account to discover your personalized path." *Brilliant, MyFitnessPal
  (delays it to a near-full progress bar).* Noom is the counter-example — asks for
  email+password on screen 2, before any question.
- **Input type matched to the answer's shape.** Slider for a degree, wheel for
  continuous physical facts, capped multi-select for taste, free text only where
  personality is the point. *Life Reset, Mimo, Mindtrip (bipolar sliders resolving
  to a written label).*
- **Budgeted multi-select with a live count.** "Choose 5 things you're into,
  1/5 selected" — caps the choice so the user curates instead of ticking
  everything. *Bumble, Cosmos, Yahoo News (disables CTA, labels "0 selected").*
- **Mascot or human persona as the question-asker**, letting the flow speak in
  first person and interpret answers. *Duolingo (speech bubbles), Monarch
  (photographed human advisor).*
- **Permission priming that names the specific payload**, not a generic "Allow
  notifications?" *WHOOP (labels exactly what you'll be notified about), Agoda
  (three bullets + soft "No, thanks"), DoorDash ("you're in control, turn off
  anytime").*
- **Progress notation matched to the flow's shape.** Segmented bars for phased,
  named-phase rails for chaptered, explicit "3 of 8" for short finite. Duolingo
  deliberately shows *no* count, just a bar that visibly leaps — feels short.
- **Back is quiet, Skip is quieter, both exist.** Skip deliberately downgraded
  visually (grey text vs a filled CTA). *Bumble, The Weather Channel ("Maybe
  later" under the black Next"), Monzo ("I'm not sure" pill — the humane skip.)*
- **Anti-fraud/correction handled as coaching, not error.** Red-bordered guidance
  with a single clear fix action, not a scolding error state. *Revolut ("Blurry
  photo detected" + Enlarge + Retake), Chime (numbered promise before KYC starts).*
- **"Why do you want this?" as a segmentation question that admits its motive.**
  *Revolut ("We need this for regulatory reasons. And also, we're curious!").*
- **Web wizard ending in a priced, matched recommendation** with a persistent
  "See all plans" escape hatch — the quiz *is* the pricing page. *Zendesk.*
- **Post-signup checklist with counts/time estimates/rewards**, or real seeded
  content instead of an empty state. *Langdock (points ring), Devin (inline "3 of
  6" + struck-through earned reward), HoneyBook (per-task time estimates).*

## Checklist

- [ ] Does each screen ask exactly one thing, with answer options doing
  persuasion work?
- [ ] Does any answer get acknowledged (reassurance, interpretation), not silently
  stored?
- [ ] Is every sensitive field justified at the field, in one line?
- [ ] Is progress shown, notation matched to the flow (bar/fraction/named phase)?
- [ ] Is Back present on every question, Skip present but visually downgraded?
- [ ] Does input type match the answer's shape (slider/wheel/capped chips/free text)?
- [ ] Are multi-selects budgeted with a live count and disabled CTA until minimum?
- [ ] Is there a computation beat that itemises what's being processed?
- [ ] Does the reveal name something about the *user*, not echo their inputs back?
- [ ] Is there a with-vs-without projection over a stated horizon?
- [ ] Does account creation come after the artefact exists, framed as claiming it?
- [ ] Is the paywall a dated timeline with the charge date named?
- [ ] Are permission asks primed with the specific payload and a soft decline?
- [ ] Is there a commitment moment (signature, "I'M COMMITTED," rules agreement)?
- [ ] Post-signup: a checklist with counts/rewards, or seeded real content?
- [ ] Web: does the wizard output a priced recommendation with a persistent escape
  hatch?

## Anti-patterns

- **The 20-tap demographic interrogation with no feedback.** Identical beige rows
  never reacting to an answer. Competent, forgettable. *Noom's opening run.*
- **Signup on screen two**, before a single question — spends all goodwill before
  earning any. *Noom.*
- **The attribution question dressed as personalisation.** "How did you hear about
  us?" with 9+ radio rows — marketing attribution charged to the user's patience.
- **Emoji-per-row as the entire visual system.** No illustration or layout
  variation — reads as an emoji-decorated list. *Liven, Me+, Fabric, Revolut,
  Monarch all reach for the same trick.*
- **Progress bars that lie by omission.** No denominator, no phase label — fine
  as motivation, hostile on a 23-screen flow.
- **The "welcome to X" carousel of undifferentiated benefit slides.** Zero ask
  anything, so the user arrives at signup no more invested than at launch.
- **Skip that doesn't skip.** Skip placed directly under Next on a screen whose
  answers were never needed — the wizard exists to fill a CRM field. *Docusign.*
- **Generic centred-icon permission screens** stating no benefit. *Grok Bot.*
- **Consent by toggle-wall.** Legally-sound acknowledgement toggles over a wall of
  disclaimer prose, mid-onboarding, disabled Accept — momentum-destroying.
  *MacroFactor.*
- **Reveal that is just a receipt.** "Personalisation" that echoes inputs back as
  a settings summary — no synthesis, no name, nothing the user didn't already
  supply.
- **Countdown scarcity on a personalised plan.** "PERSONALIZED PLAN RESERVED —
  EXPIRES IN 14:59." Effective and transparently fake. *Noom.*

## Cross-cutting (see full list in the survey's "Cross-section observations")

- **Never let the user commit blind** — budgeted multi-select's live count is the
  onboarding instance of this rule.
- **The dated 3-beat timeline is shared furniture with paywalls** — same
  component, two placements; Headspace ships it identically on iOS and web.
- **Quoting the user's own words back is the strongest personalisation signal**
  across onboarding, results, and paywalls alike — the generic "For You" grid
  with no stated basis is the same failure everywhere it appears.
- **One manipulative element contaminates an otherwise honest screen** — Noom's
  countdown on an otherwise excellent plan screen is the canonical example.
