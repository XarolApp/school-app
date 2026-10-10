# SkolaMatch — Launch, Beta, Affiliate & Marketing Execution Plan

> **Current use, 10 October 2026:** this is an execution roadmap, not current deployment approval. Free beta gives access in exchange for main feedback; payment screens are optional previews and must never call Stripe. Only accepted main-form/access-gate messages renew the 48-hour window, bounded by the configured programme cutoff. Resolve the beta gates in the [deployment report](../reports/deployment-review-2026-10-07/REPORT.md) and [handoff](../reports/deployment-review-2026-10-07/HANDOFF-PLAN.md); real billing remains blocked separately. Dates/weeks, recruitment/revenue targets, affiliate tiers, discounts and early-access offers below are planning scenarios, not implemented offers or measured results. Follow [current status](skolamatch_current_status.md), source and later founder decisions.

## 0. Mission

The immediate goal is NOT to build the biggest possible school platform.

The immediate goal is:

> **Finish a trustworthy Prague product, get real prospective users to use it, prove that strangers will pay for it, and then scale the acquisition system before the school-selection season moves on.**

Target progression:

**Launch-critical development → Private beta → Soft launch → First sales → Public launch → Acquisition scaling → Expansion**

Prague is the first market.

Read-only catalogue observations on 9 October show **217 visible schools /223 raw rows**. The historical Atlas list contains 214 names; the earlier ~60-school sample was a development snapshot. These counts describe different sets and do not establish complete current register coverage. Use the loaded visible catalogue for product counts.

---

# 1. Important Correction: You Do NOT Need 2,250 Testers

You mentioned needing **2,250 testers**.

That is not the correct objective.

You need approximately:

- **10 testers:** enough to catch obvious problems
- **20 testers:** useful beta
- **30 testers:** strong beta
- **50 testers:** excellent beta

You do NOT need thousands of people to test the product.

What you need is enough qualified people to discover the major problems before exposing the product to thousands of potential customers.

The acquisition problem is real, though.

Getting 20–50 genuine strangers is NOT automatic.

Therefore, **tester recruitment itself must be scheduled into Week 1 and Week 2.**

---

# 2. How to Get the First 20–50 Strangers

Do not depend on one TikTok going viral.

Use multiple small channels simultaneously.

## Channel A — Direct outreach

Build a list of relevant Czech:

- student communities
- parent communities
- tutoring communities
- Discord communities
- Facebook groups
- Reddit communities
- ninth-grade communities
- educational communities

Send targeted, non-spammy recruitment messages.

Goal:

**10–15 targeted outreach messages/day initially.**

You are asking for testing/feedback, not immediately selling.

---

## Channel B — Micro-creators

Contact creators who already reach Czech:

- ninth-graders
- teenagers
- parents
- education audiences
- CERMAT/JPZ audiences
- tutoring audiences

Do NOT immediately ask all of them for a paid promotion.

First offer:

> Free beta access in exchange for honest feedback.

A creator with a small but relevant audience can potentially produce several testers.

---

## Channel C — Faceless TikTok/Instagram

Start publishing during Week 1.

Do not expect immediate viral traffic.

The purpose during the first week is:

1. Establish the account.
2. Learn which hooks work.
3. Start attracting the target audience.
4. Recruit beta testers.
5. Build an audience that can later become customers.

Initial target:

**1 post/day minimum.**

If production is easy:

**2 posts/day.**

Content can be entirely faceless.

---

## Channel D — Personal network indirectly

You do not need to sell to your friends.

You can still ask:

> “Do you know anyone who is currently in 9th grade / has a child in 9th grade who would test a Czech school-selection tool?”

The tester should be a relevant stranger to the product, not necessarily someone completely disconnected from your social network.

---

# 3. Realistic Beta Recruitment Funnel

Do not assume:

> 50 testers = 50 messages.

A more realistic planning assumption is:

**200–500 qualified prospects contacted/reached → some percentage respond → 20–50 testers.**

The exact conversion rate is unknown before testing.

Therefore:

### Week 1 objective

Build the recruitment machine and begin outreach.

### Week 2 objective

Keep outreach running until you reach approximately 20–50 qualified testers.

If you only get 15, you do not stop the project.

Launch with the information you have and continue testing.

---

# 4. Affiliate System — Recommended Structure

Your point about affiliate links is correct.

If the customer receives **no benefit** from using a creator's link, the creator has to convince the customer to use a tracking mechanism that provides no obvious reason for the customer to care.

That is weaker.

The recommended structure is:

## Customer gets a discount.

## Creator gets a commission.

Both sides have a reason to use the link.

---

# 5. Recommended Affiliate Offer

**Affiliate proposal, not a current offer:** the locked ordinary season price is 690 Kč; the 50 Kč discount and commission below require founder approval, refund/tax terms and implementation before use. Beta remains free.

For this proposed scenario:

