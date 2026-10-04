/**
 * Deterministic school matching — the percentage shown next to every result.
 *
 * WHY THIS EXISTS
 *
 * The first version asked the AI for the score as well as the explanation. That
 * looked fine until the same student profile was run through two models: one
 * gave a school 95%, the other 83%. Neither was "wrong", because neither was
 * measuring anything — a language model asked for a confidence number generates
 * a plausible-looking one the same way it generates the sentence next to it.
 * There is no calculation underneath and nothing to be consistent with.
 *
 * So the number is computed here, in code, from data we actually hold, and the
 * model is left to do the one thing it is genuinely good at: writing the Czech
 * sentence that explains a match it is *given*. Same answers now always produce
 * the same percentage, the weights are visible and tunable, and swapping models
 * cannot move a single score.
 *
 * HOW THE SCORE IS BUILT
 *
 * Each dimension below scores 0..1 and carries a weight. The final percentage is
 * the weighted average over the dimensions that *apply* to this student — not
 * over all of them. A dimension is skipped when the student answered "nevím" or
 * left an optional question blank, because scoring an absent preference would
 * quietly punish schools for something nobody asked about. Skipped dimensions
 * leave the remaining weights to renormalise among themselves.
 *
 * The score is absolute, not relative to the other results. If nothing in the
 * database fits, the best match honestly reads 40% rather than being stretched
 * to 100% for looking good — a student deciding where to spend four years is
 * better served by "nothing here fits you well" than by a flattering number.
 *
 * WHAT IS DELIBERATELY NOT SCORED
 *
 * `velikost` (school size) and `zacatek` (school start time) are asked but
 * carry zero weight, because the schools table holds nothing to match them
 * against — there is no enrolment figure and no start-time field. They are
 * passed to the model as context for the wording and nothing more. Inventing a
 * proxy for either (counting programs as a stand-in for size, say) would put a
 * number on a guess, which is the exact failure this module was written to
 * remove.
 *
 * There is deliberately no commute-time dimension, and the absence is the
 * design rather than a gap. An earlier version asked for a home district plus a
 * distance tolerance and tried to compute the journey from a seeded
 * district -> school travel-time table. `casti` replaced all of it by asking
 * "which districts would you commute to" instead: the student answers from
 * their own address and their own sense of far, which is both more accurate
 * than a transit estimate and never leaves their head. That deleted an API key,
 * a seeding script, a static lookup table, a privacy promise to keep, and a
 * taper curve nobody could justify. Do not reintroduce a routing call here.
 *
 * EXTENDING THIS
 *
 * More scraped fields are expected — opening hours, admission cut-offs, class
 * sizes. To use one: add a DIMENSIONS entry with a scorer returning 0..1 and a
 * weight, and it joins the average automatically. Weights do not need to total
 * anything in particular; they are normalised at the end.
 */

// Generated from real OSM boundaries by scripts/build-district-map.js, and
// carrying the exact rings the picker map draws — so a district a student
// clicks is the district a school is tested against.
const { districtOfSchool, districtHops } = require('./pragueDistricts');

