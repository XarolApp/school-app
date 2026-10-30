# Playbook: rodiče deváťáků v Praze (komunity)

Stav: KONCEPT. Nic se nepublikuje ani neplánuje, dokud to zakladatel sám neodešle. Veřejný start 1. 11. 2026, 28. 10. je dnes.
Pozn. k ověření: `communities.csv` obsahuje jen to, co se našlo webovým vyhledáváním. Soukromé Facebook skupiny se webem nedají najít, najděte je ručně (krok 1) a zapište do `tracking.csv`. Velikosti skupin a jejich pravidla jsem neviděl, vždy je přečtěte v samotné skupině.

## Zásady (neporušovat)
1. Vždy pravdivě: píšete jako autor aplikace Střední na míru. Žádné falešné osoby, žádní "spokojení rodiče", žádné vymyšlené statistiky nebo reference. Skutečné recenze použít až s výslovným souhlasem autora.
2. Pravidla skupiny mají přednost. Když skupina zakazuje propagaci, nepropagujete. Buď získáte svolení admina, nebo jen věcně pomáháte (bez odkazu).
3. Tón: klidný, užitečný, vykání, žádný strach ("co když ho nevezmou"), žádný tlak ani odpočítávání.
4. Nezmiňovat vypnuté funkce: recenze škol a sdílení odkazů nejsou k dispozici. Neslibovat přijetí. Školy si pořadí nekoupí.
5. Žádné smlouvy se školami ani doučovacími firmami, ani je nenabízet.
6. Ceny: jen z `frontend/src/config/pricing.js`. V konceptech značeno [ověř před publikací].
7. Anonymita zakladatele: podepisovat se značkou ("autor aplikace Střední na míru"), ne jménem. Admini se někdy ptají, kdo za tím stojí; připravte si pravdivou krátkou odpověď (viz messages.md, sekce Reakce).

## Krok 0: příprava (jednorázově, ~45 min)
- Před prvním příspěvkem ověřte na veřejném webu, že vstupní brána pro testery je pro veřejnost vypnutá a že odkaz funguje v mobilu.
- Facebook: profil, ze kterého budete psát, musí být pravdivý. Pokud nechcete používat osobní profil kvůli anonymitě, zjistěte si podmínky Facebooku pro stránky/profily, ať neporušíte pravidla platformy. Nevytvářejte vymyšlenou osobu.
- Doplňte na webu stránku se zdroji a metodikou (Cermat, weby škol, Atlas školství; matematika řadí, AI vysvětluje). Na ni odkazovat při otázkách o důvěře.
- Připravte 1 bezplatný obsah, který stojí sám o sobě (viz Typy příspěvků), nejlépe jako stránku na webu a text, který jde vložit přímo do příspěvku bez odkazu.

## Krok 1: nalezení a vstup do skupin
1. Facebook hledání (odkazy v communities.csv): "přijímačky", "rodiče deváťáků", "Praha rodiče", "ZŠ + název školy rodiče", "střední škola výběr". Vypište 15 až 25 kandidátů.
2. Požádejte o vstup. Odpovězte pravdivě na vstupní otázky. Pokud se ptají na vztah k tématu, napište, že jste rodič/autor aplikace podle skutečnosti. Nezakládejte falešný vztah.
3. Zapište skupinu do `tracking.csv` (action = "žádost o vstup") a do `communities.csv` doplňte velikost a pravidla.
4. Prvních 3 až 7 dní jen čtěte, reagujte na dotazy bez odkazů a přečtěte připnutá pravidla.

## Krok 2: oslovení adminů (povolení)
- Nejdřív v pravidlech skupiny hledejte větu o reklamě/sebepropagaci. Pokud existuje formulář nebo týdenní "promo vlákno", použijte to.
- Pokud pravidla mlčí, pošlete adminovi zprávu z messages.md (Šablona A). Čekejte 5 dní, pak jednou připomeňte (Šablona A2). Pak skončit, žádné další upomínání.
- Bez odpovědi = bez povolení = jen věcná pomoc bez odkazu.
- Nekontaktovat členy skupiny soukromými zprávami hromadně. "Oslovit 200 rodičů" znamená: 200 kontaktů typu admin, rodič který sám napsal dotaz, a vlákna, kde jste pomohli. Nevyžádané soukromé zprávy cizím lidem jsou spam a riziko zablokování účtu i problém s ochranou osobních údajů.

## Krok 3: typy příspěvků (value-first)
Pořadí podle užitečnosti:
1. Vysvětlení "Jak číst hranici přijetí (cutoff)": co znamená, proč se mění ročník od ročníku, proč se dívat na jednotlivé obory, proč to není záruka. (Draft 1)
2. Kontrolní seznam "Co ověřit před podáním přihlášek": otevřené dveře, dojezd, kritéria přijetí, druhé kolo. (Draft 2)
3. Průvodce DiPSy a pořadím tří škol: pořadí je závazné, přihlášky a termíny ověřit na oficiálních stránkách (Cermat, MŠMT, DiPSy). (Draft 3)
4. Až později, jen kde je to dovoleno: měkká zmínka o aplikaci (Soft 1 a 2).
Pravidlo: max. 1 vlastní příspěvek na skupinu za týden, a to i se svolením.

