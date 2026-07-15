/**
 * Multiplayer Cost Guard — OMNI-PLAN PILAR 5 (A Trava Financeira).
 *
 * "A Aethel nunca opera no vermelho." This module is the single choke point
 * every dedicated-server allocation must pass through before Agones (or, in
 * this environment, the simulated allocator in
 * `lib/multiplayer/dedicated-server-authority.ts`) is asked to spin up
 * CPU-seconds the developer's plan doesn't cover.
 *
 * Three enforcement rules, matching the Director's brief exactly:
 *
 *  1. FREE PLAN — hard concurrent-connection cap per game
 *     (`FREE_PLAN_MAX_CONCURRENT_USERS`). The (N+1)th player is refused with
 *     an explicit upgrade prompt, never billed to Aethel.
 *
 *  2. PRO+ PLANS — a machine-hour quota (`machineHourQuotaByPlan`) that the
 *     Matchmaker draws down as dedicated-server time is consumed. Exceeding
 *     the quota does not hard-refuse (Pro is a paying customer) — it flags
 *     `withinBurstAllowance: false` so the caller can require a
 *     card-on-file burst-billing confirmation before allocating more.
 *     NOTE (honest scope): the actual "charge the burst overage to a card"
 *     billing flow does not exist yet — see `recordMachineHourUsage`'s
 *     doc comment.
 *
 *  3. THE 12% LAW — revenue this game generated through Aethel Payments
 *     (the same 88/12 marketplace split as `lib/marketplace/payouts.ts`)
 *     accrues as a per-game USD credit that lifts the free-tier hard cap.
 *     See `recordRevenueCreditFromSale` / `getGameCostStatus`.
 *
 * STORAGE: mirrors `lib/observability/cost-guard.ts`'s pattern exactly
 * (direct Upstash reads with real failure propagation so this guard can
 * apply an explicit fail-open/fail-closed policy on a Redis outage, falling
 * back to the shared in-memory `lib/redis-cache.ts` cache when Upstash isn't
 * configured at all). Money-shaped values are stored as integer micro-USD /
 * integer cents to avoid float drift in Redis INCRBY.
 */

import { cache } from '@/lib/redis-cache';
import { getUpstashRedisClient } from '@/lib/server/upstash-rate-limit';
import { getPlanLimits } from '@/lib/plan-limits';
import { prisma } from '@/lib/db';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('multiplayer-cost-guard');

// ============================================================================
// CONFIG
// ============================================================================

/** "Máximo de 10 Usuários Simultâneos" — per game, per free-plan developer. */
export const FREE_PLAN_MAX_CONCURRENT_USERS = 10;

/**
 * Player-hours per month, drawn down by `recordMachineHourUsage`. These are
 * illustrative figures (the Director's brief gave "ex: 50.000 horas-jogador"
 * for Pro) pending real AWS/Agones per-second billing data to calibrate
 * against; kept in one place so Finance can tune them without touching
 * enforcement logic.
 */
const MACHINE_HOUR_QUOTA_BY_PLAN: Record<string, number> = {
  free: 0, // Free never gets dedicated-server machine hours — P2P (Pilar 1) only, uncapped.
  starter_trial: 0,
  starter: 5_000,
  basic: 50_000,
  pro: 50_000,
  studio: 200_000,
  enterprise: Number.POSITIVE_INFINITY,
};

/** Outlives a UTC-month bucket so counters survive clock skew between instances. */
const MONTHLY_KEY_TTL_SECONDS = 32 * 24 * 60 * 60;
const CENTS_PER_USD = 100;

function utcMonthBucket(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7); // YYYY-MM
}

