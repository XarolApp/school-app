/**
 * Everyday names and search keywords for schools.
 *
 * The official name on atlasskolstvi.cz is often not what students and parents
 * call a school ("Karlínské gymnázium, Praha 8, Pernerova 25" is "Gyperner").
 * Two separate lists, because they do different jobs:
 *
 *  - NICKNAMES: shown as the headline, with the official name under it. Only
 *    for schools where the official name is genuinely confusing. Ids are the
 *    `schools.id` primary key, which is stable.
 *  - SEARCH_ONLY: found by these words but displayed unchanged. For names that
 *    are plausible guesses rather than confirmed usage.
 *
 * Website and e-mail domains are indexed automatically (see domainWords), so
 * "artecon" finds ART ECON without an entry here.
 */
const NICKNAMES = {
  128: 'Gyperner',
  110: 'SSPŠ',
  119: 'Gyarab',
  48: 'Gymvod',
  106: 'Zatlanka',
  114: 'Kavalírka',
  56: 'SPŠE Ječná',
  66: 'Panská',
  67: 'Hellichovka',
  90: 'Hollarka',
  76: 'Křemencovka',
  83: 'Resslovka',
  78: 'Štěpánská',
  4: 'Betlémská',
  160: 'Křižík',
  151: 'Úžlabina',
  153: 'Třebešín',
  85: 'Podskalská',
};

const SEARCH_ONLY = {
  122: ['Alej'],
  19: ['Gočárka'],
  71: ['Dušní'],
  74: ['Masná'],
  26: ['Zeměměřička'],
  47: ['Truhlárna'],
  89: ['SUPŠ Žižkov'],
  129: ['Kollárovka'],
  18: ['Heroldovy sady'],
  38: ['Heroldovy sady'],
  79: ['Slezská'],
  184: ['Štola'],
  159: ['SZŠ Vinohrady'],
  36: ['Vršovická hotelovka'],
};

// Legal forms add length and no meaning to a headline. The address stays: it is
// what tells the many plain "Gymnázium, Praha X, …" schools apart.
const LEGAL_FORM =
  /,?\s*(?:příspěvková organizace|státní příspěvková organizace|školská právnická osoba|s\.\s?r\.\s?o\.|a\.\s?s\.|o\.\s?p\.\s?s\.|z\.\s?ú\.|z\.\s?s\.|spol\.\s?s\s?r\.\s?o\.)\s*$/i;

export function cleanName(name) {
  let out = String(name || '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3 && LEGAL_FORM.test(out); i += 1) out = out.replace(LEGAL_FORM, '').trim();
  return out.replace(/[,\s]+$/, '');
}

const GENERIC_DOMAINS = new Set(['seznam', 'gmail', 'email', 'post', 'centrum', 'volny', 'icloud']);

/** "http://www.gyperner.cz/" -> "gyperner", "praha.educanet.cz" -> "educanet". */
function domainWords(school) {
  const hosts = [];
  const site = String(school.website || '').match(/^(?:https?:\/\/)?([^/\s]+)/i);
  if (site) hosts.push(site[1]);
  for (const m of String(school.contact || '').matchAll(/[\w.+-]+@([\w.-]+)/g)) hosts.push(m[1]);

  const words = new Set();
  for (const host of hosts) {
    const parts = host.toLowerCase().replace(/^www\./, '').split('.');
    if (parts.length < 2) continue;
    const label = parts[parts.length - 2];
    if (label.length >= 3 && !GENERIC_DOMAINS.has(label)) words.add(label);
  }
  return [...words];
}

/**
 * Adds `official_name` (cleaned) and, for nicknamed schools, swaps `name` to the
 * nickname so every surface shows it without being edited one by one.
 * `search_keywords` is read only by the search index.
 */
export function withNames(school) {
  if (!school || typeof school !== 'object' || school.id == null || school.official_name) return school;

  const official = cleanName(school.name);
  const nickname = NICKNAMES[school.id];
  const keywords = [...domainWords(school), ...(SEARCH_ONLY[school.id] || [])];
  if (nickname) keywords.push(nickname);

  return {
    ...school,
    name: nickname || official,
    official_name: nickname ? official : null,
    search_keywords: keywords,
  };
}

export const withNamesAll = (list) => (Array.isArray(list) ? list.map(withNames) : list);
