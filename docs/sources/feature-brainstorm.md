# School App — Exhaustive Feature Brainstorm

Every feature idea, organized by category. Rated:
- 🔥 = high value, build early
- ✅ = solid, build eventually
- 🟡 = marginal, only if cheap
- ❌ = probably a bad idea, listed so you know why to skip it

---

## 1. CORE SEARCH & DISCOVERY

| Feature | Rating | Notes |
|---|---|---|
| Text search by school name | 🔥 | Table stakes |
| Filter by city district (Praha 1-10) | 🔥 | Location is the #1 filter parent/student uses |
| Filter by program/obor (IT, gymnázium, gastro...) | 🔥 | Second biggest filter |
| Filter by KKOV code | ✅ | Power users / counselors know these codes |
| Filter by školné (private vs. state vs. church) | 🔥 | Money is a hard constraint for families |
| Filter by ukončení studia (maturita / výuční list) | 🔥 | Fundamental fork in the decision |
| Filter by required entrance exam type | ✅ | JPZ vs. talent exam vs. school-specific |
| Filter by "doporučený prospěch" (recommended GPA) | 🔥 | Lets students self-filter to realistic options |
| Filter by acceptance rate / competitiveness | 🔥 | The data you already have (183/30 = 6:1 ratio) |
| Filter by languages taught | ✅ | AJ/NJ/ŠJ/FJ matters to a lot of families |
| Filter by "has dormitory" (ubytování) | ✅ | Critical for out-of-Prague students |
| Filter by cafeteria/meal cost (stravování) | 🟡 | Nice detail, low decision weight |
| Filter by commute time from your address | 🔥 | Huge. Nobody does this well. Integrate a maps API |
| Filter by public transport accessibility | ✅ | Extension of the above |
| Filter by class size / school size | ✅ | Some parents care a lot |
| Filter by extracurriculars (kroužky) | ✅ | You're already scraping this data |
| Filter by "opens X spots in 2026/27" | ✅ | Capacity data you already have |
| Sort by match score / distance / competitiveness | 🔥 | |
| Map view of all schools | 🔥 | Visual search is way better than a list for location |
| "Schools near me" using geolocation | ✅ | |
| Save search / saved filter presets | ✅ | Retention feature |
| Recently viewed schools | ✅ | Cheap to build, improves UX a lot |
| Random / "surprise me" school discovery | 🟡 | Fun, low value |
| Browse by "similar to school X" | ✅ | Good for exploration once you have enough data |

---

## 2. AI FEATURES (your differentiator)

| Feature | Rating | Notes |
|---|---|---|
| AI questionnaire → ranked school matches | 🔥 | Your core MVP feature |
| **AI priority-order optimizer for DiPSy** | 🔥🔥 | **THE killer feature.** Given 3 chosen schools + your grades + last year's stats, recommend the optimal binding priority order. Nobody does this. |
| "Chance of admission" calculator | 🔥 | Use applicant/accepted ratios + recommended GPA + your grades |
| Reach / Target / Safety school categorization | 🔥 | Borrowed from US college apps. Tells students to diversify their 3 picks |
| AI chat assistant (open-ended Q&A about schools) | ✅ | Post-MVP. Useful but questionnaire is more monetizable |
| AI school comparison ("compare these 3 for me") | ✅ | Generates a narrative comparison instead of a spec table |
| AI-generated "why this school fits you" explanation | 🔥 | Makes match results feel personal, not algorithmic |
| AI essay/motivation letter helper (for talent schools) | ✅ | Some schools require these |
| AI interview prep (for schools with oral exams) | ✅ | |
| AI parent-mode summary ("explain this to my parents") | ✅ | Different framing for different audience — clever |
| AI "what if" simulator (if my grades improve to X...) | ✅ | Motivating + sticky |
| AI weakness detector ("your math is weak for this school") | ✅ | Actionable, drives study-plan upsell |
| AI-generated study plan for JPZ prep | 🔥 | Natural bridge into a paid product |
| Voice-input questionnaire | 🟡 | Novelty, kids might like it, low real value |
| AI chatbot on each school page ("ask about this school") | ✅ | |

