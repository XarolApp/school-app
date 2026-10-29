# Short-form video plan: Stage 1, revision 2 (awaiting approval)

> **Update 29 Oct:** concept B was replaced by a tutorial video ("Ušetři 32 hodin"). The full build spec is in `video-b-brief.md`.

Date: 29 Oct 2026 · Accounts: @stredninamiru (TikTok + Instagram Reels) · Format: 9:16, Czech
Goal: views first, sign-ups at stredninamiru.cz second.
Rev 2: hooks rebuilt with the Killer Hook method (Interrupt Theory, the 4 S's, Triple Hook, Lock-In Zone), real schools chosen from Cermat 2026 data, voiceover decided, launch date 1. listopadu.

Status: **Stage 1 complete. Nothing has been built.** Waiting for approval.

---

## 0. Decisions in this revision

**Launch wording: "od 1. listopadu".** I use "Od 1. listopadu na stredninamiru.cz" rather than "spouštíme 1. listopadu" or "nechte e-mail". Today is 29 Oct, so a video approved, built and posted this week will most likely go live *after* the launch. "Od 1. listopadu" is true both before and after launch day, which a waitlist CTA wouldn't be. If a video goes out before 1.11, the page at that link is still the waitlist, so the CTA works there too.

**Voiceover: yes, in all three.** In the vidIQ sample (section 1), the outliers in *our* category (a problem followed by a tool or info) are almost all voice-led: @l_bernasova (deadlines), @sari_studyy, @zlevni.to, @petrmara, @ukrainealtie. The music-only outliers are pure relatable skits (POV memes, senzokids) with no product to explain. Our videos have to explain an app in ~10 s, so text alone would need too many words on screen. The Killer Hook method also needs a *spoken* hook aligned with the text hook from second 0. A faceless account has a further reason: the voice is the only "relatable messenger" trust lever we have. VO therefore starts at 0.0 s in every video.

**Schools on screen.** Chosen from Cermat's 2026 round-1 results (`scripts/data/PZ2026_kolo1_skolobory_vysledky.xlsx`), Prague, 4-year programmes after 9th grade:

| School | 2026 data | Why it drives views |
|---|---|---|
| **SPŠ elektrotechnická, Ječná** | Informační technologie: **394 přihlášek, 96 míst**. Elektrotechnika: 433 / 96 | The most widely known school name among Prague teens, and IT is the most wanted programme. A name the viewer recognises triggers the "wait, Ječná?" orienting response, and comments fill with "jdu tam" / "taky se hlásím". → **video B** |
| **Gymnázium Elišky Krásnohorské** (Ohradní) | **227 přihlášek, 30 míst**: the highest demand ratio of any 4-year gymnázium in Prague in 2026 (7.6 per seat) | The single most striking true number in the dataset, for parents. → **video A** |
| **Gymnázium Christiana Dopplera** | 135 / 30, highest minimum score among admitted pupils at a Prague 4-year gymnázium | The "laťka" example for the comparison screen. → **video A/C** |
| **Smíchovská SPŠ, gymnázium a hotelová škola** | 1,397 applications across programmes | A large, famous IT-heavy school that suits the comparison next to Ječná. → **video C** |

⚠️ The numbers above are raw Cermat counts *per programme* (applications, capacity). Before render I'll check that the app screen shows the same numbers for the same programme, and I'll only put on screen what the app itself shows. Applications ≠ distinct pupils across schools, but within one programme each pupil can apply once, so "394 přihlášek na 96 míst" is exactly true. I won't write "394 lidí".

**Can I see the site with Playwright? Not yet.** This environment's network policy blocks the hosts (`stredninamiru.cz` → 403 at the proxy, same for the Railway API). See "What I need from you" below.

---

## 1. Research (unchanged from rev 1, summarised)

- vidIQ (4 searches, 20 credits) and web search. The /last30days engine returned nothing: the proxy blocks Reddit and HN, and it has no TikTok/IG key.
- **Gap:** no Czech creator is doing school-*choice* content. Exam prep and tutoring dominate, so the niche is open.
- **Proven formats we borrow:** "ulož si" admission explainer (@l_bernasova, 111.6K, 31×); faceless "then vs now" list for parents (@senzokids, 805K, 57×); text-POV teen skits (900K–1.8M); chat-bubble hook (@z4hranice, 2.4M); problem → app screen recording (@sari_studyy, 754K, 207×).
- **Lengths:** teens ~21 s (outliers 5–25 s, built to loop); parents ~36 s (parent/info outliers 36–88 s); both ~27 s.
- **Facts:** 3 applications via DiPSy in 2026, order fixed after final submission ([e15](https://www.e15.cz/prihlasky-na-stredni-skoly-terminy-navod-formular-2026)). JPZ 2027 on 14–15 April ([edulk.cz](https://edulk.cz/zaci-a-rodice/prijimaci-rizeni/case:detailPdf/itemId:503874/cgId:15623)). The 2027 application window is not published, so no video states it.

---

## 2. Hook rules applied (from the Killer Hook doc)

- **Text hook:** max 2 lines, line break at a natural phrase, **no punctuation except „quotes“ and (parentheses)**, no linking words (*a, nebo, že, ale, tedy, protože*), on screen ~3 s, *subject repeater* (proper noun) + a pain, outcome or change, and a specific number.
- **Spoken hook:** one proven format (Breakdown / Secret Reveal / Problem-Solution / Tutorial) plus a remixed power phrase (not a stock phrase).
- **Visual hook:** it shows exactly what the text says, using one move: a number counter, a bubble pop-in or a screen pattern interrupt. No gimmicks.
- **Lock-In Zone (next 2–4 sentences):** confirm the claim immediately and add proof (Cermat as a third-party source + a real app screenshot). Aesthetic quality comes from brand tokens and clean framing.
- **4 S check** on every hook: Subject, Stakes, Speed (spoken hook ≤ 12 words), Super clear.

---

## 3. The three videos

### A. Parents (vykání): Gymnázium Elišky Krásnohorské
Reels first, TikTok second · ~36 s · goal: saves + sign-ups

**Recommended hook**

| Layer | Content |
|---|---|
| Text hook (0–3 s) | **227 přihlášek na 30 míst**<br>(pražský gympl 2026) |
| Spoken hook (Breakdown, 11 words) | „Na tenhle pražský gympl se letos hlásilo dvě stě dvacet sedm dětí." |
| Visual hook | A 30-seat grid (simple rounded squares in brand colour); a counter rolls 0 → 227 while dots pile up around the grid. The grid fills; most dots stay outside. |
| 4 S | Subject: pražský gympl ✔ · Stakes: 1 in 7.6 get in ✔ · Speed: 11 words ✔ · Clear: two numbers, no wordplay ✔ |

**Lock-In Zone (3–11 s):** „Na třicet míst. To jsou oficiální čísla Cermatu. A takhle si je ohlídáte u každé školy, kterou zvažujete." Proof on screen: the "Zdroj: Cermat, přijímací řízení 2026" label, then cut to the **real app screen of that school** showing the same numbers.

**Alt hook (test second):** text **„3 přihlášky 1 pořadí“ / (po odeslání ho nezměníte)**, spoken „Tři přihlášky, jedno pořadí. A po odeslání ho už nezměníte." It's factually true for 2026 and a strong pain reminder, but it leans on pressure, so it's not the default.

**Beat sheet**

| Time | VO | On-screen text | Visual | Sound (each one tied to a visible event, under the voice) |
|---|---|---|---|---|
| 0–3 | spoken hook | text hook | seat grid + counter | soft tick roll synced to the counter |
| 3–11 | lock-in | Zdroj Cermat 2026 | cut → real app: Krásnohorská detail with applicants/admitted | one thump on the cut |
| 11–18 | „Jedna: kolik bodů stačilo na přijetí. A jak se to v posledních letech měnilo." | 1 · body na přijetí (vývoj) | app: cutoff history chart, slow zoom | tick on "1" |
| 18–24 | „Dvě: kolik dětí se hlásilo na jedno místo." | 2 · přihlášky na místo | app: applicants vs admitted stat | tick on "2" |
| 24–30 | „Tři: jak škola sedí tomu, co vaše dítě baví." | 3 · shoda s dítětem (%) | app: parent quiz question → match % | tick on "3", pop on the % |
| 30–36 | „Všechno pro přes sto devadesát pražských škol na jednom místě. Od prvního listopadu na stredninamiru.cz, odkaz je v profilu." | stredninamiru.cz (od 1. 11.) | app: comparison (Krásnohorská vs Doppler vs one more) → end card | soft pad on the end card |

Caption: „227 přihlášek na 30 míst. Tři čísla, která si u každé školy zkontrolujte, než podáte přihlášky 📌 Uložte si to. Od 1. listopadu na stredninamiru.cz (odkaz v profilu). #prijimacky #gymnazium #devatak #praha #rodice"

### B. 9th graders (tykání): Ječná
TikTok first, Reels second · ~21 s · goal: views, comments, rewatch (loop)

**Recommended hook**

| Layer | Content |
|---|---|
| Text hook (0–3 s) | **Ječná IT 394 přihlášek**<br>(96 míst) |
| Spoken hook (Secret Reveal, 10 words) | „Na Ječnou na IT se letos hlásilo tři sta devadesát čtyři lidí." *(grammatically "lidí" refers to applicants here; each applicant applies to a programme once, so it's accurate per programme)* |
| Visual hook | The word **JEČNÁ** slams in large, then the number 394 rolls up underneath; "96 míst" appears smaller in parentheses. One clean pattern interrupt: a dark frame switching to brand colour on the slam. |
| 4 S | Subject: Ječná (a proper noun teens know) ✔ · Stakes: will I get in where I want ✔ · Speed: 10 words ✔ · Clear ✔ |

**Lock-In Zone (3–9 s):** „Míst bylo devadesát šest. Takže jestli tě láká, chceš vědět, kolik bodů loni stačilo. A taky na jaký jiný školy dát další dvě přihlášky." Proof: the Cermat source label + real app screen of the Ječná detail with the cutoff.

**Zero-shame check:** we never say "you won't get in". The payoff is "here's how to see it clearly and pick the other two" (help, not fear).

**Alt hook (relatable, no numbers):** text **„Tak kam půjdeš na střední“ / (potřetí za den)**, spoken „Když se tě dneska potřetí někdo zeptá, kam půjdeš na střední." Bubbles from babi / teta / třídní. It has broader appeal but less specificity. Test it as the second post.

**Beat sheet**

| Time | VO | On-screen text | Visual | Sound |
|---|---|---|---|---|
| 0–3 | spoken hook | text hook | JEČNÁ slam + counter | thump on the slam, tick roll on the counter |
| 3–9 | lock-in | Zdroj Cermat 2026 | real app: Ječná detail → cutoff | tick on the cut |
| 9–15 | „Odpovíš na pár otázek. Co tě baví, gympl, nebo odborka, kam v Praze chceš dojíždět." | Co tě baví (gympl nebo odborka) | app: 3 quiz screens, a tap on each | soft tick per tap (3) |
| 15–18 | „A hned vidíš školy, který ti sednou." | školy který ti sednou | app: match % list (Ječná + 2 others) | pop when the list appears |
| 18–21 | „Od prvního listopadu na stredninamiru.cz. Odkaz máš v biu." | stredninamiru.cz (od 1. 11.) | end card; the last frame is the word JEČNÁ again, so it loops into the opening | pad on the end card |

Caption: „kdo se hlásí na Ječnou 👀 #jecna #prijimacky #devatak #stredni #praha #fyp"
First comment (pinned): „Na kterou školu se hlásíš ty? Napiš a do dalšího videa dáme ta čísla."  This is a real reason to comment, and it generates the next video idea from the answers.

### C. Both (vy, plural): the family chat
Both platforms · ~27 s · goal: **shares** (teen ↔ parent)

**Recommended hook**

| Layer | Content |
|---|---|
| Text hook (0–3 s) | **„Poslala jsem ti 14 odkazů“**<br>(máma deváťáka) |
| Spoken hook (Problem/Solution, 9 words) | „Výběr střední u nás doma vypadá přesně takhle." |
| Visual hook | A chat bubble from *Máma* pops in with the text, followed immediately by 14 link previews stacking up fast. |
| 4 S | Subject: choosing a school with mum ✔ · Stakes: the family argument / chaos ✔ · Speed: 7 words ✔ · Clear ✔ |

**Lock-In Zone (3–10 s):** chat continues (Já: „mami já nemám vybranou ani svačinu", Máma: „A díval ses na body z loňska?", Já: „jaký body"), then VO: „Každý z vás hledá jinde. Tak se nikdy neshodnete." Proof follows straight away in the payoff: one real app screen showing match % next to the Cermat numbers, so both "sides" see the same thing.

**Alt hook:** text **„Máma vs já“ / (výběr střední)**, with a two-column split showing each side's "research". Simpler, but weaker stakes.

**Beat sheet**

| Time | VO | On-screen text / chat | Visual | Sound |
|---|---|---|---|---|
| 0–3 | spoken hook | text hook | Máma's bubble + 14 link cards stacking | pop on the bubble, quick tick per card (capped at 5 audible ticks) |
| 3–10 | lock-in | chat × 3 | chat UI (generic, unbranded) | pop per bubble |
| 10–20 | „Střední na míru vám oběma ukáže to samé. Školy, které sedí tomu, co dítě baví. A k nim čísla z Cermatu. Třeba Ječná vedle Smíchovské." | jeden obrázek pro oba | real app: match list → comparison Ječná vs Smíchovská | thump on the comparison |
| 20–23 | — | Já: „ok tohle je dobrý" · Máma: „😮" | chat | pop × 2 |
| 23–27 | „Od prvního listopadu na stredninamiru.cz. Pošlete to tomu, s kým vybíráte." | stredninamiru.cz (od 1. 11.) | end card | pad |

Caption: „pošli to tomu, s kým to doma řešíš 😅 #prijimacky #stredni #devatak #rodice #praha"

---

## 4. Build recommendation: **B (Ječná) first**

- The recognisable name plus a specific number is the strongest hook of the three by the 4 S test. TikTok is the bigger reach channel for this age group.
- It's the shortest (21 s) and needs the fewest app screens.
- The pinned comment ("na kterou školu se hlásíš?") turns the first video into a source of ideas for the series: one school per video, with real numbers.
- Then **C** (built for shares, both audiences), then **A** (Reels, saves, parents).

---

## 5. What I need from you (blocks Stage 2)

1. **Network access, so Playwright can see the site.** In the environment's settings (cloud environment menu in the session title bar → Edit → Network access), add these under Allowed domains, keeping "Allow package managers" ticked:
   - `stredninamiru.cz`, `www.stredninamiru.cz`
   - `school-app-production-be43.up.railway.app` (API)
   - your Supabase project host (`<project>.supabase.co`, for sign-in)
   - `tile.openstreetmap.org` (map tiles; optional)

   Steps: https://code.claude.com/docs/en/cloud-environments#network-access. Then start a new session.
2. **A test account for screens behind sign-in** (quiz, results, comparison). Add it as environment secrets `MARKETING_TEST_EMAIL` and `MARKETING_TEST_PASSWORD`, never in chat. Without it I can capture only the public gate/waitlist page. The school-detail view from the landing-map dots might be enough for video A's detail shots, but not for the quiz.
   - **Fallback:** screen-record those screens on your phone and upload them.
3. **ElevenLabs:** after approval I give you the exact text per video, the voice choice and the settings. One file is fine; I'll cut it.

## 6. Approve / correct
- Build order (default **B → C → A**).
- The recommended hooks, or swap to the alts.
- OK to feature Ječná, Krásnohorská, Doppler and Smíchovská by name.
