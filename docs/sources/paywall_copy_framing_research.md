# Research: Paywall Copy Framing — Loss-Averse vs Gain-Framed Copy

Research for Střední na míru paywall positioning. Scope: whether loss-framed copy ("don't lose access," "unlock before time runs out") outperforms gain-framed copy ("unlock full results," "see your ranking") on a one-time-purchase season pass, and legal/ethical fit for a minor EU audience under applicable EU consumer/privacy rules and, where in scope, Digital Services Act Article 25.

> **Evidence status, 2026-10-07:** only the legal text linked in §4 was verified in this review. Psychology references and conversion generalizations below are historical leads, not established evidence for this product. No controlled experiment for this app is recorded. Do not interpret a failed literature search as proof that no published test exists.

---

## 1. Direct evidence for loss-framed vs gain-framed paywall copy

**Direct A/B test data comparing these framings on paywalls specifically:** I could not locate any published controlled test isolating loss-frame vs gain-frame copy on mobile app paywalls, SaaS trials, or one-time purchases. This is the most straightforward answer: this document supplies no verified controlled test supporting "loss framing beats gain framing for paywalls".

**What exists instead:**
- Health communication meta-analyses (Rothman et al. 1999, Krishnamurthy et al. 2001, peer-reviewed): loss framing is *context-dependent*. It outperforms for **detection** behaviors (getting a screening test, making a one-time health check) but underperforms for **prevention** behaviors (sustained diet change, exercise habit). The mechanism: loss frames work when the behavior feels risky or aversive; gain frames work when the behavior feels like building/earning.
- Pricing/discount research: loss framing ("save $20 today") and scarcity framing ("only 3 left") are documented as persuasive for discounts and limited-time offers. But these are not the same as paywall copy — they frame the *price*, not the *access*.
- Conversion funnel case studies (vendor-published, not peer-reviewed): some fintech and SaaS blogs cite urgency + loss language ("unlock before your results expire," "access ends in 24h") as standard paywall practice, but none publish A/B test results isolating the framing variable from the urgency component.

**Honesty flag:** The paywall-framing claim appears to be industry lore (designers and growth teams repeat it) rather than measured fact. The health-communication research is real and well-cited, but it does not cleanly transfer to paywalls.

---

## 2. Distinction: true loss framing vs adjacent mechanisms

**True loss framing** ("you already have X; you will lose X if you don't pay"):
- User must already possess or feel entitled to the thing
- Classic example from prospect theory (Tversky & Kahneman 1981): "You have $100. Lose $20, or gamble 25% chance of losing $40?" Framing it as loss (vs "you have $80" as gain) increases risk-aversion, increases willingness to pay to avoid loss

**Paywall context — mechanism problem:**
- Střední na míru result: user completes quiz, generates result, sees a paywall
- User did NOT previously have access to the full ranking. The access is *new*, not *already-owned*. Framing "you will lose access" is manufactured loss — it misrepresents the user's actual entitlement state
- This is psychologically less stable than true loss framing (prospect theory requires actual prior possession) and legally riskier (see Section 4)

**Adjacent mechanisms often conflated with loss framing:**
- **Scarcity/countdown** ("only 24h to unlock"): time pressure, not loss framing — works on FOMO, documented in Cialdini's compliance research
- **Social proof loss** ("9 friends already unlocked"): social comparison, not loss framing
- **Effort/sunk cost** ("you invested 12 minutes on this quiz"): framing emphasizes completion, not loss — documented in Nunes & Drèze 2006 (endowed-progress effect)

---

## 3. Transfer gap: health communication to one-time purchase

Health communication meta-analyses show loss framing works for *aversive* behaviors (cancer screening feels risky/uncomfortable; people avoid it; loss frame makes avoiding the risk feel worse). 

Střední na míru paywall is not aversive — it's a *revelation*. The user:
1. Already completed the quiz (sunk effort)
2. Wants to see results (inherent drive, no aversion to overcome)
3. Faces a price barrier, not a behavioral barrier

In this context, loss framing doesn't address the real friction (price); it adds psychological pressure on top. Health research doesn't predict whether that pressure increases conversion or increases resentment. **This gap is untested territory.**

---

## 4. Legal scope — corrected 2026-10-07

Article 25 belongs to the **Digital Services Act, Regulation (EU) 2022/2065**. It addresses deceptive/manipulative interfaces of online platforms. Applicability requires assessing the service; Article 19 excludes qualifying micro/small providers from this section, subject to its exceptions. Article 25(2) excludes practices covered by the Unfair Commercial Practices Directive or GDPR. Other consumer/privacy duties must be assessed independently. [Official DSA, Articles 19 and 25](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022R2065).

The earlier gatekeeper/10%-fine analysis mixed different legislation. The alleged German/UK paywall cases were supported only by generic homepages and are withdrawn as unverified. This document establishes no applicable enforcement precedent or legal sign-off for this app.

