# Content strategy: faceless shorts (TikTok / Reels / YouTube Shorts)

Status: hypotheses to test, not guaranteed outcomes. No format below is proven. Nobody has posted yet (status doc sec. 23: no audience, 0 content). Goal of the first 2 weeks is to LEARN which hooks and formats get watched, then double down.

Audience: Czech 9th graders (main viewer), parents (secondary, mostly via shares and search). Language: Czech, tykání, short sentences, no slang overdose.

## Honesty and safety rules (apply to every video)
- Zero-shame: no "budeš litovat", "promarníš budoucnost", no pressure on grades or fear of not getting in. Frame as "ušetři si čas / udělej si v tom pořádek".
- No invented numbers, user counts, testimonials, "tisíce studentů". Only facts in the checklist below.
- Do not promise school reviews or link sharing (disabled in beta). Do not quote prices or say payment is live (Stripe is not live-ready per CLAUDE.md). Do not say "zdarma" unless the founder confirms the access terms on launch day; default CTA is "odkaz v bio".
- Never imply a school paid for placement. We can say: školy si pořadí koupit nemůžou (founder decision, 90-point ctx #44).
- Historical CERMAT data is history, never a guarantee of acceptance (ctx #46). Say "loni", "v datech z CERMATu", never "tebe vezmou".
- Do not show real user data. Screen recordings use a test/demo account.

## Verifiable product facts you may use (checked in docs/code, 28 Oct)
- Katalog: 192 škol v Praze (live count, může se změnit; ověř před nahráním na `/skoly`).
- Dotazník o ~11 otázkách, výsledek jako procento shody. Počítá to matematika (deterministický skórovací kód); AI jen vysvětluje slovy, nikdy neurčuje skóre.
- Přeskočená otázka se do výpočtu nezapočítá.
- Porovnání až 5 škol vedle sebe (`/porovnani`), rozhodovací matice (`/matice`).
- Stránka školy: obory, historie přijímaček z dat CERMAT (hranice bodů jako rozpětí přes obory, podíl přijatých), mapa.
- "Moje přihláška": 3 školy v pořadí tak, jak se zadávají do DiPSy.
- Data pochází z webů škol, Atlasu školství a oficiálních dat CERMAT.
- Caveat: školy bez oborů vhodných pro 9. třídu (víceletá gymnázia, nástavby) jsou z katalogu skryté.

## Formats, ranked by expected views (hypothesis)
Ranking reasoning is from general short-form behavior (loop-able, low-friction, curiosity gap, search intent), not from our data. Re-rank after 2 weeks of tracking.

1. **"Myty a chyby při výběru školy" (text-on-screen + TTS)**, ~3 per week. Reason: relatable pain, a clear curiosity hook, needs no app, fastest to produce, shareable in class chats. Risk: generic, so it needs one concrete, non-obvious point per video.
2. **"Jak to opravdu funguje" vysvětlovačky (přijímačky, DiPSy, hranice bodů, termíny)**, ~2 per week. Reason: high search intent in Sept-April, saves/shares from parents too, evergreen. Risk: must be accurate; verify every date at cermat.gov.cz / MŠMT before posting.
3. **Souboj škol / datové srovnání (screen recording)**, ~1-2 per week. Reason: "A vs B" and "žebříček" formats invite comments and arguments. Risk: must stay neutral and framed as data, never "tahle škola je špatná" (defamation, zero-shame, school-independence). Use only CERMAT numbers, label the year.
4. **App demo / "co se stane, když..." (screen recording)**, ~2 per week. Reason: the only format that converts directly; satisfying UI (percent reveal, map) can hold attention. Risk: product demos usually get fewer views than pain/education, so keep them short (under 25 s) and curiosity-led.
5. **POV / relatable mini-skeče jen textem a stock záběry** (např. "Ty, 11 záložek otevřených na webech škol"), ~1 per week. Reason: highest virality ceiling, lowest conversion. Risk: easy to look cringe or generic AI spam (ctx #76). Test 2-3 only.

Account positioning (test, ctx #74): one account, trustworthy-but-human tone, trend-friendly hooks, no corporate voice. Name/bio should say what it is: "Výběr střední v Praze. Data, ne dojmy."

## Cadence for one person (~1-1.5 h/day)
- 1 video/day on TikTok, cross-posted to Reels and Shorts (same file, no watermark: export clean, upload natively to each).
- Weekly batch (Sunday, ~2.5 h): write/choose 7 scripts, record 2-3 screen-recording sessions (10 min each, vertical 9:16 via phone-frame browser or `mobile-preview.html`), generate 7 TTS voiceovers.
- Daily (~40-60 min): edit in CapCut template (captions auto + manual fix), post at the planned time, reply to every comment for 15 min in the first hour (comment replies boost reach, and comments are research), log results in `tracking-sheet.csv`.
- Reuse: each long script yields 1 cut-down remix after 10 days if it overperformed.
- Do not post more than 2/day until you have 14 days of data.

## Batch production workflow
1. One recording session = all app clips for the week (list is in each script's "Screeny"). Record on test account, 1080x1920, hide email/profile. Save as `clips/<screen>-<n>.mp4`.
2. Voiceover: Czech TTS (e.g. ElevenLabs Czech voice or CapCut's Czech voice; test 2 voices, pick the least robotic). Optionally skip voice and use text only; test both (voice vs text-only is an experiment).
3. Template in CapCut: hook text top third, captions middle-lower (avoid bottom 20% where UI covers), 1 cut every 1.5-3 s, subtle sound bed.
4. Safe zone: keep key text away from the right edge and the bottom 20%.
5. Caption + 3-5 hashtags written in the script itself, paste directly.

## Hook patterns (first 2 seconds, text on screen + spoken)
- Konkrétní číslo z reality: "Na výběr máš 192 pražských škol. Jak to vůbec proklikat?" (číslo jen živé z katalogu)
- Chyba, která není tvoje vina: "Tohle při výběru školy dělá skoro každý. A není to tvoje chyba."
- Mýtus: "Mýtus: Na první místo přihlášky dej školu, kam se určitě dostaneš."
- Otevřená smyčka: "Hranice bodů neznamená to, co si myslíš."
- A vs B: "Gympl vs. lyceum: v čem je to doopravdy rozdíl?"
- Pohled zevnitř: "Co jsem zjistil z oficiálních dat CERMAT o přijímačkách."
- Úspora času: "Jak porovnat 5 škol za 2 minuty místo 5 odpolední."
- Termín: "Do 1. března musíš odevzdat přihlášku. Tady je klidný plán." (ověřit rok)

Avoid: "Nikdo ti to neřekne", "tajemství", clickbait you cannot pay off, "AI ti vybere školu" (the ranking is maths).

## Hashtags and search keywords
Mix of 1 broad + 2 niche + 1 local, max 5 per post. Test sets, log the set in notes.
- Niche: #přijímačky #přijímačky2027 #devítka #střednívýběr #výběrškoly #cermat #gympl #dipsy #dnyotevřenýchdveří
- Local: #praha #pražskéškoly
- Broad: #škola #fyp #pronebe (broad ones are weak signals; do not over-rely)
- On-screen/caption keywords for TikTok search: "jak vybrat střední školu", "přijímačky na střední termíny", "jak funguje přihláška na střední", "hranice bodů přijímačky", "gymnázium nebo lyceum", "dny otevřených dveří Praha". Say the keyword aloud or in text in the first 3 s.
- Date note: year-specific tags/titles need the right year (přijímačky 2027 for the current 9th graders; verify).

## What to measure (see tracking-sheet.csv)
Per video: views, avg watch %, 3-s hold if available, shares, saves, link clicks, signups. Decision rules after 14 days (suggestion, not law):
- Keep a format if its median avg watch % is above your overall median.
- Cut a format after 4 posts if all are under ~100 views and watch % is bottom-third.
- Judge business value by signups per 1,000 views, not views alone (ctx: optimize paying customers, not vanity).
- Small samples are noisy; a single hit is not a trend.
- Attribution: use a different UTM per platform and per week if the bio link allows (e.g. `?utm_source=tiktok&utm_campaign=w1`). If link tracking isn't set up, ask new signups "kde jsi nás viděl?".

## Open dependencies for the founder
- Confirm launch-day CTA wording (free beta vs access terms) and whether the site gate is open to the public on 1 Nov. Until confirmed, all scripts use "odkaz v bio".
- Verify 2027 přijímačky dates (CERMAT/MŠMT) before posting scripts 1, 2, 3, 12.
- Confirm a mobile-quality demo account exists with the 192-school catalogue.
