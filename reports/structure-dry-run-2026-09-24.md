# School detail structure dry run — 2026-09-24

- Model: `openai/gpt-6-luna`
- Dataset: 219; targeted: 10.
- Targeted sample: 10 schools; 10, skipped 0, failed 0, of 10 targeted.
- Supabase writes: none (dry run only)

## Projected non-null coverage

These are local evidence-rule projections over cached records, not model-run counts.

| Column | Projected schools |
|---|---:|
| `ma_jidelnu` | 118/219 |
| `ma_koleje` | 5/219 |
| `krouzky_kategorie` | 165/219 |
| `pocet_krouzku` | 7/219 |
| `vyukovy_styl_tagy` | 108/219 |
| `vs_pokracuje_pct` | 15/219 |

## Per-school report

### 10 — Střední škola mediální grafiky a tisku, s. r. o.

**Stored free text**

**obedy_ubytovani**

> Stravování je zajištěno v blízké SOU Čakovice a případné ubytování v blízkém DM (4-6 zastávek busem).

**krouzky_aktivity**

> Nepovinná němčina, seznamovací kurz pro prvňáky, maturitní ples a imatrikulace prvních ročníků, poslední zvonění, návštěva významných výtvarných a fotografických výstav v Praze, pražská florbalová liga, pingpongový turnaj, lyžák v rakouských Alpách, turnaj v malé kopané, florbalový turnaj na konci školního roku, Hervis půlmaraton Praha, Foto+Grafická soutěž studentů školy, účast na soutěži Artis Pictus, fotografické kurzy, školní galerie foto+grafických prací, soutěž mladých grafiků, účast na soutěži Doteky papíru, půjčování knížek o fotografii a grafice.

**vyukovy_styl_detail**

> Praktické dovednosti, kreativní přístup, práce s moderními nástroji a portfoliem. 30% vyučování tvoří odborný výcvik (praxe) v malých skupinách (max. 7 studentů). Studenty učíme pracovat s nejmodernějšími nástroji s maximálním využitím AI pro zrychlení práce a získání inspirace.

**vs_uplatneni**

> Mladší absolventi studují na Vysoké škole uměleckoprůmyslové: Ondřej Brom, Vítek Škop a Tomáš Cikán.

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · stored text**

> Stravování je zajištěno v blízké SOU Čakovice a případné ubytování v blízkém DM (4-6 zastávek busem).

**ma_koleje ← obedy_ubytovani · stored text**

> Stravování je zajištěno v blízké SOU Čakovice a případné ubytování v blízkém DM (4-6 zastávek busem).

**krouzky_kategorie ← krouzky_aktivity · stored text**

> Nepovinná němčina, seznamovací kurz pro prvňáky, maturitní ples a imatrikulace prvních ročníků, poslední zvonění, návštěva významných výtvarných a fotografických výstav v Praze, pražská florbalová liga, pingpongový turnaj, lyžák v rakouských Alpách, turnaj v malé kopané, florbalový turnaj na konci školního roku, Hervis půlmaraton Praha, Foto+Grafická soutěž studentů školy, účast na soutěži Artis Pictus, fotografické kurzy, školní galerie foto+grafických prací, soutěž mladých grafiků, účast na soutěži Doteky papíru, půjčování knížek o fotografii a grafice.

**pocet_krouzku ← krouzky_aktivity · stored text**

> Nepovinná němčina, seznamovací kurz pro prvňáky, maturitní ples a imatrikulace prvních ročníků, poslední zvonění, návštěva významných výtvarných a fotografických výstav v Praze, pražská florbalová liga, pingpongový turnaj, lyžák v rakouských Alpách, turnaj v malé kopané, florbalový turnaj na konci školního roku, Hervis půlmaraton Praha, Foto+Grafická soutěž studentů školy, účast na soutěži Artis Pictus, fotografické kurzy, školní galerie foto+grafických prací, soutěž mladých grafiků, účast na soutěži Doteky papíru, půjčování knížek o fotografii a grafice.

**vyukovy_styl_tagy ← vyukovy_styl_detail · stored text**

> Praktické dovednosti, kreativní přístup, práce s moderními nástroji a portfoliem. 30% vyučování tvoří odborný výcvik (praxe) v malých skupinách (max. 7 studentů). Studenty učíme pracovat s nejmodernějšími nástroji s maximálním využitím AI pro zrychlení práce a získání inspirace.

