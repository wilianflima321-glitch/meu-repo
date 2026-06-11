'use client';

import { useCallback, useState, type ErrorInfo } from 'react';
import { AlertTriangle, Bug, ChevronDown, ChevronRight, Copy, Home, RefreshCw } from 'lucide-react';
import { errorBoundaryLog } from './ErrorBoundary.reporter';

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  reset: () => void;
  showDetails?: boolean;
  level?: 'critical' | 'warning' | 'info';
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
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
      errorBoundaryLog.error('Failed to copy error details to clipboard', {
        action: 'copy-error-details',
      });
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
        <button type="button" aria-label="Try loading again"
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-text-primary)] rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Try Again
        </button>

        <button type="button" aria-label="Reload current page"
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
          <button type="button" aria-label={showStack ? 'Hide technical details' : 'Show technical details'}
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
                <button type="button" aria-label="Copy error details"
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
