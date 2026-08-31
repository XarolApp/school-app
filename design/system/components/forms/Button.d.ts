import * as React from 'react';

/**
 * Primary and secondary actions. Sentence case labels only — never uppercase.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Solid terracotta fill, or Surface fill with a terracotta label. @default "primary" */
  variant?: 'primary' | 'secondary';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
}
export function Button(props: ButtonProps): JSX.Element;
