import * as React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    showDetails?: boolean;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    errorCount: number;
}

/**
 * Error Boundary component for graceful error handling
 * Catches React errors and displays fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error to console
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Update state with error details
        this.setState(prevState => ({
            error,
            errorInfo,
            errorCount: prevState.errorCount + 1,
        }));

        // Call custom error handler if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }

        // Send to error reporting service (e.g., Sentry)
        this.reportError(error, errorInfo);
    }

    private reportError(error: Error, errorInfo: React.ErrorInfo): void {
        // In production, send to error tracking service
        // For now, just log to console
        const errorReport = {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
        };

        console.error('Error Report:', errorReport);

        // TODO: Send to Sentry, LogRocket, or similar service
        // if (window.Sentry) {
        //     window.Sentry.captureException(error, {
        //         contexts: {
        //             react: {
        //                 componentStack: errorInfo.componentStack,
        //             },
        //         },
        //     });
        // }
    }

    private handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    private handleReload = (): void => {
        window.location.reload();
    };

    private renderDefaultFallback(): React.ReactNode {
        const { error, errorInfo, errorCount } = this.state;
        const { showDetails = true } = this.props;

        return (
            <div className="error-boundary-fallback">
                <div className="error-boundary-content">
                    <div className="error-boundary-icon">
                        <AlertCircle size={64} color="#ef4444" />
                    </div>

                    <h1 className="error-boundary-title">Something went wrong</h1>

                    <p className="error-boundary-message">
                        {error?.message || 'An unexpected error occurred'}
                    </p>

                    {errorCount > 1 && (
                        <p className="error-boundary-warning">
                            This error has occurred {errorCount} times. Consider reloading the page.
                        </p>
                    )}

                    <div className="error-boundary-actions">
                        <button
                            className="error-boundary-button primary"
                            onClick={this.handleReset}
                        >
                            <RefreshCw size={16} />
                            Try Again
                        </button>

                        <button
                            className="error-boundary-button secondary"
                            onClick={this.handleReload}
                        >
                            <Home size={16} />
                            Reload Page
                        </button>
                    </div>

                    {showDetails && error && (
                        <details className="error-boundary-details">
                            <summary>Error Details</summary>
                            <div className="error-boundary-stack">
                                <h3>Error Stack:</h3>
                                <pre>{error.stack}</pre>

                                {errorInfo && (
                                    <>
                                        <h3>Component Stack:</h3>
                                        <pre>{errorInfo.componentStack}</pre>
                                    </>
                                )}
                            </div>
                        </details>
                    )}
                </div>

                <style>{`
                    .error-boundary-fallback {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 400px;
                        padding: 2rem;
                        background: var(--theia-editor-background);
                        color: var(--theia-editor-foreground);
                    }

                    .error-boundary-content {
                        max-width: 600px;
                        text-align: center;
                    }

                    .error-boundary-icon {
                        margin-bottom: 1.5rem;
                    }

                    .error-boundary-title {
                        font-size: 2rem;
                        font-weight: 600;
                        margin-bottom: 1rem;
                        color: var(--theia-errorForeground);
                    }

                    .error-boundary-message {
                        font-size: 1.125rem;
                        margin-bottom: 1.5rem;
                        color: var(--theia-descriptionForeground);
                    }

                    .error-boundary-warning {
                        padding: 0.75rem;
                        margin-bottom: 1.5rem;
                        background: var(--theia-inputValidation-warningBackground);
                        border: 1px solid var(--theia-inputValidation-warningBorder);
                        border-radius: 4px;
                        color: var(--theia-inputValidation-warningForeground);
                    }

                    .error-boundary-actions {
                        display: flex;
                        gap: 1rem;
                        justify-content: center;
                        margin-bottom: 2rem;
                    }

                    .error-boundary-button {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.75rem 1.5rem;
                        border: none;
                        border-radius: 4px;
                        font-size: 1rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .error-boundary-button.primary {
                        background: var(--theia-button-background);
                        color: var(--theia-button-foreground);
                    }

                    .error-boundary-button.primary:hover {
                        background: var(--theia-button-hoverBackground);
                    }

                    .error-boundary-button.secondary {
                        background: var(--theia-button-secondaryBackground);
                        color: var(--theia-button-secondaryForeground);
                    }

                    .error-boundary-button.secondary:hover {
                        background: var(--theia-button-secondaryHoverBackground);
                    }

                    .error-boundary-details {
                        text-align: left;
                        margin-top: 2rem;
                        padding: 1rem;
                        background: var(--theia-editor-background);
                        border: 1px solid var(--theia-panel-border);
                        border-radius: 4px;
                    }

                    .error-boundary-details summary {
                        cursor: pointer;
                        font-weight: 600;
                        margin-bottom: 1rem;
                        user-select: none;
                    }

                    .error-boundary-details summary:hover {
                        color: var(--theia-textLink-foreground);
                    }

                    .error-boundary-stack {
                        max-height: 400px;
                        overflow: auto;
                    }

                    .error-boundary-stack h3 {
                        margin-top: 1rem;
                        margin-bottom: 0.5rem;
                        font-size: 0.875rem;
                        font-weight: 600;
                        color: var(--theia-descriptionForeground);
                    }

                    .error-boundary-stack pre {
                        padding: 1rem;
                        background: var(--theia-editor-background);
                        border: 1px solid var(--theia-panel-border);
                        border-radius: 4px;
                        font-size: 0.75rem;
                        line-height: 1.5;
                        overflow-x: auto;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                `}</style>
            </div>
        );
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            // Use custom fallback if provided, otherwise use default
            return this.props.fallback || this.renderDefaultFallback();
        }

        return this.props.children;
    }
}

/**
 * Higher-order component to wrap components with ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
    return (props: P) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    );
}
