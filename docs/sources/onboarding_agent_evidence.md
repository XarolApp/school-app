# Onboarding agent evidence base (§1–§2)

Moved verbatim from `.claude/agents/onboarding-architect.md` so the agent does not load it on
every invocation. These are dated video-summary notes: treat them as hypotheses, not verified
evidence or product guarantees. Section numbers are unchanged because the agent's §0, §3 and
§4–§6 cite them. The agent's §0, §3 rulings and current product decisions override anything here.

## §1 — THE PSYCHOLOGICAL EVIDENCE BASE

*(Source: video-by-video UI/UX & monetisation analysis. All findings preserved.)*

### 1.1 Variable reward, progress & decision cost
*"The Secret Behind Weirdly Addictive Apps" (Tim Gabe)*

- **Variable Reward Mechanism (Dopamine Loops):** The brain releases dopamine not upon *receiving* a reward but in *anticipation* of an uncertain one (B.F. Skinner / Robert Sapolsky). Fixed rewards habituate rapidly; variable rewards sustain engagement.
- **Endowed Progress Effect (Nunes & Drèze, 2006):** Artificial advancement toward a goal dramatically raises completion. A 10-stamp card pre-stamped twice beat an 8-stamp card at zero — **claimed 19% → 34% completion (about 79% relative growth, not a doubling; source result not verified here)** — despite identical remaining work.
- **Goal Gradient Effect (Hull, 1932):** Motivation rises exponentially as the finish line is perceived to approach. Progress indicators should visually *accelerate* near completion.
- **Smart Defaults & Decision Fatigue:** The brain consumes ~20% of the body's energy; every choice imposes cognitive friction (Baumeister, ego-depletion literature). Auto-selecting the most common/optimal option measurably reduces drop-off.

**Střední na míru application:**
- Show progress from actual completed steps; do not label 1 of 10 as 15% completed.
- Progress must reflect actual remaining/completed work; uneven steps need an honest explanation.
- Show a **live match-percentage that updates as questions are answered** — this is the anticipation engine; the number moving is the variable reward.
- Every quiz question ships with a sensible pre-selected default where one exists (e.g. district = Praha, travel tolerance = 30 min).

### 1.2 Ownership, loss & identity
*"The Twisted Psychology Behind Top 1% Apps" (Tim Gabe)*

- **IKEA Effect (Norton, Mochon & Ariely, 2012):** Users assign disproportionate value to what they helped build or customise. Choosing themes, icons, accent colours or preferences manufactures psychological ownership.
- **Loss Aversion (Kahneman & Tversky):** The pain of losing is ~**2.1×** the pleasure of gaining. Framing features as *already possessed and at risk* converts far better than framing them as available to acquire.
- **Status Signalling & Identity:** Software is identity projection. Users engage with and share tools that reinforce a desired self-image or confer social capital.

**Střední na míru application:**
- Let teenagers customise: dashboard theme (Light / Dark / High-contrast), accent colour, favourite-list layout. Offer this *inside* onboarding — it is cheap ownership.
- Frame saved matches as user-authored assets: *"Uložil sis 5 škol — nepřijď o svou osobní analýzu."*
- The match result is an identity object ("Jsi typ na *gympl* s jazykovým zaměřením") — make it screenshot-worthy and shareable, because sharing it is status signalling among classmates.

### 1.3 Emotional design & cognitive load
*"The UX Psychology Behind Apps People Can't Stop Using" (UX Peak)*

- **Norman's 3 Levels of Emotional Design (Don Norman):**
  1. **Visceral** — automatic, subconscious aesthetic and tactile appeal (smooth animation, modern type, crisp contrast).
  2. **Behavioural** — usability, performance, efficiency, feedback clarity.
  3. **Reflective** — self-identity, pride, memory, long-term rational satisfaction.
- **Micro-Interactions & Feedback:** Subtle animation (confetti on completion, smooth slider transitions, tactile hover/press states) triggers micro-dopamine release and confirms system responsiveness.
- **Cognitive Load Reduction:** Miller's Law (7±2 items held in working memory) and Hick's Law (decision time grows logarithmically with option count).

**Střední na míru application:**
- **Never render 60 schools as one unformatted list.** Chunk into intuitive filter groups: District (*Městská část*), Specialisation (*Zaměření*), Travel distance (*Dojezdová vzdálenost*).
- Result reveals show top 3 first, then "show more" — never 60 at once.
- **Press feedback** (a brief scale-down confirming the tap registered) on every quiz option selection (visceral layer).
- Reflective layer is the payoff: the student should feel *"I now understand myself better,"* not just *"I got a list."*

