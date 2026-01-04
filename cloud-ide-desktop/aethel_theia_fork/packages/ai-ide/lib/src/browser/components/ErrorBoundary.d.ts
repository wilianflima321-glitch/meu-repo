import * as React from 'react';
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
export declare class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps);
    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState>;
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
    private reportError;
    private handleReset;
    private handleReload;
    private renderDefaultFallback;
    render(): React.ReactNode;
}
/**
 * Higher-order component to wrap components with ErrorBoundary
 */
export declare function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>): React.ComponentType<P>;
export {};
