# Simulace matchingu — 2026-10-04

5000 náhodných sad odpovědí (seed 1, přeskočení 25 %), 217 škol. Odpovědi jsou rovnoměrně náhodné, takže výsledek ukazuje STRUKTURÁLNÍ zvýhodnění, ne reálnou oblíbenost.

## Dotazník (/dotaznik, lib/matching.js)

- Škol v pořadí: 217; nikdy neohodnoceno: 0
- Kdyby bylo pořadí férové, každá škola by byla v top 10 v ~4.6 % případů.
- Škol, které se do top 10 nedostaly ani jednou: 3
- Korelace průměrného pořadí s úplností dat (záporná = víc dat → lepší pořadí): {"has_cutoff":-0.48,"extracted_fields":-0.03,"obory":-0.1,"programs_text_len":-0.2}

### 15 nejzvýhodněnějších
| # | Škola | Ø pořadí | ± | v top 10 | na posl. 10 | cutoff | ext. pole | obory |
|---|---|---|---|---|---|---|---|---|
| 1 | Křesťanská střední škola, základní škola a mateřská škola Elijáš, Praha 4-Michle (id 37) | 38.7 | 39.1 | 32.7 % | 0 % | ano | 14 | 1 |
| 2 | Evangelická akademie - pedagogické lyceum a střední odborná škola (id 104) | 43.9 | 41.3 | 26.8 % | 0 % | ano | 17 | 2 |
| 3 | Obchodní akademie, Praha 10, Heroldovy sady 1 (id 38) | 46.5 | 37.2 | 18.4 % | 0 % | ano | 9 | 3 |
| 4 | Střední odborná škola automobilní, informatiky a Gymnázium (id 11) | 48.9 | 38.3 | 14.5 % | 0 % | ano | 14 | 10 |
| 5 | Střední průmyslová škola strojnická, škola hlavního města Prahy, Praha 1, Betlémská 4/287 (id 4) | 49.5 | 42.2 | 21.6 % | 0 % | ano | 13 | 3 |
| 6 | Vyšší odborná škola zdravotnická a Střední zdravotnická škola a gymnázium, Praha 1, Alšovo nábřeží 6 (id 60) | 52.2 | 41.1 | 15.9 % | 0 % | ano | 8 | 5 |
| 7 | Střední průmyslová škola a Gymnázium Na Třebešíně (id 153) | 52.2 | 41.3 | 15.8 % | 0 % | ano | 16 | 4 |
| 8 | Střední odborná škola - Centrum odborné přípravy a Gymnázium (id 180) | 52.3 | 39.3 | 10.7 % | 0 % | ano | 8 | 19 |
| 9 | Střední škola - Waldorfské lyceum (id 188) | 53.2 | 41.4 | 15.9 % | 0 % | ano | 12 | 1 |
| 10 | Gymnázium, Střední odborná škola, Základní škola a Mateřská škola pro sluchově postižené, Praha 2, Ječná 27 (id 165) | 53.9 | 39.3 | 13.2 % | 0 % | ano | 13 | 1 |
| 11 | Gymnázium Milady Horákové (id 195) | 57.1 | 39.1 | 8.4 % | 0 % | ano | 17 | 1 |
| 12 | Akademické gymnázium a Jazyková škola s právem státní jazykové zkoušky, školy hlavního města Prahy (id 78) | 58.1 | 42.1 | 9.8 % | 0 % | ano | 13 | 1 |
| 13 | Obchodní akademie Dušní (id 49) | 58.4 | 38.9 | 7.4 % | 0 % | ano | 17 | 3 |
| 14 | Střední průmyslová škola elektrotechnická a gymnázium V Úžlabině (id 151) | 59 | 40.5 | 8.2 % | 0 % | ano | 17 | 3 |
| 15 | Střední průmyslová škola zeměměřická a Geografické gymnázium Praha (id 26) | 60.5 | 39 | 8 % | 0 % | ano | 6 | 2 |

### 15 nejznevýhodněnějších
| # | Škola | Ø pořadí | ± | v top 10 | na posl. 10 | cutoff | ext. pole | obory |
|---|---|---|---|---|---|---|---|---|
| 1 | Soukromá střední škola IMPULS 2003 s.r.o.   (id 222) | 191 | 38.5 | 0 % | 47.6 % | ne | 14 | 2 |
| 2 | SOUKROMÁ STŘEDNÍ UMĚLECKÁ ŠKOLA DESIGNU, s.r.o. (id 138) | 188.5 | 37.2 | 0.2 % | 39 % | ne | 11 | 3 |
| 3 | Odborné učiliště pro žáky s více vadami, s.r.o. (id 166) | 183.7 | 41.6 | 0.1 % | 32.8 % | ne | 9 | 3 |
| 4 | Euroškola Praha střední odborná škola s.r.o. (id 145) | 183.1 | 40.7 | 0.2 % | 32.4 % | ano | 8 | 2 |
| 5 | Mezinárodní Konzervatoř Praha - International conservatory Prague, s.r.o. (id 190) | 182.6 | 46.5 | 0.6 % | 40.9 % | ne | 9 | 24 |
| 6 | Anglo - německá obchodní akademie a.s. (id 196) | 180.1 | 41.2 | 0.1 % | 26.8 % | ano | 16 | 2 |
| 7 | Taneční centrum Praha - konzervatoř, z. ú. (id 123) | 179.2 | 47.3 | 0.8 % | 33.8 % | ne | 15 | 1 |
| 8 | Obchodní akademie, ŠKOLA 2000, s.r.o. (id 81) | 176.3 | 42.3 | 0.2 % | 19.1 % | ano | 13 | 1 |
| 9 | G.A.P.education, střední škola s.r.o. (id 192) | 174.7 | 48.8 | 0.8 % | 26.5 % | ne | 17 | 1 |
| 10 | Střední škola ekonomická se sportovním zaměřením, s.r.o. (id 84) | 174 | 42.5 | 0.3 % | 16.2 % | ano | 17 | 1 |
| 11 | Střední odborná škola podnikatelská PROFIT, spol. s r.o. (id 146) | 172.6 | 43.7 | 0.3 % | 15.4 % | ano | 18 | 3 |
| 12 | Střední škola Podnikatelská akademie, s. r. o. (id 59) | 169.6 | 43.7 | 0.4 % | 10.7 % | ano | 18 | 1 |
| 13 | Základní škola a střední škola waldorfská (id 172) | 168.1 | 51.4 | 0.1 % | 25.6 % | ne | 6 | 1 |
| 14 | Soukromá střední odborná škola START, s. r. o. (id 24) | 167.6 | 46.3 | 0.8 % | 13.8 % | ano | 16 | 1 |
| 15 | TRIVIS - Střední škola veřejnoprávní a Vyšší odborná škola prevence kriminality a krizového řízení Praha, s.r.o. (id 135) | 167.2 | 46 | 0.4 % | 14.3 % | ano | 17 | 2 |

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
