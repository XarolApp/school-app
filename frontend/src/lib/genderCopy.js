/** Use masculine Czech forms unless the user selected feminine forms. */
export function genderForm(gender, masculine, feminine) {
  return gender === 'f' ? feminine : masculine;
}

/** Resolve the compact gender markers used in the existing Czech question copy. */
export function genderedCopy(copy, gender) {
  if (typeof copy !== 'string') return copy;
  return copy
    .replace(/([\p{L}]+)el\(a\)/gu, gender === 'f' ? '$1la' : '$1el')
    .replace(/([\p{L}]+)\(a\)/gu, gender === 'f' ? '$1a' : '$1')
    .replace(/([\p{L}]+)ý\/á(?![\p{L}])/gu, gender === 'f' ? '$1á' : '$1ý')
    .replace(/([\p{L}]+)l\/a\b/gu, gender === 'f' ? '$1la' : '$1l');
}
