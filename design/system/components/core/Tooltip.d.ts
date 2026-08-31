import * as React from 'react';

/** The one colour inversion in the system: On-surface fill, Surface text. */
export interface TooltipProps {
  /** Genuinely optional supplementary detail only. */
  content: React.ReactNode;
  /** @default "top" */
  placement?: 'top' | 'bottom';
  children?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Tooltip(props: TooltipProps): JSX.Element;
