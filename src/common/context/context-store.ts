import { injectable, inject } from 'inversify';
import { Emitter, Event } from '@theia/core';

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
  timeRange?: { start: number; end: number };
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
@injectable()
export class ContextStore {
  private contexts: Map<string, ContextEntry> = new Map();
  private versions: Map<string, ContextVersion[]> = new Map();
  private auditLog: ContextAuditEvent[] = [];
  
  private readonly onDidChangeContextEmitter = new Emitter<ContextEntry>();
  readonly onDidChangeContext: Event<ContextEntry> = this.onDidChangeContextEmitter.event;

  /**
   * Store a new context entry
   */
  async store(entry: Omit<ContextEntry, 'id' | 'metadata' | 'signature'>): Promise<ContextEntry> {
    const id = this.generateId();
    const timestamp = Date.now();
    
    const fullEntry: ContextEntry = {
      ...entry,
      id,
      metadata: {
        createdAt: timestamp,
        createdBy: 'system', // TODO: Get from auth context
        version: 1,
        tags: [],
      },
      signature: this.sign(entry.content),
    };

    this.contexts.set(id, fullEntry);
    this.versions.set(id, [{
      version: 1,
      timestamp,
      author: fullEntry.metadata.createdBy,
      changes: 'Initial version',
      snapshot: entry.content,
    }]);

    await this.audit({
      id: this.generateId(),
      contextId: id,
      action: 'create',
      userId: fullEntry.metadata.createdBy,
      timestamp,
      metadata: { domain: entry.domain, type: entry.type },
    });

    this.onDidChangeContextEmitter.fire(fullEntry);
    return fullEntry;
  }

  /**
   * Retrieve context by ID
   */
  async get(id: string, userId: string): Promise<ContextEntry | undefined> {
    const entry = this.contexts.get(id);
    
    if (entry) {
      await this.audit({
        id: this.generateId(),
        contextId: id,
        action: 'read',
        userId,
        timestamp: Date.now(),
        metadata: {},
      });
    }

    return entry;
  }

  /**
   * Query contexts with filters
   */
  async query(query: ContextQuery, userId: string): Promise<ContextEntry[]> {
    let results = Array.from(this.contexts.values()).filter(
      entry => entry.workspaceId === query.workspaceId
    );

    if (query.domain) {
      results = results.filter(entry => entry.domain === query.domain);
    }

    if (query.type && query.type.length > 0) {
      results = results.filter(entry => query.type!.includes(entry.type));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(entry =>
        query.tags!.some(tag => entry.metadata.tags.includes(tag))
      );
    }

    if (query.timeRange) {
      results = results.filter(
        entry =>
          entry.metadata.createdAt >= query.timeRange!.start &&
          entry.metadata.createdAt <= query.timeRange!.end
      );
    }

    if (query.minRelevance !== undefined) {
      results = results.filter(
        entry =>
          entry.metadata.relevanceScore !== undefined &&
          entry.metadata.relevanceScore >= query.minRelevance!
      );
    }

    // Semantic search if query provided
    if (query.semanticQuery) {
      results = await this.semanticSearch(results, query.semanticQuery);
    }

    // Sort by relevance or recency
    results.sort((a, b) => {
      if (a.metadata.relevanceScore && b.metadata.relevanceScore) {
        return b.metadata.relevanceScore - a.metadata.relevanceScore;
      }
      return b.metadata.createdAt - a.metadata.createdAt;
    });

    const limited = query.limit ? results.slice(0, query.limit) : results;

    // Audit bulk read
    await this.audit({
      id: this.generateId(),
      contextId: 'bulk',
      action: 'read',
      userId,
      timestamp: Date.now(),
      metadata: { query, resultCount: limited.length },
    });

    return limited;
  }

