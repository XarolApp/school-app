# Plan 019 — dokončení implementace a podklady pro Claude Code review

Datum: 2026-10-05. Repo: `school-app`, větev `main`.
Poslední commit s kódem: **`c8e632e`**. Kód kroků **2–12 je implementovaný**;
místní ověření je dokončené. Nasazení stále vyžaduje aktualizované SQL,
provozní konfiguraci a ověření skutečných Supabase služeb.

Tento report nahrazuje stav „partial implementation“ z
`reports/beta-implementation-review-2026-10-05.md`. Původní report zachovává
historický rozsah první implementace. Nezávislé nálezy Claude jsou v
`reports/beta-implementation-claude-review-2026-10-05.md`.

Zakladatel potvrdil aplikaci předchozího celého SQL a výsledek kontroly **5**.
To je uživatelem oznámená kontrola přítomnosti původních pěti tabulek, nikoli
ověření aktuálních funkcí, RLS, Storage nebo nového `beta_rankings`.

## 1. Zadání pro Claude Code

> Proveď nezávislé review implementace plan 019 až po commit c8e632e.
> Nejprve přečti AGENTS.md, schválený plans/019-beta-feedback-and-analytics.md,
> plans/016-beta-testing-program.md a docs/beta_testing_logic.md. Před UI review
> přečti design/DESIGN.md a docs/sources/claude_code_ui_ux_guide.md. Použij
> model/effort podle aktuálního model gate v AGENTS.md pro Claude review.
>
> Rozhodnutí v tabulce plánu jsou schválená. Full rankings jsou explicitní
> rozhodnutí zakladatele z a039c63, nikoli nevyřešený konflikt.
> Přečti původních deset nálezů Claude a zkontroluj jejich skutečné opravy.
> Pak zkontroluj celé nové pořadí škol, devět admin přehledů, CSV exporty,
> právní text a opravy z browser QA. Tento report nepovažuj za důkaz správnosti.
>
> Priorita: soukromí nezletilých, nulové události běžných uživatelů, beta bez
> Stripe, serverový ADMIN_EMAILS guard, atomická obnova přístupu, časové hranice,
> SQL migrace/idempotence/RLS/granty, vlastnictví screenshotů a pořadí škol,
> pravdivé matchingové metriky, bezpečné CSV a UI regrese/přístupnost.
> Zvlášť prověř setAccount/profile refresh/pagehide/useLayoutEffect,
> anonymní → přihlášené spojování, frontu pořadí při změně účtu a opakované
> odeslání. Hodnocení mikro otázky je záměrně společné pro oba scorery.
>
> Spusť npm test v rootu a npm run lint / npm run build ve frontend/. Místní
> reprodukce se syntetickými daty je popsána v scripts/beta-preview/README.md.
> Nikdy nečti ani nevypisuj .env. Pro review neaplikuj SQL do produkce,
> nevytvářej živé testery, neposílej e-maily, nevolej Stripe ani nečerpej
> OpenRouter. Nedělej implementační změny bez dalšího zadání.
>
> Výstup: nejprve konkrétní nálezy podle závažnosti, file:line, dopad,
> reprodukce/odůvodnění a navržená oprava. Odděl potvrzené chyby od chybějícího
> ověření živého prostředí. Nevyvozuj správnost SQL transakcí z místních fixture.

## 2. Build order a commity

Každý dokončený implementační krok byl samostatně commitnutý a pushnutý na
`origin/main`. Commit messages obsahují atribuci
`Co-Authored-By: Codex <noreply@openai.com>`.

| Krok | Commit | Co bylo postaveno |
|---|---|---|
| 1 (již hotový) | `8f375ee` | Simulace obou scorerů; znovu neimplementována |
| 2 | `c378a06` | Idempotentní BETA ANALYTICS BLOCK, privátní tabulky/RLS, rozšíření beta_feedback, Storage bucket |
| 3 | `43eab68` | OpenRouter usage: tokeny, skutečně vrácený náklad, neúspěšná volání; server i generátory |
| 4 | `76aaa1e` | Beta tracker, allowlist, props limit, event RPC, instrumentace a checklist |
| 5 | `743befd` | Role + povinné seznámení s beta notice před registrací |
| 6 | `210f1c0` | Šest obrazovek pokynů, checklist a opětovné otevření přes otazník |
| 7 | `fc376d2` | Tři režimy feedbacku, výběr místa, návrh textu, maskovaný snímek s náhledem/odebráním |
| 8 | `0d22c11` | Mikro otázky, varování před expirací, soft gate přes existující feedback RPC |
| 9 | `02067ad` | Pět částí závěrečného dotazníku a privátní nepovinná recenze |
| Opravy review | `e679fb1` | Nálezy 1–10; 107 testů, lint/build prošly |
| Schválený doplněk Matching | `3503dee` | Úplná pořadí obou scorerů; 110 testů, lint/build prošly |
| 10 | `174cb21` | Devět admin záložek, server guard, SVG grafy, 39 CSV exportů; 118 testů, lint/build prošly |
| 11 | `135a2c6` | Beta sekce privacy policy; DRAFT a zbývající DOPLNIT zachovány; 118 testů, lint/build prošly |
| 12 | `c8e632e` | Browser ověření, lokální fixture prostředí, důkazy a QA opravy; 121 testů, lint/build prošly |

