import React from 'react';

export function Divider({ strong = false, vertical = false, spacing = 'var(--space-md)', style }) {
  const color = strong ? 'var(--border-strong)' : 'var(--border)';
  return <div role="separator" aria-orientation={vertical ? 'vertical' : 'horizontal'}
    style={vertical
      ? { width: 1, alignSelf: 'stretch', background: color, margin: '0 ' + spacing, ...style }
      : { height: 1, width: '100%', background: color, margin: spacing + ' 0', ...style }} />;
}
