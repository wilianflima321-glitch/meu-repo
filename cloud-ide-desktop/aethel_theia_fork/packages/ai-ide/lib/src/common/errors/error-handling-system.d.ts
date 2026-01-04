/**
 * @file error-handling-system.ts
 * @description Sistema Robusto de Error Handling para Aethel IDE
 *
 * Implementação profissional de tratamento de erros inspirada em:
 * - VS Code Error Handling
 * - Sentry/DataDog Error Tracking
 * - React Error Boundaries
 * - Rust Result/Option Pattern
 *
 * Features:
 * - Hierarquia de erros tipada
 * - Recovery strategies automáticas
 * - Error boundaries para isolamento
 * - Logging estruturado
 * - User-friendly error messages
 * - Telemetria de erros
 * - Retry com backoff exponencial
 * - Circuit breaker pattern
 *
 * @version 2.2.0
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
declare class Emitter<T> {
    private listeners;
    get event(): Event<T>;
    fire(event: T): void;
    dispose(): void;
}
/**
 * Error severity levels
 */
export declare enum ErrorSeverity {
    /** Informational, não afeta funcionamento */
    Info = "info",
    /** Warning, funcionalidade degradada mas funcional */
    Warning = "warning",
    /** Error, funcionalidade comprometida */
    Error = "error",
    /** Critical, sistema instável */
    Critical = "critical",
    /** Fatal, sistema deve parar */
    Fatal = "fatal"
}
/**
 * Error categories for classification
 */
export declare enum ErrorCategory {
    /** Errors de rede/API */
    Network = "network",
    /** Errors de validação */
    Validation = "validation",
    /** Errors de autenticação */
    Authentication = "authentication",
    /** Errors de autorização */
    Authorization = "authorization",
    /** Errors de I/O */
    IO = "io",
    /** Errors de parsing */
    Parsing = "parsing",
    /** Errors de configuração */
    Configuration = "configuration",
    /** Errors de runtime */
    Runtime = "runtime",
    /** Errors de timeout */
    Timeout = "timeout",
    /** Errors de recursos */
    Resource = "resource",
    /** Errors de dependência */
    Dependency = "dependency",
    /** Errors de concorrência */
    Concurrency = "concurrency",
    /** Errors de estado */
    State = "state",
    /** Errors desconhecidos */
    Unknown = "unknown"
}
/**
 * Recovery strategy types
 */
export declare enum RecoveryStrategy {
    /** Não tentar recovery */
    None = "none",
    /** Retry com backoff */
    Retry = "retry",
    /** Fallback para alternativa */
    Fallback = "fallback",
    /** Ignorar e continuar */
    Ignore = "ignore",
    /** Reiniciar componente */
    Restart = "restart",
    /** Rollback para estado anterior */
    Rollback = "rollback",
    /** Pedir intervenção do usuário */
    UserIntervention = "user_intervention",
    /** Degradar funcionalidade */
    Degrade = "degrade"
}
/**
 * Circuit breaker state
 */
export declare enum CircuitState {
    Closed = "closed",
    Open = "open",
    HalfOpen = "half_open"
}
/**
 * Base error context with metadata
 */
export interface ErrorContext {
    /** Timestamp do erro */
    timestamp: number;
    /** ID único do erro */
    errorId: string;
    /** Request ID se aplicável */
    requestId?: string;
    /** Session ID */
    sessionId?: string;
    /** User ID se autenticado */
    userId?: string;
    /** Stack trace */
    stack?: string;
    /** Dados adicionais */
    metadata?: Record<string, unknown>;
    /** Breadcrumbs (ações anteriores) */
    breadcrumbs?: ErrorBreadcrumb[];
    /** Tags para filtro */
    tags?: string[];
}
/**
 * Breadcrumb para rastreamento
 */
export interface ErrorBreadcrumb {
    timestamp: number;
    category: string;
    message: string;
    level: 'debug' | 'info' | 'warning' | 'error';
    data?: Record<string, unknown>;
}
/**
 * Recovery result
 */