### Standard price

**690 CZK**

### Affiliate customer discount

**50 CZK**

Customer pays:

**640 CZK**

### Creator commission

Start at:

**30% of the amount actually paid**

30% × 640 CZK = approximately **192 CZK**

Your gross revenue after creator commission:

Approximately **448 CZK**

before payment processing/taxes/other costs.

This is a strong starting point because:

- 50 CZK is meaningful enough for the customer to care
- 30% is attractive to creators
- you retain the majority of the sale
- you are not immediately giving away 50% of revenue

---

# 6. Affiliate Commission Escalation

Do not automatically give everyone 50%.

Start:

**30%**

Then reward performance.

Example:

- 1–9 sales: 30%
- 10–24 sales: 35%
- 25–49 sales: 40%
- 50+ sales: negotiate 40–50%

The exact tiers can be changed after real data.

This makes high-performing creators more valuable without sacrificing margin on creators who generate no sales.

---

# 7. Should Affiliates Earn Forever?

For this product, NO.

The product is primarily a **single-season purchase**.

Therefore the clean model is:

> Creator receives commission only on the first season purchase generated by their referral.

There is no meaningful reason to promise indefinite recurring commissions if customers normally only need the product for one school-selection season.

---

# 8. Affiliate Attribution

The referral system should not depend solely on:

> “The user must click this link and buy immediately.”

That is fragile.

Implement:

### Referral URL

Example concept:

`yourdomain.cz/?ref=creator123`

When the visitor enters through the referral:

1. Save referral attribution.
2. Keep it through onboarding.
3. Keep it through account creation.
4. Keep it through checkout.
5. Apply the customer discount automatically.
6. Attribute the purchase to the creator.

Use a persistent first-party referral identifier/cookie/local storage as appropriate for the architecture and legal setup.

Also provide a referral code as a backup.

Example:

**KREATIVNI50**

The creator can say:

> “Use my link or code KREATIVNI50 for 50 Kč off.”

---

# 9. Do Not Make Affiliate Tracking Annoying

The user should NOT need to:

- remember a code
- copy/paste anything
- return to the creator
- restart onboarding

The ideal flow is:

**Creator video → click → SkolaMatch → onboarding → result → paywall → checkout → discount automatically applied**

This is one reason affiliate links can be much stronger than asking creators to simply say:

> “Go search for SkolaMatch.”

---

# 10. Do Not Give a 50% Customer Discount

A 50% customer discount is unnecessary initially.

For a ~690 CZK product:

**50 CZK off** is a cleaner first test.

The goal is not to make the product look cheap.

The goal is to create:

> “I might as well use their link because I save money.”

If 50 CZK does not materially improve conversion, test 75 CZK.

Do not jump immediately to huge discounts.

---

# 11. Important Pricing Distinction

Do not confuse:

### Early-access pricing

Example:

**499 CZK for first 100 customers**

with:

### Affiliate pricing

Example:

**690 CZK standard → 640 CZK with creator referral**

The affiliate offer should be evaluated based on the actual price available at the time.

Do not create a confusing situation where users see:

- 499 CZK publicly
- 690 CZK normally
- 640 CZK through creator
- 599 CZK through another creator

Keep the pricing hierarchy simple.

---

# 12. Week 1 — The Real Plan

Available time:

Approximately **5 hours/day weekdays + ~6 hours/weekend days when available.**

Target:

~37 hours/week.

Do NOT sacrifice sleep as the default.

The current bottleneck is speed to a reliable launch, not maximum hours worked.

---

## DAY 1 — Launch Audit + Critical Path

### Development: ~3 hours

Do NOT randomly build features.

Create a launch checklist and identify:

### P0 blockers

- Can a stranger register?
- Can a stranger log in?
- Does questionnaire work?
- Does matching work?
- Does the result make sense?
- Does the school database work?
- Are all school pages usable?
- Does payment work?
- Does payment unlock the product?
- Is premium access secure?
- Does analytics work?
- Can the product be deployed?
- Are basic legal/privacy requirements handled?
- Are emails working?

Prioritize verified visible-school coverage and the launch gates; historical directory counts are not a completion target.

You need to understand exactly what blocks launch.

### Marketing: ~2 hours

Create:

1. Official TikTok account.
2. Official Instagram account if desired.
3. Beta tester recruitment form.
4. Beta tester message.
5. Creator outreach spreadsheet.
6. Parent outreach spreadsheet.
7. Content idea list.

Then create your first **3–5 TikTok scripts**.

Do NOT spend the entire two hours making one beautiful video.

---

# 13. DAY 2 — Database + First Marketing Output

### Development: ~3 hours

Continue the highest-priority database work.

Focus on reliable current catalogue/data pipelines; establish the actual register scope before promising complete Prague coverage.

Do not spend hours manually polishing one school while dozens are missing.

### Marketing: ~2 hours

