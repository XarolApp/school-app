/**
 * ŠkolaMatch deterministic matcher.
 *
 * HARD RULES (CLAUDE.md + trust engine):
 *  1. Scoring is plain, auditable math. No AI, no randomness, no network call.
 *     Claude may later write the Czech *sentences*, never the numbers.
 *  2. A skipped / "nevím jistě" answer NEVER lowers a score (zero-shame rule).
 *     Its component is removed and the remaining weights are renormalised, and
 *     the CONFIDENCE drops instead. Missing information widens the interval;
 *     it does not punish the user.
 *  3. A component whose school-side data is unknown is likewise dropped. We
 *     only ever score on text we actually read.
 *  4. The result is reported as a BAND plus the explicit list of what it was
 *     based on - never a spurious percentage. With only name/location/programs
 *     in the database, "97% shoda" would be a lie.
 */

import { deriveFeatures } from './schoolFeatures';

/** Base weights. Question `priority` shifts focus <-> location. */
const BASE_WEIGHTS = {
  focus: 0.32,
  studyType: 0.14,
  maturita: 0.1,
  language: 0.07,
  practice: 0.09,
  location: 0.2,
  breadth: 0.08,
};

const BAND_THRESHOLDS = [
  { min: 0.75, id: 'vyborne', label: 'Sedí ti výborně', parentLabel: 'Sedí velmi dobře', tone: 'strong' },
  { min: 0.55, id: 'dobre', label: 'Sedí ti dobře', parentLabel: 'Dobrá shoda', tone: 'good' },
  { min: 0.35, id: 'zvazit', label: 'Stojí za zvážení', parentLabel: 'Stojí za zvážení', tone: 'ok' },
];

export function bandFor(score, role) {
  const band = BAND_THRESHOLDS.find((b) => score >= b.min);
  if (!band) {
    return { id: 'slabe', label: 'Spíš nesedí', parentLabel: 'Spíš nevyhovuje', tone: 'weak' };
  }
  return role === 'parent' ? { ...band, label: band.parentLabel } : band;
}

/** Component definitions: each returns null when it cannot be scored. */
const COMPONENTS = {
  focus(a, f) {
    const wanted = a.focus;
    if (!wanted || wanted.length === 0 || !f.focusKnown) return null;
    const hits = wanted.filter((id) => f.focus.includes(id)).length;
    if (hits === 0) return { score: 0, hit: false, note: 'zaměření' };
    const score = Math.min(1, 0.7 + 0.3 * ((hits - 1) / Math.max(1, wanted.length - 1)));
    return { score, hit: true, note: 'zaměření' };
  },

  studyType(a, f) {
    if (!a.studyType || a.studyType === 'nevim' || !f.type) return null;
    if (a.studyType === f.type) return { score: 1, hit: true, note: 'typ školy' };
    const soft =
      (a.studyType === 'gymnazium' && f.type === 'odborna') ||
      (a.studyType === 'odborna' && f.type === 'gymnazium');
    return { score: soft ? 0.45 : 0.1, hit: false, note: 'typ školy' };
  },

  maturita(a, f) {
    if (!a.future || a.future === 'nevim' || f.hasMaturita === null) return null;
    if (a.future === 'vysoka') {
      return { score: f.hasMaturita ? 1 : 0.15, hit: f.hasMaturita, note: 'maturita' };
    }
    if (a.future === 'remeslo') {
      return { score: f.hasMaturita ? 0.5 : 1, hit: !f.hasMaturita, note: 'praktický obor' };
    }
    return null;
  },

  language(a, f) {
    if (!a.language || a.language === 'nezalezi' || a.language === 'nevim' || !f.languageKnown) return null;
    if (a.language === 'hodne') {
      return { score: f.language ? 1 : 0.35, hit: f.language, note: 'jazyky' };
    }
    return { score: f.language ? 0.7 : 0.8, hit: false, note: 'jazyky' };
  },

  practice(a, f) {
    if (!a.practice || a.practice === 'nevim' || !f.practiceKnown) return null;
    if (a.practice === 'praxe') {
      return { score: f.practice ? 1 : 0.3, hit: f.practice, note: 'praxe' };
    }
    if (a.practice === 'teorie') {
      return { score: f.practice ? 0.4 : 0.9, hit: !f.practice, note: 'teorie' };
    }
    return { score: 0.7, hit: false, note: 'praxe i teorie' };
  },

  /**
   * Binary membership, not a distance band: the student names every district
   * they are willing to commute TO (question `districts`, a multi-select
   * paired with the interactive map), rather than a home district plus a
   * tolerance level scored by hop-count.
   *
   * This replaced the earlier home-district + hop-distance design. Reasoning
   * kept here since it is easy to reintroduce by accident: a travel-time
   * estimate would need a routing call and a home address, and there is no
   * timetable data to make either honest. The student already knows their own
   * tolerance and their own sense of "too far" — this question just asks for
   * it directly instead of trying to infer it from geography.
   */
  location(a, f) {
    if (!Array.isArray(a.districts) || a.districts.length === 0) return null;
    if (f.district === null || f.district === undefined) return null;
    const wanted = new Set(a.districts.map(Number));
    const hit = wanted.has(f.district);
    return { score: hit ? 1 : 0, hit, note: 'lokalita' };
  },

  breadth(a, f) {
    if (!a.certainty || a.certainty === 'nevim') return null;
    if (!f.breadth) return null;
    const wide = Math.min(1, f.breadth / 5);
    // An undecided student is genuinely safer at a school with a broader offer.
    if (a.certainty === 'vubec') return { score: wide, hit: wide > 0.6, note: 'široká nabídka oborů' };
    if (a.certainty === 'spis') return { score: 0.5 + wide * 0.3, hit: false, note: 'nabídka oborů' };
    return { score: 0.6 + (1 - wide) * 0.2, hit: false, note: 'úzké zaměření' };
  },
};

