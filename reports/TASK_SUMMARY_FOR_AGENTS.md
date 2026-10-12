# School Data Structuring Task — Historical Overview

> Historical handoff for the failed v2 attempt. This is not the current task queue or current provider status. The product is now **Střední na míru**. Later paired and full extraction logs exist, and all 219 cached schools were processed on 26 September. The complete logs have been reviewed in [the October deployment report](deployment-review-2026-10-07/REPORT.md) and [the ordered handoff](deployment-review-2026-10-07/HANDOFF-PLAN.md). Current source attribution, eligibility, year/campus and controlled-write acceptance remain open under S10; do not run providers or write hosted data solely from this historical checklist.

## The Problem

Střední na míru (formerly ŠkolaMatch) is a Czech school-selection app that helps 9th graders find the best high school. The app has a matching engine that scores schools based on student preferences.

**The problem at this handoff:** The matching engine could score schools on hard data (location, district, school type, admission rates from Cermat). But schools also publish free-text descriptions of things students care about:
- Lunch/dining and accommodation arrangements
- Clubs and activities offered
- Teaching style and pedagogy
- University placement outcomes

This free-text data was already scraped and stored in the database (`obedy_ubytovani`, `krouzky_aktivity`, `vyukovy_styl_detail`, `vs_uplatneni` columns), but those scoring dimensions needed queryable, structured data. The six structure columns are now in the schema and populated; not every field has sufficient evidence or coverage for scoring.

## The Solution: Structuring via LLM

We use an LLM (GPT-6 Luna via OpenRouter, or Gemini via Google API) to parse the stored free-text fields and extract structured columns. Each column has:
- A clear meaning
- A defined data type (boolean, array of tags, 0–100 number)
- Explicit evidence rules (the LLM can only return a value if the source text explicitly supports it)

## The Six Columns Being Extracted

| Column | Type | Meaning | Example input | Example output |
|---|---|---|---|---|
| `ma_jidelnu` | bool | Students can get lunch through the school (own canteen OR arranged elsewhere) | "Obědy jsou zajištěny v blízké SOU Čakovice" | true |
| `ma_koleje` | bool | School provides or arranges student accommodation | "Ubytování lze sjednat v Domově mládeže v Ohradní ulici" | true |
| `krouzky_kategorie` | array[str] | Category tags for clubs/activities (sport, jazyky, umeni_hudba_divadlo, veda_debata, jine) | "florbalová liga, pingpongový turnaj, fotografické kurzy" | ["sport", "umeni_hudba_divadlo"] |
| `pocet_krouzku` | int 0–200 | Total number of clubs offered | "nabízíme 25 kroužků" | 25 |
| `vyukovy_styl_tagy` | array[str] | Teaching approach tags (praxe_dilny, skupinova_prace, projektova_vyuka, individualni_pristup, etc.) | "30% výcvik v malých skupinách, praktické dovednosti" | ["praxe_dilny", "skupinova_prace"] |
| `vs_pokracuje_pct` | int 0–100 | Percentage of graduates continuing to university | "81 % studentů odchází na vysoké školy" | 81 |

## Anti-Fabrication Rules

The required rule is that the LLM **must not invent data**; model output still needs validation. If the evidence is not explicit in the source text:
- Return null, not a guess
- Return empty array `[]`, not a plausible-but-unverified list
- Include a note explaining why the field was nulled