### 1.4 Flow mechanics & the labour illusion
*"I Studied 1,460 Onboarding Flows. Here's What I Found." (Mobbin)*

- **Single-Question Screen Pattern:** One question per screen raises quiz completion by up to **40%** versus long vertical forms, by eliminating visual overwhelm and decision paralysis.
- **Dynamic Calculation / "AI Processing" Screens:** A deliberate **2–4 second** loading state ("Analysing 60 Prague high schools…", "Calculating distance matrices…", "Generating personalised explanations…") exploits the **Labour Illusion (Buell & Norton)** — users rate identical output as significantly higher quality when they observe work being performed.
- **Contextual Permission & Commitment Requests:** Request an input only *after* stating the direct benefit of giving it.

**Střední na míru application:**
- Quiz is strictly 1 question per screen with persistent progress feedback.
- While real work is pending, show a **stepped state** (discrete stage messages that name
  what is actually being computed), e.g. *"Počítám shodu s pražskými středními školami…"*
  → *"Porovnávám dojezdové vzdálenosti…"* → *"Připravuji vysvětlení…"*. Per ruling C-2 it
  lasts only as long as the work does.
- Ask for district/location only after: *"Abychom mohli spočítat, jak dlouho budeš dojíždět, potřebujeme vědět, odkud jezdíš."*

### 1.5 Paywall mechanics
*"I Studied 10,000 Paywall Screens (THIS Makes People Pay)" (Tim Gabe)*

- **Subscription plan performance:** Across 10,000 paywalls, **weekly plans frequently convert highest for short-term/seasonal needs**, while **annual/monthly plans build long-term value**. Střední na míru is seasonal — this matters (see 1.8 matrix).
- **Micro-Copy Pricing Framing:** Decomposing price to a daily micro-cost ("only 6.60 CZK/day", "less than a coffee per week") sharply lowers price sensitivity via anchoring bias.
- **Trial Toggle & Timeline Visuals:** An explicit 7-day timeline graphic reduces chargebacks and raises trial opt-ins through radical transparency.
- **Outcome-Based Feature Bullets:** List emotional/functional outcomes, never technical features. Not "PostgreSQL search" — instead **"Najdi 3 střední školy, kam se opravdu hodíš."**

**Střední na míru application:**
- Czech trial timeline on the paywall (canonical version in ruling C-1).
- Derive any daily equivalent from the configured total and an explicit period; render the full payable total and billing cadence plainly. The old 6,60 Kč example is not current pricing.
- Every bullet is an outcome, in Czech, from the student's or parent's point of view.

### 1.6 Paywall placement & trust
*"We Studied 2,995 Paywalls. Here's What Actually Converts." (Mobbin)*

- **Pre-Selected Default Strategy:** Pre-selecting the highest-value plan raises average order value **without reducing conversion volume**.
- **Social Proof & High-Trust Anchors:** Testimonials, star ratings and security badges ("Secured with Stripe", "Over 1,000 Czech students helped") placed **immediately adjacent to the CTA** raise conversion by defusing payment anxiety.
- **Contextual Paywall Placement:** Triggering the paywall right after a high-value moment (quiz completion) converts **3–5× better** than walling the app at launch.

**Střední na míru application:**
- Paywall fires **the moment the questionnaire completes**, to unlock full rankings and detailed AI explanations — never at app launch.
- Trust cluster sits directly against the CTA: Stripe badge, cancellation terms, student count, parent testimonial.
- Pre-select the season pass. Render its price at full weight (see 0.4).

### 1.7 The outlier playbook
*"The Weird Design Playbook of 6 App Outliers" (Tim Gabe)*

- **Pattern 1 — Niche Depth (Teemo):** Category incumbents default to inherited UI primitives (text list rows for productivity). Teemo won App of the Year by rebuilding the interface for neurodivergent/ADHD users around **visual coloured time-blocks** instead of text rows.
  → **Takeaway:** Do not copy `atlasskolstvi.cz`. Invent primitives tuned to how teenagers actually parse: slang-aware search (`gympl`, `průmyslovka`, `zdrávka`), badge filters, big visual match scores, not directory rows.
