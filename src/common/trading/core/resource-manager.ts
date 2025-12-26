/**
 * Resource Manager - Sistema de Gerenciamento de Recursos
 * Otimiza custos e protege tokens dos usuários
 * 
 * Funcionalidades:
 * - Controle de uso de tokens/API calls
 * - Cache inteligente para evitar recálculos
 * - Níveis de análise adaptativos
 * - Modo econômico automático
 * - Priorização de operações críticas
 * - Fallbacks quando recursos acabam
 */

import { EventEmitter } from 'events';

// ============================================
// RESOURCE TYPES
// ============================================

export type AnalysisLevel = 'minimal' | 'basic' | 'standard' | 'full' | 'premium';
export type UserTier = 'free' | 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';
export type ResourceStatus = 'healthy' | 'warning' | 'critical' | 'exhausted';

export interface ResourceQuota {
  // Token limits
  dailyTokenLimit: number;
  hourlyTokenLimit: number;
  
  // Current usage
  tokensUsedToday: number;
  tokensUsedThisHour: number;
  
  // API calls
  apiCallsToday: number;
  apiCallsLimit: number;
  
  // Timestamps
  dayStartedAt: Date;
  hourStartedAt: Date;
}

export interface ResourceConfig {
  // User tier
  userTier: 'free' | 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';
  
  // Limits by tier
  limits: TierLimits;
  
  // Behavior settings
  enableAutoDowngrade: boolean;
  warningThreshold: number; // % of limit
  criticalThreshold: number; // % of limit
  
  // Cache settings
  enableCache: boolean;
  cacheTTL: number; // ms
  maxCacheSize: number; // entries
  
  // Throttle settings
  minAnalysisInterval: number; // ms
  batchAnalysis: boolean;
  maxBatchSize: number;
}

export interface TierLimits {
  free: { daily: number; hourly: number; api: number; level: AnalysisLevel };
  starter: { daily: number; hourly: number; api: number; level: AnalysisLevel };
  basic: { daily: number; hourly: number; api: number; level: AnalysisLevel };
  pro: { daily: number; hourly: number; api: number; level: AnalysisLevel };
  studio: { daily: number; hourly: number; api: number; level: AnalysisLevel };
  enterprise: { daily: number; hourly: number; api: number; level: AnalysisLevel };
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  cost: number; // Token cost to regenerate
}

export interface ResourceUsageReport {
  // Current status
  status: 'healthy' | 'warning' | 'critical' | 'exhausted';
  currentLevel: AnalysisLevel;
  
  // Usage percentages
  dailyUsagePercent: number;
  hourlyUsagePercent: number;
  
  // Tokens
  tokensUsed: number;
  tokensRemaining: number;
  estimatedTimeToExhaustion: number; // ms
  
  // Recommendations
  recommendations: string[];
  
  // Cost breakdown
  costBreakdown: {
    indicators: number;
    patterns: number;
    aiAnalysis: number;
    execution: number;
  };
}

export interface OperationCost {
  operation: string;
  baseCost: number;
  actualCost: number;
  cached: boolean;
  level: AnalysisLevel;
}

// ============================================
// DEFAULT TIER LIMITS
// ============================================

export const DEFAULT_TIER_LIMITS: TierLimits = {
  free: { daily: 1000, hourly: 100, api: 50, level: 'minimal' },
  starter: { daily: 5000, hourly: 500, api: 200, level: 'basic' },
  basic: { daily: 15000, hourly: 1500, api: 500, level: 'standard' },
  pro: { daily: 50000, hourly: 5000, api: 2000, level: 'full' },
  studio: { daily: 150000, hourly: 15000, api: 5000, level: 'full' },
  enterprise: { daily: Infinity, hourly: Infinity, api: Infinity, level: 'premium' },
};

// ============================================
// OPERATION COSTS BY LEVEL
// ============================================

