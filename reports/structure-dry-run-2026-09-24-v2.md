# Structure dry run — v2 (2026-09-24 request; run 2026-09-26)

> **Historical status of this v2 attempt: INCOMPLETE.** These recorded runs updated no school row and ran no SQL. The requested Luna xhigh attempts failed on Supabase reads before inference. Earlier low-effort diagnostics reached OpenRouter and received HTTP 401 (`API key expired`). This attempt produced no paired 20-school output; those dated failures do not establish a current service or key failure.
>
> **Review update, 12 October 2026:** later dry/write logs contain completed 219-school outputs, independently accounted for in [the complete historical log review](deployment-review-2026-10-07/structure-v3-complete-log-review-2026-10-11.json). They do not retroactively complete the xhigh pairs below or prove current source correctness. The projections, rules and recommendations in this document describe its historical v2 snapshot. Current data/source/campus and release gates are tracked in [the deployment report](deployment-review-2026-10-07/REPORT.md) and [handoff plan](deployment-review-2026-10-07/HANDOFF-PLAN.md).

This report uses `ma_jidelnu` to mean **students can get lunch through the school**: either the school has its own canteen or it explicitly arranges lunch elsewhere. Each positive includes a short reported case (`vlastní jídelna` or `zajištěno jinde`) for later UI wording; that case is validation/report metadata, not a new database column.

## Execution status

| Attempt | Model / effort | Result | Schools processed |
|---|---|---|---:|
| Requested run 1 | `openai/gpt-6-luna`, xhigh | Failed reading the cached school rows: `TypeError: fetch failed`; no model request was made. | 0/20 |
| Requested run 2 | `openai/gpt-6-luna`, xhigh | Same Supabase read failure before the school loop; no model request was made. | 0/20 |
| Earlier diagnostic 1 | `openai/gpt-6-luna`, low (configured default) | School 10 request received OpenRouter HTTP 401: API key expired; run stopped before any model response. | 0/20 |
| Earlier diagnostic 2 | `openai/gpt-6-luna`, low (configured default) | Same HTTP 401 on school 10; run stopped before any model response. | 0/20 |

Both requested xhigh attempts are the stability runs for this report. The two lower-effort diagnostics are recorded only to show the provider condition; they do not count as run 1 or run 2. The v2 script was invoked with `--dry-run --force`, and its dry-run guard prevented updates. The `--force` flag was used only so pre-existing structured values would not exclude a target from the diagnostic; no write path ran.

## Fixes applied

1. **Report note initials:** v1 had three `ropped` entries and one `ept` entry; all four affected report lines are corrected to `Dropped` / `Kept`. The extractor contains no separate Markdown report writer and no first-character slicing: its logger prints the complete note string (`'  note: ' + note`). The defect was in the v1 report transcription. The v2 entries below retain the full note text if/when model output is available.
2. **Club counts:** removed all list counting. `pocet_krouzku` now accepts only one unambiguous explicit numeric count attached to kroužky/kluby/aktivity, within the existing numeric bounds. `více než N` stores N and adds a lower-bound note. Otherwise null.
3. **Lunch:** whole-school lunch availability can be provided on-site or explicitly arranged elsewhere. Explicit no-meals evidence gives false; “no own canteen” alone does not. A statement limited to one study track/building gives null with a reason. Case note is `vlastní jídelna` or `zajištěno jinde`.
4. **Accommodation:** true requires school-provided accommodation or an explicitly named, directly arranged partner dorm. A broad denial gives false. “No own dorm” followed by a general city dorm list remains null. It is marked display-only below.
5. **Club categories:** only explicit activity-domain words support a category. A regular named activity/course may support its domain; named sports and `sportovní kurzy` support sport; an olympiad supports `veda_debata` only when its subject is stated. Generic `exkurze`, `akce`, `projekty`, trips, and one-off events without domain words support no category. A text with no supported category produces `[]`; no club text produces null.
6. **University continuation:** unchanged: only an explicit percentage from `vs_uplatneni`, bounded 0–100. Display-only below.

Local rule checks (separate from the failed model runs) confirmed the reported edge cases: school 10 lunch true / `zajištěno jinde`; school 16 lunch null because its statement is limited to “U oboru Sportovní management”, and its `sportovní kurzy` support `sport`; school 19 accommodation null for “no own dorm” plus general city dormitories; school 23 lunch true / `zajištěno jinde` and accommodation false from its whole-school denial. Explicit count examples checked: “nabízíme 25 kroužků” → 25; “více než 20 zájmových kroužků” → 20 with a note; a countable list alone → null. These are local rule checks, not outputs from either model run.

## Target sample and per-school inputs / paired results

The first ten IDs are the original sample: `10, 13, 16, 19, 23, 26, 42, 43, 47, 48`. The ten additional schools were selected from cached database rows with non-empty stored text in all four source fields, then ranked by combined text length: `20, 27, 86, 37, 35, 82, 22, 62, 123, 95`. Each new school has stored text in `obedy_ubytovani`, `krouzky_aktivity`, `vyukovy_styl_detail`, and `vs_uplatneni`. Inputs below are the trimmed text that would be passed to the structurer (stored text first; cached Markdown only where stored text was empty/rejected).

