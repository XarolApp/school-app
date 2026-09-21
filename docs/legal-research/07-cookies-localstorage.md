# 7. Cookies / localStorage under §89(3) zákona 127/2005 Sb.

> Research as of 21. 9. 2026. Not legal advice. §89 wording not fetched (zakonyprolidi 403); ÚOOÚ guidance below loaded fine.

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
| "Recently viewed" | ⚠️ weakest — convenience, not requested; low risk (never leaves device) |
| Cloudflare Turnstile | ✅ security for a requested service (generally accepted) |
| Fonts | ✅ self-hosted (@fontsource) — no third-party call |

**Conclusion:** no consent banner needed as long as you add no analytics/ads/pixels. Privacy policy §8 is accurate.
