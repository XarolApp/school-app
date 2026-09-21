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

## Your app — status
| Item | Status |
|---|---|
| Order button "Objednat s povinností platby" | ✅ OK equivalent |
| Summary (price, charge date, cancel) before button | ✅ |
| Error correction (Zpět), Czech language, ADR ČOI | ✅ |
| Model withdrawal form | ✅ |
| Seller identity, e-mail, VAT | ❌ `[DOPLNIT]` — launch blocker |
| VAT consistency | ❌ `Plan.jsx` says "Ceny jsou včetně DPH", terms say "pokud jsme plátci [DOPLNIT]" |
| Durable-medium confirmation | ❌ no e-mail system; Stripe setup-mode (trial) sends no receipt — check Stripe receipt settings |
| Link to terms/withdrawal info on the checkout screen | ⚠️ terms accepted at signup only; add a link next to the button |