**Run 1 / Run 2 values:** `UNAVAILABLE` means no model result was returned. It is not null and must not be counted as `BOTH_NULL`. Requested xhigh runs did not enter the school loop; prior low-effort diagnostics stopped at school 10 with HTTP 401. “Intentionally nulled” is therefore **not evaluated** for every school/field.

### 10 — Střední škola mediální grafiky a tisku, s. r. o.

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Stravování je zajištěno v blízké SOU Čakovice a případné ubytování v blízkém DM (4-6 zastávek busem).
~~~

- `krouzky_aktivity` → stored text:

~~~text
Nepovinná němčina, seznamovací kurz pro prvňáky, maturitní ples a imatrikulace prvních ročníků, poslední zvonění, návštěva významných výtvarných a fotografických výstav v Praze, pražská florbalová liga, pingpongový turnaj, lyžák v rakouských Alpách, turnaj v malé kopané, florbalový turnaj na konci školního roku, Hervis půlmaraton Praha, Foto+Grafická soutěž studentů školy, účast na soutěži Artis Pictus, fotografické kurzy, školní galerie foto+grafických prací, soutěž mladých grafiků, účast na soutěži Doteky papíru, půjčování knížek o fotografii a grafice.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Praktické dovednosti, kreativní přístup, práce s moderními nástroji a portfoliem. 30% vyučování tvoří odborný výcvik (praxe) v malých skupinách (max. 7 studentů). Studenty učíme pracovat s nejmodernějšími nástroji s maximálním využitím AI pro zrychlení práce a získání inspirace.
~~~

- `vs_uplatneni` → stored text:

~~~text
Mladší absolventi studují na Vysoké škole uměleckoprůmyslové: Ondřej Brom, Vítek Škop a Tomáš Cikán.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 13 — Škola mezinárodních a veřejných vztahů Praha, Střední odborná škola, Gymnázium, s. r. o.

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Obědy jsou dostupné v budově školy
~~~

- `krouzky_aktivity` → stored text:

~~~text
Škola uvádí studentské projekty Erasmus+, Diplomatické fórum, Právo na vlastní oči, Sociální sítě a média, EPAS a simulace soudního jednání v angličtině; pořádá také zahraniční zájezdy.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Výuka zahrnuje odborné projekty a škola uvádí zážitkovou pedagogiku; některé odborné předměty se vyučují v angličtině.
~~~

- `vs_uplatneni` → stored text:

~~~text
Škola uvádí, že 81 % studentů odchází na vysoké školy v ČR i zahraničí. Mezi uvedenými absolventy jsou studenti psychologie, historie na FF UK, mezinárodních vztahů – asijských studií na MU, práv a mediálních studií.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 16 — ART ECON – Gymnázium a Střední odborná škola Praha, s. r. o.

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
U oboru Sportovní management je uvedena jídelna se samoobsluhou včetně snídaní.
~~~

- `krouzky_aktivity` → stored text:

~~~text
Škola pořádá sportovní kurzy, turnaje, olympiády a soutěže; organizuje také exkurze a výstavy. Součástí výuky jsou jazykové a tematické pobytové zájezdy do zahraničí.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Škola popisuje moderní výuku propojenou s praxí, malé pracovní skupiny, individuální rozvoj a u sportovců individuální studijní přístup umožňující skloubit studium se sportovní přípravou.
~~~

- `vs_uplatneni` → stored text:

~~~text
Gymnázium připravuje na vysoké školy; u sportovního gymnázia jsou zmíněny zejména VŠ zaměřené na tělesnou výchovu, sportovní management či související obory. Konkrétní školy ani podíl pokračujících nejsou uvedeny.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 19 — Střední průmyslová škola stavební Josefa Gočára, Praha 4, Družstevní ochoz 3

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Obědy: 53,- Kč pro žáky.
~~~

- `krouzky_aktivity` → stored text:

~~~text
Výtvarný ateliér, kreativní ateliér, muzikoterapie, posilovna, stolní tenis, tenis, volejbal.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Moderní výuka s BIM projektováním, praxí ve stavebních firmách, licencemi AutoCAD a ArchiCAD zdarma po dobu studia, procházkami za architekturou.
~~~

- `vs_uplatneni` → stored text:

~~~text
Žáci jsou úspěšní při absolvování dalšího studia na technických univerzitách, především na ČVUT v Praze.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 23 — Gymnázium a Sportovní gymnázium se zaměřením na esporty, s. r. o.

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
V areálu vedle gymnázia je jídelna s nabídkou různých jídel včetně vegetariánských variant.
~~~

- `krouzky_aktivity` → stored text:

~~~text
Sportovní gymnázium nabízí seznámení se sporty, například atletikou, fitness, jógou, pilates, parkourem, lezením, bojovými sporty, basketbalem, fotbalem, florbalem a beachvolejbalem. Zmiňuje také mimoškolní sportovní aktivity.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Výuka je popsaná jako aktivní, projektová, praktická a interaktivní, s individuálním přístupem; propojuje všeobecné vzdělání, sport a digitální technologie.
~~~

- `vs_uplatneni` → stored text:

~~~text
Škola připravuje studenty na přijímací řízení na VŠ; uvádí přípravu na vysokoškolské studium humanitní nebo přírodovědné u všeobecného gymnázia a sportovní nebo nesportovní u sportovního gymnázia.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 26 — Střední průmyslová škola zeměměřická a Geografické gymnázium Praha

