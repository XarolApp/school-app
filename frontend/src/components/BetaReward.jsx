import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, Star, X } from 'lucide-react';
import { submitBetaMicro } from '../api';
import { betaTracker } from '../lib/betaTrack';
import { doneCount, tasks } from './BetaInstructions';

// One ten-second question set per checklist feature. Rating 1–5 plus one or two
// chip questions; the note is optional. Answers are feedback but never renew
// access (only a written report does), so the copy does not promise that.
const QUICK = {
  dotaznik: { label: 'dotazník', chips: [
    ['Jak realistické ti přijdou výsledky?', 'Jak realistické vám přijdou výsledky?', ['Sedí', 'Částečně', 'Vůbec nesedí']],
    ['A otázky?', 'A otázky?', ['Nějaká chybí', 'Některá je navíc', 'Tak akorát']],
  ] },
  vyhledavani: { label: 'vyhledávání', chips: [['Našel(a) jsi, co jsi hledal(a)?', 'Našli jste, co jste hledali?', ['Ano', 'Částečně', 'Ne']]] },
  detail: { label: 'stránku školy', chips: [['Chybělo ti na stránce školy něco?', 'Chybělo vám na stránce školy něco?', ['Nic', 'Něco ano', 'Hodně']]] },
  porovnani: { label: 'porovnání', chips: [['Pomohlo ti porovnání?', 'Pomohlo vám porovnání?', ['Ano', 'Trochu', 'Ne']]] },
  matice: { label: 'rozhodovací matici', chips: [['Dávalo pořadí v matici smysl?', 'Dávalo pořadí v matici smysl?', ['Ano', 'Částečně', 'Ne']]] },
  prihlaska: { label: 'přihlášku', chips: [['Bylo jasné, jak přihlášku sestavit?', 'Bylo jasné, jak přihlášku sestavit?', ['Ano', 'Částečně', 'Ne']]] },
  tema: { label: 'barevná témata', chips: [['Líbí se ti barevná témata?', 'Líbí se vám barevná témata?', ['Ano', 'Jsou v pohodě', 'Ne']]] },
  platby: { label: 'platební obrazovky', chips: [['Byla cena a nabídka jasná?', 'Byla cena a nabídka jasná?', ['Ano', 'Spíš ano', 'Ne']]] },
};

// Where a feature is "being used": the reward waits until the tester leaves it.
const ON_PAGE = {
  dotaznik: (p) => p.startsWith('/dotaznik'),
  vyhledavani: (p) => p === '/skoly',
  detail: (p) => /^\/skoly\/\d/.test(p),
  porovnani: (p) => p === '/porovnani',
  matice: (p) => p.startsWith('/porovnani/matice'),
  prihlaska: (p) => p.startsWith('/prihlaska'),
  tema: (p) => p.startsWith('/nastaveni'),
  platby: () => false,
};

