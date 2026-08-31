import * as React from 'react';

/** Metadata, not a call to action. Neutral fill, Secondary text, tabular figures. */
export interface ChipProps {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  /** Renders a dismiss affordance — for active filters. */
  onRemove?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export function Chip(props: ChipProps): JSX.Element;
