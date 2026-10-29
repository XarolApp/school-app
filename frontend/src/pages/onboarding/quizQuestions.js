/**
 * The 11 quiz questions — one per screen.
 *
 * Design rules baked in here:
 *  - EVERY question feeds the scoring engine. Data minimisation: if the
 *    matcher does not consume an answer, the question is cut.
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
 *  - Skipping is always allowed; unanswered criteria are excluded from scoring.
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
import { genderedCopy } from '../../lib/gender';

/** Shared "no answer" option. An unanswered item is excluded from the weighted
 *  average; confidence describes the weight covered, not a statistical interval. */
const UNSURE = {
  value: 'nevim',
  label: 'Nevím jistě',
  unsure: true,
  reassure: {
    student:
      'V pohodě. Tuhle otázku do výpočtu nezapočítáme. Výsledek pak vychází z ostatních odpovědí.',
    parent:
      'To je v pořádku. Tuto otázku do výpočtu nezahrneme. Výsledek pak vychází z ostatních odpovědí.',
  },
};

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
        'Podle tohohle porovnáváme zaměření oborů s tvými zájmy. Zohledníme, kolik z vybraných oblastí škola pokrývá.',
      parent:
        'Porovnáváme zaměření oborů s uvedenými zájmy. Zohledníme, kolik z vybraných oblastí škola pokrývá.',
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
            'Odborka s maturitou = obor teď, vysoká pořád ve hře. Zohledníme typ školy i to, co tě baví.',
          parent:
            'Odborná škola s maturitou znamená volbu oboru nyní při zachování cesty na vysokou školu. Zohledníme typ školy i zájmové oblasti.',
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
            'Fajn — ukážeme ti obojí. Typ školy pak z výpočtu vypadne a rozhodne to, co tě baví (a dojezd, pokud ho nastavíš).',
          parent:
            'Zobrazíme obě varianty. Typ školy z výpočtu vypadne a rozhodnou zájmy (a dojezd, pokud jste ho nastavili).',
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
            'Zohledníme, že ti běžný rozsah jazykové výuky stačí. Vedle jazyků dál porovnáváme i ostatní odpovědi.',
          parent:
            'Zohledníme, že vám běžný rozsah jazykové výuky stačí. Vedle jazyků dál porovnáváme i ostatní odpovědi.',
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
            'To sedí na dost škol — tahle otázka ti tedy výběr nezúží a rozhodnou spíš zájmy a dojezd (pokud ho nastavíš).',
          parent:
            'Této odpovědi vyhovuje řada škol, takže výběr nezúží — rozhodnou spíše zájmy a dojezd (pokud jste ho nastavili).',
        },
      },
      UNSURE,
    ],
  },
  /**
   * MHD commute: the student picks a PID stop (never an address), sets the
   * longest ride they accept (any minute 1-60, or "60+" for no limit) and how
   * strict that limit is. The three answers live under `commuteStop`,
   * `commuteLimit` and `commuteStrict`; `type: 'commute'` makes QuizQuestion draw
   * the shared commute control (components/CommuteControl.jsx) instead of an
   * option list. Scored by the `commute` component in lib/matching.js from the
   * stop's row of the PID timetable matrix; the server saves only the stop id.
   */
  {
    id: 'commute',
    key: 'commuteStop',
    type: 'commute',
    options: [],
    panelLabel: 'Dojezd MHD',
    reassure: {
      student:
        'Dojezd bereme z ranní špičky podle jízdních řádů PID jako odhad (cca). Jak přísně limit platí, určuješ pod posuvníkem.',
      parent:
        'Dojezd bereme z ranní špičky podle jízdních řádů PID jako odhad (cca). Jak přísně limit platí, nastavíte pod posuvníkem.',
    },
    student: {
      title: 'Odkud do školy pojedeš MHD a jak dlouho smí cesta trvat?',
      hint: 'Vyber zastávku a nastav nejdelší cestu v minutách. Nepovinné — když nevíš, přeskoč.',
    },
    parent: {
      title: 'Odkud bude dítě jezdit do školy MHD a jak dlouho smí cesta trvat?',
      hint: 'Vyberte zastávku a nastavte nejdelší cestu v minutách. Nepovinné — pokud si nejste jistí, přeskočte.',
    },
    strictOptions: [
      { value: 'preference', label: 'Spíš přání — klidně i déle, když škola sedí', parentLabel: 'Spíše přání — i delší cesta je v pořádku, pokud škola sedí' },
      { value: 'dulezite', label: 'Důležité — raději ne déle', parentLabel: 'Důležité — raději ne déle' },
      { value: 'nutne', label: 'Nutnost — delší dojíždění nechci', parentLabel: 'Nutnost — delší dojíždění nechceme' },
    ],
    honesty: {
      student:
        'Neptáme se na adresu. Zastávku použijeme k výpočtu dojezdu a uložíme ji až s dokončeným dotazníkem k tvému účtu. Časy jsou odhad z jízdních řádů PID, ne záruka.',
      parent:
        'Neptáme se na adresu. Zastávku použijeme k výpočtu dojezdu a uložíme ji až s dokončeným dotazníkem k vašemu účtu. Časy jsou odhad z jízdních řádů PID, ne záruka.',
    },
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
            'Když máš jasno, zohledníme školy s užší nabídkou oborů i to, co tě baví.',
          parent:
            'Při jasné představě zohledníme školy s užší nabídkou oborů i uvedené zájmy.',
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
            'Úplně normální. Zohledníme šíři nabídky oborů, aby bylo z čeho vybírat. Možnost změnit obor si ověř u konkrétní školy.',
          parent:
            'Zcela běžné. Zohledníme šíři nabídky oborů, aby bylo z čeho vybírat. Možnost změnit obor je potřeba ověřit u konkrétní školy.',
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
            'Tohle přímo posune váhy ve výpočtu: obor bude rozhodovat víc než dojezd. Můžeš tedy skončit i o kus dál.',
          parent:
            'Tato volba přímo mění váhy ve výpočtu: obor rozhodne více než dojezd. Ve výsledku se proto mohou objevit i školy s delší cestou.',
        },
      },
      {
        value: 'blizkost',
        label: 'Aby to bylo blízko',
        parentLabel: 'Dostupnost a vzdálenost',
        reassure: {
          student:
            'Dojezd dostane větší váhu než obor (když u dojezdu nastavíš zastávku a limit). Školy s kratší cestou MHD půjdou nahoru, i když zaměření sedí jen napůl.',
          parent:
            'Dojezd dostane větší váhu než obor (pokud jste nastavili zastávku a limit). Školy s kratší cestou MHD se posunou výše i při částečné shodě zaměření.',
        },
      },
      {
        value: 'obojí',
        label: 'Obojí je důležité',
        parentLabel: 'Obojí je důležité',
        reassure: {
          student:
            'Zaměření i dojezd (když ho nastavíš) zohledníme společně s ostatními odpověďmi.',
          parent:
            'Zaměření i dojezd (pokud jste ho nastavili) zohledníme společně s ostatními odpověďmi.',
        },
      },
    ],
  },
  /**
   * The optional points block: the last three questions. Skipping any of them is
   * allowed; the `reserve` component only exists when
   * points AND a preference are given (see matching.js `weightsFor`).
   *
   * The points stay in sessionStorage like every other answer until an account
   * is available. Completed tester answers are saved by OnboardingFlow; a new
   * account's answers are flushed after confirmation. Points and expected gain
   * also update decision_profile through POST /api/me/onboarding-answers.
   */
  {
    id: 'points',
    key: 'points',
    type: 'number',
    min: 0,
    max: 100,
    options: [],
    panelLabel: 'Body z přijímaček',
    student: {
      title: 'Kolik bodů máš z přijímaček nanečisto?',
      hint: 'Cermat, ze 100. Nepovinné — když je nemáš, přeskoč a seřadíme školy bez nich.',
      placeholder: 'Např. 62',
    },
    parent: {
      title: 'Kolik bodů dítě získalo v přijímačkách nanečisto?',
      hint: 'Cermat, ze 100. Nepovinné — bez nich školy seřadíme podle ostatních odpovědí.',
      placeholder: 'Např. 62',
    },
    reassure: {
      student:
        'Body porovnáme s historickými hranicemi přijetí tam, kde je známe. Dokončený dotazník uložíme k tvému účtu. Přijetí to nezaručuje.',
      parent:
        'Body porovnáme s historickými hranicemi přijetí tam, kde je známe. Dokončený dotazník uložíme k vašemu účtu. Přijetí to nezaručuje.',
    },
    honesty:
      'Odpovídej upřímně — nikdo tě nesoudí. Jiné body, než jaké máš, vedou k méně přesnému doporučení.',
  },
  {
    id: 'gain',
    key: 'gain',
    type: 'single',
    panelLabel: 'Očekávané zlepšení',
    student: {
      title: 'O kolik bodů se do ostrých přijímaček zlepšíš?',
      hint: 'Použije se jen když jsi zadal(a) body. Přestřelený odhad může ukázat příliš ambiciózní školy. Budoucí hranice přijetí zatím neznáme.',
    },
    parent: {
      title: 'O kolik bodů se dítě podle vás do ostrých přijímaček zlepší?',
      hint: 'Použije se jen když jste zadali body. Přestřelený odhad může ukázat příliš ambiciózní školy. Budoucí hranice přijetí zatím neznáme.',
    },
    options: [
      { value: 'stejne', label: 'Asi zůstanu na stejném', parentLabel: 'Asi zůstane na stejném' },
      { value: 'plus5', label: 'O pár bodů (asi +5)', parentLabel: 'O pár bodů (asi +5)' },
      { value: 'plus10', label: 'Znatelně (asi +10)', parentLabel: 'Znatelně (asi +10)' },
      { value: 'plus15', label: 'Hodně (+15 a víc)', parentLabel: 'Hodně (+15 a víc)' },
    ],
  },
  {
    id: 'reserve',
    key: 'reserve',
    type: 'single',
    panelLabel: 'Rezerva',
    student: {
      title: 'Chceš školy s rezervou, nebo zkusíš těžší?',
      hint: 'Funguje jen když jsi zadal(a) body.',
    },
    parent: {
      title: 'Má dítě mířit na školy s rezervou, nebo na těžší?',
      hint: 'Funguje jen když jste zadali body.',
    },
    options: [
      {
        value: 'jistota',
        label: 'Chci jistotu a velkou rezervu',
        parentLabel: 'Jistotu a velkou rezervu',
        reassure: {
          student: 'Zvýhodníme školy, kde máš podle známých historických hranic větší bodovou rezervu. Přijetí to nezaručuje.',
          parent: 'Zvýhodníme školy, kde má dítě podle známých historických hranic větší bodovou rezervu. Přijetí to nezaručuje.',
        },
      },
      {
        value: 'vyvazene',
        label: 'Něco mezi',
        parentLabel: 'Něco mezi',
        reassure: {
          student: 'Zvýhodníme školy, kde jsou tvé očekávané body blízko známé historické hranice nebo trochu nad ní.',
          parent: 'Zvýhodníme školy, kde jsou očekávané body dítěte blízko známé historické hranice nebo trochu nad ní.',
        },
      },
      {
        value: 'ambice',
        label: 'Zkusím těžší školy i s malou rezervou',
        parentLabel: 'Těžší školy i s malou rezervou',
        reassure: {
          student: 'Posuneme výš školy na hraně tvých bodů. Rezerva bude menší — o to víc je dobré mít v přihlášce i jistotu.',
          parent: 'Posuneme výš školy na hraně bodů. Rezerva bude menší, proto doporučujeme mít v přihlášce i jistotu.',
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
export function questionCopy(question, role, gender = 'm') {
  const copy = role === 'parent' ? question.parent : question.student;
  if (role === 'parent' || !copy) return copy;
  return Object.fromEntries(Object.entries(copy).map(([key, value]) => [
    key,
    typeof value === 'string' ? genderedCopy(value, gender) : value,
  ]));
}

/** Options for the active role — parent always gets a "Nevím jistě" escape. */
export function questionOptions(question, role) {
  const opts = question.options;
  if (role !== 'parent') return opts;
  const hasUnsure = opts.some((o) => o.unsure);
  if (hasUnsure || question.type === 'select' || question.type === 'number') return opts;
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
export function reassuranceFor(question, value, role, gender = 'm') {
  const voice = role === 'parent' ? 'parent' : 'student';
  const pick = (copy) => {
    const text = (typeof copy === 'string' ? copy : copy?.[voice]) || null;
    return role === 'parent' || !text ? text : genderedCopy(text, gender);
  };

  if (Array.isArray(value)) {
    if (!value.length) return null;
    if (value.every((item) => item === 'nevim')) return pick(UNSURE.reassure);
    return pick(question.reassure);
  }
  if (value === undefined || value === null || value === '') return null;
  const option = questionOptions(question, role).find((o) => o.value === value);
  return pick(option?.reassure) || pick(question.reassure);
}

/**
 * Human-readable tags for one answer, used by the live "Tvůj profil" panel.
 * Reads the SAME state the quiz writes — the panel is a second shape of the
 * flow's state, never a second copy of it.
 */
export function answerTags(question, value, role, answers = {}) {
  if (value === undefined || value === null || value === '') return [];
  // The commute question holds a stop id; the panel shows the limit, not the id.
  if (question.type === 'commute') {
    const limit = Number(answers.commuteLimit);
    return [Number.isInteger(limit) && limit >= 1 ? `do ${limit} min MHD` : 'bez časového limitu'];
  }
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
 * Blank answers are excluded; confidence measures covered component weight.
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
