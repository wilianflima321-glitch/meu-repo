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

import { injectable, inject, optional } from 'inversify';

// ==================== Event Emitter ====================

type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
  private listeners: Array<(e: T) => void> = [];

  get event(): Event<T> {
    return (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return {
        dispose: () => {
          const idx = this.listeners.indexOf(listener);
          if (idx >= 0) this.listeners.splice(idx, 1);
        },
      };
    };
  }

  fire(event: T): void {
    this.listeners.forEach((l) => {
      try {
        l(event);
      } catch (e) {
        console.error('Error in event listener:', e);
      }
    });
  }

  dispose(): void {
    this.listeners = [];
  }
}

// ==================== Error Types & Enums ====================

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  /** Informational, não afeta funcionamento */
  Info = 'info',
  /** Warning, funcionalidade degradada mas funcional */
  Warning = 'warning',
  /** Error, funcionalidade comprometida */
  Error = 'error',
  /** Critical, sistema instável */
  Critical = 'critical',
  /** Fatal, sistema deve parar */
  Fatal = 'fatal',
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  /** Errors de rede/API */
  Network = 'network',
  /** Errors de validação */
  Validation = 'validation',
  /** Errors de autenticação */
  Authentication = 'authentication',
  /** Errors de autorização */
  Authorization = 'authorization',
  /** Errors de I/O */
  IO = 'io',
  /** Errors de parsing */
  Parsing = 'parsing',
  /** Errors de configuração */
  Configuration = 'configuration',
  /** Errors de runtime */
  Runtime = 'runtime',
  /** Errors de timeout */
  Timeout = 'timeout',
  /** Errors de recursos */
  Resource = 'resource',
  /** Errors de dependência */
  Dependency = 'dependency',
  /** Errors de concorrência */
  Concurrency = 'concurrency',
  /** Errors de estado */
  State = 'state',
  /** Errors desconhecidos */
  Unknown = 'unknown',
}

/**
 * Recovery strategy types
 */
export enum RecoveryStrategy {
  /** Não tentar recovery */
  None = 'none',
  /** Retry com backoff */
  Retry = 'retry',
  /** Fallback para alternativa */
  Fallback = 'fallback',
  /** Ignorar e continuar */
  Ignore = 'ignore',
  /** Reiniciar componente */
  Restart = 'restart',
  /** Rollback para estado anterior */
  Rollback = 'rollback',
  /** Pedir intervenção do usuário */
  UserIntervention = 'user_intervention',
  /** Degradar funcionalidade */
  Degrade = 'degrade',
}

/**
 * Circuit breaker state
 */
export enum CircuitState {
  Closed = 'closed',
  Open = 'open',
  HalfOpen = 'half_open',
}

// ==================== Error Interfaces ====================

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

// ==================== Custom Error Classes ====================

/**
 * Base error class for Aethel IDE
 */
export class AethelError extends Error {
  public readonly code: string;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly recoverable: boolean;
  public readonly userMessage: string;
  public readonly context: Partial<ErrorContext>;
  public readonly cause?: Error;
  public readonly timestamp: number;

