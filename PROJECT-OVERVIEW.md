# ŠkolaMatch — Project Overview

## What is it?

**ŠkolaMatch** is a web and mobile app that helps 9th graders in Prague choose their high school.

Right now, students picking a high school have two bad options:
1. Spend hours digging through dozens of individual school websites
2. Ask ChatGPT random questions with no structure or comparison

ŠkolaMatch fixes this.

## What does the app do?

1. **School Database** — Clean, searchable information about ~50-60 Prague high schools (location, programs offered, admission requirements, contact info) all in one place
2. **AI-Powered Matching** — A questionnaire that asks students about their interests, grades, and preferences, then ranks schools by how well they fit
3. **Favorites & Comparison** — Save schools and compare them side-by-side

## Who pays?

Both students and parents buy separately — it's not a parent→child funnel.

- **Students** pay for help with a major life decision (similar demographic buys Spotify, Duolingo)
- **Parents** also pay independently, interested in the same matching tool for their child

## Pricing

Two options, both for the Prague high school selection season:

- **Sezónní (Season Pass)** — One-time purchase, fixed window, no auto-renewal (the main option)
- **Měsíční (Monthly)** — Recurring, framed as the trust option for an unfamiliar brand

There's a 3-day free trial before billing starts.

## How does it make money?

- Subscription fees from students and parents
- Potential school partnerships / sponsored visibility (future)
- Possible influencer affiliate deals via teenage TikTok/Instagram

## Where is this built?

Currently targeting **Prague only** for the first version, with ~50-60 schools. Expansion to other Czech cities planned after Prague launches.

## What's the current stage?

The core app works:
- Login and registration (email-based)
- Onboarding flow that guides users through the matching questionnaire
- A multi-screen paywall so students/parents understand what they're buying before payment
- Backend infrastructure with Supabase for authentication and data
- Stripe payment scaffolding (mocked for now, not real charges yet)

Next steps involve connecting real payment processing and doing beta testing with actual users.

## Who's building this?

Solo developer (Vojta, 25, based in Czech Republic). Working part-time alongside school and sports commitments (~2-4 hours/day available).
