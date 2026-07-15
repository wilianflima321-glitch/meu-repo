/**
 * @deprecated Block 6G.1 — DO NOT WIRE.
 * Canonical UsageBucket buffer: `lib/metering-redis-buffer.ts` via `lib/metering.ts`.
 * This stream accumulator was an orphan parallel path and must not be reconnected.
 */
import { Redis } from 'ioredis';

const BILLING_STREAM_KEY = 'aethel:billing:tokens_stream';

export interface TokenUsageEvent {
  userId: string;
  projectId?: string;
  tokensUsed: number;
  type: 'prompt' | 'completion' | 'embedding';
  model: string;
  timestamp: string;
}

/** @deprecated See file header — use metering-redis-buffer instead. */
export class RedisBillingAccumulator {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  public async consumeTokens(event: TokenUsageEvent): Promise<void> {
    await this.redis.xadd(
      BILLING_STREAM_KEY,
      '*',
      'userId', event.userId,
      'projectId', event.projectId || '',
      'tokensUsed', event.tokensUsed.toString(),
      'type', event.type,
      'model', event.model,
      'timestamp', event.timestamp
    );

    const cacheKey = `aethel:billing:balance:${event.userId}`;
    await this.redis.hincrby(cacheKey, 'tokens_used_uncommitted', event.tokensUsed);
  }

  public async getUncommittedUsage(userId: string): Promise<number> {
    const cacheKey = `aethel:billing:balance:${userId}`;
    const uncommitted = await this.redis.hget(cacheKey, 'tokens_used_uncommitted');
    return uncommitted ? parseInt(uncommitted, 10) : 0;
  }
}

/** @deprecated — do not import in production paths */
export const billingAccumulator = new RedisBillingAccumulator();