---

## 3. CZECH ADMISSIONS PROCESS FEATURES (huge underserved area)

| Feature | Rating | Notes |
|---|---|---|
| Deadline countdown for přihlášky (Feb 1–20) | 🔥 | Creates urgency + brings users back |
| Full admissions timeline / calendar | 🔥 | JPZ dates, results dates, 2nd round dates |
| Push/email reminders before each deadline | 🔥 | Retention gold |
| DiPSy walkthrough guide | 🔥 | Parents are confused by it — pure SEO + trust magnet |
| Checklist of documents needed per school | 🔥 | Doctor's confirmation, portfolios, etc. |
| "What happens if I'm not accepted" guide (odvolání) | ✅ | High-anxiety moment = high engagement |
| 2nd round (druhé kolo) school finder | 🔥 | May 19–25 window. Seasonal traffic spike nobody serves well |
| Talent exam (talentová zkouška) specific track | ✅ | Different rules, different deadlines |
| Historical admission stats per school per year | 🔥 | Trend data = real differentiation vs. competitors |
| JPZ practice tests (Cermat past papers) | 🔥 | Cermat publishes these publicly. Massive traffic driver |
| JPZ score predictor / self-assessment | ✅ | |
| Přihláška form pre-filler / helper | ✅ | Careful — don't compete with DiPSy, complement it |
| Dny otevřených dveří (open house) calendar | 🔥 | You're already scraping this data. Add-to-calendar button |
| Open house RSVP tracking | ✅ | |
| "Schools still accepting applications" live tracker | ✅ | For late/2nd/3rd round panic searchers |

---

## 4. SCHOOL PROFILE PAGE FEATURES

| Feature | Rating | Notes |
|---|---|---|
| Full contact info + director name | 🔥 | Already scraped |
| Interactive map + Street View | ✅ | |
| Commute calculator from user's address | 🔥 | |
| Photo gallery | ✅ | Already scraped |
| Video tours / embedded YouTube | ✅ | Already scraped for some schools |
| Virtual 360° tour | 🟡 | Expensive to produce, schools may supply |
| Program-by-program breakdown with stats | 🔥 | You have this: spots, applicants, required exams, GPA |
| Tuition / fees breakdown | 🔥 | |
| Meal & dormitory cost | ✅ | |
| Languages offered | ✅ | |
| Extracurriculars list | ✅ | |
| "Where graduates go" (VŠ placement rate) | 🔥 | Betlémská said ~80% go to university — powerful signal |
| Maturita pass rate | 🔥 | Hard quality signal |
| Employment outcomes for vocational schools | ✅ | |
| Student/alumni reviews & ratings | 🔥 | Chicken-and-egg problem, but this is what Niche built an empire on |
| Verified vs. unverified reviews | ✅ | Trust layer |
| Q&A section (ask current students) | ✅ | |
| School's own "claimed profile" badge | ✅ | Ties into B2B monetization |
| Notable alumni | 🟡 | |
| School news / announcements feed | 🟡 | Only if schools maintain it |
| Compare button (add to comparison) | 🔥 | |
| Share school link | 🔥 | Free viral distribution |
| Report incorrect data button | ✅ | Crowdsourced data cleaning — solves your data-accuracy problem cheaply |

---

## 5. COMPARISON & DECISION TOOLS

| Feature | Rating | Notes |
|---|---|---|
| Side-by-side comparison (2–4 schools) | 🔥 | |
| Weighted decision matrix (rank your priorities) | 🔥 | Parents love this. Feels "scientific" = justifies paying |
| Pros/cons auto-generated per school | ✅ | |
| Shortlist / favorites | 🔥 | MVP feature |
| Shortlist limit warning ("you can only apply to 3") | 🔥 | Ties to real Czech rules |
| Priority-order drag-and-drop planner | 🔥 | Mirrors the actual DiPSy decision |
| Decision journal / notes per school | ✅ | |
| Share shortlist with parents | 🔥 | Viral loop: student invites parent, parent becomes the payer |
| Print/PDF export of shortlist | ✅ | Parents love PDFs |
| "Risk analysis" of your 3 picks | 🔥 | "All 3 of your picks are reach schools — you have a 12% chance of any acceptance" |