Publish your first piece of content.

Then:

- contact 10–15 potential beta sources
- contact 5–10 relevant micro-creators
- ask for beta testers
- record responses in your spreadsheet

---

# 14. DAY 3 — Stripe

### Development: ~3 hours

Stripe becomes a P0 task.

Implement:

- checkout
- successful payment handling
- premium access
- failed payment handling
- test transactions
- webhook logic
- protection against unauthorized premium access

### Marketing: ~2 hours

Publish another piece of content.

Contact:

- 10–15 beta recruitment prospects
- 5–10 creators

Start tracking:

**contacted → replied → interested → tested**

---

# 15. DAY 4 — Accounts + Security

### Development: ~3 hours

Focus on:

- authentication
- account creation
- password/reset flow
- Supabase permissions
- premium access protection
- user data exposure
- parent/child architecture planning
- basic security checks

Do NOT attempt to build every future feature.

Make the core customer account reliable.

### Marketing: ~2 hours

Publish another piece of content.

Continue outreach.

Goal by the end of Day 4:

**At least 30–50 qualified beta prospects reached.**

Not 30–50 testers.

People reached.

---

# 16. DAY 5 — Analytics + Funnel

### Development: ~2.5–3 hours

Implement the core analytics funnel:

- landing page viewed
- quiz started
- quiz completed
- result viewed
- paywall viewed
- checkout started
- purchase completed
- school viewed
- school favorited
- comparison used

### Marketing: ~2 hours

Publish content.

Continue tester outreach.

Start collecting actual beta candidates.

---

# 17. DAY 6 — Full Fake-User Testing

### Development/testing: ~4 hours

Create multiple test users and simulate:

1. Visitor
2. Quiz start
3. Quiz completion
4. Result
5. Paywall
6. Registration
7. Checkout
8. Payment
9. Premium access
10. Logout/login
11. Mobile usage
12. School browsing
13. Comparison
14. Favorites
15. Parent-sharing flow if available

Test failure cases too.

### Marketing: ~2 hours

Do NOT spend the entire day coding.

Send another batch of tester recruitment.

Publish content.

Contact creators.

---

# 18. DAY 7 — Beta Recruitment Machine

### Marketing: ~4 hours

This is NOT “build a beta system.”

This is:

**actually recruit people.**

Targets:

- 20–30 direct outreach messages
- 10+ creator contacts
- 1–2 social posts
- follow up with previous contacts
- organize interested testers
- schedule/coordinate beta access

### Development: ~2 hours

Fix the biggest bugs discovered during testing.

---

# 19. End-of-Week-1 Targets

You should NOT judge Week 1 by revenue.

Judge it by whether the machine is ready.

Target:

### Product

- launch blockers identified
- Stripe underway or working
- auth working
- analytics working
- database expansion underway
- critical security work underway
- production deployment path known

### Marketing

- TikTok account exists
- first posts published
- beta recruitment message exists
- recruitment spreadsheet exists
- creator list exists
- parent/community list exists
- first 50–100 qualified prospects reached or identified

### Beta

Target:

**5–15 confirmed testers lined up**

You do NOT need all 50 by Sunday.

Recruitment continues into Week 2.

---

# 20. WEEK 1-2 BOUNDARY: RESOLVE UNFORGET LAUNCH BLOCKERS

**Current state, 10 October 2026:** the review is already in progress under the founder's authorization. Historical unfinished-item labels are not instructions to stop it. Complete the current handoff gates before the relevant release.

## Blocker 1: Verify the settled pricing and purchase lifecycle

Prices are locked: **season 690 Kč once, monthly 249 Kč recurring**, season first. The season purchase saves a card for one charge after three days; monthly has no purchase trial. The separate ordinary-account access trial must start at first confirmed sign-in (migration pending). Beta has neither paid checkout nor a purchase trial. Preserve current cancellation/withdrawal wording and distinguish the Terms' 14-day wording from the additional 30-day benefit; applicability, minors, communications and refund lifecycle remain legal/payment acceptance gates. No live-key swap until P01–P09 and mandatory day-2 reminder/communication gates are resolved.

## Blocker 2: Verify confirmation/authentication end to end

The confirmation-wait UI and hosted email confirmation now exist; the old skipped-gate description is obsolete. Preserve confirmed-email checks before access/real checkout. Verify actual mail delivery, same/other-tab return, CAPTCHA resend, duplicate callbacks, account switches, outages and failed profile loads using the handoff. Source/browser fixtures do not establish the whole deployed journey.

## Blocker 3: Human approval of AI output/data provenance

Inspect current `lib/questionnaire.js`, server explanation paths and `scripts/generate-school-proscons.js` rather than stale line numbers/model proposals. Review actual current Czech output from at least five representative schools, including missing/mixed-year facts and contradictory extraction. Approve tone and factual grounding before paid regeneration; S11/S12 selection/cache/fingerprint/cost/failure gates remain open. Comparison/risk/scoring numbers are deterministic, not AI-generated admission predictions.

