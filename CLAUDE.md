# School Selection App — Project Context

## The Problem This Solves

In the Czech Republic, when 9th graders need to pick a high school (*střední škola*),
there's no single good place to research options. The one directory site that lists
all schools (atlasskolstvi.cz) is old and clunky, and doesn't help students figure out
which school actually fits them. Students end up manually digging through dozens of
individual school websites, or asking ChatGPT one-off questions with no real structure.

## The Product

An app + website that:
1. Provides a clean, searchable database of high schools — location, programs,
   admission requirements, contact info — all in one place
2. Offers an AI-powered questionnaire — student answers questions about interests,
   grades, and preferences, app suggests best-fit schools, ranked by match
3. Lets students save favorites and compare schools

## Monetization Plan

- Students/parents pay for premium features (parents already pay for similar basic
  questionnaires elsewhere — proven willingness to pay)
- Schools may pay for visibility/partnerships once the platform has real users
- Promotion via teenage TikTok/Instagram influencers (affiliate model)

## Current Tech Stack

- **Backend:** Node.js + Express (`server.js`)
- **Database:** Supabase (PostgreSQL)
- **Frontend:** React (not built yet)
- **AI:** Claude API (planned for the questionnaire matching logic)
- **Scraping:** n8n + Firecrawl + Gemini 2.5 Flash Lite (for extracting structured
  data from scraped pages)

## Supabase Schema

Table: `schools`
| Column | Type |
|---|---|
| id | int8 (primary) |
| created_at | timestamptz |
| name | text |
| location | text |
| programs | text |
| contact | text |
| website | text |

RLS is currently **disabled** for development/testing.

## What's Already Built

1. **Backend server** (`server.js`) — Express server running locally on port 5000,
   connected to Supabase via `.env` credentials (`SUPABASE_URL`, `SUPABASE_KEY`, `PORT`)
   - `GET /` — health check
   - `GET /test-db` — confirms Supabase connection, queries `schools` table

2. **n8n scraping workflow** (separate from this codebase, runs independently):
   - Scrapes atlasskolstvi.cz directory (Prague region, pages 1-3) via Firecrawl
   - AI extraction (Gemini 2.5 Flash Lite) pulls `{name, url}` pairs from each page
   - Aggregates + splits into ~60 individual school items
   - Loops through each school's individual profile page, scrapes it via Firecrawl
   - AI extraction pulls structured `{name, location, programs, contact, website}`
   - Validates required fields (name, location not empty)
   - Inserts into Supabase `schools` table
   - Logs result (Success/Needs Review) to a Google Sheet for tracking

3. **GitHub repo:** `school-app` under account `XarolApp`

## What's Already Built (Continued)

4. **React frontend** (`frontend/`) — Built with Vite + React Router
   - Pages: Home, Search, School Detail, Sign Up
   - Navigation bar on all pages
   - Layout component wrapping all pages
   - Basic styling (colors, buttons, forms)
   - API helper to fetch from backend
   - Error handling (gracefully shows "Failed to fetch" when backend unavailable)
   - Verified working on localhost:5173

5. **Backend API endpoints** (updated `server.js`)
   - `GET /api/schools` — returns all schools
   - `GET /api/schools/:id` — returns one school by ID

## What's NOT Built Yet (MVP Scope)

Estimated ~45 hours remaining, in priority order:

1. **Modern design system** — upgrade frontend styling (colors, fonts, spacing) so all new pages look polished automatically (~2h)
2. **Set up backend to run** — add package.json, node_modules, get server.js working on port 5000 (~1h)
3. **Connect frontend to backend** — test data flow from Supabase → backend → frontend (~2h)
4. **Search & Filter enhancement** — currently basic, make it better (~8h)
5. **School Detail Pages** — currently skeleton, add full info display (~12h)
6. **Sign Up & Login** — wire to Supabase Auth (~10h)
7. **AI Questionnaire** — 10 questions → Claude API matches student to best-fit schools (~10h) — build this LAST

Explicitly OUT of MVP scope (post-launch): Reviews/ratings, open-ended AI chat
assistant, mobile app (React Native).

## Working Constraints

- Solo developer — no budget to hire, doesn't want collaborators right now
- Limited daily hours (school + gym + soccer training take up most of the day,
  roughly 2-4 hours/day available for this project)
- Prefers building and testing one feature at a time rather than large untested
  batches of code
- Wants direct, honest technical feedback — flag bad approaches immediately,
  suggest better alternatives rather than being diplomatically vague

## Geographic Scope for V1

Prague only, targeting ~50-60 schools initially. Expansion to other Czech cities
planned for later phases once the Prague version is validated with real users.
