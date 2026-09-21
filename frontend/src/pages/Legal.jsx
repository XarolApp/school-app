import './legal.css';

// Legal-review drafts. Flip to false only after the lawyer review in UNFORGET.md.
const DRAFT = true;

function LegalPage({ title, updated, children }) {
  return (
    <article className="legal">
      {DRAFT && (
        <p className="legal-draft" role="note">
          Pracovní návrh — dosud neprošel právní kontrolou. Místa označená [DOPLNIT] a [OVĚŘIT] jsou
          otevřená.
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
        Správcem osobních údajů je [DOPLNIT: jméno / firma, IČO, adresa sídla — musí to být dospělá
        osoba nebo právnická osoba], e-mail: [DOPLNIT]. Provozujeme službu ŠkolaMatch (web
        stredninamiru.cz).
      </p>

      <h2>2. Jaké údaje zpracováváme a proč</h2>
      <ul>
        <li>
          <strong>Účet:</strong> e-mail, jméno (které zadáš při registraci) a heslo. Heslo ukládá
          pouze zabezpečená autentizační služba v zahašované podobě; my ho nikdy nevidíme.
          Důvod: poskytnout ti účet a přihlášení (plnění smlouvy).
        </li>
        <li>
          <strong>Odpovědi v dotazníku a výsledky:</strong> co odpovíš v úvodním i samostatném
          dotazníku a jaké školy ti vyšly. Důvod: doporučit ti školy a ukázat ti je znovu
          (plnění smlouvy). Před vytvořením účtu zůstávají odpovědi jen v tvém prohlížeči.
        </li>
        <li>
          <strong>Tvé práce s aplikací:</strong> oblíbené školy, pořadí přihlášek, poznámky ke
          školám, počet bodů z přijímacích zkoušek (pokud ho zadáš), odkazy pro sdílení
          seznamu rodičům. Důvod: poskytnout tyto funkce (plnění smlouvy).
        </li>
        <li>
          <strong>Recenze a hlášení chyb:</strong> text recenze, tvoje role (např. student,
          rodič) a případná hlášení. Recenze je veřejná, ale zobrazuje se jen podle role (např.
          „Student · 3. ročník“). Jméno se u recenze ukáže pouze rodiči nebo učiteli, který to
          sám zapne. Důvod: souhlas a oprávněný zájem na moderaci.
        </li>
        <li>
          <strong>Předplatné a platby:</strong> stav předplatného, zvolený tarif, data trvání a
          identifikátory zákazníka u platební brány. <strong>Číslo karty nikdy nevidíme ani
          neukládáme</strong> — zadáváš ho přímo u společnosti Stripe. Důvod: plnění smlouvy a
          zákonné povinnosti (účetnictví).
        </li>
        <li>
          <strong>Technické údaje:</strong> IP adresa a údaje prohlížeče při ověření proti botům
          a při provozu serverů. Důvod: bezpečnost služby (oprávněný zájem).
        </li>
      </ul>
      <p>
        Nepoužíváme reklamní ani analytické cookies ani sledovací nástroje třetích stran
        [OVĚŘIT před spuštěním, pokud se cokoli přidá].
      </p>

      <h2>3. Komu údaje předáváme (zpracovatelé)</h2>
      <ul>
        <li>Supabase — databáze a přihlašování; data jsou uložena v regionu [OVĚŘIT: EU/region projektu].</li>
        <li>Stripe — platby (Stripe Payments Europe, Ltd. a spřízněné společnosti; možný přenos mimo EU na základě standardních smluvních doložek).</li>
        <li>
          OpenRouter a poskytovatel jazykového modelu (Google Gemini) — píší krátké vysvětlení,
          proč se ti škola hodí. Odesíláme jen odpovědi z dotazníku a názvy a údaje vybraných
          škol. Jméno, e-mail ani volná poznámka z dotazníku se do tohoto požadavku nevkládají.
          Přenos mimo EU [OVĚŘIT: poskytovatele modelu a mechanismus přenosu].
        </li>
        <li>Cloudflare Turnstile — ochrana formulářů proti robotům.</li>
        <li>Google Fonts — načtení písem v prohlížeči; při načtení může Google obdržet technické údaje spojení.</li>
        <li>Vercel a Railway — provoz webu a serveru [OVĚŘIT: skutečné produkční hostování a všechny podobné služby].</li>
        <li>Poskytovatel e-mailů pro potvrzení registrace a obnovu hesla: [DOPLNIT].</li>
      </ul>
      <p>Údaje neprodáváme a nepředáváme školám ani inzerentům.</p>

      <h2>4. Děti a nezletilí</h2>
      <p>
        Službu využívají hlavně žáci 9. tříd. Podle českého práva může souhlas se zpracováním
        osobních údajů dát dítě samo od 15 let; mladší potřebuje souhlas rodiče. Při registraci
        proto potvrzuješ, že ti je alespoň 15 let, nebo že máš souhlas rodiče či zákonného
        zástupce; okamžik přijetí podmínek si ukládáme. Věk ani totožnost rodiče dále neověřujeme
        [OVĚŘIT: dostatečnost tohoto postupu]. Před platbou vyžadujeme samostatné potvrzení v objednávce;
        nejde o ověření totožnosti ani rodičovského vztahu.
      </p>

      <h2>5. Jak dlouho údaje uchováváme</h2>
      <p>
        Po dobu existence účtu. Účet a vše výše popsané můžeš kdykoli smazat v Nastavení. Smaže se tím
        také tvé předplatné, uloženou platební metodu u Stripe a všechny tvé recenze. Záznamy o proběhlých platbách může Stripe a my
        uchovávat po dobu, kterou vyžaduje účetní a daňový zákon [OVĚŘIT: délka]. Neaktivní účty
        [OVĚŘIT / ROZHODNOUT: zatím se automaticky nemažou].
      </p>

      <h2>6. Tvá práva</h2>
      <p>
        Máš právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování,
        přenositelnost a právo vznést námitku. Výmaz i opravu jména zvládneš přímo v Nastavení;
        s ostatním nám napiš na [DOPLNIT: e-mail]. Pokud máš pocit, že s údaji nakládáme špatně,
        můžeš podat stížnost u Úřadu pro ochranu osobních údajů (uoou.gov.cz).
      </p>

      <h2>7. Prohlížeč a úložiště</h2>
      <p>
        V prohlížeči ukládáme přihlašovací relaci a volbu „zapamatovat si mě“, rozpracované odpovědi
        z dotazníku, vybranou roli a nastavení hledání a porovnání. Po registraci z onboardingu může
        prohlížeč až 7 dní uchovat e-mail a odpovědi, aby je po potvrzení e-mailu uložil ke správnému účtu.
        Nejde o sledování napříč weby.
      </p>

      <h2>8. Změny</h2>
      <p>Když zásady podstatně změníme, upozorníme tě v aplikaci nebo e-mailem.</p>
    </LegalPage>
  );
}

export function Terms() {
  return (
    <LegalPage title="Obchodní podmínky" updated="21. 9. 2026">
      <h2>1. Provozovatel</h2>
      <p>
        Službu ŠkolaMatch (stredninamiru.cz) provozuje [DOPLNIT: jméno / firma, IČO, adresa,
        e-mail, případně DIČ a zápis v rejstříku]. Uzavřením smlouvy souhlasíš s těmito podmínkami
        a se{' '}
        <a href="/ochrana-osobnich-udaju">Zásadami ochrany osobních údajů</a>.
      </p>

      <h2>2. Co služba je</h2>
      <p>
        Přehled středních škol v Praze, dotazník, který školy seřadí podle tvých odpovědí, a
        nástroje pro porovnání a plánování přihlášek. Výsledky jsou pomůcka k rozhodnutí, ne
        záruka přijetí ani doporučení jediné správné školy. Údaje o školách pocházejí z
        veřejných zdrojů (např. výsledky jednotné přijímací zkoušky od CERMAT) a mohou být
        neúplné nebo zastaralé — důležité údaje si vždy ověř u školy.
      </p>

      <h2>3. Zkušební doba a tarify</h2>
      <ul>
        <li>
          <strong>Sezónní přístup — 690 Kč jednorázově.</strong> Začíná 3denní zkušební dobou. Při
          zahájení se ti karta jen uloží, nic se neúčtuje. Po 3 dnech (v den uvedený při
          objednávce) se z karty jednorázově strhne 690 Kč a přístup trvá do konce března
          [DOPLNIT: rok]. Potom automaticky skončí, nic se neobnovuje.
        </li>
        <li>
          <strong>Měsíční — 249 Kč měsíčně.</strong> Bez zkušební doby, platba se opakuje každý měsíc,
          dokud předplatné nezrušíš.
        </li>
      </ul>
      <p>Ceny jsou uvedeny včetně DPH [OVĚŘIT: zda je provozovatel plátcem DPH].</p>

      <h2>4. Zrušení a vrácení peněz</h2>
      <ul>
        <li>Měsíční předplatné zrušíš kdykoli v Nastavení; přístup běží do konce zaplaceného měsíce a dál se nic neúčtuje.</li>
        <li>
          Sezónní přístup můžeš zrušit během 3denní zkušební doby — pak se karta pouze ověří, nic se neúčtuje.
        </li>
        <li>
          <strong>[OVĚŘIT S PRÁVNÍKEM: odstoupení a vrácení peněz]</strong> Dokud nebude hotový proces vrácení
          peněz a právně ověřené znění pro digitální službu, neslibujeme nad rámec platných zákonných práv konkrétní
          lhůtu ani postup.
        </li>
      </ul>

      <h2>5. Nezletilí</h2>
      <p>
        Pokud je ti méně než 18 let, může předplatné objednat jen s výslovným souhlasem rodiče nebo
        zákonného zástupce, který se také ujistí, že platba proběhne z jeho karty nebo s jeho
        vědomím. Při objednávce po tobě potvrzení rodiče vyžadujeme [OVĚŘIT: znění a
        vymahatelnost potvrzení].
      </p>

      <h2>6. Pravidla pro obsah od uživatelů</h2>
      <p>
        Recenze musí být pravdivé, slušné a nesmí obsahovat osobní údaje třetích osob ani jména
        konkrétních učitelů. Recenze, které porušují pravidla, můžeme skrýt nebo smazat.
        Nevhodný obsah můžeš nahlásit přímo u recenze.
      </p>

      <h2>7. Odpovědnost</h2>
      <p>
        Službu poskytujeme tak, jak je, a snažíme se o správnost údajů, ale neodpovídáme za
        rozhodnutí o volbě školy ani za škodu z nepřesných údajů, v rozsahu, v jakém to zákon
        dovoluje [OVĚŘIT: limity odpovědnosti vůči spotřebitelům]. Tím nejsou dotčena tvá
        zákonná práva spotřebitele.
      </p>

      <h2>8. Ukončení a smazání účtu</h2>
      <p>
        Účet můžeš kdykoli smazat v Nastavení. Účet můžeme zablokovat při závažném porušení
        podmínek nebo zneužití služby.
      </p>

      <h2>9. Reklamace a spory</h2>
      <p>
        Reklamace pošli na [DOPLNIT: e-mail]; vyřídíme ji nejpozději do 30 dnů. Spotřebitelské
        spory lze řešit mimosoudně u České obchodní inspekce (coi.gov.cz).
      </p>

      <h2>10. Závěrečná ustanovení</h2>
      <p>
        Vztah se řídí českým právem. Podmínky můžeme měnit; o podstatné změně tě předem
        upozorníme a u již zaplaceného tarifu se změna bez tvého souhlasu neuplatní.
      </p>
    </LegalPage>
  );
}