## Blocker 4: Resolve current deferred work

Use `UNFORGET.md` and the ordered handoff for auth/request ownership, access policy, transactional picks, privacy/consent/erasure/sharing, provenance and device acceptance. Contractual capacity is not automatically resolved at age 15; that child-consent threshold concerns a specific GDPR case. The checkout parental checkbox was removed by founder decision; obtain applicable Czech consumer-law advice without reintroducing an obsolete screen by assumption.

## The Gate

Record fixes, remaining risks, manual evidence and approvals against the current build. A no-charge beta needs the beta gates; real-money launch additionally needs complete payment/legal/communication acceptance. Do not make unresolved work a prerequisite to examining it, and do not treat passing mock tests as production verification.

---

# 21. WEEK 1-2 BOUNDARY: CODEX DEEP AUDIT (MANDATORY LAUNCH GATE)

**Status:** Hard blocker. Stranger beta testing CANNOT begin until this is complete and all critical/high-severity findings are resolved.

After Day 6 (full fake-user testing), before Day 7 (beta recruitment):

## What Codex Does (Independent Security Audit)

An independent senior engineer/security auditor performs a comprehensive adversarial review of:

- **Authentication:** registration, login, logout, password reset, email confirmation
- **Authorization:** Supabase RLS, endpoint access control, premium vs free access
- **Database security:** user data isolation, parent/child account logic, data exposure
- **Payment security:** Stripe flow, season-pass entitlement logic, paywall bypasses, payment verification
- **API endpoints:** input validation, XSS/injection, rate limiting, abuse vectors
- **Secrets/environment:** exposed keys, config exposure, hardcoded values
- **Client/server separation:** data leakage, improper trust boundaries
- **User data:** account deletion, GDPR compliance, data handling
- **Business logic:** onboarding/questionnaire correctness, school matching correctness, entitlement consistency
- **AI features:** prompt injection, unsafe outputs, API security
- **Error handling:** information leakage, stack traces, failure modes
- **Account integrity:** race conditions, double-charging, permission inconsistencies
- **Deployment/production:** database backups, monitoring, disaster recovery
- **Edge cases & broken flows:** anything that could cause users to receive paid features without paying, anything that could expose another user's data, anything that could cause payment inconsistencies

**Codex assumes nothing.** It actively attempts to break the application and does NOT assume Claude Code's implementation is correct.

## The Gate

**Current audit inputs:**
- Use the actual build and source hashes, including concurrent changes.
- Test ordinary/free/public versus authorized premium/beta boundaries.
- Keep unresolved items visible; the audit can examine unfinished code.
- Free-beta acceptance and real-billing acceptance have separate gates.

**Definition of "Pass":**
- All critical-severity findings resolved or explicitly accepted by founder
- All high-severity findings resolved or explicitly accepted by founder
- Documentation of any remaining medium-severity findings
- Codex verifies all critical/high fixes

**If audit finds critical issues:**
Claude Code fixes them immediately. Codex verifies the fixes.

**Beta testing cannot start until the gate is passed.**

---

# 22. Week 2 — Private Beta

Primary goal:

> Get real people using the product.

Do not wait for 50.

If you have 10 good testers, start.

Then recruit the next 10 while the first 10 test.

---

## Beta Process

Each tester should follow the current flow in [beta operations](beta_testing_operations.md):

1. Enter through the current approved site/invitation gate.
2. Register and confirm their email.
3. Review the beta notice/consent and complete the required profile.
4. Complete the required questionnaire and inspect recommendations.
5. Use school/search/comparison/decision tools with free beta access.
6. Optionally review payment screens as feedback previews; never enter Stripe.
7. Submit main-form/access-gate feedback to renew the rolling window, up to the programme cutoff.
8. Give optional quick ratings/closing feedback; these do not renew access.

Ask structured questions:

- What was confusing?
- What did you expect to happen?
- What information was missing?
- What did you like most?
- What would make you trust this more?
- What almost stopped you?
- Would you pay for it?
- How much?
- Would you recommend it?
- What feature would you remove?
- What feature would you add?

---

# 23. Week 2 Marketing

Marketing does NOT stop because you're in beta.

Every weekday:

### Content

1–2 posts/day.

### Outreach

10–20 targeted contacts/day.

### Creators

5–10 targeted creator contacts/day.

### Beta

Onboard new testers continuously.

This means marketing gradually increases while development decreases.

---

# 24. Week 2 Product Priorities

Fix:

1. Bugs
2. Confusing UX
3. Trust issues
4. Incorrect school data
5. Weak questionnaire results
6. Bad AI explanations
7. Payment/account problems

Do not add random features simply because a tester suggests them.

Prioritize by:

**Impact × frequency × importance to purchase**

---

