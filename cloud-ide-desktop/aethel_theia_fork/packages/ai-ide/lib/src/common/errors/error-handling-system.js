"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.Emitter = exports.ErrorBoundary = exports.CircuitBreaker = exports.ErrorHandler = exports.ErrorHandlerSymbol = exports.Option = exports.Result = exports.ConfigurationError = exports.TimeoutError = exports.NotFoundError = exports.AuthenticationError = exports.ValidationError = exports.NetworkError = exports.AethelError = exports.CircuitState = exports.RecoveryStrategy = exports.ErrorCategory = exports.ErrorSeverity = void 0;
exports.assert = assert;
exports.assertDefined = assertDefined;
exports.safeJsonParse = safeJsonParse;
exports.withTimeout = withTimeout;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                },
            };
        };
    }
    fire(event) {
        this.listeners.forEach((l) => {
            try {
                l(event);
            }
            catch (e) {
                console.error('Error in event listener:', e);
            }
        });
    }
    dispose() {
        this.listeners = [];
    }
}
exports.Emitter = Emitter;
// ==================== Error Types & Enums ====================
/**
 * Error severity levels
 */
var ErrorSeverity;
(function (ErrorSeverity) {
    /** Informational, não afeta funcionamento */
    ErrorSeverity["Info"] = "info";
    /** Warning, funcionalidade degradada mas funcional */
    ErrorSeverity["Warning"] = "warning";
    /** Error, funcionalidade comprometida */
    ErrorSeverity["Error"] = "error";
    /** Critical, sistema instável */
    ErrorSeverity["Critical"] = "critical";
    /** Fatal, sistema deve parar */
    ErrorSeverity["Fatal"] = "fatal";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
/**
 * Error categories for classification
 */
var ErrorCategory;
(function (ErrorCategory) {
    /** Errors de rede/API */
    ErrorCategory["Network"] = "network";
    /** Errors de validação */
    ErrorCategory["Validation"] = "validation";
    /** Errors de autenticação */
    ErrorCategory["Authentication"] = "authentication";
    /** Errors de autorização */
    ErrorCategory["Authorization"] = "authorization";
    /** Errors de I/O */
    ErrorCategory["IO"] = "io";
    /** Errors de parsing */
    ErrorCategory["Parsing"] = "parsing";
    /** Errors de configuração */
    ErrorCategory["Configuration"] = "configuration";
    /** Errors de runtime */
    ErrorCategory["Runtime"] = "runtime";
    /** Errors de timeout */
    ErrorCategory["Timeout"] = "timeout";
    /** Errors de recursos */
    ErrorCategory["Resource"] = "resource";
    /** Errors de dependência */
    ErrorCategory["Dependency"] = "dependency";
    /** Errors de concorrência */
    ErrorCategory["Concurrency"] = "concurrency";
    /** Errors de estado */
    ErrorCategory["State"] = "state";
    /** Errors desconhecidos */
    ErrorCategory["Unknown"] = "unknown";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
/**
 * Recovery strategy types
 */
var RecoveryStrategy;
(function (RecoveryStrategy) {
    /** Não tentar recovery */
    RecoveryStrategy["None"] = "none";
    /** Retry com backoff */
    RecoveryStrategy["Retry"] = "retry";
    /** Fallback para alternativa */
    RecoveryStrategy["Fallback"] = "fallback";
    /** Ignorar e continuar */
    RecoveryStrategy["Ignore"] = "ignore";
    /** Reiniciar componente */
    RecoveryStrategy["Restart"] = "restart";
    /** Rollback para estado anterior */
    RecoveryStrategy["Rollback"] = "rollback";
    /** Pedir intervenção do usuário */
    RecoveryStrategy["UserIntervention"] = "user_intervention";
    /** Degradar funcionalidade */
    RecoveryStrategy["Degrade"] = "degrade";
})(RecoveryStrategy || (exports.RecoveryStrategy = RecoveryStrategy = {}));
/**
 * Circuit breaker state
 */
var CircuitState;
(function (CircuitState) {
    CircuitState["Closed"] = "closed";
    CircuitState["Open"] = "open";
    CircuitState["HalfOpen"] = "half_open";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
// ==================== Custom Error Classes ====================
/**
 * Base error class for Aethel IDE
 */
class AethelError extends Error {
    constructor(options) {
        super(options.message);
        this.name = 'AethelError';
        this.code = options.code;
        this.severity = options.severity ?? ErrorSeverity.Error;
        this.category = options.category ?? ErrorCategory.Unknown;
        this.recoverable = options.recoverable ?? false;
        this.userMessage = options.userMessage ?? this.getDefaultUserMessage();
        this.context = options.context ?? {};
        this.cause = options.cause;
        this.timestamp = Date.now();
        // Capturar stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AethelError);
        }
    }
    getDefaultUserMessage() {
        switch (this.severity) {
            case ErrorSeverity.Info:
                return 'Uma informação foi registrada.';
            case ErrorSeverity.Warning:
                return 'Atenção: algo pode não estar funcionando como esperado.';
            case ErrorSeverity.Error:
                return 'Ocorreu um erro. Tente novamente.';
            case ErrorSeverity.Critical:
                return 'Erro crítico. Algumas funcionalidades podem estar indisponíveis.';
            case ErrorSeverity.Fatal:
                return 'Erro fatal. Por favor, reinicie a aplicação.';
            default:
                return 'Ocorreu um erro inesperado.';
        }
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            severity: this.severity,
            category: this.category,
            recoverable: this.recoverable,
            userMessage: this.userMessage,
            context: this.context,
            stack: this.stack,
            timestamp: this.timestamp,
        };
    }
}
exports.AethelError = AethelError;
/**
 * Network-related errors
 */
class NetworkError extends AethelError {
    constructor(options) {
        super({
            message: options.message,
            code: options.code ?? 'NETWORK_ERROR',
            category: ErrorCategory.Network,
            severity: ErrorSeverity.Error,
            recoverable: true,
            userMessage: 'Erro de conexão. Verifique sua internet.',
            cause: options.cause,
            context: options.context,
        });
        this.name = 'NetworkError';
        this.statusCode = options.statusCode;
        this.url = options.url;
    }
}
exports.NetworkError = NetworkError;
/**
 * Validation errors
 */
class ValidationError extends AethelError {
    constructor(options) {
        super({
            message: options.message,
            code: 'VALIDATION_ERROR',
            category: ErrorCategory.Validation,
            severity: ErrorSeverity.Warning,
            recoverable: true,
            userMessage: options.field
                ? `O campo "${options.field}" é inválido.`
                : 'Dados inválidos. Verifique as informações.',
            context: options.context,
        });
        this.name = 'ValidationError';
        this.field = options.field;
        this.value = options.value;
        this.constraints = options.constraints;
    }
}
exports.ValidationError = ValidationError;
/**
 * Authentication errors
 */
class AuthenticationError extends AethelError {
    constructor(options) {
        super({
            message: options.message,
            code: options.code ?? 'AUTH_ERROR',
            category: ErrorCategory.Authentication,
            severity: ErrorSeverity.Error,
            recoverable: true,
            userMessage: 'Sessão expirada. Faça login novamente.',
            context: options.context,
        });
        this.name = 'AuthenticationError';
    }
}
exports.AuthenticationError = AuthenticationError;
/**
 * Resource not found errors
 */
class NotFoundError extends AethelError {
    constructor(options) {
        super({
            message: options.message,
            code: 'NOT_FOUND',
            category: ErrorCategory.Resource,
            severity: ErrorSeverity.Warning,
            recoverable: false,
            userMessage: `${options.resourceType} não encontrado.`,
            context: options.context,
        });
        this.name = 'NotFoundError';
        this.resourceType = options.resourceType;
        this.resourceId = options.resourceId;
    }
}
exports.NotFoundError = NotFoundError;
/**
 * Timeout errors
 */
class TimeoutError extends AethelError {
    constructor(options) {
        super({
            message: `Operation "${options.operation}" timed out after ${options.timeoutMs}ms`,
            code: 'TIMEOUT',
            category: ErrorCategory.Timeout,
            severity: ErrorSeverity.Error,
            recoverable: true,
            userMessage: 'A operação demorou muito. Tente novamente.',
            context: options.context,
        });
        this.name = 'TimeoutError';
        this.timeoutMs = options.timeoutMs;
        this.operation = options.operation;
    }
}
exports.TimeoutError = TimeoutError;
/**
 * Configuration errors
 */
class ConfigurationError extends AethelError {
    constructor(options) {
        super({
            message: options.message,
            code: 'CONFIG_ERROR',
            category: ErrorCategory.Configuration,
            severity: ErrorSeverity.Critical,
            recoverable: false,
            userMessage: 'Erro de configuração. Verifique as configurações.',
            context: options.context,
        });
        this.name = 'ConfigurationError';
        this.configKey = options.configKey;
    }
}
exports.ConfigurationError = ConfigurationError;
exports.Result = {
    ok(value) {
        return { ok: true, value };
    },
    err(error) {
        return { ok: false, error };
    },
    isOk(result) {
        return result.ok;
    },
    isErr(result) {
        return !result.ok;
    },
    map(result, fn) {
        return result.ok ? exports.Result.ok(fn(result.value)) : result;
    },
    mapErr(result, fn) {
        return result.ok ? result : exports.Result.err(fn(result.error));
    },
    unwrap(result) {
        if (result.ok)
            return result.value;
        throw result.error;
    },
    unwrapOr(result, defaultValue) {
        return result.ok ? result.value : defaultValue;
    },
    async fromPromise(promise) {
        try {
            const value = await promise;
            return exports.Result.ok(value);
        }
        catch (error) {
            return exports.Result.err(error instanceof Error ? error : new Error(String(error)));
        }
    },
};
exports.Option = {
    some(value) {
        return { some: true, value };
    },
    none() {
        return { some: false };
    },
    isSome(option) {
        return option.some;
    },
    isNone(option) {
        return !option.some;
    },
    map(option, fn) {
        return option.some ? exports.Option.some(fn(option.value)) : exports.Option.none();
    },
    unwrap(option) {
        if (option.some)
            return option.value;
        throw new Error('Called unwrap on None');
    },
    unwrapOr(option, defaultValue) {
        return option.some ? option.value : defaultValue;
    },
    fromNullable(value) {
        return value != null ? exports.Option.some(value) : exports.Option.none();
    },
};
// ==================== Error Handler Service ====================
exports.ErrorHandlerSymbol = Symbol('ErrorHandler');
/**
 * Central error handling service
 */
let ErrorHandler = class ErrorHandler {
    constructor() {
        this._onError = new Emitter();
        this._onRecovery = new Emitter();
        this.breadcrumbs = [];
        this.maxBreadcrumbs = 100;
        this.errorCount = 0;
        this.circuitBreakers = new Map();
        this.errorReports = [];
        this.maxReports = 1000;
        this.onError = this._onError.event;
        this.onRecovery = this._onRecovery.event;
        this.sessionId = this.generateId();
        this.setupGlobalHandlers();
    }
    /**
     * Handle an error with full context
     */
    handle(error, options) {
        const aethelError = this.normalizeError(error);
        const context = this.buildContext(aethelError, options?.context);
        const report = {
            error: aethelError,
            context,
            resolved: false,
        };
        // Log error
        this.logError(aethelError, context);
        // Store report
        this.storeReport(report);
        // Attempt recovery if specified
        if (options?.recovery && options.recovery !== RecoveryStrategy.None) {
            // Recovery handled externally
        }
        // Notify listeners
        this._onError.fire(report);
        this.errorCount++;
        return report;
    }
    /**
     * Wrap an async operation with error handling
     */
    async wrap(operation, options) {
        const opName = options?.operationName ?? 'unknown';
        // Check circuit breaker
        if (options?.circuitBreakerId) {
            const breaker = this.getCircuitBreaker(options.circuitBreakerId);
            if (!breaker.canExecute()) {
                return exports.Result.err(new AethelError({
                    message: `Circuit breaker open for ${options.circuitBreakerId}`,
                    code: 'CIRCUIT_OPEN',
                    category: ErrorCategory.Runtime,
                    severity: ErrorSeverity.Warning,
                    recoverable: true,
                    userMessage: 'Serviço temporariamente indisponível.',
                }));
            }
        }
        try {
            // With retry
            if (options?.retryConfig) {
                const result = await this.withRetry(operation, options.retryConfig);
                if (options?.circuitBreakerId) {
                    this.getCircuitBreaker(options.circuitBreakerId).recordSuccess();
                }
                return exports.Result.ok(result);
            }
            // Without retry
            const result = await operation();
            if (options?.circuitBreakerId) {
                this.getCircuitBreaker(options.circuitBreakerId).recordSuccess();
            }
            return exports.Result.ok(result);
        }
        catch (error) {
            const aethelError = this.normalizeError(error);
            if (options?.circuitBreakerId) {
                this.getCircuitBreaker(options.circuitBreakerId).recordFailure();
            }
            // Try fallback
            if (options?.fallback) {
                try {
                    const fallbackResult = await options.fallback();
                    return exports.Result.ok(fallbackResult);
                }
                catch (fallbackError) {
                    // Fallback also failed
                }
            }
            this.handle(aethelError, {
                context: { metadata: { operation: opName } },
            });
            return exports.Result.err(aethelError);
        }
    }
    /**
     * Execute with retry and exponential backoff
     */
    async withRetry(operation, config) {
        let lastError;
        let delay = config.initialDelayMs;
        for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                // Check if should retry
                if (config.retryOn && !config.retryOn(lastError)) {
                    throw lastError;
                }
                // Last attempt, throw
                if (attempt === config.maxAttempts) {
                    throw lastError;
                }
                // Callback
                config.onRetry?.(attempt, lastError);
                // Wait with backoff
                await this.sleep(Math.min(delay, config.maxDelayMs));
                delay *= config.backoffMultiplier;
            }
        }
        throw lastError;
    }
    /**
     * Add a breadcrumb for error context
     */
    addBreadcrumb(breadcrumb) {
        this.breadcrumbs.push({
            ...breadcrumb,
            timestamp: Date.now(),
        });
        // Trim if too many
        if (this.breadcrumbs.length > this.maxBreadcrumbs) {
            this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
        }
    }
    /**
     * Get or create a circuit breaker
     */
    getCircuitBreaker(id, config) {
        if (!this.circuitBreakers.has(id)) {
            this.circuitBreakers.set(id, new CircuitBreaker(config ?? {
                failureThreshold: 5,
                successThreshold: 2,
                timeoutMs: 30000,
                halfOpenRequests: 1,
            }));
        }
        return this.circuitBreakers.get(id);
    }
    /**
     * Get error statistics
     */
    getStats() {
        const byCategory = {};
        const bySeverity = {};
        for (const report of this.errorReports) {
            byCategory[report.error.category] =
                (byCategory[report.error.category] ?? 0) + 1;
            bySeverity[report.error.severity] =
                (bySeverity[report.error.severity] ?? 0) + 1;
        }
        return {
            totalErrors: this.errorCount,
            sessionId: this.sessionId,
            errorsByCategory: byCategory,
            errorsBySeverity: bySeverity,
            recentErrors: this.errorReports.slice(-10),
        };
    }
    /**
     * Clear error history
     */
    clearHistory() {
        this.errorReports = [];
        this.breadcrumbs = [];
    }
    // ==================== Private Methods ====================
    normalizeError(error) {
        if (error instanceof AethelError) {
            return error;
        }
        // Detect error type from message/name
        const message = error.message.toLowerCase();
        if (message.includes('network') || message.includes('fetch')) {
            return new NetworkError({
                message: error.message,
                cause: error,
            });
        }
        if (message.includes('timeout')) {
            return new TimeoutError({
                operation: 'unknown',
                timeoutMs: 0,
            });
        }
        if (message.includes('not found') || message.includes('404')) {
            return new NotFoundError({
                message: error.message,
                resourceType: 'Resource',
            });
        }
        if (message.includes('unauthorized') || message.includes('401')) {
            return new AuthenticationError({
                message: error.message,
            });
        }
        // Generic error
        return new AethelError({
            message: error.message,
            code: 'UNKNOWN_ERROR',
            category: ErrorCategory.Unknown,
            severity: ErrorSeverity.Error,
            cause: error,
        });
    }
    buildContext(error, extra) {
        return {
            timestamp: Date.now(),
            errorId: this.generateId(),
            sessionId: this.sessionId,
            stack: error.stack,
            breadcrumbs: [...this.breadcrumbs],
            ...extra,
            metadata: {
                ...error.context.metadata,
                ...extra?.metadata,
            },
        };
    }
    logError(error, context) {
        const logLevel = this.getLogLevel(error.severity);
        const logData = {
            errorId: context.errorId,
            code: error.code,
            message: error.message,
            category: error.category,
            severity: error.severity,
            timestamp: new Date(context.timestamp).toISOString(),
        };
        switch (logLevel) {
            case 'debug':
                console.debug('[Aethel Error]', logData);
                break;
            case 'info':
                console.info('[Aethel Error]', logData);
                break;
            case 'warn':
                console.warn('[Aethel Error]', logData);
                break;
            case 'error':
                console.error('[Aethel Error]', logData, error.stack);
                break;
        }
    }
    getLogLevel(severity) {
        switch (severity) {
            case ErrorSeverity.Info:
                return 'info';
            case ErrorSeverity.Warning:
                return 'warn';
            case ErrorSeverity.Error:
            case ErrorSeverity.Critical:
            case ErrorSeverity.Fatal:
                return 'error';
            default:
                return 'error';
        }
    }
    storeReport(report) {
        this.errorReports.push(report);
        if (this.errorReports.length > this.maxReports) {
            this.errorReports = this.errorReports.slice(-this.maxReports);
        }
    }
    setupGlobalHandlers() {
        // Browser environment
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.handle(new Error(event.message), {
                    context: {
                        metadata: {
                            source: 'window.onerror',
                            filename: event.filename,
                            lineno: event.lineno,
                            colno: event.colno,
                        },
                    },
                });
            });
            window.addEventListener('unhandledrejection', (event) => {
                const error = event.reason instanceof Error
                    ? event.reason
                    : new Error(String(event.reason));
                this.handle(error, {
                    context: {
                        metadata: { source: 'unhandledrejection' },
                    },
                });
            });
        }
        // Node environment
        if (typeof process !== 'undefined') {
            process.on('uncaughtException', (error) => {
                this.handle(error, {
                    context: {
                        metadata: { source: 'uncaughtException' },
                    },
                });
            });
            process.on('unhandledRejection', (reason) => {
                const error = reason instanceof Error
                    ? reason
                    : new Error(String(reason));
                this.handle(error, {
                    context: {
                        metadata: { source: 'unhandledRejection' },
                    },
                });
            });
        }
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    dispose() {
        this._onError.dispose();
        this._onRecovery.dispose();
        this.circuitBreakers.clear();
    }
};
exports.ErrorHandler = ErrorHandler;
exports.ErrorHandler = ErrorHandler = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ErrorHandler);
// ==================== Circuit Breaker ====================
/**
 * Circuit Breaker pattern implementation
 */
