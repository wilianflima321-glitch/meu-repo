"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorBoundary = void 0;
exports.withErrorBoundary = withErrorBoundary;
const jsx_runtime_1 = require("react/jsx-runtime");
const React = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
/**
 * Error Boundary component for graceful error handling
 * Catches React errors and displays fallback UI
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.handleReset = () => {
            this.setState({
                hasError: false,
                error: null,
                errorInfo: null,
            });
        };
        this.handleReload = () => {
            window.location.reload();
        };
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorCount: 0,
        };
    }
    static getDerivedStateFromError(error) {
        return {
            hasError: true,
            error,
        };
    }
    componentDidCatch(error, errorInfo) {
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
    reportError(error, errorInfo) {
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
    renderDefaultFallback() {
        const { error, errorInfo, errorCount } = this.state;
        const { showDetails = true } = this.props;
        return ((0, jsx_runtime_1.jsxs)("div", { className: "error-boundary-fallback", children: [(0, jsx_runtime_1.jsxs)("div", { className: "error-boundary-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "error-boundary-icon", children: (0, jsx_runtime_1.jsx)(lucide_react_1.AlertCircle, { size: 64, color: "#ef4444" }) }), (0, jsx_runtime_1.jsx)("h1", { className: "error-boundary-title", children: "Something went wrong" }), (0, jsx_runtime_1.jsx)("p", { className: "error-boundary-message", children: error?.message || 'An unexpected error occurred' }), errorCount > 1 && ((0, jsx_runtime_1.jsxs)("p", { className: "error-boundary-warning", children: ["This error has occurred ", errorCount, " times. Consider reloading the page."] })), (0, jsx_runtime_1.jsxs)("div", { className: "error-boundary-actions", children: [(0, jsx_runtime_1.jsxs)("button", { className: "error-boundary-button primary", onClick: this.handleReset, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { size: 16 }), "Try Again"] }), (0, jsx_runtime_1.jsxs)("button", { className: "error-boundary-button secondary", onClick: this.handleReload, children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Home, { size: 16 }), "Reload Page"] })] }), showDetails && error && ((0, jsx_runtime_1.jsxs)("details", { className: "error-boundary-details", children: [(0, jsx_runtime_1.jsx)("summary", { children: "Error Details" }), (0, jsx_runtime_1.jsxs)("div", { className: "error-boundary-stack", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Error Stack:" }), (0, jsx_runtime_1.jsx)("pre", { children: error.stack }), errorInfo && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Component Stack:" }), (0, jsx_runtime_1.jsx)("pre", { children: errorInfo.componentStack })] }))] })] }))] }), (0, jsx_runtime_1.jsx)("style", { children: `
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
                ` })] }));
    }
    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided, otherwise use default
            return this.props.fallback || this.renderDefaultFallback();
        }
        return this.props.children;
    }
}
exports.ErrorBoundary = ErrorBoundary;
/**
 * Higher-order component to wrap components with ErrorBoundary
 */
function withErrorBoundary(Component, errorBoundaryProps) {
    return (props) => ((0, jsx_runtime_1.jsx)(ErrorBoundary, { ...errorBoundaryProps, children: (0, jsx_runtime_1.jsx)(Component, { ...props }) }));
}