export const OPERATION_COSTS = {
  // Technical indicators
  indicators: {
    minimal: 5,    // Only essential (RSI, MA)
    basic: 15,     // + MACD, Bollinger
    standard: 35,  // + ADX, Ichimoku
    full: 60,      // All indicators
    premium: 80,   // All + advanced
  },
  
  // Pattern recognition
  patterns: {
    minimal: 0,    // Disabled
    basic: 10,     // Only candlestick
    standard: 25,  // + chart patterns
    full: 45,      // + harmonic
    premium: 70,   // All + ML patterns
  },
  
  // AI analysis
  aiAnalysis: {
    minimal: 10,   // Simple bias only
    basic: 30,     // + basic reasoning
    standard: 60,  // + opportunities
    full: 100,     // Full decision context
    premium: 150,  // + predictions
  },
  
  // Market snapshot
  snapshot: {
    minimal: 15,
    basic: 40,
    standard: 80,
    full: 150,
    premium: 200,
  },
  
  // Regime detection
  regime: {
    minimal: 5,
    basic: 10,
    standard: 20,
    full: 35,
    premium: 50,
  },
  
  // Optimization
  optimization: {
    minimal: 10,
    basic: 25,
    standard: 50,
    full: 90,
    premium: 130,
  },
};

// ============================================
// RESOURCE MANAGER CLASS
// ============================================

export class ResourceManager extends EventEmitter {
  private config: ResourceConfig;
  private quota: ResourceQuota;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private operationLog: OperationCost[] = [];
  private lastAnalysisTime: number = 0;
  private pendingBatch: Array<{ key: string; operation: () => Promise<unknown> }> = [];

  constructor(userTier: ResourceConfig['userTier'] = 'basic') {
    super();
    
    this.config = {
      userTier,
      limits: DEFAULT_TIER_LIMITS,
      enableAutoDowngrade: true,
      warningThreshold: 0.7, // 70%
      criticalThreshold: 0.9, // 90%
      enableCache: true,
      cacheTTL: 60 * 1000, // 1 minute
      maxCacheSize: 100,
      minAnalysisInterval: 5000, // 5 seconds
      batchAnalysis: true,
      maxBatchSize: 5,
    };
    
    this.quota = this.initializeQuota();
    
    // Auto-reset hourly
    setInterval(() => this.resetHourlyIfNeeded(), 60 * 1000);
  }

  // ============================================
  // QUOTA MANAGEMENT
  // ============================================

  /**
   * Initialize quota based on user tier
   */
  private initializeQuota(): ResourceQuota {
    const tierLimits = this.config.limits[this.config.userTier];
    
    return {
      dailyTokenLimit: tierLimits.daily,
      hourlyTokenLimit: tierLimits.hourly,
      tokensUsedToday: 0,
      tokensUsedThisHour: 0,
      apiCallsToday: 0,
      apiCallsLimit: tierLimits.api,
      dayStartedAt: new Date(),
      hourStartedAt: new Date(),
    };
  }

  /**
   * Reset hourly quota if needed
   */
  private resetHourlyIfNeeded(): void {
    const now = new Date();
    const hoursPassed = (now.getTime() - this.quota.hourStartedAt.getTime()) / (60 * 60 * 1000);
    
    if (hoursPassed >= 1) {
      this.quota.tokensUsedThisHour = 0;
      this.quota.hourStartedAt = now;
      this.emit('hourlyReset');
    }
    
    // Also check daily reset
    const daysPassed = (now.getTime() - this.quota.dayStartedAt.getTime()) / (24 * 60 * 60 * 1000);
    if (daysPassed >= 1) {
      this.quota.tokensUsedToday = 0;
      this.quota.apiCallsToday = 0;
      this.quota.dayStartedAt = now;
      this.operationLog = [];
      this.emit('dailyReset');
    }
  }

