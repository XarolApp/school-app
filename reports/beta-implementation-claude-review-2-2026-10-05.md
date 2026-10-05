# Plan 019 — second independent review (Claude, 2026-10-05)

Scope: `e679fb1` (fixes for review 1), `3503dee` (full rankings), `174cb21` (/admin),
`135a2c6` (Legal), `c8e632e` (browser QA fixes). Root tests 121/121, frontend lint
0 errors, build passes. Founder applied the whole `supabase-setup.sql` (6 tables +
fixed `beta_closing_deadline` confirmed) and redeployed Railway.

## Review 1 findings — status
All ten are fixed as described. Checked in code, not only in the report:
- 1 notice: ticket only after role + notice (`api.js` `startBetaVisit`), ticket payload
  carries `noticeAccepted`, server + `record_beta_events` reject users without
  `consent_tracking_at`; legacy testers get the notice via `BetaInstructions.jsx:28` →
  `POST /api/beta/profile`.
- 2 deadline: SQL and `lib/betaClosing.js` agree (NULL/past `ends_at` → NULL); bad
  persisted values repaired.
- 3–10: separate limiters, re-claimable micro, one view per pathname (+ pagehide),
  `search` length > 0, 60/min + name cache, same-account requeue, `BETA_TICKET_SECRET`,
  orphan cleanup, 60 s polling.

## New findings (none blocking the beta)

### 1. MEDIUM — `beta_rankings` is never purged
`purge_beta_events()` (`supabase-setup.sql:953`) deletes only `beta_events`. The
privacy text lists "pořadí doporučených škol" among collected data, and plan 019
treats rankings as raw analytics. Fix: in the same function also
`delete from public.beta_rankings` under the same `ends_at + 6 months` condition,
and mention it in the Legal retention sentence.

### 2. LOW-MEDIUM — Matching stats weight runs, not testers
`lib/betaAdmin.js:41` `rankingStats` averages every stored ranking. A tester who
redoes the onboarding quiz (up to 5 staged per 24 h) or the questionnaire 10× counts
10×, so one enthusiastic tester can move a school's mean rank. Fix: use the latest
ranking per `(user_id, source)` (or average per user first), show `n` = testers.

### 3. LOW — Empty searches still logged
`frontend/src/pages/Search.jsx:586-592` emits `search {length:0}` on every `/skoly`
mount and filter change, and `search_zero` for filter-only zero results. The
checklist is safe now, but Behaviour counts are inflated. Fix: track only when
`filters.query.trim()` is non-empty.

### Note — operations
`closing_due_at` is persisted once computed; moving `ends_at` later does not move
already-persisted deadlines. Set `ends_at` once, before invites go out.

## Still unverified (live only)
Real signup with role/notice metadata, signed screenshot upload/read in Storage,
`/admin` with production `ADMIN_EMAILS`, grants and the private bucket (run the
grants + bucket queries from `beta-implementation-completion-2026-10-05.md` §6).