---

## 6. USER ACCOUNT & PERSONALIZATION

| Feature | Rating | Notes |
|---|---|---|
| Email/password signup | 🔥 | Use Supabase Auth |
| Google / Apple / Seznam login | ✅ | Seznam.cz login is very Czech-native |
| Student profile (grades, interests, location) | 🔥 | Powers all matching |
| Grade input (známky per subject) | 🔥 | |
| Parent account linked to student account | 🔥 | Core to your monetization |
| Multiple children per parent account | ✅ | Families with siblings |
| Dashboard with progress/checklist | 🔥 | Niche's dashboard is their retention engine |
| Onboarding wizard | ✅ | |
| Notification preferences | ✅ | |
| Dark mode | 🟡 | Teens like it, zero business impact |
| Language toggle (CZ / EN / UA) | ✅ | Ukrainian-speaking families are a real Czech segment |
| Profile completion % nudge | ✅ | Drives data collection |

---

## 7. MONETIZATION FEATURES

| Feature | Rating | Notes |
|---|---|---|
| Freemium: free search, paid AI match | 🔥 | Standard, works |
| One-time "full report" purchase (~299–499 Kč) | 🔥 | Parents prefer one-time over subscription for a one-year need |
| Monthly subscription | ✅ | Weaker fit — this is a seasonal, one-time-need product |
| Seasonal pass (Sept–Feb, covers the whole application cycle) | 🔥 | **Better model than monthly.** Matches the actual use period |
| Family plan (2+ children discount) | ✅ | |
| Referral discount ("invite a friend, both get 20% off") | 🔥 | Cheap growth |
| Group/classroom discount for 9th grade classes | 🔥 | One teacher buys for 30 students |
| School partnership: claimed profile + analytics | 🔥 | B2B revenue, higher ticket |
| Sponsored/featured school placement | ✅ | Unigo does exactly this. **Must be clearly labeled or you destroy trust** |
| Lead-gen: schools pay for interested-student contacts | ✅ | GDPR-heavy — needs explicit consent, but high revenue potential |
| Affiliate links to JPZ prep books/courses | 🔥 | Zero-inventory revenue, natural fit |
| Affiliate with tutoring services (doučování) | 🔥 | High intent moment: "your math is weak for this school" → tutor offer |
| Paid 1:1 consultation with a counselor | ✅ | Marketplace model, you take a cut |
| Downloadable premium PDF report | ✅ | Feels tangible, easy to sell |
| Gift purchase (grandparents buying for grandkids) | 🟡 | Real but small segment |
| Ads (display) | ❌ | Kills UX, tiny revenue at your scale, and ad-serving to minors is a legal minefield |
| Selling user data | ❌ | Illegal-adjacent with minors under GDPR. Never do this |

---

## 8. GROWTH, VIRALITY & MARKETING FEATURES

| Feature | Rating | Notes |
|---|---|---|
| Influencer affiliate dashboard + tracking codes | 🔥 | Your stated acquisition channel — build the tracking or you're flying blind |
| Unique referral links per user | 🔥 | |
| Shareable "my match results" image (for IG stories) | 🔥 | Teens share results. Free distribution |
| Shareable quiz results ("I'm a 92% match for X") | 🔥 | |
| Public school ranking pages (SEO) | 🔥 | "Nejlepší gymnázia v Praze 2026" — pure organic traffic |
| SEO landing page per school | 🔥 | 214 schools = 214 indexed pages. This is how atlasskolstvi wins today |
| SEO landing page per district | 🔥 | |
| SEO landing page per obor | 🔥 | |
| Blog / guide content | 🔥 | "Jak vybrat střední školu" ranks year-round |
| Email newsletter | ✅ | Deadline reminders = the excuse to email |
| Free tools as lead magnets (chance calculator) | 🔥 | Give away the calculator, charge for the full report |
| Waitlist / early access page | ✅ | Build audience before launch |
| Testimonials from students who got in | ✅ | Social proof, but requires a full cycle to collect |
| TikTok-native short vertical content | ✅ | Your audience literally lives there |
| Streak / gamification for profile completion | 🟡 | Feels gimmicky for a one-time decision |
| Leaderboard | ❌ | Competitive ranking of children = terrible idea, anxiety-inducing |

