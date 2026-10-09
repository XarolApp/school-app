// Sharing links between a student and a parent (results, payment link, quiz
// handoff, shortlist) is switched off until it has been tested end to end —
// see UNFORGET "Sharing with parent/child: test before re-enabling".
export const SHARING_ENABLED = false;
export const SHARING_OFF_NOTE = 'Sdílení zatím nefunguje. Zapneme ho, až ho otestujeme.';

// School reviews stay private/off throughout the beta; the server has a matching
// opt-in env flag so a client build cannot enable the API by itself.
export const SCHOOL_REVIEWS_ENABLED = false;
export const SCHOOL_REVIEWS_OFF_NOTE = 'Recenze škol v testovací verzi zatím nejdou psát ani číst.';