**Inputs**
- `obedy_ubytovani` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `krouzky_aktivity` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `vyukovy_styl_detail` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `vs_uplatneni` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 42 — The English College in Prague – Anglické gymnázium, o. p. s.

**Inputs**
- `obedy_ubytovani` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `krouzky_aktivity` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `vyukovy_styl_detail` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `vs_uplatneni` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 43 — Vyšší odborná škola informačních studií a Střední škola elektrotechniky, multimédií a informatiky

**Inputs**
- `obedy_ubytovani` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `krouzky_aktivity` → cached markdown fallback (stored value empty/rejected); fallback decision: stored field is null/empty:

~~~text
Tady najdete všechny důležité údaje o chystaných aktivitách jako například dny otevřených dveří, projektové dny a také fotogalerii z uplynulých akcí.
10.50 – 12.05 Český jazyk
kole přijímacího řízení povinné absolvování jednotných písemných testů z matematiky a českého jazyka.
ročníku z předmětů český jazyk, cizí jazyk, matematika, fyzika ( s dvojnásobným započítáváním hodnocení z M a Fy).
ročníku a z průměru prospěchu v předmětech český jazyk a matematika.
ročníku z předmětů český jazyk, matematika, fyzika s dvojnásobným započítáváním hodnocení z M a Fy.
~~~

- `vyukovy_styl_detail` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `vs_uplatneni` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 47 — Gymnázium Jiřího Gutha-Jarkovského, Praha 1, Truhlářská 22

**Inputs**
- `obedy_ubytovani` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `krouzky_aktivity` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `vyukovy_styl_detail` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `vs_uplatneni` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 48 — Gymnázium, Praha 10, Voděradská 2

**Inputs**
- `obedy_ubytovani` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `krouzky_aktivity` → cached markdown fallback (stored value empty/rejected); fallback decision: stored field is null/empty:

~~~text
Anglický jazyk Biologie
Můžete se těšit na večer plný hudby, zpěvu, divadla, tance či recitace v podání našich studentů a absolventů.
března od 18:30** ve Strašnickém divadle Praha Adverte, jemuž tímto velice děkujeme za spolupráci.
Vstupenky zakoupíte na www.colosseumticket.cz nebo www.strasnicke-divadlo.cz.
Popis závazné realizace zkoušky z českého jazyka a literatury pro rok 2027.pdf (623.34 kB)
Certifikované zkoušky k nahrazení maturitních zkoušek z cizího jazyka 2027.pdf (485.98 kB)
Maturitní témata-anglický jazyk.pdf (483.71 kB)
Maturitní témata-německý jazyk.pdf (158.42 kB)
Maturitní témata-francouzský jazyk.pdf (247.2 kB)
Maturitní témata-španělský jazyk.pdf (436.61 kB)
Popis závazné realizace zkoušky z českého jazyka a literatury pro třídy OA, OB, OC a 4.
Anglický jazyk.pdf (480.36 kB)
Německý jazyk.pdf (238.55 kB)
Francouzský jazyk.pdf (247.38 kB)
Španělský jazyk.pdf (437.41 kB)
Seznam certifikovaných zkoušek určených k nahrazování zkoušek z cizího jazyka 2026.pdf (492.04 kB)
**Písemná práce z českého jazyka a literatury** v pondělí 1.
**písemná práce ze španělského jazyka** v úterý 2.
Anglický jazyk.pdf (478.92 kB)
Francouzský jazyk.pdf (180.88 kB)
Španělský jazyk.pdf (437.22 kB)
Seznam certifikovaných zkoušek určených k nahrazování zkoušek z cizího jazyka 2025.pdf (489.58 kB)

### Další informace k maturitní zkoušky z českého jazyka a literatury
Popis závazné realizace zkoušky z českého jazyka a literatury pro třídy OA, OB a 4.
Seznam certifikovaných zkoušek určených k nahrazování zkoušek z cizího jazyka 2024.pdf (490.83 kB)
Anglický jazyk.pdf (323.48 kB)
Španělský jazyk.pdf (437.64 kB)
Aktivity » Fotky z akcí
Aktivity » Úspěchy studentů
Aktivity » Projekty
Aktivity, projekty - Gymnázium, Praha 10, Voděradská 2
ROS GV » Aktivity, projekty

## ROS - aktivity, projekty
Workshop trval dvě vyučovací hodiny, studenti se zúčastnili aktivity, která je vede k empatii a uvědomění si, že každý má startovací čáru někde jinde a sociální stratifikace je velmi pestrá.
~~~

- `vyukovy_styl_detail` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `vs_uplatneni` → no usable fallback text; fallback decision: stored field is null/empty:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 20 — Střední škola dostihového sportu a jezdectví

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Škola nabízí stravování ve vlastní školní jídelně.
Ceny stravování jsou uvedeny v dokumentu "Informace o cenách strava 2026_27.pdf".
~~~

- `krouzky_aktivity` → stored text:

~~~text
Ve volném čase mohou žáci využít učebnu PC, stolní fotbal, venkovní stůl na stolní tenis, minitělocvičnu, či místnost s dostihovými trenažery. Funguje zde několik zájmových kroužků: počítačový, kulturní, sportovní, výtvarný a kroužek rukodělných aktivit na aktuální témata.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Škola klade velký důraz na praktické vzdělávání. Praxi žáci absolvují u významných trenérů po celé ČR a mohou se zúčastnit odborných stáží ve vrcholových výcvikových centrech v zahraničí. Škola má povolenou odlišnou organizaci školního roku pro výuku praktického vyučování ve dnech pracovního volna, pracovního klidu, svátků a školních prázdnin. Obor Jezdec a chovatel koní zahrnuje profilové předměty: chov koní, chov zvířat, teorie jízdy, technická zařízení, výživa a krmení, dostihový řád a provoz, životospráva jezdce, pravidla jezdeckých soutěží, odborný výcvik.
~~~

- `vs_uplatneni` → stored text:

~~~text
Po absolvování oboru Chovatelství se zaměřením na dostihový sport je možnost pokračovat ve studiu na vyšších odborných nebo vysokých školách. Po absolvování oboru Jezdec a chovatel koní se zaměřením na dostihový sport je možnost získání maturity v dálkovém nástavbovém studiu "Trenérství dostihových a sportovních koní".
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 27 — Střední škola knižní kultury s. r. o.

**Inputs**
- `obedy_ubytovani` → cached markdown fallback (stored value empty/rejected); fallback decision: stored field rejected as a generic/non-answer:

~~~text
Podle vyjádření obchodního ředitele Společnosti HM Gastro Group s.r.o., která provozuje menzu FTVS, došlo při schvalování zápisu společnosti do školského rejstříku k dalšímu nezaviněnému zdržení.
Podle vyjádření obchodního ředitele Společnosti HM Gastro Group s.r.o., která provozuje menzu FTVS, se zatím stále nepodařilo na MŠMT a MHMP vyjednat výjimku pro cenu obědů pro studenty naší školy.
~~~

- `krouzky_aktivity` → stored text:

~~~text
Klub mladých diváků, Klub přátel vážné hudby, zájmové kroužky, školní časopis, akademie, filmový klub.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Humanitně zaměřená střední škola. Výuka je doplněna příklady a zajímavými příběhy z praxe. Časté exkurze, návštěvy veletrhů, oborové praxe v knihkupectvích, knihovnách, nakladatelstvích, archivech a antikvariátech. Rozdělení literatury na českou a světovou literaturu. Paralelní výuka dějepisu, dějin umění, dějin filozofie, dějin hudby, dějin knižní kultury a základů psychologie, sociologie, etnologie, politologie, ekonomie a dějin náboženství.
~~~

- `vs_uplatneni` → stored text:

~~~text
Absolventi pokračují v navazujícím studiu na vysokých školách, např. Filozofická fakulta Univerzity Karlovy (obory jako Český jazyk a literatura, Dějiny, Archivnictví, Italianistika), Pedagogická fakulta Univerzity Hradec Králové (Sociální patologie a prevence), Univerzita Palackého v Olomouci (Aplikovaná psychoterapie), Fakulta multimediálních komunikací na Univerzitě Tomáše Bati ve Zlíně (režie a scénáristika).
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 86 — Střední odborná škola sociální svaté Zdislavy

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
obědy jsou zajištěny smluvně v jídelnách Ječná 27 a Sokolská 6, kde jsou uvedeny dotované obědy.
domov má jídelnu s celodenním stravováním pro ubytované.
~~~

- `krouzky_aktivity` → stored text:

~~~text
Během studia se koná třídenní adaptační kurz, tematické exkurze (např. úřady, soudní jednání, sociální zařízení či zahraniční partnerské organizace) a ve vybraných ročnících sportovně-rekreační kurz, lyžařský nebo turistický. Katolický domov studujících nabízí také posilovnu a keramickou dílnu.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Výuka propojuje teorii s praxí: probíhá v odborných učebnách a zahrnuje odborné semináře, modelové situace, projektové práce a řízenou praxi ve škole i v institucích. Při praktických cvičeních se využívá skupinová i individuální práce; důraz je na komunikaci, týmovou spolupráci a profesní etiku.
~~~

- `vs_uplatneni` → stored text:

~~~text
Absolventi mohou pokračovat na VOŠ či VŠ; u oboru Veřejnosprávní činnost především na právních, ekonomických a sociálních školách. U Sociální činnosti zejména na školách sociálních, zdravotnických a pedagogických.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 37 — Křesťanská střední škola, základní škola a mateřská škola Elijáš, Praha 4-Michle

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Škola má vlastní jídelnu, která připravuje laktoovovegetariánskou stravu dle výživových norem.
~~~

- `krouzky_aktivity` → stored text:

~~~text
Studenti se zapojují do akcí různého charakteru (kultura, sport, utužování vztahů v kolektivu). Konkrétní kroužky nejsou jmenovány.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Kombinované lyceum je založené na širším všeobecně vzdělávacím základu doplněném o základy obecně odborného vzdělávání. V 1. a 2. ročníku studenti získávají všeobecné vzdělání, od 3. ročníku si volí jedno ze dvou odborných zaměření (humanitní nebo přírodovědné). Studium propojuje teoretické studium s praktickými dovednostmi i přírodovědným a společenskovědním výzkumem. Součástí studia jsou studentské projekty a praxe.
~~~