**vs_pokracuje_pct ← vs_uplatneni · stored text**

> Mladší absolventi studují na Vysoké škole uměleckoprůmyslové: Ondřej Brom, Vítek Škop a Tomáš Cikán.

**Structured output**

```json
{
  "ma_jidelnu": true,
  "ma_koleje": null,
  "krouzky_kategorie": [
    "sport",
    "jazyky",
    "umeni_hudba_divadlo"
  ],
  "pocet_krouzku": null,
  "vyukovy_styl_tagy": [
    "praxe_dilny",
    "skupinova_prace"
  ],
  "vs_pokracuje_pct": null
}
```

**Nulled intentionally / evidence rejected**

- `ma_koleje`: model did not return an explicit boolean
- `pocet_krouzku`: no plausible explicit count from 0 to 200 or countable club list
- `vs_pokracuje_pct`: no numeric percentage within 0–100

### 13 — Škola mezinárodních a veřejných vztahů Praha, Střední odborná škola, Gymnázium, s. r. o.

**Stored free text**

**obedy_ubytovani**

> Obědy jsou dostupné v budově školy; ubytování lze sjednat v Domově mládeže v Ohradní ulici, asi 5 minut pěšky od školy.

**krouzky_aktivity**

> Škola uvádí studentské projekty Erasmus+, Diplomatické fórum, Právo na vlastní oči, Sociální sítě a média, EPAS a simulace soudního jednání v angličtině; pořádá také zahraniční zájezdy.

**vyukovy_styl_detail**

> Výuka zahrnuje odborné projekty a škola uvádí zážitkovou pedagogiku; některé odborné předměty se vyučují v angličtině.

**vs_uplatneni**

> Škola uvádí, že 81 % studentů odchází na vysoké školy v ČR i zahraničí. Mezi uvedenými absolventy jsou studenti psychologie, historie na FF UK, mezinárodních vztahů – asijských studií na MU, práv a mediálních studií.

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · stored text**

> Obědy jsou dostupné v budově školy

**ma_koleje ← obedy_ubytovani · stored text**

> ubytování lze sjednat v Domově mládeže v Ohradní ulici, asi 5 minut pěšky od školy.

**krouzky_kategorie ← krouzky_aktivity · stored text**

> Škola uvádí studentské projekty Erasmus+, Diplomatické fórum, Právo na vlastní oči, Sociální sítě a média, EPAS a simulace soudního jednání v angličtině; pořádá také zahraniční zájezdy.

**pocet_krouzku ← krouzky_aktivity · stored text**

> Škola uvádí studentské projekty Erasmus+, Diplomatické fórum, Právo na vlastní oči, Sociální sítě a média, EPAS a simulace soudního jednání v angličtině; pořádá také zahraniční zájezdy.

**vyukovy_styl_tagy ← vyukovy_styl_detail · stored text**

> Výuka zahrnuje odborné projekty a škola uvádí zážitkovou pedagogiku; některé odborné předměty se vyučují v angličtině.

**vs_pokracuje_pct ← vs_uplatneni · stored text**

> Škola uvádí, že 81 % studentů odchází na vysoké školy v ČR i zahraničí. Mezi uvedenými absolventy jsou studenti psychologie, historie na FF UK, mezinárodních vztahů – asijských studií na MU, práv a mediálních studií.

**Structured output**

```json
{
  "ma_jidelnu": true,
  "ma_koleje": null,
  "krouzky_kategorie": [
    "jine"
  ],
  "pocet_krouzku": null,
  "vyukovy_styl_tagy": null,
  "vs_pokracuje_pct": 81
}
```

**Nulled intentionally / evidence rejected**

- `ma_koleje`: model did not return an explicit boolean
- `pocet_krouzku`: no plausible explicit count from 0 to 200 or countable club list
- `vyukovy_styl_tagy`: no explicit supported teaching-style tag; marketing adjectives do not count

**Validation notes**

- ropped krouzky_kategorie veda_debata: no matching concrete, quoted activity survived evidence checks
- ropped vyukovy_styl_tagy projektova_vyuka: no exact quote matching its explicit evidence rule

### 16 — ART ECON – Gymnázium a Střední odborná škola Praha, s. r. o.

