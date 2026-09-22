import './legal.css';

// Shown until the operator facts marked [DOPLNIT] are filled in. Set to false before launch.
const DRAFT = true;

function LegalPage({ title, updated, children }) {
  return (
    <article className="legal">
      {DRAFT && (
        <p className="legal-draft" role="note">
          Pracovní verze — údaje označené [DOPLNIT] (provozovatel, e-mail, DPH) se doplní před spuštěním.
        </p>
      )}
      <h1>{title}</h1>
      <p className="legal-meta">Poslední úprava: {updated}</p>
      {children}
    </article>
  );
}

export function Privacy() {
  return (
    <LegalPage title="Zásady ochrany osobních údajů" updated="21. 9. 2026">
      <h2>1. Kdo je správce</h2>
      <p>
        Správcem osobních údajů je [DOPLNIT: jméno / firma, IČO, adresa sídla], e-mail:
        [DOPLNIT]. Provozujeme službu ŠkolaMatch (web stredninamiru.cz). Pověřence pro ochranu
        osobních údajů nemáme; se vším se obracej na uvedený e-mail.
      </p>

      <h2>2. Jaké údaje zpracováváme, proč a na jakém základě</h2>
      <ul>
        <li>
          <strong>Účet:</strong> e-mail, jméno (které zadáš při registraci), heslo a okamžik, kdy
          jsi potvrdil(a) podmínky. Heslo ukládá jen zabezpečená autentizační služba v zahašované
          podobě; my ho nevidíme. Účel: vytvořit ti účet a umožnit přihlášení. Základ: plnění
          smlouvy.
        </li>
        <li>
          <strong>Odpovědi v dotazníku a výsledky:</strong> co odpovíš v úvodním a samostatném
          dotazníku, včetně volné poznámky, a jaké školy ti vyšly. Účel: doporučit ti školy a ukázat
          je znovu. Základ: plnění smlouvy. Před vytvořením účtu zůstávají odpovědi jen v tvém
          prohlížeči.
        </li>
        <li>
          <strong>Tvoje práce s aplikací:</strong> oblíbené školy, pořadí přihlášek, poznámky,
          počet bodů z přijímacích zkoušek (jen pokud ho zadáš), odkazy pro sdílení seznamu
          rodičům. Účel: poskytnout tyto funkce. Základ: plnění smlouvy.
        </li>
        <li>
          <strong>Recenze a hlášení chyb:</strong> text recenze, tvoje role (např. student, rodič)
          a případná hlášení. Recenze je veřejná, ale ukazuje se jen s rolí (např. „Student · 3.
          ročník“), ne se jménem. Jméno u recenze ukážeme jen rodiči nebo učiteli, který to sám
          zapne. Účel: provoz recenzí a jejich moderace. Základ: oprávněný zájem na bezpečném
          a slušném obsahu; zveřejnění recenze je tvoje dobrovolná volba.
        </li>
        <li>
          <strong>Předplatné a platby:</strong> zvolený tarif, stav předplatného, data platby a
          identifikátory zákazníka u platební brány. <strong>Číslo karty nevidíme ani
          neukládáme</strong> — zadáváš ho přímo u společnosti Stripe. Účel: zpracovat platbu a
          vést předplatné. Základ: plnění smlouvy a zákonná povinnost (účetnictví a daně).
        </li>
        <li>
          <strong>Technické údaje:</strong> IP adresa a údaje prohlížeče při provozu serverů a při
          ověření proti robotům. Účel: bezpečnost a fungování služby. Základ: oprávněný zájem.
        </li>
      </ul>
      <p>
        Údaje, které zadáváš, nám dáváš dobrovolně; bez e-mailu a hesla ale účet vytvořit nelze,
        a bez platebních údajů nelze koupit placený tarif.
      </p>

      <h2>3. Automatické hodnocení škol</h2>
      <p>
        Pořadí škol vypočítáme automaticky z tvých odpovědí (jde o profilování). Slouží jen jako
        pomůcka: nemá žádné právní účinky, nikdo podle něj o tobě nerozhoduje a o přijetí na školu
        rozhoduje výhradně škola.
      </p>

      <h2>4. Komu údaje předáváme (zpracovatelé)</h2>
      <ul>
        <li>Supabase — databáze a přihlašování. Region uložení dat: [DOPLNIT: region projektu].</li>
        <li>Stripe — platby (Stripe Payments Europe, Ltd. a spřízněné společnosti). Může docházet k přenosu mimo EU na základě standardních smluvních doložek.</li>
        <li>
          OpenRouter a poskytovatel jazykového modelu (Google Gemini) — píší krátké vysvětlení,
          proč se ti škola hodí. Posíláme jen výběrové odpovědi z dotazníku a údaje o vybraných
          školách. Jméno, e-mail ani volnou poznámku z dotazníku neposíláme. Data mohou být
          zpracována mimo EU (např. v USA) na základě standardních smluvních doložek.
        </li>
        <li>Cloudflare — ochrana formulářů proti robotům (Turnstile); zpracovává technické údaje spojení.</li>
        <li>Vercel a Railway — provoz webu a serveru.</li>
        <li>OpenStreetMap (OpenStreetMap Foundation) — podkladové mapy a vyhledání adresy na mapě škol. Při zobrazení mapy vidí poskytovatel tvou IP adresu a při hledání i text adresy, který zadáš.</li>
        <li>Poskytovatel e-mailů (potvrzení registrace, obnova hesla): [DOPLNIT].</li>
      </ul>
      <p>
        Údaje neprodáváme, nepředáváme školám ani inzerentům a nepoužíváme je k reklamě. Zákon nás
        může zavázat vydat údaje orgánům veřejné moci.
      </p>

      <h2>5. Děti a nezletilí</h2>
      <p>
        Službu používají hlavně žáci 9. tříd. Údaje o tobě zpracováváme kvůli plnění smlouvy o
        službě (viz výše), ne na základě souhlasu. Nezletilý ale uzavírá smlouvu jen v rozsahu,
        který odpovídá jeho věku, a proto chceme, aby o účtu věděl zákonný zástupce.
        <strong>Je-li ti méně než 15 let, vytvoř účet společně s rodičem nebo zákonným
        zástupcem.</strong> Při registraci potvrzuješ, že ti je alespoň 15 let, nebo že o účtu
        víš s rodičem; okamžik potvrzení si ukládáme. Věk ani totožnost rodiče neověřujeme —
        spoléháme na tvé prohlášení. Sbíráme jen údaje nezbytné pro službu, nic neprodáváme
        a nic nepoužíváme k reklamě. Pokud rodič zjistí, že účet vytvořilo dítě mladší 15 let
        bez jeho souhlasu, napiš nám a účet i všechna data smažeme.
      </p>

      <h2>6. Jak dlouho údaje uchováváme</h2>
      <ul>
        <li>Údaje z účtu, dotazníků a tvých seznamů: po dobu existence účtu. Účet můžeš kdykoli smazat v Nastavení a smaže se tím vše výše popsané, včetně tvého předplatného, uložené platební metody a zákazníka u Stripe a všech tvých recenzí.</li>
        <li>Neaktivní účty se zatím automaticky nemažou. Kdykoli je můžeš smazat sám/sama nebo nás o to požádat e-mailem.</li>
        <li>Záznamy o proběhlých platbách a související účetní doklady musíme uchovávat po dobu, kterou předepisují účetní a daňové předpisy (typicky 5 až 10 let); ty se smazáním účtu neruší.</li>
      </ul>

      <h2>7. Tvá práva</h2>
      <p>
        Máš právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování,
        přenositelnost a právo vznést námitku proti zpracování na základě oprávněného zájmu.
        Souhlas, který jsi dal(a), můžeš kdykoli odvolat. Jméno opravíš a účet smažeš přímo v
        Nastavení; s ostatním napiš na [DOPLNIT: e-mail], odpovíme do 30 dnů. Máš také právo podat
        stížnost u Úřadu pro ochranu osobních údajů (uoou.gov.cz).
      </p>

      <h2>8. Cookies a úložiště v prohlížeči</h2>
      <p>
        Web nepoužívá reklamní, analytické ani sledovací cookies ani nástroje třetích stran ke
        sledování. Písma načítáme z našeho serveru. V prohlížeči ukládáme jen to, co ke službě
        potřebuješ, a proto to nevyžaduje souhlas: přihlašovací relaci a volbu „zůstat
        přihlášený“, rozpracované odpovědi z dotazníku, vybranou roli a nastavení hledání a
        porovnání. Po registraci z úvodního dotazníku může prohlížeč až 7 dní uchovat e-mail a
        odpovědi, aby je po potvrzení e-mailu uložil ke správnému účtu.
      </p>

      <h2>9. Změny</h2>
      <p>O podstatné změně těchto zásad tě budeme předem informovat v aplikaci nebo e-mailem.</p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Obchodní podmínky" updated="21. 9. 2026">
      <h2>1. Provozovatel a kontakt</h2>
      <p>
        Službu ŠkolaMatch (stredninamiru.cz) provozuje [DOPLNIT: jméno / firma, IČO, adresa sídla,
        DIČ, zápis v rejstříku], e-mail: [DOPLNIT] (tento e-mail slouží pro všechny žádosti,
        reklamace, odstoupení od smlouvy i nahlášení nevhodného obsahu). Uzavřením smlouvy
        souhlasíš s těmito podmínkami a bereš na vědomí{' '}
        <a href="/ochrana-osobnich-udaju">Zásady ochrany osobních údajů</a>. Smlouva se uzavírá
        v českém jazyce.
      </p>

      <h2>2. Co služba je</h2>
      <p>
        Přehled středních škol v Praze, dotazník, který školy seřadí podle tvých odpovědí, a
        nástroje pro porovnání a plánování přihlášek. Výsledky jsou pomůcka k rozhodnutí, nikoli
        záruka přijetí ani doporučení jediné správné školy. Údaje o školách pocházejí z veřejných
        zdrojů (např. výsledky jednotné přijímací zkoušky od CERMAT) a mohou být neúplné nebo
        zastaralé — důležité údaje si vždy ověř přímo u školy.
      </p>

      <h2>3. Objednávka a uzavření smlouvy</h2>
      <ol>
        <li>Vytvoříš si účet (a potvrdíš věk a souhlas s podmínkami).</li>
        <li>Vybereš tarif, uvidíš shrnutí: cenu, kdy a kolik se ti strhne a jak tarif zrušit.</li>
        <li>Stiskneš tlačítko <strong>„Objednat s povinností platby“</strong> a na stránce Stripe zadáš kartu.</li>
      </ol>
      <p>
        Smlouva je uzavřena stisknutím tohoto tlačítka a dokončením kroku u Stripe. Chyby ve
        vyplněných údajích můžeš před odesláním opravit tlačítkem Zpět. Znění těchto podmínek si
        můžeš kdykoli zobrazit na této stránce.
      </p>

      <h2>4. Tarify a ceny</h2>
      <ul>
        <li>
          <strong>Sezónní přístup — 690 Kč jednorázově.</strong> Začíná 3denní zkušební dobou.
          Při objednávce se ti karta jen uloží a nic se neúčtuje. Po 3 dnech (v den uvedený při
          objednávce) se z karty jednou strhne 690 Kč. Přístup pak trvá do 31. března; platíš-li
          méně než 30 dní před tímto datem, trvá do 31. března následujícího roku. Poté skončí a
          nic se neobnovuje. Neposíláme připomínku před strháním — datum a částku vidíš při
          objednávce.
        </li>
        <li>
          <strong>Měsíční — 249 Kč měsíčně.</strong> Bez zkušební doby. Platíš hned a platba se
          opakuje každý měsíc ve stejný den, dokud předplatné nezrušíš. Změnu ceny oznámíme
          nejméně 30 dní předem a můžeš předplatné před ní zrušit.
        </li>
      </ul>
      <p>
        Ceny jsou konečné, včetně DPH, pokud jsme jeho plátci [DOPLNIT: plátce / neplátce DPH].
        Platí se kartou přes Stripe v českých korunách.
      </p>

      <h2>5. Zrušení předplatného</h2>
      <ul>
        <li>Měsíční předplatné zrušíš kdykoli v Nastavení jedním tlačítkem. Přístup běží do konce už zaplaceného měsíce a další platba se neúčtuje.</li>
        <li>Sezónní přístup můžeš zrušit v Nastavení během 3denní zkušební doby — pak se nestrhne nic. Po strhnutí se neobnovuje, není co rušit.</li>
      </ul>

      <h2>6. Odstoupení od smlouvy a vrácení peněz</h2>
      <p>
        Jako spotřebitel můžeš od smlouvy <strong>odstoupit do 14 dnů bez udání důvodu</strong> a
        my ti zaplacené peníze v plné výši vrátíme. Nevyžadujeme, aby ses tohoto práva vzdal(a),
        a nic neúčtujeme za dobu, kdy jsi službu už používal(a).
      </p>
      <ul>
        <li>Lhůta běží 14 dní od uzavření smlouvy. U sezónního přístupu ji ještě prodlužujeme: poběží nejméně 14 dní od strhnutí platby.</li>
        <li>Odstoupit můžeš jedním tlačítkem v <strong>Nastavení</strong> (dvoukrokově — nejdřív zkontroluješ údaje, pak odstoupení potvrdíš) nebo e-mailem na [DOPLNIT: e-mail]; formulář níže můžeš použít, ale nemusíš.</li>
        <li>Při odstoupení tlačítkem v Nastavení vrátíme peníze automaticky ihned; na kartě se objeví obvykle do několika pracovních dnů. Při odstoupení e-mailem je vrátíme nejpozději do 14 dnů od oznámení. Vždy stejným způsobem, jakým jsi platil(a). Přístup skončí okamžikem odstoupení a předplatné zrušíme.</li>
      </ul>
      <p className="legal-form">
        <strong>Vzorový formulář pro odstoupení od smlouvy</strong><br />
        Adresát: [DOPLNIT: jméno provozovatele, adresa, e-mail]<br />
        Oznamuji, že tímto odstupuji od smlouvy o poskytnutí služby ŠkolaMatch (tarif:
        ……………).<br />
        Datum objednávky: …………… E-mail účtu: ……………<br />
        Jméno spotřebitele: …………… Datum: …………… (podpis, pokud podáváš písemně)
      </p>

      <h2>7. Nezletilí</h2>
      <p>
        Oba tarify může objednat i nezletilý; předpokládáme, že o platbě ví a souhlasí s ní jeho
        rodič nebo zákonný zástupce. Věk ani souhlas při objednávce neověřujeme.
      </p>
      <p>
        Pokud nezletilý zaplatil bez souhlasu zákonného zástupce, může zákonný zástupce napsat na
        [DOPLNIT: e-mail]. Do 30 dnů od platby vrátíme celou zaplacenou částku. Později vrátíme
        jen nevyužitou část: u sezónního přístupu poměrnou část ceny za období do 31. března, u
        měsíčního předplatného poměrnou část zbylých dnů v právě běžícím měsíci — dřívější měsíce
        se nevrací, protože byly už poskytnuté a nejde je vzít zpět. Přístup pak skončí. Odstoupit
        (§6) a totéž do 30 dnů kdykoli i sám/sama snadno vyřídíš tlačítkem v Nastavení.
      </p>

      <h2>8. Reklamace a vady služby</h2>
      <p>
        Když služba nefunguje, jak má, napiš nám na [DOPLNIT: e-mail]. Vadu odstraníme bez
        zbytečného odkladu, nejpozději do 30 dnů. Pokud se to nepodaří, máš právo na přiměřenou
        slevu z ceny, nebo na odstoupení od smlouvy s vrácením peněz. Tím nejsou dotčena tvá
        další zákonná práva spotřebitele.
      </p>

      <h2>9. Obsah od uživatelů a moderace</h2>
      <p>
        Recenze musí být pravdivé, slušné a nesmí obsahovat osobní údaje třetích osob, kontaktní
        údaje ani jména konkrétních učitelů. <strong>Recenze nejsou ověřené</strong> — jde o
        subjektivní názory autorů, ne o naše tvrzení.
      </p>
      <p>
        <strong>Jak moderujeme:</strong> Nové recenze prochází automatickým filtrem (vulgarismy,
        možná jména učitelů). Recenze od studentů, absolventů a návštěvníků kontroluje před
        zveřejněním člověk, protože mohou obsahovat osobní údaje. <strong>Jedno nahlášení stačí, aby
        se recenze skryla do kontroly</strong>; konečné rozhodnutí dělá člověk. Recenzi můžeme
        skrýt nebo smazat, pokud porušuje pravidla nebo zákon.
      </p>
      <p>
        <strong>Když recenzi omezíme,</strong> autor se důvod dozví hned u své recenze v aplikaci:
        jaké omezení jsme uložili, proč, zda bylo automatické, a jak se může bránit (napsat na
        [DOPLNIT: e-mail], rozhodnutí znovu posoudíme).
      </p>
      <p>
        <strong>Nahlášení nevhodného obsahu:</strong> tlačítkem „Nahlásit“ u recenze (napiš, proč je
        nevhodná nebo nezákonná, a potvrď dobrou víru) nebo e-mailem na [DOPLNIT: e-mail]. Příjem
        oznámení potvrdíme v aplikaci; výsledek ti sdělíme na tvůj e-mail, jakmile budeme moci
        e-maily odesílat [DOPLNIT: po zprovoznění e-mailů upravit].
      </p>
      <p>
        <strong>Kontaktní místo pro uživatele i orgány dozoru</strong> (čl. 11 a 12 nařízení o
        digitálních službách): [DOPLNIT: e-mail]. Komunikovat s námi můžeš česky nebo anglicky.
      </p>

      <h2>10. Odpovědnost</h2>
      <p>
        Snažíme se, aby údaje byly správné, ale jsou informativní a nemůžeme zaručit jejich
        úplnost ani aktuálnost; o volbě školy rozhoduješ ty. Tím není dotčena naše odpovědnost,
        kterou nelze podle zákona vyloučit (např. za škodu způsobenou úmyslně nebo z hrubé
        nedbalosti) ani tvá zákonná práva spotřebitele.
      </p>

      <h2>11. Ukončení a smazání účtu</h2>
      <p>
        Účet můžeš kdykoli smazat v Nastavení; předplatné se tím zruší a další platba neproběhne.
        Účet můžeme zablokovat při závažném porušení podmínek nebo zneužití služby a oznámíme ti
        to i s důvodem.
      </p>

      <h2>12. Řešení sporů</h2>
      <p>
        Nejprve nám napiš na [DOPLNIT: e-mail], vyřídíme to do 30 dnů. Pokud se nedohodneme, můžeš
        se obrátit na subjekt mimosoudního řešení spotřebitelských sporů: Česká obchodní inspekce,
        Štěpánská 567/15, 120 00 Praha 2, adr.coi.cz. Dozor nad dodržováním spotřebitelských
        předpisů vykonává také ČOI.
      </p>

      <h2>13. Změny podmínek a závěr</h2>
      <p>
        Vztah se řídí právem České republiky; tím nejsou dotčena práva spotřebitele podle
        právních předpisů státu jeho bydliště. Podmínky můžeme měnit; o změně tě informujeme
        nejméně 30 dní předem a u již zaplaceného období se změna neuplatní. U měsíčního tarifu
        můžeš před účinností změny předplatné zrušit.
      </p>
    </LegalPage>
  );
}
