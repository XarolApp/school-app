import * as React from 'react';

/** Single-line text field. Error state is always fill + icon + written message, never colour alone. */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'style'> {
  label?: React.ReactNode;
  /** Optional supplementary detail below the field. */
  hint?: React.ReactNode;
  /** Written error message — presence switches the field to its error state. */
  error?: React.ReactNode;
  /** Leading glyph, e.g. a search icon. */
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}
export function Input(props: InputProps): JSX.Element;