function weightsFor(answers) {
  const w = { ...BASE_WEIGHTS };
  if (answers.priority === 'zamereni') {
    w.focus += 0.08;
    w.location -= 0.08;
  } else if (answers.priority === 'blizkost') {
    w.location += 0.12;
    w.focus -= 0.08;
    w.breadth -= 0.04;
  }
  return w;
}

export function scoreSchool(school, answers, role = 'student') {
  const f = deriveFeatures(school);
  const weights = weightsFor(answers);

  let weighted = 0;
  let usedWeight = 0;
  const parts = {};
  const basedOn = [];
  const missing = [];

  for (const [key, fn] of Object.entries(COMPONENTS)) {
    const result = fn(answers, f);
    const w = weights[key] || 0;
    if (!result) {
      if (w > 0) missing.push(key);
      continue;
    }
    parts[key] = result;
    weighted += result.score * w;
    usedWeight += w;
    if (result.hit) basedOn.push(result.note);
  }

  const totalWeight = Object.values(weights).reduce((s, x) => s + x, 0);
  // Renormalise across ANSWERED components only: skips never penalise.
  const score = usedWeight > 0 ? weighted / usedWeight : 0;
  const confidence = totalWeight > 0 ? usedWeight / totalWeight : 0;

  return {
    school,
    features: f,
    score,
    band: bandFor(score, role),
    confidence,
    confidenceLabel: confidence >= 0.7 ? 'Vysoká' : confidence >= 0.45 ? 'Střední' : 'Nízká',
    basedOn: [...new Set(basedOn)],
    missing,
    parts,
    scored: usedWeight > 0,
  };
}

export function rankSchools(schools, answers, role = 'student') {
  return schools
    .map((s) => scoreSchool(s, answers, role))
    .filter((r) => r.scored)
    .sort(
      (a, b) => b.score - a.score || String(a.school.name).localeCompare(String(b.school.name), 'cs')
    );
}

/** Live narrowing counter used during the quiz (variable reward).
 *  Honest by construction: a real count of real candidates. */
export function countCandidates(schools, answers, role = 'student') {
  if (!schools.length) return { fitting: 0, total: 0 };
  const ranked = rankSchools(schools, answers, role);
  return { fitting: ranked.filter((r) => r.score >= 0.55).length, total: schools.length };
}

/**
 * Deterministic Czech explanation sentences.
 *
 * TODO(claude-api): replace with a Claude call that writes these sentences from
 * the SAME structured `result` object. The bands and every number must keep
 * coming from the math above - Claude never computes or restates a score.
 */
