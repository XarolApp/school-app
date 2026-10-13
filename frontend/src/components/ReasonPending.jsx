import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SkLines } from './PageSkeleton';

/**
 * Placeholder where an AI explanation is being written. Shimmering lines at
 * once; after 3 s a progress bar too, so a long wait reads as progress, not a
 * hang. `queued` = waiting its turn behind another explanation.
 */
export default function ReasonPending({ queued = false, lines = 3, ahead = 0 }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (queued) return undefined;
    const timer = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(timer);
  }, [queued]);

  return (
    <div className={`reason-pending${queued ? ' is-queued' : ''}`} role="status" aria-live="polite">
      <span className="reason-pending-label">
        <Sparkles size={14} aria-hidden="true" />
        {queued
          ? `Vysvětlení se připravuje — napíšu ho hned po ${ahead > 1 ? 'školách' : 'škole'} nad ní`
          : 'Píšu vysvětlení k téhle škole…'}
      </span>
      {!queued && <SkLines count={lines} h={12} last="70%" />}
      {slow && (
        <span className="reason-pending-bar" aria-hidden="true">
          <span />
        </span>
      )}
    </div>
  );
}
