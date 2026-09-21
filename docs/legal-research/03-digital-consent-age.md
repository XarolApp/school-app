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

Your privacy policy bases all processing on contract, legitimate interest or legal obligation → **§7 largely doesn't apply to you.** The real issue is contract capacity (file 02).

## "Reasonable efforts" to verify parental consent
- EDPB: **risk-based / proportionate**. For low-risk processing, **e-mailing the parent for confirmation** is given as an adequate example. Avoid collecting excessive data just to verify.
- **ÚOOÚ**: I found **no ÚOOÚ-specific guidance** defining "přiměřené úsilí" for this situation.

## Your app
- Privacy §5 tells under-15s to get parental "souhlas" to processing — contradicts your own legal bases. Either state the basis is contract + explain the parent-involvement approach, or (worse) switch to consent.
- Signup checkbox "Je mi alespoň 15 let, nebo mám souhlas rodiče…" – fine as a UX gate, not as verification.
