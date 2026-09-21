# 4. Withdrawal period and refunds for a trial + delayed charge (§1829–1837 OZ)

> Research as of 21. 9. 2026. Not legal advice — have a Czech consumer/privacy lawyer confirm before launch.
> Sourcing: zakonyprolidi.cz was not reachable from the research environment (HTTP 403), so statute wording quoted from the Civil Code / Act 110/2019 is from memory and must be checked against the official text. Everything about in-force status comes from sources that loaded.

## When do the 14 days start?
- For services / digital content: **from conclusion of the contract** (§1829(1)). The day after conclusion is day 1; if the last day is a weekend/holiday it moves to the next working day. — [ČOI – služby](https://coi.gov.cz/faq/5-odstoupeni-od-smlouvy-do-14-dnu-u-sluzeb-4/), [ČOI – digitální obsah](https://coi.gov.cz/faq/9-odstoupeni-od-smlouvy-do-14-dnu-u-digitalniho-obsahu/)
- **Trial with delayed charge:** the contract is concluded at checkout (card saved, "Objednat s povinností platby"), **not** at the first charge. So for the seasonal pass: 14 days from sign-up; the charge on day 3/4 falls inside the window → full 690 Kč refundable if withdrawn by day 14.
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

## Your app
- Terms §6 promises full refund with **no deduction** and extends the seasonal window to 14 days after the charge — legal (more generous than required). Business cost: someone can use the service ~13 days and get everything back.
- `pricing.js`: `REFUND_GUARANTEE_DAYS = 0` and the handoff report says not to promise refunds until a real Stripe refund process exists. **A promised refund you can't execute is a ČOI violation** — build the refund path (admin action or webhook) before launch.
