# Plan 017 — Questionnaire expansion: points, reserve, new scored questions, weight questions

Status, 10 October 2026: implemented in the current standalone questionnaire/matcher source, with 31 served question definitions and the effective-weight layer. The September decisions/specification below remain historical; do not implement the same questions again or treat the old planned model routing as a new requirement. Source review and targeted regressions are recorded in the [deployment report](../reports/deployment-review-2026-10-07/REPORT.md), with remaining acceptance in the [handoff](../reports/deployment-review-2026-10-07/HANDOFF-PLAN.md).

Current limits: admission cutoffs/coverage and school-web-derived values require field/year provenance review; three years are not available for every programme. Onboarding and standalone recommendation engines remain separate pending the founder's scoring-policy decision. The optional `poznamka` is private saved context, excluded from matching and AI; its current hint explains this. Church-school preferences and account-linked student answers still require the recorded child-data/legal-basis review. Beta access is free for main feedback, with payment screens only a preview; the separate ordinary-account trial must start at first confirmed sign-in (migration pending).

## Context

The 56-question brainstorm (2026-09-24) was sorted into: score-only, weight-only,
both, and cannot-score-yet. Data structuring (2026-09-26) unlocked clubs, lunch
and teaching style — those three shipped 2026-09-28 (`krouzky`, `jidelna`,
`vyukovy_styl`). This plan adds the rest that has data behind it, plus a new
**weight layer**: answers that change how much other dimensions count.

Founder decisions (2026-09-28):
1. Selectivity → **two** questions (challenge-seekers vs. safety-seekers).
2. "Guarantee one safe school" → **not in matching**. It lives on the
   application-planning page, which already does it (`admissionRisk.js`
   verdict `bezJistoty`). No work here.
3. Yes to dedicated trade-off (weight) questions.
4. "We can't pay tuition" → paid schools get a **big penalty** (sink low), not
   hidden.
5. Add a few profile questions that only feed the AI sentence and make the
   student feel understood (4, listed below).
6. Optional Cermat points question, stored in the existing
   `decision_profile.jpz_points` (one number, shared with `/prihlaska`).