// Diacritics folded and lowercased, so "Informační" matches "informacni". The
// frontend search does the same thing in schoolSearch.js — kept separate rather
// than shared because that one runs in the browser and this one does not.
function fold(text) {
  return (text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Keywords are matched against the folded `programs` text of a school.
 *
 * Built from the actual program vocabulary in the database (115 distinct names
 * across 60 Prague schools), not guessed — every entry below appears in real
 * data. Keep them folded and lowercase; they are compared with `includes`, so
 * stems ("elektro", "zdravotnick") deliberately catch their whole family.
 */
const AREA_KEYWORDS = {
  it: ['informacni technologie', 'informatika', 'informacni sluzby', 'kyberne', 'programov', 'software', 'pocitac', 'digitalni'],
  technika: ['strojiren', 'strojni', 'elektrotechnik', 'elektromechanik', 'mechanik', 'autotronik', 'autoelektrikar', 'letecky', 'stavebnictvi', 'technicke lyceum', 'serizovac', 'zamecnik', 'elektrikar'],
  prirodni: ['prirodovedn', 'chemi', 'biolog', 'ekolog', 'laboratorn', 'technicke lyceum', 'kombinovane lyceum'],
  humanitni: ['humanitni', 'jazyk', 'knihkupeck', 'verejnospravni', 'pravni', 'pedagogick'],
  ekonomika: ['ekonomik', 'podnikani', 'obchodni akademie', 'ekonomicke lyceum', 'obchodnik', 'prodavac', 'marketing', 'ucetnictvi', 'financ'],
  // 'grafik', 'hudba', 'tanec', 'zpev', 'herec', 'dramat', 'konzervator' added
  // 2026-10-04: conservatories ("Tanec", "Hudba", "Zpěv") and "Reprodukční
  // grafik" matched no interest at all and sank to the bottom of every ranking.
  umeni: ['design', 'umelecky', 'graficky', 'grafik', 'fotografie', 'multimedialni', 'aranzer', 'vytvarn', 'hudebn', 'hudba', 'tanec', 'zpev', 'herec', 'dramat', 'konzervator', 'rezbar', 'kovar', 'pasir', 'scenick'],
  zdravotnictvi: ['zdravotnick', 'osetrovatel', 'pecovatelsk', 'farmaceut', 'laboratorn', 'maser', 'zubni', 'socialni cinnost'],
  remesla: ['truhlar', 'cukrar', 'kuchar', 'kadernik', 'elektrikar', 'opravar', 'zamecnik', 'pasir', 'nabytkarsk', 'vlasenkar', 'instalater', 'zednik', 'obkladac', 'strojni mechanik', 'prodavac', 'aranzer'],
  pedagogika: ['pedagogick', 'socialni', 'vychovatel', 'pecovatelsk', 'ucitelstvi'],
  gastro: ['gastronomie', 'hotelnictvi', 'cestovni ruch', 'kuchar', 'cisnik', 'cukrar', 'turis'],
};

/**
 * School subjects mapped to the programs they plausibly lead into.
 *
 * Weaker evidence than AREA_KEYWORDS by nature — "I'm good at maths" points at
 * a family of schools rather than a specific one — which is why this dimension
 * carries less weight below.
 */
const SUBJECT_KEYWORDS = {
  matematika: ['technicke lyceum', 'strojiren', 'informacni technologie', 'ekonomick', 'stavebnictvi', 'elektrotechnik'],
  cestina: ['humanitni', 'knihkupeck', 'verejnospravni', 'pedagogick'],
  cizi_jazyky: ['jazyk', 'anglick', 'nemeck', 'spanel', 'francouz', 'bilingv', 'worldwide', 'cestovni ruch', 'hotelnictvi', 'mezinarodn'],
  fyzika: ['strojiren', 'elektrotechnik', 'technicke lyceum', 'letecky', 'stavebnictvi', 'mechanik'],
  chemie: ['chemi', 'farmaceut', 'kosmetick', 'potravinar', 'laboratorn'],
  biologie: ['zdravotnick', 'prirodovedn', 'ekolog', 'veterinar', 'osetrovatel', 'laboratorn'],
  dejepis: ['humanitni', 'verejnospravni', 'pravni', 'knihkupeck'],
  informatika: ['informacni technologie', 'informatika', 'kyberne', 'programov', 'informacni sluzby', 'digitalni'],
  vytvarka: ['design', 'umelecky', 'graficky', 'grafik', 'fotografie', 'multimedialni', 'aranzer', 'vytvarn', 'hudebn', 'hudba', 'zpev'],
  telocvik: ['sportovni', 'sport', 'telesn', 'tanec'],
};

// Programs that end in a výuční list rather than a maturita. Used to tell an
// učební obor from an odborná škola, which the programs text does not state
// outright — this is a heuristic over known trade names, not a hard fact, so it
// informs a weighted dimension rather than filtering anything out.
const TRADE_KEYWORDS = ['cukrar', 'kuchar', 'cisnik', 'truhlar', 'kadernik', 'elektrikar', 'prodavac', 'obchodnik', 'opravar', 'zamecnik', 'instalater', 'zednik', 'aranzer', 'pasir', 'vlasenkar', 'strojni mechanik', 'pecovatelsk', 'nabytkarsk', 'obkladac', 'kovar'];

const GYMNASIUM_KEYWORDS = ['gymnazium'];
const LYCEUM_KEYWORDS = ['lyceum'];
const LANGUAGE_KEYWORDS = ['jazyk', 'anglick', 'nemeck', 'spanel', 'francouz', 'bilingv', 'worldwide', 'mezinarodn', 'cizojazyc'];

// True when any keyword appears in the folded program text.
function hits(programs, keywords) {
  return keywords.some((keyword) => programs.includes(keyword));
}

/**
 * school_extracted_details comes back as an array from Supabase's nested
 * select (one row per school) — same normalization
 * frontend/src/lib/decisionMatrix.js and SchoolDetail.jsx already do.
 *
 * Coverage over the 219 scraped schools (2026-09-26, see UNFORGET.md): only
 * `krouzky_kategorie` (189, 110 non-empty) is common enough to score as a real
 * signal. `ma_jidelnu` (50) and `vyukovy_styl_tagy` (77) are common enough for
 * a small one-sided bonus, never a penalty. `ma_koleje` (6), `vs_pokracuje_pct`
 * (4) and `pocet_krouzku` (0) stay display-only on the school page — too rare
 * for a question, not built here.
 *
 * THE RULE, for every one of these fields: null means "we don't know", never
 * "the school doesn't have it". A school we have no data on must score
 * exactly like a school that doesn't care about the question — it is dropped
 * from that dimension's average (score() returns null), the same treatment an
 * unanswered question already gets. It is never scored as a miss. Getting
 * this backwards would punish a school for our scraping gap rather than for
 * anything the school actually lacks.
 */
function extractedOf(school) {
  const e = school.school_extracted_details;
  return Array.isArray(e) ? e[0] : e;
}

// A combined school ("Střední odborná škola a Gymnázium") can list one
// gymnázium-track program alongside ten unrelated trade ones — `hits()` alone
// would still call that "a gymnázium" from a single substring match anywhere
// in the school's whole program list. The `typ`/`po_skole`/`styl` dimensions
// ask what KIND of school this is, which is a claim about the school as a
// whole, not about any one program it happens to offer — so they require the
// keyword to cover most of the school's own programs, the same "share of your
// own offering" logic `zamereni` already uses for interest areas below.
const TYPE_MAJORITY = 0.5;

function shareOf(programs, keywords) {
  const entries = programs.split(',').map((e) => e.trim()).filter(Boolean);
  if (!entries.length) return 0;
  const matched = entries.filter((entry) => keywords.some((keyword) => entry.includes(keyword)));
  return matched.length / entries.length;
}

// Cermat's own typ_skoly classification ("Gymnázia 4letá", "SOU s výuč.
// listem", "SOŠ", ...) is ground truth, not a guess over free text — prefer
// it whenever a school's row carries school_programs (joined by the two
// questionnaire endpoints in server.js). Only the couple of schools with no
// Cermat admission data at all fall back to shareOf() over the programs blob.
const TYP_SKOLY_GYMNASIUM = ['gymnaz'];
const TYP_SKOLY_LYCEUM = ['lyce'];
const TYP_SKOLY_TRADE = ['vyuc']; // covers both "s výuč. listem" and "bez výuč. listu"

function shareFromTypSkoly(school, keywords) {
  const rows = school.school_programs;
  if (!Array.isArray(rows) || !rows.length) return null;
  const matched = rows.filter((p) => keywords.some((k) => fold(p.typ_skoly || '').includes(k)));
  return matched.length / rows.length;
}

function isGymnasium(school) {
  const share = shareFromTypSkoly(school, TYP_SKOLY_GYMNASIUM) ?? shareOf(school._programs, GYMNASIUM_KEYWORDS);
  return share >= TYPE_MAJORITY;
}
function isLyceum(school) {
  const share = shareFromTypSkoly(school, TYP_SKOLY_LYCEUM) ?? shareOf(school._programs, LYCEUM_KEYWORDS);
  return share >= TYPE_MAJORITY;
}
function isTrade(school) {
  const share = shareFromTypSkoly(school, TYP_SKOLY_TRADE) ?? shareOf(school._programs, TRADE_KEYWORDS);
  return share >= TYPE_MAJORITY;
}

/**
 * How well a set of chosen options is covered, 0..1.
 *
 * Divided by `min(chosen, 3)` rather than by `chosen`, so breadth is not
 * punished: a student who picks five interests and finds a school matching
 * three of them scores 1.0, exactly like a student who picked one and matched
 * it. Choosing more options should describe you better, not make every school
 * look worse — which is what a plain matched/chosen ratio would do.
 */
function coverage(matchedCount, chosenCount) {
  if (!chosenCount) return null;
  return Math.min(1, matchedCount / Math.min(chosenCount, 3));
}

/**
 * The best single obor for this student's interests and subjects.
 *
 * A student studies ONE obor, so interests and subjects must be matched within
 * one entry of the school's program list, never across all of them. Matching
 * the whole list let a school with eighteen unrelated obory (car electrician,
 * goldsmith, gymnázium, ...) collect "technika" from one, "umění" from another
 * and "ekonomika" from a third, and land in the top 10 for 55 % of random
 * answer sets (scripts/simulate-matching.mjs, 2026-10-04) — about 12× its fair
 * share. The onboarding engine (frontend/src/lib/matching.js) already scores
 * per obor for the same reason.
 *
 * The entry is chosen jointly for both dimensions (weighted like them, 30:15),
 * so `oblasti` and `predmety` describe the same obor rather than two different
 * ones. A general gymnázium/lyceum entry names no field at all, so it gets the
 * same partial credit the onboarding engine gives it: some fit for any
 * interest, half fit for academic subjects. Without it every single-obor
 * gymnázium scored 0 here whatever the student said.
 */
const GENERAL_ENTRY = ['gymnazium', 'lyceum'];
const GENERAL_AREA_CREDIT = 0.35;
const ACADEMIC_SUBJECTS = new Set(['matematika', 'cestina', 'cizi_jazyky', 'fyzika', 'chemie', 'biologie', 'dejepis', 'informatika']);
const GENERAL_SUBJECT_CREDIT = 0.5;

function entryFit(entry, chosen, map, generalCredit) {
  const matched = chosen.filter((key) => (map[key] || []).some((keyword) => entry.includes(keyword)));
  if (matched.length) return { count: matched.length, matched };
  if (!GENERAL_ENTRY.some((keyword) => entry.includes(keyword))) return { count: 0, matched };
  return { count: chosen.reduce((sum, key) => sum + generalCredit(key), 0), matched };
}

function bestObor(answers, school) {
  const areas = answers.oblasti || [];
  const subjects = answers.predmety || [];
  if (!areas.length && !subjects.length) return null;
  const entries = school._programs.split(',').map((e) => e.trim()).filter(Boolean);
  let best = null;
  for (const entry of entries) {
    const area = entryFit(entry, areas, AREA_KEYWORDS, () => GENERAL_AREA_CREDIT);
    const subject = entryFit(entry, subjects, SUBJECT_KEYWORDS, (key) => (ACADEMIC_SUBJECTS.has(key) ? GENERAL_SUBJECT_CREDIT : 0));
    const fit = {
      oblasti: coverage(area.count, areas.length),
      oblastiMatched: area.matched,
      predmety: coverage(subject.count, subjects.length),
      predmetyMatched: subject.matched,
    };
    const value = 30 * (fit.oblasti ?? 0) + 15 * (fit.predmety ?? 0);
    if (!best || value > best.value) best = { ...fit, value };
  }
  return best ?? { oblasti: areas.length ? 0 : null, oblastiMatched: [], predmety: subjects.length ? 0 : null, predmetyMatched: [] };
}

/**
 * Which správní obvod a school sits in — "Praha 1".."Praha 22", or null.
 *
 * ⚠️ This reads the school's COORDINATES, never its address, and that is the
 * whole point. The "Praha N" written in a Czech postal address names a *městský
 * obvod* (only ever 1–10), which is a different division from the 22 *správní
 * obvody* this questionnaire asks about. Measured over all 60 schools, the two
 * disagree for 18 of them — addresses reading "Praha 9" that are really in
 * Praha 14, 18, 19 or 20; "Praha 4" really in Praha 11; "Praha 5" really in
 * Praha 13 or 16. Parsing the address would therefore match the wrong district
 * for a third of the database and would never match Praha 11–22 at all, since
 * no address contains those strings.
 *
 * The consequence is that geocoding is now a prerequisite for location scoring:
 * a school with no latitude/longitude has no district and matches no district
 * preference. Run `node scripts/geocode-schools.js` after every scrape.
 *
 * `school.district` is used when present — server.js attaches it from this same
 * geometry, so this only skips repeating the point-in-polygon work.
 */
/**
 * How much credit a school's district earns against the ones the student named.
 *
 * Graded by how far away it is rather than all-or-nothing. The binary version
 * cost a school 20 of 113 weight for being one district over, which capped an
 * otherwise perfect match at ~82% and pushed genuinely good schools down the
 * list for a reason the student would not recognise as decisive — "willing to
 * commute to Praha 5" does not mean "Praha 6 is worthless".
 *
 * A school we cannot place at all gets the same credit as a distant one, not
 * zero: an ungeocoded row is our gap, not the school's fault.
 */
const DISTRICT_CREDIT = [1, 0.65, 0.35, 0.2];

function districtCredit(chosen, district) {
  if (chosen.includes(district)) return 1;

  let nearest = null;
  for (const want of chosen) {
    const hops = districtHops(want, district);
    if (hops == null) continue;
    if (nearest == null || hops < nearest) nearest = hops;
  }

  if (nearest == null) return DISTRICT_CREDIT[DISTRICT_CREDIT.length - 1];
  return DISTRICT_CREDIT[Math.min(nearest, DISTRICT_CREDIT.length - 1)];
}

function districtOf(school) {
  if (!school) return null;
  return school.district ?? districtOfSchool(school);
}

/**
 * School-level context for the questionnaire's difficulty and cost questions.
 *
 * `admission_cutoff` is the school's newest year, averaged across its obory
 * (never across years; internal only, the UI shows the per-obor range) —
 * the questionnaire does not know which obor a student would pick, so this is
 * the honest granularity here. The exact per-obor cutoff stays on /prihlaska
 * (frontend/src/lib/admissionRisk.js), whose thresholds `RESERVE_CURVES` mirror.
 */
function latestZrizovatel(school) {
  const rows = (school.school_programs || []).filter((row) => row.zrizovatel);
  if (!rows.length) return null;
  const latest = rows.reduce((best, row) => (Number(row.rok ?? -Infinity) > Number(best.rok ?? -Infinity) ? row : best));
  return latest.zrizovatel;
}

// Piecewise-linear [gap, score] points, where gap = expected points - cutoff.
// +10 and -5 are the same breakpoints as bandFor() in admissionRisk.js
// (jistota at cutoff+10, reálná šance down to cutoff-5).
const RESERVE_CURVES = {
  jistota: [[-15, 0], [-5, 0.2], [5, 0.7], [10, 1], [40, 1]],
  vyvazene: [[-15, 0], [-5, 0.5], [0, 1], [12, 1], [30, 0.6]],
  ambice: [[-15, 0.1], [-8, 0.6], [-3, 1], [5, 1], [15, 0.5], [30, 0.3]],
};

function lerpCurve(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1][1];
}

// Points the student expects to gain by the real exam, added in full — the form
// asks them to be honest, so there is no hidden discount here.
const GAIN = { stejne: 0, plus5: 5, plus10: 10, plus15: 15 };

/**
 * Answers that change how much a dimension counts instead of scoring a school.
 * Factors from every answered rule multiply per dimension, and the result is
 * clamped to [0, 3x base] so stacked answers cannot let one dimension swallow
 * the average. An unanswered question changes nothing.
 */
const WEIGHT_RULES = {
  priorita_nabidka_misto: {
    nabidka: { oblasti: 1.5, predmety: 1.5, zamereni: 1.5, casti: 0.5 },
    misto: { casti: 1.8, oblasti: 0.8, predmety: 0.8 },
  },
  priorita_typ_obor: {
    typ: { typ: 1.5, oblasti: 0.8 },
    obor: { oblasti: 1.4, zamereni: 1.4, typ: 0.6 },
  },
  prestiz: {
    prestiz: { selektivita: 1.6 },
    sedi: { selektivita: 0.4 },
  },
  tlak_chytrejsi: {
    motivuje: { selektivita: 1.3 },
    stresuje: { selektivita: 0.6 },
  },
  tlak_vykon: {
    dari: { selektivita: 1.2 },
    zaseknu: { selektivita: 0.6 },
  },
  prvni_volba: {
    stres: { rezerva: 1.5 },
  },
  specializace: {
    otevrene: { zamereni: 0.5 },
    brzy: { zamereni: 1.5 },
  },
  povolani: {
    ano: { oblasti: 1.5, zamereni: 1.5 },
  },
};

function effectiveWeights(answers) {
  const weights = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.weight]));
  for (const [questionId, byOption] of Object.entries(WEIGHT_RULES)) {
    const factors = byOption[answers[questionId]];
    if (!factors) continue;
    for (const [id, factor] of Object.entries(factors)) {
      if (id in weights) weights[id] *= factor;
    }
  }
  for (const d of DIMENSIONS) {
    weights[d.id] = Math.min(d.weight * 3, Math.max(0, weights[d.id]));
  }
  return weights;
}