  /**
   * Get current analysis level based on resource availability
   */
  getCurrentLevel(): AnalysisLevel {
    const usagePercent = this.getUsagePercent();
    const tierLevel = this.config.limits[this.config.userTier].level;
    
    // If auto-downgrade is enabled, adjust level based on usage
    if (this.config.enableAutoDowngrade) {
      if (usagePercent >= 0.95) return 'minimal';
      if (usagePercent >= this.config.criticalThreshold) {
        return this.downgradeLevel(tierLevel, 2);
      }
      if (usagePercent >= this.config.warningThreshold) {
        return this.downgradeLevel(tierLevel, 1);
      }
    }
    
    return tierLevel;
  }

  /**
   * Downgrade analysis level
   */
  private downgradeLevel(level: AnalysisLevel, steps: number): AnalysisLevel {
    const levels: AnalysisLevel[] = ['minimal', 'basic', 'standard', 'full', 'premium'];
    const currentIndex = levels.indexOf(level);
    const newIndex = Math.max(0, currentIndex - steps);
    return levels[newIndex];
  }

  /**
   * Get usage percentage
   */
  private getUsagePercent(): number {
    const dailyPercent = this.quota.tokensUsedToday / this.quota.dailyTokenLimit;
    const hourlyPercent = this.quota.tokensUsedThisHour / this.quota.hourlyTokenLimit;
    return Math.max(dailyPercent, hourlyPercent);
  }

  // ============================================
  // RESOURCE CHECKING
  // ============================================

  /**
   * Check if operation can be performed
   */
  canPerform(operation: keyof typeof OPERATION_COSTS): boolean {
    const level = this.getCurrentLevel();
    const cost = OPERATION_COSTS[operation][level];
    
    return (
      this.quota.tokensUsedToday + cost <= this.quota.dailyTokenLimit &&
      this.quota.tokensUsedThisHour + cost <= this.quota.hourlyTokenLimit
    );
  }

  /**
   * Check if should throttle
   */
  shouldThrottle(): boolean {
    const now = Date.now();
    return now - this.lastAnalysisTime < this.config.minAnalysisInterval;
  }

  /**
   * Estimate remaining operations
   */
  estimateRemainingOperations(operation: keyof typeof OPERATION_COSTS): number {
    const level = this.getCurrentLevel();
    const cost = OPERATION_COSTS[operation][level];
    const remaining = Math.min(
      this.quota.dailyTokenLimit - this.quota.tokensUsedToday,
      this.quota.hourlyTokenLimit - this.quota.tokensUsedThisHour
    );
    return Math.floor(remaining / cost);
  }

  // ============================================
  // RESOURCE CONSUMPTION
  // ============================================

  /**
   * Consume resources for an operation
   */
  consume(operation: keyof typeof OPERATION_COSTS, cached: boolean = false): OperationCost {
    const level = this.getCurrentLevel();
    const baseCost = OPERATION_COSTS[operation][level];
    const actualCost = cached ? 0 : baseCost;
    
    // Update quota
    this.quota.tokensUsedToday += actualCost;
    this.quota.tokensUsedThisHour += actualCost;
    this.quota.apiCallsToday += cached ? 0 : 1;
    
    // Log operation
    const opCost: OperationCost = {
      operation,
      baseCost,
      actualCost,
      cached,
      level,
    };
    this.operationLog.push(opCost);
    
    // Check thresholds
    this.checkThresholds();
    
    this.lastAnalysisTime = Date.now();
    
    return opCost;
  }

  /**
   * Check and emit threshold warnings
   */
  private checkThresholds(): void {
    const usagePercent = this.getUsagePercent();
    
    if (usagePercent >= 1) {
      this.emit('exhausted', this.getUsageReport());
    } else if (usagePercent >= this.config.criticalThreshold) {
      this.emit('critical', this.getUsageReport());
    } else if (usagePercent >= this.config.warningThreshold) {
      this.emit('warning', this.getUsageReport());
    }
  }

  // ============================================
  // CACHING SYSTEM
  // ============================================

  /**
   * Get from cache
   */
  getCache<T>(key: string): T | null {
    if (!this.config.enableCache) return null;
    
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    entry.hits++;
    return entry.data;
  }

