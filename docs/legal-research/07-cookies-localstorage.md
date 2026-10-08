# 7. Cookies / localStorage under §89(3) zákona 127/2005 Sb.

> Original research: 21 September 2026. Implementation assessment updated 8 October. Not legal advice. Statutory wording was not independently fetched; ÚOOÚ's current device-storage guidance was rechecked.

## Law and ÚOOÚ guidance
- Since 1. 1. 2022, storing/reading data on the user's device needs **opt-in consent**, except where **technically necessary** to provide a service the user explicitly requested. — [ÚOOÚ – cookies od 2022](https://uoou.gov.cz/novinky/vse/cookies-od-zacatku-roku-2022-pouze-se-souhlasem)
- ÚOOÚ: *"technické cookies mohou být bez souhlasu zpracovávány pouze pro účely nezbytné"* and *"Tyto stanovené podmínky platí i pro další formy ukládání dat v technických zařízeních"* → **localStorage/sessionStorage are covered**. — [ÚOOÚ Q&A – Cookies](https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies)
- EDPB Guidelines 2/2023 confirm Art. 5(3) ePrivacy covers local storage, pixels, identifiers. — [ÚOOÚ news](https://uoou.gov.cz/novinky/vse/edpb-prijal-pokyny-k)

## Your storage — assessment
| Storage (from code) | Exempt? |
|---|---|
| Supabase auth session (local/sessionStorage, `supabaseClient.js`) | ✅ necessary — login |
| "Zůstat přihlášený" flag | ✅ user-requested |
| Password-recovery flag (sessionStorage) | ✅ |
| Quiz answers (sessionStorage) | ✅ user-requested function |
| Chosen role (`OnboardingFlow.jsx`) | ✅ UI state for requested flow |
| Saved search filters/presets, compare selection (`searchPrefs.js`) | ✅ user-input / UI customisation |
| 7-day stash of e-mail + answers (`pendingOnboardingAnswers.js`) | ✅ defensible — completes the signup the user started; keep ≤7 days, delete after use |
| "Recently viewed" | Assess necessity separately; low sensitivity or staying on the device does not create a consent exemption. |
| Cloudflare Turnstile | ✅ security for a requested service (generally accepted) |
| Fonts | ✅ self-hosted (@fontsource) — no third-party call |

The table's checkmarks are the original researcher's proposed necessity assessments,
not a legal approval. Validate actual current storage, retention and purpose; especially
compare personalization, recently viewed schools, pending answers and beta identifiers
against the service the user explicitly requested.

## Current beta qualification

The old blanket no-banner conclusion is superseded. Beta now reads/writes random visit/session identifiers and transmits behavioral events (`betaTrack.js`). Enrollment requires acknowledging a notice; that is expressly not optional tracking consent. First-party collection and a GDPR legitimate-interest basis do not by themselves exempt nonessential device storage. ÚOOÚ distinguishes necessary storage from other purposes and applies the rule to similar browser storage, not only cookies.

Have the controller/counsel document which storage is strictly necessary for a requested service and which needs an optional choice. Assess children's processing separately. If consent is required, block collection before it and support withdrawal/appropriate under-15 authorization; alternatively remove the unnecessary storage/measurement. Do not claim either universal consent exemption or a required banner implementation until that classification is decided. LEGAL-01 remains a beta gate in the [current review](../../reports/deployment-review-2026-10-07/legal-docs-findings.md).
