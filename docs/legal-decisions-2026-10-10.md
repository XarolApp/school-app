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

**Not done (logged in UNFORGET):** a one-click "stop recording" switch in Nastavení. For
a 7-day beta the e-mail route is acceptable; build the switch before any larger beta.

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

**Decision.** Link sharing is off (`SHARING_ENABLED = false`) and every app page now needs
a signed-in account, so neither the parent payment link nor pre-account result snapshots
can occur during the beta. The privacy text for them is **not** added now; add it
(what each link shows, who can open a forwarded link, expiry/revocation, that expired
rows are not yet deleted) in the same release that re-enables sharing.

## D4 — Retention and children's risk screening (LEGAL-04)

**Retention (now stated in privacy §9):**
- Usage events and onboarding rankings: deleted 6 months after the beta ends (job exists).
- Feedback with screenshots, closing answers, private website reviews: deleted or
  anonymised **no later than 12 months after the beta ends = by 18 October 2027**.
  There is no automatic job for this yet — the founder deletes them by hand
  (reminder in UNFORGET). Screenshots without feedback are removed daily by the existing cleanup.
- A public testimonial (only with its own consent): kept until the consent is withdrawn.
- Accounts: until the user deletes them (unchanged).

**DPIA screening, 2026-10-10:** no full DPIA is required in my assessment — one school,
at most about 170 testers, 7 days, no special-category data collected on purpose,
no location, no sharing with third parties for their own purposes, no profiling with
legal effect, data minimised (no e-mail, free text or points in events), deletion on
request. Residual points to watch: the church-school preference question is optional
and treated as ordinary data, but would need re-assessment if it were ever combined with
identity; and the tester pool is children. Re-screen before any launch beyond this school.

## D5 — Vendors and the operator (LEGAL-05) — founder to verify

Facts the legal pages state as settled that only the founder can confirm in dashboards
(write the date next to each when done):
- [ ] Controller: Václav Kadlec, Na Lysinách 34, 147 00 Praha, natural person, not a VAT
      payer, e-mail info@stredninamiru.cz is monitored. Václav agrees to be named.
- [ ] Supabase project region is Ireland (eu-west-1): Supabase → Project Settings → General.
- [ ] Brevo account (sends confirmation and reset e-mails) is registered to the operator.
      Today it is in the founder's own name — see the UNFORGET Brevo item.
- [ ] OpenRouter: Settings → Privacy: prompt logging / training off for this key, or the
      limits are acceptable. The AI receives only the questionnaire's multiple-choice
      answers (never free text, points or name) plus the grammatical form for addressing.
- [ ] Stripe stays in test mode; no live keys during the beta.

## Placeholder check (privacy policy and terms)

Checked 2026-10-10: no `[DOPLNIT]` text remains in `Legal.jsx`; the "pracovní verze"
banner is switched off (`DRAFT = false`). Operator name, address, e-mail and
"neplátce DPH" are filled in. There is **no IČO** (a natural person without a trade
licence has none); this is the founder's recorded risk for a free beta and must be
resolved before real payments. The facts in D5 are still unverified.