- **Pattern 2 — Tech Primitives First (Cal AI):** Rather than bolting AI onto an old interface (a search bar inside a menu), Cal AI built the entire product around AI vision — "**camera as homepage**."
  → **Takeaway:** For Střední na míru, AI is not a bolt-on. The **questionnaire + deterministic matcher + optional explanation copy is the primary intake primitive**. The quiz *is* the homepage of the experience, not a feature buried in a nav bar.
- **Pattern 3 — Zero-Shame Emotion Design (MacroFactor):** Fitness apps ran on guilt, broken streaks and red warnings. MacroFactor hit 500,000 paid users by removing every guilt mechanism in favour of neutral, objective, trend-smoothed data.
  → **Takeaway:** Codified as constraint 0.3. Never shame a student; blank answers never penalise; explanations stay encouraging and objective.
- **Pattern 4 — Synchronized Rituals (Ladder):** Convert solitary tasks into shared cohort experiences.
  → **Takeaway:** One-click export/share of top matches to parents or classmates. This is simultaneously the dual-persona handoff (0.2), the status-signalling surface (1.2) and the organic acquisition loop.

### 1.8 Adaptation matrix — generic app → Střední na míru

| Category principle | Standard long-term app | **Střední na míru seasonal adaptation** |
|---|---|---|
| **Retention loop** | Multi-year daily streaks | Seasonal milestone loop (Sept–March application window, *Dny otevřených dveří* tracking, DiPSy priority ordering) |
| **Payer target** | End-user is buyer | **Dual-persona:** students and parents can each buy directly; beta is free |
| **Paywall framing** | "Unlimited Annual Access" | Season pass / monthly subscription; current 690/249 Kč totals, no monthly trial; any daily equivalent names its denominator |
| **Trust engine** | Push notifications | High transparency: Stripe security badges, clear trial cancellation terms, deterministic math scoring |

---

## §2 — THE ONBOARDING STRUCTURAL EVIDENCE BASE

*(Source: master guide to mobile & web app onboarding. All findings preserved.)*

### 2.0 Why onboarding is the highest-leverage surface

Most developers spend months on features and **under 20 minutes** on onboarding. That single failure costs thousands in lost revenue.

- **The 3-Day Retention Cliff:** apps lose **77%** of active users within 3 days of install — almost always onboarding, not features or marketing.
- **The Single-Open Phenomenon:** **1 in 4 users (25%)** open an app exactly once and never return.
- **The Churn Baseline:** without a deliberate onboarding flow, up to **90%** of users churn permanently.
- **The Revenue Impact:** a high-converting onboarding flow drives up to **3× higher subscription conversions** and **65% higher renewal rates**.

**Mindset — the app is a sales funnel.** On first open the user has zero context, zero brand loyalty, and no understanding of how you solve their problem. Every screen before the paywall exists to build the case for paying.

**The "Airplane Seatbelt" analogy:** once they open the app you have a captive audience. For a **5–30 second window** their eyes are locked on your screen with no distractions. Onboarding is your hook, exactly like a YouTube video hook. Fail to capture interest immediately — or dump them into an unguided interface — and they get lost and bounce.

