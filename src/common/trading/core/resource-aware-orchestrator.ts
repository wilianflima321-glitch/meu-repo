/**
 * Resource-Aware Trading Orchestrator
 * Extensão do orquestrador autônomo com controle de recursos
 * Protege tokens dos usuários e otimiza custos da plataforma
 */

import { EventEmitter } from 'events';
import { OHLCV, Position, AccountInfo, Quote } from './trading-types';
import { AutonomousTradingOrchestrator, BrokerAdapter, OrchestratorConfig, SystemState } from './autonomous-orchestrator';
import { ResourceManager, UserTier, ResourceStatus, createResourceManager, AnalysisLevel, ResourceUsageReport } from './resource-manager';
import { 
  EconomicalAnalysisEngine, 
  EconomicalAnalysisResult, 
  createEconomicalEngine
} from './economical-analysis';

// ============================================
// RESOURCE-AWARE CONFIG
// ============================================

export interface ResourceAwareConfig extends Partial<OrchestratorConfig> {
  // User identification
  userId: string;
  userTier: UserTier;
  
  // Resource protection
  enableResourceProtection: boolean;
  warningThreshold: number; // % to start warning (default 70%)
  criticalThreshold: number; // % to start limiting (default 90%)
  exhaustedBehavior: 'stop' | 'cache-only' | 'minimal';
  
  // Cost optimization
  enableCostOptimization: boolean;
  preferCachedData: boolean;
  maxAnalysisLevel: AnalysisLevel;
  
  // User experience
  showResourceStatus: boolean;
  notifyOnWarning: boolean;
  notifyOnCritical: boolean;
  
  // Auto-adjustment
  autoAdjustAnalysisLevel: boolean;
  respectUserPreferences: boolean;
}

export interface ResourceAwareState extends SystemState {
  // Resource tracking
  resourceStatus: ResourceUsageReport;
  currentAnalysisLevel: AnalysisLevel;
  tokensUsedToday: number;
  tokensRemaining: number;
  
  // Cost tracking
  sessionCost: number;
  estimatedRemainingCost: number;
  
  // Degradation state
  isDegraded: boolean;
  degradationReason: string | null;
  featuresDisabled: string[];
}

export interface CostEstimate {
  estimated: number;
  breakdown: Record<string, number>;
  canAfford: boolean;
  alternativeLevel?: AnalysisLevel;
}

export interface UserNotification {
  type: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  actionRequired: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: () => void;
}

// ============================================
// RESOURCE-AWARE ORCHESTRATOR
// ============================================

export class ResourceAwareOrchestrator extends EventEmitter {
  private baseOrchestrator: AutonomousTradingOrchestrator;
  private resourceManager: ResourceManager;
  private analysisEngine: EconomicalAnalysisEngine;
  private config: ResourceAwareConfig;
  private state: ResourceAwareState;
  
  // User session
  private userId: string;
  private userTier: UserTier;
  private sessionStartTime: Date;
  private analysisCount: number = 0;
  
  // Notifications queue
  private notifications: UserNotification[] = [];
  private lastWarningTime: number = 0;
  
  // Analysis cache for user protection
  private analysisCache: Map<string, {
    result: EconomicalAnalysisResult;
    timestamp: number;
    level: AnalysisLevel;
  }> = new Map();

