import React from 'react';

export function OptionRow({ label, description, selected = false, multiple = false, onSelect, style, children }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div role={multiple ? 'checkbox' : 'radio'} aria-checked={selected} tabIndex={0}
      onClick={onSelect} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect && onSelect(e); } }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-md)', cursor: 'pointer',
        background: selected ? 'var(--primary-subtle)' : (hover ? 'var(--neutral)' : 'var(--surface)'),
        border: selected ? 'var(--border-width-active) solid var(--primary)' : 'var(--border-width) solid var(--border)',
        borderRadius: 'var(--radius-input)', padding: selected ? '15.5px' : 'var(--space-md)',
        transition: 'background-color var(--dur-state) var(--ease-out)', ...style }}>
      <span aria-hidden="true" style={{ flex: '0 0 auto', width: 22, height: 22, marginTop: 1,
        borderRadius: multiple ? 'var(--radius-input)' : 'var(--radius-full)',
        background: selected ? 'var(--primary)' : 'var(--surface)',
        border: selected ? 'none' : 'var(--border-width-active) solid var(--border-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && (multiple
          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6.5 9.5 17.5 4.5 12.5" /></svg>
          : <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--surface)' }} />)}
      </span>
      <span style={{ minWidth: 0, fontFamily: 'var(--font-sans)' }}>
        <span style={{ display: 'block', fontSize: 'var(--fs-body-md)', lineHeight: 'var(--lh-body-md)', color: 'var(--text-body)', fontWeight: selected ? 600 : 400 }}>{label}</span>
        {description && <span style={{ display: 'block', marginTop: 2, fontSize: 'var(--fs-body-sm)', lineHeight: 'var(--lh-body-sm)', color: 'var(--text-muted)' }}>{description}</span>}
        {children}
      </span>
    </div>
  );
}
