/**
 * Termíny přijímacího řízení 2027, shown on /skoly (plan 025 §6).
 *
 * Fill a `date` only from a published source and put that URL in `source`.
 * A null date is shown as its `fallback` wording, never as a guess. Next
 * season: new year, new values (UNFORGET "Admission dates 2027").
 */
export const ADMISSION_DATES = {
  year: 2027,
  items: [
    { id: 'prihlasky', label: 'Podání přihlášek', date: '1.–22. února 2027', fallback: null, source: null },
    { id: 'jpz', label: 'Jednotné přijímací zkoušky', date: null, fallback: 'duben 2027, termín upřesníme', source: null },
    { id: 'vysledky', label: 'Zveřejnění výsledků', date: null, fallback: 'po zkouškách, termín upřesníme', source: null },
    { id: 'listek', label: 'Zápisový lístek', date: null, fallback: '10 pracovních dnů od zveřejnění výsledků', source: null },
    { id: 'odvolani', label: 'Odvolání proti nepřijetí', date: null, fallback: '3 pracovní dny od doručení rozhodnutí', source: null },
  ],
};

// The decision profile asks for the real exam points once the exams are over.
export const REAL_SCORE_FROM = new Date('2027-04-15T00:00:00+02:00');
