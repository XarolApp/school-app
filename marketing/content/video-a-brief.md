# Video A (parents): build brief for the Phase 2 session

**Read all of this before starting.** It is the full spec for video A. **Video B is already built** in `marketing/video-b/` (Remotion project, capture scripts, caption and music pipeline, notes in `marketing/content/video-b-notes.md`). **Reuse it**: copy the project to `marketing/video-a/` and change the content, don't start from scratch.

- Accounts: @stredninamiru (Instagram Reels first, TikTok second)
- Format: 1080×1920, 30 fps, Czech, **~36 s** (hard cap 45 s)
- Audience: parents of Prague 9th graders, **vykání**, calm and factual, zero-shame (the pain is chaos and missing information, never the child or the parent)
- Topic: one striking real number (a Prague gymnázium with 227 applications for 30 seats), then **three numbers every parent should check for each school**, shown on the real app
- CTA: **waitlist on stredninamiru.cz → 10 % discount at launch** (launch is 1 Nov 2026)
- **Deadline: posted at 18:00 on 30 Oct 2026.** Render, check and hand over by ~17:15 at the latest. If the voiceover is late, say so early and cut scope (no mockups, fewer zooms), don't cut the verification in §8.

Skills to load first: `/remotion-motion-graphics` (SKILL.md + both references), `/video`, and `/killer-hook-script-lock-in-engineer` (the hook method this script follows).

---

## Start here

