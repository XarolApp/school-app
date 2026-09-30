/**
 * Names of the KKOV obor groups (the first two digits of a code, "37-41-M/01"
 * → 37), per the official MŠMT classification. Only groups that occur in
 * secondary schools are listed; an unknown one falls back to its number.
 */
export const KKOV_GROUPS = {
  16: 'Ekologie a ochrana životního prostředí',
  18: 'Informatické obory',
  21: 'Hornictví, hutnictví a slévárenství',
  23: 'Strojírenství a strojírenská výroba',
  26: 'Elektrotechnika, telekomunikační a výpočetní technika',
  28: 'Technická chemie a chemie silikátů',
  29: 'Potravinářství a potravinářská chemie',
  31: 'Textilní výroba a oděvnictví',
  32: 'Kožedělná a obuvnická výroba a zpracování plastů',
  33: 'Zpracování dřeva a výroba hudebních nástrojů',
  34: 'Polygrafie, zpracování papíru, filmu a fotografie',
  36: 'Stavebnictví, geodézie a kartografie',
  37: 'Doprava a spoje',
  39: 'Speciální a interdisciplinární obory',
  41: 'Zemědělství a lesnictví',
  43: 'Veterinářství a veterinární prevence',
  53: 'Zdravotnictví',
  61: 'Filozofie, teologie',
  63: 'Ekonomika a administrativa',
  64: 'Podnikání v oborech, odvětvích',
  65: 'Gastronomie, hotelnictví a turismus',
  66: 'Obchod',
  68: 'Právo, právní a veřejnosprávní činnost',
  69: 'Osobní a provozní služby',
  72: 'Publicistika, knihovnictví a informatika',
  74: 'Tělesná kultura, tělovýchova a sport',
  75: 'Pedagogika, učitelství a sociální péče',
  78: 'Obecně odborná příprava (lycea)',
  79: 'Obecná příprava (gymnázia)',
  82: 'Umění a užité umění',
};

export const kkovGroupOf = (kkov) => (kkov ? kkov.slice(0, 2) : null);
export const kkovGroupName = (group) => KKOV_GROUPS[Number(group)] ?? `Skupina ${group}`;
