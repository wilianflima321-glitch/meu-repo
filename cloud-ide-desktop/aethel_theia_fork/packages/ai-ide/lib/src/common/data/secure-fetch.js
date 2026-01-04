"use strict";
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
exports.SecureFetch = void 0;
const inversify_1 = require("inversify");
const core_1 = require("@theia/core");
/**
 * Secure fetch service with ToS/robots.txt compliance and PII masking
 */
let SecureFetch = class SecureFetch {
    constructor() {
        this.policies = new Map();
        this.robotsTxtCache = new Map();
        this.rateLimits = new Map();
        this.auditLog = [];
        this.allowList = new Set();
        this.denyList = new Set();
        this.onRateLimitExceededEmitter = new core_1.Emitter();
        this.onRateLimitExceeded = this.onRateLimitExceededEmitter.event;
        this.onBlockedFetchEmitter = new core_1.Emitter();
        this.onBlockedFetch = this.onBlockedFetchEmitter.event;
        this.initializePolicies();
        this.initializeLists();
    }
    /**
     * Fetch URL with all safety checks
     */
    async fetch(request) {
        const domain = this.extractDomain(request.url);
        const auditId = this.generateAuditId();
        // Check deny list
        if (this.denyList.has(domain)) {
            await this.audit({
                id: auditId,
                url: request.url,
                userId: request.userId,
                workspaceId: request.workspaceId,
                purpose: request.purpose,
                timestamp: Date.now(),
                status: 'blocked',
                reason: 'Domain in deny list',
            });
            throw new Error(`Domain ${domain} is in deny list`);
        }
        // Check allow list (bypass other checks if in allow list)
        const inAllowList = this.allowList.has(domain);
        // Get or create policy
        let policy = this.policies.get(domain);
        if (!policy) {
            policy = this.createDefaultPolicy(domain);
            this.policies.set(domain, policy);
        }
        if (!policy.allowed && !inAllowList) {
            await this.audit({
                id: auditId,
                url: request.url,
                userId: request.userId,
                workspaceId: request.workspaceId,
                purpose: request.purpose,
                timestamp: Date.now(),
                status: 'blocked',
                reason: 'Domain not allowed by policy',
            });
            throw new Error(`Domain ${domain} is not allowed`);
        }
        // Check rate limits
        if (!inAllowList && !this.checkRateLimit(domain, policy)) {
            await this.audit({
                id: auditId,
                url: request.url,
                userId: request.userId,
                workspaceId: request.workspaceId,
                purpose: request.purpose,
                timestamp: Date.now(),
                status: 'blocked',
                reason: 'Rate limit exceeded',
            });
            this.onRateLimitExceededEmitter.fire({ domain });
            throw new Error(`Rate limit exceeded for ${domain}`);
        }
        // Check robots.txt
        if (!inAllowList && policy.respectRobotsTxt) {
            const allowed = await this.checkRobotsTxt(request.url);
            if (!allowed) {
                await this.audit({
                    id: auditId,
                    url: request.url,
                    userId: request.userId,
                    workspaceId: request.workspaceId,
                    purpose: request.purpose,
                    timestamp: Date.now(),
                    status: 'blocked',
                    reason: 'Disallowed by robots.txt',
                });
                this.onBlockedFetchEmitter.fire({ url: request.url, reason: 'robots.txt' });
                throw new Error(`URL disallowed by robots.txt: ${request.url}`);
            }
        }
        // Perform fetch
        try {
            const response = await this.performFetch(request);
            let content = response.content;
            let masked = false;
            // Mask PII if required
            if (policy.maskPII) {
                content = this.maskPII(content);
                masked = true;
            }
            const result = {
                url: request.url,
                status: response.status,
                content,
                contentType: response.contentType,
                timestamp: Date.now(),
                masked,
                sources: [request.url],
                auditId,
            };
            // Record rate limit
            this.recordRequest(domain);
            // Audit success
            await this.audit({
                id: auditId,
                url: request.url,
                userId: request.userId,
                workspaceId: request.workspaceId,
                purpose: request.purpose,
                timestamp: Date.now(),
                status: 'success',
                contentHash: this.hash(content),
            });
            return result;
        }
        catch (error) {
            await this.audit({
                id: auditId,
                url: request.url,
                userId: request.userId,
                workspaceId: request.workspaceId,
                purpose: request.purpose,
                timestamp: Date.now(),
                status: 'failed',
                reason: error.message,
            });
            throw error;
        }
    }
    /**
     * Mask PII in content
     */
    maskPII(content) {
        let masked = content;
        // Email addresses
        masked = masked.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');
        // Phone numbers (US format)
        masked = masked.replace(/\d{3}[-.]?\d{3}[-.]?\d{4}/g, '[PHONE]');
        // SSN
        masked = masked.replace(/\d{3}-\d{2}-\d{4}/g, '[SSN]');
        // Credit card numbers
        masked = masked.replace(/\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g, '[CARD]');
        // IP addresses
        masked = masked.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
        // Dates of birth (various formats)
        masked = masked.replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '[DATE]');
        masked = masked.replace(/\b\d{4}-\d{2}-\d{2}\b/g, '[DATE]');
        return masked;
    }
    /**
     * Check if URL is allowed by robots.txt
     */
    async checkRobotsTxt(url) {
        const domain = this.extractDomain(url);
        const path = new URL(url).pathname;
        // Check cache
        let robotsTxt = this.robotsTxtCache.get(domain);
        // Fetch if not cached or stale (24 hours)
        if (!robotsTxt || Date.now() - robotsTxt.fetchedAt > 24 * 60 * 60 * 1000) {
            robotsTxt = await this.fetchRobotsTxt(domain);
            this.robotsTxtCache.set(domain, robotsTxt);
        }
        // Check rules for our user agent
        const ourRules = robotsTxt.rules.find(r => r.userAgent === '*' || r.userAgent === 'AIIDEBot');
        if (!ourRules) {
            return true; // No rules = allowed
        }
        // Check disallow rules
        for (const disallow of ourRules.disallow) {
            if (path.startsWith(disallow)) {
                // Check if explicitly allowed
                const explicitlyAllowed = ourRules.allow.some(allow => path.startsWith(allow));
                if (!explicitlyAllowed) {
                    return false;
                }
            }
        }
        return true;
    }
    /**
     * Get audit trail
     */
    getAuditTrail(workspaceId, timeRange) {
        let audits = this.auditLog.filter(a => a.workspaceId === workspaceId);
        if (timeRange) {
            audits = audits.filter(a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end);
        }
        return audits;
    }
    /**
     * Export audit trail
     */
    exportAuditTrail(workspaceId) {
        const audits = this.getAuditTrail(workspaceId);
        return JSON.stringify({
            version: '1.0',
            workspaceId,
            exportedAt: Date.now(),
            audits,
        }, null, 2);
    }
    /**
     * Add domain to allow list
     */
    addToAllowList(domain) {
        this.allowList.add(domain);
        this.denyList.delete(domain);
    }
    /**
     * Add domain to deny list
     */
    addToDenyList(domain) {
        this.denyList.add(domain);
        this.allowList.delete(domain);
    }
    /**
     * Set policy for domain
     */
    setPolicy(domain, policy) {
        this.policies.set(domain, policy);
    }
    // Private methods
    initializePolicies() {
        // Default policies for common domains
        this.policies.set('github.com', {
            domain: 'github.com',
            allowed: true,
            rateLimit: { requestsPerMinute: 60, requestsPerHour: 5000 },
            requiresAuth: false,
            respectRobotsTxt: true,
            maskPII: false,
            retentionDays: 30,
        });
        this.policies.set('stackoverflow.com', {
            domain: 'stackoverflow.com',
            allowed: true,
            rateLimit: { requestsPerMinute: 30, requestsPerHour: 1000 },
            requiresAuth: false,
            respectRobotsTxt: true,
            maskPII: true,
            retentionDays: 30,
        });
        this.policies.set('arxiv.org', {
            domain: 'arxiv.org',
            allowed: true,
            rateLimit: { requestsPerMinute: 10, requestsPerHour: 500 },
            requiresAuth: false,
            respectRobotsTxt: true,
            maskPII: false,
            retentionDays: 90,
        });
    }
    initializeLists() {
        // Allow list for trusted domains
        this.allowList.add('github.com');
        this.allowList.add('gitlab.com');
        this.allowList.add('bitbucket.org');
        this.allowList.add('npmjs.com');
        this.allowList.add('pypi.org');
        // Deny list for prohibited domains
        this.denyList.add('example-malicious.com');
    }
    createDefaultPolicy(domain) {
        return {
            domain,
            allowed: false, // Conservative default
            rateLimit: { requestsPerMinute: 10, requestsPerHour: 100 },
            requiresAuth: false,
            respectRobotsTxt: true,
            maskPII: true,
            retentionDays: 7,
        };
    }
    checkRateLimit(domain, policy) {
        const tracker = this.rateLimits.get(domain) || {
            domain,
            requests: [],
            lastReset: Date.now(),
        };
        const now = Date.now();
        const oneMinuteAgo = now - 60 * 1000;
        const oneHourAgo = now - 60 * 60 * 1000;
        // Filter recent requests
        tracker.requests = tracker.requests.filter(t => t > oneHourAgo);
        // Check limits
        const lastMinute = tracker.requests.filter(t => t > oneMinuteAgo).length;
        const lastHour = tracker.requests.length;
        if (lastMinute >= policy.rateLimit.requestsPerMinute) {
            return false;
        }
        if (lastHour >= policy.rateLimit.requestsPerHour) {
            return false;
        }
        return true;
    }
    recordRequest(domain) {
        const tracker = this.rateLimits.get(domain) || {
            domain,
            requests: [],
            lastReset: Date.now(),
        };
        tracker.requests.push(Date.now());
        this.rateLimits.set(domain, tracker);
    }
    async fetchRobotsTxt(domain) {
        try {
            const url = `https://${domain}/robots.txt`;
            const response = await fetch(url);
            const text = await response.text();
            const rules = this.parseRobotsTxt(text);
            return {
                domain,
                rules,
                fetchedAt: Date.now(),
            };
        }
        catch (error) {
            // If robots.txt doesn't exist, allow everything
            return {
                domain,
                rules: [],
                fetchedAt: Date.now(),
            };
        }
    }
    parseRobotsTxt(text) {
        const rules = [];
        let currentRule = null;
        for (const line of text.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#'))
                continue;
            const [key, value] = trimmed.split(':').map(s => s.trim());
            if (key.toLowerCase() === 'user-agent') {
                if (currentRule) {
                    rules.push(currentRule);
                }
                currentRule = {
                    userAgent: value,
                    disallow: [],
                    allow: [],
                };
            }
            else if (currentRule) {
                if (key.toLowerCase() === 'disallow') {
                    currentRule.disallow.push(value);
                }
                else if (key.toLowerCase() === 'allow') {
                    currentRule.allow.push(value);
                }
                else if (key.toLowerCase() === 'crawl-delay') {
                    currentRule.crawlDelay = parseInt(value, 10);
                }
            }
        }
        if (currentRule) {
            rules.push(currentRule);
        }
        return rules;
    }
    async performFetch(request) {
        const response = await fetch(request.url, {
            method: request.method || 'GET',
            headers: {
                'User-Agent': 'AIIDEBot/1.0',
                ...request.headers,
            },
            body: request.body ? JSON.stringify(request.body) : undefined,
        });
        const content = await response.text();
        const contentType = response.headers.get('content-type') || 'text/plain';
        return {
            status: response.status,
            content,
            contentType,
        };
    }
    extractDomain(url) {
        try {
            return new URL(url).hostname;
        }
        catch {
            throw new Error(`Invalid URL: ${url}`);
        }
    }
    generateAuditId() {
        return `fetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    hash(content) {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
    async audit(entry) {
        this.auditLog.push(entry);
        // Keep bounded (last 10k entries)
        if (this.auditLog.length > 10000) {
            this.auditLog = this.auditLog.slice(-10000);
        }
    }
};
exports.SecureFetch = SecureFetch;
exports.SecureFetch = SecureFetch = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], SecureFetch);
