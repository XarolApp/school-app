import React from 'react';

export function Card({ as: Tag = 'div', raised = true, padding = 'var(--space-lg)', interactive = false, style, children, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <Tag onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ background: 'var(--surface-card)', borderRadius: 'var(--radius-card)', padding,
        boxShadow: raised ? 'var(--shadow-card)' : 'none',
        border: raised ? 'none' : 'var(--border-width) solid var(--border)',
        transform: interactive && hover ? 'translateY(-1px)' : 'none',
        transition: 'transform var(--dur-state) var(--ease-out), box-shadow var(--dur-state) var(--ease-out)',
        cursor: interactive ? 'pointer' : undefined, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
