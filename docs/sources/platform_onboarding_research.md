---
title: Platform & Onboarding Strategy Research — ŠkolaMatch
date: 2026-08-25
status: research reference, not a decision record
---

# Platform & Onboarding Strategy Research

## What this document is about

ŠkolaMatch is a Czech product that helps 9th graders (age ~15) and their parents choose a high school (střední škola). Relevant properties of the product, assumed throughout:

- **Two surfaces, both real.** A mobile app is planned before public launch and is intended to be the primary way people use the product. A web app (React 19 + Vite) is being built first and remains a permanent, fully-working second surface on both desktop and mobile browsers. Neither is a stub.
- **The app framework is not yet chosen.** React Native is a candidate because it would allow reuse of existing React components and the deterministic matching/scoring engine.
- **Onboarding is a 23-screen flow containing a 10-question quiz**, running *before* any registration. The user answers anonymously, sees their #1 school match free, and hits a paywall for the rest. Registration and payment come at the end.
- **Quiz answers live only in browser `sessionStorage`** — a deliberate GDPR data-minimisation choice, since the user may be a minor and nothing about them is written to the database during onboarding.
- **Two buyer personas branch at screen 2**: the teenager and the parent. Both pay independently; neither funnels into the other.
- **Acquisition is influencer/affiliate driven** (Czech teenage TikTok and Instagram), so most traffic arrives as mobile browsers from in-app link previews.
- **The product is used essentially once per person, ever.** One high school decision. Not a habit or retention product.
- **The audience includes minors in the EU.** GDPR and the Digital Fairness Act's dark-pattern rules are binding. No manipulative urgency, no fake scarcity.
- **Visual design is complete for 390px mobile.** Desktop web has no design yet.

---

## Verdict

Ten decisions the evidence supports. Each says what to do.

1. **Run the entire quiz, the free #1 result, the paywall, and the purchase on web. Do not require an app install anywhere in that flow.** This is option (d) from the original framing. The evidence for it is stronger than for any alternative, and one number drives it: paywall conversion is roughly **6% on web versus 2% in native apps** ([Business of Apps, 2026](https://www.businessofapps.com/data/web-to-app-benchmarks/)). Putting an install between a user and the paywall costs money at the exact moment you are trying to make it.

2. **Delete the mid-funnel install prompt from the plan entirely.** Google's own study of app-download interstitials found **69% of users abandoned the visit** when shown one; removing it raised one-day active mobile web users **17%** while native installs moved only **−2%** ([Google Search Central, 2015](https://developers.google.com/search/blog/2015/07/google-case-study-on-app-download-interstitials)). Flagged: this study is from 2015 and is the oldest source in this document. It is cited because it remains the largest published controlled test of this exact intervention and because no post-2023 source contradicts it — but treat the precise figures as directional.

3. **Position the app as the post-purchase surface, offered after payment succeeds, never before.** Keep it genuinely primary for what happens *after* the decision-support moment — saved shortlists, deadlines, notifications, school comparison over months. This preserves the app-primary constraint while removing the install from the conversion path.

