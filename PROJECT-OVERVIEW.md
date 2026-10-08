# Střední na míru — Project Overview

## What is it?

**Střední na míru** is a web app (a native mobile app is planned) that helps 9th graders in Prague choose their high school.

Right now, students picking a high school have two bad options:
1. Spend hours digging through dozens of individual school websites
2. Ask ChatGPT random questions with no structure or comparison

Střední na míru fixes this.

## What does the app do?

1. **School Database** — Clean, searchable information about 217 visible catalogue schools (programmes, location and contact, plus Cermat results from 2024–2026 where available). Completeness against the official register and universal three-year coverage have not been established.
2. **Matching** — A questionnaire ranks schools by a deterministic score computed in code; AI-generated explanations are separate from the numeric score. The new on-demand explanation path is under deployment review
3. **Favorites & Comparison** — Save schools and compare them side-by-side

## Who pays?

Both students and parents buy separately — it's not a parent→child funnel.

- **Students** pay for help with a major life decision (similar demographic buys Spotify, Duolingo)
- **Parents** also pay independently, interested in the same matching tool for their child

## Pricing

Two options, both for the Prague high school selection season:

- **Sezónní (Season Pass)** — One-time purchase, fixed window, no auto-renewal (the main option)
- **Měsíční (Monthly)** — Recurring, framed as the trust option for an unfamiliar brand

Prices: Sezónní přístup 690 Kč (3-day free trial, then one charge), Měsíční 249 Kč (charged immediately, no trial). Ordinary accounts currently get a separate 3-day access trial at signup; the founder requires it to start at first confirmed sign-in instead, and that migration is pending. Beta accounts use free, time-limited feedback access; the paywall is only a preview, with no purchase trial or charge.

## How does it make money?

- Subscription fees from students and parents
- Potential school partnerships / sponsored visibility (future)
- Possible influencer affiliate deals via teenage TikTok/Instagram

## Where is this built?

Currently targeting **Prague only** for the first version: 223 school rows, 217 shown (6 merged records), verified by read-only checks on 8 October 2026. Expansion to other Czech cities planned after Prague launches.

## What's the current stage?

The core flows are implemented, with release acceptance still in progress:
- Login and registration (email-based)
- Onboarding flow that guides users through the matching questionnaire
- A multi-screen paywall so students/parents understand what they're buying before payment
- Backend infrastructure with Supabase for authentication and data
- Stripe Checkout and webhooks (real integration, test mode only — no real charges yet)

Next steps: close the no-charge beta gates in `reports/deployment-review-2026-10-07/HANDOFF-PLAN.md`, complete synthetic enrollment/feedback and device/browser acceptance, then invite partner-school testers. See `docs/beta_testing_operations.md` for operations. Real billing also requires the unresolved payment lifecycle, refund, reminder and operator/provider checks in the review and `UNFORGET.md`; switching Stripe keys alone is insufficient.

## Who's building this?

Solo developer (Vojta, based in the Czech Republic; the legal operator in the Terms is an adult, Václav Kadlec). Working part-time alongside school and sports commitments (~2-4 hours/day available).