7. Expected-improvement question: rank on **current + full expected gain**,
   with an honesty note ("odpovídej upřímně, nesoudíme tě — když si body
   přikrášlíš, dostaneš horší výsledky").
8. Reserve question: with points → ranks by gap between expected points and
   hranice; without points → the reserve dimension is skipped and only the two
   selectivity questions count.
9. Long questionnaire only. Short/fast version later (already in UNFORGET).

Data coverage checked 2026-09-28 (founder ran the SQL): `tuition_czk_per_year`
25/220, `alternativni_pedagogika` 83 known / 11 true / 220.
`schools.admission_cutoff` and `school_programs.zrizovatel` come from Cermat
and cover almost every school.

---

## 1. Engine changes — `lib/matching.js`

### 1a. Weight layer (new)

Add after `DIMENSIONS`:

```js
// Answers that change how much a dimension counts, rather than scoring a
// school. Multipliers from every answered weight question are multiplied
// together per dimension, then clamped to [0, 3]. Unanswered = no change.
const WEIGHT_RULES = {
  priorita_nabidka_misto: {
    nabidka: { oblasti: 1.5, predmety: 1.5, zamereni: 1.5, casti: 0.5 },
    misto:   { casti: 1.8, oblasti: 0.8, predmety: 0.8 },
    // 'obojí' → absent → no change
  },
  priorita_typ_obor: {
    typ:  { typ: 1.5, oblasti: 0.8 },
    obor: { oblasti: 1.4, zamereni: 1.4, typ: 0.6 },
  },
  prestiz: {
    prestiz: { selektivita: 1.6 },
    sedi:    { selektivita: 0.4 },
  },
  tlak_chytrejsi: {
    motivuje: { selektivita: 1.3 },
    stresuje: { selektivita: 0.6 },
  },
  tlak_vykon: {
    dari:     { selektivita: 1.2 },
    zaseknu:  { selektivita: 0.6 },
  },
  prvni_volba: {
    stres: { rezerva: 1.5 },
  },
  specializace: {             // also scored — see `sirka` dimension
    otevrene: { zamereni: 0.5 },
    brzy:     { zamereni: 1.5 },
  },
  povolani: {
    ano: { oblasti: 1.5, zamereni: 1.5 },
  },
  selektivita_tezka: {        // also scored — "je mi to jedno" zeroes the dimension
    jedno: { selektivita: 0 },
  },
};

function effectiveWeights(answers) {
  const weights = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.weight]));
  for (const [questionId, byOption] of Object.entries(WEIGHT_RULES)) {
    const factors = byOption[answers[questionId]];
    if (!factors) continue;
    for (const [dim, f] of Object.entries(factors)) weights[dim] *= f;
  }
  for (const id of Object.keys(weights)) {
    const base = DIMENSIONS.find((d) => d.id === id).weight;
    weights[id] = Math.min(base * 3, Math.max(0, weights[id]));
  }
  return weights;
}
```

In `scoreSchools`: compute `const weights = effectiveWeights(answers)` once,
before `.map`. Inside the loop use `weights[dimension.id]` instead of
`dimension.weight`, and `continue` when it is `0`. Return shape of
`scoreSchools` is unchanged. Export `effectiveWeights` for the test.

Clamp is relative to each dimension's base weight (max 3× base), so stacked
multipliers can't make one dimension swallow the average.

### 1b. School context computed once

`selektivita` needs each school's position among all schools. At the top of
`scoreSchools`, before `.map`:

```js
const cutoffs = schools.map((s) => s.admission_cutoff).filter((c) => c != null).sort((a, b) => a - b);
const percentileOf = (c) => c == null ? null : cutoffs.filter((x) => x < c).length / Math.max(1, cutoffs.length - 1);
```

Attach `prepared._selectivity = percentileOf(school.admission_cutoff)` (0 =
easiest in Prague, 1 = hardest). `// ponytail: O(n²) over ~220 schools, fine; binary search if the DB grows past a few thousand.`

Uses `schools.admission_cutoff` (3-year average across the school's obory),
not per-obor cutoffs — the questionnaire doesn't know which obor the student
would pick. Same ceiling applies to `rezerva`; note it in the comment. The
per-obor precision stays on `/prihlaska`.

### 1c. New dimensions (append to `DIMENSIONS`)

All follow THE RULE: null data → `return null`, never 0.

| id | weight | answers read | score |
|---|---|---|---|
| `selektivita` | 10 | `selektivita_vyzva`, `selektivita_tezka` | direction per answer: vyzva→`+1`, podobna→`-1`, nezalezi→skip; tezka: ano→`+1`, ne→`-1`, jedno→skip (and weight 0 via rules). If no direction → null. `p = _selectivity` (null → null). Score = average over given directions of (`+1` → `p`, `-1` → `1-p`). |
| `rezerva` | 15 | `body`, `body_zlepseni`, `rezerva` | null unless `body` is a number and `rezerva` answered and `admission_cutoff != null`. `expected = body + GAIN[body_zlepseni]` where `GAIN = { stejne: 0, plus5: 5, plus10: 10, plus15: 15 }` (missing → 0). `gap = expected - admission_cutoff`. Score = `RESERVE_CURVES[rezerva](gap)`, below. |
| `cirkevni` | 6 | `cirkevni` | nezalezi → null. `z = latest zrizovatel` (reuse the `latestProgramValue` logic from `frontend/src/lib/decisionMatrix.js` — copy the 5-line helper into matching.js, backend can't import frontend). No zrizovatel → null. isChurch = `fold(z).includes('cirkev')`. ano → isChurch?1:0; ne → isChurch?0:1. |
| `alternativni` | 5 | `alternativni` | only `ano` and `ne` score; nezalezi → null. `v = extracted.alternativni_pedagogika`; null → null. ano → v?1:0; ne → v?0:1. |
| `sirka` | 8 | `specializace` | nevim → null. otevrene: gymnázium 1, lyceum 0.7, else 0.3. brzy: trade 1, gymnázium 0.3, else 0.8 (reuse `isGymnasium/isLyceum/isTrade`). |

`RESERVE_CURVES` — piecewise linear, `lerp` helper, points (gap → score):

```js
const RESERVE_CURVES = {
  // wants a sure thing
  jistota:  [[-15, 0], [-5, 0.2], [5, 0.7], [10, 1], [40, 1]],
  // wants balance: reachable but not far below them
  vyvazene: [[-15, 0], [-5, 0.5], [0, 1], [12, 1], [30, 0.6]],
  // ready to aim high with little/no reserve
  ambice:   [[-15, 0.1], [-8, 0.6], [-3, 1], [5, 1], [15, 0.5], [30, 0.3]],
};
```

Clamp gap to the first/last point. The `+10 / -5` breakpoints mirror
`bandFor()` in `frontend/src/lib/admissionRisk.js` (jistota ≥ cutoff+10,
reálná ≥ cutoff−5) so both surfaces tell the same story.

Signals (Czech, for the AI and fallback text):
- `selektivita`: p ≥ 0.7 and direction +1 → `'patří k nejvýběrovějším školám'`; p ≤ 0.3 and −1 → `'dostat se sem bývá snazší'`.
- `rezerva`: gap ≥ 10 → `'s tvými body máš velkou rezervu'`; −5 ≤ gap < 10 → `'s tvými body máš reálnou šanci'`; gap < −5 → `'hranice je nad tvými body'`.
- `cirkevni` ano & church → `'je to církevní škola'`.
- `alternativni` ano & true → `'učí alternativní pedagogikou'`.
- `sirka` otevrene & gym → `'dává široký základ'`; brzy & trade → `'specializuje se od začátku'`.

**`rezerva` signal must never be sent to the AI with the actual number** —
signals are text only, no digits. (Points are a minor's data; see §2 privacy.)

### 1d. Tuition penalty (post-average, not a dimension)

A weighted dimension can't guarantee "sink low" — it can be outweighed. So
apply after `raw` is computed, before `displayScore`:

```js
const PAID_PENALTY = { ne: 0.5, male: 0.8 };
```

`skolne` answer: `ano` (can pay) / `male` (only small amounts) / `ne` (can't).
`isPaid(school)`:
- `tuition_czk_per_year` known → paid iff `> 0`; for `male`, penalise only if `> 20000`.
- else zrizovatel soukromý → paid (for `male`, also penalise — amount unknown).
- else church or public → not paid (church schools in CZ are generally
  state-funded; unknown ≠ paid).

`raw *= PAID_PENALTY[answer]` when paid. Push signal `'je soukromá a placená'`
so the result explains why it dropped. Comment: this is the one deliberate
exception to "only dimensions move the score", per founder decision 4.

---

## 2. Questions — `lib/questionnaire.js`

### 2a. New `number` type

Add to the type doc and `validateAnswers`:

```js
if (question.type === 'number') {
  if (value === '' || value == null) {
    if (question.optional) continue;
    return { ok: false, error: `Odpověz prosím na „${question.label}“.` };
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < question.min || n > question.max) {
    return { ok: false, error: `U „${question.label}“ zadej celé číslo ${question.min}–${question.max}.` };
  }
  clean[question.id] = n;
  continue;
}
```

`describeAnswers` already skips `privateToServer` — the points questions set it.

### 2b. Optional `section` field

25 questions in one flat list is a wall. Add `section: '…'` (string) to each
question; the frontend prints a heading when it changes (§4). Pure display.

### 2c. Final question order

Existing ids unchanged (stored runs depend on them). New ones marked **NEW**.
Types: S = single, M = multi, N = number, T = text. All new ones `optional: true`
unless noted.

**Sekce „Co tě zajímá“**
1. `typ` (existing)
2. `oblasti` (existing)
3. `predmety` (existing)
4. **NEW** `povolani` S — „Máš už jasno, čím chceš být (třeba lékař, programátor, kuchař)?“ — `ano` „Ano, mám konkrétní cíl“ / `tak_napul` „Tak napůl“ / `ne` „Zatím ne“. Weight only (ano).
5. **NEW** `specializace` S — „Chceš si nechat otevřené možnosti, nebo se chceš brzy zaměřit na jeden obor?“ — `otevrene` „Nechat si otevřené možnosti“ / `brzy` „Brzy se specializovat“ / `nevim` „Nevím“. Scored + weight.
6. `po_skole` (existing)

**Sekce „Jak se učíš“**
7. `styl` (existing)
8. **NEW** `alternativni` S — „Láká tě alternativní pedagogika (třeba Montessori nebo waldorfská škola)?“ — `ano` / `ne` „Radši klasickou školu“ / `nezalezi`. Hint: „Tuhle informaci máme zatím jen u části škol.“
9. `jazyky` (existing)

**Sekce „Přijímačky a náročnost“**
10. **NEW** `body` N, `min: 0, max: 100`, `privateToServer: true` — „Kolik bodů máš z přijímaček nanečisto (Cermat, ze 100)?“ Hint (founder's honesty note): „Nepovinné. Odpovídej upřímně — nikdo tě nesoudí. Když si body přikrášlíš, dostaneš horší výsledky. Stejné číslo uvidíš i v plánování přihlášek.“
11. **NEW** `body_zlepseni` S, `privateToServer: true` — „O kolik bodů si myslíš, že se do ostrých přijímaček zlepšíš?“ — `stejne` „Asi zůstanu na stejném“ / `plus5` „O pár bodů (asi +5)“ / `plus10` „Znatelně (asi +10)“ / `plus15` „Hodně (+15 a víc)“. Hint: same honesty note, shortened: „Buď k sobě upřímný — přestřelený odhad ti doporučí školy, kam se nedostaneš.“ Only used when `body` is filled; say so in hint.
12. **NEW** `rezerva` S — „Chceš školy, kam se dostaneš s rezervou, nebo zkusíš lepší, ale těžší školy?“ — `jistota` „Chci jistotu a velkou rezervu“ / `vyvazene` „Něco mezi“ / `ambice` „Zkusím těžší školy i s malou rezervou“. Hint: „Funguje, jen když výše vyplníš body.“
13. **NEW** `selektivita_vyzva` S — „Chceš mezi spolužáky, kteří tě budou tlačit dopředu, nebo mezi lidi na podobné úrovni jako ty?“ — `vyzva` „Chci výzvu“ / `podobna` „Radši podobnou úroveň“ / `nezalezi`.
14. **NEW** `selektivita_tezka` S — „Chceš na školu, která je známá tím, že je těžké se na ni dostat?“ — `ano` / `ne` / `jedno` „Je mi to jedno“.
15. **NEW** `tlak_chytrejsi` S — „Jak se cítíš mezi lidmi, kteří jsou ve škole lepší než ty?“ — `motivuje` „Motivuje mě to“ / `stresuje` „Spíš mě to stresuje“ / `nevim`. Weight only.
16. **NEW** `tlak_vykon` S — „Jak zvládáš, když je ve škole velký tlak na výkon?“ — `dari` „Daří se mi pod tlakem“ / `zaseknu` „Spíš se zaseknu“ / `nevim`. Weight only.
17. **NEW** `prvni_volba` S — „Jak bys to nesl, kdyby tě nevzali na školu, kterou máš na prvním místě?“ — `ok` „Zvládl bych to“ / `stres` „Hodně by mě to vzalo“. Weight only.

**Sekce „Na čem ti záleží víc“** (trade-offs — weight only)
18. **NEW** `priorita_nabidka_misto` S — „Co je pro tebe důležitější?“ — `nabidka` „Co škola nabízí (obory, zaměření)“ / `misto` „Kde škola je a jak daleko budu dojíždět“ / `oboji` „Obojí stejně“.
19. **NEW** `priorita_typ_obor` S — „Co je pro tebe důležitější?“ — `typ` „Typ školy (gymnázium, odborná…)“ / `obor` „Konkrétní obor, který mě baví“ / `oboji` „Obojí stejně“.
20. **NEW** `prestiz` S — „Záleží ti na tom, jak je škola prestižní, nebo hlavně na tom, aby ti sedla?“ — `prestiz` „Prestiž je pro mě důležitá“ / `sedi` „Hlavně ať mi sedí“ / `oboji` „Obojí“.

**Sekce „Praktické věci“**
21. `casti` (existing)
22. **NEW** `skolne` S — „Můžete (ty a rodina) platit školné na soukromé škole?“ — `ano` „Ano, školné nevadí“ / `male` „Jen menší částku“ / `ne` „Ne, potřebuju školu bez školného“. Hint: „Placené školy tím neschováme, jen je posuneme níž.“
23. `jidelna` (existing, shipped 2026-09-28)
24. `zacatek`, `velikost` (existing)
25. **NEW** `cirkevni` S — „Chceš církevní školu?“ — `ano` / `ne` „Radši ne“ / `nezalezi`.
26. `krouzky` (existing, shipped 2026-09-28)

**Sekce „Něco o tobě“** (AI context only, no score — founder decision 5)
27. **NEW** `povaha` S — „Jsi spíš introvert, nebo extrovert?“ — `introvert` / `extrovert` / `nekde_mezi` „Někde mezi“.
28. **NEW** `novy_kolektiv` S — „Jak se cítíš, když přijdeš mezi nové lidi?“ — `v_pohode` „V pohodě, rychle zapadnu“ / `chvili` „Chvíli mi to trvá“ / `nesvuj` „Dost nesvůj“.
29. **NEW** `motivace` S — „Co tě ve škole nejvíc žene dopředu?“ — `znamky` „Známky“ / `zvedavost` „Zvědavost, chci věcem rozumět“ / `rodice` „Očekávání rodičů“ / `kamaradi` „Kamarádi a parta“.
30. **NEW** `soucasna_skola` M, `max: 3` — „Co ti na tvé současné škole vyhovuje?“ — `ucitele` „Učitelé“ / `kamaradi` „Kamarádi“ / `atmosfera` „Atmosféra“ / `predmety` „Předměty“ / `kruzky` „Kroužky a akce“ / `nic` „Nic moc“.

   Deliberately **multiple choice, not free text**: `describeAnswers` never
   forwards free text to the AI (it can contain personal data), so a text
   answer here could not feed the AI sentence at all. The founder's "like /
   dislike" becomes this one "what works for you" question; a "what bothers
   you" twin is skipped to keep the list shorter — add it the same way if
   wanted.
31. `poznamka` (existing, last)

Weight-only and profile questions have no DIMENSIONS entry, so they never
score. Profile ones reach the AI via `describeAnswers` automatically.

### 2d. AI prompt — `SYSTEM_PROMPT`

Add one rule: „Odpovědi v sekci o povaze a motivaci studenta použij jen k
tomu, aby věta zněla osobně. Nikdy netvrď, že škola má nějakou vlastnost
(třeba že je vhodná pro introverty), pokud to není v důvodech shody.“
Keeps the no-fabrication rule intact.

---

## 3. Server — `server.js`

In `POST /api/questionnaire`, after the run insert succeeds: if
`validation.answers.body` is a number, upsert `decision_profile`
`{ user_id, jpz_points: body, jpz_source: 'nanecisto', updated_at }` — **unless**
the stored row already has `jpz_source = 'ostra'` with the same number (then
leave it). Failure here is logged, not returned — the run is already saved.

In `GET /api/questionnaire`: also read the user's `decision_profile` and return
`prefill: { body: jpz_points }` so the form starts with the known number.
(Frontend uses it only as the initial value of `answers.body` when the form
opens with no answer there.)

No schema change. `decision_profile` already exists with the 0–100 check.

---

## 4. Frontend — `frontend/src/pages/Questionnaire.jsx`

- Render `q.type === 'number'`: `<input type="number" inputMode="numeric" min={q.min} max={q.max} className="input">`, store as string in state, send as number (or omit when empty).
- Section headings: while mapping the filtered questions, render `<h2 className="ss-headline-sm qz-section">{q.section}</h2>` before a question whose `section` differs from the previous one. Style in `questionnaire.css` with tokens only.
- Prefill `answers.body` from `state.data.prefill?.body` when opening the form.
- Empty-state copy says „Deset otázek" — change to „Zhruba třicet otázek, většina je nepovinná. Zabere to asi 5–8 minut."

Old runs: every new dimension returns null for answers that lack the new ids,
so stored runs re-score exactly as before (buildRunResult).

---

## 5. Deliberately not in this plan

- Short/fast questionnaire (UNFORGET, later).
- "Guarantee one safe school" rule (decision 2 — `/prihlaska` already does it).
- Free-text career follow-up to `povolani` (open-text decision in UNFORGET).
- Per-obor cutoff in the questionnaire (see 1b ceiling).
- Onboarding quiz (`frontend/src/lib/matching.js`) — separate engine, untouched.
- The ~20 no-data questions (strict vs. relaxed, oral exams, bullying support…).

---

## 6. Verification

1. **Unit test** — extend `tests/questionnaire.test.cjs` (`npm test`):
   - `effectiveWeights({ priorita_nabidka_misto: 'misto' }).casti === 36` (20 × 1.8, under the 60 clamp).
   - `selektivita_tezka: 'jedno'` → `effectiveWeights(...).selektivita === 0`, and no entry's `breakdown` has `selektivita`.
   - `rezerva`: school with cutoff 60, `body: 50, body_zlepseni: 'plus10', rezerva: 'jistota'` → gap 0 → score between 0.2 and 0.7; same with `body: 75` → 1.
   - no `body` → `breakdown.rezerva` undefined.
   - `skolne: 'ne'` → private school with `tuition_czk_per_year: 50000` scores lower than an otherwise identical public school, by ≈ half raw.
   - church school with no tuition → not penalised.
   - `alternativni: 'ano'`, school with `alternativni_pedagogika: null` → no `alternativni` in breakdown.
   - validator: `body: 101` rejected, `body: '55'` → 55, `body: ''` optional → absent.
   - `describeAnswers` output contains neither the points question label nor its value.
2. **Backend smoke** — `PORT=5001 node server.js`, submit via the UI as a trialing account with points 60 → run saved; `decision_profile` shows 60 on `/prihlaska`.
3. **Browser** (per CLAUDE.md, verify yourself): `/dotaznik` form shows section headings and the number field at 390px and 1280px; prefill works on a second run; results show the new signals (e.g. „s tvými body máš reálnou šanci“); a private school sinks with `skolne: ne`.
4. `npm run lint` in `frontend/` and `npx vite build`.

## 7. Bookkeeping

- CLAUDE.md + AGENTS.md: questionnaire now has a weight layer (`WEIGHT_RULES`), a tuition penalty, and writes `decision_profile` from the points question.
- UNFORGET.md: add „what bothers you at your current school" twin question (skipped), and the per-obor cutoff ceiling in questionnaire scoring.
- Commit and push after verification. Commit only the files this plan touches plus the three uncommitted 2026-09-28 questionnaire files (`lib/matching.js`, `lib/questionnaire.js`, `server.js`) — not the other session's onboarding files.