Souběžné zakladatelovy commity nejsou součástí tohoto autorství. Například
`a922587` upravil matching samostatného dotazníku, `a039c63` schválil full
rankings a `a72dbde` doplnil provozovatele do Legal.jsx. Pozdější záznamy
Brevo/plan 018 v UNFORGET byly zachovány. Při review používej jednotlivé
implementační commity, ne nerozlišený diff celého main.

## 3. Opravy deseti nálezů Claude

| Nález | Oprava a regresní pokrytí |
|---|---|
| 1: tracking před notice | Lookup bez ticketu; start až po role + accepted; account i SQL vyžadují consent_tracking_at; fronta nic před notice neukládá |
| 2: NULL cutoff → deadline signup | JS i SQL vrací NULL pro NULL/past ends_at; oprava dříve uloženého chybného deadline; SQL text assertions + JS test, živé SQL dosud neověřeno |
| 3: společná quota | Odděleně feedback/screenshot/micro 20/h, gate/closing 10/h; micro ask se nepočítá |
| 4: ztracená mikro otázka | Nedokončená otázka se obnoví ve stejné relaci nebo převezme v nové; dokončená se neopakuje |
| 5: duplicitní navigace | createBetaNavigation jednou pro pathname; refresh účtu nepřehrává view/open; nový pagehide flush před unload |
| 6: prázdné hledání | Checklist vyžaduje search.length > 0 v JS i SQL |
| 7: příliš otevřený endpoint | 60 požadavků/min; 24h cache názvů škol a sdílení právě probíhajícího načtení |
| 8: změna vlastníka fronty | Neúspěšná dávka se vrátí pouze stejnému účtu; běžný účet frontu a beta návštěvu smaže |
| 9: HMAC secret | Samostatný BETA_TICKET_SECRET; produkce nepoužije service key jako fallback |
| 10: osiřelé snímky/polling | Denní service-only výběr objektů starších 24h bez feedback odkazu a Storage.remove; polling /beta/me 60s |

Opravy nejsou označené jako znovu nezávisle schválené. To je úkol dalšího review.

## 4. Implementační mapa a invarianty

### SQL, přístup, tracking a snímky

- `supabase-setup.sql`: nový delimited blok. Původní exclusive
  `subscription_status='beta'`, potvrzení e-mailu, rolling 48h a cutoff zůstávají.
  Přijatý feedback obnovuje přístup přes původní atomický RPC. Mikro/gate jej
  volají; pouhé otevření UI, skip ani dokončení platební ukázky neobnovuje přístup.
- `lib/betaAnalytics.js`, `frontend/src/lib/betaTrack.js`, `BetaTracking.jsx`,
  `betaNavigation.js`: allowlist, 2KB props, redakce tokenových cest, žádné
  e-maily/hesla/raw answers/body points v událostech. Běžný účet nikdy není aktivní.
  Refresh stejného beta profilu pozastaví nové události, ale nezahodí starou dávku.
  Eligibility a navigace se nastavují před paint, aby rychlý přechod neztratil view.
- `lib/betaMaintenance.js`: purging events po cutoff + 6 měsíců a skutečné
  odstraňování osiřelých Storage objektů. Neodstraňuje přijatý feedback/recenze.
- `BetaFeedbackSheet.jsx`, `betaCapture.js`: html2canvas je jediná nová přímá
  závislost; dynamický import pouze při označeném místě a explicitní přípravě
  náhledu. Maskuje input/textarea/data-private před capture. Upload nastává až
  při odeslání přes server-issued URL do private beta-screenshots. Server ověřuje
  vlastníka, MIME a velikost. Admin získá krátce platný signed read URL.
