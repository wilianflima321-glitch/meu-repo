import { createComponentLogger } from '@/lib/observability/logger'

import { DDoSProtection } from './rate-limiting.ddos';
import { MemoryStorage } from './rate-limiting.storage';
import { QuotaManager } from './rate-limiting.quota';
import type {
  RateLimitAlgorithm,
  RateLimitIdentifier,
  RateLimitConfig,
  RateLimitInfo,
  RateLimitResult,
  QuotaConfig,
  QuotaUsage,
  RateLimitStorage
} from './rate-limiting.types';

export { DDoSProtection } from './rate-limiting.ddos';
export { MemoryStorage } from './rate-limiting.storage';
export type {
  RateLimitAlgorithm,
  RateLimitIdentifier,
  RateLimitConfig,
  RateLimitInfo,
  RateLimitResult,
  QuotaConfig,
  QuotaUsage,
  RateLimitStorage
} from './rate-limiting.types';

const log = createComponentLogger('rate-limiting')


/**
 * Aethel Engine rate-limiting spine.
 *
 * Runtime limiters, quota accounting, middleware wrappers and DDoS guardrails.
 */

// ============================================================================
// RATE LIMITER
// ============================================================================

export class RateLimiter {
  private storage: RateLimitStorage;
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor(storage?: RateLimitStorage) {
    this.storage = storage || new MemoryStorage();
    this.setupDefaultConfigs();
  }

  listConfigs(): RateLimitConfig[] {
    return Array.from(this.configs.values()).map((config) => ({
      name: config.name,
      algorithm: config.algorithm,
      limit: config.limit,
      window: config.window,
      identifier: config.identifier,
      keyPrefix: config.keyPrefix,
      skipFailedRequests: config.skipFailedRequests,
      skipSuccessfulRequests: config.skipSuccessfulRequests,
    }));
  }

  /**
   * Configura limiters padrão
   */
  private setupDefaultConfigs(): void {
    // API geral - 100 req/min por IP
    this.addConfig({
      name: 'api_general',
      algorithm: 'sliding_window',
      limit: 100,
      window: 60,
      identifier: 'ip',
    });

    // Login - 5 tentativas/15min por IP
    this.addConfig({
      name: 'auth_login',
      algorithm: 'sliding_window',
      limit: 5,
      window: 900,
      identifier: 'ip',
    });

    // Registro - 3/hora por IP
    this.addConfig({
      name: 'auth_register',
      algorithm: 'sliding_window',
      limit: 3,
      window: 3600,
      identifier: 'ip',
    });

    // AI requests - por usuário
    this.addConfig({
      name: 'ai_requests',
      algorithm: 'token_bucket',
      limit: 50,
      window: 60,
      identifier: 'user',
    });

    // Upload - 10/min por usuário
    this.addConfig({
      name: 'upload',
      algorithm: 'sliding_window',
      limit: 10,
      window: 60,
      identifier: 'user',
    });

    // Export - 5/hora por usuário
    this.addConfig({
      name: 'export',
      algorithm: 'sliding_window',
      limit: 5,
      window: 3600,
      identifier: 'user',
    });

    // Webhooks - 1000/min por API key
    this.addConfig({
      name: 'webhooks',
      algorithm: 'sliding_window',
      limit: 1000,
      window: 60,
      identifier: 'api_key',
    });
  }

  /**
   * Adiciona configuração de rate limit
   */
  addConfig(config: RateLimitConfig): void {
    this.configs.set(config.name, config);
  }

  /**
   * Remove configuração
   */
  removeConfig(name: string): void {
    this.configs.delete(name);
  }