**Stored free text**

**obedy_ubytovani**

> U oboru Sportovní management je uvedena jídelna se samoobsluhou včetně snídaní. Informace o ubytování nejsou uvedeny.

**krouzky_aktivity**

> Škola pořádá sportovní kurzy, turnaje, olympiády a soutěže; organizuje také exkurze a výstavy. Součástí výuky jsou jazykové a tematické pobytové zájezdy do zahraničí.

**vyukovy_styl_detail**

> Škola popisuje moderní výuku propojenou s praxí, malé pracovní skupiny, individuální rozvoj a u sportovců individuální studijní přístup umožňující skloubit studium se sportovní přípravou.

**vs_uplatneni**

> Gymnázium připravuje na vysoké školy; u sportovního gymnázia jsou zmíněny zejména VŠ zaměřené na tělesnou výchovu, sportovní management či související obory. Konkrétní školy ani podíl pokračujících nejsou uvedeny.

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · stored text**

> U oboru Sportovní management je uvedena jídelna se samoobsluhou včetně snídaní.

**ma_koleje ← obedy_ubytovani · no usable fallback text**

> [empty]

**krouzky_kategorie ← krouzky_aktivity · stored text**

> Škola pořádá sportovní kurzy, turnaje, olympiády a soutěže; organizuje také exkurze a výstavy. Součástí výuky jsou jazykové a tematické pobytové zájezdy do zahraničí.

**pocet_krouzku ← krouzky_aktivity · stored text**

> Škola pořádá sportovní kurzy, turnaje, olympiády a soutěže; organizuje také exkurze a výstavy. Součástí výuky jsou jazykové a tematické pobytové zájezdy do zahraničí.

**vyukovy_styl_tagy ← vyukovy_styl_detail · stored text**

> Škola popisuje moderní výuku propojenou s praxí, malé pracovní skupiny, individuální rozvoj a u sportovců individuální studijní přístup umožňující skloubit studium se sportovní přípravou.

**vs_pokracuje_pct ← vs_uplatneni · stored text**

> Gymnázium připravuje na vysoké školy; u sportovního gymnázia jsou zmíněny zejména VŠ zaměřené na tělesnou výchovu, sportovní management či související obory. Konkrétní školy ani podíl pokračujících nejsou uvedeny.

**Structured output**

```json
{
  "ma_jidelnu": true,
  "ma_koleje": null,
  "krouzky_kategorie": [],
  "pocet_krouzku": null,
  "vyukovy_styl_tagy": [
    "praxe_dilny",
    "individualni_pristup",
    "skupinova_prace"
  ],
  "vs_pokracuje_pct": null
}
```

**Nulled intentionally / evidence rejected**

- `ma_koleje`: model did not return an explicit boolean
- `pocet_krouzku`: no plausible explicit count from 0 to 200 or countable club list
- `vs_pokracuje_pct`: no numeric percentage within 0–100

**Validation notes**

- ept krouzky_kategorie=[] because clubs/activities text exists but names no verified category.

### 19 — Střední průmyslová škola stavební Josefa Gočára, Praha 4, Družstevní ochoz 3

**Stored free text**

**obedy_ubytovani**

> Škola nemá vlastní internát. Obědy: 53,- Kč pro žáky. Ubytování mimopražských studentů je dostupné v domovech mládeže v Praze (Na Třebešíně 2299 pro chlapce, Ohradní 57 a Vrbova 1233 pro chlapce i dívky).

**krouzky_aktivity**

> Výtvarný ateliér, kreativní ateliér, muzikoterapie, posilovna, stolní tenis, tenis, volejbal.

**vyukovy_styl_detail**

> Moderní výuka s BIM projektováním, praxí ve stavebních firmách, licencemi AutoCAD a ArchiCAD zdarma po dobu studia, procházkami za architekturou.

**vs_uplatneni**

> Žáci jsou úspěšní při absolvování dalšího studia na technických univerzitách, především na ČVUT v Praze.

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · stored text**

> Obědy: 53,- Kč pro žáky.

**ma_koleje ← obedy_ubytovani · stored text**

> Škola nemá vlastní internát. Ubytování mimopražských studentů je dostupné v domovech mládeže v Praze (Na Třebešíně 2299 pro chlapce, Ohradní 57 a Vrbova 1233 pro chlapce i dívky).

