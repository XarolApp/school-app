/**
 * The 10 quiz questions — one per screen.
 *
 * Design rules baked in here:
 *  - EVERY question feeds the scoring engine. Data minimisation (GDPR Art. 8,
 *    minors): if the matcher does not consume an answer, the question is cut.
 *    Nothing here is a "nice to have" field.
 *  - The role fork changes VOICE, FRAMING and PHRASING only, never the scoring
 *    engine. Both branches write the same answer keys with the same values, so
 *    a parent and their child answering honestly get comparable results.
 *  - Student branch: tykání, teen vocabulary. Parent branch: vykání, questions
 *    asked ABOUT THE CHILD, and a "Nevím jistě" option on EVERY item — a parent
 *    genuinely does not know all of this, and forcing a guess produces garbage
 *    scores and burns adult trust.
 *  - `defaultValue` = smart default where a true modal answer exists (reduces
 *    decision fatigue). Where no honest default exists, there is none.
 *  - Skipping is always allowed and never lowers a score.
 */

import { FOCUS_CATEGORIES } from '../../lib/schoolFeatures';

const UNSURE = { value: 'nevim', label: 'Nevím jistě', unsure: true };

/** Praha 1-22 options for the districts question. Values must match the `id`s
 *  in lib/pragueDistricts.js exactly — that string equality is the whole
 *  contract between the checkboxes and the clickable map. */
const DISTRICT_OPTIONS = Array.from({ length: 22 }, (_, i) => ({
  value: String(i + 1),
  label: `Praha ${i + 1}`,
}));

/** How many districts a student can pick before the rest dim. Six of
 *  twenty-two would quietly turn "where would you commute to" into a much
 *  narrower question than it reads as. */
const DISTRICTS_MAX = 10;

