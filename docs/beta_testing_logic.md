# Beta testing program — current logic

**Updated 10 October 2026.** Beta is free in exchange for feedback. It uses
`users.subscription_status = 'beta'`; testers never enter real Stripe Checkout,
start a purchase trial or pay to regain access. Paywall screens are an optional
feedback preview. The ordinary-account trial and seasonal purchase trial are
separate systems.

A read-only hosted check at 01:18 Europe/Prague confirms a 48-hour rolling window,
cutoff `2026-10-18T21:59:00Z` (18 October at 23:59 Prague time), one cohort code
matching `PRISTUPTESTOVACIVERZE`, and exposed `beta_profile.role_note` and
`consent_tracking_at` columns. No external feedback URL is configured. This
supersedes the 7 October test-cutoff/TEST-only/missing-role-note diagnosis.
[Evidence](../reports/deployment-review-2026-10-07/beta-cohort-schema-2026-10-10.json).
Configuration and column presence do not prove deployed environment variables,
function bodies/grants, policies, email delivery or a complete tester journey.

The September v1 design is retained in plan 016/history. Plans 019/020 and the
current source expanded feedback, screenshots, analytics, guidance and closing
flows. The original v1 out-of-scope list is no longer a current limitation.
Use this document with the [operator runbook](beta_testing_operations.md),
[deployment report](../reports/deployment-review-2026-10-07/REPORT.md) and
[handoff plan](../reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).

## 1. Distribution, enrollment and confirmation

- The current cohort uses one shared tester-facing code, with an uppercase
  `beta_schools.code` row for validation and internal school attribution. It does
  not assign a different invitation code to each tester.
- The beta landing is `/beta/:code`. Signup creates an individual Supabase Auth
  account, and valid beta metadata is checked by the server/database trigger.
- Email confirmation remains required. Neither an invitation code nor an
  unconfirmed session is sufficient for authenticated tester access.
- The production frontend also has a shared-code distribution gate. It is not
  API authorization: the public frontend cohort code is bundled, and direct
  backend requests must still enforce their own access rules. See the runbook
  for the code-entry and confirmation-link return behavior.
- New testers enter the questionnaire first. The profile/enrollment flow asks
  for a test role and currently requires tracking consent; existing testers
  can be asked to complete the current notice in-app. Mandatory versus optional
  observation, withdrawal/version/revocation and child/guardian evidence remain
  privacy release decisions, not resolved by a checkbox alone.

## 2. Free tester access and preview payments

Tester access uses beta-specific deadlines and closing state, not paid-plan
fields. Payment endpoints must reject beta identities; frontend preview actions
complete locally without Stripe. Merely viewing a preview must not renew access.

The seasonal paid plan has a three-day deferred-charge trial and monthly charges
at checkout. Those real billing flows require separate acceptance before paid
launch. The founder also requires the ordinary account’s access trial to begin at
first confirmed sign-in; that migration is still pending and must preserve beta,
paid and developer accounts.

## 3. Rolling window and program cutoff

The signup trigger creates a beta rolling deadline of approximately 48 hours
from account creation, capped by the program cutoff. The server requires a
confirmed email and computes effective access from current profile/settings.
The earlier signup time is current beta behavior; do not silently apply the
ordinary-account trial-start decision to this separate beta window.

Accepted main feedback messages renew the window server-side, capped by the
cutoff. The feedback row and deadline update use a service-only RPC transaction;
renewal resets the window rather than stacking another 48 hours. The access-gate
message uses the same feedback renewal path.

**Founder confirmed 10 October: only main feedback messages renew access.**
The access-gate message uses that same path. Quick star ratings are stored as
micro feedback and never renew the window. Settings and guidance distinguish
these paths; do not restore the historical micro-rating renewal instruction.
Viewing a paywall preview, recording usage events, answering the closing form
or submitting an external form must not be treated as main-feedback renewal.