**krouzky_kategorie ← krouzky_aktivity · stored text**

> Výtvarný ateliér, kreativní ateliér, muzikoterapie, posilovna, stolní tenis, tenis, volejbal.

**pocet_krouzku ← krouzky_aktivity · stored text**

> Výtvarný ateliér, kreativní ateliér, muzikoterapie, posilovna, stolní tenis, tenis, volejbal.

**vyukovy_styl_tagy ← vyukovy_styl_detail · stored text**

> Moderní výuka s BIM projektováním, praxí ve stavebních firmách, licencemi AutoCAD a ArchiCAD zdarma po dobu studia, procházkami za architekturou.

**vs_pokracuje_pct ← vs_uplatneni · stored text**

> Žáci jsou úspěšní při absolvování dalšího studia na technických univerzitách, především na ČVUT v Praze.

**Structured output**

```json
{
  "ma_jidelnu": true,
  "ma_koleje": null,
  "krouzky_kategorie": [
    "sport",
    "umeni_hudba_divadlo"
  ],
  "pocet_krouzku": 7,
  "vyukovy_styl_tagy": null,
  "vs_pokracuje_pct": null
}
```

**Nulled intentionally / evidence rejected**

- `ma_koleje`: model did not return an explicit boolean
- `vyukovy_styl_tagy`: no explicit supported teaching-style tag; marketing adjectives do not count
- `vs_pokracuje_pct`: no numeric percentage within 0–100

### 23 — Gymnázium a Sportovní gymnázium se zaměřením na esporty, s. r. o.

**Stored free text**

**obedy_ubytovani**

> V areálu vedle gymnázia je jídelna s nabídkou různých jídel včetně vegetariánských variant. Vlastní ubytování škola nenabízí; doporučuje se obrátit na FTVS UK nebo Centrum Krystal.

**krouzky_aktivity**

> Sportovní gymnázium nabízí seznámení se sporty, například atletikou, fitness, jógou, pilates, parkourem, lezením, bojovými sporty, basketbalem, fotbalem, florbalem a beachvolejbalem. Zmiňuje také mimoškolní sportovní aktivity.

**vyukovy_styl_detail**

> Výuka je popsaná jako aktivní, projektová, praktická a interaktivní, s individuálním přístupem; propojuje všeobecné vzdělání, sport a digitální technologie.

**vs_uplatneni**

> Škola připravuje studenty na přijímací řízení na VŠ; uvádí přípravu na vysokoškolské studium humanitní nebo přírodovědné u všeobecného gymnázia a sportovní nebo nesportovní u sportovního gymnázia.

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · stored text**

> V areálu vedle gymnázia je jídelna s nabídkou různých jídel včetně vegetariánských variant.

**ma_koleje ← obedy_ubytovani · stored text**

> Vlastní ubytování škola nenabízí

**krouzky_kategorie ← krouzky_aktivity · stored text**

> Sportovní gymnázium nabízí seznámení se sporty, například atletikou, fitness, jógou, pilates, parkourem, lezením, bojovými sporty, basketbalem, fotbalem, florbalem a beachvolejbalem. Zmiňuje také mimoškolní sportovní aktivity.

**pocet_krouzku ← krouzky_aktivity · stored text**

> Sportovní gymnázium nabízí seznámení se sporty, například atletikou, fitness, jógou, pilates, parkourem, lezením, bojovými sporty, basketbalem, fotbalem, florbalem a beachvolejbalem. Zmiňuje také mimoškolní sportovní aktivity.

**vyukovy_styl_tagy ← vyukovy_styl_detail · stored text**

> Výuka je popsaná jako aktivní, projektová, praktická a interaktivní, s individuálním přístupem; propojuje všeobecné vzdělání, sport a digitální technologie.

**vs_pokracuje_pct ← vs_uplatneni · stored text**

> Škola připravuje studenty na přijímací řízení na VŠ; uvádí přípravu na vysokoškolské studium humanitní nebo přírodovědné u všeobecného gymnázia a sportovní nebo nesportovní u sportovního gymnázia.

**Structured output**

