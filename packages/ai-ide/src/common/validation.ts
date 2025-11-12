/**
 * Input validation utilities
 */

import { ValidationError } from './errors';

export interface ValidationRule<T> {
    validate(value: T): boolean;
    message: string;
}

export class Validator {
    static string(value: unknown, field: string, agentId: string): string {
        if (typeof value !== 'string') {
            throw new ValidationError(agentId, field, 'Must be a string');
        }
        return value;
    }

    static stringMinMax(
        value: unknown,
        field: string,
        agentId: string,
        min: number,
        max: number
    ): string {
        const str = this.string(value, field, agentId);
        
        if (str.length < min) {
            throw new ValidationError(
                agentId,
                field,
                `Must be at least ${min} characters`
            );
        }
        
        if (str.length > max) {
            throw new ValidationError(
                agentId,
                field,
                `Must be at most ${max} characters`
            );
        }
        
        return str;
    }

    static number(value: unknown, field: string, agentId: string): number {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new ValidationError(agentId, field, 'Must be a number');
        }
        return value;
    }

    static numberRange(
        value: unknown,
        field: string,
        agentId: string,
        min: number,
        max: number
    ): number {
        const num = this.number(value, field, agentId);
        
        if (num < min || num > max) {
            throw new ValidationError(
                agentId,
                field,
                `Must be between ${min} and ${max}`
            );
        }
        
        return num;
    }

    static array<T>(
        value: unknown,
        field: string,
        agentId: string
    ): T[] {
        if (!Array.isArray(value)) {
            throw new ValidationError(agentId, field, 'Must be an array');
        }
        return value as T[];
    }

    static arrayMinMax<T>(
        value: unknown,
        field: string,
        agentId: string,
        min: number,
        max: number
    ): T[] {
        const arr = this.array<T>(value, field, agentId);
        
        if (arr.length < min) {
            throw new ValidationError(
                agentId,
                field,
                `Must have at least ${min} items`
            );
        }
        
        if (arr.length > max) {
            throw new ValidationError(
                agentId,
                field,
                `Must have at most ${max} items`
            );
        }
        
        return arr;
    }

    static enum<T>(
        value: unknown,
        field: string,
        agentId: string,
        allowedValues: T[]
    ): T {
        if (!allowedValues.includes(value as T)) {
            throw new ValidationError(
                agentId,
                field,
                `Must be one of: ${allowedValues.join(', ')}`
            );
        }
        return value as T;
    }

    static object(value: unknown, field: string, agentId: string): Record<string, unknown> {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new ValidationError(agentId, field, 'Must be an object');
        }
        return value as Record<string, unknown>;
    }

    static optional<T>(
        value: unknown,
        validator: (value: unknown) => T
    ): T | undefined {
        if (value === undefined || value === null) {
            return undefined;
        }
        return validator(value);
    }
}

// Example usage:
// const messages = Validator.arrayMinMax(request.messages, 'messages', 'architect', 1, 100);
// const content = Validator.stringMinMax(message.content, 'content', 'architect', 1, 10000);
