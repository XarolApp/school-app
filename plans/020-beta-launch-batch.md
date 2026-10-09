# 020 — Beta launch batch (access gate, comparison, matrix, AI explanations, tester UX)

**Status:** IMPLEMENTED 2026-10-09. Repository implementation and Phase 13
documentation are on `origin/main`; see the commit list below. This status does
not mean production configuration, database migration or beta acceptance is done.
**Model routing:** implementation used Codex GPT-6 Luna at max effort (founder
choice). The separate security/privacy review at Opus 5.5 low for phase 1 (gate),
phase 6 (gender data) and phase 9 (reviews and consent) is still pending.
**Founder decisions:** made in chat on 2026-10-08 and quoted per phase. Do not
re-litigate them.
**Already logged (do not re-log):** the UNFORGET section "Founder backlog from the
2026-10-08 beta-launch request".

## 0. Rules for the implementer

- Read `CLAUDE.md` / `AGENTS.md`, `design/DESIGN.md` and
  `docs/sources/claude_code_ui_ux_guide.md` before any UI work.
- Coordinate through `reports/deployment-review-2026-10-07/COORDINATION.md`: add an
  exact-path claim before each file you edit and release it afterwards.
- Colours, radii and spacing come only from tokens. Icons come only from named
  `lucide-react` imports.
- Czech copy:
  - Students get tykání; parents and teachers get vykání. Use the existing
    `parent ? … : …` switch.
  - Plurals have three forms: 1 / 2–4 / 5+.
  - No invented numbers.
- Never write to production data and never re-run SQL against production. Every SQL
  change goes into `supabase-setup.sql`, re-runnable (`if not exists` /
  `do $$` guards). The founder applies it.
- Each phase finishes with `npm test` (repo root), plus `npm run lint` and
  `npm run build` in `frontend/`. Check it in the browser at 375×812 and on desktop.
  Then commit and push (`.env` files are never staged).
- Keep diffs small. Reuse existing helpers: `useDraft`, `searchPrefs`, `Modal`,
  `StatInfo`, `numCz` / `pluralCz`, `track`, `fetchWithAiUsage`, `useBottomBarSpace`.
  Run a simplification pass at the end of each phase: delete dead code, merge
  duplicates. Do not change behaviour.

---

## Phase 1 — Site access gate with one tester code

**Decision:** stredninamiru.cz shows a "this site is in testing" page. A tester types
the code once, and the browser remembers it. Nobody without the code reaches any page.
There is one tester school.

**File:** `frontend/middleware.js` (Vercel Edge).

1. **Gate page.** Restyle it with the Značka palette values. It is a standalone HTML
   string, so copy the hex values from `tokens.js`; it cannot read CSS vars. Copy:
   - Headline: "Střední na míru je teď v testovací verzi."
   - Text: "Pokud jsi tester, zadej přístupový kód z e-mailu od školy."
   - A password-type field with a reveal toggle, `autocomplete="off"` and
     `autocapitalize="none"`.
   - Button: "Vstoupit".
   - Error: "Kód nesedí. Zkontroluj ho v e-mailu od školy."
   - Footer: "Nejste tester? Spuštění chystáme — info@stredninamiru.cz".
   
   Keep `noindex`.
2. **Submit with JS `fetch` (POST to `/__gate`)**, not a GET form. On success,
   `location.reload()`. This keeps the code out of the URL and history, and keeps the
   current path, query **and hash**. The hash matters: Supabase confirmation and
   password-reset links carry their tokens in `#…`. If the confirmation link opens in
   a phone's mail-app browser, the gate asks for the code once and then continues to
   the same link. Without JS, fall back to a plain POST that redirects to the same path.
3. **Comparison:** trim, lowercase, strip diacritics (NFD) and remove spaces before
   comparing with `SITE_ACCESS_KEY` normalised the same way, so "Přístup testovací
   verze" works.
4. **Cookie.**
   - Set an HttpOnly, Secure, SameSite=Lax cookie for 180 days.
   - Its value is an HMAC (SHA-256 via Web Crypto) of the normalised key with a fixed
     label, not the raw key. Rotating `SITE_ACCESS_KEY` then locks out everyone.
   - Rate-limit wrong attempts at minimum: a 600 ms delay on a wrong code. No storage
     needed.
5. **Remove the bypasses.** `/beta/:code` and `/email-overen?beta=` must no longer
   open the gate (founder: "nobody who didn't type this code"). Delete
   `betaGateCode`, `lookupBetaInvitation` and `betaApiUrl` if nothing else uses them,
   and update `tests/` accordingly.