- Layout, Settings a SubscriptionExpired nyní označují identitu účtu
  `data-private`; screenshot test a skutečný náhled ověřují zakrytí.

### Celá pořadí škol

- `beta_rankings`: soukromá šestá tabulka; user FK/cascade, source, run_id,
  capture_id, pole ID škol, created_at. Neobsahuje odpovědi ani skóre bodů.
- `lib/questionnaire.js` počítá celé pořadí před top-10 zkrácením. `server.js`
  persistuje pro beta účty po dokončení běhu; veřejná odpověď fullRanking nevrací.
- `lib/betaRankings.js`: server validace odlišných kladných ID, limit 1000,
  kontrola skutečných škol a identity/source na serveru.
- `Reveal.jsx`, `frontend/src/lib/betaRankings.js`: skutečné klientské pořadí
  úvodního scoreru; fronta max. 5/24h, retry a deduplikace, oddělení vlastníků,
  odložená beta registrace s notice/ticketem. Demo pořadí se neodesílá.
- Matching počítá průměr, populační směrodatnou odchylku a podíly top/bottom
  ze všech pořadí obsahujících konkrétní školu. Oba zdroje jsou oddělené.
  Nejnovější reports/matching-simulation-*.json se vybere podle mtime/názvu.
  Mikro hodnocení je globální, protože původní odpovědi neobsahují source.

### Admin a legal

- `server.js`: requireAdmin po requireAuth; zvláštní serverová ADMIN_EMAILS
  allowlist (trim/lowercase). DEVELOPER_EMAILS žádné admin oprávnění nepřidává.
- `lib/betaAdminRoutes.js`: devět read rout, CSV, feedback detail/PATCH,
  review PATCH, samostatný e-mail endpoint na click. Privátní cache max. 30s
  s invalidací po změně feedbacku/recenze. Server provádí všechna čtení/agregace.
- `lib/betaAdmin.js`: pseudonymy, žádný běžný export e-mailů nebo raw event props,
  bezpečné CSV s BOM, quotes/newlines a neutralizací formule =/+/−/@.
  Van Westendorp vyřadí nekonzistentní pořadí prahů pouze z křivek, nikoli ostatních
  odpovědí; křivky a průsečíky mají testy. Menší vzorek není záruka tržní ceny.
- `Admin.jsx`/`admin.css`: lazy route v Layout, skrytá navigace, 403,
  číselné karty/sparkline, SVG sloupce/funnel/scatter/cenové křivky, vlastní
  horizontální scroll tabulek, drawer se snímkem/rect a before→after textem.
  Každá z 39 tabulek má CSV. Nesouhlasící recenzi nelze vybrat, nic se samo
  veřejně nepublikuje. Identita e-mailu se načítá teprve samostatným tlačítkem.
- `Legal.jsx`: Beta testování, oprávněný zájem, notice, retenční doba, námitka,
  local/session beta identifikátory, screenshoty a samostatný nepředvybraný
  souhlas s anonymní recenzí / zveřejněním pobídky. DRAFT a placeholders zachovány.
- Nové beta texty používají tykání/vykání; i registrace/confirmation se přizpůsobí.
  Přesná požadovaná věta „V betě nic neplatíš“ je v platební náhradě.
  Obecné starší stránky typu Settings/Přihláška nadále používají své původní
  studentské oslovení; nebyl proveden přepis copy celého produktu.

## 5. Co bylo ověřeno

### Automatické kontroly

- Poslední `npm test` v rootu: **121/121 pass**, 0 fail/skip.
- `frontend/npm run lint`: **0 errors, 8 stávajících warnings**.
- `frontend/npm run build`: **pass**. Admin je samostatný lazy chunk;
  html2canvas má samostatný 199.49KB chunk. Vite hlásí již velké hlavní/Landing
  chunky; v tomto plánu se celý frontend nerozděloval.
- `git diff --check`: pass.
- Cílené soubory: beta-analytics, beta-admin, beta-closing, beta-capture,
  beta-rankings, beta-review-fixes, ai-usage a server-boundaries tests.
- Pokrytí: allowlist/2KB/privacy, normální účet zero events, admin 401/403
  včetně developer e-mailu, profil bez notice, deadlines, renewal micro/gate,
  kvóty, cache, vlastník screenshotu/rankingu, CSV formule/quotes/newlines,
  seed determinism, full-ranking statistiky, cenové průsečíky, masking.
