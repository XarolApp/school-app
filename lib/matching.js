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
const { districtOfSchool } = require('./pragueDistricts');

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
  humanitni: ['gymnazium', 'humanitni', 'jazyk', 'knihkupeck', 'verejnospravni', 'pravni', 'pedagogick'],
  ekonomika: ['ekonomik', 'podnikani', 'obchodni akademie', 'ekonomicke lyceum', 'obchodnik', 'prodavac', 'marketing', 'ucetnictvi', 'financ'],
  umeni: ['design', 'umelecky', 'graficky', 'fotografie', 'multimedialni', 'aranzer', 'vytvarn', 'hudebn', 'rezbar', 'kovar', 'pasir', 'scenick'],
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
  cestina: ['gymnazium', 'humanitni', 'knihkupeck', 'verejnospravni', 'pedagogick'],
  cizi_jazyky: ['jazyk', 'anglick', 'nemeck', 'spanel', 'francouz', 'bilingv', 'worldwide', 'cestovni ruch', 'hotelnictvi', 'mezinarodn'],
  fyzika: ['strojiren', 'elektrotechnik', 'technicke lyceum', 'letecky', 'stavebnictvi', 'mechanik'],
  chemie: ['chemi', 'farmaceut', 'kosmetick', 'potravinar', 'laboratorn'],
  biologie: ['zdravotnick', 'prirodovedn', 'ekolog', 'veterinar', 'osetrovatel', 'laboratorn'],
  dejepis: ['gymnazium', 'humanitni', 'verejnospravni', 'pravni', 'knihkupeck'],
  informatika: ['informacni technologie', 'informatika', 'kyberne', 'programov', 'informacni sluzby', 'digitalni'],
  vytvarka: ['design', 'umelecky', 'graficky', 'fotografie', 'multimedialni', 'aranzer', 'vytvarn', 'hudebn'],
  telocvik: ['sportovni', 'sport', 'telesn'],
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
function districtOf(school) {
  if (!school) return null;
  return school.district ?? districtOfSchool(school);
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
      const chosen = answers.oblasti || [];
      if (!chosen.length) return null;
      const matched = chosen.filter((area) => hits(school._programs, AREA_KEYWORDS[area] || []));
      return coverage(matched.length, chosen.length);
    },
    signal(answers, school) {
      const chosen = answers.oblasti || [];
      const matched = chosen.filter((area) => hits(school._programs, AREA_KEYWORDS[area] || []));
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

      const isGymnasium = hits(school._programs, GYMNASIUM_KEYWORDS);
      const isLyceum = hits(school._programs, LYCEUM_KEYWORDS);
      const isTrade = hits(school._programs, TRADE_KEYWORDS);

      if (answers.typ === 'gymnazium') {
        if (isGymnasium) return 1;
        // A lyceum sits between a gymnasium and a vocational school, so it is
        // a partial answer to either rather than a wrong one.
        if (isLyceum) return 0.6;
        return 0;
      }
      if (answers.typ === 'ucebni') return isTrade ? 1 : 0;
      // odborna: a maturita-level school that is not primarily a gymnasium
      if (isLyceum) return 1;
      if (!isGymnasium) return 0.8;
      return 0.3;
    },
    signal(answers, school) {
      if (!answers.typ || answers.typ === 'nevim') return null;
      if (answers.typ === 'gymnazium' && hits(school._programs, GYMNASIUM_KEYWORDS)) return 'je to gymnázium';
      if (answers.typ === 'ucebni' && hits(school._programs, TRADE_KEYWORDS)) return 'nabízí učební obory';
      if (answers.typ === 'odborna' && hits(school._programs, LYCEUM_KEYWORDS)) return 'nabízí lyceum';
      return null;
    },
  },
  {
    id: 'predmety',
    weight: 15,
    score(answers, school) {
      const chosen = answers.predmety || [];
      if (!chosen.length) return null;
      const matched = chosen.filter((subject) => hits(school._programs, SUBJECT_KEYWORDS[subject] || []));
      return coverage(matched.length, chosen.length);
    },
    signal(answers, school) {
      const chosen = answers.predmety || [];
      const matched = chosen.filter((subject) => hits(school._programs, SUBJECT_KEYWORDS[subject] || []));
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
      return chosen.includes(districtOf(school)) ? 1 : 0;
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
      const academic = hits(school._programs, GYMNASIUM_KEYWORDS) || hits(school._programs, LYCEUM_KEYWORDS);
      const trade = hits(school._programs, TRADE_KEYWORDS);

      if (answers.po_skole === 'vysoka') return academic ? 1 : trade ? 0.2 : 0.6;
      // Straight to work: a trade school is the direct route, a gymnasium the
      // least direct, and everything else sits in between.
      return trade ? 1 : academic ? 0.3 : 0.7;
    },
    signal(answers, school) {
      if (answers.po_skole === 'vysoka' && hits(school._programs, GYMNASIUM_KEYWORDS)) return 'připravuje na vysokou školu';
      if (answers.po_skole === 'prace' && hits(school._programs, TRADE_KEYWORDS)) return 'vede rovnou do praxe';
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
      const academic = hits(school._programs, GYMNASIUM_KEYWORDS) || hits(school._programs, LYCEUM_KEYWORDS);
      const practical = hits(school._programs, TRADE_KEYWORDS);
      if (answers.styl === 'teorie') return academic ? 1 : practical ? 0.3 : 0.6;
      return practical ? 1 : academic ? 0.3 : 0.7;
    },
    signal(answers, school) {
      if (answers.styl === 'praxe' && hits(school._programs, TRADE_KEYWORDS)) return 'je hodně praktická';
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
function scoreSchools(answers, schools) {
  return schools
    .map((school) => {
      // Folded once per school rather than once per keyword lookup.
      const prepared = { ...school, _programs: fold(school.programs) };

      let total = 0;
      let applicable = 0;
      const breakdown = {};
      const signals = [];

      for (const dimension of DIMENSIONS) {
        const value = dimension.score(answers, prepared);
        if (value === null) continue;

        total += value * dimension.weight;
        applicable += dimension.weight;
        breakdown[dimension.id] = Math.round(value * 100) / 100;

        const signal = dimension.signal(answers, prepared);
        if (signal) signals.push(signal);
      }

      return {
        school_id: school.id,
        // No applicable dimension at all means the student answered "nevím" to
        // everything scoreable. Everything ties on 0 and the order is then the
        // database's, which is honest: we have nothing to rank on.
        score: applicable ? Math.round((total / applicable) * 100) : 0,
        breakdown,
        signals,
      };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  scoreSchools,
  districtOf,
  fold,
  DIMENSIONS,
};
