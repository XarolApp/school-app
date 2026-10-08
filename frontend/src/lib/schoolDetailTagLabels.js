// The structured tags are extracted as stable enum keys. Keep their human
// labels in one place so comparison and school-detail surfaces stay aligned.
const CLUB_CATEGORY_LABELS = {
  sport: 'Sport',
  umeni_hudba_divadlo: 'Umění / hudba',
  technika_robotika_it: 'Technika / IT',
  jazyky: 'Jazyky',
  veda_debata: 'Věda / debata',
  jine: 'Jiné',
};

const TEACHING_STYLE_LABELS = {
  projektova_vyuka: 'Projektově',
  tradicni_vyklad: 'Výklad',
  diskuze_debata: 'Diskuze',
  praxe_dilny: 'Praxe / dílny',
  individualni_pristup: 'Individuálně',
  skupinova_prace: 'Skupinově',
};

function formatLabels(values, labels, limit) {
  if (!Array.isArray(values)) return null;
  const names = [...new Set(values.map((value) => labels[value]).filter(Boolean))];
  if (!names.length) return null;
  const visible = names.slice(0, limit);
  const remaining = names.length - visible.length;
  return `${visible.join(', ')}${remaining ? ` +${remaining}` : ''}`;
}

export const formatClubCategories = (values) => formatLabels(values, CLUB_CATEGORY_LABELS, 3);
export const formatTeachingStyles = (values) => formatLabels(values, TEACHING_STYLE_LABELS, 2);