/**
 * The one deliberate exception to "only dimensions move the score": a family
 * that says it cannot pay tuition should see paid schools sink, and a weighted
 * dimension can be outweighed. So this multiplies the final raw score.
 * Unknown tuition on a church or public school counts as free — church schools
 * in CZ are generally state-funded; only a soukromá škola is assumed paid.
 */
const PAID_PENALTY = { ne: 0.5, male: 0.8 };
const SMALL_TUITION_CZK = 20000;

function isPaid(school, answer) {
  const tuition = extractedOf(school)?.tuition_czk_per_year;
  if (tuition != null) return answer === 'male' ? tuition > SMALL_TUITION_CZK : tuition > 0;
  return fold(latestZrizovatel(school) || '').includes('soukrom');
}

/**
 * One entry per scored dimension.
 *
 * `score(answers, school)` returns 0..1, or null to sit this one out — null
 * means "the student expressed no preference here", and the dimension's weight
 * is then excluded from the average rather than counted as a zero.
 *
 * `signal` returns a short Czech phrase naming what matched, shown to the model
 * as grounding for its explanation so the reason it writes is tied to something
 * real rather than invented.
 */
const DIMENSIONS = [
  {
    id: 'oblasti',
    weight: 30,
    score(answers, school) {
      if (!(answers.oblasti || []).length) return null;
      return school._fit.oblasti;
    },
    signal(answers, school) {
      const matched = school._fit?.oblastiMatched || [];
      return matched.length ? `pokrývá zájmy: ${matched.join(', ')}` : null;
    },
  },
  {
    id: 'typ',
    weight: 20,
    score(answers, school) {
      // "Ještě nevím" is a real answer, not a missing one — it means the type
      // genuinely should not push any school up or down.
      if (!answers.typ || answers.typ === 'nevim') return null;

      const gym = isGymnasium(school);
      const lyc = isLyceum(school);
      const trade = isTrade(school);

      if (answers.typ === 'gymnazium') {
        if (gym) return 1;
        // A lyceum sits between a gymnasium and a vocational school, so it is
        // a partial answer to either rather than a wrong one.
        if (lyc) return 0.6;
        return 0;
      }
      if (answers.typ === 'ucebni') return trade ? 1 : 0;
      // odborna: a maturita-level school that is not primarily a gymnasium
      if (lyc) return 1;
      if (!gym) return 0.8;
      return 0.3;
    },
    signal(answers, school) {
      if (!answers.typ || answers.typ === 'nevim') return null;
      if (answers.typ === 'gymnazium' && isGymnasium(school)) return 'je to gymnázium';
      if (answers.typ === 'ucebni' && isTrade(school)) return 'nabízí učební obory';
      if (answers.typ === 'odborna' && isLyceum(school)) return 'nabízí lyceum';
      return null;
    },
  },
  {
    id: 'predmety',
    weight: 15,
    score(answers, school) {
      if (!(answers.predmety || []).length) return null;
      return school._fit.predmety;
    },
    signal(answers, school) {
      const matched = school._fit?.predmetyMatched || [];
      return matched.length ? `navazuje na předměty: ${matched.join(', ')}` : null;
    },
  },
  {
    id: 'casti',
    /**
     * Raised from 15 when this question was rephrased from "where would you
     * like to study" to "where are you willing to commute", and the separate
     * commute dimension was deleted into it. It now carries both meanings, so
     * it inherits some of that weight rather than leaving it on the floor.
     *
     * Level with `typ` and below `oblasti` deliberately: a daily commute a
     * student has already said is too far is close to a veto, but what they
     * want to *study* still has to outrank where the building is.
     */
    weight: 20,
    score(answers, school) {
      const chosen = answers.casti || [];
      // Left blank means location does not matter, so no school gains or
      // loses: null drops the whole dimension out of the average rather than
      // scoring zero. See scoreSchools for why that distinction matters.
      if (!chosen.length) return null;
      return districtCredit(chosen, districtOf(school));
    },
    signal(answers, school) {
      const chosen = answers.casti || [];
      const district = districtOf(school);
      // "v Praze 14", not "v Praha 14" — Czech takes the locative here, and
      // this string is fed to the model as grounding, so bad case in equals
      // bad case out.
      if (!chosen.length || !chosen.includes(district)) return null;
      return `leží v ${district.replace('Praha', 'Praze')}`;
    },
  },
  {
    id: 'po_skole',
    weight: 10,
    score(answers, school) {
      if (!answers.po_skole || answers.po_skole === 'nevim') return null;
      const academic = isGymnasium(school) || isLyceum(school);
      const trade = isTrade(school);

      if (answers.po_skole === 'vysoka') return academic ? 1 : trade ? 0.2 : 0.6;
      // Straight to work: a trade school is the direct route, a gymnasium the
      // least direct, and everything else sits in between.
      return trade ? 1 : academic ? 0.3 : 0.7;
    },
    signal(answers, school) {
      if (answers.po_skole === 'vysoka' && isGymnasium(school)) return 'připravuje na vysokou školu';
      if (answers.po_skole === 'prace' && isTrade(school)) return 'vede rovnou do praxe';
      return null;
    },
  },
  {
    id: 'jazyky',
    weight: 5,
    score(answers, school) {
      // "Středně" is the default expectation of every school, so it separates
      // nothing and is skipped rather than scored.
      if (!answers.jazyky || answers.jazyky === 'stredne') return null;
      const languageFocus = hits(school._programs, LANGUAGE_KEYWORDS);
      if (answers.jazyky === 'velmi') return languageFocus ? 1 : 0.4;
      return languageFocus ? 0.5 : 1;
    },
    signal(answers, school) {
      return answers.jazyky === 'velmi' && hits(school._programs, LANGUAGE_KEYWORDS)
        ? 'má silnou jazykovou výuku'
        : null;
    },
  },
  {
    id: 'zamereni',
    weight: 8,
    // What share of the school's own offering is relevant to this student.
    //
    // Without this the top of the list ties constantly: the dimensions above are
    // mostly all-or-nothing, so a school built entirely around IT and a school
    // offering IT among twenty other things both score a flat 100 for an IT
    // student. They are not equally good answers, and this separates them using
    // real information rather than an arbitrary sort order. Weighted low on
    // purpose — a broad school that fits should still beat a narrow one that
    // does not.
    score(answers, school) {
      const chosen = answers.oblasti || [];
      if (!chosen.length) return null;

      const keywords = chosen.flatMap((area) => AREA_KEYWORDS[area] || []);
      const programs = school._programs
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
      if (!programs.length) return null;

      const relevant = programs.filter((program) =>
        keywords.some((keyword) => program.includes(keyword))
      );
      return relevant.length / programs.length;
    },
    signal(answers, school) {
      const chosen = answers.oblasti || [];
      if (!chosen.length) return null;
      const keywords = chosen.flatMap((area) => AREA_KEYWORDS[area] || []);
      const programs = school._programs.split(',').map((e) => e.trim()).filter(Boolean);
      const relevant = programs.filter((p) => keywords.some((k) => p.includes(k)));
      // Only worth saying when the school is genuinely built around this.
      return programs.length && relevant.length / programs.length >= 0.6
        ? 'zaměřuje se přesně na tvoje obory'
        : null;
    },
  },
  {
    id: 'styl',
    weight: 5,
    score(answers, school) {
      if (!answers.styl || answers.styl === 'kombinace') return null;
      const academic = isGymnasium(school) || isLyceum(school);
      const practical = isTrade(school);
      if (answers.styl === 'teorie') return academic ? 1 : practical ? 0.3 : 0.6;
      return practical ? 1 : academic ? 0.3 : 0.7;
    },
    signal(answers, school) {
      if (answers.styl === 'praxe' && isTrade(school)) return 'je hodně praktická';
      return null;
    },
  },
  {
    /**
     * Scored against `krouzky_kategorie` (189/219 schools have it, 110 with
     * at least one category — see UNFORGET.md 2026-09-26). Common enough to
     * be a real dimension, unlike the two bonus-only ones below.
     *
     * `null` (school never checked, or its cached pages had nothing to check)
     * drops the school from this dimension entirely — same treatment an
     * unanswered question gets. An empty array `[]` is different: the school
     * WAS checked and genuinely offers nothing in a matched category, which is
     * real evidence and scores like any other miss.
     */
    id: 'krouzky',
    weight: 8,
    score(answers, school) {
      const chosen = answers.krouzky || [];
      if (!chosen.length) return null;
      const categories = extractedOf(school)?.krouzky_kategorie;
      if (categories == null) return null;
      const matched = chosen.filter((category) => categories.includes(category));
      return coverage(matched.length, chosen.length);
    },
    signal(answers, school) {
      const chosen = answers.krouzky || [];
      const categories = extractedOf(school)?.krouzky_kategorie;
      if (!chosen.length || categories == null) return null;
      const matched = chosen.filter((category) => categories.includes(category));
      return matched.length ? `má kroužky: ${matched.join(', ')}` : null;
    },
  },
  {
    /**
     * Bonus only — see the coverage note on `extractedOf` above. `ma_jidelnu`
     * (50/219 schools) is too sparse to weight like a real dimension, so it
     * moves a school a little rather than deciding anything. A school with no
     * value is skipped, never scored as "no lunch".
     */
    id: 'jidelna',
    weight: 3,
    score(answers, school) {
      if (!answers.jidelna || answers.jidelna === 'nezalezi') return null;
      const maJidelnu = extractedOf(school)?.ma_jidelnu;
      if (maJidelnu == null) return null;
      return maJidelnu ? 1 : 0;
    },
    signal(answers, school) {
      if (answers.jidelna !== 'ano') return null;
      return extractedOf(school)?.ma_jidelnu ? 'má vlastní jídelnu nebo zajištěné obědy' : null;
    },
  },
  {
    /**
     * Bonus only, same reasoning as `jidelna`. Reuses the existing `styl`
     * answer (teorie/praxe) rather than asking a second, near-duplicate
     * question — `vyukovy_styl_tagy` (77/219 schools) just adds evidence to a
     * preference already collected. `kombinace` already skips the `styl`
     * dimension above for the same reason it skips this one: it is not a
     * preference for either style.
     */
    id: 'vyukovy_styl',
    weight: 3,
    score(answers, school) {
      if (!answers.styl || answers.styl === 'kombinace') return null;
      const tags = extractedOf(school)?.vyukovy_styl_tagy;
      if (tags == null) return null;
      const wanted = answers.styl === 'praxe' ? 'praxe_dilny' : 'tradicni_vyklad';
      return tags.includes(wanted) ? 1 : 0;
    },
    signal(answers, school) {
      if (!answers.styl || answers.styl === 'kombinace') return null;
      const tags = extractedOf(school)?.vyukovy_styl_tagy;
      const wanted = answers.styl === 'praxe' ? 'praxe_dilny' : 'tradicni_vyklad';
      return tags?.includes(wanted)
        ? (answers.styl === 'praxe' ? 'učí hodně prakticky' : 'učí formou tradičního výkladu')
        : null;
    },
  },
  {
    /**
     * How hard a school is to get into, as a rank among all Prague schools
     * (0 = easiest, 1 = hardest, from `_selectivity`). Two questions feed one
     * direction each: wanting a challenge / a hard-to-enter school pulls
     * toward the hard end, wanting a similar level / an easy one toward the
     * easy end. "Je mi to jedno" adds no direction. No cutoff → null.
     */
    id: 'selektivita',
    weight: 10,
    score(answers, school) {
      const p = school._selectivity;
      if (p == null) return null;
      const directions = [];
      if (answers.selektivita_vyzva === 'vyzva') directions.push(1);
      if (answers.selektivita_vyzva === 'podobna') directions.push(-1);
      if (answers.selektivita_tezka === 'ano') directions.push(1);
      if (answers.selektivita_tezka === 'ne') directions.push(-1);
      if (!directions.length) return null;
      const scores = directions.map((d) => (d > 0 ? p : 1 - p));
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    },
    signal(answers, school) {
      const p = school._selectivity;
      if (p == null) return null;
      const wantsHard = answers.selektivita_vyzva === 'vyzva' || answers.selektivita_tezka === 'ano';
      const wantsEasy = answers.selektivita_vyzva === 'podobna' || answers.selektivita_tezka === 'ne';
      if (wantsHard && p >= 0.7) return 'patří k nejnáročnějším školám k přijetí';
      if (wantsEasy && p <= 0.3) return 'dostat se sem bývá snazší';
      return null;
    },
  },
  {
    /**
     * Gap between the student's expected points and the school's cutoff.
     * Needs `body` (their Cermat points) — without it this dimension is
     * skipped and only the selectivity questions count. Expected points are
     * points plus the full self-estimated gain; the form asks for honesty.
     * Signals never contain the numbers, so a minor's points are not sent to
     * the AI provider.
     */
    id: 'rezerva',
    weight: 15,
    score(answers, school) {
      const curve = RESERVE_CURVES[answers.rezerva];
      if (!curve || typeof answers.body !== 'number' || school.admission_cutoff == null) return null;
      const expected = answers.body + (GAIN[answers.body_zlepseni] || 0);
      return lerpCurve(curve, expected - school.admission_cutoff);
    },
    signal(answers, school) {
      if (!RESERVE_CURVES[answers.rezerva] || typeof answers.body !== 'number' || school.admission_cutoff == null) {
        return null;
      }
      const gap = answers.body + (GAIN[answers.body_zlepseni] || 0) - school.admission_cutoff;
      if (gap >= 10) return 's tvými body máš velkou rezervu';
      if (gap >= -5) return 's tvými body máš reálnou šanci';
      return 'hranice přijetí je nad tvými body';
    },
  },
  {
    id: 'cirkevni',
    weight: 6,
    score(answers, school) {
      if (answers.cirkevni !== 'ano' && answers.cirkevni !== 'ne') return null;
      const z = latestZrizovatel(school);
      if (!z) return null;
      const church = fold(z).includes('cirkev');
      return (answers.cirkevni === 'ano') === church ? 1 : 0;
    },
    signal(answers, school) {
      return answers.cirkevni === 'ano' && fold(latestZrizovatel(school) || '').includes('cirkev')
        ? 'je to církevní škola'
        : null;
    },
  },
  {
    // 83/220 schools have the flag, 11 of them true — low weight, and a school
    // with null is skipped, never scored as traditional.
    id: 'alternativni',
    weight: 5,
    score(answers, school) {
      if (answers.alternativni !== 'ano' && answers.alternativni !== 'ne') return null;
      const flag = extractedOf(school)?.alternativni_pedagogika;
      if (flag == null) return null;
      return (answers.alternativni === 'ano') === flag ? 1 : 0;
    },
    signal(answers, school) {
      return answers.alternativni === 'ano' && extractedOf(school)?.alternativni_pedagogika
        ? 'učí alternativní pedagogikou'
        : null;
    },
  },
  {
    // Keep options open favours a broad gymnázium/lyceum, specialising early
    // favours a vocational school.
    id: 'sirka',
    weight: 8,
    score(answers, school) {
      if (answers.specializace !== 'otevrene' && answers.specializace !== 'brzy') return null;
      if (answers.specializace === 'otevrene') return isGymnasium(school) ? 1 : isLyceum(school) ? 0.7 : 0.3;
      return isTrade(school) ? 1 : isGymnasium(school) ? 0.3 : 0.8;
    },
    signal(answers, school) {
      if (answers.specializace === 'otevrene' && isGymnasium(school)) return 'dává široký základ';
      if (answers.specializace === 'brzy' && isTrade(school)) return 'specializuje se od začátku';
      return null;
    },
  },
];