### 2.1 The three onboarding archetypes

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ONBOARDING ARCHETYPES                           │
├───────────────────┬───────────────────────────┬────────────────────────┤
│ 1. Educational    │ 2. Benefit-Driven         │ 3. Questionnaire       │
│    (Minimalist)   │    (Cinematic)            │    (Deep Personal)     │
├───────────────────┼───────────────────────────┼────────────────────────┤
│ • 1–2 screens     │ • 3–6 screens             │ • 15–100+ screens      │
│ • Zero friction   │ • Motion graphics/visuals │ • Deep survey/quiz     │
│ • Instant access  │ • Outcome transformation  │ • Calculated plan      │
│ • Soft Paywall    │ • Soft or Mixed Paywall   │ • Hard Paywall         │
└───────────────────┴───────────────────────────┴────────────────────────┘
```

**Archetype A — Educational / Single-Screen**
- 1–2 ultra-simple screens: explain what the app does, take necessary permissions, get out of the way.
- Design modelled on native system screens (e.g. Apple's default iOS update modal).
- Pairs with soft paywalls / freemium where value is immediately demonstrable.
- Examples: *Adam's Currency Converter* — single sheet modelled on iOS system alerts, **$2,000/month**. *Granola (AI notes)* — raised **$125M at a $1.5B valuation**, onboarding is exactly 2 screens (sign in with Google; grant microphone permission); value lands during the user's next meeting when it transcribes and summarises automatically.
- **Pitfall:** contains no sales messaging, transformation pitch or emotional anchoring. Attaching a hard paywall to this archetype produces high bounce.

**Archetype B — Benefit-Driven / Cinematic**
- 3–6 highly visual screens with motion graphics, subtle animation, clear benefit copy.
- **Core rule: sell transformation, not a spec sheet.**
  - *Wrong:* Screen 1 Feature A → Screen 2 Feature B → Screen 3 Feature C. Nobody reads spec sheets.
  - *Right:* Screen 1 frame the problem → Screen 2 show the life transformation → Screen 3 showcase value-add features → Screen 4 paywall.
- A habit tracker should not advertise "streak counters" or "custom categories" — it sells *accountability, consistency, becoming a better version of yourself.*
- Case study (*Adam's cinematic onboarding*): 1. Welcome & social proof ("You've come to the right place") → 2. Core feature demo (animated phone-to-Bluetooth-mic conversion) → 3. Value-add showcase (voice filters the user didn't know they wanted) → 4. In-flow review prompt while engagement is high → 5. Paywall for premium filters and full access.

**Archetype C — Questionnaire / Deep Personalisation** ← **Střední na míru's archetype**
- 15 to 110+ screens covering goals, habits, metrics, lifestyle preferences.
- Concludes with an animated "plan calculation" screen simulating generation of a hyper-personalised experience.
- **Psychological driver: loss aversion + sunk cost.** After 5–10 minutes of answering personal questions, users feel ownership and investment, and convert dramatically better at the paywall.
- Pairs with **hard paywalls** (payment or free-trial opt-in required before access).
- Ideal categories: goal-oriented niches — fitness, calorie tracking, language learning, finance, habit building. *(Education sits squarely here.)*

### 2.2 The onboarding paradox — short vs long

```
┌────────────────────────────────────────────────────────────────────────┐
│                        THE ONBOARDING PARADOX                          │
├───────────────────────────────────┬────────────────────────────────────┤
│ SHORT ONBOARDING                  │ LONG ONBOARDING                    │
│ (Granola, AI Tools, Utilities)    │ (Cal AI, Noom, Prayer Lock)        │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Objective: Minimized time to    │ • Objective: Deep personalization &│
│   value / direct tool utility.    │   qualification of buyer pain.     │
│ • High retention through          │ • High conversion through          │
│   immediate product usage.        │   sunk-cost loss aversion.         │
└───────────────────────────────────┴────────────────────────────────────┘
```

**Benchmark data (study of 1,460+ flows):**
- **Average length: 25 onboarding screens.**
- **Longest onboardings:** Finance, Health & Fitness, and **Education**. 7 of the 10 longest flows in the industry are finance apps.
- **Shortest onboardings:** AI utilities and developer tools.
- **Personalisation rates:** 23% of mobile apps use quiz personalisation in onboarding; only 7% of AI apps do.
- **Platform differences:** **web onboardings are 21% shorter than iOS**, mainly because mobile adds permission prompts and native paywall screens. *(Střední na míru V1 is web — budget accordingly.)*

> **The Core Paradox Rule**
> By default, keep onboarding as short as possible to surface tangible value as fast as possible.
> **Exception:** lengthen only if every added screen buys one of two things:
> 1. **A personalised first-run experience** impossible without collecting that data up front, or
> 2. **A buyer-qualification filter** that weeds out low-intent users while warming high-intent ones.
>
> Apply this test to *every single screen you propose.* A screen that buys neither gets cut.

### 2.3 The narrative architecture — 3 pillars

Mao Baron (creator of **Prayer Lock**, $40,000/month) took free-trial conversion from **3% with a 20-screen flow to 15% with a 10–15 minute narrative flow — a 5× lift.**

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE 3 PILLARS OF ONBOARDING                          │
├───────────────────────┬───────────────────────┬────────────────────────┤
│ PILLAR 1: INTRODUCTION│ PILLAR 2: CLIMAX      │ PILLAR 3: CONCLUSION   │
│ (Hook & Reflection)   │ (Trial & Emotion)     │ (Summary & Paywall)    │
├───────────────────────┼───────────────────────┼────────────────────────┤
│ 1. Frame Problem/Sol  │ 1. Core Feature Trial │ 1. Journey Summary     │
│ 2. Sub-60s Shock Stat │ 2. Review Prompt at   │ 2. Price Reframing     │
│ 3. Self-Articulating  │    Emotional Peak     │ 3. Explicit Commitment │
│    Questions          │                       │ 4. Social Proof &      │
│ 4. Answer Mirroring   │                       │    Paywall             │
└───────────────────────┴───────────────────────┴────────────────────────┘
```

