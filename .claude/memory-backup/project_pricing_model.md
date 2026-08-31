---
name: project-pricing-model
description: "ŠkolaMatch's final pricing structure — one-time season pass pre-selected, monthly recurring secondary, no weekly plan."
metadata: 
  node_type: memory
  type: project
  originSessionId: d0f132e8-7c74-4943-97de-c7c8bd07c42c
  modified: 2026-08-23T18:10:55.279Z
---

ŠkolaMatch pricing settled 2026-08-23 after three research-driven revisions in one
session: **Sezónní přístup (one-time, pre-selected, fixed-window framing) + Měsíční
(recurring, secondary, trust/easy-exit framing). No weekly plan.**

**Why:** ŠkolaMatch is used exactly once per person, ever — a 9th grader picks a high
school one time in their life. That's sharper than merely "seasonal" (like a fitness
app with yearly recurring use). Weekly billing was dropped first (converts via users
losing track of small charges — the EU Digital Fairness Act's direct target, worse
given buyers may be minors). Recurring-monthly-as-default was tried next, then
reversed: the actual payer is more often the parent, who skews subscription-fatigued
and reads an unexplained recurring charge for a one-off decision as friction: a
one-time payment sidesteps that. The closest real-world precedent, UWorld (exam prep),
sells fixed-window passes that expire, not subscriptions.

**How to apply:** Season pass is pre-selected and must be described as access through
an explicit end date, never "lifetime." Monthly stays as the secondary option but its
copy should frame it as "try it first, cancel anytime" — a trust-builder for an
unfamiliar brand, not a cheaper decoy tier. This whole analysis assumes the acquisition
channel is influencer/affiliate (paid on revenue), not upfront paid-ad CPI — if paid
Meta/Google ads are ever added, the CAC-amortization math changes and this decision
should be re-opened. Full reasoning and sources in
`school-app/docs/sources/pricing_research.md` and agent ruling C-8 in
`.claude/agents/onboarding-architect.md`. See [[project-dual-buyer-model]] for the
related parental-confirmation-at-checkout requirement this same research produced.
