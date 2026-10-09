import { useEffect, useRef, useState } from 'react';
import { MessageSquare, SquareMousePointer, Pencil, ImageOff, Check } from 'lucide-react';
import Modal from './Modal';
import BetaRegionPicker from './BetaRegionPicker';
import { BetaChecklist } from './BetaInstructions';
import { markBetaRepliesRead, submitBetaFeedback, uploadBetaScreenshot } from '../api';
import BetaClosingQuestionnaire from './BetaClosingQuestionnaire';
import { captureBetaScreenshot, elementSelector, publicElementText } from '../lib/betaCapture';
import { useDraft } from '../lib/useDraft';
import { genderedCopy, useGender } from '../lib/gender';

const kinds = [['bug','Chyba'],['navrh','Návrh'],['funkce','Nová funkce'],['text','Chybný text/údaj'],['neprehledne','Nepřehledné'],['chvala','Pochvala']];
const statuses = { nove: 'Nová', precteno: 'Přečteno', vyreseno: 'Vyřešeno', neudelame: 'Neuděláme' };
const modes = [['general',MessageSquare,'Obecně k webu'],['mark',SquareMousePointer,'Označit místo'],['text',Pencil,'Navrhnout změnu textu']];

const nextFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const eligible = (element) => element instanceof HTMLElement && !element.closest('[data-beta-tools],[data-private],input,textarea,select') &&
  !element.querySelector('input,textarea,[data-private]') && !['BODY','HTML','SCRIPT','STYLE'].includes(element.tagName);
const viewportNow = () => ({ width: innerWidth, height: innerHeight, scroll_x: scrollX, scroll_y: scrollY });