```json
{
  "ma_jidelnu": null,
  "ma_koleje": null,
  "krouzky_kategorie": [
    "sport"
  ],
  "pocet_krouzku": null,
  "vyukovy_styl_tagy": [
    "projektova_vyuka",
    "individualni_pristup"
  ],
  "vs_pokracuje_pct": null
}
```

**Nulled intentionally / evidence rejected**

- `ma_jidelnu`: quoted text does not explicitly support the canteen/meal value
- `ma_koleje`: quote does not explicitly name an own/partner dormitory or deny all school-arranged accommodation
- `pocet_krouzku`: no plausible explicit count from 0 to 200 or countable club list
- `vs_pokracuje_pct`: no numeric percentage within 0–100

**Validation notes**

- ropped vyukovy_styl_tagy praxe_dilny: no exact quote matching its explicit evidence rule

### 26 — Střední průmyslová škola zeměměřická a Geografické gymnázium Praha

**Stored free text**

**obedy_ubytovani**

> [empty]

**krouzky_aktivity**

> [empty]

**vyukovy_styl_detail**

> [empty]

**vs_uplatneni**

> [empty]

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · no usable fallback text**

> [empty]

**ma_koleje ← obedy_ubytovani · no usable fallback text**

> [empty]

**krouzky_kategorie ← krouzky_aktivity · no usable fallback text**

> [empty]

**pocet_krouzku ← krouzky_aktivity · no usable fallback text**

> [empty]

**vyukovy_styl_tagy ← vyukovy_styl_detail · no usable fallback text**

> [empty]

**vs_pokracuje_pct ← vs_uplatneni · no usable fallback text**

> [empty]

**Structured output**

```json
{
  "ma_jidelnu": null,
  "ma_koleje": null,
  "krouzky_kategorie": null,
  "pocet_krouzku": null,
  "vyukovy_styl_tagy": null,
  "vs_pokracuje_pct": null
}
```

**Nulled intentionally / evidence rejected**

- `ma_jidelnu`: model did not return an explicit boolean
- `ma_koleje`: model did not return an explicit boolean
- `krouzky_kategorie`: no clubs/activities text in the stored field or cached markdown
- `pocet_krouzku`: no plausible explicit count from 0 to 200 or countable club list
- `vyukovy_styl_tagy`: no teaching-style text in the stored field or cached markdown
- `vs_pokracuje_pct`: no numeric percentage within 0–100

### 42 — The English College in Prague – Anglické gymnázium, o. p. s.

**Stored free text**

**obedy_ubytovani**

> [empty]

**krouzky_aktivity**

> [empty]

**vyukovy_styl_detail**

> [empty]

**vs_uplatneni**

> [empty]

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · no usable fallback text**

> [empty]

**ma_koleje ← obedy_ubytovani · no usable fallback text**

> [empty]

**krouzky_kategorie ← krouzky_aktivity · no usable fallback text**

> [empty]

**pocet_krouzku ← krouzky_aktivity · no usable fallback text**

> [empty]

**vyukovy_styl_tagy ← vyukovy_styl_detail · no usable fallback text**

> [empty]

**vs_pokracuje_pct ← vs_uplatneni · no usable fallback text**

> [empty]

**Structured output**

```json
{
  "ma_jidelnu": null,
  "ma_koleje": null,
  "krouzky_kategorie": null,
  "pocet_krouzku": null,
  "vyukovy_styl_tagy": null,
  "vs_pokracuje_pct": null
}
```

**Nulled intentionally / evidence rejected**

- `ma_jidelnu`: model did not return an explicit boolean
- `ma_koleje`: model did not return an explicit boolean
- `krouzky_kategorie`: no clubs/activities text in the stored field or cached markdown
- `pocet_krouzku`: no plausible explicit count from 0 to 200 or countable club list
- `vyukovy_styl_tagy`: no teaching-style text in the stored field or cached markdown
- `vs_pokracuje_pct`: no numeric percentage within 0–100

### 43 — Vyšší odborná škola informačních studií a Střední škola elektrotechniky, multimédií a informatiky

**Stored free text**

**obedy_ubytovani**

> [empty]

**krouzky_aktivity**

> [empty]

**vyukovy_styl_detail**

> [empty]

**vs_uplatneni**

> [empty]

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · no usable fallback text**

> [empty]

**ma_koleje ← obedy_ubytovani · no usable fallback text**

> [empty]

**krouzky_kategorie ← krouzky_aktivity · no usable fallback text**

