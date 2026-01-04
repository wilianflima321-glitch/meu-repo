/**
 * Sistema de Rate Limiting Avançado - Aethel Engine
 * 
 * Sistema completo para:
 * - Rate limiting por IP, usuário, API key
 * - Sliding window e token bucket algorithms
 * - Limites por plano
 * - DDoS protection
 * - Quota management
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

// ============================================================================
// TIPOS
// ============================================================================

export type RateLimitAlgorithm = 'sliding_window' | 'token_bucket' | 'fixed_window' | 'leaky_bucket';

export type RateLimitIdentifier = 'ip' | 'user' | 'api_key' | 'custom';

export interface RateLimitConfig {
  name: string;
  algorithm: RateLimitAlgorithm;
  limit: number;
  window: number; // em segundos
  identifier: RateLimitIdentifier;
  keyPrefix?: string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  onLimitReached?: (key: string, info: RateLimitInfo) => void;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // timestamp
  retryAfter?: number; // segundos
  used: number;
}

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
  key: string;
}

export interface QuotaConfig {
  name: string;
  limit: number;
  period: 'minute' | 'hour' | 'day' | 'week' | 'month';
  resource: string;
}

export interface QuotaUsage {
  quota: string;
  used: number;
  limit: number;
  remaining: number;
  resetsAt: Date;
  percentUsed: number;
}

// ============================================================================
// STORAGE INTERFACE
// ============================================================================

interface RateLimitStorage {
  get(key: string): Promise<number | null>;
  set(key: string, value: number, ttl: number): Promise<void>;
  incr(key: string, ttl: number): Promise<number>;
  decr(key: string): Promise<number>;
  delete(key: string): Promise<void>;
  getMulti(keys: string[]): Promise<(number | null)[]>;
}

// ============================================================================
// IN-MEMORY STORAGE
// ============================================================================

class MemoryStorage implements RateLimitStorage {
  private store: Map<string, { value: number; expiresAt: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor() {
    // Limpa entradas expiradas a cada minuto
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }
  
  async get(key: string): Promise<number | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }
  
  async set(key: string, value: number, ttl: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttl * 1000,
    });
  }
  
  async incr(key: string, ttl: number): Promise<number> {
    const entry = this.store.get(key);
    const now = Date.now();
    
    if (!entry || entry.expiresAt < now) {
      this.store.set(key, { value: 1, expiresAt: now + ttl * 1000 });
      return 1;
    }
    
    entry.value++;
    return entry.value;
  }
  
  async decr(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.value = Math.max(0, entry.value - 1);
    return entry.value;
  }
  
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  
  async getMulti(keys: string[]): Promise<(number | null)[]> {
    return Promise.all(keys.map(key => this.get(key)));
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt < now) {
        this.store.delete(key);
      }
    }
  }
  
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

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

// ============================================================================
// QUOTA MANAGER
// ============================================================================

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
// DDOS PROTECTION
// ============================================================================

export class DDoSProtection {
  private rateLimiter: RateLimiter;
  private blacklist: Set<string> = new Set();
  private suspiciousActivity: Map<string, number> = new Map();
  private threshold = 10; // Atividade suspeita threshold
  
  constructor() {
    this.rateLimiter = new RateLimiter();
    
    // Rate limit muito agressivo para proteção
    this.rateLimiter.addConfig({
      name: 'ddos_protection',
      algorithm: 'sliding_window',
      limit: 1000,
      window: 60,
      identifier: 'ip',
      onLimitReached: (key, info) => {
        this.handleSuspiciousIP(key);
      },
    });
  }
  
  /**
   * Verifica se IP está bloqueado
   */
  isBlocked(ip: string): boolean {
    return this.blacklist.has(ip);
  }
  
  /**
   * Verifica request contra DDoS
   */
  async check(ip: string): Promise<{
    allowed: boolean;
    blocked: boolean;
    suspicious: boolean;
  }> {
    if (this.blacklist.has(ip)) {
      return { allowed: false, blocked: true, suspicious: false };
    }
    
    const result = await this.rateLimiter.check('ddos_protection', ip);
    const suspicious = this.isSuspicious(ip);
    
    return {
      allowed: result.allowed && !suspicious,
      blocked: false,
      suspicious,
    };
  }
  
  /**
   * Registra atividade suspeita
   */
  private handleSuspiciousIP(key: string): void {
    const ip = key.split(':').pop() || '';
    const count = (this.suspiciousActivity.get(ip) || 0) + 1;
    this.suspiciousActivity.set(ip, count);
    
    if (count >= this.threshold) {
      this.blacklist.add(ip);
      console.log(`[DDoS] IP blocked: ${ip}`);
    }
  }
  
  /**
   * Verifica se IP é suspeito
   */
  private isSuspicious(ip: string): boolean {
    const count = this.suspiciousActivity.get(ip) || 0;
    return count >= this.threshold / 2;
  }
  
  /**
   * Remove IP da blacklist
   */
  unblock(ip: string): void {
    this.blacklist.delete(ip);
    this.suspiciousActivity.delete(ip);
  }
  
  /**
   * Lista IPs bloqueados
   */
  getBlockedIPs(): string[] {
    return Array.from(this.blacklist);
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';

export function useQuota(quotaName: string, userId: string) {
  const [usage, setUsage] = useState<QuotaUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const manager = useMemo(() => new QuotaManager(), []);
  
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await manager.getUsage(quotaName, userId);
      setUsage(data);
    } finally {
      setLoading(false);
    }
  }, [manager, quotaName, userId]);
  
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  const consume = useCallback(async (amount: number = 1) => {
    const newUsage = await manager.consume(quotaName, userId, amount);
    setUsage(newUsage);
    return newUsage;
  }, [manager, quotaName, userId]);
  
  return {
    usage,
    loading,
    refresh,
    consume,
    canUse: (amount: number = 1) => usage ? usage.remaining >= amount : false,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const rateLimiter = new RateLimiter();
export const quotaManager = new QuotaManager();
export const ddosProtection = new DDoSProtection();

const rateLimitingModule = {
  RateLimiter,
  QuotaManager,
  DDoSProtection,
  rateLimitMiddleware,
  withRateLimit,
  useQuota,
};

export default rateLimitingModule;
