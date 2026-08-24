# CLAUDE CODE UI/UX & MONETIZATION GUIDE: ŠKOLAMATCH

> **META-DIRECTIVE FOR CLAUDE CODE:**
> You are an autonomous AI product architect. Do NOT follow the rules in this document as rigid, static checklists. Instead, treat them as **underlying psychological facts, empirical research, and cognitive principles** derived from analysis of high-performing consumer applications and behavioral science studies. 
> Your goal is to evaluate the specific context of **ŠkolaMatch**—a high-trust Czech high school finder for 15-year-olds and their parents—and apply these psychological mechanics dynamically to make the best possible design, onboarding, paywall, and UX decisions.

---

## 1. COMPREHENSIVE VIDEO-BY-VIDEO PSYCHOLOGICAL & UI/UX ANALYSIS

### Video 1: "The Secret Behind Weirdly Addictive Apps" (Tim Gabe)
* **The Variable Reward Mechanism (Dopamine Loops):** Human brains release dopamine not upon receiving a reward, but in *anticipation* of an uncertain reward (B.F. Skinner / Robert Sapolsky research). Fixed rewards lead to rapid habituation, whereas variable rewards maintain high engagement.
* **The Endowed Progress Effect:** Nunes & Drèze (2006) demonstrated that giving users artificial advancement toward a goal dramatically increases completion rates (e.g., 2 free stamps on a 10-stamp card vs 0 stamps on an 8-stamp card doubled completion rate from 19% to 34%). 
* **The Goal Gradient Effect:** Motivation increases exponentially as the user perceives themselves getting closer to the finish line (Hull, 1932). Visual progress indicators must accelerate visually near completion.
* **Smart Defaults & Decision Fatigue:** The human brain consumes ~20% of body energy; every choice creates cognitive friction (I样本/Baumeister). Auto-selecting the most common/optimal choice reduces drop-off significantly.
* **Application to ŠkolaMatch:**
  * In the school quiz, pre-fill progress bars (e.g., "Step 1/10: 15% Complete!" right at launch).
  * Show dynamic match percentage updates as questions are answered to trigger anticipation.

---

### Video 2: "The Twisted Psychology Behind Top 1% Apps" (Tim Gabe)
* **The IKEA Effect (Norton, Mochon, Ariely, 2012):** Users place disproportionately high value on products they helped create or customize. Choosing themes, app icons, accent colors, or setting custom preferences creates psychological ownership.
* **Loss Aversion (Kahneman & Tversky):** The psychological pain of losing something is ~2.1x stronger than the pleasure of gaining it. Framing features as things the user already possesses (and will lose if they abandon/cancel) maximizes conversion.
* **Status Signaling & Identity:** Software as identity projection. Users share and engage with tools that reinforce their desired self-image or provide social capital.
* **Application to ŠkolaMatch:**
  * Allow teenagers to customize their dashboard theme (Light, Dark, High-contrast, custom accent color) and favorite list layout.
  * Frame saved school matches and notes as assets created by the user: "You've saved 5 high schools—don't lose your personalized analysis."

---

### Video 3: "The UX Psychology Behind Apps People Can’t Stop Using" (UX Peak)
* **Norman's 3 Levels of Emotional Design (Don Norman):**
  1. *Visceral:* Automatic, subconscious visual and tactile aesthetic appeal (smooth animations, modern typography, crisp contrast).
  2. *Behavioral:* Usability, performance, efficiency, and feedback clarity.
  3. *Reflective:* Self-identity, pride, memory, and long-term rational satisfaction.
* **Micro-Interactions & Haptic/Visual Feedback:** Subtle animations (confetti on quiz completion, smooth slider transitions, tactile hover states) trigger positive micro-dopamine releases and confirm system responsiveness.
* **Cognitive Load Reduction:** Miller's Law (7±2 items) and Hick's Law (time to decide increases logarithmically with the number of options).
* **Application to ŠkolaMatch:**
  * Never present 60 schools in a massive, unformatted list. Chunk search parameters into intuitive filters (District, Specialization, Travel distance).
  * Smooth animations on quiz option selection to heighten Visceral delight.

---

### Video 4: "I Studied 1,460 Onboarding Flows. Here's What I Found." (Mobbin)
* **Single-Question Screen Pattern:** Displaying one question per screen increases quiz completion rates by up to 40% compared to long vertical forms by preventing visual overwhelm and decision paralysis.
* **Dynamic Calculation & "AI Processing" Screens:** Injecting a deliberate 2–4 second loading screen ("Analyzing 60 Prague high schools...", "Calculating distance matrices...", "Generating personalized explanations...") leverages the *Labor Illusion* (Buell & Norton). Users rate outputs as significantly higher quality when they observe perceived work being performed.
* **Contextual Permission & Commitment Requests:** Ask for inputs (e.g., location/district preference) only after explaining the direct benefit to the user.
* **Application to ŠkolaMatch:**
  * Quiz flow: 1 question per screen with clear progress feedback.
  * Before showing results, insert an animated calculation screen: "Scoring compatibility with Prague high schools..."

---

