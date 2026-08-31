import React from 'react';

const tick = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6.5 9.5 17.5 4.5 12.5" /></svg>;
const dash = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>;

/* Criteria the student supplied, reflected back — never a headline score, never a
   verdict on the person. Every string is about the school. */
export function MatchIndicator({ label, criteria = [], style }) {
  const met = criteria.filter((c) => c.met !== false).length;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', fontFamily: 'var(--font-sans)', ...style }}>
      <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '6px',
        background: 'var(--tertiary-subtle)', color: 'var(--tertiary)', borderRadius: 'var(--radius-full)',
        padding: '5px 12px', fontSize: 'var(--fs-label-caps)', fontWeight: 600,
        letterSpacing: 'var(--ls-label-caps)', textTransform: 'uppercase' }}>
        {tick}{label || 'Splňuje ' + met + ' z ' + criteria.length + ' vašich kritérií'}
      </span>
      {criteria.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
          {criteria.map((c, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)',
              fontSize: 'var(--fs-body-sm)', lineHeight: 'var(--lh-body-sm)',
              color: c.met === false ? 'var(--text-faint)' : 'var(--text-body)' }}>
              <span style={{ marginTop: 3, color: c.met === false ? 'var(--on-surface-faint)' : 'var(--tertiary)' }}>{c.met === false ? dash : tick}</span>
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
