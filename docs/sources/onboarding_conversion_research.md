---
title: What Makes an Onboarding Flow Actually Convert
date: 2026-09-05
status: research reference, not a decision record
---

## Intro

This fills the gap between "where onboarding lives" (`platform_onboarding_research.md`) and "what onboarding screens look like" (`mobbin_pattern_survey.md`): what evidence actually exists on *why* an onboarding flow converts. Source quality is uneven for this topic — almost none of it is peer-reviewed, most is company case studies or agency marketing — so every finding below is labeled:

- **[Peer-reviewed/academic]** — published research, replicated or citable methodology
- **[Case study]** — a company's own published data or teardown of a real shipped product
- **[Vendor/marketing]** — content from a tool vendor or growth agency, directionally useful but self-interested
- **[Inference]** — my own reasoning, not sourced, flagged as such

ŠkolaMatch-specific constraints are treated as binding throughout: single-use (no retention lever), web-first with desktop as first-class, anonymous-quiz-then-paywall, dual persona, EU minor-audience legal constraints, and 23 screens currently under review.

---

## 1. Flow length and question count — with numbers

**The one real quantitative dataset found: SurveyMonkey's analysis of ~100,000 surveys, 2,000 per question-count from 1–50 questions. [Case study — large sample, but not peer-reviewed or a controlled experiment]**
The finding is a curve shape, not a single cliff:
- Questions 1–15: "the sharpest increase in drop-off rate occurs with each additional question" — this is where you pay the most per question.
- Questions 15–35: incremental drop-off per question is measurably lower.
- 35+: respondents become comparatively indifferent to additional length.
SurveyMonkey does not publish the actual percentages publicly in this piece, only the shape — so treat this as "front-loaded cost, flattening curve," not as a numeric table you can port directly. ([SurveyMonkey: Does Adding One More Question Impact Survey Completion Rate?](https://www.surveymonkey.com/curiosity/survey_questions_and_completion_rates/))

**Important transfer caveat [inference]:** this data is from general-purpose surveys with no reward at the end (no personalized result, no product). A quiz that visibly builds toward a promised payoff (Noom, Cal AI, ŠkolaMatch's #1-match reveal) very plausibly has a *different* curve — likely flatter drop-off per question, because each answered question is visibly being used to build something the user wants to see. This is the theoretical basis for "long quiz as investment" but I found no study that isolates *reward-bearing* quizzes from plain surveys to confirm the shape actually differs, or by how much. That is a genuine gap, not a filled one.

**Noom: 26–113 screens depending on how you count, real shipped product. [Case study]**
Reports vary — a community teardown cites "26 onboarding screens" as an older figure; RevenueCat's more granular 2026 teardown counts up to 113 screens including all sub-steps, with completion taking 10–15 minutes for typical users and 90+ minutes for people who read everything. Email capture happens roughly one-third through, right before the results graph; paywall arrives after roughly 100 screens, following the results, plan customization, and educational content. ([RevenueCat: Inside Noom's Web-to-App Onboarding Funnel](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel), [StartupTalky community: Noom 2020 onboarding screens](https://community.startuptalky.com/discussions/post/in-2020-noom-1b-arr-had-2-NcwCQAnECYMy2Az))

No conversion rate is published for this exact funnel — RevenueCat's piece cites Noom's total user count (3.6M+) and an industry stat that "55% of trial cancellations happen on Day 0," but does not connect flow length to a specific conversion number. **This means the oft-repeated "Noom proves long quizzes convert" claim is unsupported by any public number — it's an existence proof (Noom is large and uses a long quiz) not a causal one.**

**Cal AI's onboarding is documented as a widely-copied teardown (Figma community breakdown) [vendor/community content, not primary data]** — I could not find a published completion or conversion rate for it either. Treat any specific percentage claim about Cal AI's funnel that circulates in growth-marketing content as unverified unless traced to Cal AI's own disclosure, which I did not find.

**Where the curve plausibly turns earlier for ŠkolaMatch [inference, stated as inference per your instruction]:**
Three of your product's properties argue for a *shorter* tolerable flow than Noom/Cal AI's:
1. **No prior brand relationship.** Noom and Cal AI users often arrive already having decided "I want a weight-loss app" — some baseline trust exists. Your traffic arrives cold, off a 15–30 second TikTok clip, with zero brand equity. Sunk-cost investment compounds slower when trust starts near zero.
2. **No future payoff to anchor patience.** A habit-product quiz implicitly promises "this will get easier/better over weeks." A one-time decision tool has no such story — the payoff is immediate or nothing, so there's less patience reserve to draw on mid-flow.
3. **The reward is a school match, not a dopamine hit.** Weight-loss and fitness quizzes bracket toward emotionally charged self-image content, which increases engagement with the process itself. A high-school choice, while high-stakes, is calmer and slower-burning — less likely to sustain the same length of engaged quiz-answering.

I have no data that quantifies exactly where this puts your ceiling — my honest estimate, stated as inference, is that something in the 8–14 question range (rather than Noom's dozens of data points) is a safer bet for a one-time, cold-traffic, non-habit product, but this is a design judgment to validate with your own funnel data, not a sourced number.

---

## 2. Desktop and wide-viewport onboarding — priority section

**Honest headline: there is essentially no published research on this. What exists is convention, inferred from real shipped products, not evidence of what performs better.** This is the single biggest gap the brief asked me to fill, and the honest answer is "nobody has published data on this specific question — here's what's actually shipped."

**Does one-question-per-screen still work at 1280px+?**
No study found either way. What's observable in the wild: the products that keep a single-question-per-screen pattern at desktop width (Typeform-style forms) universally **constrain the content column to a narrow centered measure** (roughly 600–800px) rather than letting the question stretch full-width — full-bleed text at 1280px produces the "wasteful/slow" read you're worried about, and this is consistent across every wide-format quiz tool I could find description of. Typeform's own help documentation and community threads confirm their standard pattern is a centered, width-capped question column regardless of viewport, with background/whitespace filling the rest ([Typeform Community: Mobile Layout vs Desktop Layout](https://community.typeform.com/build-your-typeform-7/changes-on-mobile-layout-vs-desktop-layout-2399)). This is **convention, not evidence of conversion impact** — I found no A/B data comparing full-bleed vs. centered-column desktop quiz layouts.

**Named examples of genuinely designed (not stretched-phone) desktop onboarding — with the caveat that I was not able to visually re-verify live current-state pages in this pass:**

| Product | Category | Layout pattern (as documented/known) |
|---|---|---|
| Typeform | Forms/survey tool | Centered narrow question column, generous negative space either side, one question per screen even at desktop width |
| Robinhood (account opening, historically) | Fintech | Centered column with persistent step indicator, minimal side content |
| Headspace / Calm (web signup flows) | Wellness | Centered narrow column with illustration used as a *side* element rather than stretched background |
| LinkedIn onboarding (desktop) | Professional network | Centered card layout, real content used to fill horizontal space is mostly branding, not more questions |
| Duolingo (web, historically) | Edtech | Centered narrow quiz column, mascot illustration occupies remaining horizontal space rather than more text |
| Notion (setup flow) | Productivity | Split-pane: form on one side, live-updating preview of the workspace being configured on the other |
| Superhuman (onboarding, historically documented via UX case-study writeups) | Productivity | High-touch, largely white space, minimal content width regardless of screen size |
| Personal Capital / Empower (financial planning onboarding) | Fintech | Centered form column with a persistent sidebar summarizing inputs collected so far |

**Honesty note:** I could not independently re-inspect the current live DOM/layout of each of these (no live browser rendering tool available in this pass); this table reflects documented/known patterns for these products' onboarding history and general design-community consensus, not a fresh screenshot audit. Treat the *pattern* (narrow centered column + side content) as reliably common; treat any specific current-pixel-layout claim with caution.

**How the best ones use extra horizontal space [pattern observation, not measured]:**
Recurring uses across examples above, ranked by how often they appear in documented patterns (not by proven effectiveness, since no comparative data exists):
1. **Persistent progress/step indicator** beside the question rather than a thin top bar — very common, cheap to build.
2. **A live-updating preview of the thing being built** (Notion's workspace preview, financial tools' running summary) — this is the strongest desktop-specific opportunity for you: a "your profile so far" panel building visibly next to the quiz, directly usable for ŠkolaMatch since the entire value prop is a personalized result under construction.
3. **Illustration/mascot filling space** — common but decorative; does not add function, mainly prevents the "empty white page" feel.
4. **Contextual reassurance text beside the question** (why we're asking, how it's used) — appears in fintech and health onboarding specifically, plausibly because those categories carry more inherent user hesitation, which maps onto your product's anxiety-adjacent nature.

**Does anyone show more than one question per screen on desktop while staying one-per-screen on mobile?**
I could not find a named, confirmed example of this exact adaptive behavior (single-question mobile, multi-question desktop) with a source describing it as deliberate. This appears to be an underused pattern rather than a proven-bad one — an actual gap, not a documented failure. If you pilot it, you'd be ahead of any public case study I could find, for better or worse; I'd flag it as unvalidated territory rather than either recommend or discourage it from evidence.

**What breaks when a mobile quiz is naively widened [inference, but a well-established design-practice consensus]:**
- Line lengths exceeding ~75 characters materially hurt reading speed and comprehension — this is standard typographic practice, not new research, but is the most concrete "why the question feels wasteful" mechanism.
- Tap targets sized for thumbs (44–48px) look absurdly oversized as mouse-click targets at desktop scale if not resized down — this is a real, visible tell of a stretched-phone layout.
- Vertical centring breaks on tall/ultrawide monitors — content designed to center in a 844px-tall mobile viewport floats awkwardly in the middle of a 1440px+ tall window, and single-question screens in particular look sparse/lost.
- Progress bars stretched edge-to-edge at 1280px+ look like an odd, low-density decorative stripe rather than a meaningful indicator — this is a concrete, fixable "wasteful" signal worth deliberately avoiding.

---

## 3. Attention: capturing and holding it, without manipulation

**The first screen — what's actually known:**
The most-cited academic finding here is Lindgaard, Fernandes, Dudek & Brown (2006), *"Attention web designers: You have 50 milliseconds to make a good first impression!"*, Behaviour & Information Technology 25(2). **[Peer-reviewed]** The study found users form a visual-appeal judgment of a webpage in as little as 50ms, and that this snap judgment correlates with later credibility/usability judgments — i.e., the first-glance aesthetic impression anchors everything after it. ([ResearchGate copy of the study](https://www.researchgate.net/publication/220208334_Attention_web_designers_You_have_50_milliseconds_to_make_a_good_first_impression_Behaviour_and_Information_Technology_252_115-126))

**Caveat on transfer [inference]:** this study measures visual-appeal snap judgment, not "will they continue past screen 1 of a quiz" specifically — no study I found measures onboarding-continuation decisions at the same granularity. It supports "your first screen's visual polish matters disproportionately," not a specific completion-rate number.

**Desktop-arrival vs. mobile-social-arrival difference:** I found no study directly comparing these two arrival contexts for onboarding continuation. The reasonable inference (**flagged as inference**) is that a desktop visitor who typed a URL or clicked a saved link has pre-existing intent and is more patient with a slower first screen, while a mobile visitor arriving via an impulse tap from a TikTok/Instagram link has near-zero patience reserve and needs the value proposition legible within the first screen's few seconds — but I have no measured data quantifying "how much more patience," only the general first-impression research above as a base rate that applies to both.

**Mechanisms for holding attention through a long flow, ranked by evidence strength (strongest first):**

1. **Endowed Progress Effect — [Peer-reviewed].** Nunes & Drèze (2006), *"The Endowed Progress Effect: How Artificial Advancement Increases Effort,"* Journal of Consumer Research 32(4). Field and lab experiments (loyalty-card stamp studies) found that giving people a head start toward a goal — even an artificial one, e.g. starting a 10-stamp card already stamped twice vs. starting an 8-stamp card at zero — increases completion rate and effort, because *perceived* progress toward completion drives motivation more than the objective distance remaining. ([Oxford Academic](https://academic.oup.com/jcr/article-abstract/32/4/504/1787425), [SSRN copy](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=991962)) This is real, replicated, and directly applicable to a progress bar — **with a legal caveat below: it must not misrepresent actual progress, which is a live EU compliance question, not just an ethics one.**
2. **Personalization that visibly accumulates — [inference, but mechanistically close to endowed progress].** A "profile being built" visual (the desktop live-preview pattern from Section 2) is a legitimate, non-deceptive way to harness the same motivational mechanism, since the progress shown is real, not manufactured.
3. **Narrative/problem-framing before the task — [case study evidence only].** Noom and similar quizzes consistently open with stakes/problem-framing before the first question; this is universal practice but I found no controlled study isolating its effect from the rest of the funnel — it's plausible on persuasion-theory grounds (commitment and consistency) but not independently measured.
4. **Motion/animation as an attention-holder — no evidence found either way** for this specific application (separate from the ambient-animation research already on file); not recommending or discouraging based on evidence, since none exists for this exact question.

**Where "compelling" becomes "dark pattern" under EU law — Article 25 DSA, specifically:**
Article 25 DSA prohibits online interface designs that "deceive or manipulate" users or "materially distort or impair" their ability to make free, informed decisions. **[Primary legal source — this is binding law, not commentary]** ([DSA Library, Article 25 text and commentary](https://dsa-library.com/article/25/))

Named practices confirmed as prohibited or clearly high-risk under Article 25 and adjacent EU rules (GDPR, Unfair Commercial Practices Directive):
- **Pre-checked boxes** for paid options or data sharing — requires affirmative, explicit action instead. Directly relevant if any screen defaults a plan tier or upsell to "on."
- **Confirmshaming** (e.g., "No thanks, I don't want my child accepted to a good school") — explicitly named as a violation category. This is a real risk for a product built around a stakes-and-anxiety framing; any decline-option copy needs to stay neutral.
- **Fabricated scarcity/urgency** ("Only 3 spots left," fake countdown timers) — explicitly prohibited when the scarcity is not real. Your brief already rules this out; the legal source confirms it's not just tasteless but legally risky.
- **Hidden costs disclosed only at final checkout** — treated as manipulative; pricing should be visible before the final commit step, not sprung at the end.
- **Friction asymmetry** (one-click into something, multi-step to exit/cancel/decline) — named as impairing free choice; relevant to how "skip" or "see full results without paying" options are designed.

**Explicitly not addressed in the source I could access:** the DSA Library page I fetched does not itself carry minor-specific provisions distinct from the general Article 25 text — the minors-specific weight comes from the Digital Fairness Act proposal and GDPR's Article 8 (consent age thresholds), which I was not able to fetch primary text for in this pass. **Gap, flagged honestly:** I can confirm Article 25's general prohibitions above from a primary-ish source, but I could not verify the *specific* minor-enhanced provisions (e.g., whether DFA proposals impose a stricter standard for under-18 users specifically, beyond the general ban) from a document I actually read in this session — secondary commentary (Lexology, Osborne Clarke) suggests the DFA proposal does add minor-specific scrutiny, but I did not fetch and verify their content directly, so treat that specific claim as unconfirmed pending your own legal review rather than something I've verified for you. **You should have this checked by someone with EU consumer-law expertise before finalizing copy and defaults — this section is directional, not a compliance sign-off.**

**Endowed-progress-effect legal interaction [inference, worth flagging]:** the Nunes & Drèze effect works by giving a *perceived* head start. If ŠkolaMatch's progress bar showed, say, 30% complete after one screen to induce the same effort-boosting effect, that would likely cross into "artificial advancement that misrepresents actual progress" — which Article 25's anti-deception language plausibly captures, even though the academic study itself is not about legality. The safe version is a progress indicator that's accurate but *framed* well (e.g., counting only the questions, not diluting it across throwaway screens), not one that's numerically inflated.

---

## 4. Evidence on your specific structural choices

**Persona branching at screen 2 (student vs. parent):** No direct evidence found, positive or negative. This is genuinely untested territory in the public record — I found no A/B test or case study of early persona-branching quiz UX specifically measuring conversion lift vs. a single unified flow. **[Gap]** The closest adjacent reasoning: personalization generally correlates with engagement in marketing literature, but "does branching at screen 2 specifically improve conversion over branching later or not at all" has no dedicated study. Don't treat this as validated by anything below — it's a reasonable design bet, not a proven one.

**Problem-framing/stakes screens before the first question:** Universal in case-study examples (Noom, Cal AI) but never isolated as a variable in a controlled test I could find. **[Case study pattern, not proven causally]**

**"Calculating/analysing" loading screen that itemizes what's being processed:** This is an extremely common pattern in quiz-style consumer apps (again Noom-style teardowns document it) but I found no dedicated study measuring its effect vs. an instant reveal. The theoretical basis (perceived-effort/labor illusion increasing perceived value of the output) is a documented concept in service-design literature broadly, but I did not find it tested specifically in an onboarding-quiz context. **[Inference from adjacent theory, not a direct citation]**

**Revealing #1 match free + paywalling the rest, vs. paywall-before-any-result, vs. reveal-everything-paywall-depth:** No comparative data found across these three specific structures. This is a real, unaddressed gap — every source I found describes *what* products do (Noom shows a results graph before paywall, most freemium-quiz apps show a taste of the result) but none quantify the differential lift between "show #1 only" vs. "show everything but blur/lock depth" vs. "no result until payment."

**Account creation before paywall (vs. after purchase):** Not directly tested in anything I found, but this is close to the earlier onboarding-conversion research already on file about signup placement, which found Noom's own pattern places email capture before the results reveal and full account creation later, closer to or interleaved with the paywall — consistent with your current design, but again without a measured lift number. This is corroborating precedent, not independent proof.

**Qualitative bands with reasons vs. a numeric percentage match score:** No study found measuring conversion impact of this specific choice either direction. What exists is adjacent, not on-point: general UX writing on avoiding false precision (a 73% match score implies a level of algorithmic certainty that a ranking heuristic usually doesn't have) is common design-ethics guidance, but I found no data on whether removing the number *costs* conversion. Given your zero-shame-UX constraint and the anxiety-adjacent nature of the decision, qualitative banding is well-supported as the right choice on ethical/product grounds — but I cannot tell you it doesn't cost some conversion, because nobody has published that number. **Flagged plainly: this is an area where you may be trading some measurable conversion for user wellbeing, and I don't have the size of that trade.**

---

## 5. The dual-persona problem

I could not find a named, well-documented case study of a consumer product onboarding two independent-paying personas (specifically a minor and their parent, each buying separately) through one branching flow. The closest adjacent categories found in search were teen banking apps (which typically use a parent-initiated, then teen-invited model — the parent is usually the account originator, not an independent parallel buyer) and general co-shopping/purchase-influence research, which is about children influencing a *single* parental purchase, not two people separately transacting. **[Gap — this appears to be a genuinely underexplored product pattern, not just an under-researched one.]**

On parental consent/confirmation steps and completion: I found general research infrastructure around parental consent in the context of *research studies involving children* (IRB/HHS guidance, e.g. [HHS.gov: Research with Children FAQs](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/children-research/index.html)), which is not the same domain as commercial parental-consent UX and does not transfer directly — flagging this so it's not mistaken for relevant evidence. I found no commercial UX research on how a parental-consent or parental-confirmation *step* affects completion rate in a paid product flow.

**Practical implication:** your dual-persona branch-and-price-independently model appears to be closer to novel territory than an established pattern with known best practices. I'd treat Section 5 of your own eventual design as something to user-test directly (a handful of real parent/teen sessions) rather than something you can currently ground in published precedent.

---

## 6. What to cut

No published study exists on removing steps from a specific onboarding flow and measuring the effect for a product shaped like ŠkolaMatch — the "remove X screens, gain Y% completion" data that exists (mostly signup-form-field-count studies from checkout-optimization literature) is from a different context (e-commerce checkout forms) and I would not port it here without flagging that mismatch.

Given that, here's what the two general theories in this document actually predict for your 23-screen structure, offered as a structured judgment rather than a sourced verdict:

- **Hook → role fork → problem framing → stakes → intent** (5 screens before the first quiz question): the SurveyMonkey curve implies your steepest per-screen drop-off risk is in your *first* 15 interaction points — and these 5 screens plus your 10 quiz questions plus mirroring/expectation screens put you deep into that steep zone before any payoff appears. **This is the segment most worth pressure-testing for cuts**, not the post-reveal screens, because nothing has been delivered to the user yet to justify the endowed-progress/investment effect kicking in.
- **Mirroring + honest expectation + calculating** (pre-reveal): three screens in a row with no new information for the user, right before the reveal. Given no study distinguishes which of these actually earns its place, my inference (flagged as inference) is that "calculating" alone likely captures most of the labor-illusion benefit, and mirroring + honest-expectation may be redundant with each other — worth testing collapsed into one screen.
- **Journey summary + commitment + social proof** (post-reveal, pre-account): this cluster is the one most consistent with documented case-study patterns (Noom's conviction sequence sits in the same structural place) — closer to supported-by-precedent than the pre-quiz screens, even without a hard number.

**Bottom line: I don't have evidence to tell you "cut screens 3, 7, and 14" with confidence. What the evidence does support is that pre-payoff screens carry more marginal drop-off risk per screen than post-reveal screens, so if you're cutting three, the pre-quiz framing sequence and the pre-reveal three-screen cluster are the more defensible places to look than the post-reveal conviction sequence.**

---

## 7. Failure modes, with named examples

**"Feels like work, not investment" — [inference from case-study commentary, not a controlled study]:** the recurring theme in critiques of long onboarding quizzes (found in general growth/product commentary rather than a single citable source) is that a quiz reads as investment when each question visibly narrows or personalizes the outcome, and reads as work when questions feel redundant with each other or disconnected from the visible result. Noom's funnel is specifically called out in community discussion for demanding sensitive health data (gender, pregnancy status) early, which read for some users as invasive rather than personalizing — a useful cautionary parallel for any point in your flow that asks for something a user might not see the immediate relevance of.

**"Paywall feels earned vs. bait-and-switch" — no controlled study found, but a clear pattern in case-study commentary:** the RevenueCat teardown of Noom frames the "pay what you want" trial ($0.99/$4.99/$9.99 for 14 days) as a deliberately low-commitment bridge specifically *because* the flow leading into it has already delivered a personalized result — the framing device is "you've already seen what this does for you, this is a small ask to continue," not "give us money to see anything at all." This matches your existing structure (free #1 match, pay for full list) and is the most directly supportive precedent in this whole document, though again without a hard conversion number attached.

**Longest-onboarding-as-cautionary-tale:** a piece titled *"The Longest Onboarding Ever"* surfaced in search discussing an onboarding flow widely criticized as excessive ([Retention.blog: The Longest Onboarding Ever](https://www.retention.blog/p/the-longest-onboarding-ever)) — I was not able to fetch and verify its full content in this pass, so I can't tell you which product it names or what specifically it measured; flagging its existence as a lead worth reading directly yourself rather than asserting its contents secondhand.

---

## What this does not answer

- No number for where ŠkolaMatch's specific completion curve turns — the SurveyMonkey shape is the closest proxy and it's from a different category of survey entirely.
- No comparative data on any of the three reveal/paywall architectures (show #1 free vs. paywall-before-result vs. reveal-all-paywall-depth).
- No data on whether qualitative match bands cost conversion relative to a numeric score, only that it's well-supported on ethical/product-fit grounds.
- No case study of a dual-independent-payer minor+parent flow exists to learn from — this is closer to product-design territory you'll be establishing than replicating.
- No confirmed primary-source detail on Digital Fairness Act minor-specific provisions beyond general Article 25 — get this checked by EU consumer-law counsel before finalizing copy, urgency framing, and default states.
- No adaptive single-question-mobile/multi-question-desktop example was found, so piloting that pattern would be unvalidated territory, not a known-good approach.
- Nothing here should be read as approving or rejecting your 23-screen structure as a whole — the evidence only supports relative statements (pre-payoff screens are riskier per-screen than post-reveal ones), not an absolute right-sized number.

## Sources

- [SurveyMonkey: Does Adding One More Question Impact Survey Completion Rate?](https://www.surveymonkey.com/curiosity/survey_questions_and_completion_rates/)
- [RevenueCat: Inside Noom's Web-to-App Onboarding Funnel](https://www.revenuecat.com/blog/growth/web-to-app-onboarding-funnel)
- [StartupTalky community: Noom 2020 onboarding screen count](https://community.startuptalky.com/discussions/post/in-2020-noom-1b-arr-had-2-NcwCQAnECYMy2Az)
- [Web2App World: Noom Funnel Breakdown](https://web2appworld.com/breakdowns/noom/)
- [Cal AI's Onboarding — Broken Down (Figma community)](https://www.figma.com/community/file/1540803063078176882/cal-ais-onboarding-broken-down)
- [Typeform Community: Mobile Layout vs Desktop Layout](https://community.typeform.com/build-your-typeform-7/changes-on-mobile-layout-vs-desktop-layout-2399)
- Lindgaard, G., Fernandes, G., Dudek, C., & Brown, J. (2006). "Attention web designers: You have 50 milliseconds to make a good first impression!" Behaviour & Information Technology, 25(2), 115–126. [ResearchGate copy](https://www.researchgate.net/publication/220208334_Attention_web_designers_You_have_50_milliseconds_to_make_a_good_first_impression_Behaviour_and_Information_Technology_252_115-126)
- Nunes, J. C., & Drèze, X. (2006). "The Endowed Progress Effect: How Artificial Advancement Increases Effort." Journal of Consumer Research, 32(4), 504–512. [Oxford Academic](https://academic.oup.com/jcr/article-abstract/32/4/504/1787425), [SSRN copy](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=991962)
- [DSA Library: Article 25 — Online interface design and organisation](https://dsa-library.com/article/25/)
- [Lexology: Digital Fairness Act Unpacked — Dark Patterns](https://www.lexology.com/library/detail.aspx?g=dfebb4c1-22aa-4e01-926e-dd799750b2dd) *(secondary commentary, not independently verified in this session)*
- [Osborne Clarke: Digital Fairness Act Unpacked — Dark Patterns](https://www.osborneclarke.com/insights/digital-fairness-act-unpacked-dark-patterns) *(secondary commentary, not independently verified in this session)*
- [HHS.gov: Research with Children FAQs](https://www.hhs.gov/ohrp/regulations-and-policy/guidance/faq/children-research/index.html) *(adjacent domain — research ethics, not commercial UX; cited only to flag the mismatch)*
- [Retention.blog: The Longest Onboarding Ever](https://www.retention.blog/p/the-longest-onboarding-ever) *(surfaced but not independently verified in this session)*