### Video 5: "I Studied 10,000 Paywall Screens (THIS Makes People Pay)" (Tim Gabe)
* **Empirical Subscription Plan Performance:** Analyzing 10,000 paywalls reveals that **Weekly plans frequently convert at the highest rate for short-term/seasonal needs**, while **Annual/Monthly plans build long-term value**. 
* **Micro-Copy Pricing Framing:** Breaking prices down to daily micro-costs (e.g., "only 6.60 CZK / day" or "less than the price of a coffee per week") drastically lowers price sensitivity via anchoring bias.
* **Trial Toggle & Timeline Visuals:** Paywalls featuring an explicit 7-day timeline graphic showing:
  * *Today:* Free Access Starts
  * *Day 5:* Reminder Email Sent
  * *Day 7:* Billing Begins
  ...reduce chargeback rates and increase free trial opt-ins by establishing extreme transparency and trust.
* **Outcome-Based Feature Bullets:** Instead of technical features ("PostgreSQL search"), list emotional/functional outcomes ("Find the 3 high schools where you actually fit").
* **Application to ŠkolaMatch:**
  * Paywall presentation: Show a clear 7-day trial timeline in Czech (*Dnes: Začátek vyzkoušení zdarma*, *5. den: Připomenutí*, *7. den: První platba*).
  * Frame cost as `~6.60 Kč / den` (less than a single roll or snack).

---

### Video 6: "We Studied 2,995 Paywalls. Here’s What Actually Converts." (Mobbin)
* **The Pre-Selected Default Strategy:** Pre-selecting the highest-value option increases average order value (AOV) without decreasing conversion volume.
* **Social Proof & High-Trust Anchors:** Placing real user testimonials, star ratings, or security badges (e.g., "Secured with Stripe", "Over 1,000 Czech students helped") immediately adjacent to the CTA button increases conversion by mitigating payment anxiety.
* **Contextual Paywall Placement:** Triggering paywalls immediately after a high-value moment (e.g., right after completing the high school match questionnaire) yields 3–5x higher conversion than walling off the app at initial launch.
* **Application to ŠkolaMatch:**
  * Show paywall right when the user completes the questionnaire to unlock their personalized rankings and detailed AI explanations.
  * Display high-trust parent/teenager badges and clear Stripe billing guarantees.

---

### Video 7: "The Weird Design Playbook of 6 App Outliers" (Tim Gabe)
* **Pattern 1: Niche Depth (Case Study: Teemo):** Standard category incumbents rely on traditional UI primitives (e.g., list view text rows for productivity). Teemo won App of the Year by completely redesigning the interface for neurodivergent/ADHD users using visual colored time-blocks instead of text rows. **Takeaway:** Do not copy category incumbents (`atlasskolstvi.cz`); invent interface primitives tailored specifically to teenagers' visual parsing habits (slang search like `gympl`, badge filters, visual match scores).
* **Pattern 2: Tech Primitives First (Case Study: Cal AI):** Instead of bolting new tech onto old interfaces (e.g., adding a search bar inside a menu), Cal AI built the entire interface around AI Vision ("Camera as Homepage"). **Takeaway:** For ŠkolaMatch, AI is not a gimmick bolted on; the Questionnaire + Math Engine + Claude Explanations is the primary intake primitive.
* **Pattern 3: Zero-Shame Emotion Design (Case Study: MacroFactor):** Fitness apps historically relied on guilt, broken streaks, and red warnings. MacroFactor achieved 500,000 paid users by removing all guilt/shame mechanisms and focusing on neutral, objective, trend-smoothed data. **Takeaway:** School selection is stressful for 15-year-olds and parents. Never shame a student for low scores or skipped questions. Blank answers never penalize scores; explanations remain encouraging and objective.
* **Pattern 4: Synchronized Rituals (Case Study: Ladder):** Converting solitary tasks into shared cohort experiences. **Takeaway:** Enable teenagers to export/share their top school matches with their parents or classmates with one click.

---

## 2. ADAPTATION MATRIX FOR ŠKOLAMATCH

| Category Principle | Standard Long-Term App | ŠkolaMatch Seasonal Adaptation |
| :--- | :--- | :--- |
| **Retention Loop** | Multi-year daily streaks | Seasonal milestone loop (Sept–March high school application window, *Dny otevřených dveří* tracking, DiPSy priority ordering) |
| **Payer Target** | End-user is buyer | Dual-Persona: Teenager experiences the smooth UI; Parent pays for peace of mind |
| **Paywall Framing** | "Unlimited Annual Access" | "Complete High School Season Pass / Monthly Trial" + Czech CZK daily breakdown (`~6,60 Kč / den`) |
| **Trust Engine** | Push notifications | High transparency: Stripe security badges, clear trial cancellation terms, deterministic math scoring |

---

## 3. DEVELOPER & CLAUDE CODE IMPLEMENTATION CHECKLIST

- [ ] **Quiz Interface:** Implement 1-question-per-screen layout with an endowed progress bar starting at ~10-15%.
- [ ] **Labor Illusion Screen:** Include a 3-second animated state ("Analýza pražských středních škol...") prior to displaying results.
- [ ] **Theme & Customization (IKEA Effect):** Provide Light/Dark theme toggle and customizable bookmark lists.
- [ ] **Deterministic Scoring Engine:** Ensure percentage rankings are 100% mathematical, while Claude generates the Czech explanation sentences.
- [ ] **High-Trust Paywall:** Render a visual 7-day timeline graphic, Stripe compliance text, and daily price breakdowns.
- [ ] **Zero-Shame UX:** Handle skipped questionnaire choices without score penalties.