import React from 'react';

export function Checkbox({ label, checked = false, disabled = false, onChange, style }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-sm)',
      fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-body-md)', color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, ...style }}>
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked, e)}
        style={{ position: 'absolute', opacity: 0, width: 22, height: 22, margin: 0, cursor: 'inherit' }} />
      <span aria-hidden="true" style={{ width: 22, height: 22, flex: '0 0 auto', borderRadius: 'var(--radius-input)',
        background: checked ? 'var(--primary)' : 'var(--surface)',
        border: checked ? 'none' : 'var(--border-width-active) solid var(--border-strong)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background-color var(--dur-state) var(--ease-out)' }}>
        {checked && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6.5 9.5 17.5 4.5 12.5" /></svg>}
      </span>
      {label}
    </label>
  );
}
