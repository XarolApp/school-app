---
name: project-dual-buyer-model
description: ŠkolaMatch treats teenagers AND parents as buyers; onboarding forks by role. Do not assume the parent is the only payer.
metadata: 
  node_type: memory
  type: project
  originSessionId: d0f132e8-7c74-4943-97de-c7c8bd07c42c
  modified: 2026-08-16T07:07:09.187Z
---

ŠkolaMatch has **two independent buyer personas — students and parents — and both convert.**
The onboarding asks "Kdo jsi?" (student/parent) up front and branches voice (tykání vs
vykání), proof type (peer vs authority), motion level, question phrasing (about yourself
vs about your child), and price framing. Both branches end at a real purchase; neither is
a funnel into the other.

**Why:** The user corrected an earlier assumption of mine that the teen is a user who
fetches a parent to pay. Their position: 15-year-olds will readily pay ~10 USD / ~250 Kč
for help with a decision this consequential — same demographic that pays for Spotify and
Duolingo Super. Treating the student as a lead-gen step toward the parent discards a large
share of revenue. Parents still matter and need a trustworthy, credibility-led variant.

**How to apply:** When designing any monetisation, paywall, pricing or onboarding surface,
never write copy implying a teenager needs permission or can't buy. A "send to parents"
option sits *beside* the student's buy button, never instead of it. Track conversion by
role separately — a blended number hides which branch is broken. Encoded in detail in
`.claude/agents/onboarding-architect.md` §0.2; see [[feedback-documentation]] for keeping
CLAUDE.md in sync.
