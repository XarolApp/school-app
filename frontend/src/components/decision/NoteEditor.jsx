import { useEffect, useRef, useState } from 'react';
import { saveNote } from '../../api';

const SAVE_DELAY_MS = 900;

/**
 * Decision journal / notes per school (feature-brainstorm.md §5). Autosaves
 * on a debounce rather than needing an explicit save button — this is a
 * scratchpad a student edits while thinking, not a form.
 */
function NoteEditor({ schoolId, initialBody = '' }) {
  const [body, setBody] = useState(initialBody);
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const timeoutRef = useRef(null);
  const pendingRef = useRef(null);
  const versionRef = useRef(0);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    pendingRef.current = null;
    versionRef.current += 1;
    setBody(initialBody);
    setStatus('idle');
  }, [schoolId, initialBody]);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      const pending = pendingRef.current;
      pendingRef.current = null;
      // Navigating away used to discard anything still inside the 900 ms
      // debounce. Start the request during cleanup; ordinary SPA navigation
      // does not cancel fetch, and onBlur handles the usual path even earlier.
      if (pending) void saveNote(pending.schoolId, pending.body).catch(() => {});
    };
  }, [schoolId]);

  const persist = async (pending) => {
    if (!pending || pendingRef.current?.version !== pending.version) return;
    pendingRef.current = null;
    try {
      await saveNote(pending.schoolId, pending.body);
      if (versionRef.current === pending.version) setStatus('saved');
    } catch {
      if (versionRef.current === pending.version) setStatus('idle');
    }
  };

  const flushPending = () => {
    clearTimeout(timeoutRef.current);
    const pending = pendingRef.current;
    if (pending) void persist(pending);
  };

  const handleChange = (e) => {
    const next = e.target.value.slice(0, 2000);
    const version = versionRef.current + 1;
    versionRef.current = version;
    setBody(next);
    setStatus('saving');
    clearTimeout(timeoutRef.current);
    const pending = { schoolId, body: next, version };
    pendingRef.current = pending;
    timeoutRef.current = setTimeout(() => persist(pending), SAVE_DELAY_MS);
  };

  return (
    <div className="dp-note">
      <div className="ss-label-caps">Moje poznámka</div>
      <textarea
        className="dp-note-textarea"
        value={body}
        onChange={handleChange}
        onBlur={flushPending}
        placeholder="Napiš si sem, co tě u téhle školy napadlo — z dne otevřených dveří, od kamarádů, cokoliv."
        maxLength={2000}
        rows={3}
      />
      <div className="dp-note-status">{status === 'saving' ? 'Ukládám…' : status === 'saved' ? 'Uloženo' : ''}</div>
    </div>
  );
}

export default NoteEditor;
