/**
 * DEMO FALLBACK ONLY.
 *
 * Supabase is currently paused, so /api/schools returns an empty array. Without
 * rows the reveal screen is meaningless and untestable, so the onboarding flow
 * falls back to this fixture and SAYS SO IN THE UI (see DemoDataNotice).
 *
 * The school names here are DELIBERATELY FICTIONAL and suffixed "(ukázka)".
 * Using real Prague school names with invented programs would put false
 * information in front of a 15-year-old making a real decision, which is
 * exactly the failure this product exists to fix.
 *
 * Shape matches the real Supabase columns exactly:
 *   { id, name, location, programs, contact, website }
 * so deleting this file changes nothing except the fallback.
 */
export const DEMO_SCHOOLS = [
  {
    id: 'demo-1',
    name: 'Gymnázium Na Stráni (ukázka)',
    location: 'Parléřova 2, Praha 6',
    programs:
      'Gymnázium všeobecné (čtyřleté); Gymnázium (osmileté); rozšířená výuka matematiky a fyziky',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-2',
    name: 'Gymnázium Podskalí (ukázka)',
    location: 'Na Zatlance 11, Praha 5',
    programs: 'Gymnázium všeobecné; rozšířená výuka živých jazyků; humanitní seminář',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-3',
    name: 'Střední průmyslová škola a gymnázium Vltavská (ukázka)',
    location: 'Preslova 25, Praha 5',
    programs:
      'Informační technologie; Elektrotechnika; Technické lyceum; kybernetická bezpečnost; praxe ve firmách',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-4',
    name: 'Střední průmyslová škola strojnická Betlémská (ukázka)',
    location: 'Betlémská 4, Praha 1',
    programs: 'Strojírenství; Technické lyceum; odborný výcvik a praxe v dílnách',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-5',
    name: 'Obchodní akademie Letenská (ukázka)',
    location: 'Jablonského 3, Praha 7',
    programs:
      'Obchodní akademie; Ekonomika a podnikání; účetnictví; cizí jazyky v ekonomické praxi',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-6',
    name: 'Střední zdravotnická škola Na Nábřeží (ukázka)',
    location: 'Alšovo nábřeží 6, Praha 1',
    programs: 'Zdravotnický asistent; Laboratorní asistent; Sociální činnost; ošetřovatelská praxe',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-7',
    name: 'Střední škola umělecká a řemeslná Zlíchov (ukázka)',
    location: 'Nový Zlíchov 1, Praha 5',
    programs:
      'Grafický design; Truhlář; uměleckořemeslné zpracování dřeva; odborný výcvik; učební obory s výučním listem',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-8',
    name: 'Střední odborná škola pedagogická Evropská (ukázka)',
    location: 'Evropská 33, Praha 6',
    programs: 'Předškolní a mimoškolní pedagogika; Pedagogické lyceum; praxe v mateřských školách',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-9',
    name: 'Hotelová škola Pod Vyhlídkou (ukázka)',
    location: 'Radlická 115, Praha 5',
    programs:
      'Hotelnictví a cestovní ruch; Gastronomie; Kuchař-číšník (učební obor); odborný výcvik',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-10',
    name: 'Gymnázium Přírodovědné Holešovice (ukázka)',
    location: 'Strossmayerovo náměstí 4, Praha 7',
    programs:
      'Gymnázium se zaměřením na přírodní vědy; biologie; chemie; ekologie a životní prostředí',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-11',
    name: 'Střední škola elektrotechniky a strojírenství Strašnice (ukázka)',
    location: 'Jesenická 1, Praha 10',
    programs: 'Mechanik elektrotechnik; Autotronik; Elektrikář (učební obor); odborný výcvik',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-12',
    name: 'Gymnázium Budějovická (ukázka)',
    location: 'Budějovická 680, Praha 4',
    programs: 'Gymnázium všeobecné; rozšířená výuka cizích jazyků; společenskovědní seminář',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-13',
    name: 'Střední odborná škola multimediální Vinohrady (ukázka)',
    location: 'Vinohradská 38, Praha 2',
    programs: 'Multimediální tvorba; Grafický design; Fotografie; animace a videotvorba',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-14',
    name: 'Sportovní gymnázium Vršovice (ukázka)',
    location: 'Přípotoční 1337, Praha 10',
    programs: 'Gymnázium se sportovní přípravou; tělesná výchova; trenérská průprava',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-15',
    name: 'Střední škola informatiky a služeb Novodvorská (ukázka)',
    location: 'Novodvorská 1010, Praha 4',
    programs: 'Informační technologie; Ekonomika a podnikání; Kadeřník (učební obor); praxe',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-16',
    name: 'Gymnázium Vysočanské náměstí (ukázka)',
    location: 'Vysočanské náměstí 500, Praha 9',
    programs: 'Gymnázium všeobecné; humanitní obory; výuka anglického a německého jazyka',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-17',
    name: 'Střední průmyslová škola dopravní Košíře (ukázka)',
    location: 'Plzeňská 298, Praha 5',
    programs:
      'Dopravní prostředky; Elektrotechnika; Technické lyceum; Automechanik (učební obor)',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
  {
    id: 'demo-18',
    name: 'Střední odborná škola veřejnosprávní Michle (ukázka)',
    location: 'Michelská 12, Praha 4',
    programs: 'Veřejná správa; Právní administrativa; společenskovědní předměty; jazyky',
    contact: 'info@ukazka-skola.example.cz',
    website: 'https://example.cz',
  },
];