/** The ten-second form. Used in the reward pop-up and inline (paywall preview end). */
export function QuickFeedback({ id, parent = false, onDone, title }) {
  const spec = QUICK[id];
  const [rating, setRating] = useState(0), [picked, setPicked] = useState({}), [note, setNote] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [sent, setSent] = useState(false);
  const t = (student, adult) => (parent ? adult : student);
  const answers = spec.chips.map((_, i) => picked[i]).filter(Boolean);
  const send = async (skip) => {
    setBusy(true); setError('');
    try {
      // The server only accepts a rating for a ticked feature; send the queued
      // events that tick it first (the paywall end screen comes right after).
      await betaTracker.flush();
      await submitBetaMicro(skip ? { id, action: 'skip' } : { id, action: 'answer', rating: rating || null, answers, note: note.trim() });
      setSent(!skip); onDone?.(skip ? 'skip' : 'answer');
    } catch (err) {
      // 409: already answered on another tab/device — nothing left to do.
      if (err.status === 409) { onDone?.('skip'); return; }
      setError(err.message || 'Hodnocení se nepodařilo uložit.');
    } finally { setBusy(false); }
  };
  if (sent) return <p className="beta-quick-thanks" role="status"><Check size={16} aria-hidden="true" /> {t('Díky! Pomáhá nám to.', 'Děkujeme! Pomáhá nám to.')}</p>;
  return <div className="beta-quick">
    <p className="beta-quick-title">{title || t(`Jak hodnotíš ${spec.label}?`, `Jak hodnotíte ${spec.label}?`)}</p>
    <div className="beta-quick-stars" role="radiogroup" aria-label="Hodnocení od 1 do 5">
      {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} z 5`}
        className={`beta-quick-star${n <= rating ? ' is-on' : ''}`} onClick={() => setRating(n)}><Star size={22} aria-hidden="true" /></button>)}
    </div>
    {spec.chips.map(([student, adult, options], i) => <div key={student} className="beta-quick-q">
      <p>{t(student, adult)}</p>
      <div className="beta-kind-chips" role="group" aria-label={t(student, adult)}>
        {options.map((option) => <button key={option} type="button" className="ss-btn ss-btn-secondary ss-btn-sm" aria-pressed={picked[i] === option}
          onClick={() => setPicked((prev) => ({ ...prev, [i]: prev[i] === option ? undefined : option }))}>{option}</button>)}
      </div>
    </div>)}
    <input className="ss-input" maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Chceš něco dodat? (nepovinné)', 'Chcete něco dodat? (nepovinné)')} aria-label="Poznámka (nepovinné)" />
    {error && <p role="alert" className="ss-caption">{error}</p>}
    <div className="beta-quick-actions">
      <button type="button" className="ss-btn ss-btn-secondary ss-btn-sm" disabled={busy} onClick={() => send(true)}>Přeskočit</button>
      <button type="button" className="ss-btn ss-btn-primary ss-btn-sm" disabled={busy || (!rating && !answers.length && !note.trim())} onClick={() => send(false)}>{busy ? 'Ukládám…' : 'Odeslat'}</button>
    </div>
  </div>;
}

/**
 * Small reward when a checklist item ticks: an animated check, the new count,
 * and (once per feature) the quick rating. It waits until the tester has left
 * the page they were using, so it never interrupts the feature itself.
 */
export default function BetaReward({ beta, enabled, onRefresh }) {
  const location = useLocation();
  const previous = useRef(null);
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const parent = ['rodic', 'ucitel'].includes(beta?.role);

  useEffect(() => {
    const checklist = beta?.checklist;
    if (!checklist) return;
    // First read only remembers the state: boxes ticked earlier are not news.
    if (previous.current) {
      const fresh = tasks.map(([id]) => id).filter((id) => checklist[id] && !previous.current[id]);
      if (fresh.length) setQueue((q) => [...q, ...fresh.filter((id) => !q.includes(id))]);
    }
    previous.current = checklist;
  }, [beta?.checklist]);

  const path = location.pathname;
  useEffect(() => {
    if (current || !enabled || path.startsWith('/onboarding/')) return;
    const next = queue.find((id) => !ON_PAGE[id](path));
    if (!next) return;
    setQueue((q) => q.filter((id) => id !== next));
    setCurrent({ id: next, ask: !beta?.micro_asked?.[next]?.done });
  }, [queue, current, enabled, path, beta?.micro_asked]);

  // Without a question the card is just a pat on the back and leaves by itself.
  useEffect(() => {
    if (!current || current.ask) return undefined;
    const timer = setTimeout(() => setCurrent(null), 4500);
    return () => clearTimeout(timer);
  }, [current]);

  useEffect(() => {
    if (!current) return undefined;
    const escape = (event) => { if (event.key === 'Escape') setCurrent(null); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [current]);

  if (!current || !beta) return null;
  const label = tasks.find(([id]) => id === current.id)?.[1] || '';
  const done = doneCount(beta.checklist), total = tasks.length;
  return <aside className="beta-reward" data-beta-tools role="dialog" aria-label="Vyzkoušená funkce">
    <button type="button" className="beta-reward-close" aria-label="Zavřít" onClick={() => setCurrent(null)}><X size={18} aria-hidden="true" /></button>
    <div className="beta-reward-head">
      <span className="beta-reward-check" aria-hidden="true"><Check size={22} strokeWidth={3} /></span>
      <div>
        <p className="beta-reward-eyebrow">Vyzkoušeno</p>
        <p className="beta-reward-title">{label}</p>
      </div>
    </div>
    <div className="beta-reward-progress">
      <div className="beta-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label="Vyzkoušené funkce">
        <span style={{ '--to': `${100 * done / total}%`, '--from': `${100 * Math.max(0, done - 1) / total}%` }} />
      </div>
      <span className="ss-caption">{done} z {total}{done === total ? (parent ? ' — máte vše!' : ' — máš vše!') : ''}</span>
    </div>
    {current.ask && <QuickFeedback id={current.id} parent={parent} onDone={(how) => {
      void onRefresh?.();
      setTimeout(() => setCurrent(null), how === 'answer' ? 1400 : 0);
    }} />}
  </aside>;
}