export interface RecoveryResult {
    success: boolean;
    strategy: RecoveryStrategy;
    attempts: number;
    duration: number;
    fallbackValue?: unknown;
    error?: Error;
}
/**
 * Error report for telemetry
 */
export interface ErrorReport {
    error: AethelError;
    context: ErrorContext;
    recovery?: RecoveryResult;
    userAction?: string;
    resolved: boolean;
}
/**
 * Retry configuration
 */
export interface RetryConfig {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryOn?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
}
/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeoutMs: number;
    halfOpenRequests: number;
}
/**
 * Base error class for Aethel IDE
 */
export declare class AethelError extends Error {
    readonly code: string;
    readonly severity: ErrorSeverity;
    readonly category: ErrorCategory;
    readonly recoverable: boolean;
    readonly userMessage: string;
    readonly context: Partial<ErrorContext>;
    readonly cause?: Error;
    readonly timestamp: number;
    constructor(options: {
        message: string;
        code: string;
        severity?: ErrorSeverity;
        category?: ErrorCategory;
        recoverable?: boolean;
        userMessage?: string;
        context?: Partial<ErrorContext>;
        cause?: Error;
    });
    private getDefaultUserMessage;
    toJSON(): Record<string, unknown>;
}
/**
 * Network-related errors
 */
export declare class NetworkError extends AethelError {
    readonly statusCode?: number;
    readonly url?: string;
    constructor(options: {
        message: string;
        code?: string;
        statusCode?: number;
        url?: string;
        cause?: Error;
        context?: Partial<ErrorContext>;
    });
}
/**
 * Validation errors
 */
export declare class ValidationError extends AethelError {
    readonly field?: string;
    readonly value?: unknown;
    readonly constraints?: string[];
    constructor(options: {
        message: string;
        field?: string;
        value?: unknown;
        constraints?: string[];
        context?: Partial<ErrorContext>;
    });
}
/**
 * Authentication errors
 */
export declare class AuthenticationError extends AethelError {
    constructor(options: {
        message: string;
        code?: string;
        context?: Partial<ErrorContext>;
    });
}
/**
 * Resource not found errors
 */
export declare class NotFoundError extends AethelError {
    readonly resourceType: string;
    readonly resourceId?: string;
    constructor(options: {
        message: string;
        resourceType: string;
        resourceId?: string;
        context?: Partial<ErrorContext>;
    });
}
/**
 * Timeout errors
 */
export declare class TimeoutError extends AethelError {
    readonly timeoutMs: number;
    readonly operation: string;
    constructor(options: {
        operation: string;
        timeoutMs: number;
        context?: Partial<ErrorContext>;
    });
}
/**
 * Configuration errors
 */
export declare class ConfigurationError extends AethelError {
    readonly configKey?: string;
    constructor(options: {
        message: string;
        configKey?: string;
        context?: Partial<ErrorContext>;
    });
}
/**
 * Result type for operations that can fail
 * Inspired by Rust's Result<T, E>
 */
export type Result<T, E = AethelError> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
export declare const Result: {
    ok<T>(value: T): Result<T, never>;
    err<E>(error: E): Result<never, E>;
    isOk<T, E>(result: Result<T, E>): result is {
        ok: true;
        value: T;
    };
    isErr<T, E>(result: Result<T, E>): result is {
        ok: false;
        error: E;
    };
    map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>;
    mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>;
    unwrap<T, E>(result: Result<T, E>): T;
    unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T;
    fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>>;
};
/**
 * Option type for nullable values
 * Inspired by Rust's Option<T>
 */
