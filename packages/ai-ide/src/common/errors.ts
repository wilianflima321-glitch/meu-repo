/**
 * Structured error classes for AI IDE
 */

export class AgentError extends Error {
    constructor(
        public readonly code: string,
        public readonly agentId: string,
        message: string,
        public readonly recoverable: boolean = true,
        public readonly metadata?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'AgentError';
        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            agentId: this.agentId,
            message: this.message,
            recoverable: this.recoverable,
            metadata: this.metadata
        };
    }
}

export class InsufficientCreditsError extends AgentError {
    constructor(
        agentId: string,
        required: number,
        available: number
    ) {
        super(
            'INSUFFICIENT_CREDITS',
            agentId,
            `Insufficient credits. Required: ${required}, Available: ${available}`,
            false,
            { required, available }
        );
    }
}

export class RateLimitError extends AgentError {
    constructor(
        agentId: string,
        limit: number,
        resetAt: Date
    ) {
        super(
            'RATE_LIMIT_EXCEEDED',
            agentId,
            `Rate limit exceeded. Limit: ${limit} requests. Resets at: ${resetAt.toISOString()}`,
            true,
            { limit, resetAt: resetAt.toISOString() }
        );
    }
}

export class ValidationError extends AgentError {
    constructor(
        agentId: string,
        field: string,
        reason: string
    ) {
        super(
            'VALIDATION_ERROR',
            agentId,
            `Validation failed for field '${field}': ${reason}`,
            true,
            { field, reason }
        );
    }
}

export class ProviderError extends AgentError {
    constructor(
        agentId: string,
        providerId: string,
        originalError: Error
    ) {
        super(
            'PROVIDER_ERROR',
            agentId,
            `Provider '${providerId}' failed: ${originalError.message}`,
            true,
            { providerId, originalError: originalError.message }
        );
    }
}

export class TimeoutError extends AgentError {
    constructor(
        agentId: string,
        timeoutMs: number
    ) {
        super(
            'TIMEOUT',
            agentId,
            `Operation timed out after ${timeoutMs}ms`,
            true,
            { timeoutMs }
        );
    }
}

export class QuotaExceededError extends AgentError {
    constructor(
        agentId: string,
        quotaType: string,
        limit: number
    ) {
        super(
            'QUOTA_EXCEEDED',
            agentId,
            `${quotaType} quota exceeded. Limit: ${limit}`,
            false,
            { quotaType, limit }
        );
    }
}