export function explain(result, answers, role = 'student') {
  const formal = role === 'parent';
  const out = [];
  const f = result.features;
  const p = result.parts;

  if (p.focus?.hit) {
    out.push(
      formal
        ? 'Škola nabízí obory v oblasti, kterou jste u dítěte označili jako hlavní zájem.'
        : 'Tahle škola má obory přesně v tom, co tě baví.'
    );
  } else if (p.focus) {
    out.push(
      formal
        ? 'Zaměření školy se s vybranými zájmy překrývá jen částečně.'
        : 'Zaměření se s tvými zájmy potkává jen částečně — což nemusí vadit, pokud tě láká zkusit něco nového.'
    );
  }

  if (p.location?.hit) {
    out.push(
      formal
        ? 'Škola leží v části Prahy, kam jste ochotni dojíždět.'
        : 'Je v části Prahy, kam jsi ochotný/á jezdit.'
    );
  }

  if (p.maturita?.hit && f.hasMaturita) {
    out.push(
      formal
        ? 'Studium je zakončeno maturitou, cesta na vysokou školu tedy zůstává otevřená.'
        : 'Končí to maturitou, takže na vysokou pak můžeš.'
    );
  }
  if (p.language?.hit) {
    out.push(formal ? 'Škola má v nabídce silnější jazykovou přípravu.' : 'Jazyky tu jedou naplno.');
  }
  if (p.practice?.hit && f.practice) {
    out.push(
      formal ? 'Výuka obsahuje výraznou praktickou složku.' : 'Hodně praxe, míň sezení v lavici.'
    );
  }

  if (result.confidence < 0.6) {
    out.push(
      formal
        ? 'Část otázek zůstala bez odpovědi, proto je toto doporučení orientační. Na přesnosti to neubírá tam, kde jsme data měli.'
        : 'Pár otázek jsi přeskočil, tak to zatím ber orientačně. Nic se neděje — doplnit je můžeš kdykoli.'
    );
  }

  return out;
}

/**
 * The honest OTHER half of `explain`: the components that were scored and did
 * NOT hit.
 *
 * A "Shoda podle" list containing only wins is a sales pitch, not an
 * explanation — and the first thing a parent does with a recommendation is look
 * for what it is not telling them. Naming the trade-offs is what makes the
 * positives believable, and it is Cal AI's highest-transfer tactic (stating a
 * limitation up front measurably reduces refunds).
 *
 * ZERO-SHAME: every line here is about the SCHOOL not matching a preference,
 * never about the user. Nothing in this function may read as a judgement of the
 * person answering. Components the user skipped are absent from `parts`
 * entirely and therefore silently produce no line — a skip is not a trade-off.
 */
export function tradeoffs(result, role = 'student') {
  const formal = role === 'parent';
  const out = [];
  const p = result.parts;

  if (p.focus && !p.focus.hit) {
    out.push(
      formal
        ? 'Zaměření — obory školy se s uvedenými zájmy nepřekrývají. Ve výsledku ji drží ostatní kritéria.'
        : 'Zaměření — obory téhle školy se s tím, co tě baví, nepotkávají. Nahoře je díky ostatním věcem.'
    );
  }
  if (p.studyType && !p.studyType.hit) {
    out.push(
      formal
        ? 'Typ školy je jiný, než jaký jste uvedli jako preferovaný.'
        : 'Typ školy není přesně ten, který jsi vybral.'
    );
  }
  if (p.location && !p.location.hit) {
    out.push(
      formal
        ? 'Leží mimo části Prahy, které jste označili — dojíždění bude delší.'
        : 'Je mimo části Prahy, které jsi vybral — dojíždět budeš dýl.'
    );
  }
  if (p.language && !p.language.hit) {
    out.push(
      formal
        ? 'Jazyky zde mají standardní rozsah, nikoli rozšířený.'
        : 'Jazyky tu jedou v běžném rozsahu, ne rozšířeně.'
    );
  }
  if (p.practice && !p.practice.hit) {
    out.push(
      formal
        ? 'Poměr praxe a teorie neodpovídá tomu, co jste označili.'
        : 'Poměr praxe a teorie není přesně ten, cos chtěl.'
    );
  }

  return out;
}