A null cutoff closes the program. A past cutoff ends tester access and prevents
feedback renewal. The current cutoff is configured, but enrollment readiness
still depends on the remaining release gates. A due closing questionnaire may
also pause access; verify its completion/reopen journey independently of expiry.
The server clock is authoritative; client countdowns are display only.

## 4. Feedback, screenshots and external forms

The main in-app feedback form records an allowlisted kind, text and a normalized
page path. Server-side profile/settings decide school attribution and renewal;
client-supplied ownership/deadlines are not authoritative. Region/text metadata
and optional screenshots are now implemented, extending the original v1 scope.
Screenshots use a private bucket, server-issued signed URLs and format/size
validation. They require full ownership/privacy/cleanup acceptance.

Quick ratings, main feedback, access-gate messages and closing answers are
separate paths. Test each path’s required fields, duplicate handling, attribution
and actual renewal result; do not infer equivalent behavior from a shared label.

No external form URL is currently set. If one is later supplied, configure a
trusted HTTPS URL and explain that external responses do not renew access. Do
not append account identifiers to third-party forms without a reviewed purpose,
disclosure and data-transfer decision.

## 5. Guidance, tasks, closing and reviews

The beta UI includes first-login guidance, a task checklist, quick feature ratings,
a feedback inbox/replies, a closing questionnaire and optional website review.
School reviews remain disabled in the beta. A private website review is separate
from permission to publish it in marketing.

Publication requires explicit permission, accepted child/guardian authority and
an anonymisation/withdrawal procedure; an omitted signature does not anonymise
free text automatically. Current review-consent version fields do not substitute
for legal acceptance or proof of permission in every eventual export/surface.
No quote should be published until those gates are accepted.

## 6. Current data and service boundaries

| Table/field | Purpose |
|---|---|
| `beta_schools` | cohort code validation and internal school attribution |
| `beta_program_settings` | singleton cutoff, rolling hours, optional external URL |
| `users.subscription_status = 'beta'` | beta identity, kept outside Stripe |
| `users.tester_school_code` | tester’s cohort attribution |
| `users.tester_access_until` | rolling deadline reset by accepted main feedback |
| `users.tester_guidance_seen_at` | first-login guidance record |
| `beta_feedback` | messages, micro feedback, optional screenshot/region metadata and replies |
| `beta_profile` | role/note, tracking notice timestamp, tasks and closing state |
| `beta_events` / `beta_rankings` | allowlisted usage events and result ordering |
| `beta_closing_answers` / `beta_reviews` | closing responses and optional private website reviews |
| private `beta-screenshots` bucket | uploaded screenshot files |

The canonical definitions are in `supabase-setup.sql`. The intended application
schema enables RLS; sensitive beta writes/RPCs are service-role only. Read-only
anonymous zero-row probes and OpenAPI column/function paths do not prove grants,
policy definitions or authenticated cross-account isolation.

Account deletion cascades linked feedback rows but does not synchronously remove
screenshot files. Orphan cleanup waits for files older than 24 hours and a
successful startup/daily maintenance run; AI usage logs also retain nullable-owner
records. C31’s erasure workflow/notice reconciliation remains a beta gate.

## 7. Required acceptance before inviting testers

- Fresh disposable installation and repeated schema runs; inspect all table/RPC
  grants and private Storage policies, then test anonymous/account-A/account-B
  isolation and transactional feedback rollback/concurrency.
- Real confirmation/resend mail and shared-code return in the same and a fresh
  browser, including missing/expired/reused CAPTCHA and upstream auth failure.
- Immutable account/request/draft ownership, late responses and account switches.
- Active/expired/null/past-cutoff beta, main/micro/gate/closing feedback paths,
  capped renewal and actual optional preview with zero beta Stripe operations.
- Tracking basis/choice/withdrawal, child data, vendor/controller facts, retention,
  screenshot erasure, testimonial permission and monitored support inbox.
- Complete responsive/keyboard journeys and real Safari/Chrome/Firefox acceptance.

These are current report gates, not evidence that the checks have already passed.
Do not blindly rerun historical SQL excerpts on production or reset real accounts
as an acceptance shortcut.
