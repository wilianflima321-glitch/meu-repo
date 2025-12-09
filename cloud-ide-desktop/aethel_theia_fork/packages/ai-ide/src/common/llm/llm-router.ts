import { injectable, inject } from 'inversify';
import { Emitter, Event } from '@theia/core';
import { ConfigService } from '../config/config-service';

/**
 * LLM provider configuration
 */
export interface LLMProvider {
  id: string;
  name: string;
  models: LLMModel[];
  endpoint: string;
  apiKey: string;
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  pricing: {
    inputTokenCost: number;  // per 1M tokens
    outputTokenCost: number; // per 1M tokens
  };
  capabilities: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    maxContextLength: number;
  };
}

/**
 * LLM model configuration
 */
export interface LLMModel {
  id: string;
  name: string;
  providerId: string;
  tier: 'fast' | 'balanced' | 'quality';
  contextWindow: number;
  pricing: {
    input: number;  // per 1M tokens
    output: number; // per 1M tokens
  };
  performance: {
    avgLatencyMs: number;
    p95LatencyMs: number;
    throughputTPS: number;
  };
  capabilities: string[];
}

/**
 * Routing request with constraints
 */
export interface RoutingRequest {
  domain: 'code' | 'trading' | 'research' | 'creative';
  task: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  constraints: {
    maxCost?: number;
    maxLatency?: number;
    minQuality?: number;
    requiredCapabilities?: string[];
  };
  context: {
    workspaceId: string;
    userId: string;
    budget: {
      total: number;
      spent: number;
      remaining: number;
    };
  };
  estimatedTokens?: {
    input: number;
    output: number;
  };
}

/**
 * Routing decision
 */
export interface RoutingDecision {
  model: LLMModel;
  provider: LLMProvider;
  estimatedCost: number;
  estimatedLatency: number;
  qualityScore: number;
  reasoning: string;
  fallbacks: Array<{ model: LLMModel; provider: LLMProvider }>;
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  providerId: string;
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure?: number;
  nextRetry?: number;
}

/**
 * Request metrics
 */
interface RequestMetrics {
  providerId: string;
  modelId: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  success: boolean;
  timestamp: number;
}

/**
 * Budget tracking
 */
interface BudgetTracker {
  workspaceId: string;
  total: number;
  spent: number;
  remaining: number;
  alerts: Array<{ threshold: number; triggered: boolean }>;
}

/**
 * LLM Router with cost optimization, circuit breakers, and fallback
 */