6. **Fail closed in production.** If `SITE_ACCESS_KEY` is unset and
   `process.env.VERCEL_ENV === 'production'`, serve the gate with a 503 "Stránka se
   právě nastavuje." Preview and local builds stay open.
7. **Exempt paths** (no gate): `/__gate`, `/robots.txt` (serve `Disallow: /`) and
   `/version.json` (phase 12). Static `/assets/*` stay gated; the gate page is
   self-contained.

**Tester enrolment: one shared code, no schools.** Founder, 2026-10-08:
- There is one testing school (ZŠ Jesenicova).
- All testers share the single code `pristuptestovaciverze`.
- There are **no separate school codes or school names** in the tester experience.

The database still needs one `beta_schools` row, because `users.tester_school_code`
is a foreign key and the signup trigger validates it. That row's code **is the same
access code**: `PRISTUPTESTOVACIVERZE`, school_name `ZŠ Jesenicova`. It stays internal
(admin and attribution only).
- The tester never sees or types any other code.
- Remove tester-facing wording about a "pozvánka školy" or a school name. For example,
  "Pozvánka školy není platná." becomes "Přístupový kód neplatí.", and the school name
  disappears from the beta landing and instructions.
- `/admin` may still show the school name.

8. Add `VITE_BETA_SCHOOL_CODE=PRISTUPTESTOVACIVERZE` (frontend env, public; the same
   value as `SITE_ACCESS_KEY`, upper-cased). This is already in progress in the
   working tree.
   - When it is set, every signup sends it as `betaSchoolCode`. This covers
     `CreateAccount.jsx`, `SignUp.jsx` and `ConfirmEmailWaiting` resends: anywhere
     `signUp` / `resendConfirmation` is called without an explicit code, so all new
     accounts become testers.
   - After the gate, the first visit lands on `/beta/<VITE_BETA_SCHOOL_CODE>`, the
     existing beta landing with tester instructions. Implement this as a client-side
     redirect from `/` once per browser: set a localStorage flag after the first redirect.
   - When the variable is unset, behaviour is unchanged.
9. Update `frontend/.env.example`, `DEPLOY.md` and `docs/beta_testing_operations.md`
   with the new flow.

**Accept when:**
- No cookie: every path returns the gate.
- Wrong code: the error shows.
- Code typed with capitals, spaces or diacritics: the gate opens.
- The cookie survives a browser restart.
- A Supabase link with `#access_token=` opened in a fresh browser shows the gate, then
  lands on `/email-overen` with the hash intact.
- A new signup becomes `subscription_status='beta'` with the school code. Check this
  in a local or test database only.

## Phase 2 — Comparison (`/porovnani`)

**Files:** `frontend/src/lib/comparisonRows.js`, `frontend/src/pages/Porovnani.jsx`,
`frontend/src/lib/searchPrefs.js`, `frontend/src/pages/Search.jsx`,
`frontend/src/pages/decision.css`.

1. **Compare up to 5 schools.**
   - `searchPrefs.js`: change the cap in `toggleCompareSelection` and
     `setCompareSelection`, plus the error copy "nejvýš 5 škol".
   - Search compare bar "(max. 5)".
   - Porovnání empty state "Až 5 škol".
   - Grep `4` near "porovn" for anything else.
   - Check that the table works with 5 columns on desktop (1280) and on mobile, where
     it scrolls horizontally with a sticky label column.
2. **"nej" only with 3+ schools.** `row()` gets the school count. For exactly 2
   schools, the tags become "nižší" / "vyšší" / "méně" / "víc"; for 3+ keep
   "nejnižší" / "nejvyšší" / "nejméně" / "nejvíc". Unit-test `buildComparisonRows`
   for 2 and for 3 schools.