# 25. Week 3 — Soft Launch

At this point:

**Real customers can buy.**

Historical promotion proposal — **not approved/current pricing**. Do not advertise or implement it without a separate founder decision and payment/legal acceptance.

### Proposed Early Access Season Pass

**499 CZK**

Target:

**First 100 genuine paying customers**

Do not fake the number.

If 100 people buy, the offer ends.

Then move to the standard price.

---

# 26. Week 3 Marketing

This becomes a serious acquisition week.

### TikTok/Instagram

Target:

**1–2 posts/day**

### Creator outreach

Target:

**10–20 creators/day**

### Parent outreach

Target:

**10–20 qualified contacts/day**

### Community distribution

Post where genuinely relevant and allowed.

### Affiliate recruitment

Start onboarding creators into the referral system.

---

# 27. Week 3 Goal

Do NOT demand a specific number like 1,000 visitors.

The goal is:

> **Prove that strangers can be acquired and converted into paying customers.**

Even:

**100 visitors → 3 customers**

is valuable information.

Even:

**500 visitors → 10 customers**

is valuable information.

The exact numbers will determine what needs fixing.

---

# 28. Week 3 Analytics Questions

Every day inspect:

### Acquisition

Where did visitors come from?

### Activation

Did they start the questionnaire?

### Completion

Did they finish?

### Value

Did they understand the result?

### Monetization

Did they reach the paywall?

### Purchase

Did they buy?

### Drop-off

Where did people disappear?

Your job is to improve the biggest bottleneck.

---

# 29. WEEK 3-4 BOUNDARY: CODEX REGRESSION & SECURITY REVIEW (MANDATORY PRE-LAUNCH GATE)

**Status:** Hard blocker. Public launch CANNOT happen until this review is complete.

After Week 3 beta period, before Week 4 public launch:

## What Codex Does (Targeted Review)

A focused independent review of:

- **Beta period changes:** All code modifications, fixes, and new features added during beta
- **Payment integrity:** Verify no new payment/entitlement bugs were introduced
- **Security regression:** Check that fixes from the deep audit remain in place and are not undermined by new code
- **Critical flow changes:** Any modifications to authentication, authorization, or user data handling
- **Customer feedback fixes:** Security implications of bug fixes driven by beta feedback
- **Deployment changes:** Any changes to production configuration, database setup, or infrastructure

**This is NOT a full re-audit.** It's a targeted verification that:
1. The deep audit findings remain fixed
2. No new critical/high-severity issues were introduced
3. The product is safe to launch publicly

## The Gate

**Prerequisite to start review:**
- Week 3 soft launch complete
- Beta feedback analyzed
- Fixes and improvements deployed
- Product stable

**Definition of "Pass":**
- No new critical-severity vulnerabilities found
- No new high-severity vulnerabilities found
- Deep audit critical/high findings still resolved
- Any medium-severity findings from beta documented
- Current-build review records completed checks, remaining risks and the founder/manual release decision; it provides no blanket safety guarantee

**Public launch cannot proceed until this gate is passed.**

---

# 30. Week 4 — Public Launch

Once:

- payment works
- product works
- serious bugs are fixed
- analytics works
- several real users have successfully used it
- strangers have shown willingness to pay

launch publicly.

Public launch means:

**Scale distribution.**

It does NOT mean:

**Stop developing.**

---

# 31. Marketing Engine After Launch

Use five major acquisition systems.

## 1. TikTok

Long-term organic acquisition.

## 2. Creators

Affiliate-driven acquisition.

## 3. Parent outreach

Direct acquisition.

## 4. School/tutoring partnerships

Trust-based acquisition.

## 5. SEO

Long-term search acquisition.

---

# 32. Creator Strategy

Do not only target huge influencers.

Start with:

- micro-creators
- education creators
- Czech student creators
- tutoring creators
- parent creators

Why?

They often have stronger audience relevance.

A creator with 10,000 relevant viewers can be more valuable than one with 200,000 irrelevant viewers.

---

# 33. Creator Pitch

The core pitch:

> We built a tool for Czech ninth-graders that helps them choose a secondary school using structured school data, personalized matching, comparison and application guidance. We're currently looking for a few creators whose audience is going through the high-school-selection process. You get free access, your audience gets a discount through your link, and you earn commission from every paying customer you refer.

Keep it short.

Do not write giant sales paragraphs.

---

# 34. Parent Value Proposition

Do not sell:

> “AI school matching.”

Sell:

> **Help your child make a better-informed secondary-school decision without spending hours searching through dozens of school websites, PDFs and databases.**

The emotional problem:

> “What if my child chooses the wrong school?”

The practical problem:

> “Where do we find and compare all the information?”

The product solves both.

---

# 35. Student Value Proposition

The student message is more emotional and direct:

> **Stop searching through 20 different school websites. Find the schools that actually fit you, compare them, and understand what you should do next.**

