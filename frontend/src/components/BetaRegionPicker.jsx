import { useEffect, useRef, useState } from 'react';

const MIN_SIDE = 16;

const toRect = (a, b) => ({
  x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y),
});

/**
 * Full-screen "drag a box like a screenshot tool". Coordinates are viewport
 * pixels; `onDone` receives the rectangle once the pointer is released. Works
 * with mouse, pen and touch (the overlay owns the gesture, so the page does not
 * scroll underneath). Escape or "Zrušit" cancels.
 */
export default function BetaRegionPicker({ onDone, onCancel, parent = false }) {
  const [start, setStart] = useState(null);
  const [current, setCurrent] = useState(null);
  const [tooSmall, setTooSmall] = useState(false);
  const overlay = useRef(null);

  useEffect(() => {
    const escape = (event) => { if (event.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onCancel]);

  const point = (event) => ({
    x: Math.min(Math.max(event.clientX, 0), window.innerWidth),
    y: Math.min(Math.max(event.clientY, 0), window.innerHeight),
  });
  const down = (event) => {
    if (event.target.closest('[data-region-toolbar]')) return;
    overlay.current?.setPointerCapture?.(event.pointerId);
    const p = point(event);
    setStart(p); setCurrent(p); setTooSmall(false);
  };
  const move = (event) => { if (start) setCurrent(point(event)); };
  const up = (event) => {
    if (!start) return;
    const rect = toRect(start, point(event));
    setStart(null); setCurrent(null);
    if (rect.width < MIN_SIDE || rect.height < MIN_SIDE) { setTooSmall(true); return; }
    onDone(rect);
  };

  const rect = start && current ? toRect(start, current) : null;
  return (
    <div
      ref={overlay} data-beta-tools className={`beta-region${rect ? ' is-drawing' : ''}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { setStart(null); setCurrent(null); }}
    >
      {rect && <div className="beta-region-box" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />}
      <div className="beta-region-toolbar" data-region-toolbar role="region" aria-label="Výběr místa">
        <p role="status">
          {tooSmall
            ? (parent ? 'Označte trochu větší oblast.' : 'Označ trochu větší oblast.')
            : (parent ? 'Tažením myši nebo prstu označte místo, ke kterému chcete něco říct.' : 'Tažením myši nebo prstu označ místo, ke kterému chceš něco říct.')}
        </p>
        <button type="button" className="ss-btn ss-btn-secondary" onClick={onCancel}>Zrušit</button>
      </div>
    </div>
  );
}
