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
 *  - `reassure` (onboarding-v2) = the "you were heard" line shown directly
 *    under the option the user just picked. This is what replaced the deleted
 *    stand-alone Mirroring screen: the same mirroring job, distributed across
 *    every question instead of paid for with one more screen in the steepest
 *    part of the drop-off curve. It lives per OPTION where the answer implies
 *    something specific, and per QUESTION as a fallback for multi-selects.
 *
 *    RULES for writing one, they are not decorative:
 *      * it must say something the answer actually implies for the matching,
 *        not "skvělá volba!" — flattery is noise and teenagers read it as such;
 *      * it must contain NO number we cannot verify from the database. There is
 *        no "v Praze jich je 31" here, because nothing in this codebase counts
 *        that. The live candidate counter above the question is the honest
 *        place for numbers, and it computes them for real;
 *      * it never implies an answer was better or worse than another one
 *        (zero-shame), including for "nevím".
 *  - `panelLabel` = short noun phrase for the live "Tvůj profil" panel row.
 */

import { FOCUS_CATEGORIES } from '../../lib/schoolFeatures';

/** Shared "no answer" option. Its reassurance is deliberately the same warmth
 *  as every other option's — an unanswered item widens the confidence interval
 *  and is dropped from the weights; it never lowers a score. */
