# Content strategy: faceless shorts (TikTok / Reels / YouTube Shorts)

Status: hypotheses to test, not guaranteed outcomes. No format below is proven. Nobody has posted yet (status doc sec. 23: no audience, 0 content). Goal of the first 2 weeks is to LEARN which hooks and formats get watched, then double down.

Audience: Czech 9th graders (main viewer), parents (secondary, mostly via shares and search). Language: Czech, tykání, short sentences, no slang overdose.

## Honesty and safety rules (apply to every video)
- Zero-shame: no "budeš litovat", "promarníš budoucnost", no pressure on grades or fear of not getting in. Frame as "ušetři si čas / udělej si v tom pořádek".
- No invented numbers, user counts, testimonials, "tisíce studentů". Only facts in the checklist below.
- Do not promise school reviews or link sharing (disabled in beta). Per the founder (28 Oct), payments are live from 1 Nov, so prices may be referenced: Sezónní přístup 690 Kč jednorázově (3 dny zkušební), Měsíční 249 Kč. Every price line is marked "[ověř před publikací]" in scripts (confirm in the live paywall and `frontend/src/config/pricing.js` before posting). Say "zdarma" ONLY about the 3-day trial of the season pass, never about the product. Never say "lifetime"; say "sezónní přístup". CTA is always "odkaz v bio".
- Accounts: @stredninamiru on TikTok and Instagram. Drafts only from our side: nothing is scheduled or published by Claude (Metricool brand 7545410 is connected, not used).
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
- Founder wants maximum volume for views, alongside development: design is **2 videos/day from day 1**, each cross-posted to TikTok, Reels and Shorts (same clean export, uploaded natively; ~42 platform posts per week from 14 videos).
- Slot A (morning ~7:00, before school) = education/myth/deadline. Slot B (evening ~18:30-19:30) = comparison/demo/POV. Times are hypotheses; check TikTok analytics "active followers" after week 1.
- Weekly mega-batch (Sunday, ~3-3.5 h): pick 14 scripts, record ONE 20-min screen-recording session for all app clips, generate 14 TTS voiceovers in one sitting, rough-cut all 14 in a CapCut template. Midweek mini-batch (Wed, 45 min): 3-4 reactive/trend videos.
- Daily (~30-45 min): final captions check, upload both videos (drafts first, post manually), reply to comments for 15 min after posting (comments boost reach and are research), log in `tracking-sheet.csv`.
- Reuse: an overperformer gets a remix (new hook, same content) after ~7 days.
- Quality guardrail: volume is allowed, but every video must contain one concrete useful point. 14-day data caution is advice: after 14 days compare formats before locking the mix; it is not a cap on posting.
- Plan A/B for a thin week: if a batch day is missed, the evergreen reserve (script 11 is evergreen and reusable any day) fills the gap.

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
- Confirm the site gate is open to the public from 1 Nov (CLAUDE.md: Vercel gate requires a tester code in production) and that payment screens match the price lines. All scripts use CTA "odkaz v bio".
- vidIQ outlier research (Czech přijímačky hooks) was not run; hook patterns above are from the founder's docs and general practice, not trend data.
- Verify 2027 přijímačky dates (CERMAT/MŠMT) before posting scripts 1, 2, 3.
- Confirm a mobile-quality demo account exists with the 192-school catalogue.

## 5 ideas I am UNSURE about
1. **Žebříčky škol ("top 5 gymnázií podle hranice")**: high views, but invites "ranking" claims, could read as endorsing/defaming schools, and conflicts with "schools cannot buy rankings" optics. Only if framed as raw CERMAT data with the year.
2. **Predikce přijetí ("máš X % šanci")**: huge hook, but ctx #27/#28/#46 say not launched unless reliable and never a guarantee. Skip for now.
3. **Trendy zvuky/memy o stresu z přijímaček**: reach potential, but easy to slide into fear/shame or generic cringe for 15-year-olds.
4. **Hlasová TTS vs jen text**: robotic Czech TTS may lower trust/retention; text-only may be less engaging. Needs an A/B on identical scripts.
5. **Reakce na komentáře videem / duets s jinými tvůrci**: strong for engagement, but needs consistent moderation and avoids fake-testimonial territory; also tied to creator outreach, which is a separate plan.
