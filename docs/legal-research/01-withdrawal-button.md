# 1. Withdrawal button (§1830a OZ, Directive 2023/2673)

> Research as of 21. 9. 2026. Not legal advice — have a Czech consumer/privacy lawyer confirm before launch.
> Sourcing: zakonyprolidi.cz was not reachable from the research environment (HTTP 403), so statute wording quoted from the Civil Code / Act 110/2019 is from memory and must be checked against the official text. Everything about in-force status comes from sources that loaded.

## Answer
**Not in force yet. Applies from 1 January 2027.**

- Transposed by **Act 159/2026 Sb.** (government bill, Chamber print 16): third reading 10. 7. 2026, Senate 19. 8., President signed 27. 8., published in the Collection of Laws **2. 9. 2026**. — [psp.cz, print 16 history](https://www.psp.cz/sqw/historie.sqw?o=10&T=16)
- Ministry of Finance: new rules apply **from 1. 1. 2027** and the button covers *all* consumer contracts concluded online (not only financial services). — [MF ČR, 7. 9. 2026](https://mf.gov.cz/cs/ministerstvo/media/tiskove-zpravy/2026/od-ledna-2027-zacnou-platit-nova-pravidla-na-ochra-65128)
- EU deadlines: transpose by 19. 12. 2025, apply from **19. 6. 2026** — Czechia is late. — [Directive 2023/2673, Art. 2](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32023L2673)
- Conflict to resolve: an earlier secondary source ([SME Union](https://www.sme-union.cz/e-shopy-ceka-tlacitko-pro-odstoupeni-od-smlouvy-snemovna-novelu-schvalila/)) said the bill would take effect "on the first day of the month after publication". Trust MF's 1. 1. 2027, but verify the effective-date article of 159/2026 Sb. on zakonyprolidi.cz / e-sbirka.cz.

## Requirements (new Art. 11a of Directive 2011/83/EU)
1. A **withdrawal function** labelled *"withdraw from contract here"* or an equivalent unambiguous wording; displayed prominently, easily accessible, available **for the whole withdrawal period**.
2. It leads to a form where the consumer gives: **name**, **contract identification**, and the **electronic means** for the confirmation.
3. A **confirmation function** labelled *"confirm withdrawal"* or equivalent.
4. The trader sends **acknowledgement of receipt on a durable medium** (e-mail) with the content, **date and time** of submission, without undue delay.
5. Withdrawal information must mention the button (updated model instructions — Government Regulation 66/2026 per [epravo](https://www.epravo.cz/top/clanky/druha-tlacitkova-novela-povinne-tlacitko-pro-odstoupeni-od-smlouvy-121308.html)).

Czech labels reported by secondary sources (enacted text not verified): **"Odstoupit od smlouvy"** and **"Potvrdit odstoupení"**.

## Penalties
Up to **5 000 000 Kč** under the Consumer Protection Act (zákon 634/1992 Sb.), enforced by ČOI — per [EY](https://www.ey.com/cs_cz/technical/tax/tax-alerts/2026/04/nove-tlacitko-odstoupit-pri-online-smlouvach) and epravo (secondary; verify).

## Small-business exemption
**None.** The directive only asks Member States to "take into account" SME needs when transposing.

## Your app (school-app)
- No withdrawal UI exists; Terms §6 only says "napiš na e-mail". **Build before 1. 1. 2027:** button in Nastavení → form (name, account e-mail, plan) → "Potvrdit odstoupení" → automatic confirmation e-mail with timestamp → cancel subscription + trigger refund.
- Requires an e-mail sending system (you have none yet — see file 05).
