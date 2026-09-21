# 2. Contract validity with a 14–17-year-old (§31–37, §581 OZ)

> Research as of 21. 9. 2026. Not legal advice — have a Czech consumer/privacy lawyer confirm before launch.
> Sourcing: zakonyprolidi.cz was not reachable from the research environment (HTTP 403), so statute wording quoted from the Civil Code / Act 110/2019 is from memory and must be checked against the official text. Everything about in-force status comes from sources that loaded.

## Law
- **§31 OZ** – presumption: *"Má se za to, že každý nezletilý, který nenabyl plné svéprávnosti, je způsobilý k právním jednáním co do povahy přiměřeným rozumové a volní vyspělosti nezletilých jeho věku."*
- **§32 OZ** – if the legal representative gives consent to a specific act or purpose (in line with the customs of private life), the minor may act alone within that consent. Consent needs no special form — but **the seller carries the burden of proving it**.
- **§581 OZ** – *"Není-li osoba plně svéprávná, je neplatné právní jednání, ke kterému není způsobilá."* Whether this is absolute or relative invalidity is disputed; practically, the seller must return the money (unjust enrichment).
- Source: [zákon 89/2012 Sb. on zakonyprolidi.cz](https://www.zakonyprolidi.cz/cs/2012-89) (not fetched — verify wording).

## Application
| Case | Assessment |
|---|---|
| 690 Kč one-off, 16–17 y/o | Arguably within §31 (comparable to buying a game/course). Moderate risk. |
| 690 Kč one-off, 14–15 y/o | Weaker; depends on pocket-money norms. |
| **249 Kč/month, auto-renewing card charge, no end date** | Likely **beyond** §31. Without parental consent treat as invalid. |

Parental consent is **not formally required** by statute for every purchase, but it is the only thing that makes the recurring plan safe.

## Safest practice (ranked)
1. **Parent is the contracting party and payer** for under-18s (parent flow already exists — make it the default).
2. Otherwise **provable parental consent**: link/e-mail to the parent, parent clicks "souhlasím" from their own inbox; store timestamp + e-mail.
3. Refund on request whenever a minor paid without consent (you already promise this).

A checkbox ticked by the child ("je mi 18 let, nebo souhlasí rodič") is **self-attestation, weak evidence**.

## Your app
- Platba.jsx / SubscriptionExpired.jsx: child ticks "Potvrzuji, že je mi 18 let, nebo že s touto platbou souhlasí můj rodič…" — no verification, no record of which branch. The handoff report already flags missing auditable consent evidence.
- Terms §7 refund promise is consistent with §581 — keep it, and make sure there is an actual refund process.