export type Option<T> = {
    some: true;
    value: T;
} | {
    some: false;
};
export declare const Option: {
    some<T>(value: T): Option<T>;
    none<T>(): Option<T>;
    isSome<T>(option: Option<T>): option is {
        some: true;
        value: T;
    };
    isNone<T>(option: Option<T>): option is {
        some: false;
    };
    map<T, U>(option: Option<T>, fn: (value: T) => U): Option<U>;
    unwrap<T>(option: Option<T>): T;
    unwrapOr<T>(option: Option<T>, defaultValue: T): T;
    fromNullable<T>(value: T | null | undefined): Option<T>;
};
export declare const ErrorHandlerSymbol: unique symbol;
/**
 * Central error handling service
 */
export declare class ErrorHandler {
    private readonly _onError;
    private readonly _onRecovery;
    private breadcrumbs;
    private readonly maxBreadcrumbs;
    private errorCount;
    private sessionId;
    private circuitBreakers;
    private errorReports;
    private readonly maxReports;
    readonly onError: Event<ErrorReport>;
    readonly onRecovery: Event<RecoveryResult>;
    constructor();
    /**
     * Handle an error with full context
     */
    handle(error: Error | AethelError, options?: {
        context?: Partial<ErrorContext>;
        recovery?: RecoveryStrategy;
        notify?: boolean;
    }): ErrorReport;
    /**
     * Wrap an async operation with error handling
     */
    wrap<T>(operation: () => Promise<T>, options?: {
        operationName?: string;
        retryConfig?: RetryConfig;
        fallback?: () => T | Promise<T>;
        circuitBreakerId?: string;
    }): Promise<Result<T, AethelError>>;
    /**
     * Execute with retry and exponential backoff
     */
    withRetry<T>(operation: () => Promise<T>, config: RetryConfig): Promise<T>;
    /**
     * Add a breadcrumb for error context
     */
    addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void;
    /**
     * Get or create a circuit breaker
     */
    getCircuitBreaker(id: string, config?: CircuitBreakerConfig): CircuitBreaker;
    /**
     * Get error statistics
     */
    getStats(): {
        totalErrors: number;
        sessionId: string;
        errorsByCategory: Record<string, number>;
        errorsBySeverity: Record<string, number>;
        recentErrors: ErrorReport[];
    };
    /**
     * Clear error history
     */
    clearHistory(): void;
    private normalizeError;
    private buildContext;
    private logError;
    private getLogLevel;
    private storeReport;
    private setupGlobalHandlers;
    private generateId;
    private sleep;
    dispose(): void;
}
/**
 * Circuit Breaker pattern implementation
 */
export declare class CircuitBreaker {
    private config;
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime;
    private halfOpenAttempts;
    constructor(config: CircuitBreakerConfig);
    canExecute(): boolean;
    recordSuccess(): void;
    recordFailure(): void;
    reset(): void;
    getState(): CircuitState;
    getStats(): {
        state: CircuitState;
        failureCount: number;
        successCount: number;
        lastFailureTime: number;
    };
}
/**
 * Error boundary for component isolation
 */
export declare class ErrorBoundary {
    private errors;
    private readonly onError;
    private readonly fallback?;
    constructor(options: {
        onError?: (error: AethelError) => void;
        fallback?: () => void;
    });
    /**
     * Wrap a synchronous operation
     */
    run<T>(operation: () => T, fallbackValue?: T): T | undefined;
    /**
     * Wrap an async operation
     */
    runAsync<T>(operation: () => Promise<T>, fallbackValue?: T): Promise<T | undefined>;
    hasErrors(): boolean;
    getErrors(): AethelError[];
    clearErrors(): void;
}
/**
 * Assert condition and throw if false
 */
export declare function assert(condition: boolean, message: string, code?: string): asserts condition;
/**
 * Assert value is not null/undefined
 */
export declare function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T;
/**
 * Safe JSON parse
 */
export declare function safeJsonParse<T>(json: string, fallback?: T): Result<T, AethelError>;
/**
 * Timeout wrapper
 */
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation?: string): Promise<T>;
export { Emitter };
export declare const errorHandler: ErrorHandler;