#### PILLAR 1 — Introduction (framing, realisation, reflection)

1. **Frame problem & solution within 3 screens.** Confusion kills conversion.
   - Screen 1: welcome / congratulate.
   - Screen 2 (the problem): *"Do you ever feel like your phone gets more attention than God?"*
   - Screen 3 (the solution): *"Prayer Lock helps you put God first."*
2. **Deliver an "aha realisation" in under 60 seconds.** Ask name, age, average daily screen time → hit them with the shock stat: *"Based on your current usage, you will spend **16 years of your life** staring at your phone screen."* → pivotal reframe: *"Don't worry — we are the solution. Do you have just 5 minutes a day for God? Let's build a plan."* **→ For Střední na míru this tactic is modified by ruling C-3.**
3. **Ask questions to force self-articulation.** Onboarding questions are **not** primarily developer data collection — they force users to reflect and convince *themselves* they need the app. Target pain points (*"What does a thriving faith look like to you?"*).
4. **Reflect answers back to the user.** Mirroring creates perceived hyper-personalisation. If a user selects *"I want to break my social media addiction and build a daily prayer habit,"* the next screen reads: *"We see you want to break social media addiction and build consistency. Here is your customised roadmap."* This makes the user feel heard.

#### PILLAR 2 — Climax (interactive value & emotional peak)

1. **Let the user try the main feature inside the flow.** Before asking for money, deliver a taste of the core value. *Prayer Lock* asks 2 questions then generates an AI prayer live on screen. *Alma* lets users interact with the core AI experience before account creation.
2. **Trigger review prompts at the emotional peak.** Never prompt randomly or at launch — prompt right after an emotional high or gamified accomplishment. *Setup:* after generating the custom prayer, show a gamified streak graphic ("Day 1 Prayer Journey Started!" with fire animation). *Prompt:* fire the native review modal immediately. *Result:* **1 in 8 users leave a review**, building massive social proof (13,000+ reviews) and driving ASO to #1 for core keywords. Non-paying users still contribute distribution power. **→ Web translation in ruling C-4.**

#### PILLAR 3 — Conclusion (summary, re-anchoring, commitment, conversion)

1. **Show a journey summary.** A visual roadmap from where the user is today to their desired state in 30 / 60 / 90 days. Repeat their stated goals back to reinforce value.
2. **Reframe price against everyday real-world expenses.** Anchor against mundane costs — e.g. the cost of **1 cup of coffee per month** versus achieving lifelong peace / health goals.
3. **Demand an explicit commitment.** *"How committed are you to achieving this goal?"* → options *"Extremely Committed" | "Very Committed"*. **95% of users select "Extremely" or "Very."** If they pick lower, route them to custom copy that rebuilds confidence.
4. **Social proof wall → paywall.** Close with a high-density social proof screen (testimonials, star ratings, user counts) immediately followed by the paywall.

### 2.4 Case studies

