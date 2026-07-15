import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core';

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
 * Robots.txt rules
 */
interface RobotsTxt {
  domain: string;
  rules: {
    userAgent: string;
    disallow: string[];
    allow: string[];
    crawlDelay?: number;
  }[];
  fetchedAt: number;
}

/**
 * Rate limit tracker
 */
interface RateLimitTracker {
  domain: string;
  requests: number[];
  lastReset: number;
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
@injectable()
export class SecureFetch {
  private policies: Map<string, FetchPolicy> = new Map();
  private robotsTxtCache: Map<string, RobotsTxt> = new Map();
  private rateLimits: Map<string, RateLimitTracker> = new Map();
  private auditLog: FetchAudit[] = [];
  private allowList: Set<string> = new Set();
  private denyList: Set<string> = new Set();

  private readonly onRateLimitExceededEmitter = new Emitter<{ domain: string }>();
  readonly onRateLimitExceeded: Event<{ domain: string }> = this.onRateLimitExceededEmitter.event;

  private readonly onBlockedFetchEmitter = new Emitter<{ url: string; reason: string }>();
  readonly onBlockedFetch: Event<{ url: string; reason: string }> = this.onBlockedFetchEmitter.event;

  constructor() {
    this.initializePolicies();
    this.initializeLists();
  }

  /**
   * Fetch URL with all safety checks
   */
  async fetch(request: FetchRequest): Promise<FetchResult> {
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

      const result: FetchResult = {
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
    } catch (error) {
      await this.audit({
        id: auditId,
        url: request.url,
        userId: request.userId,
        workspaceId: request.workspaceId,
        purpose: request.purpose,
        timestamp: Date.now(),
        status: 'failed',
        reason: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Mask PII in content
   */
  maskPII(content: string): string {
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
  async checkRobotsTxt(url: string): Promise<boolean> {
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
  getAuditTrail(workspaceId: string, timeRange?: { start: number; end: number }): FetchAudit[] {
    let audits = this.auditLog.filter(a => a.workspaceId === workspaceId);

    if (timeRange) {
      audits = audits.filter(
        a => a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }

    return audits;
  }

  /**
   * Export audit trail
   */
  exportAuditTrail(workspaceId: string): string {
    const audits = this.getAuditTrail(workspaceId);
    return JSON.stringify(
      {
        version: '1.0',
        workspaceId,
        exportedAt: Date.now(),
        audits,
      },
      null,
      2
    );
  }

  /**
   * Add domain to allow list
   */
  addToAllowList(domain: string): void {
    this.allowList.add(domain);
    this.denyList.delete(domain);
  }

  /**
   * Add domain to deny list
   */
  addToDenyList(domain: string): void {
    this.denyList.add(domain);
    this.allowList.delete(domain);
  }

  /**
   * Set policy for domain
   */
  setPolicy(domain: string, policy: FetchPolicy): void {
    this.policies.set(domain, policy);
  }

  // Private methods

  private initializePolicies(): void {
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

  private initializeLists(): void {
    // Allow list for trusted domains
    this.allowList.add('github.com');
    this.allowList.add('gitlab.com');
    this.allowList.add('bitbucket.org');
    this.allowList.add('npmjs.com');
    this.allowList.add('pypi.org');

    // Deny list for prohibited domains
    this.denyList.add('example-malicious.com');
  }

  private createDefaultPolicy(domain: string): FetchPolicy {
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

  private checkRateLimit(domain: string, policy: FetchPolicy): boolean {
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

  private recordRequest(domain: string): void {
    const tracker = this.rateLimits.get(domain) || {
      domain,
      requests: [],
      lastReset: Date.now(),
    };

    tracker.requests.push(Date.now());
    this.rateLimits.set(domain, tracker);
  }

  private async fetchRobotsTxt(domain: string): Promise<RobotsTxt> {
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
    } catch (error) {
      // If robots.txt doesn't exist, allow everything
      return {
        domain,
        rules: [],
        fetchedAt: Date.now(),
      };
    }
  }

  private parseRobotsTxt(text: string): RobotsTxt['rules'] {
    const rules: RobotsTxt['rules'] = [];
    let currentRule: RobotsTxt['rules'][0] | null = null;

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

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
      } else if (currentRule) {
        if (key.toLowerCase() === 'disallow') {
          currentRule.disallow.push(value);
        } else if (key.toLowerCase() === 'allow') {
          currentRule.allow.push(value);
        } else if (key.toLowerCase() === 'crawl-delay') {
          currentRule.crawlDelay = parseInt(value, 10);
        }
      }
    }

    if (currentRule) {
      rules.push(currentRule);
    }

    return rules;
  }

  private async performFetch(request: FetchRequest): Promise<{ status: number; content: string; contentType: string }> {
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

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  private generateAuditId(): string {
    return `fetch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private hash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  private async audit(entry: FetchAudit): Promise<void> {
    this.auditLog.push(entry);

    // Keep bounded (last 10k entries)
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }
}
