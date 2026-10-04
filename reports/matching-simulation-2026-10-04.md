# Simulace matchingu — 2026-10-04

5000 náhodných sad odpovědí (seed 1, přeskočení 25 %), 217 škol. Odpovědi jsou rovnoměrně náhodné, takže výsledek ukazuje STRUKTURÁLNÍ zvýhodnění, ne reálnou oblíbenost.

## Dotazník (/dotaznik, lib/matching.js)

- Škol v pořadí: 217; nikdy neohodnoceno: 0
- Kdyby bylo pořadí férové, každá škola by byla v top 10 v ~4.6 % případů.
- Škol, které se do top 10 nedostaly ani jednou: 20
- Korelace průměrného pořadí s úplností dat (záporná = víc dat → lepší pořadí): {"has_cutoff":-0.23,"extracted_fields":-0.05,"obory":-0.4,"programs_text_len":-0.58}

### 15 nejzvýhodněnějších
| # | Škola | Ø pořadí | ± | v top 10 | na posl. 10 | cutoff | ext. pole | obory |
|---|---|---|---|---|---|---|---|---|
| 1 | Střední odborná škola - Centrum odborné přípravy a Gymnázium (id 180) | 18.6 | 27.1 | 54.7 % | 0 % | ano | 8 | 19 |
| 2 | Střední škola podnikání a gastronomie (id 21) | 24.7 | 35.4 | 49.4 % | 0 % | ano | 14 | 11 |
| 3 | Střední škola designu a umění, knižní kultury a ekonomiky Náhorní (id 63) | 25.4 | 30.3 | 39.5 % | 0 % | ano | 13 | 8 |
| 4 | Střední odborná škola automobilní, informatiky a Gymnázium (id 11) | 26.5 | 31 | 39.1 % | 0 % | ano | 14 | 10 |
| 5 | Střední průmyslová škola strojnická, škola hlavního města Prahy, Praha 1, Betlémská 4/287 (id 4) | 38.2 | 40.5 | 30.8 % | 0 % | ano | 13 | 3 |
| 6 | Křesťanská střední škola, základní škola a mateřská škola Elijáš, Praha 4-Michle (id 37) | 42.4 | 42.3 | 28.2 % | 0.2 % | ano | 14 | 1 |
| 7 | Vyšší odborná škola a Střední průmyslová škola dopravní, Praha 1, Masná 18 (id 74) | 43.9 | 40.9 | 18.8 % | 0 % | ano | 7 | 3 |
| 8 | Vyšší odborná škola informačních studií a Střední škola elektrotechniky, multimédií a informatiky (id 43) | 46 | 43.7 | 20.8 % | 0.1 % | ano | 12 | 6 |
| 9 | Střední průmyslová škola a Gymnázium Na Třebešíně (id 153) | 46 | 43.7 | 20.7 % | 0.2 % | ano | 16 | 4 |
| 10 | Evangelická akademie - pedagogické lyceum a střední odborná škola (id 104) | 46.3 | 46 | 25.6 % | 0.4 % | ano | 17 | 2 |
| 11 | Střední škola, základní škola a mateřská škola pro sluchově postižené, Praha 5, Holečkova 4 (id 183) | 46.9 | 46.9 | 19.9 % | 0.1 % | ano | 15 | 11 |
| 12 | Střední odborná škola Jarov (id 141) | 48.4 | 44.7 | 12.7 % | 0.1 % | ano | 12 | 34 |
| 13 | Střední škola a vyšší odborná škola umělecká a řemeslná (id 40) | 48.6 | 47.9 | 16.7 % | 0.6 % | ano | 13 | 17 |
| 14 | Škola Kavčí hory - Mateřská škola, Základní škola a Střední odborná škola služeb, Praha 4, K Sídlišti 840 (id 103) | 50.5 | 46 | 20.3 % | 0.1 % | ano | 9 | 2 |
| 15 | Střední odborné učiliště, Praha 4, Ohradní 57 (id 99) | 51.5 | 50.1 | 16.8 % | 0.3 % | ano | 9 | 6 |