class CircuitBreaker {
    constructor(config) {
        this.config = config;
        this.state = CircuitState.Closed;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;
        this.halfOpenAttempts = 0;
    }
    canExecute() {
        if (this.state === CircuitState.Closed) {
            return true;
        }
        if (this.state === CircuitState.Open) {
            // Check if timeout has passed
            if (Date.now() - this.lastFailureTime >= this.config.timeoutMs) {
                this.state = CircuitState.HalfOpen;
                this.halfOpenAttempts = 0;
                return true;
            }
            return false;
        }
        // Half-open: allow limited requests
        if (this.state === CircuitState.HalfOpen) {
            return this.halfOpenAttempts < this.config.halfOpenRequests;
        }
        return false;
    }
    recordSuccess() {
        if (this.state === CircuitState.HalfOpen) {
            this.successCount++;
            if (this.successCount >= this.config.successThreshold) {
                this.reset();
            }
        }
        else {
            this.failureCount = 0;
        }
    }
    recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === CircuitState.HalfOpen) {
            this.state = CircuitState.Open;
            this.halfOpenAttempts = 0;
        }
        else if (this.failureCount >= this.config.failureThreshold) {
            this.state = CircuitState.Open;
        }
    }
    reset() {
        this.state = CircuitState.Closed;
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenAttempts = 0;
    }
    getState() {
        return this.state;
    }
    getStats() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
        };
    }
}
exports.CircuitBreaker = CircuitBreaker;
// ==================== Error Boundary ====================
/**
 * Error boundary for component isolation
 */