/**
 * Scores every school and returns them ranked, best first.
 *
 * Each entry carries the percentage, the per-dimension breakdown (useful when
 * tuning weights, and available to the UI later) and the matched signals the
 * explanation step is grounded in.
 */
/**
 * Turns the raw weighted average into the percentage a student actually sees.
 *
 *   shown = 100 * (1 - (1 - raw/100) ^ 1.4)
 *
 * WHY THE RAW NUMBER IS NOT SHOWN DIRECTLY
 *
 * Raw is the share of the student's stated wishes a school satisfies, and it is
 * brutal by construction: eight dimensions, and missing any one of them costs
 * its full weight. In practice the best school in the database lands around
 * 80 raw for a typical answer set, which reads as a poor match when it is in
 * fact the single best of 223 schools. Nothing was wrong with the arithmetic —
 * the scale simply did not mean to a reader what it meant to the code.
 *
 * WHAT THIS CURVE DOES, AND WHAT IT REFUSES TO DO
 *
 * It is a fixed, monotone function of the raw score and nothing else. It never
 * looks at the other results, so it does NOT stretch a weak field to look
 * strong — the module's "absolute, not relative" rule above still holds, and a
 * student whose answers the database cannot serve still sees a visibly lower
 * number than one it serves well (raw 60 shows 72, raw 95 shows 99).
 *
 * Deliberately rejected: normalising against the best available school. That
 * made every student's top result identical (98%) whether their best match
 * covered nearly everything or barely half of it, which is exactly the kind of
 * flattering, meaningless number this module exists to avoid.
 *
 * The exponent shapes how hard the last points are to earn: gaining ground is
 * easy while a school is a poor fit and progressively harder near the top, so
 * 100% requires raw >= ~98 — genuinely matching almost everything asked for.
 * Ordering is untouched, since the curve is strictly increasing.
 */