@injectable()
export class LLMRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private models: Map<string, LLMModel> = new Map();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private metrics: RequestMetrics[] = [];
  private budgets: Map<string, BudgetTracker> = new Map();
  private cache: Map<string, any> = new Map();

  private readonly onCostAlertEmitter = new Emitter<{ workspaceId: string; threshold: number }>();
  readonly onCostAlert: Event<{ workspaceId: string; threshold: number }> = this.onCostAlertEmitter.event;

  private readonly onCircuitOpenEmitter = new Emitter<{ providerId: string }>();
  readonly onCircuitOpen: Event<{ providerId: string }> = this.onCircuitOpenEmitter.event;

  // Circuit breaker config
  private readonly FAILURE_THRESHOLD = 5;
  private readonly TIMEOUT_MS = 60000; // 1 minute
  private readonly HALF_OPEN_DELAY_MS = 30000; // 30 seconds

  @inject(ConfigService)
  private readonly configService!: ConfigService;

  constructor() {
    // Providers will be loaded from ConfigService after initialization
    this.startMetricsCleanup();
  }

  /**
   * Initialize router (call after ConfigService is loaded)
   */
  async initialize(): Promise<void> {
    await this.configService.waitForReady();
    await this.loadProvidersFromConfig();
  }

  /**
   * Route request to optimal model
   */
  async route(request: RoutingRequest): Promise<RoutingDecision> {
    // Check budget first
    const budget = this.getBudget(request.context.workspaceId);
    if (budget.remaining <= 0) {
      throw new Error('Budget exhausted for workspace');
    }

    // Check cache
    const cacheKey = this.getCacheKey(request);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      return {
        ...cached,
        reasoning: 'Served from cache (zero cost)',
        estimatedCost: 0,
      };
    }

    // Get available models
    const candidates = this.getCandidateModels(request);
    if (candidates.length === 0) {
      throw new Error('No available models match requirements');
    }

    // Score and rank candidates
    const scored = candidates.map(candidate => ({
      ...candidate,
      score: this.scoreModel(candidate, request),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Select best model
    const best = scored[0];
    const provider = this.providers.get(best.model.providerId)!;

    // Calculate cost
    const estimatedCost = this.calculateCost(
      best.model,
      request.estimatedTokens || { input: 1000, output: 500 }
    );

    // Check if cost exceeds budget
    if (estimatedCost > budget.remaining) {
      // Try cheaper alternatives
      const cheaper = scored.find(
        s => this.calculateCost(s.model, request.estimatedTokens || { input: 1000, output: 500 }) <= budget.remaining
      );
      
      if (!cheaper) {
        throw new Error(`Estimated cost $${estimatedCost.toFixed(4)} exceeds remaining budget $${budget.remaining.toFixed(4)}`);
      }

      return this.createDecision(cheaper.model, request, scored.slice(1, 4));
    }

    // Check cost alert thresholds
    this.checkCostAlerts(request.context.workspaceId, budget.spent + estimatedCost, budget.total);

    return this.createDecision(best.model, request, scored.slice(1, 4));
  }

  /**
   * Execute request with fallback
   */
  async execute<T>(
    decision: RoutingDecision,
    executor: (model: LLMModel, provider: LLMProvider) => Promise<T>,
    request: RoutingRequest
  ): Promise<T> {
    const attempts = [
      { model: decision.model, provider: decision.provider },
      ...decision.fallbacks,
    ];

    let lastError: Error | undefined;

    for (const attempt of attempts) {
      // Check circuit breaker
      if (!this.canAttempt(attempt.provider.id)) {
        continue;
      }

      const startTime = Date.now();
      try {
        const result = await Promise.race([
          executor(attempt.model, attempt.provider),
          this.timeout(this.TIMEOUT_MS),
        ]);

        const latency = Date.now() - startTime;

        // Record success
        this.recordSuccess(attempt.provider.id, attempt.model.id, latency, request);

        return result as T;
      } catch (error) {
        lastError = error as Error;
        const latency = Date.now() - startTime;

        // Record failure
        this.recordFailure(attempt.provider.id, attempt.model.id, latency, request, error as Error);

        // Continue to next fallback
        continue;
      }
    }

    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  /**
   * Estimate cost before execution
   */
  estimateCost(request: RoutingRequest): { min: number; max: number; recommended: number } {
    const candidates = this.getCandidateModels(request);
    
    const tokens = request.estimatedTokens || { input: 1000, output: 500 };
    const costs = candidates.map(c => this.calculateCost(c.model, tokens));

    return {
      min: Math.min(...costs),
      max: Math.max(...costs),
      recommended: costs[0] || 0,
    };
  }

  /**
   * Get post-mortem analysis
   */
  getPostMortem(workspaceId: string, timeRange: { start: number; end: number }): any {
    const workspaceMetrics = this.metrics.filter(
      m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );

    const totalCost = workspaceMetrics.reduce((sum, m) => sum + m.cost, 0);
    const totalRequests = workspaceMetrics.length;
    const successRate = workspaceMetrics.filter(m => m.success).length / totalRequests;

    const byModel = new Map<string, { count: number; cost: number; avgLatency: number }>();
    for (const metric of workspaceMetrics) {
      const key = metric.modelId;
      const existing = byModel.get(key) || { count: 0, cost: 0, avgLatency: 0 };
      existing.count++;
      existing.cost += metric.cost;
      existing.avgLatency = (existing.avgLatency * (existing.count - 1) + metric.latencyMs) / existing.count;
      byModel.set(key, existing);
    }

    // Find cheaper alternatives
    const recommendations: string[] = [];
    for (const [modelId, stats] of byModel.entries()) {
      const model = this.models.get(modelId);
      if (!model) continue;

      // Find cheaper models with similar capabilities
      const cheaper = Array.from(this.models.values()).filter(
        m =>
          m.tier === 'fast' &&
          m.contextWindow >= model.contextWindow * 0.8 &&
          this.calculateCost(m, { input: 1000, output: 500 }) < this.calculateCost(model, { input: 1000, output: 500 })
      );

      if (cheaper.length > 0) {
        const savings = stats.cost - (stats.cost * cheaper[0].pricing.input / model.pricing.input);
        recommendations.push(
          `Switch from ${model.name} to ${cheaper[0].name} for ${stats.count} requests: save $${savings.toFixed(2)}`
        );
      }
    }

    return {
      summary: {
        totalCost,
        totalRequests,
        successRate,
        avgLatency: workspaceMetrics.reduce((sum, m) => sum + m.latencyMs, 0) / totalRequests,
      },
      breakdown: Object.fromEntries(byModel),
      recommendations,
      topCostDrivers: Array.from(byModel.entries())
        .sort((a, b) => b[1].cost - a[1].cost)
        .slice(0, 5)
        .map(([modelId, stats]) => ({ modelId, ...stats })),
    };
  }

  /**
   * Register provider
   */
  registerProvider(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
    
    for (const model of provider.models) {
      this.models.set(model.id, model);
    }

    this.circuitBreakers.set(provider.id, {
      providerId: provider.id,
      state: 'closed',
      failures: 0,
    });
  }

  /**
   * Set workspace budget
   */
  setBudget(workspaceId: string, total: number): void {
    this.budgets.set(workspaceId, {
      workspaceId,
      total,
      spent: 0,
      remaining: total,
      alerts: [
        { threshold: 0.5, triggered: false },
        { threshold: 0.8, triggered: false },
        { threshold: 0.95, triggered: false },
      ],
    });
  }

  /**
   * Get budget status
   */
  getBudget(workspaceId: string): BudgetTracker {
    if (!this.budgets.has(workspaceId)) {
      this.setBudget(workspaceId, 100); // Default $100
    }
    return this.budgets.get(workspaceId)!;
  }

  /**
   * Cache response
   */
  cacheResponse(request: RoutingRequest, response: any, ttlMs: number = 3600000): void {
    const key = this.getCacheKey(request);
    this.cache.set(key, response);

    setTimeout(() => this.cache.delete(key), ttlMs);
  }

  // Private methods

  /**
   * Load providers from ConfigService
   */
  private async loadProvidersFromConfig(): Promise<void> {
    // Load OpenAI if enabled
    const openaiEnabled = this.configService.get<boolean>('llm.providers.openai.enabled', true);
    if (openaiEnabled) {
      const openaiApiKey = this.configService.get<string>('llm.providers.openai.apiKey', '');
      
      this.registerProvider({
        id: 'openai',
        name: 'OpenAI',
        endpoint: this.configService.get('llm.providers.openai.endpoint', 'https://api.openai.com/v1'),
        apiKey: openaiApiKey,
        rateLimit: this.configService.get('llm.providers.openai.rateLimit', {
          requestsPerMinute: 500,
          tokensPerMinute: 150000,
        }),
        pricing: this.configService.get('llm.providers.openai.pricing', {
          inputTokenCost: 0.5,
          outputTokenCost: 1.5,
        }),
        capabilities: this.configService.get('llm.providers.openai.capabilities', {
          streaming: true,
          functionCalling: true,
          vision: true,
          maxContextLength: 128000,
        }),
        models: this.configService.get('llm.providers.openai.models', [
          {
            id: 'gpt-4o',
            name: 'GPT-4o',
            providerId: 'openai',
            tier: 'quality',
            contextWindow: 128000,
            pricing: { input: 2.5, output: 10.0 },
            performance: { avgLatencyMs: 2000, p95LatencyMs: 4000, throughputTPS: 50 },
            capabilities: ['code', 'reasoning', 'vision'],
          },
          {
            id: 'gpt-4o-mini',
            name: 'GPT-4o Mini',
            providerId: 'openai',
            tier: 'balanced',
            contextWindow: 128000,
            pricing: { input: 0.15, output: 0.6 },
            performance: { avgLatencyMs: 800, p95LatencyMs: 1500, throughputTPS: 100 },
            capabilities: ['code', 'reasoning'],
          },
          {
            id: 'gpt-3.5-turbo',
            name: 'GPT-3.5 Turbo',
            providerId: 'openai',
            tier: 'fast',
            contextWindow: 16385,
            pricing: { input: 0.5, output: 1.5 },
            performance: { avgLatencyMs: 500, p95LatencyMs: 1000, throughputTPS: 150 },
            capabilities: ['code', 'chat'],
          },
        ]),
      });
    }

    // Load Anthropic if enabled
    const anthropicEnabled = this.configService.get<boolean>('llm.providers.anthropic.enabled', true);
    if (anthropicEnabled) {
      const anthropicApiKey = this.configService.get<string>('llm.providers.anthropic.apiKey', '');
      
      this.registerProvider({
        id: 'anthropic',
        name: 'Anthropic',
        endpoint: this.configService.get('llm.providers.anthropic.endpoint', 'https://api.anthropic.com/v1'),
        apiKey: anthropicApiKey,
        rateLimit: this.configService.get('llm.providers.anthropic.rateLimit', {
          requestsPerMinute: 400,
          tokensPerMinute: 100000,
        }),
        pricing: this.configService.get('llm.providers.anthropic.pricing', {
          inputTokenCost: 3.0,
          outputTokenCost: 15.0,
        }),
        capabilities: this.configService.get('llm.providers.anthropic.capabilities', {
          streaming: true,
          functionCalling: true,
          vision: true,
          maxContextLength: 200000,
        }),
        models: this.configService.get('llm.providers.anthropic.models', [
          {
            id: 'claude-3-5-sonnet',
            name: 'Claude 3.5 Sonnet',
            providerId: 'anthropic',
            tier: 'quality',
            contextWindow: 200000,
            pricing: { input: 3.0, output: 15.0 },
            performance: { avgLatencyMs: 1800, p95LatencyMs: 3500, throughputTPS: 60 },
            capabilities: ['code', 'reasoning', 'analysis'],
          },
          {
            id: 'claude-3-haiku',
          name: 'Claude 3 Haiku',
          providerId: 'anthropic',
          tier: 'fast',
          contextWindow: 200000,
          pricing: { input: 0.25, output: 1.25 },
          performance: { avgLatencyMs: 600, p95LatencyMs: 1200, throughputTPS: 120 },
          capabilities: ['code', 'chat'],
        },
      ],
    });
  }

  private getCandidateModels(request: RoutingRequest): Array<{ model: LLMModel; provider: LLMProvider }> {
    const candidates: Array<{ model: LLMModel; provider: LLMProvider }> = [];

    for (const model of this.models.values()) {
      const provider = this.providers.get(model.providerId);
      if (!provider) continue;

      // Check circuit breaker
      if (!this.canAttempt(provider.id)) continue;

      // Check required capabilities
      if (request.constraints.requiredCapabilities) {
        const hasAll = request.constraints.requiredCapabilities.every(cap =>
          model.capabilities.includes(cap)
        );
        if (!hasAll) continue;
      }

      // Check max cost
      if (request.constraints.maxCost) {
        const cost = this.calculateCost(model, request.estimatedTokens || { input: 1000, output: 500 });
        if (cost > request.constraints.maxCost) continue;
      }

      // Check max latency
      if (request.constraints.maxLatency) {
        if (model.performance.p95LatencyMs > request.constraints.maxLatency) continue;
      }

      candidates.push({ model, provider });
    }

    return candidates;
  }

  private scoreModel(
    candidate: { model: LLMModel; provider: LLMProvider },
    request: RoutingRequest
  ): number {
    const { model } = candidate;
    
    // Base score from tier
    let score = 0;
    switch (model.tier) {
      case 'quality': score = 100; break;
      case 'balanced': score = 80; break;
      case 'fast': score = 60; break;
    }

    // Adjust for cost (lower is better)
    const cost = this.calculateCost(model, request.estimatedTokens || { input: 1000, output: 500 });
    score -= cost * 10;

    // Adjust for latency (lower is better)
    score -= model.performance.avgLatencyMs / 100;

    // Boost for priority
    if (request.priority === 'critical') {
      score += model.tier === 'quality' ? 50 : 0;
    } else if (request.priority === 'low') {
      score += model.tier === 'fast' ? 30 : 0;
    }

    // Domain-specific preferences
    if (request.domain === 'trading' && model.performance.avgLatencyMs < 1000) {
      score += 20; // Prefer low latency for trading
    }
    if (request.domain === 'creative' && model.tier === 'quality') {
      score += 20; // Prefer quality for creative
    }

    return score;
  }

  private calculateCost(model: LLMModel, tokens: { input: number; output: number }): number {
    const inputCost = (tokens.input / 1_000_000) * model.pricing.input;
    const outputCost = (tokens.output / 1_000_000) * model.pricing.output;
    return inputCost + outputCost;
  }

  private createDecision(
    model: LLMModel,
    request: RoutingRequest,
    fallbacks: Array<{ model: LLMModel; provider: LLMProvider; score: number }>
  ): RoutingDecision {
    const provider = this.providers.get(model.providerId)!;
    const estimatedCost = this.calculateCost(
      model,
      request.estimatedTokens || { input: 1000, output: 500 }
    );

    return {
      model,
      provider,
      estimatedCost,
      estimatedLatency: model.performance.avgLatencyMs,
      qualityScore: model.tier === 'quality' ? 0.95 : model.tier === 'balanced' ? 0.85 : 0.75,
      reasoning: `Selected ${model.name} (${model.tier}) for ${request.domain} task with priority ${request.priority}`,
      fallbacks: fallbacks.slice(0, 3).map(f => ({ model: f.model, provider: this.providers.get(f.model.providerId)! })),
    };
  }

  private canAttempt(providerId: string): boolean {
    const breaker = this.circuitBreakers.get(providerId);
    if (!breaker) return true;

    if (breaker.state === 'open') {
      if (breaker.nextRetry && Date.now() >= breaker.nextRetry) {
        breaker.state = 'half-open';
        return true;
      }
      return false;
    }

    return true;
  }

  private recordSuccess(providerId: string, modelId: string, latency: number, request: RoutingRequest): void {
    const breaker = this.circuitBreakers.get(providerId);
    if (breaker) {
      breaker.failures = 0;
      breaker.state = 'closed';
    }

    const model = this.models.get(modelId)!;
    const cost = this.calculateCost(model, request.estimatedTokens || { input: 1000, output: 500 });

    this.metrics.push({
      providerId,
      modelId,
      latencyMs: latency,
      inputTokens: request.estimatedTokens?.input || 1000,
      outputTokens: request.estimatedTokens?.output || 500,
      cost,
      success: true,
      timestamp: Date.now(),
    });

    // Update budget
    const budget = this.getBudget(request.context.workspaceId);
    budget.spent += cost;
    budget.remaining = budget.total - budget.spent;
  }

  private recordFailure(providerId: string, modelId: string, latency: number, request: RoutingRequest, error: Error): void {
    const breaker = this.circuitBreakers.get(providerId);
    if (breaker) {
      breaker.failures++;
      breaker.lastFailure = Date.now();

      if (breaker.failures >= this.FAILURE_THRESHOLD) {
        breaker.state = 'open';
        breaker.nextRetry = Date.now() + this.HALF_OPEN_DELAY_MS;
        this.onCircuitOpenEmitter.fire({ providerId });
      }
    }

    this.metrics.push({
      providerId,
      modelId,
      latencyMs: latency,
      inputTokens: request.estimatedTokens?.input || 1000,
      outputTokens: request.estimatedTokens?.output || 500,
      cost: 0,
      success: false,
      timestamp: Date.now(),
    });
  }

  private checkCostAlerts(workspaceId: string, newSpent: number, total: number): void {
    const budget = this.getBudget(workspaceId);
    const percentage = newSpent / total;

    for (const alert of budget.alerts) {
      if (!alert.triggered && percentage >= alert.threshold) {
        alert.triggered = true;
        this.onCostAlertEmitter.fire({ workspaceId, threshold: alert.threshold });
      }
    }
  }

  private getCacheKey(request: RoutingRequest): string {
    return `${request.domain}:${request.task}:${JSON.stringify(request.constraints)}`;
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), ms)
    );
  }

  private startMetricsCleanup(): void {
    setInterval(() => {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    }, 60 * 60 * 1000); // Every hour
  }
}