4. **Take payment on web, not through in-app purchase, wherever legally possible.** App store commission is 15–30%; web payment processing averages about **6%** ([Business of Apps](https://www.businessofapps.com/data/web-to-app-benchmarks/)). At a 200–500 CZK price point on a once-per-lifetime purchase with no renewal to amortise, that spread is a material fraction of unit margin.

5. **Design desktop web as a first-class surface, not a stretched phone layout.** Czech desktop share is **50.43% versus 48.11% mobile** (StatCounter, July 2026) — desktop is *the plurality platform in this market*, not a secondary one. This is the single most consequential local finding in this research and it contradicts the "desktop is secondary" assumption in the brief.

6. **Keep one question per screen on mobile; group 2–3 related questions per screen on desktop ≥1024px.** Academic survey research finds **no significant completion-rate difference** between paging and scrolling on desktop, while paging measurably *slows* mobile users and lowers their satisfaction ([SurveyMonkey research summary](https://www.surveymonkey.com/curiosity/pros-cons-of-scrolling-and-multiple-pages-in-surveys/)). Grouping on desktop also means a mid-flow abandon preserves the answers already submitted on completed screens.

7. **Keep the quiz at 10 questions.** Quiz-funnel data puts the **9–12 question band at the highest conversion (11.0%)**, above both 6–8 (10.4%) and 13+ (9.9%) ([ConvertFlow, 2026](https://www.convertflow.com/blog/how-to-fix-ecommerce-quiz-funnel-drop-off-in-2026)). The current design is already in the optimal band. Do not shorten it.

8. **Do not gate the free #1 result behind an email.** The email gate is the steepest single cliff in a quiz funnel — **30–50% of users who finish the quiz drop at that one step**. Offer email capture only *after* the free result is visible, framed as "where should we send your results?" rather than "unlock your results."

9. **Build no cross-device handoff mechanism for v1.** For a once-per-lifetime product where the whole flow can complete in a single session on one device, deferred deep linking, one-time codes, and QR handoff are all complexity without a payoff — and fingerprint-based deferred deep linking constitutes personal-data processing under GDPR requiring a documented legitimate-interest assessment or explicit consent ([Tolinku](https://tolinku.com/blog/deferred-linking-privacy-considerations/)). If you later need one, use a **short-lived server-side session token in a shareable URL**, not fingerprinting.

10. **Note that Czech law is more permissive here than assumed: the Czech digital age of consent is 15** (Act No. 110/2019 Coll.), so a 15-year-old can validly consent to processing of their own data for information society services ([EuConsent](https://euconsent.eu/digital-age-of-consent-under-the-gdpr/)). Keep the `sessionStorage` design anyway — it is good practice and reduces breach surface — but understand that some 9th graders are 14, and the rule flips for them. Design for the 14-year-old case, not the 15-year-old one.

---

## Q1 — Where should the onboarding quiz live?

**Answer: on web, with no app requirement in the conversion path (option d).**

The four options and what the evidence says about each:

### (a) Full quiz on web, then install app to see results

This is the worst-performing option available and it should be rejected outright. It places an install between the user and the value they just spent 23 screens earning. Google's controlled test of exactly this shape of interruption — a full-screen app-install demand placed between a user and content they came for — found **69% abandonment**, with native installs essentially unchanged (−2%) when the interstitial was removed and mobile web daily actives up 17%.

The mechanism generalises even if the 2015 numbers do not: the install is a context switch (browser → store → account/password → download → open) with multiple independent failure points, imposed at the moment of highest earned intent. Every step is a fresh opportunity to abandon.

### (b) Install first, quiz in-app

Worse than (a) for this traffic profile. Acquisition is TikTok and Instagram link previews, which open in **in-app browsers** — the user is already two layers deep in another app's webview. Asking them to leave that, visit a store, install, and open a new app *before they know what the product does or whether it is any good* inverts the value-first order that quiz funnels depend on. There is no free result yet to motivate the install. This option only makes sense when the app itself is the advertised object, which is not the case here.

### (c) Full quiz independently on both, no handoff

Structurally defensible and it is the fallback if the app must ship with quiz parity. The cost is duplicated flow logic across two codebases and two paywall implementations — meaningful for a solo developer, and it doubles the surface area for the DFA-compliance requirements (cancellation clarity, no dark patterns) that must be right on both.

Its deeper problem is that it does not answer the question it appears to answer: if both surfaces run the quiz and the user lands on web, the app is not actually acquiring anyone. It just makes the app *possible* to use standalone without making it *likely*.

### (d) Quiz on web, app never required — RECOMMENDED

This is what the economics point to. Beyond the interstitial evidence, the direct comparison matters most:

| Metric | Web | Native app |
|---|---|---|
| Paywall conversion | **6%** | **2%** |
| Payment commission | ~6% | 15–30% |

Source: [Business of Apps, Web to App Benchmarks 2026](https://www.businessofapps.com/data/web-to-app-benchmarks/). Flagged as thin: this is an aggregate cross-category figure from a page whose detailed charts sit behind a membership paywall; the underlying sample and category mix are not visible. It is directionally consistent with the rest of the literature but should not be treated as precise for your category.

The web-to-app industry's own framing supports the same conclusion by omission: **$12.2 billion was spent on web-to-app user acquisition in 2024, about 16% of total UA spend** — that entire industry exists to move users to apps *because apps monetise recurring engagement better*. Your product has no recurring engagement to monetise. The strategic reason to push installs does not apply to a once-per-lifetime purchase.

**Honest counter-case for the app being primary anyway:** the app is a better home for post-purchase use (deadline notifications, shortlist revisits over the Sept–March window, push reminders about application dates), and push notification access genuinely cannot be replicated well on iOS web. That is a real argument — but it is an argument for the app as a *post-purchase* surface, which is compatible with recommendation 3 above, not an argument for putting it in the funnel.

---

## Q2 — How bad is the install step, and does showing the free result first help?

**How bad:** severe, and it compounds. Each of browser → store → download → open → (deferred link resolution) loses users independently. The Google figure (69% abandonment at the interstitial alone) is the best single published number, with the caveats already noted.

**Does showing the free #1 result before the install prompt help?**

**No direct experimental evidence was found for this specific question.** No study in this research isolated "value shown before install ask" versus "value shown after" as a controlled variable. What follows is inference from adjacent evidence, and is labelled as such.

Adjacent evidence that supports the inference:
- Quiz-funnel data consistently shows that **previewing a result before a gate converts better than promising one** — ConvertFlow's guidance is explicit that "preview the result before the gate" beats abstract promises.
- AppsFlyer's case studies show large gains from *preserving context* across the web-to-app boundary rather than from the prompt itself: Apartment List reported **2× Day-0 logins, 10× improvement in transferring high-value web users to the app, 15% lower CPI, and 30% higher user LTV** after unifying routing ([AppsFlyer](https://www.appsflyer.com/blog/measurement-analytics/web-to-app-conversion-leak/)). AirAsia reported a **5% increase in total installs** from web-to-app paths. Flagged: these are vendor-published case studies with no control group and obvious selection bias — they are the successes, published by the company selling the solution. Treat as existence proof, not effect size.

**The inference:** showing the free result first should improve install conversion relative to demanding the install first, because it converts an abstract ask into a concrete one. But it will still cost you a large share of users, and — critically — **it does not need to be tested if the recommendation in Q1 is followed**, because there is no install in the funnel to optimise.

**What actually mitigates install friction, if you ship an install prompt anyway:**
- Use a **dismissible smart banner, never a full-screen interstitial**. This is precisely the change Google made, and installs held flat while web engagement rose 17%.
- Place it **after the purchase completes**, on the confirmation screen, where the user is already converted and nothing is lost by their ignoring it.
- Frame it around what the app does that the web cannot — "get a reminder before each application deadline" — not around access to something they already paid for.

---

## Q3 — Anonymous cross-device state handoff

**Recommendation: build none of these for v1.**

The justification is the product's own shape. A once-per-lifetime purchase, completed in a session that takes minutes, from a social link, does not generate meaningful cross-device demand. The user who starts on TikTok's in-app browser finishes there. Building handoff infrastructure for the minority who don't is optimisation ahead of evidence.

The patterns, honestly costed:

| Pattern | Complexity | GDPR/minor risk | Worth it here? |
|---|---|---|---|
| **Deferred deep link (fingerprint)** | High — SDK, attribution vendor, iOS match-rate problems | **High.** IP + device attributes = personal data. Needs documented LIA or explicit consent. Fingerprinting minors' devices is exactly the pattern DFA scrutiny targets. | **No** |
| **Deferred deep link (Play Install Referrer / iOS clipboard)** | Medium | Low — platform-sanctioned APIs, no fingerprinting | Only if you ship a pre-purchase install prompt, which you shouldn't |
| **One-time numeric code** | Low — short-lived server row, no account | Low, if the payload is quiz answers only and TTL is short | **Only if a real need appears** |
| **Magic link (email)** | Medium | **Elevated** — collecting a minor's email creates the personal-data record `sessionStorage` was designed to avoid | **No** |
| **QR handoff (phone → desktop)** | Low–medium | Low | Niche; see below |
| **Short-lived server-side session token in URL** | Low | Low with short TTL and no PII in payload | **Best option if you need one** |

**The one case worth considering later:** a teen completes the quiz on their phone and wants a parent to see the results on a laptop before paying. That is a plausible dual-persona scenario in this product. If it shows up in real usage, the right answer is a **shareable results URL backed by a short-TTL server token containing quiz answers and match output but no identifiers** — cheap to build, no account required, no fingerprinting, and it doubles as an organic distribution channel. **Flagged as inference:** no data was found on how often this specific parent-review handoff occurs in education purchases. Instrument for it rather than assuming it.

**GDPR notes specific to your setup:**
- Fingerprint-based deferred deep linking processes personal data and is the one pattern here with a genuine compliance problem. Avoid it.
- The Czech digital age of consent is **15**, so a 15-year-old can consent for themselves — but **9th graders include 14-year-olds**, for whom parental consent is required. Design to the 14-year-old.
- Keeping quiz answers in `sessionStorage` remains correct. It is defensible data minimisation and it means an abandoned funnel leaves no record at all.

---

## Q4 — Desktop layout for a 10-question quiz

**Recommendation: two-column split with persistent context on the left, questions on the right, grouped 2–3 per screen at ≥1024px. Keep one-per-screen on mobile.**

This is the question where the marketing literature and the academic literature genuinely disagree, and the disagreement is worth understanding rather than papering over.

**What conversion-marketing sources say:** one question per screen wins — lower cognitive load, higher perceived progress, sunk-cost momentum. This is the Typeform-era orthodoxy and it is near-universal in CRO writing.

**What survey-methodology research says:** on desktop, there is **no significant completion-rate difference** between paging (one per page) and scrolling (many per page). Worse for the orthodoxy, on mobile, paging designs made respondents **take substantially longer**, encounter more technical difficulty, and report **lower satisfaction** ([SurveyMonkey research summary](https://www.surveymonkey.com/curiosity/pros-cons-of-scrolling-and-multiple-pages-in-surveys/)).

**How to reconcile them:** the two literatures measure different populations. Survey research measures people completing a task they already agreed to, where completion is near-guaranteed and the variable is quality and speed. Conversion research measures unmotivated commercial traffic, where the variable is whether they continue at all. Your quiz sits between: the user arrived from a social link with real intent (choosing a school matters to them) but no commitment.

The practical resolution is that **one-per-screen's advantage is a motivation device, and it is most valuable where motivation is weakest and screen space is smallest** — mobile. On a 1440px desktop viewport, one question per screen leaves most of the display empty and makes a 10-question quiz feel longer than it is, because the user can see they are clicking "next" repeatedly for a screen that is 80% whitespace.

**Assessment of the four options:**

- **(a) Centered narrow column mirroring mobile** — safe, cheapest to build (reuses mobile components directly), wastes desktop viewport. This is the correct *fallback* if desktop design time is scarce.
- **(b) Two-column split with persistent context/progress — RECOMMENDED.** Left column holds progress, an explanation of why the question is being asked, and reassurance about what happens with the answers (which does double duty for GDPR transparency). Right column holds the questions. The left column solves a real trust problem for the parent persona, who is more likely to want to know why they are being asked things before answering.
- **(c) Multiple questions grouped per screen** — do this *within* (b). Group 2–3 semantically related questions; do not dump all ten. This also delivers the partial-data benefit: if a user abandons at screen 3 of 4, the answers from screens 1–2 are already submitted rather than lost.
- **(d) Full-viewport-per-question** — actively bad on desktop. Maximum whitespace, maximum clicks, most inflated sense of length.

**Flagged as thin:** the specific claim that grouping 2–3 questions beats both 1 and 10 on desktop is a synthesis across the two literatures, not a directly-cited finding. No source tested that exact configuration. It is a reasoned position, not a measured one — worth A/B testing once traffic exists.

---

## Q5 — Full quiz before registration, and does desktop differ?

**Quiz-before-registration is correct, on both surfaces. Keep it.**

It is also the GDPR-optimal design, which is a rare alignment of conversion and compliance: no account means no personal data means no consent question during the flow at all.

**Do desktop users abandon anonymous multi-step flows more or less than mobile?**

**Less.** The general-web-commerce direction is consistent, though the data is from adjacent contexts rather than quiz funnels specifically:

- Cart abandonment: **mobile 79.0% vs desktop 68.1%**
- Bounce rate: **mobile 67.4% vs desktop 32.0%**
- Conversion: desktop roughly **2× mobile** (5.06% vs 2.49% average across the cited retail set)

Source: [Reform](https://www.reform.app/blog/mobile-vs-desktop-form-performance-comparison). Flagged: these are e-commerce checkout figures, not quiz-funnel figures, and the article provides no device-split data for multi-step forms specifically — which is the thing actually being asked. The direction is reliable; the magnitude is not transferable.

Combined with the Czech 50/50 device split, this has a direct implication: **desktop users are both numerous and better-converting in this market, and they are currently the surface with no design.** That is the largest identified gap in the current plan.

**Does an optional mid-flow "save your progress" email help or hurt?**

**Hurts. Do not add it.** Three independent reasons:

1. **Conversion.** The email gate is the steepest cliff in quiz funnels — **30–50% of finishers drop there** ([ConvertFlow](https://www.convertflow.com/blog/how-to-fix-ecommerce-quiz-funnel-drop-off-in-2026)). Even presented as optional, an email field mid-flow reads as a gate and triggers the same hesitation.
2. **Compliance.** Collecting a 14-year-old's email creates precisely the personal-data record the `sessionStorage` architecture exists to avoid, and drags parental-consent obligations into a flow currently free of them.
3. **Need.** Progress-saving solves session loss over hours or days. A 23-screen flow completed in one sitting does not have that problem.

**Where email capture does belong:** after the free #1 result is on screen, optional, framed as "where should we send your results?" Capture rates for post-result optional placement run **25–40%** versus 50–70% for pre-result gating ([genlead.ai](https://genlead.ai/blog/lead-capture-forms-quiz)) — you trade raw volume for not destroying the purchase funnel and for higher-quality leads. For a product monetising a single purchase rather than a mailing list, that is the correct trade. Flagged: these placement-conversion bands are vendor-published aggregates without methodology; treat as rough.

---

## Q6 — Czech and Central European specifics

**The headline finding, and the one that should change the plan:**

**Czech desktop share is 50.43%, mobile 48.11%, tablet 1.46%** (StatCounter, July 2026, from 3bn+ monthly page views). Czechia is a **desktop-plurality market**. This is unusual — most markets crossed to mobile-majority years ago — and it directly contradicts the "desktop is secondary but non-trivial" framing in the brief. Desktop is not secondary here. It is the larger half.

Two caveats before over-reading it, both important:
- StatCounter measures **pageviews, not users**, and desktop sessions generate more pageviews per user than mobile ones. True *user* split is likely closer to even or mobile-leaning.
- This is the **whole-population** figure. Czech 15-year-olds are certainly more mobile-weighted than Czech 45-year-olds. **No age-segmented Czech device-split data was found** — this is a real gap.

The practical read survives both caveats: your two personas probably split across two devices. The **teen arrives on mobile from TikTok; the parent researches on a laptop.** Both need a designed experience, and only one currently has a design.

**Other market context:**

- Czech social platform reach (Jan 2025): YouTube 7.99M (74.8%), Facebook 5.00M (46.8%), Instagram 3.70M (34.6%), TikTok 2.01M adults 18+ (23.1%) ([DataReportal Digital 2025: Czechia](https://datareportal.com/reports/digital-2025-czechia)). TikTok's figure **excludes under-18s** — its actual teen reach is materially higher than the published number and not directly measurable from this source. Instagram's parent-generation reach is well-established, which supports running distinct creative for the two personas rather than one campaign.
- **Czech digital age of consent: 15** (Act No. 110/2019 Coll.), one of the higher settings in the EU, supervised by ÚOOÚ. A 15-year-old consents for themselves; a 14-year-old cannot.
- **Education-adjacent convention:** the incumbents ([Atlas školství](https://www.atlasskolstvi.cz/), Infoabsolvent) are **directory-and-filter products** — category navigation, search by city and focus, no algorithmic matching, no quiz, no app. This is a genuine positioning opportunity: guided matching is not what this market currently offers. It is also a caution — Czech users researching schools have been trained by these incumbents to expect browsable directories, so a quiz-only product with no browse mode may feel incomplete to the parent persona.
- **No Czech-specific app-install friction or app-store-behaviour data was found.** Nothing suggests Czech users install differently from other EU markets, but this is absence of evidence, not evidence of absence.

---

## Q7 — Live examples worth studying

**Direct Czech competitors:**

- **[Atlas školství](https://www.atlasskolstvi.cz/)** — the incumbent Czech school directory. Category navigation, filter by city/focus/study form, featured listings, institutional partnerships (labour office, educational publisher). *What it does right:* comprehensive coverage and institutional credibility. *What it leaves open:* no matching, no personalisation, no app, no quiz. Study it for what Czech users expect a school-search site to contain, then beat it on guidance rather than coverage.
- **Infoabsolvent** (NÚV/Euroguidance) — state-backed careers and education information portal. *Study for:* the authority and neutrality signals Czech families expect in this category, and the vocabulary they use for study fields.

**Structural analogue, strongest single reference:**

- **UWorld** (exam prep) — sells fixed-window access passes rather than open-ended subscriptions, for a bounded high-stakes single event. Not a quiz funnel, but the closest match to your *product shape*: intense use over a defined window, then never again. Already covered in the pricing research; relevant here because its web-primary purchase flow matches the Q1 recommendation.

- **CollegeVine** — US college admissions guidance, free to consumers, monetised via institutional partnerships. *Study for:* how a once-per-lifetime education-guidance product handles the anonymous-to-registered transition, and as evidence that the B2B2C route (your planned school partnerships) is a proven alternative revenue base in this exact category.

**Quiz-led commerce:**

The general pattern worth copying — quiz → free personalised result → paywall for the full output — is well-established in DTC commerce (Noom, Warby Parker's Home Try-On flow, Function of Beauty and similar "find your match" funnels). **Flagged as thin:** the searches conducted returned listicles and vendor marketing rather than primary conversion data on these specific funnels. Treat them as **pattern references to study directly in the browser**, not as cited evidence. The reusable structure is: no registration to start, visible progress, one clear result given free, paywall placed after value is demonstrated.

**No Czech product was found doing web+app well in this category** — because essentially no Czech product in this category has an app at all. That is an opportunity and it is also a warning that the local market may not expect one.

---

## What this means for a 390px-mobile design already built

**Carries to desktop unchanged:**
- The 10-question count and question content. Optimal band; no change needed.
- Flow order: quiz → free #1 result → paywall → registration → payment. The sequence is right on every surface.
- The persona branch at screen 2. Works identically at any width.
- All copy, all matching logic, all scoring output.

**Must be redesigned for desktop:**
- **Question screen layout.** One question per 1440px viewport is the wrong use of the space. Move to the two-column split (Q4): persistent left rail with progress, question context, and data-handling reassurance; right column with 2–3 grouped questions.
- **The results screen.** The free #1 result plus the locked remainder is the single highest-value screen in the product, and a 390px card centered in a 1440px window undersells it. Desktop should show the #1 match with more supporting detail and the locked results as a visible, honest, non-manipulative preview.
- **Paywall layout.** Side-by-side plan comparison is possible on desktop and is not on mobile. This matters given the two-option pricing structure from the pricing research.
- **Progress indication.** A mobile progress bar becomes a step list on desktop, where there is room to show what is coming.

**Should deliberately differ between app and web:**
- **The web is the purchase surface. The app is the post-purchase surface.** They should not be the same product. The web app's job ends shortly after payment; the app's job starts there.
- **The app should not contain the quiz at all in v1** — unless you later choose option (c). If the quiz only ever runs pre-purchase and purchase happens on web, quiz code in the app is dead weight in a codebase built by one person.
- **The app gets what the web genuinely cannot do:** deadline push notifications, offline shortlist access, a home-screen presence through the Sept–March window.

---

## What Q1 implies for build order

**The web-first plan is correct and should continue. The answer to Q1 strengthens it rather than changing it.**

If the quiz, the paywall, and the payment all live on web, then **the web app is the entire revenue path**, and the app is a retention and satisfaction surface for users who have already paid. That reorders things:

1. **Ship web complete first** — quiz, free result, paywall, registration, payment, and a basic post-purchase results view. This is a shippable, revenue-generating product on its own.
2. **Design desktop web before building the app.** Desktop is ~50% of Czech traffic and has no design. Building an app while half the traffic hits an undesigned surface is the wrong order of work.
3. **Only then build the app**, scoped to post-purchase use.

**On the framework decision:** if the app carries no quiz and no paywall, the code-reuse argument for React Native weakens considerably — the matching engine runs server-side or in shared TypeScript regardless of native framework, and the quiz components would not be reused at all. The remaining shared surface is small. **Flagged as inference, not evidence:** no framework research was conducted here. But the honest observation is that the decision is less constrained than it looked, and should be made on notification quality, developer familiarity, and solo-maintenance burden rather than on component reuse.

**One thing this genuinely does change:** if the app is post-purchase-only, it is **not required before public launch**. The brief states the app is planned before launch. On this evidence, launching web-only and adding the app once there are paying users to serve is both lower risk and faster to revenue — and it means the app gets built with real knowledge of what buyers actually do after purchasing, rather than guesses.

---

## Open questions this research could not settle

1. **Does showing a free result before an install prompt improve install conversion?** No controlled study found. Only adjacent evidence. Moot if Q1's recommendation is adopted.
2. **Czech device split by age.** The 50/48 desktop/mobile figure is whole-population pageviews. No age-segmented Czech data was found, and teen behaviour certainly differs. This matters for how much desktop design effort the teen persona justifies.
3. **Do the two personas actually split by device as assumed?** The "teen on mobile, parent on laptop" model is plausible and consistent with the market data but is **not evidenced**. Instrument device type against the screen-2 persona branch from day one — this is cheap and answers the question directly with real data.
4. **How often does a teen want a parent to review results on another device?** Determines whether the shareable-results-URL handoff is worth building. No data exists; only real usage will tell.
5. **Optimal question grouping on desktop (2 vs 3 vs 4 per screen).** The recommendation synthesises two literatures that disagree; no source tested this configuration. A/B test when traffic allows.
6. **Whether Czech families will accept a quiz-first product** when incumbents are browse-first directories. A genuine positioning risk, particularly for the parent persona. Unanswerable without user testing.
7. **Czech-specific app-install friction and store behaviour.** No data found either way.
8. **Whether web payment can fully avoid in-app purchase rules** for your specific implementation. This is a platform-policy and legal question, not a research one, and it interacts with recent EU app-store regulation. Needs checking against current App Store and Play policy before architecture is locked.

---

## Source list

**Web-to-app conversion and install friction**
- [Google+: A case study on App Download Interstitials — Google Search Central (2015)](https://developers.google.com/search/blog/2015/07/google-case-study-on-app-download-interstitials) — *flagged: 2015, oldest source here*
- [Google data show users hate app-promotion interstitials — MarTech](https://martech.org/google-data-show-users-hate-app-promotion-interstitials/)
- [Web to App Benchmarks (2026) — Business of Apps](https://www.businessofapps.com/data/web-to-app-benchmarks/) — *flagged: detail behind membership paywall*
- [Fix your web-to-app conversion leak — AppsFlyer](https://www.appsflyer.com/blog/measurement-analytics/web-to-app-conversion-leak/) — *flagged: vendor case studies, no controls*

**Deep linking and privacy**
- [Privacy Considerations for Deferred Deep Linking — Tolinku](https://tolinku.com/blog/deferred-linking-privacy-considerations/)
- [Deferred Deep Linking in 2025 — DeepLinkNow](https://deeplinknow.com/blog/deferred-deep-linking-2025)

**Quiz funnels and form design**
- [How to Fix Ecommerce Quiz Funnel Drop Off in 2026 — ConvertFlow](https://www.convertflow.com/blog/how-to-fix-ecommerce-quiz-funnel-drop-off-in-2026)
- [Quiz Lead Capture Forms: Best Practices — genlead.ai](https://genlead.ai/blog/lead-capture-forms-quiz) — *flagged: vendor aggregate, no methodology*
- [Pros and cons of scrolling and multiple pages in surveys — SurveyMonkey](https://www.surveymonkey.com/curiosity/pros-cons-of-scrolling-and-multiple-pages-in-surveys/)
- [Single-Question vs Long Forms — Rowform](https://rowform.io/blog/single-question-vs-long-forms-the-data-on-why-single-question-forms-win/)
- [Mobile vs. Desktop Form Performance Comparison — Reform](https://www.reform.app/blog/mobile-vs-desktop-form-performance-comparison) — *flagged: e-commerce checkout data, not quiz funnels*

**Czech market and legal**
- [Desktop vs Mobile vs Tablet Market Share Czech Republic — StatCounter (July 2026)](https://gs.statcounter.com/platform-market-share/desktop-mobile-tablet/czech-republic)
- [Digital 2025: Czechia — DataReportal](https://datareportal.com/reports/digital-2025-czechia)
- [Digital Age of Consent under the GDPR — EuConsent](https://euconsent.eu/digital-age-of-consent-under-the-gdpr/)
- [Consent to processing of personal data of minors (ÚOOÚ requirements) — ARROWS](https://arws.cz/news-at-arrows/compliance-with-the-requirements-of-the-office-for-personal-data-protection-regarding-consent-to-the-processing-of-personal-data-of-minors)
- [Data Protected: Czech Republic — Linklaters](https://www.linklaters.com/en/insights/data-protected/data-protected---czech-republic)
- [Atlas školství](https://www.atlasskolstvi.cz/)
- [Infoabsolvent — Euroguidance ČR](https://www.euroguidance.cz/nastroje-a-metodologie/infoabsolvent.html)
- [New report: How are Czech adolescents using their phones? — IRTIS, Masaryk University](https://irtis.muni.cz/news/new-report-how-are-czech-adolescents-using-their-phones-analysis-using-objective-smartphone-data)

---

*Not legal advice. The GDPR, minor-consent, and app-store-payment points should be confirmed with a Czech lawyer before the checkout and consent architecture is finalised.*

*Evidence quality note: the strongest findings here are the Czech desktop share, the quiz-length band, and the email-gate drop-off. The weakest are the vendor-published web-to-app case studies and the quiz lead-capture placement bands. Anything labelled "flagged" or "inference" should not be treated as settled.*