- Grep prošel všechna instrumentační místa; nálezy `body.run.id`,
  `body.run.matches.school_id` a favorite schoolId jsou odpovědi API/ID,
  nikoli questionnaire body points nebo volný text. Server navíc props filtruje.

### Skutečný Chrome: 390×844 a 1280×900

Použit skutečný frontend a Express handlery s disposable loopback fixture
službami. **Žádná živá databáze, skutečné e-maily, Stripe ani placená AI.**
Nejde o ověření živého Supabase. Auth potvrzení a čas se měnily pouze toolbar
nástroji pro místní testy. SQL RPC a Storage podpisy jsou mockované.

| Scénář | Výsledek |
|---|---|
| Čerstvá student/rodič registrace | Role, notice, potvrzovací UI a šest pokynů; pro rodiče vykání |
| Checklist | Vyhledávání, 3 odlišné detaily, compare, váha matice, přihláška, téma, share a všech 5 paywall obrazovek; zobrazeno 9/9 |
| Skutečné scorery | Samostatný dotazník i úvodní Q1–Q11 dopočítaly a persistovaly celých 30 fixture škol; samostatné UI ponechalo prvních 10 |
| Feedback general | Přijatá zpráva a obnovení 48h přes reálný serverový handler |
| Feedback marked | Výběr prvku na telefonu i desktopu, dynamický capture, náhled, odebrání a opětovná příprava, upload + submit |
| Screenshot privacy | Zakrytý hledací input; po QA opravě celý profil/jméno/e-mail i navbar identity zakryté v náhledu |
| Feedback text | Edit v místě, before→after uložení, původní text po zavření obnoven |
| Mikro otázka | Compare/result, answer; nedokončená compare otázka se po reload obnovila |
| Expirace | Varování v 12h okně; expired protected route → soft gate; odpověď → obnovení a pokračování |
| Paywall | Hodnota→cesta→plan→zkusebni→platba; student i rodič; beta náhrada checkoutu |
| Closing | Všech 5 částí včetně cen/témat/ratingů; student s recenzí a explicitním souhlasem, rodič bez recenze |
| Admin desktop | Všech 9 záložek, karty/grafy/table, 6 filtrů, marked drawer, status/note/reply, souhlas při výběru recenze, e-mail jen na click |
| Odpověď testerovi | Tester vidí odpověď týmu a status; soukromá poznámka chybí |
| Admin telefon | Všech 9 záložek; šířka dokumentu 390px, každá tabulka má CSV; drawer se snímkem |
| Normální účet | Hledání→detail→compare→admin 403; beta button chybí; 72s pozorování po poslední opravě: 0 event requests / 0 event rows |
| Stripe | Counter/trap: **0 calls** za celý uchovaný testovací běh; skutečné checkout guardy navíc testované v server-boundaries |
| CSV | Skutečný browser download beta-feedback--messages.csv + HTTP kontrola všech **39 exportů: 200, UTF-8 BOM** |

Během QA se backend několikrát restartoval a první mobilní fixture stav byl
nahrazen. Tabulka uvádí ověřené průchody napříč těmito místními běhy; výsledné
počty v runtime JSON nejsou celkový počet všech kliknutí celé implementace.
Scénář closing mění stáří/core checklist kvůli simulaci dne 2; skutečný výpočet
obou dotazníků byl ověřen zvlášť. NPS, ceny a matching delty z fixture nejsou
reálná produktová data.

### QA opravy v kroku 12

- Mobilní feedback controls překrývaly „Přeskočit otázku“; vyhrazen prostor
  v beta onboarding a přesunuté controls. Ověřen postup Q8→Q9→Q11.
- Pokyny čekají na uložení acknowledge před zavřením/navigací.
- Pagehide flush; zachování fronty při refreshi stejného beta profilu;
  layout effects zabrání ztrátě view při velmi rychlém přechodu.
- Privátní identity označené pro masking, se dvěma regresními testy.
- `ss-input` napojený na existující tokenové form primitives; původně chyběl
  selector a nativní select/textarea nesledovaly vzhled produktu.
- Funnel ukazuje všechny kroky včetně Q11 a české názvy, ne jen 12 bars.
- Parent confirmation/landing/closing title opravené, české věkové skupiny,
  odstraněn vnořený main na admin.
- Calculating již netvrdí, že odpovědi nikdy neopouštějí prohlížeč: existující
  onboarding-answers ukládá odpovědi přihlášeného účtu. Lokální výpočet zůstal.