  /**
   * Verifica rate limit
   */
  async check(
    configName: string,
    identifier: string
  ): Promise<RateLimitResult> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Rate limit config "${configName}" not found`);
    }

    const key = this.buildKey(config, identifier);

    switch (config.algorithm) {
      case 'sliding_window':
        return this.checkSlidingWindow(key, config);
      case 'token_bucket':
        return this.checkTokenBucket(key, config);
      case 'fixed_window':
        return this.checkFixedWindow(key, config);
      case 'leaky_bucket':
        return this.checkLeakyBucket(key, config);
      default:
        return this.checkSlidingWindow(key, config);
    }
  }

  /**
   * Consome um token (para usar após request bem-sucedido)
   */
  async consume(
    configName: string,
    identifier: string,
    cost: number = 1
  ): Promise<RateLimitResult> {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Rate limit config "${configName}" not found`);
    }

    const key = this.buildKey(config, identifier);

    // Incrementa contador
    for (let i = 0; i < cost; i++) {
      await this.storage.incr(key, config.window);
    }

    return this.check(configName, identifier);
  }

  /**
   * Reseta contador para um identificador
   */
  async reset(configName: string, identifier: string): Promise<void> {
    const config = this.configs.get(configName);
    if (!config) return;

    const key = this.buildKey(config, identifier);
    await this.storage.delete(key);
  }

  // ==========================================================================
  // ALGORITMOS
  // ==========================================================================

  /**
   * Sliding Window - mais preciso
   */
  private async checkSlidingWindow(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.window * 1000;
    const windowKey = `${key}:${Math.floor(now / 1000)}`;

    // Conta requests na janela atual
    const count = await this.storage.incr(windowKey, config.window);

    // Considera janela anterior para suavização
    const prevWindowKey = `${key}:${Math.floor(now / 1000) - config.window}`;
    const prevCount = await this.storage.get(prevWindowKey) || 0;

    const elapsed = (now % (config.window * 1000)) / (config.window * 1000);
    const weightedCount = prevCount * (1 - elapsed) + count;

    const allowed = weightedCount <= config.limit;
    const remaining = Math.max(0, Math.floor(config.limit - weightedCount));

    const info: RateLimitInfo = {
      limit: config.limit,
      remaining,
      reset: Math.floor(now / 1000) + config.window,
      used: Math.ceil(weightedCount),
      retryAfter: allowed ? undefined : config.window,
    };

    if (!allowed && config.onLimitReached) {
      config.onLimitReached(key, info);
    }

    return { allowed, info, key };
  }

  /**
   * Token Bucket - permite bursts
   */
  private async checkTokenBucket(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const tokensKey = `${key}:tokens`;
    const lastKey = `${key}:last`;

    // Taxa de reabastecimento
    const refillRate = config.limit / config.window; // tokens/segundo

    // Obtém estado atual
    let tokens = await this.storage.get(tokensKey);
    const lastRefill = await this.storage.get(lastKey);

    if (tokens === null || lastRefill === null) {
      // Inicializa bucket cheio
      tokens = config.limit;
    } else {
      // Calcula tokens reabastecidos
      const elapsed = (now - lastRefill) / 1000;
      tokens = Math.min(config.limit, tokens + elapsed * refillRate);
    }

    const allowed = tokens >= 1;

    if (allowed) {
      tokens -= 1;
    }

    // Atualiza storage
    await this.storage.set(tokensKey, tokens, config.window * 2);
    await this.storage.set(lastKey, now, config.window * 2);

    const remaining = Math.floor(tokens);

    const info: RateLimitInfo = {
      limit: config.limit,
      remaining,
      reset: Math.floor(now / 1000) + Math.ceil((config.limit - tokens) / refillRate),
      used: config.limit - remaining,
      retryAfter: allowed ? undefined : Math.ceil(1 / refillRate),
    };

    if (!allowed && config.onLimitReached) {
      config.onLimitReached(key, info);
    }

    return { allowed, info, key };
  }

  /**
   * Fixed Window - simples
   */
  private async checkFixedWindow(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / (config.window * 1000))}`;

    const count = await this.storage.incr(windowKey, config.window);
    const allowed = count <= config.limit;
    const remaining = Math.max(0, config.limit - count);

    const windowEnd = (Math.floor(now / (config.window * 1000)) + 1) * config.window;

    const info: RateLimitInfo = {
      limit: config.limit,
      remaining,
      reset: windowEnd,
      used: count,
      retryAfter: allowed ? undefined : windowEnd - Math.floor(now / 1000),
    };

    if (!allowed && config.onLimitReached) {
      config.onLimitReached(key, info);
    }

    return { allowed, info, key };
  }

  /**
   * Leaky Bucket - taxa constante
   */
  private async checkLeakyBucket(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const queueKey = `${key}:queue`;
    const lastLeakKey = `${key}:leak`;

    // Taxa de vazamento
    const leakRate = config.limit / config.window; // requests/segundo

    let queueSize = await this.storage.get(queueKey) || 0;
    const lastLeak = await this.storage.get(lastLeakKey) || now;

    // Calcula vazamento desde última verificação
    const elapsed = (now - lastLeak) / 1000;
    const leaked = Math.floor(elapsed * leakRate);
    queueSize = Math.max(0, queueSize - leaked);

    const allowed = queueSize < config.limit;

    if (allowed) {
      queueSize += 1;
    }

    await this.storage.set(queueKey, queueSize, config.window * 2);
    await this.storage.set(lastLeakKey, now, config.window * 2);

    const remaining = Math.max(0, config.limit - queueSize);

    const info: RateLimitInfo = {
      limit: config.limit,
      remaining,
      reset: Math.floor(now / 1000) + Math.ceil(queueSize / leakRate),
      used: queueSize,
      retryAfter: allowed ? undefined : Math.ceil(1 / leakRate),
    };

    if (!allowed && config.onLimitReached) {
      config.onLimitReached(key, info);
    }

    return { allowed, info, key };
  }

  /**
   * Constrói chave de storage
   */
  private buildKey(config: RateLimitConfig, identifier: string): string {
    const prefix = config.keyPrefix || 'rl';
    return `${prefix}:${config.name}:${identifier}`;
  }
}

export { QuotaManager } from './rate-limiting.quota';

// ============================================================================
// MIDDLEWARE
// ============================================================================

export interface RateLimitMiddlewareOptions {
  configName: string;
  identifier?: (req: Request) => string;
  onRateLimited?: (req: Request, info: RateLimitInfo) => Response;
}

/**
 * Middleware de rate limiting para API routes
 */
export function rateLimitMiddleware(
  options: RateLimitMiddlewareOptions
): (req: Request) => Promise<Response | null> {
  const limiter = new RateLimiter();

  return async (req: Request): Promise<Response | null> => {
    const identifier = options.identifier?.(req) || getClientIP(req);
    const result = await limiter.check(options.configName, identifier);

    // Adiciona headers de rate limit
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', String(result.info.limit));
    headers.set('X-RateLimit-Remaining', String(result.info.remaining));
    headers.set('X-RateLimit-Reset', String(result.info.reset));

    if (!result.allowed) {
      headers.set('Retry-After', String(result.info.retryAfter || 60));

      if (options.onRateLimited) {
        return options.onRateLimited(req, result.info);
      }

      return new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: result.info.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers),
          },
        }
      );
    }

    return null; // Permite continuar
  };
}

/**
 * Wrapper para API routes com rate limiting
 */
export function withRateLimit<T>(
  handler: (req: Request) => Promise<T>,
  options: RateLimitMiddlewareOptions
): (req: Request) => Promise<T | Response> {
  const middleware = rateLimitMiddleware(options);

  return async (req: Request) => {
    const rateLimitResponse = await middleware(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(req);
  };
}

/**
 * Extrai IP do cliente
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

// ============================================================================
// EXPORTS
// ============================================================================

export const rateLimiter = new RateLimiter();
export const quotaManager = new QuotaManager();
export const ddosProtection = new DDoSProtection();

// NOTE: useQuota hook moved to @/lib/hooks/use-quota.ts for client-side usage

const rateLimitingModule = {
  RateLimiter,
  QuotaManager,
  DDoSProtection,
  rateLimitMiddleware,
  withRateLimit,
};

export default rateLimitingModule;