- `vs_uplatneni` → stored text:

~~~text
Absolvent humanitního zaměření je připraven k vysokoškolskému studiu zejména humanitních oborů na filozofických, pedagogických a sociálně orientovaných fakultách. Absolvent přírodovědného zaměření je připraven k studiu na vysokých školách se zaměřením na přírodní vědy a jejich praktické aplikace (medicína, farmacie, ochrana životního prostředí, zemědělství, učitelství přírodovědných předmětů).
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 35 — Gymnázium, Praha 8, U Libeňského zámku 1

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Škola má vlastní školní jídelnu provozovanou společností PRIMIREST.
K dispozici je také vlastní kantýna pro svačiny.
~~~

- `krouzky_aktivity` → stored text:

~~~text
Škola nabízí různé volnočasové kroužky. Konkrétně je zmíněn dramaťák (herecký talent). Studenti si mohou vybrat zaměření na matematiku a IT, společenskovědní předměty, přírodovědné předměty nebo jazyky. Ve 3. ročníku si mohou vybrat z velkého množství seminářů.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Škola se zaměřuje na kvalitní vzdělání, všeobecný rozvoj člověka, silnou komunitu a vzájemný respekt. Učitelé jsou kvalitní, mají přehled a přistupují k žákům s respektem. Studium probíhá v moderním prostředí s moderním vybavením. Škola je fakultní školou Přírodovědecké a Pedagogické fakulty Univerzity Karlovy.
~~~

- `vs_uplatneni` → stored text:

~~~text
Gymnázium je především příprava na další studium na vysoké škole. Absolventi pokračují na různých vysokých školách – práva, medicína, ekonomie, jazyky, technika, informatika. Příklady absolventů: Adéla Weissová studuje fyzioterapii, Daniel Ryjant studuje obor Provoz a ekonomika na ČZU PEF, Lenka Barešová studuje Specializaci v pedagogice na Univerzitě Karlově PF.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 82 — Gymnázium Duhovka s.r.o.

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Škola nabízí obědy od externího dodavatele Goodlunch: denně dvě polévky a tři hlavní jídla, z toho jedno vegetariánské
~~~

- `krouzky_aktivity` → stored text:

~~~text
Mezi tradičně nabízené kroužky patří Theatre, Music Ensemble, Vaření a Čtenářský klub. Škola pořádá také adaptační, lyžařské, turistické a vodácké kurzy a expedice.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Výuka vychází z montessori pedagogiky: škola zdůrazňuje možnost volby, samostatnou i skupinovou práci, věkově smíšené skupiny, propojování předmětů a praktické projekty. Třífázová výuka vede od seznámení s tématem přes vlastní zkoumání k prezentaci výsledků.
~~~

- `vs_uplatneni` → stored text:

~~~text
Web uvádí, že maturanti pokračují na vysokých školách doma i v zahraničí. Konkrétně absolventi zmiňují Universidad La Salle Ramon Llull (architektura), Univerzitu Karlovu (pedagogická fakulta), UTB (filmová produkce), Vysokou školu obchodní (letecký provoz), ČVUT (stavební inženýrství) a VŠE (finance).
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 22 — GAELY – střední škola, s. r. o.

**Inputs**
- `obedy_ubytovani` → no usable fallback text; fallback decision: stored field explicitly says this topic has no information:

*No text was supplied to the structurer (stored value empty/rejected and no usable cached fallback).*

- `krouzky_aktivity` → stored text:

~~~text
Web neuvádí konkrétní seznam kroužků nebo aktivit. Jsou zmíněny školní akce (adaptační kurz, lyžařský kurz, Erasmus, exkurze), ale nejde o pravidelné kroužky.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Škola klade důraz na jazyky a nadprůměrnou kvalifikaci pro život v oblasti komunikace. Nabízí anglický, francouzský, španělský a německý jazyk, konverzaci a obchodní jazyk. Samozřejmostí je práce s výpočetní technikou. Orientuje se na mezipředmětové vztahy a podporuje vzdělávání mimo školu. Vedení k originálnímu myšlení, podnikavosti a seberozvoji.
~~~

- `vs_uplatneni` → stored text:

~~~text
Škola připravuje studenty pro studium na vysoké škole, nabízí nadprůměrnou průpravu k přijímacím zkouškám na právnické, ekonomické i přírodovědné obory.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 62 — Heřmánek Praha, základní škola, gymnázium a střední pedagogická škola, školská právnická osoba

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Školné nezahrnuje obědy ani vícedenní akce
~~~

- `krouzky_aktivity` → stored text:

~~~text
Škola zmiňuje volitelnou tvůrčí psaní a školní kapelu, divadelní představení, literární večery, výtvarné vernisáže, společné vaření a pečení; na lyceu také výtvarné, hudební, dramatické a taneční aktivity.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Škola výslovně uvádí Montessori principy. Popisuje projektové učení na lyceu, 90minutové bloky, Learning Contract, mentoring a praktické pedagogické praxe.
~~~

- `vs_uplatneni` → stored text:

~~~text
Absolventi pedagogického lycea mohou pokračovat na VŠ/VOŠ zejména v pedagogice, psychologii, sociální pedagogice, sociální práci nebo oborech připravujících učitele a vychovatele; absolvent gymnázia se připravuje na VŠ podle vlastního výběru.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 123 — Taneční centrum Praha - konzervatoř, z. ú.

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Internát má kapacitu 21 studentů, pětidenní provoz a stravování formou polopenze (snídaně a večeře).
~~~

- `krouzky_aktivity` → stored text:

~~~text
V příspěvku na studium jsou zahrnuty například rehabilitace, soustředění, zájezdy, workshopy a masterclassy s hostujícími pedagogy. Studenti se účastní veřejné scénické praxe a tanečních představení.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Škola popisuje propojení konzervatorního a gymnaziálního vzdělávání, tanečního tréninku se scénickou praxí a osmileté studium.
~~~

- `vs_uplatneni` → stored text:

~~~text
Profil absolventa uvádí možnost pokračovat na vysoké škole v oblasti umění, humanitních věd, kulturního managementu či fyzioterapie.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


### 95 — Gymnázium ALTIS s.r.o.

**Inputs**
- `obedy_ubytovani` → stored text:

~~~text
Škola předává přihlášky do jídelny ZŠ Petrovice
kontakt s jídelnou řeší zákonní zástupci nebo zletilí žáci.
~~~

- `krouzky_aktivity` → stored text:

~~~text
Mezi konkrétní aktivity patří robotika, chemický a fyzikální seminář, finanční gramotnost, média a PR, adaptační kurz, vodácké a lyžařské kurzy, zahraniční výjezdy a studentský filmový festival ALTFEST.
~~~

- `vyukovy_styl_detail` → stored text:

~~~text
Škola popisuje participační a badatelsky orientovanou výuku, skupinovou a kooperativní práci, projektové dny, laboratorní pokusy a exkurze.
~~~

- `vs_uplatneni` → stored text:

~~~text
Web uvádí, že mezi oblíbené obory maturantů 2024 patří práva, chemie a lékařství, a jmenuje například Univerzitu Karlovu, ČVUT, VŠE, ZČU, ČZU, VŠCHT a Technological University Dublin.
~~~

**Requested paired output and deliberate nulling**

| Field | Run 1 (xhigh) | Run 2 (xhigh) | Nulling / note |
|---|---|---|---|
| `ma_jidelnu` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `ma_koleje` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `krouzky_kategorie` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `pocet_krouzku` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vyukovy_styl_tagy` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |
| `vs_pokracuje_pct` | UNAVAILABLE | UNAVAILABLE | Not evaluated; no inference or intentional null occurred. |


## Stability summary (20 requested pairs)

A pair is assessed only when both runs return the field. Because each requested xhigh run failed before inference, all 20 pairs per field are unassessed. No field can honestly be labeled STABLE, UNSTABLE, or BOTH_NULL; there are no output values or evidence quotes to compare.

| Field | STABLE | UNSTABLE | BOTH_NULL | Unassessed |
|---|---:|---:|---:|---:|
| `ma_jidelnu` | 0 | 0 | 0 | 20 |
| `ma_koleje` | 0 | 0 | 0 | 20 |
| `krouzky_kategorie` | 0 | 0 | 0 | 20 |
| `pocet_krouzku` | 0 | 0 | 0 | 20 |
| `vyukovy_styl_tagy` | 0 | 0 | 0 | 20 |
| `vs_pokracuje_pct` | 0 | 0 | 0 | 20 |

There are no UNSTABLE fields to which a proposed deterministic rule change can be attached. The source-driven count/category/dining/accommodation rules above are deterministic by design, but the missing model-backed paired results still need a successful rerun before approval.

## Coverage: local projection vs observed model responses

The local projections below used the v2 evidence rules across 219 cached school rows at the recorded attempt. `krouzky_kategorie` non-null coverage includes both non-empty category arrays and `[]` where club text exists but no category is supported; 119/219 are projected to have at least one category. v1 figures are included only to quantify the effect of the stricter rules.

| Field | v1 local projection | Historical v2 local projection | Change | Model actually returned in requested 20-school sample |
|---|---:|---:|---:|---|
| `ma_jidelnu` | 118/219 | 43/219 | −75 | N/A — 0 schools processed |
| `ma_koleje` | 5/219 | 8/219 | +3 | N/A — 0 schools processed |
| `krouzky_kategorie` | 165/219 | 194/219 non-null; 119/219 non-empty | +29 non-null | N/A — 0 schools processed |
| `pocet_krouzku` | 7/219 | 0/219 | −7 | N/A — 0 schools processed |
| `vyukovy_styl_tagy` | 108/219 | 108/219 | 0 | N/A — 0 schools processed |
| `vs_pokracuje_pct` | 15/219 | 15/219 | 0 | N/A — 0 schools processed |

The requested actual-model coverage is unavailable, not 0/20 null: no requested school reached the model. The low-effort diagnostics likewise returned no model payload. Therefore the distance between local projections and model results cannot be measured from this run. The logs’ `0/0` coverage counters mean zero processed schools; they do not mean every field was null.

## Empty schools and cached-page / fallback diagnosis

For all four schools below, the stored prose sources were empty. Page URLs are taken from the local cache manifest/Markdown; no new page was fetched. “Fallback excerpt” is what the current `extractRelevantMarkdown` selection actually supplied to the structuring pass.

### School 26 — Střední průmyslová škola zeměměřická a Geografické gymnázium Praha

- Cached applicant/admissions page: No.
- Cached `Chci studovat` page: No.
- Cache/fallback diagnosis: The only cached page is a parked domain page, not an applicant page.
- Cached PAGE-URL entries:
  - `http://www.spszem.cz/`