3. **Delete the "Zatím doplňujeme" section** (`missingSection`).
4. **Add a section "Život ve škole"** built from `school_extracted_details`, which
   comes from `extractedOf()`.
   - Values are short, one line per cell, and never the long prose from "Praktické
     informace".
   - A row appears only when at least one compared school has a value. A cell without
     a value says "neuvedeno" (muted).
   - Use these rows, in this order:

     | Row | Source | Cell text |
     |---|---|---|
     | Úspěšnost u maturity | `maturita_pass_rate_pct` | "91 %" |
     | Školné za rok | `tuition_czk_per_year`; public = 0; church = "Zjistit u školy" | "0 Kč" / "45 000 Kč" |
     | Obědy | `ma_jidelnu` | "Ano" / "Ne" |
     | Kroužky | `krouzky_kategorie` | max 3 human labels + "+N" |
     | Styl výuky | `vyukovy_styl_tagy` | max 2 labels + "+N" |
     | Začátek vyučování | `zacatek_hodin` | "8:00" |
     | Talentovky / další požadavky | `ma_dodatecne_pozadavky` | "Ano" / "Ne" |
     | Alternativní pedagogika | `alternativni_pedagogika` | "Ano" (show only if any is true) |

   - Labels for the tag values: reuse whatever map
     `components/schoolDetail` already uses for "Praktické informace". Do not invent a
     second label map.
   - Then delete the existing "Školné" row in the "Škola" section; the new row
     replaces it. Church schools stay "Zjistit u školy" (founder, 2026-10-07).
   - Before building, check live coverage read-only:
     `select count(*) filter (where <col> is not null) from school_extracted_details`.
     Leave out any row with fewer than about 10 schools covered, and add it to the
     UNFORGET "Comparison: data we do not have" bullet.
5. **Replace emoji and glyphs.**
   - `'✓ V přihlášce'` → `<Check size={14}/> V přihlášce`.
   - The `ⓘ` info glyph → the `StatInfo` component (already used in the matrix).
   - The `×` remove button → lucide `X`.
6. **Footnote:** mention that the "Život ve škole" values are taken from school
   websites and may be outdated.

**Accept when:**
- 5 schools fit.
- 2 schools show "nižší"; 3 show "nejnižší".
- No "zatím doplňujeme" and no "pracujeme na tom" anywhere on the page.
- A school with a maturita percentage shows it as text.

## Phase 3 — Decision matrix (`/porovnani/matice`)

**Files:** `frontend/src/lib/decisionMatrix.js`, `frontend/src/pages/Matice.jsx`,
`frontend/src/pages/decision.css`, and their tests.

**Root cause of "a 91 % maturita school has no bar":** `minMax()` scales each
criterion relative to the compared set, so the lowest school always gets 0 (an empty
bar). The same bug hits šance, místa and jazyky.

1. **Replace `minMax` with absolute or ratio scales.** The bar and the ranking use the
   same number.
   - `shoda`: `match_score / 100`. Unchanged.
   - `sance`: acceptance rate (`summarizeAdmission(s).acceptance / 100`, admitted ÷
     applicants), not the min-maxed cutoff. A Cermat-covered school always has a
     chance > 0 (founder: "there is always the chance and we know it").
   - `mista`: `kapacita / max(kapacita in set)`.
   - `jazyky`: `count / max(count in set)`.
   - `maturita`: `pct / 100`.
   - `skolne`: 1 (public) / 0 (private) / null (church or unknown).
   - `vyse_skolneho`: `1 - amount / max(amount in set)`, where public = 0 Kč gives a
     full bar. If every amount is 0, all get 1.
   - A bar is empty only when the value is truly 0.
2. **Show the value next to every bar.** Each breakdown entry gets a `display` string,
   built in `decisionMatrix.js` and rendered right of the bar. The importance level
   ("Zásadní", "Dost") stays, but moves into the criterion label as a small caption.
   - `shoda`: "72 %".
   - `sance`: "přijato 38 %".
   - `mista`: "120 míst" (plural forms).
   - `jazyky`: "3 jazyky" (plural forms).
   - `maturita`: "91 %".
   - `skolne`: "bez školného" / "placená".
   - `vyse_skolneho`: "0 Kč" / "45 000 Kč".
3. **Missing data.**
   - A criterion the user weighted but a school lacks still appears in that school's
     row, with the text "Tento údaj nemáme" and no bar.
   - The fairness rule stays: a criterion missing for any compared school is left out
     of everyone's sum. Show that under the row as one caption: "Do pořadí se nepočítá
     — chybí u některé školy."
   - Update the "Jak to funguje?" text and the bottom caption to match (no more
     "vůči ostatním vybraným školám … nejhorší nejkratší"). Bars are now absolute or
     relative to the best.
4. **Remove the `dojezd` criterion entirely** (its CRITERIA entry, the locked UI and the
   tooltip). It is already logged in UNFORGET.