  constructor(options: {
    message: string;
    code: string;
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    recoverable?: boolean;
    userMessage?: string;
    context?: Partial<ErrorContext>;
    cause?: Error;
  }) {
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

  private getDefaultUserMessage(): string {
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

  toJSON(): Record<string, unknown> {
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

/**
 * Network-related errors
 */
export class NetworkError extends AethelError {
  public readonly statusCode?: number;
  public readonly url?: string;

  constructor(options: {
    message: string;
    code?: string;
    statusCode?: number;
    url?: string;
    cause?: Error;
    context?: Partial<ErrorContext>;
  }) {
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

/**
 * Validation errors
 */
export class ValidationError extends AethelError {
  public readonly field?: string;
  public readonly value?: unknown;
  public readonly constraints?: string[];

  constructor(options: {
    message: string;
    field?: string;
    value?: unknown;
    constraints?: string[];
    context?: Partial<ErrorContext>;
  }) {
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

/**
 * Authentication errors
 */
export class AuthenticationError extends AethelError {
  constructor(options: {
    message: string;
    code?: string;
    context?: Partial<ErrorContext>;
  }) {
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

/**
 * Resource not found errors
 */
export class NotFoundError extends AethelError {
  public readonly resourceType: string;
  public readonly resourceId?: string;

  constructor(options: {
    message: string;
    resourceType: string;
    resourceId?: string;
    context?: Partial<ErrorContext>;
  }) {
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

/**
 * Timeout errors
 */
export class TimeoutError extends AethelError {
  public readonly timeoutMs: number;
  public readonly operation: string;

  constructor(options: {
    operation: string;
    timeoutMs: number;
    context?: Partial<ErrorContext>;
  }) {
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

/**
 * Configuration errors
 */
export class ConfigurationError extends AethelError {
  public readonly configKey?: string;

  constructor(options: {
    message: string;
    configKey?: string;
    context?: Partial<ErrorContext>;
  }) {
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

// ==================== Result Type (Rust-inspired) ====================

/**
 * Result type for operations that can fail
 * Inspired by Rust's Result<T, E>
 */
export type Result<T, E = AethelError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Result = {
  ok<T>(value: T): Result<T, never> {
    return { ok: true, value };
  },

  err<E>(error: E): Result<never, E> {
    return { ok: false, error };
  },

  isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
    return result.ok;
  },

  isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
    return !result.ok;
  },

  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return result.ok ? Result.ok(fn(result.value)) : result;
  },

  mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    return result.ok ? result : Result.err(fn(result.error));
  },

  unwrap<T, E>(result: Result<T, E>): T {
    if (result.ok) return result.value;
    throw result.error;
  },

  unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
    return result.ok ? result.value : defaultValue;
  },

  async fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
    try {
      const value = await promise;
      return Result.ok(value);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  },
};

// ==================== Option Type (Rust-inspired) ====================

/**
 * Option type for nullable values
 * Inspired by Rust's Option<T>
 */
export type Option<T> = { some: true; value: T } | { some: false };

export const Option = {
  some<T>(value: T): Option<T> {
    return { some: true, value };
  },

  none<T>(): Option<T> {
    return { some: false };
  },

  isSome<T>(option: Option<T>): option is { some: true; value: T } {
    return option.some;
  },

  isNone<T>(option: Option<T>): option is { some: false } {
    return !option.some;
  },

  map<T, U>(option: Option<T>, fn: (value: T) => U): Option<U> {
    return option.some ? Option.some(fn(option.value)) : Option.none();
  },

  unwrap<T>(option: Option<T>): T {
    if (option.some) return option.value;
    throw new Error('Called unwrap on None');
  },

  unwrapOr<T>(option: Option<T>, defaultValue: T): T {
    return option.some ? option.value : defaultValue;
  },

  fromNullable<T>(value: T | null | undefined): Option<T> {
    return value != null ? Option.some(value) : Option.none();
  },
};

// ==================== Error Handler Service ====================

export const ErrorHandlerSymbol = Symbol('ErrorHandler');

/**
 * Central error handling service
 */
@injectable()
export class ErrorHandler {
  private readonly _onError = new Emitter<ErrorReport>();
  private readonly _onRecovery = new Emitter<RecoveryResult>();
  
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private readonly maxBreadcrumbs = 100;
  private errorCount = 0;
  private sessionId: string;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorReports: ErrorReport[] = [];
  private readonly maxReports = 1000;

  readonly onError: Event<ErrorReport> = this._onError.event;
  readonly onRecovery: Event<RecoveryResult> = this._onRecovery.event;

  constructor() {
    this.sessionId = this.generateId();
    this.setupGlobalHandlers();
  }

  /**
   * Handle an error with full context
   */
  handle(error: Error | AethelError, options?: {
    context?: Partial<ErrorContext>;
    recovery?: RecoveryStrategy;
    notify?: boolean;
  }): ErrorReport {
    const aethelError = this.normalizeError(error);
    const context = this.buildContext(aethelError, options?.context);
    
    const report: ErrorReport = {
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
  async wrap<T>(
    operation: () => Promise<T>,
    options?: {
      operationName?: string;
      retryConfig?: RetryConfig;
      fallback?: () => T | Promise<T>;
      circuitBreakerId?: string;
    }
  ): Promise<Result<T, AethelError>> {
    const opName = options?.operationName ?? 'unknown';

    // Check circuit breaker
    if (options?.circuitBreakerId) {
      const breaker = this.getCircuitBreaker(options.circuitBreakerId);
      if (!breaker.canExecute()) {
        return Result.err(
          new AethelError({
            message: `Circuit breaker open for ${options.circuitBreakerId}`,
            code: 'CIRCUIT_OPEN',
            category: ErrorCategory.Runtime,
            severity: ErrorSeverity.Warning,
            recoverable: true,
            userMessage: 'Serviço temporariamente indisponível.',
          })
        );
      }
    }

    try {
      // With retry
      if (options?.retryConfig) {
        const result = await this.withRetry(operation, options.retryConfig);
        
        if (options?.circuitBreakerId) {
          this.getCircuitBreaker(options.circuitBreakerId).recordSuccess();
        }
        
        return Result.ok(result);
      }

      // Without retry
      const result = await operation();
      
      if (options?.circuitBreakerId) {
        this.getCircuitBreaker(options.circuitBreakerId).recordSuccess();
      }
      
      return Result.ok(result);
    } catch (error) {
      const aethelError = this.normalizeError(error as Error);
      
      if (options?.circuitBreakerId) {
        this.getCircuitBreaker(options.circuitBreakerId).recordFailure();
      }

      // Try fallback
      if (options?.fallback) {
        try {
          const fallbackResult = await options.fallback();
          return Result.ok(fallbackResult);
        } catch (fallbackError) {
          // Fallback also failed
        }
      }

      this.handle(aethelError, {
        context: { metadata: { operation: opName } },
      });

      return Result.err(aethelError);
    }
  }

  /**
   * Execute with retry and exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = config.initialDelayMs;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

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

    throw lastError!;
  }

  /**
   * Add a breadcrumb for error context
   */
  addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void {
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
  getCircuitBreaker(
    id: string,
    config?: CircuitBreakerConfig
  ): CircuitBreaker {
    if (!this.circuitBreakers.has(id)) {
      this.circuitBreakers.set(
        id,
        new CircuitBreaker(
          config ?? {
            failureThreshold: 5,
            successThreshold: 2,
            timeoutMs: 30000,
            halfOpenRequests: 1,
          }
        )
      );
    }
    return this.circuitBreakers.get(id)!;
  }

  /**
   * Get error statistics
   */
  getStats(): {
    totalErrors: number;
    sessionId: string;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recentErrors: ErrorReport[];
  } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

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
  clearHistory(): void {
    this.errorReports = [];
    this.breadcrumbs = [];
  }

  // ==================== Private Methods ====================

  private normalizeError(error: Error | AethelError): AethelError {
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

  private buildContext(
    error: AethelError,
    extra?: Partial<ErrorContext>
  ): ErrorContext {
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

  private logError(error: AethelError, context: ErrorContext): void {
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

  private getLogLevel(
    severity: ErrorSeverity
  ): 'debug' | 'info' | 'warn' | 'error' {
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

  private storeReport(report: ErrorReport): void {
    this.errorReports.push(report);
    if (this.errorReports.length > this.maxReports) {
      this.errorReports = this.errorReports.slice(-this.maxReports);
    }
  }

  private setupGlobalHandlers(): void {
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

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  dispose(): void {
    this._onError.dispose();
    this._onRecovery.dispose();
    this.circuitBreakers.clear();
  }
}

// ==================== Circuit Breaker ====================

/**
 * Circuit Breaker pattern implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.Closed;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;

  constructor(private config: CircuitBreakerConfig) {}

  canExecute(): boolean {
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

  recordSuccess(): void {
    if (this.state === CircuitState.HalfOpen) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    } else {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HalfOpen) {
      this.state = CircuitState.Open;
      this.halfOpenAttempts = 0;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.Open;
    }
  }

  reset(): void {
    this.state = CircuitState.Closed;
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// ==================== Error Boundary ====================

/**
 * Error boundary for component isolation
 */
export class ErrorBoundary {
  private errors: AethelError[] = [];
  private readonly onError: (error: AethelError) => void;
  private readonly fallback?: () => void;

  constructor(options: {
    onError?: (error: AethelError) => void;
    fallback?: () => void;
  }) {
    this.onError = options.onError ?? (() => {});
    this.fallback = options.fallback;
  }

  /**
   * Wrap a synchronous operation
   */
  run<T>(operation: () => T, fallbackValue?: T): T | undefined {
    try {
      return operation();
    } catch (error) {
      const aethelError = error instanceof AethelError
        ? error
        : new AethelError({
            message: (error as Error).message,
            code: 'BOUNDARY_ERROR',
            cause: error as Error,
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
  async runAsync<T>(
    operation: () => Promise<T>,
    fallbackValue?: T
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      const aethelError = error instanceof AethelError
        ? error
        : new AethelError({
            message: (error as Error).message,
            code: 'BOUNDARY_ERROR',
            cause: error as Error,
          });

      this.errors.push(aethelError);
      this.onError(aethelError);
      this.fallback?.();
      return fallbackValue;
    }
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): AethelError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }
}

// ==================== Utility Functions ====================

/**
 * Assert condition and throw if false
 */
export function assert(
  condition: boolean,
  message: string,
  code = 'ASSERTION_FAILED'
): asserts condition {
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
export function assertDefined<T>(
  value: T | null | undefined,
  message: string
): asserts value is T {
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
export function safeJsonParse<T>(
  json: string,
  fallback?: T
): Result<T, AethelError> {
  try {
    return Result.ok(JSON.parse(json) as T);
  } catch (error) {
    if (fallback !== undefined) {
      return Result.ok(fallback);
    }
    return Result.err(
      new AethelError({
        message: `Invalid JSON: ${(error as Error).message}`,
        code: 'JSON_PARSE_ERROR',
        category: ErrorCategory.Parsing,
        severity: ErrorSeverity.Error,
      })
    );
  }
}

/**
 * Timeout wrapper
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation = 'operation'
): Promise<T> {
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

// ==================== Exports ====================

export { Emitter };

// Re-export default instance
export const errorHandler = new ErrorHandler();
