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

  useEffect(() => {
    setBody(initialBody);
  }, [schoolId, initialBody]);

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const handleChange = (e) => {
    const next = e.target.value.slice(0, 2000);
    setBody(next);
    setStatus('saving');
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        await saveNote(schoolId, next);
        setStatus('saved');
      } catch {
        setStatus('idle');
      }
    }, SAVE_DELAY_MS);
  };

  return (
    <div className="dp-note">
      <div className="ss-label-caps">Moje poznámka</div>
      <textarea
        className="dp-note-textarea"
        value={body}
        onChange={handleChange}
        placeholder="Napiš si sem, co tě u téhle školy napadlo — z dne otevřených dveří, od kamarádů, cokoliv."
        maxLength={2000}
        rows={3}
      />
      <div className="dp-note-status">{status === 'saving' ? 'Ukládám…' : status === 'saved' ? 'Uloženo' : ''}</div>
    </div>
  );
}

export default NoteEditor;