5. **Rename `shoda`'s label to "Shoda s tebou"** everywhere, including the ghost
   preview in `MaticeEmpty`, the confirm dialog ("Doporučujeme nechat shodu s tebou na
   Zásadní…") and the tooltip.
6. **Remove the `typ` criterion ("Typ školy odpovídá mým plánům").** Founder:
   "delete the škola odpovídá mým zájmům". The criterion is a self-described
   placeholder signal. If the founder meant something else, they will say so.
7. **Remove the 💡** in the callout and use lucide `Lightbulb` (or `Info`) at 18 px.
8. **Add a small "Přidat do přihlášky" button** in each ranked row (`ss-btn-sm`,
   secondary).
   - Extract the add/remove-pick logic from `Porovnani.jsx`'s `handleAddToPicks` into
     a shared hook, `frontend/src/lib/usePicks.js`, returning `{ pickIds, toggle,
     saving }`. Porovnání, Matice and Search (phase 4) all use it.
   - Toast copy stays the same; the 3-school limit stays the same.
9. Remove `'Typ školy…'` and `'dojezd'` from the default weights. Old `useDraft`
   weights in sessionStorage may still hold those keys; ignore unknown keys.

**Accept when:**
- With 2–5 schools, no bar is empty unless the value is 0.
- Every bar has a value text.
- An unknown value shows "Tento údaj nemáme".
- No "Dojezd", no "Typ školy odpovídá mým plánům", no emoji.
- The matrix tests are updated and pass.

## Phase 4 — "+" (add to přihláška) on `/skoly`

In `Search.jsx`, each school row and card gets a small icon button: lucide `Plus`,
which becomes `Check` once added.
- `aria-label`: "Přidat {název} do přihlášky", or "Odebrat … z přihlášky" when
  already added.
- Place it next to the existing compare toggle and favourite button.
- Use `usePicks()`. Signed-out and 3-limit toasts are the same as on Porovnání.
- No layout shift on mobile cards.

## Phase 5 — AI: model, prompts, loading screen, on-demand explanation

**Model.** Use `openai/gpt-6-luna` on the OpenRouter flex route, with low reasoning
effort.

1. **Request body, both server calls** (`lib/questionnaire.js` `requestReasons`, and
   `scripts/generate-school-proscons.js`):
   - `model: process.env.OPENROUTER_MODEL || 'openai/gpt-6-luna'`.
   - `reasoning: { effort: 'low' }`.
   - `provider: { order: ['openai/flex', 'openai'], allow_fallbacks: false }`. Flex
     is the half-price route; plain `openai` is the only fallback, so a flex capacity
     error does not cost the student the sentence.
   - **Drop `temperature`.** Luna does not list it as a supported parameter.
   - Use `response_format: { type: 'json_schema', … }`. Luna supports
     `structured_outputs`. Keep `extractJson` as a fallback.
   - Timeout: flex can be slow, so use `AbortSignal.timeout(120_000)` for the
     questionnaire.
   - `DEFAULT_MODEL` constants and comments are updated. `.env.example` gets
     `OPENROUTER_MODEL=openai/gpt-6-luna`, `OPENROUTER_PROSCONS_MODEL=openai/gpt-6-luna`
     and `OPENROUTER_PROVIDER=openai/flex`. Read the provider from env, with that
     default.
   - `ai_usage_log.source` check constraint: add `'explain'` (see item 4).
2. **Prompt rewrite** (`SYSTEM_PROMPT` in `lib/questionnaire.js`). Goal: per school,
   1–2 sentences, at most about 260 characters.
   - Sentence 1: why the school fits, grounded only in that school's `signals` and
     obory.
   - Sentence 2 (optional): a personal touch built from the answers that do not affect
     the score: `povaha`, `novy_kolektiv`, `motivace`, `soucasna_skola`, `velikost`.
     Example: "Jsi spíš extrovert, takže ti velká parta ve třídě nejspíš sedne."
   - Hard rules to keep:
     - Never claim a school property that is not in the signals.
     - No percentages, no reordering, no generic phrases.
     - Tykání.
     - Grammatical gender from phase 6. If gender is unknown, use masculine.
     - Never mention gender explicitly.
   - Add 2 short Czech few-shot examples, one with and one without a personality
     answer.
   - `describeAnswers` must keep excluding `privateToServer` and free-text answers.
     Send gender as a separate line, `Rod pro oslovení: mužský|ženský`, not as an
     answer.
   - Write the matching pros/cons prompt in `generate-school-proscons.js`. Review its
     current prompt for the same rules (grounded, short, no invented facts) and tighten
     wording only.
3. **Loading screen after the `/dotaznik` submit.**
   - While `submitting`, render a full-panel loading state instead of the button text
     "Počítám…". It shows stepped messages that advance every ~2.5 s and hold on the
     last one:
     1. "Ukládám tvoje odpovědi"
     2. "Počítám shodu s každou školou"
     3. "Řadím školy podle shody"
     4. "Píšu vysvětlení k nejlepším školám"
     5. "Ještě chvilku — kontroluju texty"
   - Reuse the visual of the onboarding `screens/Calculating.jsx` step list. Replace
     its `✓ ◐ ·` glyphs with lucide `Check` / `Loader` / `Circle`, in both places.
   - Respect `prefers-reduced-motion` and use `role="status"`.
   - If `POST /api/me/onboarding-answers` also calls the model, check that the
     onboarding Calculating screen covers the wait too.
4. **"Získat vysvětlení" on the school detail page** (`/skoly/:id` only, not in the
   search list).
   - **Server:** `POST /api/questionnaire/explain/:schoolId`
     (`requireAuth, requireAccess`, plus a new limiter of 30 per hour per user).
     1. Load the user's default run.
     2. If the school is in that run's top 10 and has a stored reason, return it
        without calling the model.
     3. Otherwise score just that school with `scoreSchools`, take its signals and
        call the same model and prompt for one school.
     4. Cache the result in a new column, `questionnaire_runs.extra_reasons jsonb not
        null default '{}'` (keyed by school id), and return it.
     5. Log usage with `source: 'explain'`. Validate `schoolId` as a positive
        integer. Do not touch other users' runs.
   - **Client:** a `SchoolActions`-area button, "Získat vysvětlení" (secondary,
     lucide `Sparkles` is fine).
     - Loading: "Píšu vysvětlení…".
     - Shows the sentence in a small card titled "Proč tahle shoda".
     - Without a default run: a link, "Nejdřív vyplň dotazník", to `/dotaznik`.
     - Errors are shown inline in the existing pattern.
     - Already explained: show it straight away (`GET` the run, or return it with the
       school detail; pick the smaller diff).
   - The client calls the endpoint through an `api.js` helper.
5. **Pros/cons regeneration** is a founder step. Codex does not run it against
   production; document the command:
   `node scripts/generate-school-proscons.js --force`. Dry-run first with
   `--dry-run --limit 5`.

**Cost estimate**, to record in this plan's PR description. OpenRouter flex
pricing, 2026-10-08: $0.05 per M input tokens, $0.25 per M output tokens.
- One questionnaire run with 10 sentences: about 3k input and 2.5k output tokens
  (with reasoning), about $0.0008, or **about 0.02 Kč**.
- One on-demand explanation: about 1.5k input and 0.7k output tokens, about $0.00025,
  or **about 0.006 Kč**.
- Regenerating pros/cons for 217 schools: under $0.20.

**Accept when:**
- Local run with a valid key: 10 sentences come back, each 1–2 sentences, Czech,
  tykání, at least one sentence uses a personality answer, and no invented facts.
  Spot-check 3 runs.
- The on-demand button works for a school outside the top 10, and a second click
  costs no model call.
- No key: the button shows "Vysvětlení teď nejde vytvořit" and nothing crashes.

## Phase 6 — Gender question in onboarding (student branch only)

**Decision:** an optional question, never sexist, explained as being only for
addressing the user correctly. "Nechci uvádět" means masculine forms. The parent
branch uses vykání in the plural ("Našli jste"), which is gender-neutral, so it is
not asked.

1. **Placement:** `screens/RoleFork.jsx`. After the user picks the student role,
   reveal a compact inline row on the same screen with a smooth height and opacity
   transition (no new step):
   - Question: "Jak tě máme oslovovat?"
   - Options: "Jako žáka" / "Jako žákyni" / "Nechci uvádět".
   - Caption: "Jen abychom ti psali správně (např. „vybral/vybrala“). Nic jiného se
     z toho neodvozuje."
   - It is not required: Continue works without it, and no answer means masculine.
2. **Storage.**
   - Before an account exists, store it in localStorage next to the role (same module
     as the role).
   - After signup, save it to the profile: a new column `users.gender text check
     (gender in ('m','f'))`, nullable, with null = not given.
   - Write it through the existing onboarding flush or `PATCH /api/me`, with
     server-side validation.
   - Add it to Settings as an editable field, and include it in the GDPR export or
     erasure if those enumerate columns.
3. **Copy helper.** Add `frontend/src/lib/gender.js` with `useG()`, which returns
   `g(masc, fem)`. Masculine when unknown.
   - Replace the student-facing `(a)` / `/a` forms:
     `grep -rn "(a)\|l/a\b\|ý/á" frontend/src` (e.g. "Našel(a) jsi", "jsi viděl",
     "nejsi jistý").
   - Server messages that use "(a)" may stay neutral; rephrase them impersonally
     rather than threading gender through the API.
   - Pass gender to the AI (phase 5) as described there.
4. **Privacy policy** (`frontend/src/pages/Legal.jsx`, §2): a new bullet.
   > **Oslovení (nepovinné):** jestli tě máme oslovovat jako žáka, nebo žákyni.
   > Účel: správný tvar slov v aplikaci a ve vysvětleních k výsledkům. Základ:
   > oprávněný zájem, údaj je nepovinný a lze ho kdykoli změnit nebo smazat v
   > Nastavení.

   Also add it to the AI-provider paragraph if that paragraph lists what is sent to
   OpenRouter: only the grammatical form is sent.

**Accept when:**
- The student branch shows the row and the parent branch does not.
- The choice persists across reload and after signup.
- Copy switches gender correctly in at least onboarding, `/dotaznik` and the beta
  pop-ups.
- With no answer, the copy is masculine.

## Phase 7 — Compare bar on `/skoly`: overlap and collapse

**Bug** (screenshot): `.ss-compare-bar` (fixed, z 40) covers `.beta-floating-tools`
(fixed, z 30, bottom-right).

1. `useBottomBarSpace` (or the bar itself) writes the bar's height to
   `document.documentElement.style.setProperty('--bottom-bar-h', …)` and resets it on
   unmount or hide. `beta.css` then uses `bottom: calc(var(--bottom-bar-h, 0px) + …)`
   for `.beta-floating-tools` on desktop and mobile.
2. Add a collapse button to the bar: lucide `ChevronDown`, `aria-label` "Skrýt lištu
   porovnání".
   - Collapsed, the bar slides down (`transform: translateY(…)`, 220 ms ease-out) and
     leaves a small tab at bottom-left: "{n} {školy} k porovnání" with `ChevronUp`.
     Clicking the tab slides it back up.
   - No animation under `prefers-reduced-motion`.
   - Persist the state in localStorage as `snm.compareBar.collapsed`, read in a
     try/catch. It survives reloads and return visits.
   - Adding a new school while collapsed keeps it collapsed, but the tab count
     updates.
   - `--bottom-bar-h` follows the visible height.

**Accept when:** no overlap at 375 px or 1280 px, the slide animation runs, and the
state survives a reload.

## Phase 8 — Beta help ("?") modal cannot scroll on the landing page

**Root cause:** the landing uses Lenis smooth scroll (`pages/landing2/Landing.jsx`),
which captures wheel and touch events on `window`, so the dialog's own `overflow-y:
auto` never receives them.

**Fix:**
- Add the `data-lenis-prevent` attribute to the `<dialog>` in
  `components/Modal.jsx`. This fixes every modal.
- The landing's own wheel/touch paging handler (around line 465) must also ignore
  events whose target is inside an open `dialog`: add an early return.

**Accept when:** on `/`, opening the "?" lets the instructions scroll with the wheel,
the trackpad and touch (mobile emulation), and the landing behind does not move.

## Phase 9 — Reviews: school reviews off, site review with proper consent

**Decision:** during testing, reviews of schools are disabled (nobody but the team
would see them). The only review a tester can send is a review of the website, and it
is optional. We must be legally able to use it as social proof, anonymously (e.g.
"Student, 9. třída").

1. **School reviews off.**
   - Frontend config flag `SCHOOL_REVIEWS_ENABLED = false` in
     `frontend/src/config/features.js`. When it is off, `SchoolReviews` renders only a
     short note, "Recenze škol v testovací verzi zatím nejdou psát ani číst.", with no
     list and no form. `SectionNav` drops the reviews anchor.
   - Server: `POST /api/schools/:id/reviews` and `GET …/reviews` return 403 / an empty
     list unless `SCHOOL_REVIEWS_ENABLED=true` in env.
2. **Site review consent** (`BetaClosingQuestionnaire.jsx` step 5, the `beta_reviews`
   table). Replace the checkbox label with explicit, separate consent: unticked by
   default, and the review can be sent without it.
   > Souhlasím, že Střední na míru smí moji recenzi (hvězdičky a text, případně
   > zkrácený bez změny smyslu) bezplatně zveřejnit na svém webu, v aplikaci a na
   > sociálních sítích — bez jména, jen s podpisem „{label} · beta tester, přístup
   > zdarma“. Souhlas můžu kdykoli odvolat e-mailem na info@stredninamiru.cz a recenzi
   > pak stáhneme.

   - Parent and teacher branches: the same text in vykání.
   - Show the exact signature preview: this already exists, keep it.
   - Store `consent_text_version` (e.g. `'2026-10-08'`) and `consent_at` with the
     review: add both columns to `beta_reviews`.
   - Keep the existing rule: a review from a child under 15 is used fully anonymously,
     with no school name.
   - Never display a testimonial whose `consent_publish` is false.
   - Update `Legal.jsx` §9 so it matches this text: licence to use, shortening,
     channels, withdrawal.
   - Unfair-commercial-practice rules: when shown publicly, every testimonial keeps
     "beta tester, přístup zdarma" (the incentive disclosure). `socialProof.js` must
     show the disclosure next to any review. Add a code comment saying so.
3. **Entry point.** Besides the closing questionnaire, add a "Napsat recenzi webu"
   link in the feedback sheet's footer that opens the same review step on its own.
   Reuse the `beta_reviews` insert path with a new small endpoint, or reuse
   `submit_beta_closing`'s review part; choose the smaller diff. Allow one review per
   account; a second one updates the first.

**Accept when:**
- The school detail page shows the note and no form.
- The review API is disabled.
- The site review stores its consent version.
- A review without consent can never reach `socialProof.js`.

## Phase 10 — Feedback inbox in the top bar

Admin replies already exist (`beta_feedback.admin_reply`, `replied_at`, the `/admin`
form, and the list in `BetaFeedbackSheet`).

1. **SQL:** `beta_feedback.reply_read_at timestamptz`.
2. **Server.**
   - The tester's feedback list (the `select` near `server.js:520`) also returns
     `reply_read_at`, and `GET /api/beta/me` returns `unreadReplies` (count of
     `admin_reply is not null and (reply_read_at is null or reply_read_at <
     replied_at)`).
   - New `POST /api/beta/feedback/replies/read` sets `reply_read_at = now()` for the
     caller's replied rows. Own rows only.
3. **Layout.**
   - For testers only, add an icon button left of the settings button: lucide
     `MessageSquare`, `aria-label` "Moje zpětné vazby".
   - A dot badge shows when `unreadReplies > 0`, with the count in its `aria-label`.
   - Clicking opens the feedback sheet with the "Moje zpětné vazby" list expanded and
     scrolled into view, then marks replies read.
   - It shares BetaTools' 60 s poll. Do not add another poll.
   - Mobile: the same button in the mobile top bar.
4. **Replied items:** the reply sits under the message ("Odpověď týmu"). New replies
   are highlighted until read.

**Accept when:** the founder replies in `/admin`, the tester sees the dot within 60 s,
opening the sheet clears it, and the change persists across reload.

## Phase 11 — Remove all emoji

- Search `frontend/src`, `server.js`, `lib/`, `frontend/index.html`,
  `frontend/public` and the e-mail templates, if any are in the repo. Use the Python
  scan below, or ripgrep with
  `[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2B50}\x{24D8}]`.
- Known hits:
  - `SchoolMap.jsx:60` (🏠 home pin) → an inline lucide `House` SVG string; Leaflet
    `divIcon` html can take an SVG.
  - `Matice.jsx` 💡 (phase 3).
  - `Porovnani.jsx` ✓ and ⓘ (phase 2).
  - `Calculating.jsx` ✓◐· (phase 5).
  - `QuizQuestion.jsx:182` ✦ → lucide `Sparkle`.
  - CSS `content: '✓' / '✕'` in `landing.css`, `landing2.css` and `onboarding.css` →
    a CSS mask with an inline SVG, or keep them as typographic glyphs but force text
    presentation with `font-variant-emoji: text`. Prefer the mask so iOS can never
    render them as emoji.
- Code comments with ⚠️ may stay; they are not user-facing.

## Phase 12 — Updating the live site without disturbing testers

**Decision:** a new deploy appears to a tester only after 30 minutes without any
activity, and nothing they had is lost.

1. **Build id.** In `vite.config.js`, define `__BUILD_ID__`, and add a tiny plugin
   that writes `dist/version.json` (`{"build":"<id>"}`). No new dependency. The id is
   the git short sha from `VERCEL_GIT_COMMIT_SHA` when present, otherwise
   `Date.now()`.
2. **`frontend/src/lib/updateWatcher.js`**, started once in `main.jsx`.
   - Every 5 minutes, and on `visibilitychange` to visible, fetch `/version.json`
     with `cache: 'no-store'`.
   - Track the last activity: `pointerdown`, `keydown`, `scroll`, `touchstart`
     (passive) and visibility.
   - When the build differs **and** idle ≥ 30 min **and** no `<dialog open>` and no
     focused input:
     1. Save `{ path, scrollY }` to sessionStorage (`snm.autoReload`).
     2. Call `location.reload()`.
   - After a reload, restore the scroll position once and clear the key.
   - Drafts already survive, through `useDraft` / sessionStorage: `/skoly` filters
     and view, questionnaire drafts, matrix weights, the closing questionnaire and the
     feedback sheet. Check each one after a forced reload, and add `useDraft` to any
     open form that lacks it.
   - Never reload while the document is hidden mid-upload (feedback screenshot) or
     during Stripe redirects.
3. **Stale chunk safety.** After a deploy, lazy routes of the old build 404.
   - Handle `window.addEventListener('vite:preloadError', …)`: save state as above
     and reload once; a sessionStorage guard prevents a loop.
   - `version.json` and `index.html` must not be cached: add `headers` in
     `frontend/vercel.json` with `Cache-Control: no-store` for those two, and
     `public, max-age=31536000, immutable` for `/assets/(.*)`.
4. Add the security headers from the 2026-10-07 review (T-list in
   `reports/claude-review-2026-10-07/HANDOFF-PLAN.md`) to the same `vercel.json`
   change, if they are not already done.

**Accept when:**
- With a faked new `version.json`, an idle tab reloads after 30 min. In dev, make the
  threshold configurable through `localStorage['snm.debug.idleMs']`.
- An active tab never reloads.
- Filters, drafts and scroll survive.
- A missing old chunk triggers exactly one reload.

## Phase 12b — "Check spam" on every auth e-mail

Done by Claude on 2026-10-08:
- The signup confirmation already said it (`ConfirmEmailWaiting`).
- Added to the password-reset sent screen (`ForgotPassword.jsx`) and the e-mail
  change message (`Settings.jsx`).

If phase 9 or phase 6 adds any new "we sent you an e-mail" message, include the same
hint: "Nepřišel? Mrkni do spamu a do složky Hromadné."

## Phase 13 — Docs

- Update `CLAUDE.md` + `AGENTS.md` together:
  - The gate flow.
  - `VITE_BETA_SCHOOL_CODE`.
  - The model (Luna on flex).
  - Compare max 5.
  - Reviews off.
  - The gender column.
  - `extra_reasons`.
  - The auto-update mechanism.
- Also update `DEPLOY.md` (env tables), `.env.example`, `frontend/.env.example` and
  `docs/beta_testing_operations.md`.
- Mark this plan IMPLEMENTED with the commit list.

## Implementation commits

All commits listed here are on `origin/main`:

- Phase 1, shared-code gate: `32562fe`.
- Phase 2, comparison support to five schools: `cc5facb`.
- Phase 3, decision matrix and shared picks: `84353a4`.
- Phase 4, application-pick controls: `f146073`.
- Phase 5, on-demand school explanations: `420c690`.
- Phase 6, optional gender preference and copy: `ccfd1cc`.
- Phase 7, comparison-bar controls: `ffd9716`; cutoff and beta-flow follow-ups:
  `8f519d9`, `6e87660`, `1270070`.
- Phase 8, modal scrolling: `1a7f222`.
- Phase 9, consented beta website reviews: `ae9eaeb`.
- Phase 10, tester feedback-reply inbox: `64fc45b`.
- Phase 11, remove user-facing emoji: `9a1dec8`.
- Phase 12, delayed automatic updates: `ed4cf41`.
- Phase 12b, auth-email spam hints and shared-code decision: `e33924e`.
- Supporting incremental SQL draft for gender, explanations, reply-read timestamps
  and review consent: `4a070f2` (founder review/application remains pending).
- Phase 13, launch and operations documentation: `5ca8389`.

The independent security/privacy review noted above and all founder steps below
remain release gates.

## Founder steps (not for Codex)

These are listed in the chat reply of 2026-10-08:
- Vercel and Railway env vars.
- The new SQL.
- The single internal `beta_schools` row (`PRISTUPTESTOVACIVERZE`, ZŠ Jesenicova) and the end date (Sunday 18 October 2026, 23:59 Prague).
- Supabase redirect URLs.
- Turnstile.
- The pros/cons regeneration.
- The phone check.
