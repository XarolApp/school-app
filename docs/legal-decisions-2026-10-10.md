# Legal decisions for the closed beta — 2026-10-10

**Status:** decided by the founder's delegation on 2026-10-10 (Claude proposed, founder
accepted by instruction "decide the legal questions"). These are **product decisions
with reasoning, not legal advice or a legal sign-off.** No lawyer has reviewed them.
Before the beta cohort grows past the one school, ask the school's data-protection
officer (pověřenec) or a privacy professional to read this page and the two legal pages.

Scope: one school (ZŠ Jesenicova), up to about 170 testers aged roughly 13–15 plus
parents/teachers, 11–18 October 2026, free, no real payments, Stripe in test mode.
Source of the questions: `reports/deployment-review-2026-10-07/legal-docs-findings.md`
(LEGAL-01 … LEGAL-05).

## D1 — Beta usage tracking is based on explicit consent (LEGAL-01)

**Problem.** The beta stores a random identifier in the browser (`localStorage`
`snm.beta.visit`, `snm.beta.anon`; `sessionStorage` session id) and records page views
and actions. A required "Rozumím" checkbox is an acknowledgement, not consent, and
storing a non-essential identifier on a device needs consent even for first-party
analytics (ÚOOÚ position; §89 of the Czech electronic communications act).

**Decision.** Keep the measurement (the beta's purpose is observing use, and the tester
checklist depends on it) but make it **consent**:
- The checkbox now reads "Souhlasím s tím, že se při testování zaznamenává, jak web
  používám (viz výše). Souhlas mohu kdykoli odvolat." It is unticked by default and
  explained in plain text above it (`BetaEnrollment.jsx`).
- Privacy policy §9 and §8 now name consent as the basis and say so for the browser
  identifier (`Legal.jsx`, updated 10. 10. 2026).
- Withdrawal: by e-mail to info@stredninamiru.cz (tracking is stopped and recorded events
  deleted on request), or immediately by deleting the account in Nastavení.
- Under 15: the account is created together with a parent or guardian (existing
  `ConsentCheckbox` at sign-up, privacy §5), which also covers this consent.
- Participation requires the consent. Accepted trade-off: consent as a condition is
  weak under GDPR, but being observed is the whole content of a test; the school e-mail
  says so up front. If a parent objects, the child simply does not take part.

- Withdrawal is as easy as giving consent (added 10 October): a **"Záznam používání"
  switch in Nastavení**. Switching it off stops recording at once (the server rejects
  further events and rankings) and deletes this account's recorded events and rankings;
  testing access and written feedback keep working. It can be switched back on.
  E-mail withdrawal still works too.

**Status: decided by the founder, 10 October 2026.** Codex's review asked for an adviser
sign-off; the founder accepted this decision for the one-school, 7-day beta instead.
Re-assess before any larger cohort.

## D2 — Review reporting and DSA (LEGAL-02)

**Decision.** School reviews stay **off** for the whole beta
(`SCHOOL_REVIEWS_ENABLED = false`, server refuses them). Nothing user-written is shown
to other users, so the hosting notice-and-action duties are not triggered. The only
review is the optional website review, which stays private unless the author ticks a
separate, versioned consent (`2026-10-08`) and is then used by the founder, not hosted for
other users. Privacy §2 and Terms §9 now state that school reviews are off.
**Gate:** do not switch school reviews on until the notice mechanism (reporter name and
contact, decision, notification, redress) is built.

## D3 — Parent and result links, pre-account snapshots (LEGAL-03)

**Decision.** Sharing is off in the frontend (`SHARING_ENABLED = false`) **and on the
server** (10 October): without `SHARING_ENABLED=true` in Railway, creating or opening a
shortlist share, results link, parent payment link, quiz handoff or pre-account snapshot
answers 404. Owners can still list and revoke links made earlier. Signed-out visitors see
only the landing page, legal pages and the view-only school detail (public school data, no
personal data). So none of these flows can happen during the beta. The privacy text
for these flows is **not** added now; add it
(what each link shows, who can open a forwarded link, expiry/revocation, that expired
rows are not yet deleted) in the same release that re-enables sharing.

## D4 — Retention and children's risk screening (LEGAL-04)