const DISPLAY_EXPONENT = 1.4;

function displayScore(raw) {
  const bounded = Math.min(100, Math.max(0, raw));
  return Math.round(100 * (1 - Math.pow(1 - bounded / 100, DISPLAY_EXPONENT)));
}

function scoreSchools(answers, schools) {
  const weights = effectiveWeights(answers);
  // Rank of each school's cutoff among all schools, 0 = easiest .. 1 = hardest.
  // ponytail: O(n^2) over ~220 schools; sort + binary search past a few thousand.
  const cutoffs = schools.map((s) => s.admission_cutoff).filter((c) => c != null);
  const percentileOf = (c) => (c == null ? null : cutoffs.filter((x) => x < c).length / Math.max(1, cutoffs.length - 1));

  return schools
    .map((school) => {
      // Folded once per school rather than once per keyword lookup.
      const prepared = {
        ...school,
        _programs: fold(school.programs),
        _selectivity: percentileOf(school.admission_cutoff),
      };
      prepared._fit = bestObor(answers, prepared);

      let total = 0;
      let applicable = 0;
      const breakdown = {};
      const signals = [];

      for (const dimension of DIMENSIONS) {
        const weight = weights[dimension.id];
        if (!weight) continue;
        const value = dimension.score(answers, prepared);
        if (value === null) continue;

        total += value * weight;
        applicable += weight;
        breakdown[dimension.id] = Math.round(value * 100) / 100;

        const signal = dimension.signal(answers, prepared);
        if (signal) signals.push(signal);
      }

      // No applicable dimension at all means the student answered "nevím" to
      // everything scoreable. Everything ties on 0 and the order is then the
      // database's, which is honest: we have nothing to rank on.
      let raw = applicable ? (total / applicable) * 100 : 0;

      if (PAID_PENALTY[answers.skolne] && isPaid(prepared, answers.skolne)) {
        raw *= PAID_PENALTY[answers.skolne];
        signals.push('je placená škola');
      }

      return {
        school_id: school.id,
        score: displayScore(raw),
        raw_score: Math.round(raw),
        breakdown,
        signals,
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  scoreSchools,
  displayScore,
  effectiveWeights,
  districtOf,
  fold,
  DIMENSIONS,
};