**Cal AI — $35M/year | $2M/month | $2.50 per download.** A 20+ screen questionnaire engineered for retention and monetisation:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAL AI ONBOARDING FLOW                          │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Core Visual: Show food photo scanner in action                      │
│ 2. Fitness Hook: Workout frequency question                            │
│ 3. Market Research: Source channel & past apps tried                    │
│ 4. Hard Stat: "80% of Cal AI users maintain weight loss after 6 mos"   │
│ 5. Deep Biometrics: Height, weight, age, target weight                 │
│ 6. Affirmation: "Losing 5kg is a realistic target"                     │
│ 7. Transformation Math: "Lose 2x faster with Cal AI vs. alone"         │
│ 8. Honest Expectation: "Weight loss is delayed first 7 days, then      │
│    fat burn accelerates" (Reduces refunds, builds credibility)         │
│ 9. App Setup: Apple Health sync, rollover calories, notifications       │
│10. Performative Calculation: Animated calculation progress wheel        │
│11. Monetization: Hard paywall ($49.99/year subscription)               │
└────────────────────────────────────────────────────────────────────────┘
```

Key lessons:
- **Market research data:** even users who drop at screen 4 have already handed over channel attribution and competitor data.
- **Managing expectations:** stating "initial results may be slow for the first 7 days" drastically reduces chargebacks and refunds while building trust. **This is the single most transferable Cal AI tactic for Střední na míru** — see 2.6 and the flow spec.
- **Performative delays:** the 5-second "generating custom plan" animation raises perceived value by making the AI look busy.

**Prayer Lock (Mao Baron, $40k/month):** old flow 20 screens → **3% free-trial conversion**; new flow 10–15 minute interactive story → **15% conversion (5× lift)**. Key innovation: heavy loss aversion, deep emotional alignment, review modal fired at the day-1 streak milestone.

**Duolingo & BitePal (60+ screen gamified flows):**
- *Duolingo:* **60+ screens before requiring account creation.** Pick language → answer goals → **complete an actual 2-minute interactive lesson** → feel completion dopamine → prompted to create an account to save progress.
- *BitePal:* **61 onboarding screens** animated with an interactive raccoon mascot. Users name their virtual pet, select diet choices, view custom weight-loss curves, and reach a paywall without fatigue thanks to micro-animations and delight.

**Gen Z Bible (Austinine / Ammani)** — streamlined high-energy quiz format: Why use app? → Affirmation ("We care about you") → Reframe ("Not your grandma's Bible") → Emotional vibe check ("Feeling anxious?") → Direct app solution (relevant scripture generated) → Social proof → Review prompt → Paywall.

### 2.5 Advanced UX, psychology & conversion tactics

1. **Humanising the flow.** *One Year* includes a handwritten founder's note with a hand-drawn flower signature. *Basecamp* inserts a welcome message from CEO Jason Fried after account setup. *Airbnb* shows a congratulatory video from CEO Brian Chesky the moment a host lists their first property. *Tinder* acknowledges upcoming birthdays during sign-up.
2. **Multi-intent selection.** Never force one primary goal if the app solves several. **Headspace** allowed picking *multiple* mental-health goals → **10% relative increase in free-trial conversions.**
3. **Conversational copy tweaks.** **Dollar Shave Club** rewrote static survey questions as conversational, informal text → **5% increase in total paid subscriptions.**
4. **Visualising unlocked value.** Show what their answers unlocked *before* asking them to sign up. **Endel** renders an audio frequency wave customised to quiz responses. **Speak** shows a timeline chart: *"In 2 months, you will comfortably speak French while travelling."* **Brilliant** instantly populates the home feed exclusively with modules selected during the survey.
5. **Native permission optimisation (pre-permission screens).** Cold OS dialogs produce high opt-out. Show a custom branded screen *first*. **Brilliant:** *"We'll send daily 2-minute reminders so learning becomes an effortless habit."* **Center:** teases the *exact notification graphic* the user will receive before requesting permission, dramatically boosting accept rates.
6. **Form splitting (micro-steps).** **Haus Real Estate** split a long sign-up form into single-input screens → **15% increase in form completions.**
7. **Paywall delights & urgency mechanics.** **Focus Flight** formats its paywall as an **airline ticket**, with haptic vibration mimicking a ticket printing when the offer appears. **BeSide** pairs quiz completion with a countdown timer for a one-time discount. **Grammarly** recommends specific tiers based on quiz responses → **20% increase in plan upgrades.** **Teemo** embeds a full screen of verified customer reviews directly above the checkout button.
8. **Empty-state checklist nudges.** **Mural** replaced pop-up banners and app tours with a persistent **6-step onboarding checklist** anchored to the bottom of the workspace → **10% relative increase in 1-week retention.** Users love checking off visible progress boxes.

### 2.6 Paywall strategy & trial transparency

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PAYWALL STRATEGY MATRIX                         │
├───────────────────────────┬────────────────────────────────────────────┤
│ HARD PAYWALL              │ SOFT PAYWALL                               │
├───────────────────────────┼────────────────────────────────────────────┤
│ • User CANNOT access app  │ • User CAN access limited features         │
│   without starting trial  │   or dismiss the paywall                   │
│ • Best for: Deep Quiz /   │ • Best for: Single-screen educational      │
│   Personalized flows      │   flows, utilities, open toolboxes         │
│ • High immediate session  │ • Lower immediate conversion, higher       │
│   trial opt-in rate       │   long-term exploration trial opt-in       │
└───────────────────────────┴────────────────────────────────────────────┘
```

**The trial transparency guarantee.** To defuse paywall anxiety, put a prominent timeline callout on the checkout card: *Today* — trial starts, 0 Kč. *Day 6* — push/email reminder sent ("Your trial ends tomorrow"). *Day 7* — billing begins. Promising the reminder removes chargeback fear and significantly boosts initial trial conversion. **Canonical Střední na míru timeline in ruling C-1.**
