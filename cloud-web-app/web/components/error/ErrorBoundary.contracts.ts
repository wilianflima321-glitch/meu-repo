import type { ErrorInfo, ReactNode } from 'react';

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: Error;
  errorInfo?: ErrorInfo;
  componentStack?: string;
  context?: Record<string, unknown>;
  userAgent?: string;
  url?: string;
  userId?: string;
}

export interface ErrorBoundaryContextValue {
  reportError: (error: Error, context?: Record<string, unknown>) => void;
  clearError: () => void;
  errors: ErrorReport[];
  lastError: ErrorReport | null;
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  showDetails?: boolean;
  level?: 'critical' | 'warning' | 'info';
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}
