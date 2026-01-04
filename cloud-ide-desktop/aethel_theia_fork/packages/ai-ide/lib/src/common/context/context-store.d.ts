import { Event } from '@theia/core';
/**
 * Context entry with versioning and metadata
 */
export interface ContextEntry {
    id: string;
    workspaceId: string;
    domain: 'code' | 'trading' | 'research' | 'creative';
    type: 'file' | 'conversation' | 'execution' | 'artifact' | 'decision';
    content: any;
    metadata: {
        createdAt: number;
        createdBy: string;
        version: number;
        parentVersion?: number;
        tags: string[];
        relevanceScore?: number;
    };
    embedding?: number[];
    signature: string;
}
/**
 * Context query with filters
 */
export interface ContextQuery {
    workspaceId: string;
    domain?: 'code' | 'trading' | 'research' | 'creative';
    type?: string[];
    tags?: string[];
    timeRange?: {
        start: number;
        end: number;
    };
    limit?: number;
    minRelevance?: number;
    semanticQuery?: string;
}
/**
 * Context version history
 */
export interface ContextVersion {
    version: number;
    timestamp: number;
    author: string;
    changes: string;
    snapshot: any;
}
/**
 * Context audit event
 */
export interface ContextAuditEvent {
    id: string;
    contextId: string;
    action: 'create' | 'read' | 'update' | 'delete' | 'fork';
    userId: string;
    timestamp: number;
    metadata: any;
}
/**
 * Unified context store with versioning and audit trails
 * Provides shared memory across agents with immutable history
 */
export declare class ContextStore {
    private contexts;
    private versions;
    private auditLog;
    private readonly onDidChangeContextEmitter;
    readonly onDidChangeContext: Event<ContextEntry>;
    /**
     * Store a new context entry
     */
    store(entry: Omit<ContextEntry, 'id' | 'metadata' | 'signature'>): Promise<ContextEntry>;
    /**
     * Retrieve context by ID
     */
    get(id: string, userId: string): Promise<ContextEntry | undefined>;
    /**
     * Query contexts with filters
     */
    query(query: ContextQuery, userId: string): Promise<ContextEntry[]>;
    /**
     * Update context (creates new version)
     */
    update(id: string, updates: Partial<ContextEntry>, userId: string, changes: string): Promise<ContextEntry | undefined>;
    /**
     * Fork context (create branch)
     */
    fork(id: string, userId: string, reason: string): Promise<ContextEntry | undefined>;
    /**
     * Get version history
     */
    getVersionHistory(id: string): Promise<ContextVersion[]>;
    /**
     * Restore specific version
     */
    restoreVersion(id: string, version: number, userId: string): Promise<ContextEntry | undefined>;
    /**
     * Delete context (soft delete with audit)
     */
    delete(id: string, userId: string): Promise<boolean>;
    /**
     * Get audit trail for context
     */
    getAuditTrail(contextId: string): Promise<ContextAuditEvent[]>;
    /**
     * Get all audit events in time range
     */
    getAuditLog(workspaceId: string, timeRange?: {
        start: number;
        end: number;
    }): Promise<ContextAuditEvent[]>;
    /**
     * Prune old contexts (retention policy)
     */
    prune(retentionDays: number): Promise<number>;
    /**
     * Export context for backup
     */
    export(workspaceId: string): Promise<string>;
    /**
     * Import context from backup
     */
    import(data: string): Promise<number>;
    private generateId;
    private sign;
    private audit;
    private semanticSearch;
    private calculateRelevance;
}
