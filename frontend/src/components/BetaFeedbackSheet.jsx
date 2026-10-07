import { useEffect, useRef, useState } from 'react';
import { MessageSquare, SquareMousePointer, Pencil, ImageOff, Check } from 'lucide-react';
import Modal from './Modal';
import { BetaChecklist } from './BetaInstructions';
import { submitBetaFeedback, uploadBetaScreenshot } from '../api';
import { captureBetaScreenshot, elementSelector, publicElementText } from '../lib/betaCapture';

const kinds = [['bug','Chyba'],['navrh','Návrh'],['funkce','Nová funkce'],['text','Text/údaj'],['chvala','Pochvala']];
const statuses = { nove: 'Nová', precteno: 'Přečteno', vyreseno: 'Vyřešeno', neudelame: 'Neuděláme' };
export default function BetaFeedbackSheet({ open, onClose, pageUrl, beta, onSuccess, programActive, requestId }) {
  const [mode,setMode] = useState('general'), [phase,setPhase] = useState('form');
  const [message,setMessage] = useState(''), [kind,setKind] = useState('obecne'), [selection,setSelection] = useState(null);
  const [screenshot,setScreenshot] = useState(null), [error,setError] = useState(''), [busy,setBusy] = useState(false), [success,setSuccess] = useState(null);
  const [outline,setOutline] = useState(null), [choices,setChoices] = useState([]), [chosen,setChosen] = useState(0);
  const selectedElement = useRef(null), choicesRef = useRef([]), mounted = useRef(true);
  const parent = ['rodic','ucitel'].includes(beta?.role);
  const voice = (student,adult) => parent ? adult : student;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setSuccess(null); }, [requestId]);
  useEffect(() => { if (!open) setPhase('form'); }, [open]);
  useEffect(() => () => { if (screenshot) URL.revokeObjectURL(screenshot.url); }, [screenshot]);
  const eligible = (element) => element instanceof HTMLElement && !element.closest('[data-beta-tools],[data-private],input,textarea,select') &&
    !element.querySelector('input,textarea,[data-private]') && !['BODY','HTML','SCRIPT','STYLE'].includes(element.tagName);
  const pick = (element) => {
    if (!eligible(element)) return;
    if (mode === 'text' && (!element.matches('h1,h2,h3,h4,p,span,small,strong,em,label,li') || element.children.length || !element.textContent.trim())) {
      setError(voice('Vyber samotný krátký text, třeba nadpis.', 'Vyberte samotný krátký text, třeba nadpis.')); return;
    }
    const rect = element.getBoundingClientRect();
    selectedElement.current = element;
    setSelection({ selector: elementSelector(element), element_text: publicElementText(element),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      viewport: { width: innerWidth, height: innerHeight, scroll_x: scrollX, scroll_y: scrollY },
      ...(mode === 'text' ? { text_before: publicElementText(element,2000) } : {}) });
    setOutline(null); setError(''); setPhase(mode === 'text' ? 'edit' : 'form');
  };
  const pickRef = useRef(pick); pickRef.current = pick;
  useEffect(() => {
    if (!open || phase !== 'pick') return;
    choicesRef.current = [...document.querySelectorAll('h1,h2,h3,p,button,a')].filter(eligible).filter((e) => publicElementText(e)).slice(0,100);
    setChoices(choicesRef.current.map((element) => publicElementText(element))); setChosen(0);
    const move = (event) => { const e = event.target.closest('svg')?.parentElement || event.target; if (eligible(e)) setOutline(e.getBoundingClientRect().toJSON()); };
    const click = (event) => {
      if (event.target.closest('[data-beta-tools]')) return;
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      pickRef.current(event.target.closest('svg')?.parentElement || event.target);
    };
    const escape = (event) => { if (event.key === 'Escape') { setPhase('form'); setOutline(null); } };
    document.addEventListener('pointermove',move); document.addEventListener('click',click,true); document.addEventListener('keydown',escape);
    return () => { document.removeEventListener('pointermove',move); document.removeEventListener('click',click,true); document.removeEventListener('keydown',escape); };
  }, [phase,open]);
  useEffect(() => {
    if (!open || phase !== 'edit' || !selectedElement.current) return;
    const element = selectedElement.current, original = element.textContent;
    const editable = element.getAttribute('contenteditable'), style = element.getAttribute('style');
    element.contentEditable = 'true'; element.style.outline = '2px solid var(--acc)'; element.focus();
    const escape = (event) => { if (event.key === 'Escape') setPhase('form'); };
    document.addEventListener('keydown',escape);
    return () => {
      document.removeEventListener('keydown',escape); element.textContent = original;
      if (editable == null) element.removeAttribute('contenteditable'); else element.setAttribute('contenteditable',editable);
      if (style == null) element.removeAttribute('style'); else element.setAttribute('style',style);
    };
  }, [phase,open]);
  const chooseMode = (next) => {
    setMode(next); setSelection(null); setScreenshot(null); setSuccess(null); setError('');
    if (next !== 'general') setPhase('pick');
  };
  const capture = async () => {
    setBusy(true); setError(''); setPhase('capture');
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const blob = await captureBetaScreenshot();
      if (mounted.current) setScreenshot({ blob, url: URL.createObjectURL(blob) });
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { if (mounted.current) { setPhase('form'); setBusy(false); } }
  };
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const screenshotPath = screenshot ? await uploadBetaScreenshot(screenshot.blob) : null;
      const result = await submitBetaFeedback({ pageUrl, message, kind, ...selection, ...(screenshotPath ? { screenshot_path: screenshotPath } : {}) });
      if (!mounted.current) return;
      setSuccess(result.testerAccessUntil); setMessage(''); setSelection(null); setScreenshot(null);
      void onSuccess(result);
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <>
    {open && phase === 'pick' && <div data-beta-tools>
      <div className="beta-picker-dim" />{outline && <div className="beta-picker-outline" style={{ left: outline.x, top: outline.y, width: outline.width, height: outline.height }} />}
      <div className="beta-picker-toolbar" role="region" aria-label="Výběr místa">
        <p role="status">{voice('Klikni nebo klepni na místo. Soukromá pole nelze vybrat.', 'Klikněte nebo klepněte na místo. Soukromá pole nelze vybrat.')}</p>
        <label>Prvek na stránce<select className="input" value={chosen} onChange={(e) => setChosen(Number(e.target.value))}>{choices.map((text,i) => <option key={i} value={i}>{text}</option>)}</select></label>
        <button className="ss-btn ss-btn-primary" onClick={() => pickRef.current(choicesRef.current[chosen])}>Vybrat prvek</button>
        <button className="ss-btn ss-btn-secondary" onClick={() => { setPhase('form'); setOutline(null); }}>Zrušit výběr</button>{error && <p role="alert">{error}</p>}
      </div>
    </div>}
    {open && phase === 'edit' && <div className="beta-picker-toolbar" data-beta-tools>
      <p role="status">{voice('Uprav označený text přímo na stránce.', 'Upravte označený text přímo na stránce.')}</p>
      <button className="ss-btn ss-btn-primary" onClick={() => { setSelection((s) => ({ ...s, text_after: publicElementText(selectedElement.current,2000) })); setPhase('form'); }}>Uložit návrh textu</button>
      <button className="ss-btn ss-btn-secondary" onClick={() => setPhase('form')}>Zrušit úpravu</button>
    </div>}
    {open && phase === 'capture' && <div className="beta-picker-toolbar" role="status" data-beta-tools>Připravuji snímek se zakrytými poli…</div>}
    <div data-beta-tools><Modal open={open && phase === 'form'} title="Zpětná vazba" onDismiss={onClose} busy={busy} className="beta-sheet">
      {success ? <div className="stack" role="status"><Check size={28} /><h3 className="ss-headline-md">Díky za zprávu</h3><p>Přístup je obnoven do {new Date(success).toLocaleString('cs-CZ',{timeZone:'Europe/Prague'})}.</p><button className="ss-btn ss-btn-primary" onClick={() => { setSuccess(null); onClose(); }}>Pokračovat</button></div> : <form className="stack beta-feedback-form" onSubmit={submit}>
        <div className="beta-modes">{[['general',MessageSquare,'Obecně k webu'],['mark',SquareMousePointer,'Označit místo'],['text',Pencil,'Navrhnout změnu textu']].map(([id,Icon,label]) => <button type="button" key={id} className={`ss-btn ss-btn-secondary${mode === id ? ' is-selected' : ''}`} onClick={() => chooseMode(id)}><Icon size={18} />{label}</button>)}</div>
        {selection && <div className="notice"><p className="notice-title">Označené místo</p><p className="notice-text">{selection.element_text}</p>{selection.text_after && <p className="notice-text">{selection.text_before} → <strong>{selection.text_after}</strong></p>}
          {mode === 'mark' && !screenshot && <button type="button" className="ss-btn ss-btn-secondary" onClick={capture} disabled={busy}>Připravit snímek k odeslání</button>}</div>}
        {screenshot && <figure className="beta-screenshot-preview"><img src={screenshot.url} alt="Náhled snímku stránky se zakrytými soukromými poli" /><figcaption>Před odesláním lze snímek odebrat.</figcaption><button type="button" className="ss-btn ss-btn-secondary" onClick={() => setScreenshot(null)}><ImageOff size={16} />Odebrat snímek</button></figure>}
        <fieldset className="beta-role-fieldset"><legend className="field-label">Typ zprávy</legend><div className="beta-kind-chips">{kinds.map(([id,label]) => <button type="button" key={id} aria-pressed={kind === id} className={`ss-btn ss-btn-secondary${kind === id ? ' is-selected' : ''}`} onClick={() => setKind(id)}>{label}</button>)}</div></fieldset>
        <label className="field"><span className="field-label">{voice('Co bys chtěl(a) říct?', 'Co byste chtěli říct?')}</span><textarea className="input beta-feedback-message" required minLength={10} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} /><span className="field-hint">Alespoň 10 znaků. Bez osobních údajů.</span></label>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="ss-dialog-actions"><button type="button" className="ss-btn ss-btn-secondary" onClick={onClose} disabled={busy}>Zavřít</button><button type="submit" className="ss-btn ss-btn-primary" disabled={busy || message.trim().length < 10 || !programActive || mode === 'text' && !selection?.text_after}>{busy ? 'Odesílám…' : 'Odeslat zpětnou vazbu'}</button></div>
      </form>}
      <details><summary className="ss-headline-sm">Moje vyzkoušené funkce</summary><BetaChecklist checklist={beta?.checklist} onNavigate={onClose} /></details>
      <details><summary className="ss-headline-sm">Moje zpětné vazby ({beta?.feedback?.length || 0})</summary><div className="beta-my-feedback">{(beta?.feedback || []).map((f) => <article key={f.id}><p className="ss-data-sm">{statuses[f.status] || f.status} · {new Date(f.created_at).toLocaleDateString('cs-CZ')}</p><p>{f.message}</p>{f.admin_reply && <blockquote><strong>Odpověď týmu</strong><p>{f.admin_reply}</p></blockquote>}</article>)}</div></details>
    </Modal></div>
  </>;
}