Product recommendation: describe actual access and prices truthfully, avoid invented expiry/scarcity, and have counsel assess the real child-facing flow. Accurate gain-framed wording is preferable for trust; it is not an automatic compliance certificate.

---

## 5. Concrete example rewrites

**Original (loss frame, manufactured loss):**
```
Vaše skóre skončí! 🔴
Přístup ke svému žebříčku vyprší za 24 hodin.
Odemkněte NYNÍ a vyberte si své školy dříve, než ztratíte přístup.
```

**Legal exposure:** misrepresents user's entitlement state ("vyprší" / expires implies prior ownership; they didn't have this before); an invented countdown or entitlement claim needs consumer-law review; this example alone does not prove an Article 25 violation

---

**Alternative 1 (gain frame, accurate):**
```
Odemkni svůj žebříček 🔓
Projdi si podrobné pořadí a vyber si své školy.
Tvůj žebříček je připraven — teď si vezmi kontrolu.
```

**Advantage:** clearer about the purchase; still requires review against actual features, access and contract terms

---

**Alternative 2 (effort-based frame, psychologically rooted in sunk-cost/endowed-progress):**
```
Dokonči svůj žebříček 📊
Dotazník je vyplněný a výsledky jsou připravené. Projdi si pořadí a vyber si své školy.
```

**Psychological mechanism:** endowed-progress effect (Nunes & Drèze 2006, peer-reviewed) — users are more motivated to complete a task when they've already invested effort and see the finish line. This is evidence-adjacent (not a guess) and avoids manufactured loss.

**Advantage:** moves persuasion to what's true (sunk effort, goal-gradient, completion) rather than false (imminent loss)

---

## 6. Recommendation

**Do not use loss-framed copy** ("don't lose access," "expires in 24h") on this paywall for a minor audience. The combination of:
- Manufactured loss (user never owned the full result)
- Minor audience (heightened vulnerability under DSA)
- EU jurisdiction (consumer/privacy duties and DSA scope require assessment)

...creates a trust/legal-review concern; this project has no recorded experiment demonstrating a conversion benefit.

**Use gain-framed copy instead:**
- "Odemkněte svůj žebříček" / "Unlock your ranking" (simple, clear, accurate)
- Pair with concrete value: "See schools ranked by fit and save your favorites". Open-day notifications are not implemented and must not be promised.

**If using completion-based language:**
- Lead with sunk-cost/completion language: "You've done the hard part; finish your ranking" + "last step: choose your first school"
- This is a design hypothesis drawn from historical research; transfer to this paywall remains unverified.
- Mention only real effort; never invent minutes, completed work or a mandatory purchase step.

---

## 7. Failure modes if loss framing is used anyway

- **Regulatory risk:** false urgency or access claims need legal assessment. No edtech-paywall enforcement case was verified for this research.
- **Trust damage:** Parents and teens, if primed to think Střední na míru is manipulative, are unlikely to pay or refer. Edtech trust is fragile.
- **No conversion lift to show for the risk:** Without A/B test proof that loss framing converts better, you're taking legal/reputation cost for no measured gain.

---

## 8. Sources

- [Rothman, A. J., et al. (1999). The impact of health-relevant behavior on message framing effects: The case of condom use]. *Health Psychology*, 18(2), 149–158. (peer-reviewed meta-analysis on loss vs gain framing in health behavior)
- [Krishnamurthy, P., Carter, P., & Blair, E. (2001). Attribute framing and goal framing effects in health decisions]. *Journal of Consumer Research*, 28(1), 34–46. (peer-reviewed, context-dependence of framing)
- [Tversky, A., & Kahneman, D. (1981). The framing of decisions and the psychology of choice]. *Science*, 211(4481), 453–458. (foundational prospect theory; manufactured loss framing)
- [Nunes, J. C., & Drèze, X. (2006). The endowed progress effect: How artificial advancement increases effort]. *Journal of Consumer Research*, 32(4), 504–512. (peer-reviewed; completion/sunk-cost psychology)
- [Cialdini, R. B. (1984). *Influence: The Psychology of Persuasion*]. Harper Business. (scarcity/urgency mechanism; non-framing-specific)
- [Digital Services Act, Regulation (EU) 2022/2065](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:32022R2065), Articles 19 and 25; scope caveats in §4.
- Psychology references above are historical research leads; their bibliographic accuracy, quoted figures and transfer to this app remain unverified.

---

## 9. Gaps and honesty notes (summary)

- No verified published A/B test is supplied here comparing loss-framed vs gain-framed copy on paywalls specifically. The claim relies on analogy to health communication research, which is context-dependent and doesn't clearly transfer to one-time purchases.
- Health communication findings (loss framing works for aversive behaviors) do not predict whether loss framing works for revelatory, non-aversive paywalls. This is untested.
- No specific paywall judgment or applicable enforcement precedent was verified. Do not reuse the earlier categorical legal claims.
- The effort-based (sunk-cost) alternative is evidence-adjacent (endowed-progress effect is peer-reviewed and applies to completion tasks) but has not been A/B tested on Střední na míru paywalls specifically.
