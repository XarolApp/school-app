# 5. Pre-contract information duties (§1811, §1820, §1824, §1826a OZ)

> Research as of 21. 9. 2026. Not legal advice — have a Czech consumer/privacy lawyer confirm before launch.
> Sourcing: zakonyprolidi.cz was not reachable from the research environment (HTTP 403), so statute wording quoted from the Civil Code / Act 110/2019 is from memory and must be checked against the official text. Everything about in-force status comes from sources that loaded.

Sources: [ČOI – Na co pamatovat v průběhu objednávky](https://coi.gov.cz/faq/1-na-co-pamatovat-v-prubehu-objednavky-2/), [ČOI – novela 374/2022](https://coi.gov.cz/novela-zakona-o-ochrane-spotrebitele/), [zákon 89/2012 Sb.](https://www.zakonyprolidi.cz/cs/2012-89) (verify wording).

## Checklist — terms + checkout
### Seller (§1811, §1820)
- [ ] Name / business name, **IČO**, registered address, DIČ if VAT payer
- [ ] Contact e-mail (and phone if you have one) for questions, complaints, withdrawal
### Service
- [ ] Main characteristics of the service
- [ ] Functionality, compatibility, interoperability (digital content/service)
### Price
- [ ] Total price **incl. all taxes** — or clear statement "nejsem plátce DPH"
- [ ] Payment method; recurring frequency (monthly); **when and how much** is charged after the trial
- [ ] Notice if price is personalised by automated decision (only if applicable)
### Duration
- [ ] Contract length, minimum term, auto-renewal, how to cancel
### Withdrawal
- [ ] Conditions, 14-day deadline, procedure; **model withdrawal form**
- [ ] If relying on it: duty to pay proportional price (§1834) / loss of right (§1837)
- [ ] From 1. 1. 2027: mention of the withdrawal button (file 01)
### Other rights
- [ ] Liability for defects + complaint procedure
- [ ] Out-of-court dispute resolution: **ČOI, adr.coi.cz**
### Contract mechanics
- [ ] Language of contract; whether it's archived and accessible
- [ ] How to correct input errors before ordering
### Directly at the order button (§1826a)
- [ ] Price, duration, main characteristics shown **immediately before** the button
- [ ] Button: "objednávka zavazující k platbě" or equivalent — **violation = contract not concluded**
### After the order (§1824)
- [ ] **Confirmation of the contract on a durable medium** (e-mail with terms/PDF) within reasonable time, at latest when service starts

## Your app — source status checked 8 October 2026
| Item | Status |
|---|---|
| Order button "Objednat s povinností platby" | ✅ OK equivalent |
| Summary (price, charge date, cancel) before button | Present; completion-time, expiry/year and parent/returning-payer consistency remain to verify. Presence alone is not acceptance. |
| Error correction (Zpět), Czech language, ADR ČOI | ✅ |
| Model withdrawal form | ✅ |
| Seller identity, e-mail, VAT | Name/address/contact and non-VAT-payer wording are filled. Verify actual operator, business entitlement, applicable IČO/register details and VAT status manually; no `[DOPLNIT]` finding remains established for these fields. |
| VAT consistency | Earlier conflicting placeholder wording was removed. Actual operator status still needs confirmation. |
| Durable-medium confirmation | Supabase authentication mail is configured separately; no reviewed server order/withdrawal outbox sends the contract package. Stripe receipt settings and actual delivery remain to verify. |
| Terms/withdrawal access and accepted version | Legal pages exist; durable terms-version/order evidence and every payment entry point remain in the payment handoff. |

Free beta in exchange for feedback/personal data is not automatically outside consumer digital-service rules. Have counsel assess the immediate beta scope separately from the later paid launch; do not defer all information/confirmation duties merely because no money is collected.
