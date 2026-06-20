import { prisma } from '../db';
import { createComponentLogger } from '../observability/logger';

const logger = createComponentLogger('financial.ledger');

interface UserLedgerRecord {
  tokensUsed: number;
  requests: number;
}

/**
 * Singleton Token Ledger
 * Batches token usage in RAM and flushes to PostgreSQL asynchronously 
 * to prevent Row Locks on high-concurrency LLM calls.
 */
class FinancialLedger {
  private buffer: Map<string, UserLedgerRecord> = new Map();
  private flushIntervalMs = 30000; // 30 seconds
  private intervalId: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor() {
    this.start();
    this.registerGracefulShutdown();
  }

  private start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  private registerGracefulShutdown() {
    const handleShutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      logger.info(`Received ${signal}. Flushing Financial Ledger before shutdown...`);
      if (this.intervalId) clearInterval(this.intervalId);
      await this.flush();
      logger.info('Financial Ledger flushed successfully.');
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  }

  /**
   * Adds token usage to the in-memory ledger.
   */
  public addUsage(userId: string, tokens: number) {
    if (tokens <= 0) return;
    
    const record = this.buffer.get(userId) || { tokensUsed: 0, requests: 0 };
    record.tokensUsed += tokens;
    record.requests += 1;
    this.buffer.set(userId, record);
  }

  /**
   * Retrieves pending uncommitted tokens for a user (used for realtime quota checks).
   */
  public getPendingTokens(userId: string): number {
    return this.buffer.get(userId)?.tokensUsed || 0;
  }
  
  public getPendingRequests(userId: string): number {
    return this.buffer.get(userId)?.requests || 0;
  }

  /**
   * Flushes all pending usage to the PostgreSQL database in a massive transaction.
   */
  public async flush() {
    if (this.buffer.size === 0) return;

    // Snapshot the buffer and clear it immediately so new requests don't block
    const snapshot = new Map(this.buffer);
    this.buffer.clear();

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    const upsertPromises: any[] = [];

    for (const [userId, record] of snapshot.entries()) {
      // Monthly Bucket Upsert
      upsertPromises.push(
        prisma.usageBucket.upsert({
          where: {
            userId_window_windowStart: { userId, window: 'month', windowStart: monthStart }
          },
          create: {
            userId, window: 'month', windowStart: monthStart, windowEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
            tokens: record.tokensUsed, requests: record.requests,
          },
          update: {
            tokens: { increment: record.tokensUsed },
            requests: { increment: record.requests },
          }
        })
      );

      // Daily Bucket Upsert
      upsertPromises.push(
        prisma.usageBucket.upsert({
          where: {
            userId_window_windowStart: { userId, window: 'day', windowStart: dayStart }
          },
          create: {
            userId, window: 'day', windowStart: dayStart, windowEnd: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)),
            tokens: record.tokensUsed, requests: record.requests,
          },
          update: {
            tokens: { increment: record.tokensUsed },
            requests: { increment: record.requests },
          }
        })
      );
    }

    try {
      await prisma.$transaction(upsertPromises);
      logger.debug(`Flushed ledger for ${snapshot.size} users.`);
    } catch (error) {
      logger.error('Failed to flush financial ledger. Restoring buffer...', error);
      // Rollback to buffer on failure
      for (const [userId, record] of snapshot.entries()) {
        const current = this.buffer.get(userId) || { tokensUsed: 0, requests: 0 };
        current.tokensUsed += record.tokensUsed;
        current.requests += record.requests;
        this.buffer.set(userId, current);
      }
    }
  }
}

// Export a singleton instance
export const TokenLedger = new FinancialLedger();