const UNSURE = {
  value: 'nevim',
  label: 'Nevím jistě',
  unsure: true,
  reassure: {
    student:
      'V pohodě. Tuhle otázku prostě do výpočtu nezapočítáme — nesnižuje ti to shodu, jen z ní ubere jistotu.',
    parent:
      'To je v pořádku. Tuto otázku do výpočtu nezahrneme — shodu nesnižuje, jen o něco snižuje spolehlivost výsledku.',
  },
};

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
    panelLabel: 'Co baví',
    student: {
      title: 'Co tě baví nejvíc?',
      hint: 'Vyber klidně víc věcí — málokdo má jenom jednu.',
    },
    parent: {
      title: 'Co vaše dítě baví nejvíc?',
      hint: 'Můžete vybrat více oblastí. Pokud si nejste jistí, zvolte „Nevím jistě“.',
    },
    options: FOCUS_CATEGORIES.map((c) => ({ value: c.id, label: c.label })),
    // Multi-select: one line for the whole question, because a card per chip
    // would flicker on every toggle.
    reassure: {
      student:
        'Podle tohohle hledáme obory, ne názvy škol. Víc oblastí neznamená horší shodu — škola, která pokrývá dvě z nich, se posune nahoru.',
      parent:
        'Podle toho vyhledáváme obory, nikoli názvy škol. Více oblastí shodu nezhoršuje — škola, která pokrývá dvě z nich, se v pořadí posune výš.',
    },
  },
  {
    id: 'future',
    key: 'future',
    type: 'single',
    panelLabel: 'Za pět let',
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
        reassure: {
          student:
            'Bereme to tak, že chceš mít otevřenou cestu na vysokou — takže upřednostníme školy zakončené maturitou.',
          parent:
            'Zohledníme to tak, že cesta na vysokou školu má zůstat otevřená — upřednostníme obory zakončené maturitou.',
        },
      },
      {
        value: 'remeslo',
        label: 'V práci, kde něco dělám rukama',
        parentLabel: 'V praktické profesi s vyučením',
        reassure: {
          student:
            'Beru. Vytáhneme nahoru školy s praxí a řemeslem — a maturitní obory ti nezmizí, jen přestanou být hlavní kritérium.',
          parent:
            'Rozumíme. Výš posuneme školy s praktickou přípravou a řemeslem. Maturitní obory z výsledku nemizí, jen přestávají být hlavním kritériem.',
        },
      },
      {
        value: 'nevim',
        label: 'Ještě fakt nevím',
        parentLabel: 'Nevím jistě',
        unsure: true,
        reassure: {
          student:
            'V patnácti to neví skoro nikdo. Necháme si otevřené obě cesty a ukážeme ti maturitní i učební obory.',
          parent:
            'V tomto věku to většina dětí neví. Necháme otevřené obě cesty a zobrazíme maturitní i učební obory.',
        },
      },
    ],
  },
  {
    id: 'studyType',
    key: 'studyType',
    type: 'single',
    panelLabel: 'Typ školy',
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
      {
        value: 'gymnazium',
        label: 'Gymnázium (všeobecné)',
        reassure: {
          student:
            'Gympl nechává volbu oboru na později. Bereme to jako „nechávám si otevřeno“, ne jako hotové rozhodnutí — výběr jsme zúžili, ne uzavřeli.',
          parent:
            'Gymnázium odsouvá volbu oboru na později. Chápeme to jako ponechání otevřených možností, ne jako uzavřené rozhodnutí.',
        },
      },
      {
        value: 'odborna',
        label: 'Odborná škola s maturitou',
        reassure: {
          student:
            'Odborka s maturitou = obor teď, vysoká pořád ve hře. Přidáme váhu tomu, co tě baví, protože tady na tom záleží víc než na gymplu.',
          parent:
            'Odborná škola s maturitou znamená volbu oboru nyní při zachování cesty na vysokou školu. Zájmové oblasti proto vážíme silněji.',
        },
      },
      {
        value: 'ucebni',
        label: 'Učební obor s výučním listem',
        reassure: {
          student:
            'Řemeslo je plnohodnotná cesta a v Praze je o něj nouze, ne přebytek. Půjdeme po školách s dílnami a praxí.',
          parent:
            'Učební obor je plnohodnotná cesta s dobrým uplatněním. Zaměříme se na školy s dílnami a odborným výcvikem.',
        },
      },
      {
        value: 'nevim',
        label: 'Ještě nevím',
        parentLabel: 'Nevím jistě',
        unsure: true,
        reassure: {
          student:
            'Fajn — ukážeme ti obojí. Typ školy pak z výpočtu vypadne a rozhodne to, co tě baví a kam dojedeš.',
          parent:
            'Zobrazíme obě varianty. Typ školy z výpočtu vypadne a rozhodnou zájmy a dostupnost.',
        },
      },
    ],
  },
  {
    id: 'language',
    key: 'language',
    type: 'single',
    panelLabel: 'Jazyky',
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
      {
        value: 'hodne',
        label: 'Hodně — chci silnou jazykovku',
        parentLabel: 'Velmi důležitá',
        reassure: {
          student:
            'Přidáme body školám, které mají jazyky rozšířené nebo bilingvní — ne těm, které je mají jen v běžném rozsahu.',
          parent:
            'Zvýhodníme školy s rozšířenou či bilingvní výukou jazyků oproti školám se standardním rozsahem.',
        },
      },
      {
        value: 'trochu',
        label: 'Základ mi stačí',
        parentLabel: 'Spíše doplňková',
        reassure: {
          student:
            'Jasně. Jazyky necháme jako drobný bonus, ale nebudou kvůli nim přeskakovat školy, které ti sedí jinak.',
          parent:
            'Jazyky ponecháme jako drobný bonus. Nepřebijí školy, které vyhovují v podstatnějších kritériích.',
        },
      },
      {
        value: 'nezalezi',
        label: 'Nezáleží mi na tom',
        parentLabel: 'Nezáleží nám na tom',
        reassure: {
          student:
            'Tak jazyky z výpočtu úplně vypustíme. Váhu, kterou měly, rozdělíme mezi to, na čem ti záleží.',
          parent:
            'Jazyky z výpočtu vypustíme a jejich váhu přerozdělíme mezi kritéria, která jste označili jako důležitá.',
        },
      },
      UNSURE,
    ],
  },
  {
    id: 'practice',
    key: 'practice',
    type: 'single',
    panelLabel: 'Praxe, nebo teorie',
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
      {
        value: 'praxe',
        label: 'Radši praxe a dílny',
        parentLabel: 'Spíše praktická výuka',
        reassure: {
          student:
            'Budeme hledat školy, kde je odborný výcvik nebo dílny součástí výuky, ne jen jeden předmět navíc.',
          parent:
            'Zaměříme se na školy, kde je odborný výcvik či praxe součástí výuky, nikoli doplňkovým předmětem.',
        },
      },
      {
        value: 'teorie',
        label: 'Radši teorie a učení',
        parentLabel: 'Spíše teoretická výuka',
        reassure: {
          student:
            'Dobře — půjdeme spíš po všeobecných a maturitních oborech, kde se víc čte a počítá než montuje.',
          parent:
            'Upřednostníme všeobecné a maturitní obory s převahou teoretické výuky.',
        },
      },
      {
        value: 'obojí',
        label: 'Půl na půl',
        parentLabel: 'Kombinace obojího',
        reassure: {
          student:
            'To sedí na dost škol — tahle otázka ti tedy výběr nezúží a rozhodnou spíš zájmy a dojíždění.',
          parent:
            'Této odpovědi vyhovuje řada škol, takže výběr nezúží — rozhodnou spíše zájmy a dostupnost.',
        },
      },
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
    panelLabel: 'Části Prahy',
    reassure: {
      student:
        'Vzdálenost počítáme podle městských částí, ne podle jízdních řádů — minuty bychom si museli vymyslet a to neděláme.',
      parent:
        'Dostupnost vyhodnocujeme podle městských částí, nikoli podle jízdních řádů. Konkrétní minuty bychom museli odhadovat, což neděláme.',
    },
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
    panelLabel: 'Jak jasno',
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
      {
        value: 'jiste',
        label: 'Vím úplně přesně',
        parentLabel: 'Má jasno',
        reassure: {
          student:
            'Když máš jasno, dává smysl jít po specializovaných školách. Přitvrdíme na zaměření a nebudeme ti nahoru cpát „něco od všeho“.',
          parent:
            'Při jasné představě dává smysl upřednostnit specializované školy. Zaměření proto vážíme silněji.',
        },
      },
      {
        value: 'spis',
        label: 'Tak zhruba',
        parentLabel: 'Přibližně',
        reassure: {
          student:
            'Nejběžnější odpověď ze všech. Namícháme ti školy se zaměřením i takové, kde se dá ještě přehoupnout jinam.',
          parent:
            'Nejčastější odpověď. Zobrazíme kombinaci specializovaných škol i takových, kde lze zaměření zvolit později.',
        },
      },
      {
        value: 'vubec',
        label: 'Ještě vůbec nevím',
        parentLabel: 'Zatím nemá jasno',
        unsure: true,
        reassure: {
          student:
            'Úplně normální a nic tím neztrácíš. Upřednostníme školy se širší nabídkou, kde se rozhoduješ až za rok nebo dva.',
          parent:
            'Zcela běžné a na výsledek to nemá negativní vliv. Upřednostníme školy se širší nabídkou, kde se obor volí později.',
        },
      },
    ],
  },
  {
    id: 'priority',
    key: 'priority',
    type: 'single',
    panelLabel: 'Co je důležitější',
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
      {
        value: 'zamereni',
        label: 'Zaměření školy',
        parentLabel: 'Zaměření školy',
        reassure: {
          student:
            'Tohle přímo posune váhy ve výpočtu: obor bude rozhodovat víc než adresa. Můžeš tedy skončit i o kus dál.',
          parent:
            'Tato volba přímo mění váhy ve výpočtu: obor rozhodne více než poloha. Ve výsledku se proto mohou objevit i vzdálenější školy.',
        },
      },
      {
        value: 'blizkost',
        label: 'Aby to bylo blízko',
        parentLabel: 'Dostupnost a vzdálenost',
        reassure: {
          student:
            'Dojezd dostane větší váhu než obor. Školy z tvých částí Prahy půjdou nahoru, i když zaměření sedí jen napůl.',
          parent:
            'Dostupnost dostane větší váhu než obor. Školy z vybraných částí Prahy se posunou výše i při částečné shodě zaměření.',
        },
      },
      {
        value: 'obojí',
        label: 'Obojí stejně',
        parentLabel: 'Obojí stejně',
        reassure: {
          student:
            'Necháme váhy vyrovnané. Nahoru se dostane škola, která zvládne obojí, ne ta, která exceluje jen v jednom.',
          parent:
            'Váhy zůstanou vyrovnané. Nejvýše skončí školy vyhovující v obou kritériích, nikoli ty výrazné pouze v jednom.',
        },
      },
    ],
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

