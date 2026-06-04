/**
 * Shared contracts for the Aethel rate-limiting spine.
 */

// ============================================================================
// TYPES
// ============================================================================

export type RateLimitAlgorithm = 'sliding_window' | 'token_bucket' | 'fixed_window' | 'leaky_bucket';

export type RateLimitIdentifier = 'ip' | 'user' | 'api_key' | 'custom';

export interface RateLimitConfig {
  name: string;
  algorithm: RateLimitAlgorithm;
  limit: number;
  window: number; // seconds
  identifier: RateLimitIdentifier;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  onLimitReached?: (key: string, info: RateLimitInfo) => void;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // timestamp
  retryAfter?: number; // seconds
  used: number;
}

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
  key: string;
}

export interface QuotaConfig {
  name: string;
  limit: number;
  period: 'minute' | 'hour' | 'day' | 'week' | 'month';
  resource: string;
}

export interface QuotaUsage {
  quota: string;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
  percentUsed: number;
}

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

export interface RateLimitStorage {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttl: number): Promise<void>;
  incr(key: string, ttl: number): Promise<number>;
  decr(key: string): Promise<number>;
  delete(key: string): Promise<void>;
  getMulti(keys: string[]): Promise<(number | null)[]>;
}
