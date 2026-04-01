/**
 * Aethel Engine - Global Error Boundary
 *
 * Professional error handling with recovery, reporting, and user-friendly UI.
 * Captures React errors, async errors, and provides graceful degradation.
 */

'use client';

import React, {
  Component,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  type ErrorInfo,
} from 'react';
import { AlertTriangle, RefreshCw, Bug, Copy, ChevronDown, ChevronRight, X, Home } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Error Context
// ============================================================================

const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(null);

export const useErrorBoundary = () => {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  return context;
};

// ============================================================================
// Error Reporter Service
// ============================================================================

class ErrorReporterService {
  private static instance: ErrorReporterService;
  private errors: ErrorReport[] = [];
  private maxErrors = 100;
  private listeners: Set<(errors: ErrorReport[]) => void> = new Set();

  static getInstance(): ErrorReporterService {
    if (!ErrorReporterService.instance) {
      ErrorReporterService.instance = new ErrorReporterService();
    }
    return ErrorReporterService.instance;
  }

  report(error: Error, context?: Record<string, unknown>, errorInfo?: ErrorInfo): ErrorReport {
    const report: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      error,
      errorInfo,
      componentStack: errorInfo?.componentStack ?? undefined,
      context,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userId: this.getUserId(),
    };

    // Add to list
    this.errors.unshift(report);

    // Limit stored errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Notify listeners
    this.notifyListeners();

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔴 Error Report');
      console.error('Error:', error);
      console.log('Context:', context);
      console.log('Component Stack:', errorInfo?.componentStack);
      console.groupEnd();
    }

    // Send to backend (async, non-blocking)
    this.sendToBackend(report).catch(() => {});

    return report;
  }

  private getUserId(): string | undefined {
    try {
      const userData = localStorage.getItem('aethel_user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user.userId;
      }
    } catch {}
    return undefined;
  }

  private async sendToBackend(report: ErrorReport): Promise<void> {
    try {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...report,
          error: {
            name: report.error.name,
            message: report.error.message,
            stack: report.error.stack,
          },
        }),
      });
    } catch {
      // Silent fail - don't create infinite error loops
    }
  }

  getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  getLastError(): ErrorReport | null {
    return this.errors[0] || null;
  }

  clear(): void {
    this.errors = [];
    this.notifyListeners();
  }

  subscribe(listener: (errors: ErrorReport[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener([...this.errors]));
  }
}

export const errorReporter = ErrorReporterService.getInstance();

