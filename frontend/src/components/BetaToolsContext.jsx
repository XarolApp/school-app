import { createContext, useContext } from 'react';

export const BetaToolsContext = createContext(null);

export function useBetaTools() {
  const context = useContext(BetaToolsContext);
  if (!context) throw new Error('useBetaTools must be used inside BetaTools');
  return context;
}
