"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextStore = void 0;
const inversify_1 = require("inversify");
const core_1 = require("@theia/core");
/**
 * Unified context store with versioning and audit trails
 * Provides shared memory across agents with immutable history
 */
let ContextStore = class ContextStore {
    constructor() {
        this.contexts = new Map();
        this.versions = new Map();
        this.auditLog = [];
        this.onDidChangeContextEmitter = new core_1.Emitter();
        this.onDidChangeContext = this.onDidChangeContextEmitter.event;
    }
    /**
     * Store a new context entry
     */
    async store(entry) {
        const id = this.generateId();
        const timestamp = Date.now();
        const fullEntry = {
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
    async get(id, userId) {
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
    async query(query, userId) {
        let results = Array.from(this.contexts.values()).filter(entry => entry.workspaceId === query.workspaceId);
        if (query.domain) {
            results = results.filter(entry => entry.domain === query.domain);
        }
        if (query.type && query.type.length > 0) {
            results = results.filter(entry => query.type.includes(entry.type));
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter(entry => query.tags.some(tag => entry.metadata.tags.includes(tag)));
        }
        if (query.timeRange) {
            results = results.filter(entry => entry.metadata.createdAt >= query.timeRange.start &&
                entry.metadata.createdAt <= query.timeRange.end);
        }
        if (query.minRelevance !== undefined) {
            results = results.filter(entry => entry.metadata.relevanceScore !== undefined &&
                entry.metadata.relevanceScore >= query.minRelevance);
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
    async update(id, updates, userId, changes) {
        const existing = this.contexts.get(id);
        if (!existing) {
            return undefined;
        }
        const timestamp = Date.now();
        const newVersion = existing.metadata.version + 1;
        const updated = {
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
    async fork(id, userId, reason) {
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
    async getVersionHistory(id) {
        return this.versions.get(id) || [];
    }
    /**
     * Restore specific version
     */
    async restoreVersion(id, version, userId) {
        const versionHistory = this.versions.get(id);
        if (!versionHistory) {
            return undefined;
        }
        const targetVersion = versionHistory.find(v => v.version === version);
        if (!targetVersion) {
            return undefined;
        }
        return this.update(id, { content: targetVersion.snapshot }, userId, `Restored to version ${version}`);
    }
    /**
     * Delete context (soft delete with audit)
     */
    async delete(id, userId) {
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
    async getAuditTrail(contextId) {
        return this.auditLog.filter(event => event.contextId === contextId);
    }
    /**
     * Get all audit events in time range
     */
    async getAuditLog(workspaceId, timeRange) {
        let events = this.auditLog;
        if (timeRange) {
            events = events.filter(event => event.timestamp >= timeRange.start &&
                event.timestamp <= timeRange.end);
        }
        return events;
    }
    /**
     * Prune old contexts (retention policy)
     */
    async prune(retentionDays) {
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
    async export(workspaceId) {
        const entries = Array.from(this.contexts.values()).filter(entry => entry.workspaceId === workspaceId);
        const exportData = {
            version: '1.0',
            timestamp: Date.now(),
            workspaceId,
            contexts: entries,
            versions: Object.fromEntries(this.versions),
            auditLog: this.auditLog.filter(event => entries.some(e => e.id === event.contextId)),
        };
        return JSON.stringify(exportData, null, 2);
    }
    /**
     * Import context from backup
     */
    async import(data) {
        const parsed = JSON.parse(data);
        let imported = 0;
        for (const entry of parsed.contexts) {
            this.contexts.set(entry.id, entry);
            imported++;
        }
        for (const [id, versions] of Object.entries(parsed.versions)) {
            const typed = Array.isArray(versions) ? versions : [];
            this.versions.set(id, typed);
        }
        this.auditLog.push(...parsed.auditLog);
        return imported;
    }
    // Private helpers
    generateId() {
        return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    sign(content) {
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
    async audit(event) {
        this.auditLog.push(event);
        // Keep audit log bounded (last 10k events)
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-10000);
        }
    }
    async semanticSearch(entries, query) {
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
    calculateRelevance(entry, query) {
        const content = JSON.stringify(entry.content).toLowerCase();
        const lowerQuery = query.toLowerCase();
        // Simple relevance: count occurrences
        const matches = (content.match(new RegExp(lowerQuery, 'g')) || []).length;
        return Math.min(matches / 10, 1.0);
    }
};
exports.ContextStore = ContextStore;
exports.ContextStore = ContextStore = __decorate([
    (0, inversify_1.injectable)()
], ContextStore);
