import { useEffect, useRef } from 'react';
// One place for the wording of form problems, so every sign-up / log-in form
// reports the same thing the same way and ALL problems at once (a form that
// reveals one error per click makes people press the button three times).
// `parent` switches tykání to vykání; messages are written to read well either way.
const t = (parent, student, adult) => (parent ? adult : student);

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Misspelt big providers no real inbox lives on. Blocking is safe, and it saves
// the user waiting for a confirmation mail that can never arrive.
const DOMAIN_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gmail.cz': 'gmail.com', 'gmail.con': 'gmail.com',
  'seznan.cz': 'seznam.cz', 'seznam.com': 'seznam.cz', 'seznam.cs': 'seznam.cz', 'sezanm.cz': 'seznam.cz',
  'email.com.cz': 'email.cz', 'centrum.com': 'centrum.cz', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com',
};

export function emailProblem(value, parent = false) {
  const email = String(value || '').trim();
  if (!email) return t(parent, 'Napiš svůj e-mail. Pošleme na něj potvrzovací odkaz.', 'Napište svůj e-mail. Pošleme na něj potvrzovací odkaz.');
  if (!email.includes('@')) {
    return t(parent,
      'V e-mailu chybí zavináč (@). Adresa vypadá třeba takhle: jmeno@seznam.cz.',
      'V e-mailu chybí zavináč (@). Adresa vypadá třeba takhle: jmeno@seznam.cz.');
  }
  const domain = email.split('@').pop().toLowerCase();
  if (DOMAIN_TYPOS[domain]) {
    return t(parent, `Zkontroluj, jestli má být doména @${DOMAIN_TYPOS[domain]}. Oprav ji, ať ti mail dorazí.`, `Zkontrolujte, jestli má být doména @${DOMAIN_TYPOS[domain]}. Opravte ji, ať vám mail dorazí.`);
  }
  if (!EMAIL_SHAPE.test(email)) {
    return t(parent,
      'Tenhle e-mail nevypadá úplně správně. Zkontroluj překlepy a koncovku, třeba jmeno@seznam.cz.',
      'Tento e-mail nevypadá úplně správně. Zkontrolujte překlepy a koncovku, třeba jmeno@seznam.cz.');
  }
  return '';
}

export function passwordProblem(value, { minLength = 8, parent = false, checkLength = true } = {}) {
  const password = String(value || '');
  if (!password) return t(parent, 'Zadej heslo.', 'Zadejte heslo.');
  if (checkLength && password.length < minLength) {
    return t(parent, `Heslo je moc krátké. Potřebuje aspoň ${minLength} znaků.`, `Heslo je příliš krátké. Potřebuje aspoň ${minLength} znaků.`);
  }
  return '';
}

export function nameProblem(value, parent = false) {
  return String(value || '').trim() ? '' : t(parent, 'Napiš své jméno.', 'Napište své jméno.');
}

export function consentProblem(accepted, parent = false) {
  return accepted ? '' : t(parent,
    'Pro vytvoření účtu potřebujeme tvůj souhlas s podmínkami.',
    'Pro vytvoření účtu potřebujeme váš souhlas s podmínkami.');
}

/** Drops empty entries; the result is `{}` when the form is fine. */
export function onlyProblems(map) {
  return Object.fromEntries(Object.entries(map).filter(([, message]) => message));
}

/** Moves focus to the first invalid field so the person sees where to start. */
export function focusFirstInvalid(root = document) {
  const first = root.querySelector('[aria-invalid="true"]');
  first?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  first?.focus?.({ preventScroll: true });
}

/** "Ještě to nejde odeslat. Oprav 2 místa označená červeně." */
export function problemSummary(count, parent = false) {
  const places = count === 1 ? 'jedno místo označené' : count < 5 ? `${count} místa označená` : `${count} míst označených`;
  return parent ? `Ještě to nejde odeslat. Opravte ${places} červeně.` : `Ještě to nejde odeslat. Oprav ${places} červeně.`;
}

/** Ref for an error box: scrolls it into view whenever `message` changes, so a
 *  server error shown above the fold on a phone is never missed. */
export function useRevealError(message) {
  const ref = useRef(null);
  useEffect(() => {
    if (message) ref.current?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [message]);
  return ref;
}

/** Submit label while the CAPTCHA is still working — neutral, not an error. */
export const CAPTCHA_WAIT_LABEL = 'Ověřuji, že nejsi robot…';
