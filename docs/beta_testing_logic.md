# Beta Testing Program — Logic Spec (for implementation)

**Status:** design only, nothing here is implemented yet. Handed to whichever
AI/session builds it — do not skip straight to code without reading this in full.

**Context:** first beta school confirmed interest (2026-09-22). User has ~7 days
to have this working. Multiple schools will receive links and reshare them to
students. Goal: get real usage + real feedback from students, not free
unlimited access with no feedback loop.

---

## 1. Distribution & signup flow

- Each participating school gets **one unique magic link**, built from a short
  code (e.g. `GYMJECNA`). Store codes in a new table, `beta_schools`
  (`code`, `school_name`, `created_at`) — free-text name is fine, no need to
  join to the real `schools` table.
- Link shape: `https://<domain>/beta/:code` — a new route, separate from
  `/registrace` and the onboarding flow.
- Landing page at that route: short intro + "Sign up to start testing" CTA.
  The code travels with the user into signup (query param → sessionStorage,
  same pattern already used for `pendingOnboardingAnswers.js`).
- Signup itself is a **real individual account** (reuse existing
  Supabase Auth signup — email confirmation can likely be skipped/relaxed for
  testers, since the goal is frictionless access, not identity verification —
  flag this as a decision for the user if it conflicts with existing
  `requireAuth` behavior).
- On successful signup, the account is marked as a tester and tagged with the
  school code it came from (see data model below). This is what lets feedback
  be attributed back to a school.

## 2. Tester accounts vs normal accounts

- Testers must **never** hit real Stripe / the real paywall. Add an
  `is_tester` flag (or a new `subscription_status` value, e.g. `'tester'` —
  matches the existing enum pattern in `supabase-setup.sql`) so `hasAccess()`
  and `requireAccess` grant access without any Stripe involvement.
- Anywhere the paywall screens (`Hodnota`/`Cesta`/`Plan`/`Zkusebni`/`Platba`)
  would normally appear, a tester should instead see a short "you're in the
  beta program, no payment needed" state — they should still be able to see
  those screens exist (it's part of what you want tested!) but the actual
  checkout action must be disabled/mocked for testers.

## 3. Access control: time-box + feedback-gated renewal

Chosen logic (confirmed): **time-boxed access that only renews when feedback
is submitted, and each submission extends the clock again** (repeatable, not
one-time).

- On tester account creation: `tester_access_until = now() + 48h`.
- Server-side access check (wherever `requireAccess` currently runs) adds one
  more condition for testers: `is_tester AND tester_access_until > now()`.
  If expired, respond the same way an expired trial does today (redirect to
  a tester-specific version of `SubscriptionExpired.jsx` — different copy,
  since there's nothing to buy: "Your testing access paused — leave feedback
  to keep testing").
- **Every accepted in-app feedback submission resets
  `tester_access_until = now() + 48h`** (not additive/stacking — always a
  fresh 48h from the moment of submission). This must happen server-side, in
  the same endpoint that writes the feedback row, so it can't be spoofed from
  the client.
- The whole beta program also has a **hard end date**
  (`BETA_PROGRAM_ENDS_AT`, a config constant). Once passed, all tester access
  locks regardless of feedback history — the renewal loop is bounded, it
  doesn't let testing run forever by accident.
- 48h is a starting number, not fixed — pick something that gives ~2-3 renewal
  cycles inside the real testing window and adjust if the school's timeline
  needs it.

## 4. Feedback collection — two channels (confirmed: both)

### In-app (primary — this is what extends access)
- A floating feedback button, visible only when `is_tester` is true.
- Opens a small form: type (`bug` / `idea` / `comment`), free-text message,
  auto-captured `page_url` (from `window.location.pathname`) so you know what
  they were looking at without asking them.
- Screenshot attachment is a nice-to-have, not required for v1.
- New table `beta_feedback`: `id, user_id, school_code, type, page_url,
  message, created_at`.
- Endpoint (e.g. `POST /api/beta/feedback`) does two things in one
  transaction: inserts the row, and resets `tester_access_until` per §3.
  This is the **only** thing that renews access.

### External form (secondary — does not renew access)
- A separate form (Google Form or similar) linked from the feedback widget
  ("something longer to say? open the full form") and/or referenced in the
  first-login guidance, for slower structured questions: would-you-pay, NPS,
  what's confusing, etc.
- Since it's disconnected from the backend, it **cannot** gate/renew access
  without extra webhook plumbing that isn't worth building in 7 days — call
  this out explicitly rather than silently skipping it. If per-student
  join-back matters later, prefill the form via a URL param
  (`?entry.xxx=<user_id>` or `<school_code>`, which Google Forms supports)
  so responses can be matched manually afterward.

## 5. First-login guidance (confirmed: in-app, first login only)

- A one-time screen/modal shown right after a tester's first login, gated by
  a `tester_guidance_seen_at` timestamp on the account (set once shown).
- Content, kept short:
  1. What to try — 3-5 concrete flows (run the quiz, open a school detail
     page, try the paywall screens without needing to pay, leave a review).
  2. How to report — points at the feedback button, explains it's the fast
     path.
  3. The trust/incentive message — "your access renews automatically every
     time you give feedback," so they understand *why* the account might
     lock and how to unlock it again.
- Should reuse the existing onboarding visual language/components rather than
  inventing new UI — the implementing session should check
  `docs/sources/claude_code_ui_ux_guide.md` and `design/DESIGN.md` first, per
  standing project convention.

## 6. Data model summary (net-new)

| Table / column | Purpose |
|---|---|
| `beta_schools` (`code`, `school_name`, `created_at`) | one row per participating school, resolves the magic-link code |
| `users.is_tester` (bool) or `subscription_status = 'tester'` | marks a tester account, bypasses Stripe/paywall |
| `users.tester_school_code` | which school this student came from |
| `users.tester_access_until` (timestamptz) | rolling access deadline, reset on feedback |
| `users.tester_guidance_seen_at` (timestamptz, nullable) | gates the first-login guidance screen to once |
| `beta_feedback` (`id, user_id, school_code, type, page_url, message, created_at`) | in-app feedback log; the only writer that resets `tester_access_until` |
| `BETA_PROGRAM_ENDS_AT` (config constant, like `pricing.js`) | hard cutoff for the whole program regardless of feedback |

## 7. Edge cases / open questions for the implementer

- **Link leakage:** a school could reshare the code beyond its own students.
  Accepted risk at this scale — the code is not meant to be a hard security
  boundary, just an attribution tag.
- **Mid-session expiry:** if `tester_access_until` lapses while a student is
  actively using the app, they should hit the same kind of redirect the real
  expired-trial flow uses today (`ProtectedRoute` → tester-specific expired
  page), not a broken/half-loaded screen.
- **Duplicate signups:** no special tester handling needed — the existing
  duplicate-account detection (per `CLAUDE.md`, "Duplicate signups are
  surfaced, not hidden") applies as-is.
- **Email confirmation for testers:** flagged above in §1 as a decision the
  user should confirm explicitly before building — relaxing it speeds up
  onboarding but changes an existing security assumption (`requireAuth`
  currently rejects unconfirmed emails everywhere).
- **Never let a tester reach a real Stripe charge.** This is the one hard
  rule — verify it explicitly once built, not just assumed from the flag.

## 8. Explicitly out of scope for v1

- Screenshot uploads on feedback.
- Any reward/incentive system for students who give feedback.
- Automatic join-back from the external form into the app's database.
- Per-student analytics dashboards — school-level and per-user querying
  directly in Supabase is enough for a 7-day beta.