  /**
   * Update context (creates new version)
   */
  async update(
    id: string,
    updates: Partial<ContextEntry>,
    userId: string,
    changes: string
  ): Promise<ContextEntry | undefined> {
    const existing = this.contexts.get(id);
    if (!existing) {
      return undefined;
    }

    const timestamp = Date.now();
    const newVersion = existing.metadata.version + 1;

    const updated: ContextEntry = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        version: newVersion,
        parentVersion: existing.metadata.version,
      },
      signature: this.sign(updates.content || existing.content),
    };

    this.contexts.set(id, updated);

    // Store version history
    const versionHistory = this.versions.get(id) || [];
    versionHistory.push({
      version: newVersion,
      timestamp,
      author: userId,
      changes,
      snapshot: updated.content,
    });
    this.versions.set(id, versionHistory);

    await this.audit({
      id: this.generateId(),
      contextId: id,
      action: 'update',
      userId,
      timestamp,
      metadata: { changes, version: newVersion },
    });

    this.onDidChangeContextEmitter.fire(updated);
    return updated;
  }

  /**
   * Fork context (create branch)
   */
  async fork(
    id: string,
    userId: string,
    reason: string
  ): Promise<ContextEntry | undefined> {
    const original = this.contexts.get(id);
    if (!original) {
      return undefined;
    }

    const forked = await this.store({
      workspaceId: original.workspaceId,
      domain: original.domain,
      type: original.type,
      content: { ...original.content },
    });

    await this.audit({
      id: this.generateId(),
      contextId: forked.id,
      action: 'fork',
      userId,
      timestamp: Date.now(),
      metadata: { originalId: id, reason },
    });

    return forked;
  }

  /**
   * Get version history
   */
  async getVersionHistory(id: string): Promise<ContextVersion[]> {
    return this.versions.get(id) || [];
  }

  /**
   * Restore specific version
   */
  async restoreVersion(
    id: string,
    version: number,
    userId: string
  ): Promise<ContextEntry | undefined> {
    const versionHistory = this.versions.get(id);
    if (!versionHistory) {
      return undefined;
    }

    const targetVersion = versionHistory.find(v => v.version === version);
    if (!targetVersion) {
      return undefined;
    }

    return this.update(
      id,
      { content: targetVersion.snapshot },
      userId,
      `Restored to version ${version}`
    );
  }

  /**
   * Delete context (soft delete with audit)
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const entry = this.contexts.get(id);
    if (!entry) {
      return false;
    }

    this.contexts.delete(id);

    await this.audit({
      id: this.generateId(),
      contextId: id,
      action: 'delete',
      userId,
      timestamp: Date.now(),
      metadata: { domain: entry.domain, type: entry.type },
    });

    return true;
  }

  /**
   * Get audit trail for context
   */
  async getAuditTrail(contextId: string): Promise<ContextAuditEvent[]> {
    return this.auditLog.filter(event => event.contextId === contextId);
  }

  /**
   * Get all audit events in time range
   */
  async getAuditLog(
    workspaceId: string,
    timeRange?: { start: number; end: number }
  ): Promise<ContextAuditEvent[]> {
    let events = this.auditLog;

    if (timeRange) {
      events = events.filter(
        event =>
          event.timestamp >= timeRange.start &&
          event.timestamp <= timeRange.end
      );
    }

    return events;
  }

  /**
   * Prune old contexts (retention policy)
   */
  async prune(retentionDays: number): Promise<number> {
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let pruned = 0;

    for (const [id, entry] of this.contexts.entries()) {
      if (entry.metadata.createdAt < cutoff) {
        this.contexts.delete(id);
        this.versions.delete(id);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Export context for backup
   */
  async export(workspaceId: string): Promise<string> {
    const entries = Array.from(this.contexts.values()).filter(
      entry => entry.workspaceId === workspaceId
    );

    const exportData = {
      version: '1.0',
      timestamp: Date.now(),
      workspaceId,
      contexts: entries,
      versions: Object.fromEntries(this.versions),
      auditLog: this.auditLog.filter(event =>
        entries.some(e => e.id === event.contextId)
      ),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import context from backup
   */
  async import(data: string): Promise<number> {
    const parsed = JSON.parse(data);
    let imported = 0;

    for (const entry of parsed.contexts) {
      this.contexts.set(entry.id, entry);
      imported++;
    }

    for (const [id, versions] of Object.entries(parsed.versions as any)) {
      this.versions.set(id, versions);
    }

    this.auditLog.push(...parsed.auditLog);

    return imported;
  }

  // Private helpers

  private generateId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sign(content: any): string {
    // Simple hash for now - in production use crypto.subtle
    const str = JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private async audit(event: ContextAuditEvent): Promise<void> {
    this.auditLog.push(event);
    
    // Keep audit log bounded (last 10k events)
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }

  private async semanticSearch(
    entries: ContextEntry[],
    query: string
  ): Promise<ContextEntry[]> {
    // TODO: Implement vector similarity search
    // For now, simple text matching
    const lowerQuery = query.toLowerCase();
    
    return entries.filter(entry => {
      const content = JSON.stringify(entry.content).toLowerCase();
      return content.includes(lowerQuery);
    }).map(entry => ({
      ...entry,
      metadata: {
        ...entry.metadata,
        relevanceScore: this.calculateRelevance(entry, query),
      },
    }));
  }

  private calculateRelevance(entry: ContextEntry, query: string): number {
    const content = JSON.stringify(entry.content).toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Simple relevance: count occurrences
    const matches = (content.match(new RegExp(lowerQuery, 'g')) || []).length;
    return Math.min(matches / 10, 1.0);
  }
}
