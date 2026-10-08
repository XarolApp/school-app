# 4. Withdrawal period and refunds for a trial + delayed charge (§1829–1837 OZ)

> Research as of 21. 9. 2026. Not legal advice — have a Czech consumer/privacy lawyer confirm before launch.
> Sourcing: zakonyprolidi.cz was not reachable from the research environment (HTTP 403), so statute wording quoted from the Civil Code / Act 110/2019 is from memory and must be checked against the official text. Everything about in-force status comes from sources that loaded.

## When do the 14 days start?
- For services / digital content: **from conclusion of the contract** (§1829(1)). The day after conclusion is day 1; if the last day is a weekend/holiday it moves to the next working day. — [ČOI – služby](https://coi.gov.cz/faq/5-odstoupeni-od-smlouvy-do-14-dnu-u-sluzeb-4/), [ČOI – digitální obsah](https://coi.gov.cz/faq/9-odstoupeni-od-smlouvy-do-14-dnu-u-digitalniho-obsahu/)
- **Trial with delayed charge:** the terms describe contract formation at the order button plus completion at Stripe, distinct from account signup and the later charge. Do not describe the withdrawal window as starting at account signup. Confirm the contractual boundary with counsel and preserve evidence of completed checkout.
- **Monthly 249 Kč:** 14 days from the first order. Renewals are not new contracts — no new withdrawal period each month.

## May the seller deduct for use?
**§1834 – proportional payment**, only if **both**:
1. the consumer **expressly requested** the service to start during the withdrawal period, and
2. the trader informed them beforehand (§1820(1)) that they will pay for what was provided.

Without this: **no deduction**, even if the service was used. — [ČOI – služby 8](https://coi.gov.cz/faq/8-odstoupeni-od-smlouvy-do-14-dnu-u-sluzeb/)

## Losing the right entirely (§1837)
- a) service **fully performed** with prior express consent and acknowledgement of loss of the right;
- l) digital content made available with express consent (**active step**, e.g. checkbox) + acknowledgement + confirmation (§1824a).
- ČOI treats digital content and digital services alike here. — [ČOI – digitální obsah/služba](https://coi.gov.cz/faq/smlouvy-o-poskytovani-digitalniho-obsahu-ci-sluzby/), [ČOI – výjimky](https://coi.gov.cz/faq/b-v-jakych-pripadech-nemohu-od-smlouvy-odstoupit-13/)
- A season-long subscription is not "fully performed" within 14 days → don't build on this exception.

## Refund mechanics
Return all payments **within 14 days** of withdrawal (§1831), by the same payment method unless agreed otherwise.

## Current implementation — checked 8 October 2026

- Terms §6 promises a full refund without a use deduction and at least 14 days after the seasonal charge. Section 7 also promises a full refund within 30 days for an unauthorized minor payment and access to the Settings button.
- The server's `WITHDRAWAL_DAYS` is **30**, measured from the later relevant contract/charge timestamp. The earlier audit allegation of a 14-day implementation cutoff was retracted. Calendar/DST/renewal interpretation of the broader promise remains to agree and test.
- `REFUND_GUARANTEE_DAYS = 0` disables a separate marketing guarantee; it does not remove the terms or implemented withdrawal/refund path. Its source comment describing only a statutory 14-day path is stale.
- The implemented refund path has purchase-attribution, race and recovery defects. Fix those before real billing; see [handoff sections 6–7](../../reports/deployment-review-2026-10-07/HANDOFF-PLAN.md). No live-money refund was executed in this review.