class ErrorBoundary {
    constructor(options) {
        this.errors = [];
        this.onError = options.onError ?? (() => { });
        this.fallback = options.fallback;
    }
    /**
     * Wrap a synchronous operation
     */
    run(operation, fallbackValue) {
        try {
            return operation();
        }
        catch (error) {
            const aethelError = error instanceof AethelError
                ? error
                : new AethelError({
                    message: error.message,
                    code: 'BOUNDARY_ERROR',
                    cause: error,
                });
            this.errors.push(aethelError);
            this.onError(aethelError);
            this.fallback?.();
            return fallbackValue;
        }
    }
    /**
     * Wrap an async operation
     */
    async runAsync(operation, fallbackValue) {
        try {
            return await operation();
        }
        catch (error) {
            const aethelError = error instanceof AethelError
                ? error
                : new AethelError({
                    message: error.message,
                    code: 'BOUNDARY_ERROR',
                    cause: error,
                });
            this.errors.push(aethelError);
            this.onError(aethelError);
            this.fallback?.();
            return fallbackValue;
        }
    }
    hasErrors() {
        return this.errors.length > 0;
    }
    getErrors() {
        return [...this.errors];
    }
    clearErrors() {
        this.errors = [];
    }
}
exports.ErrorBoundary = ErrorBoundary;
// ==================== Utility Functions ====================
/**
 * Assert condition and throw if false
 */