  constructor(config: ResourceAwareConfig) {
    super();
    
    this.userId = config.userId;
    this.userTier = config.userTier;
    this.sessionStartTime = new Date();
    
    // Start with config defaults, then override with user config
    this.config = {
      ...{
        enableResourceProtection: true,
        warningThreshold: 0.7,
        criticalThreshold: 0.9,
        exhaustedBehavior: 'cache-only' as const,
        enableCostOptimization: true,
        preferCachedData: true,
        maxAnalysisLevel: this.getMaxLevelForTier(config.userTier),
        showResourceStatus: true,
        notifyOnWarning: true,
        notifyOnCritical: true,
        autoAdjustAnalysisLevel: true,
        respectUserPreferences: true,
      },
      ...config,
    };
    
    // Initialize base orchestrator with filtered config
    this.baseOrchestrator = new AutonomousTradingOrchestrator(this.extractOrchestratorConfig());
    
    // Initialize resource manager
    this.resourceManager = createResourceManager(this.userTier);
    
    // Initialize economical analysis engine
    this.analysisEngine = createEconomicalEngine(this.resourceManager);
    
    // Initialize state
    this.state = this.initializeState();
    
    // Setup event forwarding and resource monitoring
    this.setupEventForwarding();
    this.setupResourceMonitoring();
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  private initializeState(): ResourceAwareState {
    const resourceStatus = this.resourceManager.getUsageReport();
    
    return {
      status: 'initializing',
      isTrading: false,
      lastError: null,
      dailyPnL: 0,
      dailyTrades: 0,
      winRate: 0,
      dataFreshness: 0,
      connectionStatus: 'disconnected',
      lastHealthCheck: new Date(),
      openPositions: 0,
      totalExposure: 0,
      currentRisk: 0,
      resourceStatus,
      currentAnalysisLevel: this.determineOptimalLevel(),
      tokensUsedToday: this.resourceManager.getStatus().tokensUsed,
      tokensRemaining: resourceStatus.tokensRemaining,
      sessionCost: 0,
      estimatedRemainingCost: 0,
      isDegraded: false,
      degradationReason: null,
      featuresDisabled: [],
    };
  }

  private getMaxLevelForTier(tier: UserTier): AnalysisLevel {
    const tierLevels: Record<UserTier, AnalysisLevel> = {
      free: 'basic',
      starter: 'basic',
      basic: 'standard',
      pro: 'full',
      studio: 'full',
      enterprise: 'premium',
    };
    return tierLevels[tier];
  }

  private extractOrchestratorConfig(): Partial<OrchestratorConfig> {
    const { 
      userId, userTier, enableResourceProtection, warningThreshold, 
      criticalThreshold, exhaustedBehavior, enableCostOptimization,
      preferCachedData, maxAnalysisLevel, showResourceStatus,
      notifyOnWarning, notifyOnCritical, autoAdjustAnalysisLevel,
      respectUserPreferences,
      ...orchestratorConfig 
    } = this.config;
    
    return orchestratorConfig;
  }

  // ============================================
  // LIFECYCLE
  // ============================================

  async initialize(broker: BrokerAdapter, symbols: string[]): Promise<boolean> {
    try {
      // Check if user has resources before even starting
      if (!this.resourceManager.canPerformOperation('snapshot')) {
        this.notifyUser({
          type: 'critical',
          title: 'Recursos Insuficientes',
          message: 'Você não tem recursos suficientes para iniciar uma nova sessão de trading. ' +
                   'Aguarde a renovação diária ou faça upgrade do seu plano.',
          timestamp: new Date(),
          actionRequired: true,
          actions: [
            {
              id: 'upgrade',
              label: 'Ver Planos',
              type: 'primary',
              action: () => this.emit('upgradeRequested'),
            },
            {
              id: 'wait',
              label: 'Ver Quando Renova',
              type: 'secondary',
              action: () => this.showResourceRenewalInfo(),
            },
          ],
        });
        return false;
      }
      
      // Show initial resource status
      this.showWelcomeStatus();
      
      // Initialize base orchestrator
      const success = await this.baseOrchestrator.initialize(broker, symbols);
      
      if (success) {
        this.state.status = 'running';
        this.state.connectionStatus = 'connected';
        this.emit('initialized', { 
          symbols, 
          resourceStatus: this.state.resourceStatus,
          analysisLevel: this.state.currentAnalysisLevel,
        });
      }
      
      return success;
    } catch (error) {
      this.state.status = 'error';
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.emit('error', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    // Show session summary
    this.showSessionSummary();
    
    await this.baseOrchestrator.stop();
    
    this.state.status = 'stopped';
    this.emit('stopped', this.getSessionStats());
  }

  pause(): void {
    this.baseOrchestrator.pause();
    this.state.status = 'paused';
    this.emit('paused');
  }

  resume(): void {
    if (!this.resourceManager.canPerformOperation('snapshot')) {
      this.notifyUser({
        type: 'warning',
        title: 'Recursos Limitados',
        message: 'Seus recursos estão baixos. O sistema operará em modo limitado.',
        timestamp: new Date(),
        actionRequired: false,
      });
    }
    
    this.baseOrchestrator.resume();
    this.state.status = 'running';
    this.emit('resumed');
  }

  // ============================================
  // RESOURCE-AWARE ANALYSIS
  // ============================================

  /**
   * Perform analysis with resource protection
   */
  async analyzeMarket(symbol: string, candles: OHLCV[]): Promise<EconomicalAnalysisResult> {
    // Check cache first (free operation)
    const cached = this.getCachedAnalysis(symbol);
    if (cached && this.isCacheValid(cached)) {
      this.emit('analysisCached', { symbol, savedTokens: this.getAnalysisCost() });
      return cached.result;
    }
    
    // Determine optimal analysis level based on resources
    const level = this.determineOptimalLevel();
    
    // Estimate cost before analysis
    const estimate = this.analysisEngine.estimateCost(level);
    
    // Check if we can afford this analysis
    if (!this.canAffordAnalysis(estimate)) {
      return this.handleInsufficientResources(symbol, candles, estimate);
    }
    
    // Perform analysis - convert candles to prices
    const prices = candles.map(c => c.close);
    const result = await this.analysisEngine.analyze(symbol, prices);
    
    // Update tracking
    this.analysisCount++;
    this.state.sessionCost += result.resourceUsage.tokensUsed;
    this.state.tokensUsedToday = this.resourceManager.getStatus().tokensUsed;
    this.state.tokensRemaining = this.resourceManager.getStatus().tokensRemaining;
    
    // Cache result
    this.cacheAnalysis(symbol, result, level);
    
    // Check if we need to warn user
    this.checkResourceWarnings();
    
    // Emit analysis event
    this.emit('analysisComplete', {
      symbol,
      level,
      cost: result.resourceUsage.tokensUsed,
      resourceStatus: this.state.resourceStatus,
    });
    
    return result;
  }

  /**
   * Get quick analysis (minimal cost)
   */
  async getQuickAnalysis(symbol: string, candles: OHLCV[]): Promise<EconomicalAnalysisResult> {
    // Always try cache first
    const cached = this.getCachedAnalysis(symbol);
    if (cached) {
      return cached.result;
    }
    
    // Use minimal level for quick analysis
    const prices = candles.map(c => c.close);
    return this.analysisEngine.analyze(symbol, prices);
  }

  /**
   * Determine optimal analysis level based on current resources
   */
  private determineOptimalLevel(): AnalysisLevel {
    const status = this.resourceManager.getStatus();
    const usagePercent = Math.max(status.dailyUsagePercent, status.hourlyUsagePercent);
    
    // Get max allowed level for user tier
    const maxLevel = this.config.maxAnalysisLevel;
    
    // Adjust based on resource usage
    if (usagePercent >= 95) {
      return 'minimal';
    } else if (usagePercent >= this.config.criticalThreshold * 100) {
      return 'basic';
    } else if (usagePercent >= this.config.warningThreshold * 100) {
      return this.limitLevel(maxLevel, 'standard');
    }
    
    return maxLevel;
  }

  private limitLevel(current: AnalysisLevel, max: AnalysisLevel): AnalysisLevel {
    const levels: AnalysisLevel[] = ['minimal', 'basic', 'standard', 'full', 'premium'];
    const currentIdx = levels.indexOf(current);
    const maxIdx = levels.indexOf(max);
    return levels[Math.min(currentIdx, maxIdx)];
  }

  // ============================================
  // CACHE MANAGEMENT
  // ============================================

  private getCachedAnalysis(symbol: string): {
    result: EconomicalAnalysisResult;
    timestamp: number;
    level: AnalysisLevel;
  } | null {
    return this.analysisCache.get(symbol) || null;
  }

  private isCacheValid(cached: { timestamp: number; level: AnalysisLevel }): boolean {
    const maxAge = this.getCacheMaxAge(cached.level);
    return Date.now() - cached.timestamp < maxAge;
  }

  private getCacheMaxAge(level: AnalysisLevel): number {
    // Lower levels have longer cache validity to save resources
    const maxAges: Record<AnalysisLevel, number> = {
      minimal: 10 * 60 * 1000, // 10 minutes
      basic: 5 * 60 * 1000, // 5 minutes
      standard: 3 * 60 * 1000, // 3 minutes
      full: 2 * 60 * 1000, // 2 minutes
      premium: 1 * 60 * 1000, // 1 minute
    };
    return maxAges[level];
  }

  private cacheAnalysis(
    symbol: string, 
    result: EconomicalAnalysisResult, 
    level: AnalysisLevel
  ): void {
    this.analysisCache.set(symbol, {
      result,
      timestamp: Date.now(),
      level,
    });
    
    // Limit cache size
    if (this.analysisCache.size > 50) {
      const oldest = Array.from(this.analysisCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      this.analysisCache.delete(oldest[0]);
    }
  }

  // ============================================
  // RESOURCE PROTECTION
  // ============================================

  private canAffordAnalysis(estimate: CostEstimate): boolean {
    const status = this.resourceManager.getStatus();
    return status.tokensRemaining >= estimate.estimated;
  }

  private async handleInsufficientResources(
    symbol: string, 
    candles: OHLCV[],
    estimate: CostEstimate
  ): Promise<EconomicalAnalysisResult> {
    const behavior = this.config.exhaustedBehavior;
    
    this.state.isDegraded = true;
    this.state.degradationReason = 'Recursos insuficientes para análise completa';
    
    // Notify user
    this.notifyUser({
      type: 'warning',
      title: 'Recursos Limitados',
      message: `Análise completa requer ${estimate.estimated} tokens, mas você tem apenas ` +
               `${this.state.tokensRemaining}. Usando modo econômico.`,
      timestamp: new Date(),
      actionRequired: false,
    });
    
    switch (behavior) {
      case 'stop':
        this.pause();
        return this.createEmptyResult(symbol, 'Sistema pausado por falta de recursos');
        
      case 'cache-only':
        const cached = this.getCachedAnalysis(symbol);
        if (cached) {
          return cached.result;
        }
        // Fall through to minimal
        
      case 'minimal':
      default:
        // Use minimal analysis with prices extracted from candles
        const prices = candles.map(c => c.close);
        return this.analysisEngine.analyze(symbol, prices);
    }
  }

  private createEmptyResult(symbol: string, reason: string): EconomicalAnalysisResult {
    return {
      data: {},
      computed: {
        indicators: false,
        patterns: false,
        aiAnalysis: false,
        regime: false,
        optimization: false,
      },
      resourceUsage: {
        tokensUsed: 0,
        cached: false,
        level: 'minimal',
        degraded: true,
      },
      message: reason,
      recommendations: ['Aguarde a renovação de recursos ou faça upgrade do plano.'],
    };
  }

  // ============================================
  // USER NOTIFICATIONS
  // ============================================

  private setupResourceMonitoring(): void {
    // Listen to resource manager events
    this.resourceManager.on('warning', (data) => {
      if (this.config.notifyOnWarning) {
        this.notifyUser({
          type: 'warning',
          title: 'Recursos em Alerta',
          message: `Você já utilizou ${data.usagePercent.toFixed(0)}% dos seus recursos diários. ` +
                   `Restam ${data.remaining} operações aproximadamente.`,
          timestamp: new Date(),
          actionRequired: false,
        });
      }
    });
    
    this.resourceManager.on('critical', (data) => {
      if (this.config.notifyOnCritical) {
        this.notifyUser({
          type: 'critical',
          title: 'Recursos Críticos',
          message: `Atenção! Apenas ${data.remaining} operações restantes. ` +
                   `O sistema vai entrar em modo de economia.`,
          timestamp: new Date(),
          actionRequired: true,
          actions: [
            {
              id: 'upgrade',
              label: 'Aumentar Limite',
              type: 'primary',
              action: () => this.emit('upgradeRequested'),
            },
          ],
        });
        
        // Auto-degrade
        this.state.isDegraded = true;
        this.state.currentAnalysisLevel = 'minimal';
      }
    });
    
    this.resourceManager.on('exhausted', () => {
      this.notifyUser({
        type: 'critical',
        title: 'Recursos Esgotados',
        message: 'Seus recursos diários foram esgotados. O sistema usará apenas dados em cache ' +
                 'até a renovação automática às 00:00.',
        timestamp: new Date(),
        actionRequired: true,
        actions: [
          {
            id: 'upgrade',
            label: 'Upgrade Agora',
            type: 'primary',
            action: () => this.emit('upgradeRequested'),
          },
          {
            id: 'info',
            label: 'Entender Mais',
            type: 'secondary',
            action: () => this.emit('showResourceInfo'),
          },
        ],
      });
    });
  }

  private checkResourceWarnings(): void {
    const now = Date.now();
    const minInterval = 5 * 60 * 1000; // 5 minutes between warnings
    
    if (now - this.lastWarningTime < minInterval) return;
    
    const status = this.resourceManager.getUsageReport();
    this.state.resourceStatus = status;
    
    // Update state
    const usagePercent = Math.max(status.dailyUsagePercent, status.hourlyUsagePercent);
    if (usagePercent >= this.config.criticalThreshold * 100) {
      this.state.isDegraded = true;
      this.state.currentAnalysisLevel = 'basic';
    }
  }

  private notifyUser(notification: UserNotification): void {
    this.notifications.push(notification);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(-50);
    }
    
    // Emit for UI
    this.emit('notification', notification);
  }

  private showWelcomeStatus(): void {
    const status = this.resourceManager.getStatus();
    
    this.notifyUser({
      type: 'info',
      title: 'Sessão Iniciada',
      message: `Bem-vindo! Você tem ${status.tokensRemaining} tokens disponíveis hoje. ` +
               `Nível de análise: ${this.state.currentAnalysisLevel}.`,
      timestamp: new Date(),
      actionRequired: false,
    });
  }

  private showResourceRenewalInfo(): void {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const hoursUntilRenewal = Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    this.notifyUser({
      type: 'info',
      title: 'Renovação de Recursos',
      message: `Seus recursos serão renovados em aproximadamente ${hoursUntilRenewal} horas ` +
               `(meia-noite do seu horário local).`,
      timestamp: new Date(),
      actionRequired: false,
    });
  }

  private showSessionSummary(): void {
    const stats = this.getSessionStats();
    
    this.notifyUser({
      type: 'success',
      title: 'Resumo da Sessão',
      message: `Sessão encerrada. Análises realizadas: ${stats.analysisCount}. ` +
               `Tokens utilizados: ${stats.tokensUsed}. ` +
               `Economia estimada: ${stats.tokensSaved} tokens.`,
      timestamp: new Date(),
      actionRequired: false,
    });
  }

  private getAnalysisCost(): number {
    // Get average cost for current level
    const costs: Record<AnalysisLevel, number> = {
      minimal: 10,
      basic: 25,
      standard: 50,
      full: 100,
      premium: 200,
    };
    return costs[this.state.currentAnalysisLevel];
  }

  // ============================================
  // EVENT FORWARDING
  // ============================================

  private setupEventForwarding(): void {
    // Forward all base orchestrator events
    const events = [
      'signal', 'execution', 'position_update', 'risk_alert', 
      'system_status', 'error', 'dataLoaded', 'quoteUpdate',
      'sessionStarted', 'sessionEnded', 'initialized', 'stopped',
      'paused', 'resumed',
    ];
    
    for (const event of events) {
      this.baseOrchestrator.on(event, (...args) => {
        this.emit(event, ...args);
      });
    }
  }

  // ============================================
  // PUBLIC ACCESSORS
  // ============================================

  getState(): ResourceAwareState {
    return { ...this.state };
  }

  getResourceStatus(): ResourceUsageReport {
    return this.resourceManager.getUsageReport();
  }

  getNotifications(): UserNotification[] {
    return [...this.notifications];
  }

  getSessionStats(): {
    duration: number;
    analysisCount: number;
    tokensUsed: number;
    tokensSaved: number;
    averageCost: number;
    cacheHitRate: number;
  } {
    const duration = Date.now() - this.sessionStartTime.getTime();
    const status = this.resourceManager.getStatus();
    const initialTokens = status.tokensUsed + status.tokensRemaining;
    
    return {
      duration,
      analysisCount: this.analysisCount,
      tokensUsed: this.state.sessionCost,
      tokensSaved: this.analysisCount * 50 - this.state.sessionCost, // Estimated savings
      averageCost: this.analysisCount > 0 ? this.state.sessionCost / this.analysisCount : 0,
      cacheHitRate: 0, // Would need to track this
    };
  }

  getUserTier(): UserTier {
    return this.userTier;
  }

  getCurrentAnalysisLevel(): AnalysisLevel {
    return this.state.currentAnalysisLevel;
  }

  // ============================================
  // USER ACTIONS
  // ============================================

  /**
   * Allow user to manually set analysis level (within tier limits)
   */
  setAnalysisLevel(level: AnalysisLevel): boolean {
    const maxLevel = this.config.maxAnalysisLevel;
    const levels: AnalysisLevel[] = ['minimal', 'basic', 'standard', 'full', 'premium'];
    
    if (levels.indexOf(level) > levels.indexOf(maxLevel)) {
      this.notifyUser({
        type: 'warning',
        title: 'Nível Não Permitido',
        message: `Seu plano ${this.userTier} permite até o nível ${maxLevel}. ` +
                 `Faça upgrade para acessar análises mais avançadas.`,
        timestamp: new Date(),
        actionRequired: false,
      });
      return false;
    }
    
    this.state.currentAnalysisLevel = level;
    this.emit('analysisLevelChanged', level);
    return true;
  }

  /**
   * Clear cache to force fresh analysis
   */
  clearCache(): void {
    this.analysisCache.clear();
    this.notifyUser({
      type: 'info',
      title: 'Cache Limpo',
      message: 'O cache de análises foi limpo. As próximas análises serão realizadas em tempo real.',
      timestamp: new Date(),
      actionRequired: false,
    });
  }

  /**
   * Get cost estimate for an operation
   */
  estimateOperationCost(operation: 'analysis' | 'fullScan' | 'backtest'): CostEstimate {
    const level = this.state.currentAnalysisLevel;
    return this.analysisEngine.estimateCost(level);
  }
}

// ============================================
// FACTORY FUNCTION
// ============================================

export function createResourceAwareOrchestrator(
  config: ResourceAwareConfig
): ResourceAwareOrchestrator {
  return new ResourceAwareOrchestrator(config);
}

// ============================================
// UI HELPERS
// ============================================

export interface ResourceStatusUI {
  progressPercent: number;
  progressColor: 'green' | 'yellow' | 'orange' | 'red';
  statusText: string;
  statusIcon: string;
  tokensDisplay: string;
  levelDisplay: string;
  tierDisplay: string;
  warningMessage: string | null;
  canUpgrade: boolean;
}

export function formatResourceStatusForUI(
  status: ResourceUsageReport,
  level: AnalysisLevel,
  tier: UserTier
): ResourceStatusUI {
  const progressPercent = Math.max(status.dailyUsagePercent, status.hourlyUsagePercent);
  
  let progressColor: 'green' | 'yellow' | 'orange' | 'red';
  let statusIcon: string;
  let warningMessage: string | null = null;
  
  if (progressPercent < 50) {
    progressColor = 'green';
    statusIcon = '✓';
  } else if (progressPercent < 70) {
    progressColor = 'yellow';
    statusIcon = '●';
  } else if (progressPercent < 90) {
    progressColor = 'orange';
    statusIcon = '⚠';
    warningMessage = 'Recursos ficando baixos. Considere economizar ou fazer upgrade.';
  } else {
    progressColor = 'red';
    statusIcon = '✕';
    warningMessage = 'Recursos críticos! Modo de economia ativado.';
  }
  
  const tierNames: Record<UserTier, string> = {
    free: 'Gratuito',
    starter: 'Iniciante',
    basic: 'Básico',
    pro: 'Profissional',
    studio: 'Estúdio',
    enterprise: 'Enterprise',
  };
  
  const levelNames: Record<AnalysisLevel, string> = {
    minimal: 'Mínimo',
    basic: 'Básico',
    standard: 'Padrão',
    full: 'Completo',
    premium: 'Premium',
  };
  
  return {
    progressPercent,
    progressColor,
    statusText: `${progressPercent.toFixed(0)}% utilizado`,
    statusIcon,
    tokensDisplay: `${status.tokensRemaining.toLocaleString()} tokens restantes`,
    levelDisplay: levelNames[level],
    tierDisplay: tierNames[tier],
    warningMessage,
    canUpgrade: tier !== 'enterprise',
  };
}

// ============================================
// EXPORTS
// ============================================

export default ResourceAwareOrchestrator;
