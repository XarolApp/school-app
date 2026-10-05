# Plan 019 steps 2–9 — independent review (Claude, 2026-10-05)

Scope: commits `c378a06` … `02067ad` as listed in `reports/beta-implementation-review-2026-10-05.md`.
Method: read the SQL block, the new server routes, `lib/betaAnalytics.js`, `lib/betaClosing.js`, the tracker and the beta UI components; ran root tests (97/97 pass), frontend lint (0 errors) and build (passes, html2canvas in its own 199 kB chunk). **Not done:** running the SQL in PostgreSQL, a real tester signup, Storage upload, browser pass. Those remain open (step 12).

Founder decision recorded the same day: **Matching uses full rankings** (plan 019 §6, commit `a039c63`). It is a plan change, not a reinterpretation: the shipped `result_view` (top 10 only, `api.js:66`, `Reveal.jsx:119`) cannot produce mean rank or a simulation comparison.

## Findings (most severe first)

### 1. HIGH — Tracking starts before the beta notice is accepted
- `frontend/src/api.js:86-88`: the invite lookup calls `betaTracker.startVisit()` and `acceptTicket()` as soon as `/beta/:code` loads, before the role/notice step in `BetaEnrollment`. Every visitor who merely opens an invite link is tracked.
- `supabase-setup.sql:895-897` backfills existing testers with `consent_tracking_at = null`, and neither `record_beta_events` (`supabase-setup.sql:961`) nor `POST /api/beta/events` (`server.js:519`) checks it, so legacy testers are tracked before they see the notice.
- Impact: contradicts plan §3 ("clear notice before tracking") — the legal basis we chose (legitimate interest) depends on that notice, and many testers are under 15.
- Fix: accept the ticket only after the notice is acknowledged (store it with the enrollment state); in `record_beta_events`, skip/raise for a user whose `beta_profile.consent_tracking_at` is null; drop queued events client-side until then.

### 2. MEDIUM — `beta_closing_deadline()` treats a missing program end as "due at signup"
- `supabase-setup.sql:1053`: `least(greatest(u.created_at, s.ends_at - interval '2 days'), …)`. With `ends_at` NULL, `greatest` ignores the NULL and returns `created_at`, so the deadline is the signup time.
- `sync_beta_closing` (called on every `/api/me`, `/api/beta/me` and `requireAccess`) then **persists** `closing_due_at = created_at` for legacy testers while the program is still unconfigured. Once the founder sets `ends_at`, those testers are immediately paused for the closing questionnaire.
- The JS reference `lib/betaClosing.js` returns null when `ends_at` is not finite, so the tested helper and the SQL disagree — tests pass while SQL is wrong.
- Fix: return NULL when `s.ends_at is null` (and when `ends_at <= now()`), mirroring the JS; add a SQL-level check in step 12.

### 3. MEDIUM — One shared 10-per-hour limit covers every beta write
- `server.js:238-245` `betaFeedbackLimiter` (10/hour per user) is used by feedback, screenshot-url, micro ask, micro answer/skip, gate and closing.
- A feedback with a screenshot costs 2; a micro question costs 2 (ask + answer). A tester who sends 4 screenshot reports and answers one micro question in an hour gets 429 on the closing questionnaire or the soft gate — exactly when we need them to finish.
- Fix: separate limiters (e.g. feedback 20/h, screenshot-url 20/h, micro 20/h, gate/closing 10/h), and do not count micro `ask`.

### 4. MEDIUM — A claimed micro question is lost on reload
- `supabase-setup.sql:1025-1033`: `ask` stores `{session_id, done:false}`; answer/skip must come from the same `session_id`. `BetaMicroQuestions.jsx` claims the question as soon as the checklist flag appears. If the tab is reloaded or closed before answering, the next session cannot answer it and `ask` is rejected (`state ? p_id`), so that question is gone for good. With only 6 questions, losing them silently costs real data.
- Fix: allow re-claim when the stored entry is `done:false` and from a different session (or older than N minutes).

### 5. MEDIUM — Duplicate page_view / page_leave events
- `frontend/src/components/BetaTracking.jsx:47`: the page effect depends on `loading, profileLoading, isTester, user?.id, revision, location.state` as well as the path. Profile refreshes (BetaTools refreshes every 15 s via `/api/beta/me`, plus `refreshProfile` after every feedback) and ticket acceptance re-run it, logging an extra `page_leave` + `page_view` (+ `school_open`, `compare_open`, `search`) for the same page. Time-on-page and page counts in `/admin` will be inflated.
- Fix: key the effect on `location.pathname` only and gate it with a ref of `betaTracker.active()`; emit `school_open`/`compare_open` once per navigation.

### 6. MEDIUM — Visiting /skoly ticks "vyhledávání"
- `BetaTracking.jsx` emits `track('search', { length: 0 })` on every `/skoly` page view, and `record_beta_events` maps any `search` event to the checklist item. The checklist and the closing-questionnaire trigger count a search the tester never made.
- Fix: map only `search` with `length > 0`, or emit `search` only from Search.jsx on a real query.

### 7. LOW-MEDIUM — Anonymous event endpoint is generous
- `server.js:490` `betaEventsLimiter`: 1,200 requests/min per IP × 40 events = up to 48,000 rows/min from anyone holding an invite link. Lower to ~60/min and cap anonymous batches.
- `server.js:548`: every batch containing a query re-reads all school names; cache them in memory (they change once a year).

### 8. LOW — Tracking queue can re-attribute events after an account switch
- `frontend/src/lib/betaTrack.js:40`: a failed flush re-queues its events if the tracker is still `active()`, even if the account changed while the request was in flight; they are then sent with the new user's token. Re-queue only when `account.userId` is unchanged.

### 9. LOW — HMAC ticket is signed with the Supabase service-role key
- `server.js:485` `visitorTicket(SERVICE_KEY, …)`. Key reuse across purposes; use a dedicated `BETA_TICKET_SECRET` (fallback to the service key only in development).

### 10. LOW — Screenshot orphans and noise
- An upload whose feedback then fails (or is cancelled) stays in `beta-screenshots` forever; add cleanup to `purge_beta_events()` or a periodic job for objects not referenced by `beta_feedback.screenshot_path`.
- `/api/beta/me` is polled every 15 s and each call performs an UPDATE (`sync_beta_closing`); fine at 170 testers, but 60 s would do.

## Checked and OK
- Allowlisted event names, per-event keys, 2 KB cap, token-route redaction, e-mail/digit stripping in `sanitizeEvent`; every allowlisted event is actually emitted somewhere.
- Normal accounts: server rejects them (`server.js:534`), the tracker clears beta state for them.
- New tables have RLS and no browser policies; all new functions are `security definer` with `search_path` set, revoked from `anon`/`authenticated`, granted to `service_role`. Lock order users → profile is consistent across feedback, micro, events and closing.
- Feedback screenshot path is bound to the owner and checked in Storage (size/MIME) before the RPC; html2canvas is dynamically imported only for marked capture.
- Testers: Platba shows the beta preview instead of checkout; existing Stripe boundary tests pass.
- Closing payload validation is strict and review labels/age group are derived server-side; reviews are never public.

## Still unverified (step 12)
SQL execution and re-running the whole file, a fresh tester signup with the new trigger metadata, signed Storage upload/read, the full student/parent flows at 390 px and desktop, and `/admin`.
