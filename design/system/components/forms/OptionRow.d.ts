import * as React from 'react';

/**
 * A questionnaire answer choice. Selected state is a Primary-subtle wash with a
 * 1.5px Primary border — never a solid Primary fill, which would read as a button.
 */
export interface OptionRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  selected?: boolean;
  /** Square marker (multi-select) instead of a round one. @default false */
  multiple?: boolean;
  onSelect?: (e: React.SyntheticEvent) => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export function OptionRow(props: OptionRowProps): JSX.Element;
