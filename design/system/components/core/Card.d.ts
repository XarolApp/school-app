import * as React from 'react';

/**
 * A genuinely discrete object — one school, one saved comparison. Not a default
 * wrapper for any group of facts.
 */
export interface CardProps {
  as?: keyof JSX.IntrinsicElements;
  /** Soft palette-tinted shadow. Set false for a hairline-bordered flat card. @default true */
  raised?: boolean;
  /** @default "var(--space-lg)" */
  padding?: string;
  /** Adds a 1px lift on hover. @default false */
  interactive?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function Card(props: CardProps): JSX.Element;