export default function BetaFeedbackSheet({ open, onClose, pageUrl, beta, onSuccess, programActive, requestId, focusReplies = false, onRepliesRead }) {
  const gender = useGender();
  const [mode,setMode] = useState('general'), [phase,setPhase] = useState('form');
  // The typed message survives a reload or a switch to another tab.
  // Quick star ratings are not "messages"; the list shows what the tester wrote.
  const written = (beta?.feedback || []).filter((f) => f.source !== 'micro');
  const [message,setMessage,clearMessage] = useDraft('snm.beta.feedback.message',''), [kind,setKind] = useState('obecne'), [selection,setSelection] = useState(null);
  const [screenshot,setScreenshot] = useState(null), [error,setError] = useState(''), [busy,setBusy] = useState(false), [success,setSuccess] = useState(false);
  const [reviewBusy,setReviewBusy] = useState(false), [reviewSaved,setReviewSaved] = useState(false);
  const [inboxError,setInboxError] = useState('');
  const [outline,setOutline] = useState(null);
  const selectedElement = useRef(null), mounted = useRef(true), feedbackInboxRef = useRef(null);
  const parent = ['rodic','ucitel'].includes(beta?.role);
  const voice = (student,adult) => parent ? adult : genderedCopy(student, gender);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setSuccess(false); }, [requestId]);
  useEffect(() => { if (!open) { setPhase('form'); setReviewBusy(false); setReviewSaved(false); setInboxError(''); } }, [open]);
  useEffect(() => () => { if (screenshot) URL.revokeObjectURL(screenshot.url); }, [screenshot]);
  useEffect(() => {
    if (!open || !focusReplies) return undefined;
    const details = feedbackInboxRef.current;
    if (!details) return undefined;
    details.open = true;
    details.scrollIntoView({ block: 'nearest' });
    let current = true;
    setInboxError('');
    markBetaRepliesRead()
      .then(() => { if (current) return onRepliesRead?.(); })
      .catch(() => {
        if (current) setInboxError(parent
          ? 'Odpovědi se nepodařilo označit přečtenými. Zkuste to prosím znovu.'
          : 'Odpovědi se nepodařilo označit přečtenými. Zkus to prosím znovu.');
      });
    return () => { current = false; };
  }, [open, focusReplies, requestId, onRepliesRead, parent]);

  // "Navrhnout změnu textu": the tester clicks the text itself (no list of elements).
  const pickText = (element) => {
    if (!eligible(element)) return;
    if (!element.matches('h1,h2,h3,h4,p,span,small,strong,em,label,li') || element.children.length || !element.textContent.trim()) {
      setError(voice('Klikni přímo na krátký text, třeba nadpis.', 'Klikněte přímo na krátký text, třeba nadpis.')); return;
    }
    const rect = element.getBoundingClientRect();
    selectedElement.current = element;
    setSelection({ selector: elementSelector(element), element_text: publicElementText(element),
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, viewport: viewportNow(),
      text_before: publicElementText(element,2000) });
    setOutline(null); setError(''); setPhase('edit');
  };
  const pickRef = useRef(pickText); pickRef.current = pickText;
  useEffect(() => {
    if (!open || phase !== 'pick') return;
    const move = (event) => { const e = event.target.closest('svg')?.parentElement || event.target; if (eligible(e)) setOutline(e.getBoundingClientRect().toJSON()); else setOutline(null); };
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
    setMode(next); setSelection(null); setScreenshot(null); setSuccess(false); setError('');
    if (next === 'mark') setPhase('region');
    else if (next === 'text') setPhase('pick');
  };

  // The box is drawn; take the picture straight away so the tester just sees
  // "the marked place" and never has to ask for a screenshot.
  const finishRegion = async (rect) => {
    setBusy(true); setError(''); setPhase('capture');
    try {
      await nextFrames();
      const probe = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      const named = probe && eligible(probe) ? { selector: elementSelector(probe), element_text: publicElementText(probe) } : {};
      setSelection({ ...named, rect, viewport: viewportNow() });
      const blob = await captureBetaScreenshot();
      if (mounted.current) setScreenshot({ blob, url: URL.createObjectURL(blob), rect, viewport: viewportNow() });
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { if (mounted.current) { setPhase('form'); setBusy(false); } }
  };
  const resetMark = () => { setScreenshot(null); setSelection(null); setPhase('region'); };

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const screenshotPath = screenshot ? await uploadBetaScreenshot(screenshot.blob) : null;
      const result = await submitBetaFeedback({ pageUrl, message, kind, ...selection, ...(screenshotPath ? { screenshot_path: screenshotPath } : {}) });
      if (!mounted.current) return;
      // Sending feedback quietly renews the access; nothing to announce.
      setSuccess(true); setMessage(''); clearMessage(); setSelection(null); setScreenshot(null); setMode('general');
      void onSuccess(result);
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { if (mounted.current) setBusy(false); }
  };

  const needsMark = mode === 'mark' && !selection;
  return <>
    {open && phase === 'region' && <BetaRegionPicker parent={parent} onCancel={() => { setPhase('form'); setMode('general'); }} onDone={finishRegion} />}
    {open && phase === 'pick' && <div data-beta-tools>
      <div className="beta-picker-dim" />{outline && <div className="beta-picker-outline" style={{ left: outline.x, top: outline.y, width: outline.width, height: outline.height }} />}
      <div className="beta-picker-toolbar" role="region" aria-label="Výběr textu">
        <p role="status">{voice('Klikni na text, který chceš změnit.', 'Klikněte na text, který chcete změnit.')}</p>
        <button className="ss-btn ss-btn-secondary" onClick={() => { setPhase('form'); setOutline(null); setMode('general'); }}>Zrušit výběr</button>{error && <p role="alert">{error}</p>}
      </div>
    </div>}
    {open && phase === 'edit' && <div className="beta-picker-toolbar" data-beta-tools>
      <p role="status">{voice('Uprav označený text přímo na stránce.', 'Upravte označený text přímo na stránce.')}</p>
      <button className="ss-btn ss-btn-primary" onClick={() => { setSelection((s) => ({ ...s, text_after: publicElementText(selectedElement.current,2000) })); setPhase('form'); }}>Uložit návrh textu</button>
      <button className="ss-btn ss-btn-secondary" onClick={() => { setPhase('form'); setMode('general'); setSelection(null); }}>Zrušit úpravu</button>
    </div>}
    {open && phase === 'capture' && <div className="beta-picker-toolbar" role="status" data-beta-tools>Připravuji snímek se zakrytými poli…</div>}
    <div data-beta-tools><Modal open={open && (phase === 'form' || phase === 'review')} title={phase === 'review' ? 'Napsat recenzi webu' : 'Zpětná vazba'} onDismiss={phase === 'review' ? () => setPhase('form') : onClose} busy={busy || reviewBusy} className="beta-sheet">
      {phase === 'review' ? <BetaClosingQuestionnaire role={beta?.role} reviewOnly onBusyChange={setReviewBusy} onCancel={() => setPhase('form')} onDone={() => { setPhase('form'); setReviewSaved(true); void onSuccess?.(); }} /> : <>
      {reviewSaved && <p className="beta-read-note" role="status">{voice('Díky za recenzi webu. Zveřejníme ji jen s tvým samostatným souhlasem a po kontrole.', 'Děkujeme za recenzi webu. Zveřejníme ji jen s Vaším samostatným souhlasem a po kontrole.')}</p>}
      {success ? <div className="stack" role="status"><Check size={28} /><h3 className="ss-headline-md">Díky za zprávu</h3><p>{voice('Každá zpětná vazba nám pomáhá. Klidně pošli další.', 'Každá zpětná vazba nám pomáhá. Klidně pošlete další.')}</p><button className="ss-btn ss-btn-primary" onClick={() => { setSuccess(false); onClose(); }}>Pokračovat</button></div> : <form className="stack beta-feedback-form" onSubmit={submit}>
        <p className="field-hint">{voice('Napiš nám cokoli o celém webu, nebo označ konkrétní místo. Každá zpětná vazba pomáhá, i pozitivní.', 'Napište nám cokoli o celém webu, nebo označte konkrétní místo. Každá zpětná vazba pomáhá, i pozitivní.')}</p>
        <p className="beta-read-note"><Check size={16} aria-hidden="true" /> {voice('Každou zpětnou vazbu čteme. Na odpověď se můžeš podívat níže v „Moje zpětné vazby“.', 'Každou zpětnou vazbu čteme. Na odpověď se můžete podívat níže v „Moje zpětné vazby“.')}</p>
        <div className="beta-modes">{modes.map(([id,Icon,label]) => <button type="button" key={id} className={`ss-btn ss-btn-secondary${mode === id ? ' is-selected' : ''}`} onClick={() => chooseMode(id)}><Icon size={18} />{label}</button>)}</div>
        {mode === 'mark' && screenshot && <figure className="beta-screenshot-preview">
          <div className="beta-screenshot-frame">
            <img src={screenshot.url} alt="Náhled snímku stránky s označeným místem, soukromá pole jsou zakrytá" />
            <span className="beta-screenshot-region" aria-hidden="true" style={{
              left: `${100 * screenshot.rect.x / screenshot.viewport.width}%`, top: `${100 * screenshot.rect.y / screenshot.viewport.height}%`,
              width: `${100 * screenshot.rect.width / screenshot.viewport.width}%`, height: `${100 * screenshot.rect.height / screenshot.viewport.height}%`,
            }} />
          </div>
          <figcaption>Snímek k odeslání: označené místo je orámované. Soukromá pole jsou zakrytá.</figcaption>
          <div className="beta-screenshot-actions">
            <button type="button" className="ss-btn ss-btn-secondary" onClick={resetMark}>Označit znovu</button>
            <button type="button" className="ss-btn ss-btn-secondary" onClick={() => { setScreenshot(null); setSelection(null); setMode('general'); }}><ImageOff size={16} />Odebrat snímek</button>
          </div>
        </figure>}
        {mode === 'mark' && needsMark && <p className="field-hint">{voice('Klikni na „Označit místo“ a táhni po stránce.', 'Klikněte na „Označit místo“ a táhněte po stránce.')}</p>}
        {mode === 'text' && selection && <div className="notice"><p className="notice-title">Navržená změna textu</p>{selection.text_after ? <p className="notice-text">{selection.text_before} → <strong>{selection.text_after}</strong></p> : <p className="notice-text">{selection.element_text}</p>}</div>}
        <fieldset className="beta-role-fieldset"><legend className="field-label">Typ zprávy</legend><div className="beta-kind-chips">{kinds.map(([id,label]) => <button type="button" key={id} aria-pressed={kind === id} className={`ss-btn ss-btn-secondary${kind === id ? ' is-selected' : ''}`} onClick={() => setKind(kind === id ? 'obecne' : id)}>{label}</button>)}</div></fieldset>
        <label className="field"><span className="field-label">{voice('Co bys chtěl(a) říct?', 'Co byste chtěli říct?')}</span><textarea className="input beta-feedback-message" required minLength={10} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} /><span className="field-hint">Alespoň 10 znaků. Bez osobních údajů.</span></label>
        {error && <p className="notice notice-error" role="alert">{error}</p>}
        <div className="ss-dialog-actions"><button type="button" className="ss-btn ss-btn-secondary" onClick={onClose} disabled={busy}>Zavřít</button><button type="submit" className="ss-btn ss-btn-primary" disabled={busy || message.trim().length < 10 || !programActive || needsMark || mode === 'text' && !selection?.text_after}>{busy ? 'Odesílám…' : 'Odeslat zpětnou vazbu'}</button></div>
      </form>}
      <details><summary className="ss-headline-sm">Moje vyzkoušené funkce</summary><BetaChecklist checklist={beta?.checklist} onNavigate={onClose} /></details>
      <details ref={feedbackInboxRef}><summary className="ss-headline-sm">Moje zpětné vazby ({written.length})</summary><div className="beta-my-feedback">{written.map((f) => {
        const unread = f.admin_reply != null && (f.reply_read_at == null || (f.replied_at != null && Date.parse(f.reply_read_at) < Date.parse(f.replied_at)));
        return <article key={f.id} className={unread ? 'is-reply-unread' : ''}>
          <p className="ss-data-sm">{statuses[f.status] || f.status} · {new Date(f.created_at).toLocaleDateString('cs-CZ')}</p>
          <p>{f.message}</p>
          {f.admin_reply && <blockquote><strong>Odpověď týmu{unread && <span className="beta-reply-new"> · Nová</span>}</strong><p>{f.admin_reply}</p></blockquote>}
        </article>;
      })}</div>{inboxError && <p className="notice notice-error" role="alert">{inboxError}</p>}</details>
      <button type="button" className="ss-btn ss-btn-secondary" disabled={!programActive} onClick={() => { setReviewSaved(false); setPhase('review'); }}>Napsat recenzi webu</button>
      </>}
    </Modal></div>
  </>;
}