> [empty]

**pocet_krouzku ← krouzky_aktivity · no usable fallback text**

> [empty]

**vyukovy_styl_tagy ← vyukovy_styl_detail · no usable fallback text**

> [empty]

**vs_pokracuje_pct ← vs_uplatneni · no usable fallback text**

> [empty]

**Structured output**

```json
{
  "ma_jidelnu": null,
  "ma_koleje": null,
  "krouzky_kategorie": null,
  "pocet_krouzku": null,
  "vyukovy_styl_tagy": null,
  "vs_pokracuje_pct": null
}
```

**Nulled intentionally / evidence rejected**

- `ma_jidelnu`: model did not return an explicit boolean
- `ma_koleje`: model did not return an explicit boolean
- `krouzky_kategorie`: no clubs/activities text in the stored field or cached markdown
- `pocet_krouzku`: no plausible explicit count from 0 to 200 or countable club list
- `vyukovy_styl_tagy`: no teaching-style text in the stored field or cached markdown
- `vs_pokracuje_pct`: no numeric percentage within 0–100

### 47 — Gymnázium Jiřího Gutha-Jarkovského, Praha 1, Truhlářská 22

**Stored free text**

**obedy_ubytovani**

> [empty]

**krouzky_aktivity**

> [empty]

**vyukovy_styl_detail**

> [empty]

**vs_uplatneni**

> [empty]

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · no usable fallback text**

> [empty]

**ma_koleje ← obedy_ubytovani · no usable fallback text**

> [empty]

**krouzky_kategorie ← krouzky_aktivity · no usable fallback text**

> [empty]

**pocet_krouzku ← krouzky_aktivity · no usable fallback text**

> [empty]

**vyukovy_styl_tagy ← vyukovy_styl_detail · no usable fallback text**

> [empty]

**vs_pokracuje_pct ← vs_uplatneni · no usable fallback text**

> [empty]

**Structured output**

```json
{
  "ma_jidelnu": null,
  "ma_koleje": null,
  "krouzky_kategorie": null,
  "pocet_krouzku": null,
  "vyukovy_styl_tagy": null,
  "vs_pokracuje_pct": null
}
```

**Nulled intentionally / evidence rejected**

- `ma_jidelnu`: model did not return an explicit boolean
- `ma_koleje`: model did not return an explicit boolean
- `krouzky_kategorie`: no clubs/activities text in the stored field or cached markdown
- `pocet_krouzku`: no plausible explicit count from 0 to 200 or countable club list
- `vyukovy_styl_tagy`: no teaching-style text in the stored field or cached markdown
- `vs_pokracuje_pct`: no numeric percentage within 0–100

### 48 — Gymnázium, Praha 10, Voděradská 2

**Stored free text**

**obedy_ubytovani**

> [empty]

**krouzky_aktivity**

> [empty]

**vyukovy_styl_detail**

> [empty]

**vs_uplatneni**

> [empty]

**Text sent to the model**

**ma_jidelnu ← obedy_ubytovani · cached markdown fallback**

> **Výdej obědů** ve školní jídelně je zajištěn bez omezení.

**ma_koleje ← obedy_ubytovani · no usable fallback text**

> [empty]

**krouzky_kategorie ← krouzky_aktivity · no usable fallback text**

> [empty]

**pocet_krouzku ← krouzky_aktivity · no usable fallback text**

> [empty]

**vyukovy_styl_tagy ← vyukovy_styl_detail · no usable fallback text**

> [empty]

**vs_pokracuje_pct ← vs_uplatneni · no usable fallback text**

> [empty]

**Structured output**

```json
{
  "ma_jidelnu": true,
  "ma_koleje": null,
  "krouzky_kategorie": null,
  "pocet_krouzku": null,
  "vyukovy_styl_tagy": null,
  "vs_pokracuje_pct": null
}
```

**Nulled intentionally / evidence rejected**

- `ma_koleje`: model did not return an explicit boolean
- `krouzky_kategorie`: no clubs/activities text in the stored field or cached markdown
- `pocet_krouzku`: no plausible explicit count from 0 to 200 or countable club list
- `vyukovy_styl_tagy`: no teaching-style text in the stored field or cached markdown
- `vs_pokracuje_pct`: no numeric percentage within 0–100