export const QUESTIONS = [
  {
    id: 'focus',
    key: 'focus',
    type: 'multi',
    student: {
      title: 'Co tě baví nejvíc?',
      hint: 'Vyber klidně víc věcí — málokdo má jenom jednu.',
    },
    parent: {
      title: 'Co vaše dítě baví nejvíc?',
      hint: 'Můžete vybrat více oblastí. Pokud si nejste jistí, zvolte „Nevím jistě“.',
    },
    options: FOCUS_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
  },
  {
    id: 'future',
    key: 'future',
    type: 'single',
    student: {
      title: 'Kde se vidíš za pět let?',
      hint: 'Nemusí to být plán na celý život. Jde o směr.',
    },
    parent: {
      title: 'Kam podle vás vaše dítě za pět let směřuje?',
      hint: 'Stačí přibližný směr, ne definitivní plán.',
    },
    options: [
      {
        value: 'vysoka',
        label: 'Na vysoké škole',
        studentLabel: 'Na vysoké škole',
        parentLabel: 'Na vysoké škole',
      },
      {
        value: 'remeslo',
        label: 'V práci, kde něco dělám rukama',
        parentLabel: 'V praktické profesi s vyučením',
      },
      { value: 'nevim', label: 'Ještě fakt nevím', parentLabel: 'Nevím jistě', unsure: true },
    ],
  },
  {
    id: 'studyType',
    key: 'studyType',
    type: 'single',
    student: {
      title: 'Táhne tě spíš gympl, nebo odborka?',
      hint: 'Když nevíš, klidně nech „ještě nevím“ — ukážeme ti obojí.',
    },
    parent: {
      title: 'Uvažujete spíše o gymnáziu, nebo o odborné škole?',
      hint: 'Pokud jste se zatím nerozhodli, ponechte „Nevím jistě“ — zobrazíme obě varianty.',
    },
    defaultValue: 'nevim',
    options: [
      { value: 'gymnazium', label: 'Gymnázium (všeobecné)' },
      { value: 'odborna', label: 'Odborná škola s maturitou' },
      { value: 'ucebni', label: 'Učební obor s výučním listem' },
      { value: 'nevim', label: 'Ještě nevím', parentLabel: 'Nevím jistě', unsure: true },
    ],
  },
  {
    id: 'language',
    key: 'language',
    type: 'single',
    student: {
      title: 'Jak moc chceš jazyky?',
      hint: 'Některé školy jedou jazyky naplno, jiné je berou jako doplněk.',
    },
    parent: {
      title: 'Jak důležitá je pro vás jazyková příprava?',
      hint: 'Některé školy mají rozšířenou či bilingvní výuku, jiné standardní.',
    },
    defaultValue: 'nezalezi',
    options: [
      { value: 'hodne', label: 'Hodně — chci silnou jazykovku', parentLabel: 'Velmi důležitá' },
      { value: 'trochu', label: 'Základ mi stačí', parentLabel: 'Spíše doplňková' },
      { value: 'nezalezi', label: 'Nezáleží mi na tom', parentLabel: 'Nezáleží nám na tom' },
      UNSURE,
    ],
  },
  {
    id: 'practice',
    key: 'practice',
    type: 'single',
    student: {
      title: 'Praxe, nebo teorie?',
      hint: 'Ani jedna odpověď není lepší. Jsou to dva různé typy škol.',
    },
    parent: {
      title: 'Vyhovuje dítěti spíše praktická, nebo teoretická výuka?',
      hint: 'Obě cesty jsou plnohodnotné, vedou jen k jiným typům škol.',
    },
    defaultValue: 'obojí',
    options: [
      { value: 'praxe', label: 'Radši praxe a dílny', parentLabel: 'Spíše praktická výuka' },
      { value: 'teorie', label: 'Radši teorie a učení', parentLabel: 'Spíše teoretická výuka' },
      { value: 'obojí', label: 'Půl na půl', parentLabel: 'Kombinace obojího' },
      UNSURE,
    ],
  },
  /**
   * Asks which districts the student would commute TO, not where they live
   * plus a tolerance level. This is deliberate — see the note above
   * `location` in lib/matching.js for why. Nothing about a home address is
   * collected: the student already knows their own sense of "too far" and
   * answers from it directly, more accurately than a distance estimate could.
   *
   * `map: true` tells QuizQuestion to render the interactive district picker
   * (components/onboarding/DistrictMap.jsx) beside the checkboxes.
   */
  {
    id: 'districts',
    key: 'districts',
    type: 'multi',
    map: true,
    max: DISTRICTS_MAX,
    student: {
      title: 'Do kterých částí Prahy jsi ochotný/á dojíždět?',
      hint: 'Vyber klidně víc — čím širší okruh, tím víc škol uvidíš.',
    },
    parent: {
      title: 'Do kterých částí Prahy je dítě ochotné dojíždět?',
      hint: 'Můžete vybrat víc částí. Pokud si nejste jistí, klidně přeskočte.',
    },
    options: DISTRICT_OPTIONS,
    honesty:
      'Ptáme se na části Prahy, ne na přesnou adresu — nic o tom, kde bydlíš, si neukládáme.',
  },
  {
    id: 'certainty',
    key: 'certainty',
    type: 'single',
    student: {
      title: 'Jak jistě máš vybrané zaměření?',
      hint: 'Za „ještě vůbec nevím“ tě nikdo soudit nebude. Je to úplně normální.',
    },
    parent: {
      title: 'Jak jasně má dítě vybrané zaměření?',
      hint: 'Nerozhodnost je v tomto věku běžná a s výsledkem pracujeme jinak, ne hůř.',
    },
    defaultValue: 'spis',
    options: [
      { value: 'jiste', label: 'Vím úplně přesně', parentLabel: 'Má jasno' },
      { value: 'spis', label: 'Tak zhruba', parentLabel: 'Přibližně' },
      { value: 'vubec', label: 'Ještě vůbec nevím', parentLabel: 'Zatím nemá jasno' },
      UNSURE,
    ],
  },
  {
    id: 'priority',
    key: 'priority',
    type: 'single',
    student: {
      title: 'Co je pro tebe důležitější?',
      hint: 'Podle toho seřadíme výsledky.',
    },
    parent: {
      title: 'Co je pro vás při výběru důležitější?',
      hint: 'Podle toho seřadíme výsledky.',
    },
    defaultValue: 'zamereni',
    options: [
      { value: 'zamereni', label: 'Zaměření školy', parentLabel: 'Zaměření školy' },
      { value: 'blizkost', label: 'Aby to bylo blízko', parentLabel: 'Dostupnost a vzdálenost' },
      { value: 'obojí', label: 'Obojí stejně', parentLabel: 'Obojí stejně' },
    ],
  },
  {
    id: 'secondFocus',
    key: 'secondFocus',
    type: 'multi',
    student: {
      title: 'A co by tě ještě mohlo bavit?',
      hint: 'Poslední otázka. Klidně přeskoč, pokud tě nic dalšího nenapadá.',
    },
    parent: {
      title: 'Která další oblast by mohla dítě zajímat?',
      hint: 'Poslední otázka. Můžete přeskočit.',
    },
    options: FOCUS_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
    optional: true,
  },
];

/** Voice-correct label for one option. */
export function optionLabel(option, role) {
  if (role === 'parent' && option.parentLabel) return option.parentLabel;
  if (role === 'student' && option.studentLabel) return option.studentLabel;
  return option.label;
}

/** Question copy for the active role. */
export function questionCopy(question, role) {
  return role === 'parent' ? question.parent : question.student;
}

/** Options for the active role — parent always gets a "Nevím jistě" escape. */
export function questionOptions(question, role) {
  const opts = question.options;
  if (role !== 'parent') return opts;
  const hasUnsure = opts.some((o) => o.unsure);
  if (hasUnsure || question.type === 'select') return opts;
  return [...opts, UNSURE];
}

/** Defaults applied when the quiz starts. */
export function initialAnswers() {
  const answers = {};
  for (const q of QUESTIONS) {
    if (q.defaultValue !== undefined) answers[q.key] = q.defaultValue;
  }
  return answers;
}

/**
 * The matcher must never see 'nevim' as a real value — it means "no answer".
 * Blank answers widen the confidence interval, they never lower a score.
 */
export function cleanAnswers(answers) {
  const out = {};
  for (const [k, v] of Object.entries(answers || {})) {
    if (v === 'nevim' || v === '' || v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      const filtered = v.filter((x) => x !== 'nevim');
      if (filtered.length) out[k] = filtered;
      continue;
    }
    out[k] = v;
  }
  // secondFocus is a light-weight extension of focus for the matcher.
  if (out.secondFocus) {
    out.focus = [...new Set([...(out.focus || []), ...out.secondFocus])];
  }
  return out;
}
