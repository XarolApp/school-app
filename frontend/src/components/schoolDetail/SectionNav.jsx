const SECTIONS = [
  { id: 'obory', label: 'Obory a přijímačky' },
  { id: 'kde-to-je', label: 'Kde to je' },
  { id: 'recenze', label: 'Recenze' },
  { id: 'doplnujeme', label: 'Co doplňujeme' },
];

function SectionNav() {
  return (
    <nav className="sd-nav" aria-label="Sekce na stránce školy">
      {SECTIONS.map((s) => (
        <a key={s.id} href={`#${s.id}`}>
          {s.label}
        </a>
      ))}
    </nav>
  );
}

export default SectionNav;
