'use client';

/**
 * Aethel Engine - Global Error Boundary
 *
 * Professional error handling with recovery, reporting, and user-friendly UI.
 * Captures React errors, async errors, and provides graceful degradation.
 *
 * Frente R64: Enhanced with crash-recovery receipts, crash count tracking,
 * and auto-retry with exponential backoff (Let-it-Crash pattern).
 */
import React, {
  Component,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
  type ErrorInfo,
} from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { ErrorFallback } from './ErrorBoundary.fallback';
import { ErrorBoundaryContext, useErrorBoundary } from './ErrorBoundary.context';
import type { ErrorBoundaryContextValue, ErrorBoundaryProps, ErrorBoundaryState, ErrorReport } from './ErrorBoundary.contracts';
import { errorBoundaryLog, errorReporter } from './ErrorBoundary.reporter';

export type { ErrorBoundaryContextValue, ErrorBoundaryProps, ErrorBoundaryState, ErrorReport } from './ErrorBoundary.contracts';
export { ErrorReporterService, errorBoundaryLog, errorReporter } from './ErrorBoundary.reporter';
export { useErrorBoundary } from './ErrorBoundary.context';

// ============================================================================
// Error Boundary Component — Frente R64 (Let-it-Crash + Auto-Recovery)
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private crashCount = 0;
  private lastCrashTime = 0;
  private retryTimerId: ReturnType<typeof setTimeout> | null = null;

  private static readonly MAX_AUTO_RETRIES = 3;
  private static readonly BACKOFF_BASE_MS = 500;
  private static readonly CRASH_RESET_WINDOW_MS = 30_000;

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
    const now = Date.now();

    // Reset crash count if enough time has passed since last crash
    if (now - this.lastCrashTime > ErrorBoundary.CRASH_RESET_WINDOW_MS) {
      this.crashCount = 0;
    }

    this.crashCount++;
    this.lastCrashTime = now;

    this.setState({ errorInfo });

    // Frente R64: Emit structured crash receipt for observability
    const crashReceipt = {
      timestamp: new Date().toISOString(),
      crashCount: this.crashCount,
      errorName: error.name,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 500),
      level: this.props.level || 'critical',
      willAutoRetry: this.crashCount < ErrorBoundary.MAX_AUTO_RETRIES,
    };

    // Report error with crash receipt context
    errorReporter.report(error, { crashReceipt }, errorInfo);

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Auto-retry with exponential backoff (Let-it-Crash pattern)
    if (this.crashCount < ErrorBoundary.MAX_AUTO_RETRIES) {
      const backoffMs = ErrorBoundary.BACKOFF_BASE_MS * Math.pow(4, this.crashCount - 1);
      this.retryTimerId = setTimeout(() => {
        this.reset();
      }, backoffMs);
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimerId) {
      clearTimeout(this.retryTimerId);
    }
  }

  reset = (): void => {
    if (this.retryTimerId) {
      clearTimeout(this.retryTimerId);
      this.retryTimerId = null;
    }

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
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

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

function getRuntimeFailureSmokeReceipt(error: Error, fallbackReceipt: string): string {
  if (error.message.includes('AETHEL_RUNTIME_FAILURE_SMOKE:ide-region-crash-isolated')) {
    return 'error boundary receipt:ide-editor-region';
  }

  if (error.message.includes('AETHEL_RUNTIME_FAILURE_SMOKE:preview-render-fallback')) {
    return 'error boundary receipt:preview-render-adapter';
  }

  return fallbackReceipt;
}

/**
 * Error boundary for editor components - shows inline error
 */
export const EditorErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      level="warning"
      showDetails={false}
      fallback={(error, reset) => {
        const smokeReceipt = getRuntimeFailureSmokeReceipt(error, 'error boundary receipt:ide-editor-region');
        return (
          <div
            className="flex flex-col items-center justify-center h-full p-4 bg-[var(--aethel-surface-secondary)]"
            data-aethel-editor-error-boundary="active"
            data-aethel-runtime-failure-smoke-receipt={smokeReceipt}
          >
            <AlertTriangle className="w-8 h-8 text-[var(--aethel-warning-light)] mb-2" />
            <p className="text-sm text-[var(--aethel-text-secondary)] mb-3">Failed to render editor</p>
            <button type="button" aria-label="Retry compact error boundary"
              onClick={reset}
              className="px-3 py-1 text-xs bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] rounded transition-colors"
            >
              Retry
            </button>
          </div>
        );
      }}
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
      fallback={(error, reset) => {
        const smokeReceipt = getRuntimeFailureSmokeReceipt(error, `error boundary receipt:${panelName}`);
        return (
          <div
            className="flex items-center justify-between p-2 bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] border-b border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]"
            data-aethel-panel-error-boundary={panelName}
            data-aethel-runtime-failure-smoke-receipt={smokeReceipt}
          >
            <span className="text-xs text-[var(--aethel-error-light)]">
              {panelName} error: {error.message}
            </span>
            <button type="button" aria-label="Retry tiny error boundary"
              onClick={reset}
              className="p-1 hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] rounded"
            >
              <RefreshCw size={12} className="text-[var(--aethel-error-light)]" />
            </button>
          </div>
        );
      }}
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
            <button type="button" aria-label="Retry async error boundary"
              onClick={() => {
                setIsRetrying(true);
                reset();
                setTimeout(() => setIsRetrying(false), 100);
              }}
              className="px-3 py-1 text-xs bg-[var(--aethel-surface-secondary)] hover:bg-[var(--aethel-surface-quaternary)] rounded transition-colors"
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

      <button type="button" aria-label="Dismiss async error notice"
        onClick={onClose}
        className="p-1 hover:bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] rounded text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
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
