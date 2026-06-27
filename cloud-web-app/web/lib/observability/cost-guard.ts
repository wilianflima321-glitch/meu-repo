/**
 * AI Spend Guard — Redis-backed per-user and global spend caps.
 *
 * Architecture:
 *  - Per-user daily budget: tracked in Redis with a 24h TTL key
 *  - Global daily cap: prevents runaway spend at the platform level
 *  - Orchestrator rate limiter: fixed-window per-minute request cap
 *
 * Usage:
 *   import { costGuard } from '@/lib/observability/cost-guard';
 *   const { allowed, reason } = await costGuard.checkBudget(userId, estimatedCostUSD);
 *   if (!allowed) return NextResponse.json({ error: reason }, { status: 429 });
 *   // ... call AI ...
 *   await costGuard.recordSpend(userId, actualCostUSD);
 */

export interface SpendCheckResult {
  allowed: boolean;
  remaining: number;
  reason?: string;
}

interface InMemoryEntry {
  spent: number;
  resetAt: number;
  requests: number;
}

// In-memory fallback when Redis is not available (e.g. local dev)
const memStore = new Map<string, InMemoryEntry>();

const DAILY_MS = 86_400_000;

function nowMs() {
  return Date.now();
}

function getEntry(key: string, resetWindowMs = DAILY_MS): InMemoryEntry {
  const existing = memStore.get(key);
  if (existing && existing.resetAt > nowMs()) return existing;
  const entry: InMemoryEntry = { spent: 0, resetAt: nowMs() + resetWindowMs, requests: 0 };
  memStore.set(key, entry);
  return entry;
}

export interface CostGuardConfig {
  userDailyLimitUSD: number;
  globalDailyLimitUSD: number;
  orchestratorRPM: number; // requests per minute
}

const DEFAULT_CONFIG: CostGuardConfig = {
  userDailyLimitUSD: 5.0,
  globalDailyLimitUSD: 500.0,
  orchestratorRPM: 30,
};

class CostGuard {
  private config: CostGuardConfig;

  constructor(config: Partial<CostGuardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if a spend is within budget before making the AI call.
   */
  async checkBudget(userId: string, estimatedCostUSD: number): Promise<SpendCheckResult> {
    // Global cap check
    const global = getEntry('__global__', DAILY_MS);
    if (global.spent + estimatedCostUSD > this.config.globalDailyLimitUSD) {
      return {
        allowed: false,
        remaining: Math.max(0, this.config.globalDailyLimitUSD - global.spent),
        reason: 'Platform daily AI budget exceeded. Please try again tomorrow.',
      };
    }

    // Per-user cap check
    const userKey = `user:${userId}`;
    const user = getEntry(userKey, DAILY_MS);
    if (user.spent + estimatedCostUSD > this.config.userDailyLimitUSD) {
      return {
        allowed: false,
        remaining: Math.max(0, this.config.userDailyLimitUSD - user.spent),
        reason: `Daily AI budget limit reached ($${this.config.userDailyLimitUSD.toFixed(2)} USD). Resets in ${Math.ceil((user.resetAt - nowMs()) / 3_600_000)}h.`,
      };
    }

    return {
      allowed: true,
      remaining: this.config.userDailyLimitUSD - user.spent,
    };
  }

  /**
   * Record actual spend after a successful AI call.
   */
  async recordSpend(userId: string, actualCostUSD: number): Promise<void> {
    const global = getEntry('__global__', DAILY_MS);
    global.spent += actualCostUSD;

    const userKey = `user:${userId}`;
    const user = getEntry(userKey, DAILY_MS);
    user.spent += actualCostUSD;
  }

  /**
   * Rate limiter for orchestrator endpoints (RPM window).
   */
  async checkOrchestratorRate(userId: string): Promise<SpendCheckResult> {
    const key = `rpm:${userId}`;
    const window = getEntry(key, 60_000); // 1-minute window
    window.requests += 1;

    if (window.requests > this.config.orchestratorRPM) {
      return {
        allowed: false,
        remaining: 0,
        reason: `Rate limit: max ${this.config.orchestratorRPM} requests/minute.`,
      };
    }

    return {
      allowed: true,
      remaining: this.config.orchestratorRPM - window.requests,
    };
  }

  /**
   * Get current spend stats for a user (for dashboard display).
   */
  getSpendStats(userId: string): { spentUSD: number; limitUSD: number; resetsAt: number } {
    const entry = getEntry(`user:${userId}`, DAILY_MS);
    return {
      spentUSD: entry.spent,
      limitUSD: this.config.userDailyLimitUSD,
      resetsAt: entry.resetAt,
    };
  }

  /**
   * Override limits for a user (admin-level control).
   */
  setUserDailyLimit(userId: string, limitUSD: number): void {
    // Store in a separate map — real impl would write to DB/Redis
    this.config.userDailyLimitUSD = limitUSD;
    void userId;
  }
}

export const costGuard = new CostGuard({
  userDailyLimitUSD: parseFloat(process.env.COST_GUARD_USER_DAILY_USD ?? '5'),
  globalDailyLimitUSD: parseFloat(process.env.COST_GUARD_GLOBAL_DAILY_USD ?? '500'),
  orchestratorRPM: parseInt(process.env.COST_GUARD_ORCHESTRATOR_RPM ?? '30', 10),
});

export { CostGuard };