Důkazy: `reports/beta-verification-2026-10-05/` obsahuje JPEG náhledy,
`runtime-verification.json` (žádné osobní údaje/UUID) a
`csv-verification.json` (39 exportů). Lokální preview má vlastní README,
výhradně syntetická data, oddělený Vite config a není v produkčním buildu.

## 6. SQL — nutné před nasazením

**Zakladatel musí znovu vložit celý aktuální `supabase-setup.sql` do Supabase
SQL editoru.** Výsledek 5 byl správný pro původních pět tabulek; novější commity
upravují funkce a přidávají soukromé `beta_rankings`. Dílčí paste bloku nestačí.

Kontrola z plánu §5 (očekáváno **5**):

```sql
select count(*) from information_schema.tables
where table_name in ('beta_events','beta_profile','beta_closing_answers','beta_reviews','ai_usage_log');
```

Další kontroly po reapplication:

```sql
-- Nová sixth table: očekáváno 1.
select count(*) from information_schema.tables
where table_schema = 'public' and table_name = 'beta_rankings';

-- Očekáváno 6 řádků, všude relrowsecurity = true a browser_policies = 0.
select c.relname, c.relrowsecurity,
  (select count(*) from pg_policies p
   where p.schemaname = 'public' and p.tablename = c.relname) as browser_policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in
  ('beta_events','beta_profile','beta_closing_answers','beta_reviews','ai_usage_log','beta_rankings');

-- Očekáváno anon_can/authenticated_can = false, service_can = true.
select p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_can
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in
  ('record_beta_events','submit_beta_feedback_details','submit_beta_micro',
   'submit_beta_closing','beta_closing_deadline','sync_beta_closing',
   'purge_beta_events','beta_screenshot_orphans');

-- Očekáváno private bucket (public=false), limit 1572864, PNG/JPEG.
select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'beta-screenshots';
```

SQL regresní kontrola NULL/past ends_at — spouštět pouze v izolovaném testovacím
Supabase/PostgreSQL prostředí s existujícím beta fixture účtem. Změna je uvnitř
transakce a na konci rollback; nenechávat transakci otevřenou:

```sql
begin;
update public.beta_program_settings set ends_at = null where singleton;
select count(*) as bad_deadlines
from public.users u where u.subscription_status = 'beta'
  and public.beta_closing_deadline(u.id) is not null; -- očekáváno 0
update public.beta_program_settings set ends_at = now() - interval '1 hour' where singleton;
select count(*) as bad_deadlines
from public.users u where u.subscription_status = 'beta'
  and public.beta_closing_deadline(u.id) is not null; -- očekáváno 0
rollback;
```

Tato SQL kontrola **nebyla provedena**. Lokální psql není dostupné a živé
databázové credentials nebyly inspektované. User-reported count 5 ji nenahrazuje.

## 7. Co zbývá a co report netvrdí

- Aplikovat aktuální celé SQL a ověřit nové funkce, šestou tabulku, granty,
  RLS a private bucket. Re-run celého souboru i reálné lock/transaction chování
  nebyly v místním mocku ověřeny.
- Skutečný Supabase signup trigger s novou role/notice metadata, doručení a
  potvrzení e-mailu, signed upload/read, MIME/size enforcement a Storage cleanup
  musí projít ve skutečném testovacím prostředí.
- Konfigurovat server-only ADMIN_EMAILS a produkční BETA_TICKET_SECRET,
  rozhodnutý program cutoff/school invitation codes a SMTP. `.env.example`
  je dokumentuje; žádné .env contents nebyly čtené/vypisované ani commitované.
- Nové admin/full-rankings/legal/QA změny zatím nemají další nezávislé review.
- Právní kontrola anonymních recenzí pod 15 let před prvním veřejným použitím
  zůstává dle schváleného plánu. DRAFT/DOPLNIT stále brání tvrzení, že právní
  podklady jsou finální.
- Žádné živé nasazení, Stripe platba, skutečný tester recruitment, účtování
  OpenRouter ani zveřejnění recenzí nebyly provedeny.
- Záměrně nebyly měněny scoringové biasy, veřejné analytics běžných uživatelů,
  plán 018/Stripe customer issue ani další souběžné položky v UNFORGET.

Kód požadovaného plánu je připravený k nezávislému review. **Produkční rollout
je stále pending**; uvedené chybějící kontroly nejsou prezentované jako hotové.
