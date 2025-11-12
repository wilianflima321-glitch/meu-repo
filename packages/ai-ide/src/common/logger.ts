/**
 * Structured logger for AI IDE
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export interface LogContext {
    agent?: string;
    operation?: string;
    userId?: string;
    requestId?: string;
    duration?: number;
    [key: string]: unknown;
}

export class Logger {
    private level: LogLevel = LogLevel.INFO;
    private context: LogContext = {};

    constructor(context?: LogContext) {
        if (context) {
            this.context = context;
        }
    }

    setLevel(level: LogLevel): void {
        this.level = level;
    }

    child(context: LogContext): Logger {
        const child = new Logger({ ...this.context, ...context });
        child.setLevel(this.level);
        return child;
    }

    debug(message: string, context?: LogContext): void {
        if (this.level <= LogLevel.DEBUG) {
            this.log('DEBUG', message, context);
        }
    }

    info(message: string, context?: LogContext): void {
        if (this.level <= LogLevel.INFO) {
            this.log('INFO', message, context);
        }
    }

    warn(message: string, context?: LogContext): void {
        if (this.level <= LogLevel.WARN) {
            this.log('WARN', message, context);
        }
    }

    error(message: string, error?: Error, context?: LogContext): void {
        if (this.level <= LogLevel.ERROR) {
            const errorContext = error ? {
                error: error.message,
                stack: error.stack,
                ...context
            } : context;
            this.log('ERROR', message, errorContext);
        }
    }

    private log(level: string, message: string, context?: LogContext): void {
        const timestamp = new Date().toISOString();
        const fullContext = { ...this.context, ...context };
        
        const logEntry = {
            timestamp,
            level,
            message,
            ...fullContext
        };

        // In production, send to logging service
        // For now, use console with formatting
        const formatted = this.format(logEntry);
        
        switch (level) {
            case 'DEBUG':
                console.debug(formatted);
                break;
            case 'INFO':
                console.info(formatted);
                break;
            case 'WARN':
                console.warn(formatted);
                break;
            case 'ERROR':
                console.error(formatted);
                break;
        }
    }

    private format(entry: any): string {
        const { timestamp, level, message, ...context } = entry;
        
        let formatted = `[${timestamp}] ${level.padEnd(5)} ${message}`;
        
        if (Object.keys(context).length > 0) {
            formatted += ` ${JSON.stringify(context)}`;
        }
        
        return formatted;
    }
}

// Global logger instance
export const logger = new Logger();

// Helper to create agent-specific logger
export function createAgentLogger(agentId: string): Logger {
    return logger.child({ agent: agentId });
}
