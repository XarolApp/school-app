# Codex task: does the filtered markdown extract as well as the original?

Paste this whole file into a **new Codex task** in the ŠkolaMatch repo
(`/Users/vojtechkadlec/Developer/school-app`). Model: **GPT-6 Luna**, reasoning
effort **low**. Run it **three times, each in a fresh Codex task** (never the
same chat), changing only the `RUN` value below:

| Run | `RUN` | Input folder |
|---|---|---|
| 1 | `orig-a` | `scripts/data/scraped-schools/` |
| 2 | `orig-b` | `scripts/data/scraped-schools/` |
| 3 | `filtered` | `scripts/data/filtered-schools/` |

Runs 1 and 2 are identical on purpose: their disagreement measures how much the
model varies on its own, so run 3's differences can be judged against that noise.

---

## Your job

`RUN = <fill in: orig-a | orig-b | filtered>`

You are replacing one API call per school in `scripts/extract-school-details.js`.
Do exactly what that call does, by hand, for these 15 school IDs:

`8, 9, 23, 48, 60, 62, 90, 104, 111, 125, 135, 146, 170, 199, 212`

### Hard rules
- **Do not run any script, do not call any API, do not write to Supabase, do not
  edit any existing file.** Read files and write only the output files below.
- Treat each school as a completely separate job. Never let what you read for
  one school influence another. Never reuse an answer from a previous run.
- Do not look inside `reports/codex-comparison/` for other runs' results.

### Instructions to follow (read these first)
Open `scripts/extract-school-details.js` and read, in full:
1. `SYSTEM_PROMPT` (starts line ~258). **These are your extraction rules. Follow
   every one literally**, especially: never guess, null when not clearly stated,
   SŠ only (ignore VOŠ and ZŠ prices), and the per-obor tuition rules.
2. `EXTRACT_TOOL` (line ~219). Its parameter schema is your **exact output
   shape**: same field names, same types, including `source_urls`.
3. `FIELDS`, `NUMERIC_FIELDS`, `BOOLEAN_FIELDS` (lines ~71–120) for the field list.

### Per school
1. **Input text:** read `<input folder>/<ID>.md` and use **only its first
   150 000 characters**. Ignore everything after that, even if it looks useful.
   The production script does the same cut, so this has to match.
2. **Context line:** the production script puts a short header before the text,
   giving the school type and the list of obory. You can't query the database, so
   leave it out. That's fine, because all three runs will lack it equally.
3. Extract the fields per `SYSTEM_PROMPT`. Put the page URL (from the
   `## PAGE-URL:` line above the passage) into `source_urls` for each field you fill.
4. Write the result to
   `reports/codex-comparison/<RUN>/<ID>.json`
   as one JSON object shaped exactly like `EXTRACT_TOOL`'s parameters. Use `null`
   for anything not found. No extra keys, no comments.

### When all 15 are done
Write `reports/codex-comparison/<RUN>/_done.txt` listing the 15 IDs and, for
each, one line: `ID: fields filled N/13`. Then stop. Don't compare runs yourself.
