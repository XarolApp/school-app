import React from 'react';

export function Input({ label, hint, error, icon, value, placeholder, id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const invalid = Boolean(error);
  const inputId = id || React.useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', fontFamily: 'var(--font-sans)' }}>
      {label && <label htmlFor={inputId} style={{ fontSize: 'var(--fs-label-md)', fontWeight: 600, color: 'var(--text-body)' }}>{label}</label>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)',
        background: invalid ? 'var(--error-subtle)' : 'var(--surface-input)',
        border: (focus || invalid) ? 'var(--border-width-active) solid ' + (invalid ? 'var(--error)' : 'var(--primary)') : 'var(--border-width) solid var(--border)',
        borderRadius: 'var(--radius-input)', padding: (focus || invalid) ? '9.5px 11.5px' : '10px 12px', ...style }}>
        {icon}
        <input id={inputId} value={value} placeholder={placeholder}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent',
            fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-body-md)', lineHeight: 'var(--lh-body-md)',
            color: invalid ? 'var(--error)' : 'var(--text-body)' }} {...rest} />
      </div>
      {invalid && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--error)', fontSize: 'var(--fs-body-sm)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v4.5M12 16h.01" /></svg>
          <span>{error}</span>
        </div>
      )}
      {!invalid && hint && <div style={{ color: 'var(--text-faint)', fontSize: 'var(--fs-caption)' }}>{hint}</div>}
    </div>
  );
}
