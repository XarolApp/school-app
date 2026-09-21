# 6. Digital Services Act duties for a tiny host of user reviews (Reg. 2022/2065)

> Research as of 21. 9. 2026. Not legal advice.

Source: [DSA on EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R2065)

## Are you covered?
Storing reviews = **hosting** (Art. 3(g)(iii)). Publishing them to the public = **online platform** (Art. 3(i)) unless it is a "minor and purely ancillary feature" — reviews are core to school comparison, so assume platform.

## Applies regardless of size
| Article | Duty |
|---|---|
| **Art. 11** | Single electronic point of contact **for authorities**, published, with **languages** accepted |
| **Art. 12** | Point of contact **for users**, easily accessible, not solely automated |
| **Art. 14** | T&C explain moderation: policies, **automated tools**, **human review**, complaint handling. **14(3)**: services aimed at minors must explain in language minors understand |
| **Art. 16** | Notice-and-action: electronic, easy mechanism for anyone. Notice must allow: explanation why illegal, **exact URL**, **name + e-mail** of notifier, **good-faith statement**. 16(4) confirm receipt; 16(5) inform notifier of decision + redress |
| **Art. 17** | **Statement of reasons** to the author for any removal / visibility restriction, **at latest when imposed**: type of restriction, facts, whether automated, legal or T&C ground, redress options |
| **Art. 18** | Notify police of suspected crimes threatening life/safety |

## Exempt as micro/small enterprise
- **Art. 19**: whole Section 3 (Art. 20–28) — internal complaint system, out-of-court dispute bodies, trusted flaggers, dark patterns (25), ad transparency, **minors protection (28)**.
- **Art. 15(2)**: transparency reports.

## Czech enforcement
- DSC will be **ČTÚ**. — [ČTÚ](https://ctu.gov.cz/digitalni-sluzby-rozcestnik)
- The implementing **zákon o digitální ekonomice (print 69) is still in 2nd reading** as of 21. 9. 2026 → no Czech fine regime yet; DSA duties apply directly anyway. — [psp.cz print 69](https://www.psp.cz/sqw/historie.sqw?o=10&T=69)

## Your app
- ❌ **Terms §9**: reason given only "na tvou žádost" → Art. 17 requires it proactively (applies to report-triggered holds **and** auto-held student reviews). Author sees only "čeká na kontrolu".
- ❌ `POST /api/reviews/:id/report` requires login, captures no reason/URL/contact/good-faith statement, no receipt, no decision notice.
- ❌ No published authority contact point + languages (Art. 11).
- ⚠️ Terms don't say that **one report auto-hides** a review (Art. 14 transparency).
- ✅ Terms state reviews are unverified, automated filter + human pre-check.
