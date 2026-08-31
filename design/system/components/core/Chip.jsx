import React from 'react';

export function Chip({ children, icon, onRemove, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: 'var(--neutral)', color: 'var(--secondary)', fontFamily: 'var(--font-sans)',
      fontSize: 'var(--fs-data-sm)', fontWeight: 500, lineHeight: 'var(--lh-data-sm)',
      fontFeatureSettings: "'tnum' 1", borderRadius: 'var(--radius-chip)', padding: '5px 10px', ...style }}>
      {icon}{children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Odebrat"
          style={{ display: 'flex', border: 0, background: 'transparent', padding: 0, marginLeft: 2, cursor: 'pointer', color: 'inherit' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      )}
    </span>
  );
}