1. You run **locally**. Use the checkout of branch `claude/sharp-cray-596w4h` (a git worktree is fine), `git pull`, then `/reload-skills`. Merge `origin/main` into the branch first so the capture matches the live UI (main has the new MHD commute question in the quiz and the fixed mobile sort sheet). Commit only to `claude/sharp-cray-596w4h`.
2. Read this file, then `marketing/content/video-b-brief.md` §0 (hard rules), §4 (capture access via refresh token), §5 (motion system), §7 (music/SFX) and `video-b-notes.md`. **Those sections apply to video A unchanged** unless this file says otherwise.
3. Needed from the founder: `marketing/video-a/public/vo.mp3` (ElevenLabs, text in §6) and the same `.env.local` test-account token used for B (copy `marketing/video-b/.env.local` to `marketing/video-a/.env.local`; refresh tokens rotate, so if B's capture ran after the token was copied, ask for a fresh one). If `vo.mp3` is missing, build everything else first on placeholder timings; don't generate your own voice.
4. Copy `marketing/video-b/` → `marketing/video-a/` (without `node_modules`, `out/`, `public/shots/`, `.env.local`, `.session.json`). Rename the composition, reset `script.json`, `timeline.ts`, `captions.json`. Make sure `marketing/video-a/.session.json` is gitignored.

---

## 0. Differences from the video B rules

Everything in B §0 holds (truthful mockups, no prices / user counts / testimonials / "AI picks", no committed app code changes, secrets never in chat or commits). In addition:

- **Wording of the numbers.** Cermat counts *přihlášky* (applications). Say "přihlášek", never "dětí" or "lidí" for the 227. Do **not** say "1 z 7,6 děti projde" or any acceptance chance (pupils apply to several schools). "Přihlášek na jedno místo" is fine.
- **Don't claim rankings** ("nejžádanější gympl v Praze") on screen or in VO unless you verify it from the data yourself *and* the founder agrees. The raw numbers are enough.
- **School:** Gymnázium Elišky Krásnohorské (Ohradní, Praha 4), 4-year programme: **227 přihlášek, 30 míst, Cermat 2026 round 1** (`scripts/data/PZ2026_kolo1_skolobory_vysledky.xlsx`). **Before anything is rendered, check that the app shows the same numbers for that programme** (open the school detail, the programme card for the newest year). If the app shows different numbers, the app wins: change the VO text and tell the founder (VO must be re-generated; see §9). Find the school's id through `GET https://school-app-production-be43.up.railway.app/api/schools`.
- **Comparison schools (step 3 and CTA):** Krásnohorská, Gymnázium Christiana Dopplera (Cermat 2026: 135 přihlášek / 30 míst, highest minimum score among admitted pupils at a Prague 4-year gymnázium) and one more Prague gymnázium with full 2026 data. Take names and numbers from the live app only.
- **No mention of 2027 application dates** (not published).
- Parents are **not** told what the child "should" choose. The tone is "here is what to check", not "here is the best school".

---

## 1. The hook (Triple Hook)

**Subject:** a Prague gymnázium's admissions. **Outcome:** know what to check before the child applies.

### 1a. Text hook (0.0–3.0 s)
```
227 přihlášek na 30 míst
(pražský gympl 2026)
```
- 2 lines, no punctuation except the parentheses, no linking words. Line 1 is the hero (Archivo Narrow 700). **"227" is the only accent-coloured element.**
- Animation: the counter rolls 0 → 227 (tabular-nums, spring with damping ~30) while the **seat grid** (below) fills. "na 30 míst" slams in with a bouncy spring (scale 1.2 → 1, motion blur) on the word "míst" in the VO, and line 2 rises with a word stagger afterwards. Hold ~1 s at the end with idle breathing only. Something moves on frame 0.

### 1b. Spoken hook (0.0–3.3 s, Breakdown format, 10 words)
> **„Na tenhle pražský gympl přišlo letos dvě stě dvacet sedm přihlášek."**

Starts at frame 0 and aligned with the counter.

### 1c. Visual hook
A grid of **30 seat squares** (rounded rects, surface2) sits in the centre. As the counter climbs, small dots (applications) fly in from the edges and pile around the grid; only 30 dots land on seats, the other 197 stay outside and pile up. No gimmicks: the visual is the ratio. At the end of the hook the grid compresses into the phone frame showing the school detail page (scale-through, 10–12 frames, one low **thump**).

**4 S check:** Subject = pražský gympl ✔ · Stakes = what the competition looks like and how to check it ✔ · Speed = 10 words ✔ · Super clear = two numbers ✔

---

## 2. Lock-In Zone (3.3–10 s)

> „Na třicet míst. To jsou oficiální čísla Cermatu. A takhle si je u každé školy ohlídáte."

- Confirms the claim (the numbers are the official ones) and **proves** it: a clean label **„Zdroj: Cermat, přijímací řízení 2026"** fades in under the phone on "Cermatu"; the phone shows the real school detail with the same numbers.
- On "ohlídáte" the three step chips **1 2 3** pop in along the top (stagger 4 frames) and stay as a progress bar.

---

## 3. Script and beat sheet

VO in **vykání**, calm and clear. Timings are targets; the real VO decides the cut and **beats follow the VO**.

| # | Time | VO (exact text for ElevenLabs) | Step title (kinetic type above the phone) | App (real capture or truthful mockup) | Motion | SFX (visible event) |
|---|---|---|---|---|---|---|
| H | 0–3.3 | „Na tenhle pražský gympl přišlo letos dvě stě dvacet sedm přihlášek." | text hook | seat grid → phone | §1 | soft tick roll with the counter; **thump** on "míst" and on the grid→phone cut |
| L | 3.3–10 | „Na třicet míst. To jsou oficiální čísla Cermatu. A takhle si je u každé školy ohlídáte." | chips 1–3 | `/skoly/<id>` Krásnohorská detail: programme card with newest-year applicants / seats | Cermat label fades in; slow zoom on the numbers | tick per chip (3, quiet) |
| 1 | 10–17 | „Jedna. Kolik bodů stačilo na přijetí, a jak se to v posledních letech měnilo." | **1 · Body na přijetí** | the cutoff history chart (`HistoryChart`) of the programme | slow zoom on the chart line; tap on a year point if the UI supports it | tick on "1" |
| 2 | 17–22 | „Dvě. Kolik přihlášek přišlo na jedno místo." | **2 · Přihlášky na místo** | the applicants vs admitted stat of the same programme | zoom on the stat; number pops | tick on "2"; **pop** on the stat |
| 3 | 22–28 | „Tři. Jak škola sedí tomu, co vaše dítě baví." | **3 · Shoda s dítětem** | the parent quiz branch ("Kdo jsi? → rodič"), one question, then the result with match % for Krásnohorská | tap ring on the answer; zoom on the % | tick on "3"; **pop** when the % lands |
| CTA | 28–36 | „Všechno pro přes sto devadesát pražských škol na jednom místě. Od prvního listopadu na střední na míru tečka cé zet. Zapište se na waitlist a při spuštění dostanete slevu deset procent. Odkaz máte v biu." | **−10 % za waitlist**<br>stredninamiru.cz | `/porovnani` with 3 gymnázia side by side (horizontal pan) → phone slides out → end card: "−10 %" badge (the only hero element) + URL + "odkaz v biu" | URL letter-stagger; badge springs in last | soft **pad** on the end card |

**Loop:** the end card's background fades the 30-seat grid back in, echoing the hook. Optional, never delaying the CTA.

**Captions:** same rules as B §3 (word-synced, 2–4 words, Archivo 700 ~64 px, ~70 % height, safe zone). **No captions during 0–3.3 s.** Spoken numbers appear as digits in captions (227, 30, 10 %), URL as `stredninamiru.cz`; timings from Whisper, text from the script.

**Post caption (hand to the founder, don't publish):**
„227 přihlášek na 30 míst. Tři čísla, která si u každé školy zkontrolujte, než podáte přihlášky 📌 Uložte si to. Od 1. listopadu na stredninamiru.cz, zapište se na waitlist a dostanete 10 % slevu (odkaz v profilu). #prijimacky #gymnazium #devatak #praha #rodice"

---

## 4. Capture

Same method as B §4 (refresh token → localStorage session; mockups allowed when truthful). What differs:

- Screens needed: school detail for Krásnohorská (programme card, history chart, applicants stat), the **parent** onboarding branch (set role to *rodič* in "Kdo jsi?"; the onboarding needs sign-in, so use the same ProtectedRoute-lift fallback as B §4 point 2 and **revert it with `git checkout frontend/src/App.jsx`**), the match % for Krásnohorská, and `/porovnani` with three gymnázia.
- B's `scripts/capture.mjs` already contains the session handling, gate pass, onboarding answer save and comparison selection. Adapt it; don't rewrite.
- The developer account may show admin-only UI: crop it out or use a mockup for that frame.
- Use the default **Značka** palette, light mode in the phone, no personal data visible.

---

## 5. Motion design

Identical to B §5 (Značka dark stage, one hero colour per frame, Archivo fonts self-hosted, no linear easing, staggered entrances, 5-layer stack, anchor phone with wipe transitions, safe zone). Use B's `theme.ts`, `kit.tsx`, `Phone.tsx` and `Overlay.tsx`. New component: the 30-seat grid with flying dots (`SeatGrid.tsx`); keep it to transforms and opacity.

---

## 6. ElevenLabs voiceover (the founder generates it)

**Voice:** native Czech, **adult (≈30–45), calm, trustworthy, warm, clear diction**; a knowledgeable friend of the family, not an advert and not a teenager. Filter in the Voice Library: Language **Czech**, Use case **Social media** or **Informative**. Test 2–3 voices on the first sentence.

**Model and settings:** Eleven Multilingual v2 · Speed **1.0** (1.05 if the read is over 38 s) · Stability **50 %** · Similarity **75 %** · Style **10 %** · Speaker boost on · MP3 44.1 kHz 192 kbps.

**Text to paste** (numbers as words, blank lines are pauses):
```
Na tenhle pražský gympl přišlo letos dvě stě dvacet sedm přihlášek.

Na třicet míst. To jsou oficiální čísla Cermatu. A takhle si je u každé školy ohlídáte.

Jedna. Kolik bodů stačilo na přijetí, a jak se to v posledních letech měnilo.

Dvě. Kolik přihlášek přišlo na jedno místo.

Tři. Jak škola sedí tomu, co vaše dítě baví.

Všechno pro přes sto devadesát pražských škol na jednom místě. Od prvního listopadu na střední na míru tečka cé zet. Zapište se na waitlist a při spuštění dostanete slevu deset procent. Odkaz máte v biu.
```
**Pronunciation checks:** "gympl" (*gympl*), "Cermatu", ".cz" = *cé zet*, "waitlist" must sound English (*wejtlist*; respell `wejtlist` if not). 

**Delivery:** save as `marketing/video-a/public/vo.mp3`. Tighten pauses and get Whisper timings with B's `scripts/tighten.mjs` / `whisper.mjs` (text from the script, timings from Whisper).

---

## 7. Music and SFX

As in B §7: reuse `music.mjs` (self-generated bed, no licence risk) and B's synthesized SFX kit, each SFX tied to a visible event. For A, make the bed a touch calmer (lower tempo, ~90–100 BPM, less bright), because the audience is parents. Export a **no-music version** too. Update `marketing/content/credits.md` (self-generated music and SFX).

---

## 8. Done when (verify; don't describe)

1. `marketing/video-a/out/video-a.mp4` (1080×1920, 30 fps, H.264, `--crf 16`) and `video-a-nomusic.mp4`.
2. Extract and **look at** frames at 0.3 s, 1.5 s, 3.0 s, 3.6 s, every step's title moment and the CTA; fix overflow, safe-zone, contrast and layering; re-render and re-check; run the pre-delivery checklist in `.claude/skills/remotion-motion-graphics/references/design-rules.md`.
3. Spot-check ≥5 caption/audio alignments.
4. `ffprobe` duration/streams, no silence at the tail, no clipping.
5. **Every number on screen and in the VO matches the live app/API on render day**: 227 / 30 for Krásnohorská, the school count (must be ≥ 190 for "přes sto devadesát"), Doppler's figures.
6. **Verify the live waitlist page (`https://stredninamiru.cz`) mentions the 10 % discount** before handing over; if it doesn't, tell the founder (don't publish a CTA the page doesn't back).
7. Commit the Remotion source and credits to `claude/sharp-cray-596w4h`. **Don't commit** mp4s; send them with the file-sharing tool.
8. Report what you checked, what you couldn't verify, and any deviation from this brief.

## 9. Ask the founder if…

- the app shows different numbers than 227 / 30 for Krásnohorská (VO must be re-recorded; give the corrected text),
- the school count falls below 190,
- the waitlist page doesn't mention the discount, or the test token is dead,
- the VO runs over ~38 s at speed 1.05 (propose cuts),
- a step screen looks broken in production (report it as an app bug; don't hide it).