  /**
   * Set cache entry
   */
  setCache<T>(key: string, data: T, cost: number, ttl?: number): void {
    if (!this.config.enableCache) return;
    
    // Enforce max cache size
    if (this.cache.size >= this.config.maxCacheSize) {
      this.evictLeastUsed();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL,
      hits: 0,
      cost,
    });
  }

  /**
   * Evict least used cache entries
   */
  private evictLeastUsed(): void {
    let minHits = Infinity;
    let minKey = '';
    
    for (const [key, entry] of this.cache) {
      if (entry.hits < minHits) {
        minHits = entry.hits;
        minKey = key;
      }
    }
    
    if (minKey) {
      this.cache.delete(minKey);
    }
  }

  /**
   * Generate cache key
   */
  generateCacheKey(operation: string, symbol: string, params?: Record<string, unknown>): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${operation}:${symbol}:${paramStr}`;
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; hitRate: number; savedTokens: number } {
    let totalHits = 0;
    let savedTokens = 0;
    
    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      savedTokens += entry.hits * entry.cost;
    }
    
    return {
      size: this.cache.size,
      hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0,
      savedTokens,
    };
  }

  // ============================================
  // SMART EXECUTION
  // ============================================

  /**
   * Execute operation with resource management
   */
  async execute<T>(
    operation: keyof typeof OPERATION_COSTS,
    cacheKey: string,
    executor: () => Promise<T>,
    options?: { forceFresh?: boolean; ttl?: number }
  ): Promise<{ data: T; cost: OperationCost }> {
    // Check cache first
    if (!options?.forceFresh) {
      const cached = this.getCache<T>(cacheKey);
      if (cached !== null) {
        const cost = this.consume(operation, true);
        return { data: cached, cost };
      }
    }
    
    // Check if can perform
    if (!this.canPerform(operation)) {
      throw new ResourceExhaustedError(operation, this.getUsageReport());
    }
    
    // Check throttle
    if (this.shouldThrottle()) {
      await this.waitForThrottle();
    }
    
    // Execute
    const data = await executor();
    
    // Consume and cache
    const cost = this.consume(operation, false);
    const baseCost = OPERATION_COSTS[operation][this.getCurrentLevel()];
    this.setCache(cacheKey, data, baseCost, options?.ttl);
    
    return { data, cost };
  }

  /**
   * Wait for throttle to pass
   */
  private waitForThrottle(): Promise<void> {
    const waitTime = this.config.minAnalysisInterval - (Date.now() - this.lastAnalysisTime);
    return new Promise(resolve => setTimeout(resolve, Math.max(0, waitTime)));
  }

  /**
   * Execute batch of operations efficiently
   */
  async executeBatch<T>(
    operations: Array<{
      operation: keyof typeof OPERATION_COSTS;
      cacheKey: string;
      executor: () => Promise<T>;
    }>
  ): Promise<Array<{ data: T; cost: OperationCost }>> {
    const results: Array<{ data: T; cost: OperationCost }> = [];
    
    // Sort by cost (cheapest first to maximize throughput)
    const sorted = [...operations].sort((a, b) => {
      const level = this.getCurrentLevel();
      return OPERATION_COSTS[a.operation][level] - OPERATION_COSTS[b.operation][level];
    });
    
    for (const op of sorted) {
      try {
        const result = await this.execute(op.operation, op.cacheKey, op.executor);
        results.push(result);
      } catch (error) {
        if (error instanceof ResourceExhaustedError) {
          break; // Stop batch if resources exhausted
        }
        throw error;
      }
    }
    
    return results;
  }

  // ============================================
  // REPORTING
  // ============================================

  /**
   * Get detailed usage report
   */
  getUsageReport(): ResourceUsageReport {
    const dailyUsagePercent = this.quota.tokensUsedToday / this.quota.dailyTokenLimit;
    const hourlyUsagePercent = this.quota.tokensUsedThisHour / this.quota.hourlyTokenLimit;
    const usagePercent = Math.max(dailyUsagePercent, hourlyUsagePercent);
    
    // Determine status
    let status: ResourceUsageReport['status'] = 'healthy';
    if (usagePercent >= 1) status = 'exhausted';
    else if (usagePercent >= this.config.criticalThreshold) status = 'critical';
    else if (usagePercent >= this.config.warningThreshold) status = 'warning';
    
    // Calculate cost breakdown
    const costBreakdown = {
      indicators: 0,
      patterns: 0,
      aiAnalysis: 0,
      execution: 0,
    };
    
    for (const op of this.operationLog) {
      if (op.operation === 'indicators') costBreakdown.indicators += op.actualCost;
      else if (op.operation === 'patterns') costBreakdown.patterns += op.actualCost;
      else if (op.operation.includes('ai') || op.operation === 'snapshot') {
        costBreakdown.aiAnalysis += op.actualCost;
      } else {
        costBreakdown.execution += op.actualCost;
      }
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    if (status === 'warning' || status === 'critical') {
      recommendations.push('Considere fazer upgrade do plano para mais tokens');
      recommendations.push('Reduza a frequência de análises');
      if (!this.config.enableCache) {
        recommendations.push('Habilite o cache para economizar tokens');
      }
    }
    if (costBreakdown.aiAnalysis > costBreakdown.indicators * 2) {
      recommendations.push('Análises AI consomem muitos tokens - considere usar modo básico');
    }
    
    // Estimate time to exhaustion
    const avgCostPerHour = this.quota.tokensUsedThisHour;
    const tokensRemaining = Math.min(
      this.quota.dailyTokenLimit - this.quota.tokensUsedToday,
      this.quota.hourlyTokenLimit - this.quota.tokensUsedThisHour
    );
    const estimatedTimeToExhaustion = avgCostPerHour > 0 
      ? (tokensRemaining / avgCostPerHour) * 60 * 60 * 1000 
      : Infinity;
    
    return {
      status,
      currentLevel: this.getCurrentLevel(),
      dailyUsagePercent: dailyUsagePercent * 100,
      hourlyUsagePercent: hourlyUsagePercent * 100,
      tokensUsed: this.quota.tokensUsedToday,
      tokensRemaining,
      estimatedTimeToExhaustion,
      recommendations,
      costBreakdown,
    };
  }

  /**
   * Get quota summary for UI
   */
  getQuotaSummary(): {
    used: number;
    limit: number;
    percent: number;
    level: AnalysisLevel;
    status: string;
  } {
    return {
      used: this.quota.tokensUsedToday,
      limit: this.quota.dailyTokenLimit,
      percent: (this.quota.tokensUsedToday / this.quota.dailyTokenLimit) * 100,
      level: this.getCurrentLevel(),
      status: this.getUsageReport().status,
    };
  }

  /**
   * Alias for getUsageReport - returns status info
   */
  getStatus(): ResourceUsageReport & { tokensUsed: number; tokensRemaining: number } {
    const report = this.getUsageReport();
    return {
      ...report,
      tokensUsed: this.quota.tokensUsedToday,
      tokensRemaining: report.tokensRemaining,
    };
  }

  /**
   * Check if operation can be performed - alias for canPerform
   */
  canPerformOperation(operation: keyof typeof OPERATION_COSTS): boolean {
    return this.canPerform(operation);
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  /**
   * Update user tier
   */
  setUserTier(tier: ResourceConfig['userTier']): void {
    this.config.userTier = tier;
    const tierLimits = this.config.limits[tier];
    this.quota.dailyTokenLimit = tierLimits.daily;
    this.quota.hourlyTokenLimit = tierLimits.hourly;
    this.quota.apiCallsLimit = tierLimits.api;
    this.emit('tierChanged', tier);
  }

  /**
   * Update config
   */
  updateConfig(updates: Partial<ResourceConfig>): void {
    this.config = { ...this.config, ...updates };
    this.emit('configUpdated', this.config);
  }

  /**
   * Reset usage (for testing/admin)
   */
  resetUsage(): void {
    this.quota.tokensUsedToday = 0;
    this.quota.tokensUsedThisHour = 0;
    this.quota.apiCallsToday = 0;
    this.operationLog = [];
    this.emit('usageReset');
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cacheCleared');
  }
}

// ============================================
// RESOURCE EXHAUSTED ERROR
// ============================================

export class ResourceExhaustedError extends Error {
  public operation: string;
  public report: ResourceUsageReport;
  
  constructor(operation: string, report: ResourceUsageReport) {
    super(`Recursos esgotados para operação: ${operation}`);
    this.name = 'ResourceExhaustedError';
    this.operation = operation;
    this.report = report;
  }
}

// ============================================
// ADAPTIVE ANALYSIS CONFIG
// ============================================

export interface AdaptiveAnalysisConfig {
  // What to include at each level
  minimal: {
    indicators: string[];
    patterns: boolean;
    aiAnalysis: boolean;
    regime: boolean;
    optimization: boolean;
  };
  basic: {
    indicators: string[];
    patterns: boolean;
    aiAnalysis: boolean;
    regime: boolean;
    optimization: boolean;
  };
  standard: {
    indicators: string[];
    patterns: boolean;
    aiAnalysis: boolean;
    regime: boolean;
    optimization: boolean;
  };
  full: {
    indicators: string[];
    patterns: boolean;
    aiAnalysis: boolean;
    regime: boolean;
    optimization: boolean;
  };
  premium: {
    indicators: string[];
    patterns: boolean;
    aiAnalysis: boolean;
    regime: boolean;
    optimization: boolean;
  };
}

export const ADAPTIVE_ANALYSIS_CONFIG: AdaptiveAnalysisConfig = {
  minimal: {
    indicators: ['sma20', 'rsi14'],
    patterns: false,
    aiAnalysis: false,
    regime: false,
    optimization: false,
  },
  basic: {
    indicators: ['sma20', 'sma50', 'rsi14', 'macd', 'atr14'],
    patterns: true, // Only candlestick
    aiAnalysis: false,
    regime: true,
    optimization: false,
  },
  standard: {
    indicators: ['sma20', 'sma50', 'ema20', 'rsi14', 'macd', 'stochastic', 'atr14', 'bollinger'],
    patterns: true, // Candlestick + chart
    aiAnalysis: true, // Basic
    regime: true,
    optimization: true, // Basic
  },
  full: {
    indicators: ['all'],
    patterns: true, // All patterns
    aiAnalysis: true, // Full
    regime: true,
    optimization: true, // Full
  },
  premium: {
    indicators: ['all'],
    patterns: true,
    aiAnalysis: true, // Premium with predictions
    regime: true,
    optimization: true, // Advanced
  },
};

// ============================================
// FACTORY & SINGLETON
// ============================================

let resourceManagerInstance: ResourceManager | null = null;

export function getResourceManager(tier?: ResourceConfig['userTier']): ResourceManager {
  if (!resourceManagerInstance) {
    resourceManagerInstance = new ResourceManager(tier || 'basic');
  }
  return resourceManagerInstance;
}

export function createResourceManager(tier: ResourceConfig['userTier']): ResourceManager {
  return new ResourceManager(tier);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if operation is allowed before expensive computation
 */
export function checkResources(operation: keyof typeof OPERATION_COSTS): boolean {
  return getResourceManager().canPerform(operation);
}

/**
 * Get current analysis level
 */
export function getAnalysisLevel(): AnalysisLevel {
  return getResourceManager().getCurrentLevel();
}

/**
 * Get adaptive config for current level
 */
export function getAdaptiveConfig(): AdaptiveAnalysisConfig[AnalysisLevel] {
  const level = getAnalysisLevel();
  return ADAPTIVE_ANALYSIS_CONFIG[level];
}
