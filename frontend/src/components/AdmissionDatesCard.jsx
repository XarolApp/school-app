import { ADMISSION_DATES } from '../config/admissionDates';
import { useDraft } from '../lib/useDraft';

/** The dates a ninth-grader has to keep; dismissible for the rest of the session. */
function AdmissionDatesCard() {
  const [dismissed, setDismissed] = useDraft('snm.dates2027.dismissed', false);
  if (dismissed) return null;
  return (
    <section className="ss-dates-card" aria-label={`Termíny ${ADMISSION_DATES.year}`}>
      <div className="ss-dates-head">
        <h2 className="ss-headline-sm">Termíny {ADMISSION_DATES.year}</h2>
        <button type="button" className="ss-btn ss-btn-ghost" onClick={() => setDismissed(true)} aria-label="Skrýt termíny">
          Skrýt
        </button>
      </div>
      <dl className="ss-dates-list">
        {ADMISSION_DATES.items.map((item) => (
          <div key={item.id} className="ss-dates-row">
            <dt>{item.label}</dt>
            <dd>
              {item.date ?? item.fallback}
              {item.source && item.date ? <> · <a href={item.source} target="_blank" rel="noreferrer">zdroj</a></> : null}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default AdmissionDatesCard;
