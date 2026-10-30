# Video B — build notes (29 Oct 2026)

Remotion project: `marketing/video-b/`. Spec: `video-b-brief.md`. Credits: `credits.md`.

## Rebuild

```bash
cd marketing/video-b
npm install
node scripts/capture.mjs          # real @3x stills → public/shots/ (needs .env.local token, §4)
npm run assets                    # tighten VO → whisper timings → captions → music bed
npm run render && npm run render:nomusic
node scripts/stills.mjs 0.3s 1.5s 2.9s 3.3s   # check frames → out/check/
```

`public/shots/`, `vo-tight.wav`, `music.wav` and `out/` are gitignored (regenerable). Captures
log in through `.session.json` (gitignored); the refresh token rotates on every run.

## What the video does that differs from the brief, and why

- **VO length:** the ElevenLabs read was 55.9 s. Pauses were capped (0.34 s between
  paragraphs, 0.2 s between sentences) and tempo raised 1.05× (≈1.1 overall, the brief's
  ceiling) → 46.9 s. Video is 48.0 s.
- **Captions** show spoken numbers as digits (15, 192, 5 minut, 11, 10 %) and the URL as
  `stredninamiru.cz`; timings are the spoken words'.
- **Bookmark, not heart:** the app saves with a bookmark (záložka); the video shows that.
- **Match scores:** the developer test account isn't a beta tester, so the onboarding flow
  doesn't save its answers. The capture saves the same answers through
  `POST /api/me/onboarding-answers` (what a new account's flush calls) so `/skoly` can sort
  by "Shoda s tebou".
- **Sorting by cutoff:** a tap in the mobile "Řadit" sheet doesn't apply the sort on
  production (bug in `UNFORGET.md`). The sorted state was reached with the arrow keys; the
  video shows a tap. Fix the bug before posting.
- **Step 4 bridge:** `/ulozene`'s "Porovnat vybrané" opens the comparison; the capture
  set the comparison selection directly.
- **Matrix change shown:** "Počet míst" → "Nezáleží" reorders SSPŠ · Ječná · Křižík into
  Křižík · Ječná · SSPŠ (verified in the app).
- **Music:** self-generated bed instead of a library track (no licence or Content ID risk).