---

## 9. B2B / SCHOOL-SIDE FEATURES

| Feature | Rating | Notes |
|---|---|---|
| School admin portal (claim & edit your profile) | 🔥 | Solves your data-freshness problem for free |
| School analytics dashboard (views, saves, demographics) | 🔥 | This is what schools will actually pay for |
| Direct messaging: school → interested students | ✅ | GDPR consent required |
| Open house event manager | ✅ | |
| Application funnel insights for schools | ✅ | |
| Competitor benchmarking for schools | ✅ | "You're viewed 30% less than similar schools" — great upsell |
| Verified badge | ✅ | |
| Bulk data upload for school groups | 🟡 | |

---

## 10. COUNSELOR / TEACHER-SIDE FEATURES (underrated segment)

| Feature | Rating | Notes |
|---|---|---|
| Counselor dashboard managing 30 students | 🔥 | One sale = 30 users. Best B2B motion for you |
| Class-wide progress tracking | ✅ | |
| Bulk export of student shortlists | ✅ | |
| Printable worksheets for career-guidance lessons | ✅ | Teachers love ready-made materials |
| Counselor-only comparison tools | 🟡 | |

---

## 11. RETENTION & ENGAGEMENT

| Feature | Rating | Notes |
|---|---|---|
| Push notifications for deadlines | 🔥 | |
| Email drip sequence through application cycle | 🔥 | |
| "Your school added new info" alerts | ✅ | |
| Weekly digest of new open houses | ✅ | |
| Progress checklist with % complete | 🔥 | |
| Re-engagement for 2nd round (May) | 🔥 | Recovers users who weren't accepted |
| Post-decision: "which school did you choose?" survey | ✅ | Feeds your outcome data + testimonials |
| Alumni loop: ask them to review a year later | ✅ | Solves your review cold-start problem over time |

---

## 12. DATA & CONTENT OPERATIONS (for you, not users)

| Feature | Rating | Notes |
|---|---|---|
| Admin dashboard for reviewing scraped data | 🔥 | You'll need this constantly |
| Data freshness indicator per school | 🔥 | "Last updated: March 2026" builds trust |
| Automated re-scrape scheduler | 🔥 | Schools change programs yearly |
| Diff detection ("this school changed its programs") | ✅ | |
| Manual override/edit interface | 🔥 | |
| User-reported error queue | ✅ | |
| Bulk import/export CSV | ✅ | |
| Data source attribution | ✅ | Legally safer, more transparent |

---

## 13. SECURITY, PRIVACY & LEGAL (non-optional — your users are minors)

| Feature | Rating | Notes |
|---|---|---|
| GDPR-compliant consent flow | 🔥 | **Mandatory.** Czech + EU law, users under 18 |
| Parental consent for under-15 accounts | 🔥 | GDPR sets the digital-consent age at 16 by default; CZ has set it lower, but you must handle it correctly. **Get this checked by someone qualified before launch** |
| Data export (right to portability) | 🔥 | Legally required |
| Account deletion (right to erasure) | 🔥 | Legally required |
| Clear privacy policy in Czech | 🔥 | |
| Cookie consent banner | 🔥 | |
| Data minimization (don't collect what you don't need) | 🔥 | Especially grades — sensitive data about minors |
| Encrypted storage of grades/personal data | 🔥 | |
| Row Level Security in Supabase (re-enable before launch!) | 🔥 | **You disabled it for testing. Turn it back on with proper policies** |
| Rate limiting on API | 🔥 | Stops scrapers stealing your database |
| Email verification | ✅ | |
| 2FA | 🟡 | Overkill for a school-search app |
| Content moderation for reviews | 🔥 | Minors writing about named teachers = defamation risk |
| Report/flag abusive content | 🔥 | |
| Age-appropriate design compliance | ✅ | |
| Terms of service | 🔥 | |
| Audit log of admin actions | 🟡 | |

