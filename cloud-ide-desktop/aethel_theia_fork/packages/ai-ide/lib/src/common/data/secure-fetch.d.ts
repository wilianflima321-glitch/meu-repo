import { Event } from '@theia/core';
/**
 * Fetch policy
 */
export interface FetchPolicy {
    domain: string;
    allowed: boolean;
    rateLimit: {
        requestsPerMinute: number;
        requestsPerHour: number;
    };
    requiresAuth: boolean;
    respectRobotsTxt: boolean;
    maskPII: boolean;
    retentionDays: number;
}
/**
 * Fetch request
 */
export interface FetchRequest {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: any;
    userId: string;
    workspaceId: string;
    purpose: string;
}
/**
 * Fetch result
 */
export interface FetchResult {
    url: string;
    status: number;
    content: string;
    contentType: string;
    timestamp: number;
    masked: boolean;
    sources: string[];
    auditId: string;
}
/**
 * Audit entry
 */
interface FetchAudit {
    id: string;
    url: string;
    userId: string;
    workspaceId: string;
    purpose: string;
    timestamp: number;
    status: 'success' | 'blocked' | 'failed';
    reason?: string;
    contentHash?: string;
}
/**
 * Secure fetch service with ToS/robots.txt compliance and PII masking
 */
export declare class SecureFetch {
    private policies;
    private robotsTxtCache;
    private rateLimits;
    private auditLog;
    private allowList;
    private denyList;
    private readonly onRateLimitExceededEmitter;
    readonly onRateLimitExceeded: Event<{
        domain: string;
    }>;
    private readonly onBlockedFetchEmitter;
    readonly onBlockedFetch: Event<{
        url: string;
        reason: string;
    }>;
    constructor();
    /**
     * Fetch URL with all safety checks
     */
    fetch(request: FetchRequest): Promise<FetchResult>;
    /**
     * Mask PII in content
     */
    maskPII(content: string): string;
    /**
     * Check if URL is allowed by robots.txt
     */
    checkRobotsTxt(url: string): Promise<boolean>;
    /**
     * Get audit trail
     */
    getAuditTrail(workspaceId: string, timeRange?: {
        start: number;
        end: number;
    }): FetchAudit[];
    /**
     * Export audit trail
     */
    exportAuditTrail(workspaceId: string): string;
    /**
     * Add domain to allow list
     */
    addToAllowList(domain: string): void;
    /**
     * Add domain to deny list
     */
    addToDenyList(domain: string): void;
    /**
     * Set policy for domain
     */
    setPolicy(domain: string, policy: FetchPolicy): void;
    private initializePolicies;
    private initializeLists;
    private createDefaultPolicy;
    private checkRateLimit;
    private recordRequest;
    private fetchRobotsTxt;
    private parseRobotsTxt;
    private performFetch;
    private extractDomain;
    private generateAuditId;
    private hash;
    private audit;
}
export {};
