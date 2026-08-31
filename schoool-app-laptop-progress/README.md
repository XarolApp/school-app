# ŠkolaMatch — a school finder for Czech teenagers

A website that helps 15-year-olds in the Czech Republic choose which high school
to apply to.

This page explains the project in plain language. No technical background needed.
If you're a developer looking for architecture and conventions, read
[CLAUDE.md](CLAUDE.md) instead.

---

## The problem

In the Czech Republic, students pick their high school (*střední škola*) in
9th grade, at about 15 years old. It's a big decision and there's no good place
to research it.

- The one website that lists every school, `atlasskolstvi.cz`, is old, clunky,
  and hard to search.
- It tells you a school *exists*, but nothing about whether it suits **you**.
- So students end up opening dozens of individual school websites one by one, or
  asking ChatGPT scattered questions with no structure.

Parents are the ones who feel this most, and they're already used to paying for
help with school decisions.

## What the app does

Three things:

1. **A clean, searchable list of schools.** Location, study programs, admission
   info, contact details — all in one place, actually searchable.
2. **A questionnaire that recommends schools.** The student answers about ten
   questions about what they enjoy, how they like to learn, and where they're
   willing to travel. The app then ranks every school by how well it fits and
   explains each recommendation in a sentence.
3. **Favourites.** Save the schools you like and come back to them.

Everything is in Czech, because the users are Czech teenagers and their parents.

## How it makes money

- A monthly subscription, with a **7-day free trial**.
- There is no free version. After the trial, you need to pay to keep using it.
- Payment goes through Stripe (the standard online payment service).

The reasoning: there's no real competitor in the Czech market, and parents
already pay for this kind of guidance. A paid product with a trial earns more
per user than a free version with ads or upsells.

## Where it works right now

**Prague only** — about 60 schools. The plan is to prove it works in Prague with
real students first, then expand to Brno, Ostrava and other cities.

---

## What's built and working

**The school data**
- All 60 Prague high schools collected automatically and stored in a database.
- Every school has map coordinates, so each school page shows a small map of
  where it is.

**The website**
- Home page, school search, individual school pages, favourites, account
  settings, and sign-up / login.
- Works on phones and computers. Has a light and a dark theme.
- Designed to be readable for people with low vision (text contrast meets the
  standard accessibility guidelines).

**Accounts and payment**
- Sign up, log in, reset a forgotten password.
- You must confirm your email address before the trial starts, so nobody can
  start a trial on an address they don't own.
- Anti-bot protection, a password strength hint, and a show/hide toggle on
  every password field.
- The 7-day trial is tracked and enforced by the server, not by the browser.
  This matters: anything the browser decides, a determined user could change.

**Search that tolerates how people actually type**
- Accents don't matter — typing `gymnazium` finds `Gymnázium`.
- Typos are forgiven — `gimnazium` and `gymnazim` both still work.
- Slang works — `gympl` finds gymnasiums, `zdravka` finds medical schools.
- Filter by Prague district and by field of study, sort the results, and page
  through them. The web address updates as you search, so you can bookmark or
  share a set of results, and the browser Back button behaves sensibly.

**The questionnaire**
- About ten questions, then a ranked list of the schools that suit the student
  best, each with a percentage and a one-sentence explanation in Czech.
- Limited to 10 runs per month per account (this costs money to run). Re-reading
  results you already have is free and unlimited.
- The match percentage appears everywhere afterwards — on search results, on
  favourites, and on each school's page.

---

## What's not finished

1. **Payment isn't live.** The Stripe code is written, but a real price and the
   live keys still need to be set up. Until then the app says so clearly instead
   of breaking.
2. **A one-time database setup script** still needs to be run.
3. **Search needs to move to the server before the app grows.** It currently
   loads all schools into the browser and filters there. That's fine for 60
   schools, but it breaks silently at around 1000 — so this has to be fixed
   before adding more cities.
4. **Three smaller questionnaire items**, listed at the bottom of
   [CLAUDE.md](CLAUDE.md): reword one awkward question, score school size once
   we have enrolment numbers, and add a clickable map of Prague's districts
   next to the existing checkboxes.

---

## Four decisions worth understanding

These are the choices that shaped the project most, and they're all worth
knowing even if you never touch the code.

### The AI does not decide the match percentage

This is the most important one. An early version asked the AI for the score as
well as the explanation. Running the same student through two different AI
models gave the same school **95%** and **83%**.

Neither number was wrong, because neither was *measuring* anything. An AI asked
for a confidence score invents a plausible-looking one, in exactly the same way
it invents the sentence next to it.

So the scoring was moved into ordinary code. Now the percentage is arithmetic —
the same answers always produce the same ranking, and it can be checked by hand.
The AI's only job is writing the explanation next to each school.

### Leaving a question blank never lowers your score

If a student says "I don't mind" or skips an optional question, that question is
dropped from the calculation entirely and the remaining ones are re-weighted.

The obvious-looking alternative — scoring a blank answer as zero — would punish
someone who skipped a question exactly as hard as someone who answered and
mismatched. That would quietly push down the scores of the least opinionated
students.

### We never ask where the student lives

An earlier design asked for the student's home address and calculated travel
time to each school using Google Maps. That meant storing a child's home
address, sending it to a third party, and making privacy promises we'd have to
keep forever.

All of it was replaced by rewording a single question: *"Which parts of Prague
are you willing to travel to?"* The student answers that from their own address,
their own tolerance and their own sense of what counts as far — privately, in
their head, and more accurately than any travel estimate.

Nothing to collect, nothing to send, nothing to leak.

### The paywall is enforced in two places, neither of them the browser

The server checks whether your trial is still valid before it sends any school
data, and the database has its own rules on top of that. The website's own
checks only decide what to *display*.

This is why the trial is real rather than a suggestion.

---

## The technology, briefly

For anyone curious. You don't need to know any of this to understand the product.

| Part | What it is |
|---|---|
| Website | React — the visual part that runs in your browser |
| Server | Node.js + Express — checks who you are and what you're allowed to see |
| Database | Supabase (PostgreSQL) — stores schools, accounts and favourites |
| AI | Claude, used only to write the explanation sentences |
| Payments | Stripe |
| Data collection | An automated scraper that read the school directory once |

---

## Running it locally

Two parts have to run at the same time, in two terminals.

The server:

```bash
node server.js
```

The website:

```bash
cd frontend && npm run dev
```

Then open the address the second command prints (usually
`http://localhost:5173`).

Both need a `.env` file with database credentials — see the *Environment
Variables* section of [CLAUDE.md](CLAUDE.md) for the full list.