- Actual fallback excerpts supplied (by target source):
  - None for all six new fields; the fallback supplied no excerpt.
- Cached page body says the domain was registered and is waiting for its content to be uploaded; this is a cache/content problem.

### School 42 — The English College in Prague – Anglické gymnázium, o. p. s.

- Cached applicant/admissions page: Yes, English admissions equivalent (`How to apply`); no exact Czech label.
- Cached `Chci studovat` page: No.
- Cache/fallback diagnosis: Cached pages include an English application page, but the available fallback excerpts are only generic teasers.
- Cached PAGE-URL entries:
  - `http://www.ecp.cz/`
  - `http://www.ecp.cz/why-us-how-to-apply/`
  - `http://www.ecp.cz/how-to-apply/?target=finance-fees`
  - `http://www.ecp.cz/the-way-we-teach/`
  - `http://www.ecp.cz/daily-life-activities/`
  - `http://www.ecp.cz/real-life-experiences/`
  - `http://www.ecp.cz/our-results-stories/`
  - `http://www.ecp.cz/how-to-apply/?target=scholarships-bursaries`
  - `http://www.ecp.cz/news-events/?target=term-dates`
- Actual fallback excerpts supplied (by target source):
  - None for all six new fields; the fallback supplied no excerpt.
- The cached Markdown itself contains high-level teaser wording such as “Modern education, our approach and curriculum”, “Daily life & activities”, and “Statistics, numbers and success stories”. These are not substantive field evidence and the fallback produced no excerpt.

### School 43 — Vyšší odborná škola informačních studií a Střední škola elektrotechniky, multimédií a informatiky

- Cached applicant/admissions page: Yes: cached admission / applicant material. `Pro uchazeče` appears in navigation links, but its own URL is not in the cached PAGE-URL list.
- Cached `Chci studovat` page: No.
- Cache/fallback diagnosis: The cache has many admission-related pages, but the fallback selected an activities-page intro followed by unrelated application-exam fragments.
- Cached PAGE-URL entries:
  - `http://www.ssemi.cz/`
  - `https://www.ssemi.cz/2018/04/03/jednotne-prijimaci-zkousky-na-maturitni-obory/`
  - `https://www.ssemi.cz/2020/06/26/seznam-prijatych-uchazecu-maturitni-obory/`
  - `https://www.ssemi.cz/2020/07/07/seznam-prijatych-uchazecu-maturitni-obory-2-kolo/`
  - `https://www.ssemi.cz/2018/02/10/dny-otevrenych-dveri-a-projektove-dny/`
  - `https://www.ssemi.cz/2020/02/06/vyhlaseni-vysledku-talentovych-zkousek-oboru-82-41-m-17-multimedialni-tvorba-na-skolni-rok-2020-2021-v-prvnim-kole-prijimaciho-rizeni/`
  - `https://www.ssemi.cz/2020/04/21/oznameni-vysledku-1-kola-prijimaciho-rizeni/`
  - `https://www.ssemi.cz/2022/11/23/informace-pro-uchazece-o-studium-oboru-vizualizace-a-pocitacova-grafika-82-41-m17/`
  - `https://www.ssemi.cz/2024/05/15/vyhlaseni-vysledku-1-kola-prijimaciho-rizeni/`
  - `https://www.ssemi.cz/2024/06/21/vyhlaseni-vysledku-2-kola-prijimaciho-rizeni/`
  - `https://www.ssemi.cz/2024/07/10/vyhlaseni-vysledku-3-kola-prijimaciho-rizeni/`
  - `https://www.ssemi.cz/2025/05/15/vysledky-prijimacich-zkousek/`
  - `https://www.ssemi.cz/2026/05/15/vysledky-prijimaciho-rizeni-na-rok-2026-2027/`
  - `https://www.ssemi.cz/2020/03/11/informace-o-moznosti-vraceni-skolneho-ci-jeho-pomerne-casti-v-souvislosti-s-mimoradnym-opatrenim-ministerstva-zdravotnictvi-cr-c-j-mzdr-10676-2020-1-min-kan-ze-dne-10-3-2020/`
  - `https://www.ssemi.cz/2020/05/15/2-kolo-prijimaciho-rizeni-pro-ucebni-obory/`
  - `https://www.ssemi.cz/2022/06/15/seznam-prijatych-uchazecu-pod-pridelenym-registracnim-cislem-do-1-rocniku-oboru-vzdelani-26-52-h-01-elektromechanik-pro-zarizeni-a-pristroje-kombinovane-studium-na-skolni-rok-2022-2023-v-1/`
  - `https://www.ssemi.cz/2022/06/21/seznam-prijatych-uchazecu-pod-pridelenym-registracnim-cislem-do-1-rocniku-oboru-vzdelani-26-52-h-01-elektromechanik-pro-zarizeni-a-pristroje-kombinovane-studium-na-skolni-rok-2022-2023-v-1-2/`
  - `https://www.ssemi.cz/2023/04/28/seznam-prijatych-uchazecu-pod-pridelenym-registracnim-cislem-do-1-rocniku-oboru-vzdelani-26-52-h-01-elektromechanik-pro-zarizeni-a-pristroje-zkracene-kombinovane-studium-na-skolni-rok-2023-2024-v-p/`
  - `https://www.ssemi.cz/2021/05/20/seznam-prijatych-uchazecu-pod-pridelenym-registracnim-cislem-do-1-rocniku-oboru-vzdelani-18-20-m-01-informacni-technologie-26-41-m-01-elektrotechnika-26-41-l-01-mechanik-elektrotechnik-68-42-l-51/`
  - `https://www.ssemi.cz/2021/06/16/seznam-prijatych-uchazecu-pod-pridelenym-registracnim-cislem-do-1-rocniku-oboru-vzdelani-18-20-m-01-informacni-technologie-a-68-42-l-51-bezpecnostni-sluzby-na-skolni-rok-2020-2021-v-prvnim-kole-priji/`
  - `https://www.ssemi.cz/2023/05/02/seznam-prijatych-uchazecu-pod-pridelenym-registracnim-cislem-do-1-rocniku-oboru-vzdelani-18-20-m-01-informacni-technologie-26-41-m-01-elektrotechnika-26-41-lh-01-mechanik-elektrotechnik-a-68-42-l/`
  - `https://www.ssemi.cz/cenik-sluzeb/`
  - `https://www.ssemi.cz/2020/06/05/seznam-prijatych-uchazecu-ve-druhem-kole-prijimaciho-rizeni/`
  - `https://www.ssemi.cz/2020/06/02/pokyny-k-prijimacimu-rizeni/`
  - `https://www.ssemi.cz/2020/10/08/den-otevrenych-dveri-14-10-2020/`
