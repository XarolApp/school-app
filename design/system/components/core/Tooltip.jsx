import React from 'react';

/* Optional supplementary detail ONLY. Anything that changes what a student should
   conclude about a school belongs inline, in the same viewport as the fact. */
export function Tooltip({ content, placement = 'top', children, style }) {
  const [open, setOpen] = React.useState(false);
  const pos = placement === 'bottom'
    ? { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }
    : { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' };
  return (
    <span style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} tabIndex={0}>
      {children}
      {open && (
        <span role="tooltip" style={{ position: 'absolute', ...pos, zIndex: 20, width: 'max-content', maxWidth: 260,
          background: 'var(--on-surface)', color: 'var(--surface)', fontFamily: 'var(--font-sans)',
          fontSize: 'var(--fs-body-sm)', lineHeight: 'var(--lh-body-sm)',
          borderRadius: 'var(--radius-input)', padding: 'var(--space-sm) 10px',
          boxShadow: 'var(--shadow-overlay)' }}>{content}</span>
      )}
    </span>
  );
}
