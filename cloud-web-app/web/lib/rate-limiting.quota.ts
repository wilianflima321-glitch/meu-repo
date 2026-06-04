import { MemoryStorage } from './rate-limiting.storage';
import type { QuotaConfig, QuotaUsage, RateLimitStorage } from './rate-limiting.types';

export class QuotaManager {
  private storage: RateLimitStorage;
  private quotas: Map<string, QuotaConfig> = new Map();

  constructor(storage?: RateLimitStorage) {
    this.storage = storage || new MemoryStorage();
    this.setupDefaultQuotas();
  }

  private setupDefaultQuotas(): void {
    // AI tokens por mês
    this.addQuota({
      name: 'ai_tokens',
      limit: 100000,
      period: 'month',
      resource: 'ai_tokens',
    });

    // Storage em GB
    this.addQuota({
      name: 'storage',
      limit: 10,
      period: 'month',
      resource: 'storage_gb',
    });

    // Builds por dia
    this.addQuota({
      name: 'builds',
      limit: 50,
      period: 'day',
      resource: 'builds',
    });

    // Exports por dia
    this.addQuota({
      name: 'exports',
      limit: 10,
      period: 'day',
      resource: 'exports',
    });

    // Projetos ativos
    this.addQuota({
      name: 'projects',
      limit: 5,
      period: 'month',
      resource: 'projects',
    });

    // Colaboradores por projeto
    this.addQuota({
      name: 'collaborators',
      limit: 3,
      period: 'month',
      resource: 'collaborators',
    });
  }

  /**
   * Adiciona quota
   */
  addQuota(config: QuotaConfig): void {
    this.quotas.set(config.name, config);
  }

  /**
   * Obtém uso da quota
   */
  async getUsage(quotaName: string, userId: string): Promise<QuotaUsage | null> {
    const quota = this.quotas.get(quotaName);
    if (!quota) return null;

    const key = this.buildKey(quota, userId);
    const used = await this.storage.get(key) || 0;

    return {
      quota: quotaName,
      used,
      limit: quota.limit,
      remaining: Math.max(0, quota.limit - used),
      resetsAt: this.getResetDate(quota.period),
      percentUsed: (used / quota.limit) * 100,
    };
  }

  /**
   * Verifica se pode usar recurso
   */
  async canUse(
    quotaName: string,
    userId: string,
    amount: number = 1
  ): Promise<{ allowed: boolean; usage: QuotaUsage }> {
    const usage = await this.getUsage(quotaName, userId);
    if (!usage) {
      throw new Error(`Quota "${quotaName}" not found`);
    }

    return {
      allowed: usage.remaining >= amount,
      usage,
    };
  }

  /**
   * Consome quota
   */
  async consume(
    quotaName: string,
    userId: string,
    amount: number = 1
  ): Promise<QuotaUsage> {
    const quota = this.quotas.get(quotaName);
    if (!quota) {
      throw new Error(`Quota "${quotaName}" not found`);
    }

    const key = this.buildKey(quota, userId);
    const ttl = this.getTTL(quota.period);

    for (let i = 0; i < amount; i++) {
      await this.storage.incr(key, ttl);
    }

    return (await this.getUsage(quotaName, userId))!;
  }

  /**
   * Define uso (para recursos cumulativos como storage)
   */
  async setUsage(
    quotaName: string,
    userId: string,
    amount: number
  ): Promise<void> {
    const quota = this.quotas.get(quotaName);
    if (!quota) return;

    const key = this.buildKey(quota, userId);
    const ttl = this.getTTL(quota.period);

    await this.storage.set(key, amount, ttl);
  }

  /**
   * Reseta quota
   */
  async reset(quotaName: string, userId: string): Promise<void> {
    const quota = this.quotas.get(quotaName);
    if (!quota) return;

    const key = this.buildKey(quota, userId);
    await this.storage.delete(key);
  }

  /**
   * Obtém todas as quotas do usuário
   */
  async getAllUsage(userId: string): Promise<QuotaUsage[]> {
    const usages: QuotaUsage[] = [];

    for (const [name] of this.quotas) {
      const usage = await this.getUsage(name, userId);
      if (usage) usages.push(usage);
    }

    return usages;
  }

  /**
   * Atualiza limites por plano
   */
  updateLimitsForPlan(
    planId: string,
    limits: Partial<Record<string, number>>
  ): void {
    for (const [quotaName, limit] of Object.entries(limits)) {
      const quota = this.quotas.get(quotaName);
      if (quota && limit !== undefined) {
        quota.limit = limit;
      }
    }
  }

  private buildKey(quota: QuotaConfig, userId: string): string {
    const periodKey = this.getPeriodKey(quota.period);
    return `quota:${quota.name}:${userId}:${periodKey}`;
  }

  private getPeriodKey(period: QuotaConfig['period']): string {
    const now = new Date();

    switch (period) {
      case 'minute':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
      case 'hour':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}`;
      case 'day':
        return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      case 'week':
        const week = Math.ceil(now.getDate() / 7);
        return `${now.getFullYear()}-${now.getMonth()}-w${week}`;
      case 'month':
        return `${now.getFullYear()}-${now.getMonth()}`;
      default:
        return `${now.getFullYear()}-${now.getMonth()}`;
    }
  }

  private getTTL(period: QuotaConfig['period']): number {
    switch (period) {
      case 'minute': return 60;
      case 'hour': return 3600;
      case 'day': return 86400;
      case 'week': return 604800;
      case 'month': return 2592000;
      default: return 2592000;
    }
  }

  private getResetDate(period: QuotaConfig['period']): Date {
    const now = new Date();
    const reset = new Date(now);

    switch (period) {
      case 'minute':
        reset.setMinutes(reset.getMinutes() + 1, 0, 0);
        break;
      case 'hour':
        reset.setHours(reset.getHours() + 1, 0, 0, 0);
        break;
      case 'day':
        reset.setDate(reset.getDate() + 1);
        reset.setHours(0, 0, 0, 0);
        break;
      case 'week':
        reset.setDate(reset.getDate() + (7 - reset.getDay()));
        reset.setHours(0, 0, 0, 0);
        break;
      case 'month':
        reset.setMonth(reset.getMonth() + 1, 1);
        reset.setHours(0, 0, 0, 0);
        break;
    }

    return reset;
  }
}