### 15 nejznevýhodněnějších
| # | Škola | Ø pořadí | ± | v top 10 | na posl. 10 | cutoff | ext. pole | obory |
|---|---|---|---|---|---|---|---|---|
| 1 | Taneční centrum Praha - konzervatoř, z. ú. (id 123) | 183.3 | 35.7 | 0 % | 34.1 % | ne | 15 | 1 |
| 2 | Gymnázium FOSTRA Digita s.r.o. (id 215) | 173.9 | 44.9 | 0 % | 29.2 % | ne | 14 | 1 |
| 3 | Gymnázium Přírodní škola, z.ú. (id 212) | 167.3 | 41.5 | 0 % | 15.8 % | ano | 9 | 1 |
| 4 | Mensa gymnázium, o.p.s. (id 113) | 164.9 | 46.8 | 0 % | 20.8 % | ano | 13 | 1 |
| 5 | PED Academy gymnázium, s.r.o. 	
 (id 221) | 164.5 | 44.2 | 0.1 % | 17.4 % | ano | 10 | 1 |
| 6 | PORG - gymnázium, základní škola a mateřská škola, o.p.s. (id 132) | 164.5 | 45.6 | 0.1 % | 18.5 % | ano | 13 | 3 |
| 7 | Gymnázium Kodaňská a Střední odborná škola, a.s. (id 201) | 162.9 | 41.9 | 0 % | 11.2 % | ano | 11 | 2 |
| 8 | Gymnázium Paměti národa, s.r.o. (id 204) | 162 | 42.2 | 0.1 % | 10.6 % | ano | 14 | 1 |
| 9 | Soukromá střední škola IMPULS 2003 s.r.o.   (id 222) | 161.8 | 54.7 | 0 % | 30.4 % | ne | 14 | 2 |
| 10 | Soukromé gymnázium ARCUS PRAHA 9, s.r.o. (id 148) | 161.1 | 43.9 | 0.1 % | 11.7 % | ano | 10 | 1 |
| 11 | Mezinárodní Konzervatoř Praha - International conservatory Prague, s.r.o. (id 190) | 160 | 53 | 0.1 % | 23.7 % | ne | 9 | 24 |
| 12 | Pražské humanitní gymnázium, školská právnická osoba (id 152) | 159.6 | 43.9 | 0 % | 12.8 % | ano | 14 | 2 |
| 13 | AVIDA - gymnázium, střední škola a základní škola s.r.o. (id 213) | 158.5 | 50.3 | 0.3 % | 17 % | ne | 6 | 1 |
| 14 | SOUKROMÁ STŘEDNÍ UMĚLECKÁ ŠKOLA DESIGNU, s.r.o. (id 138) | 157.9 | 54.4 | 0.3 % | 23.2 % | ne | 11 | 3 |
| 15 | GYMNÁZIUM JANA PALACHA PRAHA 1, s.r.o. (id 73) | 157.5 | 45.5 | 0.1 % | 11 % | ano | 12 | 1 |

## Onboarding (frontend/src/lib/matching.js)

- Škol v pořadí: 217; nikdy neohodnoceno: 0
- Kdyby bylo pořadí férové, každá škola by byla v top 10 v ~4.6 % případů.
- Škol, které se do top 10 nedostaly ani jednou: 0
- Korelace průměrného pořadí s úplností dat (záporná = víc dat → lepší pořadí): {"has_cutoff":-0.23,"extracted_fields":0.05,"obory":-0.52,"programs_text_len":-0.65}

