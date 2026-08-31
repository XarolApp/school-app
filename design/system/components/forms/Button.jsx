import React from 'react';

const base = {
  fontFamily: 'var(--font-sans)', fontWeight: 600, lineHeight: 1,
  borderRadius: 'var(--radius-button)', border: 'var(--border-width) solid transparent',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  gap: 'var(--space-sm)', cursor: 'pointer', textAlign: 'center',
  transition: 'background-color var(--dur-state) var(--ease-out), color var(--dur-state) var(--ease-out), border-color var(--dur-state) var(--ease-out)',
};
const sizes = {
  sm: { fontSize: 'var(--fs-body-sm)', padding: '8px 14px' },
  md: { fontSize: 'var(--fs-label-md)', padding: '13px var(--space-md)' },
  lg: { fontSize: 'var(--fs-body-lg)', padding: '16px var(--space-lg)' },
};

export function Button({ variant = 'primary', size = 'md', disabled = false, fullWidth = false, iconLeft, iconRight, style, children, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const isPrimary = variant === 'primary';
  const skin = isPrimary
    ? { background: hover && !disabled ? 'var(--primary-strong)' : 'var(--primary)', color: 'var(--text-on-primary)' }
    : { background: hover && !disabled ? 'var(--neutral)' : 'var(--surface)', color: hover && !disabled ? 'var(--primary-strong)' : 'var(--primary)', borderColor: hover && !disabled ? 'var(--border-strong)' : 'transparent' };
  return (
    <button type="button" disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ ...base, ...sizes[size], ...skin, width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
      {...rest}>
      {iconLeft}{children}{iconRight}
    </button>
  );
}
