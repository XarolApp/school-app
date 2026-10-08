# Střední na míru

Web app that helps Prague 9th graders (and their parents) choose a secondary school:
a catalogue of 217 visible schools, Cermat admission data with incomplete
year/programme coverage, an onboarding quiz, a full
questionnaire, comparison, a decision matrix and application planning.

- Architecture, decisions and local setup: [`CLAUDE.md`](CLAUDE.md) (same content for Codex in `AGENTS.md`)
- Open work and decisions: [`UNFORGET.md`](UNFORGET.md)
- Deployment (Railway backend, Vercel frontend, Supabase): [`DEPLOY.md`](DEPLOY.md)
- Continuing full-project review and handoff: [`reports/deployment-review-2026-10-07/REPORT.md`](reports/deployment-review-2026-10-07/REPORT.md)
- Additional Claude review snapshot: [`reports/claude-review-2026-10-07/REPORT.md`](reports/claude-review-2026-10-07/REPORT.md)

Quick start: `npm install && node server.js` (repo root) and `cd frontend && npm install && npm run dev`.

Beta access is free for feedback; payment screens are a preview. Live billing is
not approved. Follow the local environment/port instructions in `AGENTS.md` and
use a disposable database for write/destructive tests. The configured backend can
run scheduled work; do not treat starting it against production secrets as a sandbox.
