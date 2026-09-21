# Legal/privacy remediation handoff — 2026-09-21

## Scope and boundary

This is a code-to-copy remediation record for Claude. It is not legal advice and
does not certify GDPR, consumer-law, Stripe, or processor-contract compliance.
The public legal pages remain marked as drafts and need a Czech privacy and
consumer-law lawyer before publication.

## Implemented in this change

### 1. Free-text answers no longer go to OpenRouter

`lib/questionnaire.js` now skips every `type: 'text'` answer in
`describeAnswers()`. The optional `poznamka` response remains in the user's
stored questionnaire run, but the OpenRouter request contains only structured
answer labels and selected school information.

Why: the previous prompt inserted the up-to-500-character free-text response
verbatim. A user could place a name, e-mail address, phone number, address, or
third-party information there. The old legal claim that name/e-mail was never
sent to the AI provider was therefore unsafe.

Verify: submit a standalone questionnaire with a unique harmless marker in the
optional note; inspect the outgoing OpenRouter request in a test environment and
confirm the marker is absent.

### 2. Reviews from non-adult roles are held before public display

`server.js` now sets every review outside the self-declared adult roles
(`rodic` and `ucitel`) to `held`, in addition to the existing profanity/name
heuristic. They remain visible to their author, but are not returned publicly
until a human changes the row status.

Why: `lib/reviewFilter.js` only detects a short profanity list and a narrow
teacher-name pattern. It cannot reliably catch a student naming themself, a peer,
an e-mail address, telephone number, or location.

Verify: use an email-confirmed test account, submit a student or visitor review
that passes the word filter, then confirm `GET /api/schools/:id/reviews` hides
it to another account/anonymous request and returns it to its author as held.

### 3. Public share links no longer return name or JPZ score

`GET /api/shared/:token` now returns only selected schools/programmes and notes
when the owner explicitly chose to include notes. It no longer selects or returns
the owner profile name or `decision_profile.jpz_points`. `SdileniView.jsx` no
longer renders the personalized risk summary, score, or first name.

Why: share links are unauthenticated. Their 128-bit token and rate limit reduce
guessing but anyone the URL is forwarded to can read it. A minor's name and exam
score are unnecessary for a parent to inspect the school order.

Verify: create a new link with and without notes; ensure the response body lacks
`firstName` and `jpzPoints`, notes appear only on the opt-in link, and revocation
still produces 404.

### 4. Checkout requires the payment acknowledgement in the API request

`Platba.jsx` and `SubscriptionExpired.jsx` pass a checked `paymentConsent`;
`api.js` sends it; `POST /api/checkout` rejects requests without the boolean
value.

Why: previously the checkbox only disabled the browser button. A direct API call
could start Checkout without it.

Limit: this is a recorded self-attestation at request time, not age verification
or proof that a parent authorized a minor's payment. The legal copy was changed
to say exactly that.

Verify: authenticated `POST /api/checkout` without `paymentConsent: true` returns
400; both payment surfaces still redirect to Stripe after checking the box.

### 5. Draft legal copy now matches those implementation facts

`Legal.jsx` now says that the optional free-text note is not sent to the AI,
lists Google Fonts, discloses the seven-day onboarding email/answer browser
stash, describes the payment acknowledgement as a self-attestation, removes the
unsupported unconditional "no further charge" deletion wording, and replaces the
unsupported 14-day refund promise with a lawyer-review placeholder.

## Important unresolved work

### Must be decided or confirmed outside code

1. **LAWYER:** controller identity, IČO/address/contact, legal bases, retention
   periods, Czech Art. 8 approach, consumer withdrawal/refund wording, complaint
   process, VAT statement, liability wording, terms-change process.
2. **Operations:** actual Supabase region; production host/CDN/logging vendors;
   configured Supabase SMTP/e-mail provider; all processor DPAs and international
   transfer wording. The source tree cannot establish any of these.
3. **Operations:** do not offer a refund promise until a real Stripe refund and
   support/audit process exists. `REFUND_GUARANTEE_DAYS` is currently zero.
4. **Operations:** no trial reminder e-mail exists. The paywall correctly says it
   is not promised; keep `TRIAL_REMINDER_IMPLEMENTED` false until a durable job
   and tested email delivery exist.

### Remaining engineering risks

1. **Seasonal deletion/charge race:** account deletion is not transactional with
   `chargeDueSeasonPasses()`. A scheduler run can select a due user before the
   account deletion finishes. Implement an atomic per-account charge claim or a
   deletion state checked immediately before PaymentIntent creation.
2. **Share notes remain sensitive:** even with the opt-in checkbox, a minor can
   include personal/third-party information in a note. Consider hiding notes from
   public links entirely until a moderation/redaction design exists.
3. **Role self-declaration:** a user can select `rodic`, `ucitel`, or `absolvent`.
   The server protects against names for `student`, but adult-role names remain
   a self-declared status. Decide whether all reviews need moderation or only
   verified adults may opt into name display.
4. **Consent evidence:** signup records `accepted_terms_at` in Supabase Auth user
   metadata, but does not preserve the age/parental branch or the checkout
   acknowledgement as an auditable field. Decide the evidence model with counsel
   before claiming more than self-attestation.

## Existing uncommitted work preserved

At the start of this remediation, the working tree already had unrelated or
parallel changes in `UNFORGET.md`, `App.jsx`, `AuthContext.jsx`, `Layout.jsx`,
`pricing.js`, `SignUp.jsx`, `CreateAccount.jsx`, `server.js`, and the draft legal
files. Do not discard them. This change was deliberately applied as separate,
narrow hunks; review the combined diff before committing.

## Validation to run

```bash
cd frontend && npm run lint && npm run build
cd .. && npm test && git diff --check
```

Then perform the five verification scenarios above in a Stripe test environment.
