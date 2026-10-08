# 2. Contract validity with a 14–17-year-old (§31–37, §581 OZ)

> Research as of 21. 9. 2026. Not legal advice — have a Czech consumer/privacy lawyer confirm before launch.
> Updated 8 October: the original statute quotations came from memory rather than a fetched official text and have been removed. Verify the current Civil Code and obtain Czech counsel's application to this product; this note is not a verified statutory transcription or legal opinion.

## Legal questions to verify
- **§31 OZ:** assess age-appropriate contractual capacity in the actual circumstances, including amount, recurrence and the student's understanding.
- **§32 OZ:** assess the scope and evidence of any guardian authorization. Do not assume a checkbox or an email proves identity/authority, or claim a universal burden-of-proof rule from this research.
- **§581 OZ:** confirm the consequences and refund obligations where capacity was absent, including whether the Terms' voluntary partial-refund limitation is applicable.
- Reference for counsel: Civil Code, zákon 89/2012 Sb. Use the current official consolidated text; the original secondary-source link was not fetched and supplies no verified quotation here.

## Application
| Case | Assessment |
|---|---|
| 690 Kč one-off, 16–17 y/o | Arguably within §31 (comparable to buying a game/course). Moderate risk. |
| 690 Kč one-off, 14–15 y/o | Weaker; depends on pocket-money norms. |
| **249 Kč/month, auto-renewing card charge, no end date** | Requires a Czech counsel assessment of capacity, circumstances and authorization; this research did not establish that every minor's recurring contract is invalid. |

Capacity is circumstance-dependent. This file does not establish a universally safe contracting mechanism or a rule that every under-18 purchase requires parental verification. The table is an unapproved risk discussion, not a legal capacity threshold.

## Options for counsel to assess
1. A parent contracting/paying path. The existing parent payment link does not itself prove identity, authority or the identity of the contracting party; making it the default is a product/legal decision.
2. A separate guardian authorization/evidence flow. An email and timestamp can be evidence inputs, but this review has not established that an emailed click alone adequately verifies the guardian or contract authority.
3. Refund handling for unauthorized minor purchases, including whether a voluntary time/use limit is compatible with the applicable legal obligation.

A checkbox ticked by the child ("je mi 18 let, nebo souhlasí rodič") is **self-attestation, weak evidence**.

## Current implementation — checked 8 October 2026

- The payment checkbox was deliberately removed on 22 September. See the project decision in AGENTS/CLAUDE and plan 018; do not restore a superseded checkpoint as a bug fix.
- Signup has a self-declaration; neither it nor a forwarded parent-payment link verifies a guardian. Terms §7 describes unverified minor purchases and a 30-day full-refund promise, followed by a partial-refund rule.
- Counsel must assess the evidence model and whether that partial-refund limitation can apply to a contract lacking capacity. The old statement that the promise is necessarily consistent with §581 was not substantiated.
- The API refund path exists, but integrity/recovery defects remain in [payment findings](../../reports/deployment-review-2026-10-07/backend-findings.md). Beta is free for feedback and must never enter that payment path.