Examples of intentional nulling:
- A school says "no own dorms, but students can stay at City Dormitory X" → `ma_koleje = null` (no direct arrangement)
- A school lists "exkurze, muzikoterapie, posilovna" → `krouzky_kategorie = ["umeni_hudba_divadlo"]` because muzikoterapie is art-adjacent, but "exkurze" and "posilovna" don't map to any supported category, so they're dropped
- A club list has 7 items but one is "posilovna" (a gym, not a club) → `pocet_krouzku = null` (can't count reliably)

## Status at the Historical Handoff

### What has been done

**Two dry runs** (no database writes, test-only):

1. **v1 (2026-09-24, 10 schools):** First extraction pass. Rules worked but had issues:
   - `pocet_krouzku` was too loose (counting gyms as clubs)
   - `ma_jidelnu` accepted partial statements (one obor only)
   - `ma_koleje` was inconsistent (rejecting some explicit denials)

2. **v2 (2026-09-26, 20 schools, 10 original + 10 new):** Rules were fixed in the script:
   - `pocet_krouzku`: explicit number only (no list counting)
   - `ma_jidelnu`: now clearly means "school arranges lunch for students" (own or elsewhere)
   - `ma_koleje`: explicit accommodation arrangements only
   - `krouzky_kategorie`: stricter domain-matching rules
   - `vs_pokracuje_pct`: unchanged (explicit percentage only)

   **This v2 attempt obtained no model output:** OpenRouter returned HTTP 401 and the Codex sandbox blocked Supabase network access. These historical errors do not establish that credentials are expired or unavailable today.

### Historical Local Checks (No Model Output in This Attempt)

The script's deterministic local rules were checked on all 219 cached schools:

| Field | Projected coverage | Notes |
|---|---|---|
| `ma_jidelnu` | 43/219 | Down from 118 in v1 due to stricter whole-school requirement |
| `ma_koleje` | 8/219 | Very sparse; recommended display-only, not for scoring |
| `krouzky_kategorie` | 194/219 non-null (119/219 with ≥1 category) | Most schools have activity text; many produce `[]` (text exists, no supported categories) |
| `pocet_krouzku` | 0/219 | Explicit-count-only rule yields zero; most schools don't state a number |
| `vyukovy_styl_tagy` | 108/219 | Stable; unchanged from v1 |
| `vs_pokracuje_pct` | 15/219 | Rare but accurate; display-only recommended |

## Historical Issues Requiring Current Rechecks

1. **Bad cached data:** Schools 26 (parked domain) and 47 (demo template with Lorem Ipsum) have no real content. Their cached pages need manual fixing or re-scraping.

2. **Missing "Pro uchazeče" pages:** Schools 26, 42, 43 have no cached admissions/applicant pages (where most useful info lives). The scraper's keyword priority may be too Czech-specific, missing English site variants or page hierarchies.

3. **Coverage uncertainty:** The v1→v2 rule changes dropped `ma_jidelnu` from 118 to 43 schools, but spot checks suggest some drops were too aggressive (schools 19, 82, 95 look like they should pass under the new rules).

4. **Stability was unmeasured at this handoff.** Paired and full-run logs now exist. Their complete comparison shows output differences on identical stored inputs, but does not isolate model nondeterminism from historical script/rule/provider changes. Reproduce with a pinned current version and fixture before drawing that conclusion; see the October report.

## Historical Proposed Next Steps (Superseded)

**v3 dry run** (still no database writes):

1. Re-run extraction on the same 20 schools with working API access (renewed OpenRouter key or Google Gemini)
2. Run each school twice and compare outputs for stability
3. List 15 of the schools that were dropped from `ma_jidelnu` (v1→v2), showing:
   - Source text
   - The exact rule that nulled it
   - Whether it looks like an error (e.g., "Obědy: 53,- Kč pro žáky" should clearly be true)
4. Identify all schools in the 219 whose cached pages look bad (parked domains, 404, demo templates)
5. Per-field recommendation: WRITE / WRITE_DISPLAY_ONLY / DO_NOT_WRITE

**The historical proposal after v3 approval was:**
1. Fix bad cached pages or mark schools for re-scrape
2. Run full extraction on all 219 schools
3. Manual spot-check of 20–30 results
4. Write to database

## Key Constraints and Rules

- **Never invent data.** Null is better than a guess.
- **Always include a reason.** Every nulled field has a note explaining why.
- **Source quotes matter.** The LLM must cite the exact text that supports a value.
- **No stopping at first match.** Search the entire text for all occurrences of a fact (e.g., lunch might be mentioned on multiple pages with different info).
- **Small scope.** Each field only cares about one topic — don't cross-reference or infer from elsewhere.
- **Deterministic rules.** Explicit evidence only; no magic LLM judgment calls.

## Files Involved

- `scripts/extract-school-details.js` — the extraction script (contains all rules)
- `supabase-setup.sql` — the six new columns in `school_extracted_details` table
- `reports/structure-dry-run-2026-09-24.md` — v1 results
- `reports/structure-dry-run-2026-09-24-v2.md` — failed historical v2 attempt, not the later completed extraction logs
- `scripts/data/scraped-schools/` — cached Markdown of each school's website pages (source data)

## Acceptance Criteria to Preserve

A field is ready to write when:

1. **Stable:** Run it twice on the same school and get identical output
2. **Accurate:** Manual spot-check shows no obvious errors (a school that clearly has lunch gets `true`, etc.)
3. **Useful:** Coverage is high enough to affect matching (>10% of schools, or display-only if lower)
4. **Supported by evidence:** Every non-null value has a verbatim quote from the source page

## Historical Questions (Not Current Credential Findings)

- Is the extraction currently running? (If yes, what's being updated?)
- Are API credentials (OpenRouter or Gemini) set and active?
- Should v3 wait for fresh scraped data, or run on the current cache?
