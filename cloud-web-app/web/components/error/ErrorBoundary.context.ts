import { createContext, useContext } from 'react';
import type { ErrorBoundaryContextValue } from './ErrorBoundary.contracts';

export const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(null);

export const useErrorBoundary = () => {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  return context;
};