function assert(condition, message, code = 'ASSERTION_FAILED') {
    if (!condition) {
        throw new AethelError({
            message,
            code,
            severity: ErrorSeverity.Error,
            category: ErrorCategory.Runtime,
        });
    }
}
/**
 * Assert value is not null/undefined
 */
function assertDefined(value, message) {
    if (value == null) {
        throw new AethelError({
            message,
            code: 'NULL_ASSERTION',
            severity: ErrorSeverity.Error,
            category: ErrorCategory.Runtime,
        });
    }
}
/**
 * Safe JSON parse
 */
function safeJsonParse(json, fallback) {
    try {
        return exports.Result.ok(JSON.parse(json));
    }
    catch (error) {
        if (fallback !== undefined) {
            return exports.Result.ok(fallback);
        }
        return exports.Result.err(new AethelError({
            message: `Invalid JSON: ${error.message}`,
            code: 'JSON_PARSE_ERROR',
            category: ErrorCategory.Parsing,
            severity: ErrorSeverity.Error,
        }));
    }
}
/**
 * Timeout wrapper
 */
function withTimeout(promise, timeoutMs, operation = 'operation') {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new TimeoutError({ operation, timeoutMs }));
        }, timeoutMs);
        promise
            .then((result) => {
            clearTimeout(timer);
            resolve(result);
        })
            .catch((error) => {
            clearTimeout(timer);
            reject(error);
        });
    });
}
// Re-export default instance
exports.errorHandler = new ErrorHandler();