/**
 * The reassurance line to show under the just-selected answer.
 *
 * This is the migrated Mirroring screen (onboarding-v2). Per-option copy wins;
 * a question-level line is the fallback for multi-selects, where a card per
 * chip would flicker on every toggle.
 *
 * Returns null when nothing is selected — an empty green card under an
 * untouched question would be mirroring an answer the user has not given.
 */
export function reassuranceFor(question, value, role) {
  const voice = role === 'parent' ? 'parent' : 'student';
  const pick = (copy) => (typeof copy === 'string' ? copy : copy?.[voice]) || null;

  if (Array.isArray(value)) {
    if (!value.length) return null;
    return pick(question.reassure);
  }
  if (!value) return null;
  const option = question.options.find((o) => o.value === value);
  return pick(option?.reassure) || pick(question.reassure);
}

/**
 * Human-readable tags for one answer, used by the live "Tvůj profil" panel.
 * Reads the SAME state the quiz writes — the panel is a second shape of the
 * flow's state, never a second copy of it.
 */
export function answerTags(question, value, role) {
  if (value === undefined || value === null || value === '') return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .filter((v) => v !== 'nevim')
    .map((v) => {
      const option = question.options.find((o) => o.value === v);
      return option ? optionLabel(option, role) : String(v);
    });
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
  return out;
}