## Krok 4: strategie komentářů (hlavní vektor)
- Cíl: 70 % času komentáře k cizím dotazům, 30 % vlastní příspěvky.
- Odpověď musí být kompletní bez kliknutí na odkaz. Odkaz přidat jen když (a) o něj člověk žádá, nebo (b) skupina propagaci výslovně dovoluje a jste označen jako autor.
- Při první zmínce aplikace v dané skupině vždy napsat: "Jsem autor aplikace Střední na míru."
- Nikdy neodpovídat na vlastní příspěvek z jiného účtu. Nikdy nevyzývat známé k "podpůrným" komentářům.
- Citlivá vlákna (neúspěch u přijímaček, stres dítěte): bez zmínky o aplikaci.

## CO NEDĚLAT
- Falešné profily, zdánlivě nezávislé doporučení, "dotaz" který ve skutečnosti propaguje aplikaci.
- Vkládání odkazů do skupin se zákazem promo.
- Hromadné soukromé zprávy cizím rodičům, kopírování stejného příspěvku do mnoha skupin ve stejný den.
- Strach, tlak, uspěchání ("poslední šance", "vaše dítě zaostane").
- Sliby přijetí nebo "záruka" a tvrzení o procentech úspěšnosti, které nemáme změřené.
- Zmínky o recenzích škol nebo sdílení odkazů s rodinou (vypnuto).
- Slib slevy, kterou nenabízíme. Smlouvy a partnerství se školami či doučovacími firmami.
- Zveřejnění dat dětí. Nikdy nepište do skupin cizí osobní údaje, ani pokud je rodič napíše sám; požádejte ho, ať je smaže.

## Denní rutina (45 až 60 min)
| Čas | Co |
|---|---|
| 10 min | Zkontrolovat odpovědi na vaše komentáře/zprávy, odpovědět (reply šablony) |
| 20 min | Projít 3 až 4 skupiny/fóra, napsat 3 až 5 užitečných komentářů (bez odkazu, pokud nejsou povoleny) |
| 10 min | 1 nová žádost o vstup nebo 1 zpráva adminovi (max. 2/den), zapsat do tracking.csv |
| 5 až 10 min | Zapsat výsledky; 1x týdně 1 vlastní příspěvek tam, kde je povolen |
| 5 min | Odpočinek od obrazovky, žádné dohánění večer |
Když je vývoj náročný: minimum = 15 min (odpovědi + zápis).

## Logování
- Každý kontakt = jeden řádek v `tracking.csv` (datum, skupina, akce, stav povolení, odpověď, zda kliknul/zeptal se, registrace, platba, další krok).
- Atribuce: zakladatel nesmí slibovat to, co nezměří. Používejte oddělené odkazy s UTM jen v místech, kde je odkaz povolen (např. ?utm_source=fb&utm_medium=parent_group&utm_campaign=<skupina>). Pokud analytika nemá souhlas, zapisujte jen "zeptal se / řekl, že přišel z...".
- Týdenní přehled (15 min v neděli): počet kontaktů, povolení, odpovědi, registrace, platby; co fungovalo, co ne. Pravidlo: skupinu s odmítnutím nebo s varováním od admina označit "NEKONTAKTOVAT".

## Dalších 5 způsobů oslovení rodičů (mimo Facebook skupiny), s riziky
1. Bezplatný PDF kontrolní seznam + e-mailový seznam (opt-in). Riziko: potřebuje správný souhlas (GDPR), právní text a platnou odhlašovací možnost; menší dosah na začátku. Ověřte u právníka/podle zákona před sběrem e-mailů.
2. SEO průvodce na webu ("Jak číst hranice přijetí", "DiPSy krok za krokem"). Riziko: výsledky až po týdnech až měsících; sezóna je krátká; nutná trvalá aktuálnost dat a pravidel.
3. Pitch novinářům/redakcím (např. rubriky o školství na velkých zpravodajských webech) s ověřitelnými daty z Cermatu. Riziko: nízká šance na odpověď, a anonymita zakladatele může zpomalit důvěru; nutné pravdivé zdroje; žádné placené umístění.
4. Instagram/TikTok @stredninamiru zaměřený na rodiče (krátké vysvětlující carousely). Riziko: algoritmus nedává dosah malému novému účtu; rodiče 40+ jsou spíš na Facebooku. Nutno zvlášť značit, že jde o obsah značky.
5. Doporučení od platících rodičů: po koupi jedna věta "Pokud znáte rodiče deváťáka, můžete se o aplikaci zmínit". Riziko: žádná sleva/odměna není definovaná; sdílení odkazů je vypnuto, takže jen ústní doporučení; nevyvolávat tlak. Jakoukoli odměnu zavádět až s právním posouzením.
Nevybráno kvůli zadání: spolupráce se školami a doučovacími firmami.

## Co nešlo ověřit
- Žádná soukromá FB skupina pro rodiče deváťáků v Praze nebyla vyhledávačem nalezena; velikosti a pravidla skupin neznám.
- Reddit, Discord a Telegram: nebylo možné ověřit (Reddit blokuje vyhledávání, Telegram/Discord nic relevantního nevrátil).
- Konkrétní termíny přijímacího řízení 2027 (podání přihlášek, jednotná zkouška): neuvedeno, ověřte na prijimacky.cermat.cz a stránkách MŠMT.
- Aktuální počet škol v katalogu ([ověř], kód říká 192 k 14. 10.).
