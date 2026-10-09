import { SCHOOL_REVIEWS_ENABLED } from '../../config/features';

const SECTIONS = [
  { id: 'obory', label: 'Obory a přijímačky' },
  { id: 'kde-to-je', label: 'Kde to je' },
  { id: 'recenze', label: 'Recenze' },
  { id: 'doplnujeme', label: 'Praktické info' },
];

function SectionNav() {
  return (
    <nav className="sd-nav" aria-label="Sekce na stránce školy">
      {SECTIONS.filter((section) => SCHOOL_REVIEWS_ENABLED || section.id !== 'recenze').map((s) => (
        <a key={s.id} href={`#${s.id}`}>
          {s.label}
        </a>
      ))}
    </nav>
  );
}

export default SectionNav;
