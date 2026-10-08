# 3. Age of digital consent (§7 zákona 110/2019 Sb.) and parental verification

> Research as of 21. 9. 2026. Not legal advice — have a Czech consumer/privacy lawyer confirm before launch.
> Sourcing: zakonyprolidi.cz was not reachable from the research environment (HTTP 403), so statute wording quoted from the Civil Code / Act 110/2019 is from memory and must be checked against the official text. Everything about in-force status comes from sources that loaded.

## Law
- **§7 of Act 110/2019 Sb.** lowers the GDPR Art. 8 age to **15**: a child may consent to processing in connection with information-society services offered directly to them from age 15. Confirmed by ÚOOÚ: *"věk dítěte pro udělení souhlasu v souvislosti s nabídkou služeb informační společnosti (dovršením 15 let)"*. — [ÚOOÚ – Základní příručka](https://uoou.gov.cz/verejnost/zakladni-prirucka-k-ochrane-udaju)
- Cited as §7 by e.g. [SMO ČR](https://www.smocr.cz/cs/cinnost/gdpr/a/online-souhlas-ditete-a-podminky-jeho-pouziti) (secondary).

## Key point: Art. 8 applies only when CONSENT is the legal basis
EDPB Guidelines 05/2020 on consent (endorsed by ÚOOÚ as EDPB member):
- Art. 8 applies **only where consent (Art. 6(1)(a)) is the legal basis**.
- It does **not affect national contract law** on validity of contracts with a child.
- Source: [EDPB Guidelines 05/2020 (CS)](https://edpb.europa.eu/sites/edpb/files/files/file1/edpb_guidelines_202005_consent_cs.pdf)

The listed legal basis must be assessed per purpose. A contract/legitimate-interest label does not automatically validate children's processing or settle device-storage consent. Optional testimonial publication and any consent-based analytics require separate assessment; contract capacity is also separate (file 02).

## "Reasonable efforts" to verify parental consent
- EDPB: **risk-based / proportionate**. For low-risk processing, **e-mailing the parent for confirmation** is given as an adequate example. Avoid collecting excessive data just to verify.
- **ÚOOÚ**: I found **no ÚOOÚ-specific guidance** defining "přiměřené úsilí" for this situation.

## Current implementation — checked 8 October 2026

- Privacy §5 now describes contractual processing and account creation together with a guardian for under-15s. The older contradiction finding is superseded.
- Signup remains self-declaration, not age or guardian verification. Its wording is not proof that the contract or all processing has a valid basis.
- Beta analytics is described as legitimate interest; a separate assessment of optional local/session-storage identifiers remains open. See [storage research](07-cookies-localstorage.md) and LEGAL-01 in the current deployment review.
- Keep optional publication consent separate from required testing feedback. Under-15 publication/authorization, children's balancing and DPIA screening remain controller/counsel decisions.