// ============================================================================
// Error Fallback UI
// ============================================================================

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  reset: () => void;
  showDetails?: boolean;
  level?: 'critical' | 'warning' | 'info';
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  reset,
  showDetails = true,
  level = 'critical',
}) => {
  const [showStack, setShowStack] = useState(false);
  const [copied, setCopied] = useState(false);

  const colors = {
    critical: {
      bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]',
      border: 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]',
      text: 'text-[var(--aethel-error-light)]',
      icon: 'text-[var(--aethel-error-light)]',
    },
    warning: {
      bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
      border: 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]',
      text: 'text-[var(--aethel-warning-light)]',
      icon: 'text-[var(--aethel-warning-light)]',
    },
    info: {
      bg: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
      border: 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]',
      text: 'text-[var(--aethel-info-light)]',
      icon: 'text-[var(--aethel-info-light)]',
    },
  }[level];

  const copyErrorDetails = useCallback(async () => {
    const details = `
Error: ${error.name}
Message: ${error.message}

Stack Trace:
${error.stack || 'No stack trace available'}

Component Stack:
${errorInfo?.componentStack || 'No component stack available'}

URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}
Timestamp: ${new Date().toISOString()}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}
    `.trim();

    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy to clipboard');
    }
  }, [error, errorInfo]);

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-[300px] p-8 ${colors.bg} border ${colors.border} rounded-lg`}
      role="alert"
      aria-live="assertive"
    >
      <AlertTriangle className={`w-16 h-16 mb-4 ${colors.icon}`} />

      <h2 className="text-xl font-semibold text-[var(--aethel-text-primary)] mb-2">
        {level === 'critical' ? 'Something went wrong' : 'An error occurred'}
      </h2>

      <p className={`text-center max-w-md mb-6 ${colors.text}`}>
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>

      <div className="flex gap-3 mb-6">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)] rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Try Again
        </button>

        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Reload Page
        </button>

        <a
          href="/"
          className="flex items-center gap-2 px-4 py-2 bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] rounded-lg transition-colors"
        >
          <Home size={16} />
          Go Home
        </a>
      </div>

      {showDetails && (
        <div className="w-full max-w-2xl">
          <button
            onClick={() => setShowStack(!showStack)}
            className="flex items-center gap-2 text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] text-sm mb-2"
            aria-expanded={showStack}
          >
            {showStack ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Bug size={14} />
            Technical Details
          </button>

          {showStack && (
            <div className="bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-secondary)] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-secondary)]">
                <span className="text-xs text-[var(--aethel-text-secondary)] font-mono">{error.name}</span>
                <button
                  onClick={copyErrorDetails}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-quaternary)] rounded"
                >
                  <Copy size={12} />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              <div className="p-3 overflow-x-auto">
                <pre className="text-xs text-[var(--aethel-error-light)] font-mono whitespace-pre-wrap">
                  {error.stack || 'No stack trace available'}
                </pre>

                {errorInfo?.componentStack && (
                  <>
                    <div className="border-t border-[var(--aethel-border-secondary)] my-3" />
                    <p className="text-xs text-[var(--aethel-text-secondary)] mb-2">Component Stack:</p>
                    <pre className="text-xs text-[var(--aethel-text-secondary)] font-mono whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Error Boundary Component
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Report error
    errorReporter.report(error, undefined, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    this.props.onReset?.();
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, showDetails, level } = this.props;

    if (hasError && error) {
      // Custom fallback
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          reset={this.reset}
          showDetails={showDetails}
          level={level}
        />
      );
    }

    return children;
  }
}

// ============================================================================
// Error Boundary Provider
// ============================================================================

export const ErrorBoundaryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [lastError, setLastError] = useState<ErrorReport | null>(null);

  const reportError = useCallback((error: Error, context?: Record<string, unknown>) => {
    const report = errorReporter.report(error, context);
    setErrors((prev) => [report, ...prev].slice(0, 100));
    setLastError(report);
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
    errorReporter.clear();
    setErrors([]);
  }, []);

  // Subscribe to error reporter
  React.useEffect(() => {
    return errorReporter.subscribe((newErrors) => {
      setErrors(newErrors);
      setLastError(newErrors[0] || null);
    });
  }, []);

  // Global error handler for unhandled errors
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      event.preventDefault();
      reportError(event.error || new Error(event.message), {
        type: 'uncaught',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      reportError(error, { type: 'unhandledrejection' });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [reportError]);

  const value = useMemo<ErrorBoundaryContextValue>(() => ({
    reportError,
    clearError,
    errors,
    lastError,
  }), [reportError, clearError, errors, lastError]);

  return (
    <ErrorBoundaryContext.Provider value={value}>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </ErrorBoundaryContext.Provider>
  );
};

// ============================================================================
// Specialized Error Boundaries
// ============================================================================

/**
 * Error boundary for editor components - shows inline error
 */
export const EditorErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      level="warning"
      showDetails={false}
      fallback={(error, reset) => (
        <div className="flex flex-col items-center justify-center h-full p-4 bg-[var(--aethel-surface-secondary)]">
          <AlertTriangle className="w-8 h-8 text-[var(--aethel-warning-light)] mb-2" />
          <p className="text-sm text-[var(--aethel-text-secondary)] mb-3">Failed to render editor</p>
          <button
            onClick={reset}
            className="px-3 py-1 text-xs bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] rounded"
          >
            Retry
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Error boundary for panels - shows minimal error
 */
export const PanelErrorBoundary: React.FC<{
  children: ReactNode;
  panelName?: string;
}> = ({ children, panelName = 'Panel' }) => {
  return (
    <ErrorBoundary
      level="info"
      showDetails={false}
      fallback={(error, reset) => (
        <div className="flex items-center justify-between p-2 bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] border-b border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]">
          <span className="text-xs text-[var(--aethel-error-light)]">
            {panelName} error: {error.message}
          </span>
          <button
            onClick={reset}
            className="p-1 hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] rounded"
          >
            <RefreshCw size={12} className="text-[var(--aethel-error-light)]" />
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * Error boundary for async components - shows loading state on retry
 */
export const AsyncErrorBoundary: React.FC<{
  children: ReactNode;
  loadingFallback?: ReactNode;
}> = ({ children, loadingFallback }) => {
  const [isRetrying, setIsRetrying] = React.useState(false);

  return (
    <ErrorBoundary
      onReset={() => setIsRetrying(true)}
      fallback={(error, reset) => (
        isRetrying && loadingFallback ? loadingFallback : (
          <div className="flex flex-col items-center justify-center p-4">
            <AlertTriangle className="w-6 h-6 text-[var(--aethel-error-light)] mb-2" />
            <p className="text-sm text-[var(--aethel-text-secondary)] mb-2">{error.message}</p>
            <button
              onClick={() => {
                setIsRetrying(true);
                reset();
                setTimeout(() => setIsRetrying(false), 100);
              }}
              className="px-3 py-1 text-xs bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-secondary)] rounded"
            >
              Retry
            </button>
          </div>
        )
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

// ============================================================================
// Error Toast Notification
// ============================================================================

export const ErrorToast: React.FC<{
  error: ErrorReport;
  onClose: () => void;
}> = ({ error, onClose }) => {
  return (
    <div className="flex items-start gap-3 p-3 bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] rounded-lg max-w-sm animate-in slide-in-from-right">
      <AlertTriangle className="w-5 h-5 text-[var(--aethel-error-light)] flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--aethel-text-primary)] truncate">
          {error.error.name}
        </p>
        <p className="text-xs text-[var(--aethel-error-light)] truncate">
          {error.error.message}
        </p>
      </div>

      <button
        onClick={onClose}
        className="p-1 hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] rounded text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
};

// ============================================================================
// Higher-Order Component
// ============================================================================

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const ComponentWithErrorBoundary: React.FC<P> = (props) => {
    return (
      <ErrorBoundary {...options}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

// ============================================================================
// Hook for triggering errors (useful for testing)
// ============================================================================

export function useErrorTrigger() {
  const { reportError } = useErrorBoundary();

  const triggerError = useCallback((message: string = 'Test error') => {
    throw new Error(message);
  }, []);

  const reportCustomError = useCallback((error: Error, context?: Record<string, unknown>) => {
    reportError(error, context);
  }, [reportError]);

  return { triggerError, reportCustomError };
}

export default ErrorBoundary;