---

## 14. SETTINGS & ACCESSIBILITY

| Feature | Rating | Notes |
|---|---|---|
| Notification granularity | ✅ | |
| Email frequency control | ✅ | |
| Privacy controls (public/private profile) | ✅ | |
| Font size / accessibility mode | ✅ | Legally relevant for public-sector partnerships |
| Screen reader support | ✅ | |
| Keyboard navigation | ✅ | |
| Offline mode / PWA | ✅ | Cheap way to feel like an "app" without app stores |
| Data usage / low-bandwidth mode | 🟡 | |

---

## 15. ANALYTICS (for your own decisions)

| Feature | Rating | Notes |
|---|---|---|
| Funnel tracking (visit → signup → paid) | 🔥 | You cannot optimize what you don't measure |
| Which schools get most views | 🔥 | Tells you where to deepen data + who to pitch B2B |
| Search terms with no results | 🔥 | Reveals data gaps |
| Questionnaire drop-off point tracking | 🔥 | |
| Influencer/referral attribution | 🔥 | Know which influencer actually converts |
| Cohort retention | ✅ | |
| A/B testing framework | ✅ | Later |

---

## 16. FEATURES I'D SKIP (and why)

| Feature | Why skip |
|---|---|
| Social feed / student network | You're not a social app. Massive moderation burden with minors |
| Direct messaging between students | Child-safety nightmare. Do not build this |
| Gamified points/badges/leaderboards | Ranking children by school prestige is toxic and creates anxiety |
| Native mobile apps (iOS/Android) at MVP | Build a responsive PWA first. App store review + two codebases will eat months |
| Full CRM for schools | Scope creep into a different product |
| Expanding to universities (VŠ) at MVP | Different market, different competitors. Win 9th graders first |
| Nationwide coverage at MVP | Prague first. 214 schools is already plenty |
| Display advertising | Bad UX, negligible revenue, legally messy with minors |
| Blockchain/crypto anything | No |
| Your own JPZ test content | Cermat publishes free official papers. Don't rewrite what's free |

---

## RECOMMENDED BUILD ORDER

**Phase 1 — MVP (what you're building now)**
Search + filters, school detail pages, favorites, AI questionnaire, auth.

**Phase 2 — The Differentiator**
Chance calculator, priority-order optimizer, reach/target/safety categorization,
deadline countdown + reminders. *This is what makes you better than the incumbents.*

**Phase 3 — Growth**
SEO landing pages, shareable results, referral system, influencer tracking,
free lead-magnet tools.

**Phase 4 — Revenue**
Paid report/seasonal pass, parent accounts, affiliate integrations, counselor
dashboard, school B2B portal.

**Phase 5 — Moat**
Reviews, historical trend data, outcome tracking, alumni loop.

---

## THE HONEST BOTTOM LINE

You have real competitors (StredniSkoly.com, KamPoMaturite.cz, atlasskolstvi.cz).
They own SEO and have years of data. You will not beat them on breadth of listings.

You beat them on **the decision**, not the directory:
- The DiPSy 3-school priority ordering is a genuine strategic problem with real
  consequences, and nobody solves it well
- Chance-of-admission math using data that's already public but never combined
- Modern mobile UX aimed at 15-year-olds, not at their parents' desktop browsers

If you build "another school directory," you lose. If you build "the tool that tells
you exactly which 3 schools to pick and in what order," you win.