**Retention (now stated in privacy §9):**
- Usage events and onboarding rankings: deleted 6 months after the beta ends (job exists).
- Feedback, closing answers, private website reviews: **changed by the founder on
  2026-10-10** (before any real tester joined, so no earlier promise is broken). Kept while
  the account exists (legitimate interest: improving the site). On account deletion the
  user chooses: tick the checkbox → deleted with the account; leave it → copied without
  account id, school code, screenshots, coordinates or admin notes to
  `beta_contributions_archive` (`archive_beta_contributions`), originals deleted.
  Screenshots are always deleted. Free text can still identify a writer, so the archive is
  minimised rather than guaranteed anonymous; later erasure requests by e-mail are honoured
  by hand. Public use stays opt-in only (own consent, under-15 fully anonymous) — an
  opt-out notice is not valid consent for publishing. Not a legal sign-off.
- A public testimonial (only with its own consent): kept until the consent is withdrawn.
- Accounts: until the user deletes them (unchanged).

**DPIA screening, 2026-10-10 — decided by the founder: no full DPIA for this beta.**
One school, at most about 170 testers, 7 days, no special-category data collected on
purpose, no location stored, no sharing with third parties for their own purposes, no
profiling with legal effect, data minimised (no e-mail, free text or points in events),
deletion on request, and usage recording can be switched off in Nastavení.

Fact corrected by Codex's review (kept): the optional church-school answer (`cirkevni`)
is stored in `questionnaire_runs.answers` with the `user_id`, so it is *not* separated
from identity. Choosing a church school does not by itself reveal a religious belief, and
the question is optional; the founder accepts this for the beta. Re-screen before any
launch beyond this school — at that point consider dropping or reframing that question,
and include children's data, screenshots and map location in a documented assessment.

## D5 — Vendors and the operator (LEGAL-05) — founder to verify

Facts the legal pages state as settled that only the founder can confirm in dashboards
(write the date next to each when done):
- [x] (founder, 2026-10-10) Controller: Václav Kadlec, Na Lysinách 34, 147 00 Praha, natural person, not a VAT
      payer, e-mail info@stredninamiru.cz is monitored. Václav agrees to be named.
- [x] (founder, 2026-10-10: eu-west-1) Supabase project region is Ireland (eu-west-1): Supabase → Project Settings → General.
- [ ] **Not yet — founder confirmed 2026-10-10 the account is in Vojtěch Kadlec's name.** Accepted for the free beta; must move before real payments. Brevo account (sends confirmation and reset e-mails) is registered to the operator.
      Today it is in the founder's own name — see the UNFORGET Brevo item.
- [~] (founder screenshot, 2026-10-10) All four data-training toggles are off (paid/free training endpoints, prompt-publishing endpoints, 1% data discount). The separate input/output logging setting was not in the screenshot — still to confirm. OpenRouter: Settings → Privacy: prompt logging / training off for this key, or the
      limits are acceptable. The AI receives only the questionnaire's multiple-choice
      answers (never free text, points or name) plus the grammatical form for addressing.
- [x] (founder, 2026-10-10) Stripe stays in test mode; no live keys during the beta.

## Placeholder check (privacy policy and terms)

Checked 2026-10-10: no `[DOPLNIT]` text remains in `Legal.jsx`; the "pracovní verze"
banner is switched off (`DRAFT = false`). Operator name, address, e-mail and
"neplátce DPH" are filled in. There is **no IČO** (a natural person without a trade
licence has none); this is the founder's recorded risk for a free beta and must be
resolved before real payments. The facts in D5 are still unverified.


## Independent implementation verification note — 10 October 2026

D1 and D4 above remain the founder's decisions. This note adds implementation evidence only: read-only Supabase OpenAPI metadata exposes `beta_profile.tracking_paused_at`, while function bodies/grants and the complete withdrawal journey remain unverified. A synthetic actual-handler probe reproduces an in-flight event submitting its write after withdrawal reports success; the canonical `record_beta_events` function checks the enrollment timestamp but not the pause flag. Independent deletes can also leave pending cleanup after a partial failure. Resolve and test this coordinated lifecycle issue (C43) before relying on the switch's stop/delete promises. See `reports/deployment-review-2026-10-07/tracking-withdrawal-race-2026-10-10.json` and the ordered handoff. No live tracking record or account was modified by this review; this note does not change the approved legal basis or the founder's DPIA decision.
