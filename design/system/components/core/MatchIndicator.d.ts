import * as React from 'react';

export interface MatchCriterion {
  /** Written about the SCHOOL, never about the student. */
  text: React.ReactNode;
  /** @default true */
  met?: boolean;
}

/**
 * Marks match strength by reflecting the student's own stated criteria back at
 * them — met and unmet — rather than a headline score. Tertiary (moss) is
 * reserved exclusively for this component.
 */
export interface MatchIndicatorProps {
  /** Override the auto-generated "splňuje N z M" pill label. */
  label?: React.ReactNode;
  criteria?: MatchCriterion[];
  style?: React.CSSProperties;
}
export function MatchIndicator(props: MatchIndicatorProps): JSX.Element;