### 15 nejzvýhodněnějších
| # | Škola | Ø pořadí | ± | v top 10 | na posl. 10 | cutoff | ext. pole | obory |
|---|---|---|---|---|---|---|---|---|
| 1 | Střední odborná škola - Centrum odborné přípravy a Gymnázium (id 180) | 46.3 | 39.6 | 21.4 % | 0 % | ano | 8 | 19 |
| 2 | Akademie řemesel Praha – Střední škola technická (id 14) | 53.7 | 52 | 25.3 % | 0.2 % | ano | 10 | 31 |
| 3 | Střední škola gastronomická a hotelová s.r.o. (id 98) | 54.1 | 43.9 | 14 % | 0.3 % | ano | 6 | 7 |
| 4 | Střední odborná škola Jarov (id 141) | 54.1 | 49.2 | 20.7 % | 0.3 % | ano | 12 | 34 |
| 5 | Gymnázium bratří Čapků a První české soukromé střední odborné učiliště s. r. o. (id 34) | 54.6 | 42.5 | 15.7 % | 0 % | ano | 12 | 7 |
| 6 | Soukromá střední odborná škola a Soukromé střední odborné učiliště BEAN, s.r.o. (id 143) | 57.7 | 48.6 | 18.2 % | 0.1 % | ano | 14 | 18 |
| 7 | Střední škola a Mateřská škola Aloyse Klara (id 169) | 58 | 49.9 | 15.9 % | 0.4 % | ano | 14 | 11 |
| 8 | Střední odborná škola automobilní, informatiky a Gymnázium (id 11) | 58.4 | 44 | 13.6 % | 0.1 % | ano | 14 | 10 |
| 9 | Jedličkův ústav a Mateřská škola a Základní škola a Střední škola (id 175) | 58.7 | 48.8 | 15.7 % | 0.1 % | ano | 13 | 5 |
| 10 | Metropolitní odborná umělecká střední škola Praha 4 s.r.o. (id 102) | 61.3 | 51.1 | 14.7 % | 0.2 % | ano | 6 | 7 |
| 11 | Střední odborná škola a Střední odborné učiliště, Praha - Čakovice (id 147) | 61.6 | 48.8 | 12.6 % | 0.2 % | ano | 16 | 7 |
| 12 | Střední škola designu a umění, knižní kultury a ekonomiky Náhorní (id 63) | 61.8 | 50.8 | 12.3 % | 0.5 % | ano | 13 | 8 |
| 13 | Střední škola hotelnictví a gastronomie SČMSD Praha, s.r.o. (id 142) | 62.4 | 48.5 | 10.6 % | 0.6 % | ano | 6 | 7 |
| 14 | Gymnázium pro zrakově postižené a Střední odborná škola pro zrakově postižené, Praha 5, Radlická 115 (id 182) | 63.3 | 41.3 | 7.2 % | 0 % | ano | 16 | 4 |
| 15 | ART ECON – Gymnázium a Střední odborná škola Praha, s. r. o. (id 16) | 63.4 | 43.2 | 9.8 % | 0.2 % | ano | 15 | 6 |

### 15 nejznevýhodněnějších
| # | Škola | Ø pořadí | ± | v top 10 | na posl. 10 | cutoff | ext. pole | obory |
|---|---|---|---|---|---|---|---|---|
| 1 | Střední škola - Waldorfské lyceum (id 188) | 173.7 | 52 | 0.4 % | 34 % | ano | 12 | 1 |
| 2 | Naše lyceum - střední škola s.r.o. (id 203) | 165.4 | 52.9 | 0.6 % | 24.3 % | ano | 18 | 1 |
| 3 | Křesťanská střední škola, základní škola a mateřská škola Elijáš, Praha 4-Michle (id 37) | 162.3 | 56 | 0.7 % | 24.1 % | ano | 14 | 1 |
| 4 | Mensa gymnázium, o.p.s. (id 113) | 152.2 | 55.1 | 0.8 % | 11.3 % | ano | 13 | 1 |
| 5 | Základní škola Livingston s.r.o. (id 199) | 146.8 | 53.9 | 0.6 % | 10.6 % | ano | 15 | 1 |
| 6 | Základní škola a Střední škola, Praha 4, Kupeckého 576 (id 168) | 146.4 | 68 | 2.3 % | 33.2 % | ne | 12 | 1 |
| 7 | Soukromé gymnázium ARCUS PRAHA 9, s.r.o. (id 148) | 146.1 | 54.2 | 0.7 % | 7.7 % | ano | 10 | 1 |
| 8 | Základní škola a Střední škola, Praha 10, Vachkova 941 (id 174) | 144.6 | 68.8 | 3 % | 32.8 % | ne | 12 | 1 |
| 9 | Základní škola a střední škola waldorfská (id 172) | 144 | 67.9 | 2.9 % | 31 % | ne | 6 | 1 |
| 10 | Základní škola speciální a Praktická škola, Praha 6, Rooseveltova 8 (id 171) | 143.7 | 70.3 | 2.9 % | 33.2 % | ne | 10 | 1 |
| 11 | Trojské gymnázium s.r.o. (id 127) | 143.5 | 54.5 | 0.8 % | 8.1 % | ano | 14 | 1 |
| 12 | Základní škola a gymnázium Minehava, z.s. (id 219) | 142.8 | 54.5 | 0.4 % | 8.8 % | ano | 16 | 1 |
| 13 | Gymnázium, Praha 9, Špitálská 2 (id 144) | 142.4 | 53.1 | 0.9 % | 6.9 % | ano | 14 | 2 |
| 14 | Gymnázium, Praha 9, Litoměřická 726 (id 140) | 142.2 | 52.3 | 0.7 % | 5.6 % | ano | 11 | 2 |
| 15 | Gymnázium, Praha 5, Nad Kavalírkou 1 (id 114) | 142.2 | 52.6 | 0.5 % | 3.1 % | ano | 15 | 1 |