/** Thrown by the direct-Upstash read/write path on a genuine backend failure (timeout, network error, 5xx). */
class MultiplayerCostGuardBackendError extends Error {
  constructor(cause: unknown) {
    super(`multiplayer cost-guard Redis backend unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'MultiplayerCostGuardBackendError';
  }
}

async function readCounter(key: string): Promise<number> {
  const redis = getUpstashRedisClient();
  if (!redis) {
    const value = await cache.get<number>(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
  try {
    const value = await redis.get<number>(key);
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  } catch (error) {
    throw new MultiplayerCostGuardBackendError(error);
  }
}

async function incrementCounter(key: string, amount: number, ttlSeconds: number): Promise<number> {
  const redis = getUpstashRedisClient();
  if (!redis) {
    const total = await cache.increment(key, amount);
    void cache.expire(key, ttlSeconds);
    return total;
  }
  try {
    const total = await redis.incrby(key, amount);
    void redis.expire(key, ttlSeconds).catch(() => undefined);
    return total;
  } catch (error) {
    throw new MultiplayerCostGuardBackendError(error);
  }
}

// ============================================================================
// KEYS
// ============================================================================

const K = {
  concurrent: (gameId: string) => `mpcg:concurrent:${gameId}`,
  machineSeconds: (gameId: string, bucket: string) => `mpcg:machine-seconds:${gameId}:${bucket}`,
  revenueCreditCents: (gameId: string) => `mpcg:revenue-credit-cents:${gameId}`,
};

// ============================================================================
// TYPES
// ============================================================================

export interface DedicatedServerConnectionVerdict {
  allowed: boolean;
  reason?: string;
  concurrentUsers: number;
  concurrentLimit: number | null; // null = uncapped (Enterprise, or Free lifted by revenue credit)
  plan: string;
  liftedByRevenueCredit: boolean;
  degraded?: boolean;
}

export interface MachineHourStatus {
  plan: string;
  hoursUsedThisMonth: number;
  hourlyQuota: number;
  withinQuota: boolean;
  /**
   * True when usage exceeds the plan quota AND there isn't enough accrued
   * revenue credit to cover the overage. The Matchmaker should require a
   * card-on-file burst confirmation (not implemented — see doc comment on
   * `recordMachineHourUsage`) before allocating further servers when false.
   */
  withinBurstAllowance: boolean;
  revenueCreditUSD: number;
}

export interface GameCostStatus {
  gameId: string;
  developerPlan: string;
  concurrentUsers: number;
  concurrentLimit: number | null;
  machineHours: MachineHourStatus;
  revenueCreditUSD: number;
}

// ============================================================================
// CORE GUARD
// ============================================================================

class MultiplayerCostGuard {
  /**
   * Gate called by the Matchmaker / dedicated-server allocator before a new
   * player is handed a dedicated-server connection for `gameId`. This is
   * the literal implementation of the Director's Rule 1: "Se 11 pessoas
   * tentarem entrar, o cost-guard intercepta e avisa."
   */
  async checkDedicatedServerConnection(developerUserId: string, gameId: string): Promise<DedicatedServerConnectionVerdict> {
    const developer = await prisma.user.findUnique({ where: { id: developerUserId }, select: { plan: true } });
    const plan = developer?.plan ?? 'free';
    const isFreeTier = getPlanLimits(plan) === getPlanLimits('free');

    let concurrentUsers: number;
    let revenueCreditCents: number;
    try {
      [concurrentUsers, revenueCreditCents] = await Promise.all([
        readCounter(K.concurrent(gameId)),
        readCounter(K.revenueCreditCents(gameId)),
      ]);
    } catch (error) {
      if (error instanceof MultiplayerCostGuardBackendError) {
        // Fail-closed regardless of plan: unlike AI spend (bounded per-request
        // cost), an unmetered dedicated-server *connection* during a Redis
        // outage could let an unbounded number of players onto a server
        // Aethel can't currently account for. A paying developer's game
        // being briefly unable to accept new dedicated-server connections
        // during an infra blip is an acceptable, bounded cost; an
        // un-tracked fleet scale-up is not.
        log.error('mpcg.backend_outage.fail_closed', error, { gameId, developerUserId });
        return {
          allowed: false,
          reason: 'Multiplayer accounting is temporarily unavailable. Please try again in a moment.',
          concurrentUsers: 0,
          concurrentLimit: isFreeTier ? FREE_PLAN_MAX_CONCURRENT_USERS : null,
          plan,
          liftedByRevenueCredit: false,
          degraded: true,
        };
      }
      throw error;
    }

    const revenueCreditUSD = revenueCreditCents / CENTS_PER_USD;
    const liftedByRevenueCredit = isFreeTier && revenueCreditUSD > 0;

    if (isFreeTier && !liftedByRevenueCredit && concurrentUsers >= FREE_PLAN_MAX_CONCURRENT_USERS) {
      return {
        allowed: false,
        reason: `O servidor deste desenvolvedor atingiu o limite gratuito de ${FREE_PLAN_MAX_CONCURRENT_USERS} jogadores simultâneos. Peça para o desenvolvedor fazer upgrade do plano.`,
        concurrentUsers,
        concurrentLimit: FREE_PLAN_MAX_CONCURRENT_USERS,
        plan,
        liftedByRevenueCredit: false,
      };
    }

    return {
      allowed: true,
      concurrentUsers,
      concurrentLimit: isFreeTier && !liftedByRevenueCredit ? FREE_PLAN_MAX_CONCURRENT_USERS : null,
      plan,
      liftedByRevenueCredit,
    };
  }

  /** Call when a player's dedicated-server connection is actually established. */
  async recordConnect(gameId: string): Promise<number> {
    try {
      return await incrementCounter(K.concurrent(gameId), 1, 6 * 60 * 60);
    } catch (error) {
      log.error('mpcg.record_connect.backend_outage', error, { gameId });
      return -1;
    }
  }

  /** Call when a player's dedicated-server connection ends (clean disconnect or timeout reaper). */
  async recordDisconnect(gameId: string): Promise<number> {
    try {
      const next = await incrementCounter(K.concurrent(gameId), -1, 6 * 60 * 60);
      if (next < 0) {
        // Clamp defensively — a missed `recordConnect` (e.g. crash before the
        // counter was incremented) must never leave a game permanently
        // under-counted below zero, which would otherwise never trip the
        // free-tier cap again until the TTL rolls the bucket over.
        await incrementCounter(K.concurrent(gameId), -next, 6 * 60 * 60);
        return 0;
      }
      return next;
    } catch (error) {
      log.error('mpcg.record_disconnect.backend_outage', error, { gameId });
      return -1;
    }
  }

  /**
   * Draws down the plan's monthly machine-hour quota. `machineSeconds` should
   * be the actual CPU-wall-clock-seconds Agones billed for this game's
   * GameServer pods, reported by the fleet's metrics exporter — this method
   * only accounts for it, it does not itself measure it (no live Agones
   * cluster exists in this environment to source real numbers from; the
   * accounting math below is real and unit-testable, the input feed is not
   * yet wired to a live fleet).
   *
   * HONEST GAP: "Burst Scale: podem colocar cartão de crédito para cobrir
   * excedentes" — no Stripe SetupIntent / off-session charge flow exists for
   * this yet. `MachineHourStatus.withinBurstAllowance` is exposed so a
   * caller can decide to block/require confirmation, but nothing currently
   * calls Stripe to actually charge an overage.
   */
  async recordMachineHourUsage(gameId: string, machineSeconds: number): Promise<void> {
    if (machineSeconds <= 0) return;
    const bucket = utcMonthBucket();
    try {
      await incrementCounter(K.machineSeconds(gameId, bucket), Math.round(machineSeconds), MONTHLY_KEY_TTL_SECONDS);
    } catch (error) {
      log.error('mpcg.record_machine_hours.backend_outage', error, { gameId });
    }
  }

  /**
   * PILAR 5, "A Lei dos 12%": call this from the billing webhook whenever an
   * Aethel Payments sale attributable to `gameId` clears, with the
   * `platformCents` cut from `lib/marketplace/payouts.ts#calculateRevenueSplit`.
   *
   * `MarketplaceItem.gameId` (optional FK -> `PublishedGame`, settable by its
   * owning developer via `POST /api/marketplace/assets`) is what lets
   * `app/api/billing/webhook/route.ts`'s `marketplace_sale` branch resolve a
   * real `gameId` for this call — most marketplace items (IDE
   * templates/plugins) still leave it `null` and correctly never reach this
   * method. REMAINING HONEST GAP: no marketplace *frontend* UI surfaces the
   * `gameId` field yet (the API accepts and validates it today) — see that
   * route for the ownership check against `PublishedGame.authorId`.
   */
  async recordRevenueCreditFromSale(gameId: string, platformCents: number): Promise<void> {
    if (platformCents <= 0) return;
    try {
      const total = await incrementCounter(K.revenueCreditCents(gameId), platformCents, MONTHLY_KEY_TTL_SECONDS * 12);
      log.info('mpcg.revenue_credit.accrued', { gameId, platformCents, totalCents: total });
    } catch (error) {
      log.error('mpcg.revenue_credit.backend_outage', error, { gameId });
    }
  }

  /** Spends down accrued revenue credit to cover a machine-hour overage. Returns the amount actually spent (never more than available). */
  async spendRevenueCredit(gameId: string, costCents: number): Promise<number> {
    if (costCents <= 0) return 0;
    try {
      const available = await readCounter(K.revenueCreditCents(gameId));
      const spend = Math.min(available, costCents);
      if (spend > 0) {
        await incrementCounter(K.revenueCreditCents(gameId), -spend, MONTHLY_KEY_TTL_SECONDS * 12);
      }
      return spend;
    } catch (error) {
      log.error('mpcg.spend_revenue_credit.backend_outage', error, { gameId });
      return 0;
    }
  }

  async getMachineHourStatus(developerUserId: string, gameId: string): Promise<MachineHourStatus> {
    const developer = await prisma.user.findUnique({ where: { id: developerUserId }, select: { plan: true } });
    const plan = developer?.plan ?? 'free';
    const hourlyQuota = MACHINE_HOUR_QUOTA_BY_PLAN[plan] ?? MACHINE_HOUR_QUOTA_BY_PLAN.free;

    const bucket = utcMonthBucket();
    const [machineSeconds, revenueCreditCents] = await Promise.all([
      readCounter(K.machineSeconds(gameId, bucket)).catch(() => 0),
      readCounter(K.revenueCreditCents(gameId)).catch(() => 0),
    ]);
    const hoursUsedThisMonth = machineSeconds / 3600;
    const revenueCreditUSD = revenueCreditCents / CENTS_PER_USD;
    const withinQuota = hoursUsedThisMonth <= hourlyQuota;
    // The 12% law's other half: even over quota, accrued revenue credit
    // covering the overage's estimated AWS cost keeps scaling unblocked.
    const withinBurstAllowance = withinQuota || revenueCreditUSD > 0;

    return { plan, hoursUsedThisMonth, hourlyQuota, withinQuota, withinBurstAllowance, revenueCreditUSD };
  }

  /** Combined dashboard view for a game's multiplayer cost posture. */
  async getGameCostStatus(developerUserId: string, gameId: string): Promise<GameCostStatus> {
    const [connection, machineHours] = await Promise.all([
      this.checkDedicatedServerConnection(developerUserId, gameId),
      this.getMachineHourStatus(developerUserId, gameId),
    ]);

    return {
      gameId,
      developerPlan: connection.plan,
      concurrentUsers: connection.concurrentUsers,
      concurrentLimit: connection.concurrentLimit,
      machineHours,
      revenueCreditUSD: machineHours.revenueCreditUSD,
    };
  }

  /**
   * Block 2B.4 — single choke for matchmaking / allocator scale decisions.
   * Concurrent connection cap AND machine-hour burst must both allow.
   */
  async checkDedicatedScaleAllowed(
    developerUserId: string,
    gameId: string
  ): Promise<{
    allowed: boolean
    connection: DedicatedServerConnectionVerdict
    machineHours: MachineHourStatus
    reason?: string
  }> {
    const [connection, machineHours] = await Promise.all([
      this.checkDedicatedServerConnection(developerUserId, gameId),
      this.getMachineHourStatus(developerUserId, gameId),
    ]);

    if (!connection.allowed) {
      return { allowed: false, connection, machineHours, reason: connection.reason };
    }
    if (!machineHours.withinBurstAllowance) {
      return {
        allowed: false,
        connection,
        machineHours,
        reason:
          'Machine-hour quota exceeded without revenue credit for burst scale.',
      };
    }
    return { allowed: true, connection, machineHours };
  }
}

export const multiplayerCostGuard = new MultiplayerCostGuard();
export { MultiplayerCostGuard };