Student pain:

- uncertainty
- pressure
- too many choices
- scattered information
- fear of making the wrong decision
- time spent researching

---

# 36. Product Positioning

Do not position the product as:

> “Another school database.”

Position it as:

> **A personal school-selection tool for Czech ninth-graders.**

Database is the foundation.

The product experience is:

**Discover → Match → Compare → Decide → Apply**

---

# 37. Percentage Matching

Keep percentage matching.

The percentage can help rank a large catalogue; its interpretation, input completeness and cross-surface consistency still require the deployment checks.

Do NOT replace it with broad labels such as:

- perfect match
- great match
- good match

That creates giant buckets and destroys ranking precision.

Instead show:

> **98 % shoda s tvými preferencemi**

and below it explain:

> “Toto číslo vyjadřuje, jak moc škola odpovídá tvým odpovědím v dotazníku. Není to pravděpodobnost přijetí.”

Keep admission likelihood separate.

---

# 38. Two Different Questions

The product should clearly distinguish:

### FIT

> “Will I probably like this school?”

Answer:

**Preference match percentage**

### ADMISSION

> “How difficult is it to get accepted?”

Answer using:

- historical admission data
- programme-specific statistics
- relevant CERMAT data
- other reliable admission information

Never let users interpret the matching score as admission probability.

---

# 39. AI Features

Existing explanations and decision tools require current acceptance:

- personalized AI explanation, with verified facts and human-approved output
- deterministic comparison/matching/risk calculations
- application/DiPSy guidance with current official rules

Presence in source does not establish readiness; follow the deployment handoff.

Do not delay launch looking for ten more AI features.

The product's advantage is not:

> “We use AI.”

The advantage is:

> **We combine structured Czech school information, personalized matching, comparisons and application guidance into one workflow.**

---

# 40. Personalization

The AI explanation should make the result feel personally relevant.

Example structure:

1. Who the user appears to be based on their answers.
2. What they said they value.
3. What the school offers.
4. Why those things connect.
5. Potential downsides.
6. What they should investigate next.

Avoid pretending the AI knows the student deeply.

It should say things like:

> “Based on your answers…”

rather than:

> “You are definitely an extroverted ambitious person…”

Personalization should increase trust, not create false certainty.

---

# 41. School Partnerships

Do NOT make school outreach the immediate bottleneck.

It is valuable later.

Potential model:

The school does not necessarily need to pay for every student.

Instead:

**School emails parents → parents receive an offer → parents buy individually**

This can be powerful because school communication carries trust.

Approach schools after you have:

- functioning product
- testimonials
- real users
- real sales
- clear offer

This makes outreach much easier than approaching schools with only an idea.

---

# 42. Tutoring Partnerships

Tutoring companies are potentially attractive because their customers already spend money on education.

Offer:

- affiliate commission
- student discount
- bundled promotion
- referral link

Do not require upfront payments.

Make it performance-based initially.

---

# 43. SEO

SEO is a long-term acquisition channel.

Create pages around useful Czech searches such as:

- střední školy Praha
- střední školy Praha obory
- přijímačky 2027
- dny otevřených dveří Praha
- jak vybrat střední školu
- přihláška na střední školu
- CERMAT přijímačky
- jednotlivé Prague schools/programmes

Do not make spam pages.

Each page should provide genuinely useful structured information.

---

# 44. Expansion Strategy

Do NOT immediately build every city.

First prove Prague.

Then replicate the system:

**Prague → Brno → Ostrava → Plzeň → other cities**

Expansion should become mostly a data-acquisition problem rather than a completely new product.

---

# 45. Revenue Milestones

Track:

**1 customer**

Then:

**10**

Then:

**25**

Then:

**50**

Then:

**100**

Then:

**250**

Then:

**500**

Then:

**1,000+**

The first goal is not 1,000.

The first goal is proving:

> **A stranger will pay.**

---

# 46. Revenue Math

If the average season purchase is approximately 600 CZK:

100 customers ≈ **60,000 CZK**

167 customers ≈ **100,000 CZK**

500 customers ≈ **300,000 CZK**

833 customers ≈ **500,000 CZK**

1,667 customers ≈ **1,000,000 CZK**

These are gross revenue figures, not profit.

Affiliate commissions, payment fees, taxes and future operating costs must be accounted for separately.

---

# 47. What to Optimize

Do NOT optimize for:

- followers
- likes
- impressions
- website traffic alone

Optimize:

### Revenue per visitor

and:

### Customer acquisition cost

and:

### Conversion rate

and:

### Referral revenue

The ultimate question is:

> **How much money does each acquisition channel produce relative to what it costs?**

---

# 48. Affiliate Unit Economics

For a 690 CZK sale with:

- 50 CZK customer discount
- 30% creator commission on 640 CZK

Approximate:

Customer pays: **640 CZK**

Creator: **~192 CZK**

