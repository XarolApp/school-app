import * as React from 'react';

/** 1px hairline rule. Divides groups; never used to frame a card as a box. */
export interface DividerProps {
  /** Border-strong instead of Border — separates unrelated groups. @default false */
  strong?: boolean;
  vertical?: boolean;
  /** Margin along the divider's axis. @default "var(--space-md)" */
  spacing?: string;
  style?: React.CSSProperties;
}
export function Divider(props: DividerProps): JSX.Element;