- Actual fallback excerpts supplied (by target source):
  - `krouzky_aktivity`:

~~~text
Tady najdete všechny důležité údaje o chystaných aktivitách jako například dny otevřených dveří, projektové dny a také fotogalerii z uplynulých akcí.
10.50 – 12.05 Český jazyk
kole přijímacího řízení povinné absolvování jednotných písemných testů z matematiky a českého jazyka.
ročníku z předmětů český jazyk, cizí jazyk, matematika, fyzika ( s dvojnásobným započítáváním hodnocení z M a Fy).
ročníku a z průměru prospěchu v předmětech český jazyk a matematika.
ročníku z předmětů český jazyk, matematika, fyzika s dvojnásobným započítáváním hodnocení z M a Fy.
~~~

### School 47 — Gymnázium Jiřího Gutha-Jarkovského, Praha 1, Truhlářská 22

- Cached applicant/admissions page: No.
- Cached `Chci studovat` page: No.
- Cache/fallback diagnosis: Cached content is mostly 404 / placeholder blog copy, with no applicant/admissions page.
- Cached PAGE-URL entries:
  - `https://www.truhla.cz/`
  - `https://www.truhla.cz/?post_type=acf-field&p=756`
  - `https://www.truhla.cz/mapa-stranek/`
  - `https://www.truhla.cz/blog/2021/02/23/doucovaci-prilezitosti/`
  - `https://www.truhla.cz/blog/2021/01/27/spustili-jsme-novy-web/`
  - `https://www.truhla.cz/blog/2021/02/23/vzrusujici-objevy/`
  - `https://www.truhla.cz/blog/obory/cestovni-ruch/`
  - `https://www.truhla.cz/blog/obory/ucetnictvi/`
  - `https://www.truhla.cz/blog/obory/management/`
  - `https://www.truhla.cz/blog/obory/gastronomie/`
  - `https://www.truhla.cz/wp-content/uploads/2021/03/demo-skoly-demo-dokument.pdf`
  - `https://www.truhla.cz/blog/obory/ekonomika-a-podnikani/`
- Actual fallback excerpts supplied (by target source):
  - None for all six new fields; the fallback supplied no excerpt.
- Local cached pages include 404 responses and Lorem Ipsum placeholder text; the demo PDF/page entries do not supply relevant field evidence. This is a cache/content problem.

## Per-field recommendation

These are historical v2 recommendations, conditional on a successful paired run and review. They do not authorize another write or describe current field coverage; follow the current deployment handoff before changing data.

| Field | Recommendation | Reason |
|---|---|---|
| `ma_jidelnu` | **WRITE** | Historical v2 local projection was 43/219 with whole-school evidence and explicit case reporting; confirm stability in the required rerun. |
| `ma_koleje` | **WRITE_DISPLAY_ONLY** | Only 8/219 projected; preserve the field for display but do not score it. |
| `krouzky_kategorie` | **WRITE** | 194/219 can represent non-null evidence, including `[]`; 119/219 have at least one explicit domain category. |
| `pocet_krouzku` | **DO_NOT_WRITE** | The historical v2 explicit-number-only rule projected 0/219; lists are never counted. |
| `vyukovy_styl_tagy` | **WRITE** | Historical v2 explicit-evidence projection was 108/219; paired model stability remains unmeasured and must be checked before writing. |
| `vs_pokracuje_pct` | **WRITE_DISPLAY_ONLY** | Explicit percentage evidence appears in only 15/219; use for display, not scoring. |