Remaining before fees/taxes/other costs: **~448 CZK**

This is much healthier than immediately giving away:

- 50% customer discount
- 50% creator commission

Do not destroy your margin before you know what converts.

---

# 49. When to Increase Creator Commission

Increase commission only when the creator proves they can sell.

A creator producing:

**1 sale**

does not need 50%.

A creator producing:

**100 sales**

may absolutely deserve a much better deal.

Your objective is:

> **Pay as much as necessary to create more profitable sales.**

Not:

> **Pay the smallest possible commission.**

---

# 50. Customer Referral System

After you have customers, add a referral system for users too.

Example:

> “Give a friend 50 Kč off and get 50 Kč credit/reward.”

This can turn satisfied students into acquisition channels.

Do not prioritize this before the basic product and creator affiliate system work.

---

# 51. Trust Strategy

You are selling a high-stakes decision.

Trust matters more than flashy AI.

Show:

- where historical data comes from
- clear explanations
- transparent methodology
- school information sources
- what the matching percentage means
- what it does NOT mean
- real user reviews
- real screenshots
- clear pricing
- clear refund/cancellation terms

Never claim:

> “Our tool guarantees the right school.”

Say:

> “We help you make a more informed decision.”

---

# 52. Data Accuracy

For school data:

Prioritize:

1. Official sources
2. CERMAT data
3. School sources
4. Structured secondary sources
5. AI-assisted extraction only with verification where appropriate

AI should help collect/structure information.

It should not silently invent facts.

---

# 53. Product Development Rule

Before adding a feature, ask:

1. Does it improve user value?
2. Does it improve trust?
3. Does it improve conversion?
4. Does it improve retention during the season?
5. Does it materially reduce user effort?

If the answer is “no” to all five:

**Do not build it now.**

---

# 54. Current P0 Development

Finish these first:

- remaining Prague schools
- core school data
- school pages
- questionnaire
- matching
- AI explanation
- comparison
- favorites
- core browsing/search
- Stripe
- authentication
- premium access security
- analytics
- deployment
- privacy/legal basics
- transactional emails
- mobile usability
- critical QA

---

# 55. P1 Development

Then:

- parent/child sharing
- application deadline countdown
- application timeline
- email reminders
- improved DiPSy walkthrough
- improved AI prompts
- visual product demo
- better onboarding polish

---

# 56. P2 Development

Later:

- advanced AI assistant
- advanced admission prediction
- school partnerships dashboard
- sophisticated referral dashboard
- native app
- advanced notifications
- additional cities

Do NOT allow P2 features to delay the launch.

---

# 57. Launch Readiness Checklist

Before public launch, verify:

### User

- registration works
- login works
- logout works
- password recovery works

### Product

- questionnaire works
- results work
- school data works
- school pages work
- comparison works
- favorites work

### Payment

- checkout works
- payment success works
- payment failure works
- premium unlock works
- unauthorized users cannot access premium data

### Infrastructure

- production hosting works
- database rules are correct
- security reviewed
- error monitoring/logging exists
- backups/recovery considered

### Legal

- privacy policy
- terms
- cookie/consent setup where required
- appropriate handling of minors/personal data

### Marketing

- landing page
- TikTok
- creator system
- affiliate tracking
- analytics

---

# 58. The Operating Schedule After Launch

Once live, use approximately:

### 30% product

Fix bugs and improve conversion.

### 50% marketing/sales

Acquire customers.

### 20% analytics/support

Understand users and respond to them.

If marketing starts working extremely well, temporarily shift even more time toward acquisition.

---

# 59. The Daily Dashboard

Every day record:

- visitors
- quiz starts
- quiz completions
- paywall views
- checkout starts
- purchases
- revenue
- traffic source
- creator
- affiliate sales
- refunds
- major bugs
- user feedback

You should eventually be able to answer:

> “Where did today's customers come from?”

If you cannot answer that, the marketing system is not mature enough.

---

# 60. First Marketing Content System

Create content in five categories.

## Pain

“Choosing a secondary school is way harder than it should be.”

## Education

“How to compare two Prague secondary schools.”

## Data

“Which Prague schools had the highest admission pressure?”

## Mistakes

“3 mistakes ninth-graders make when choosing a school.”

## Product

“Here's what happens when you answer our school questionnaire.”

Rotate between these.

---

# 61. TikTok Hook Examples

Use short hooks such as:

> “If you're in 9th grade, don't choose your secondary school like this.”

> “I found a problem with how Czech students choose secondary schools.”

> “Imagine having to compare 200 schools manually.”

> “This is what I would check before putting a school first on my application.”

> “Most students look at the wrong thing when choosing a secondary school.”

The video should quickly demonstrate something useful.

Do not make every video an advertisement.

---

# 62. Content-to-Product Funnel

The TikTok should not simply say:

> “Buy SkolaMatch.”

Instead:

**Interesting problem**

→ **Useful information**

→ **Demonstration**

→ **Curiosity**

→ **SkolaMatch**

→ **Questionnaire**

→ **Personal result**

→ **Paywall**

→ **Purchase**

---

# 63. Tester-to-Testimonial System

After beta testing:

Ask:

> “Would you be comfortable giving us a short honest testimonial?”

If yes, collect:

- first name/initial if appropriate
- age category where appropriate
- parent/student
- written testimonial
- optional screenshot

Do not fabricate testimonials.

Do not pay people to claim they love the product.

---

# 64. Product Demo Video

Create one short video for the landing page.

Show:

1. Start
2. Questionnaire
3. Personalized result
4. School page
5. Comparison
6. Favorites
7. DiPSy guidance
8. Paywall
9. What the customer receives

Keep it short.

The purpose is:

> **Make the visitor understand the product within seconds.**

---

# 65. What You Should NOT Do in Week 1

Do not spend the week:

- designing a perfect logo
- building an elaborate referral dashboard
- building a native app
- creating ten AI features
- expanding outside Prague
- manually contacting every school
- building advanced prediction models
- obsessing over TikTok followers
- waiting for 50 testers before doing anything else

The bottleneck is:

**launch readiness + initial acquisition.**

---

# 66. Week 1 Marketing Is Real Work

The previous schedule was too development-heavy.

The corrected Week 1 allocation is:

### Monday

3h development  
2h marketing

### Tuesday

3h development  
2h marketing

### Wednesday

3h Stripe  
2h marketing

### Thursday

3h accounts/security  
2h marketing

### Friday

3h analytics  
2h marketing

### Saturday

4h testing  
2h marketing

### Sunday

2h development/fixes  
4h actual beta recruitment/outreach

Approximately:

**21h development/testing**

**14h marketing**

**35h total**

This is much closer to the intended **~60% development / ~40% marketing preparation + acquisition** transition.

The percentage does not need to be mathematically exact.

The important point is:

> **Marketing must happen during Week 1.**

---

# 67. Week 1 Marketing Deliverables

By the end of Week 1 you should physically have:

- TikTok account
- first 5–10 content ideas
- at least 3 published posts
- beta recruitment form
- beta recruitment message
- creator spreadsheet
- at least 50 relevant creator/prospect leads
- at least 50 outreach attempts
- first beta candidates
- affiliate model decided
- referral tracking requirements written down
- analytics funnel defined

---

# 68. Day 1 — What You Should Do RIGHT NOW

Do NOT start by making another random feature.

Your Day 1 mission is:

> **Create the launch critical path and simultaneously start building the first acquisition pipeline.**

## First 30 minutes

Open the codebase and make a P0 checklist.

Write every remaining launch blocker.

Categorize:

Use current handoff priorities: beta-blocking issues (including privacy/auth/data/device) come before beta; billing blockers come before charging. A P1 can block release. P2/P3 improvements depend on demonstrated impact, not only whether they prevent charging.

Do not code yet.

---

## Next 2 hours

Work on the most dangerous P0 development blocker.

If Stripe is truly completely unfinished and payment is necessary for launch, Stripe is a very high priority.

But first understand your current architecture so you don't build Stripe incorrectly.

---

## Next 1 hour

Create your beta recruitment infrastructure:

- Google Form / simple form
- spreadsheet
- tester message
- fields:
  - student/parent
  - city
  - ninth-grade status
  - willing to test
  - feedback permission
  - contact information needed for beta access

Keep data collection minimal.

---

## Final 2 hours

### Create your acquisition list.

Start with at least:

**20 creators**

**20 student/community sources**

**20 parent/community sources**

Then send the first batch of outreach.

Also publish your first faceless piece of content.

The content does NOT need to be perfect.

The objective is to start the machine.

---

# 69. Day 1 Priority Order

If you only remember one thing, follow this order:

### #1

**Find what can prevent launch.**

### #2

**Fix the biggest P0 blocker.**

### #3

**Create the beta recruitment system.**

### #4

**Start contacting real people.**

### #5

**Publish your first content.**

### #6

**Do not start unnecessary feature development.**

---

# 70. The Overall Timeline

## Week 1

**Finish launch-critical foundations + start acquisition**

## Week 2

**Private beta + fixes + continued acquisition**

## Week 3

**Soft launch + first paying customers + affiliate testing**

## Week 4

**Public launch + aggressive organic/creator/parent acquisition**

## Weeks 5–8

**Optimize conversion + scale winning acquisition channels**

## After initial proof

**School partnerships + SEO + additional cities**

---

# 71. The Core Strategy in One Sentence

> **Do not spend the next month building in isolation; spend the next month turning the product from a demo into a measurable business by simultaneously finishing the minimum launchable product, recruiting real strangers, getting the first paying customers, and identifying which acquisition channels can profitably scale.**

