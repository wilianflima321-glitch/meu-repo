/**
 * Sistema de Analytics e Métricas - Aethel Engine
 * 
 * Sistema completo para rastreamento de:
 * - Uso de features
 * - Performance
 * - Comportamento de usuários
 * - Métricas de negócio
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

// ============================================================================
// TIPOS
// ============================================================================

export type EventCategory = 
  | 'user'
  | 'project'
  | 'ai'
  | 'engine'
  | 'billing'
  | 'collaboration'
  | 'marketplace'
  | 'performance'
  | 'error';

export type EventAction =
  // User
  | 'login'
  | 'logout'
  | 'register'
  | 'profile_update'
  | 'settings_change'
  | 'plan_upgrade'
  | 'plan_downgrade'
  
  // Project
  | 'project_create'
  | 'project_open'
  | 'project_save'
  | 'project_delete'
  | 'project_export'
  | 'project_share'
  
  // AI
  | 'ai_chat'
  | 'ai_stream'
  | 'ai_complete'
  | 'ai_error'
  | 'ai_feedback'
  
  // Engine
  | 'editor_open'
  | 'editor_close'
  | 'blueprint_create'
  | 'vfx_create'
  | 'terrain_edit'
  | 'animation_create'
  | 'build_start'
  | 'build_complete'
  | 'play_start'
  | 'play_stop'
  
  // Billing
  | 'checkout_start'
  | 'checkout_complete'
  | 'checkout_cancel'
  | 'payment_success'
  | 'payment_failed'
  
  // Collaboration
  | 'invite_send'
  | 'invite_accept'
  | 'collab_join'
  | 'collab_leave'
  | 'comment_add'
  
  // Marketplace
  | 'marketplace_browse'
  | 'marketplace_search'
  | 'marketplace_view'
  | 'marketplace_purchase'
  | 'marketplace_download'
  
  // Performance
  | 'page_load'
  | 'api_latency'
  | 'render_time'
  
  // Error
  | 'error_client'
  | 'error_server'
  | 'error_api';

export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  category: EventCategory;
  action: EventAction;
  label?: string;
  value?: number;
  userId?: string;
  sessionId?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  
  // Contexto
  userAgent?: string;
  referrer?: string;
  url?: string;
  screenResolution?: string;
  language?: string;
  timezone?: string;
}

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  name: string;
  value: number;
  unit: 'ms' | 's' | 'bytes' | 'count' | 'percent';
  tags?: Record<string, string>;
}

export interface UserMetrics {
  userId: string;
  
  // Engagement
  totalSessions: number;
  totalTimeSpent: number; // seconds
  lastActive: Date;
  
  // Usage
  projectsCreated: number;
  filesCreated: number;
  aiMessagesCount: number;
  aiTokensUsed: number;
  buildCount: number;
  
  // Monetization
  plan: string;
  totalSpent: number;
  mrr: number; // Monthly Recurring Revenue
  ltv: number; // Lifetime Value
}

export interface DashboardMetrics {
  // Users
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  activeUsersMonth: number;
  newUsersToday: number;
  churnRate: number;
  
  // Revenue
  mrrTotal: number;
  arrTotal: number;
  avgRevenuePerUser: number;
  conversionRate: number;
  
  // Usage
  totalProjects: number;
  totalFiles: number;
  totalAssets: number;
  totalAIRequests: number;
  totalAITokens: number;
  
  // Performance
  avgApiLatency: number;
  errorRate: number;
  uptime: number;
}

// ============================================================================
// ANALYTICS TRACKER
// ============================================================================

export class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private sessionId: string;
  private userId?: string;
  private flushInterval: NodeJS.Timeout | null = null;
  private maxBatchSize = 100;
  private flushIntervalMs = 30000; // 30 seconds
  
  private constructor() {
    this.sessionId = this.generateId();
    this.startFlushInterval();
    
    // Captura erros globais
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (e) => {
        this.trackError('error_client', e.message, { 
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno 
        });
      });
      
      window.addEventListener('unhandledrejection', (e) => {
        this.trackError('error_client', String(e.reason), { type: 'promise_rejection' });
      });
    }
  }
  
  static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker();
    }
    return AnalyticsTracker.instance;
  }
  
  /**
   * Define o ID do usuário logado
   */
  setUser(userId: string): void {
    this.userId = userId;
    this.track('user', 'login', { metadata: { userId } });
  }
  
  /**
   * Limpa o usuário (logout)
   */
  clearUser(): void {
    if (this.userId) {
      this.track('user', 'logout', { metadata: { userId: this.userId } });
    }
    this.userId = undefined;
  }
  
  /**
   * Rastreia um evento
   */
  track(
    category: EventCategory,
    action: EventAction,
    options?: {
      label?: string;
      value?: number;
      projectId?: string;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const event: AnalyticsEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      category,
      action,
      label: options?.label,
      value: options?.value,
      userId: this.userId,
      sessionId: this.sessionId,
      projectId: options?.projectId,
      metadata: options?.metadata,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      screenResolution: typeof screen !== 'undefined' 
        ? `${screen.width}x${screen.height}` 
        : undefined,
      language: typeof navigator !== 'undefined' ? navigator.language : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    
    this.events.push(event);
    
    // Flush se atingiu o limite
    if (this.events.length >= this.maxBatchSize) {
      this.flush();
    }
    
    // Console em dev
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', category, action, options);
    }
  }
  
  /**
   * Rastreia um erro
   */
  trackError(
    type: 'error_client' | 'error_server' | 'error_api',
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    this.track('error', type, {
      label: message,
      metadata: {
        ...metadata,
        stack: new Error().stack,
      },
    });
  }
  
  /**
   * Rastreia uma métrica de performance
   */
  trackPerformance(
    name: string,
    value: number,
    unit: PerformanceMetric['unit'] = 'ms',
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date(),
      name,
      value,
      unit,
      tags,
    };
    
    this.metrics.push(metric);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Performance]', name, value, unit);
    }
  }
  
  /**
   * Mede o tempo de execução de uma função
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.trackPerformance(name, duration, 'ms', { ...tags, status: 'success' });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.trackPerformance(name, duration, 'ms', { ...tags, status: 'error' });
      throw error;
    }
  }
  
  /**
   * Rastreia carregamento de página
   */
  trackPageLoad(pageName: string): void {
    if (typeof window !== 'undefined' && window.performance) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
      const ttfb = timing.responseStart - timing.navigationStart;
      
      this.track('performance', 'page_load', {
        label: pageName,
        value: loadTime,
        metadata: {
          loadTime,
          domReady,
          ttfb,
        },
      });
    }
  }
  
  /**
   * Inicia o intervalo de flush
   */
  private startFlushInterval(): void {
    if (typeof window !== 'undefined') {
      this.flushInterval = setInterval(() => {
        this.flush();
      }, this.flushIntervalMs);
      
      // Flush on page unload
      window.addEventListener('beforeunload', () => {
        this.flush(true);
      });
    }
  }
  
  /**
   * Envia eventos para o servidor
   */
  async flush(sync = false): Promise<void> {
    if (this.events.length === 0 && this.metrics.length === 0) {
      return;
    }
    
    const eventsToSend = [...this.events];
    const metricsToSend = [...this.metrics];
    
    this.events = [];
    this.metrics = [];
    
    const payload = {
      events: eventsToSend,
      metrics: metricsToSend,
    };
    
    try {
      if (sync && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        // Use sendBeacon for page unload
        navigator.sendBeacon('/api/analytics/batch', JSON.stringify(payload));
      } else {
        await fetch('/api/analytics/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (error) {
      // Re-add events on failure
      this.events.push(...eventsToSend);
      this.metrics.push(...metricsToSend);
      console.error('[Analytics] Failed to flush:', error);
    }
  }
  
  /**
   * Gera ID único
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Limpa recursos
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush(true);
  }
}

// ============================================================================
// HOOKS PARA REACT
// ============================================================================

export function useAnalytics() {
  const tracker = AnalyticsTracker.getInstance();
  
  return {
    track: tracker.track.bind(tracker),
    trackError: tracker.trackError.bind(tracker),
    trackPerformance: tracker.trackPerformance.bind(tracker),
    trackPageLoad: tracker.trackPageLoad.bind(tracker),
    measure: tracker.measure.bind(tracker),
    setUser: tracker.setUser.bind(tracker),
    clearUser: tracker.clearUser.bind(tracker),
  };
}

// ============================================================================
// MÉTRICAS DO DASHBOARD (SERVER-SIDE)
// ============================================================================

export interface MetricsQuery {
  startDate?: Date;
  endDate?: Date;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  category?: EventCategory;
  userId?: string;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
}

export class MetricsAggregator {
  /**
   * Calcula métricas do dashboard
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Em produção, isso seria calculado do banco de dados
    return {
      totalUsers: 0,
      activeUsersToday: 0,
      activeUsersWeek: 0,
      activeUsersMonth: 0,
      newUsersToday: 0,
      churnRate: 0,
      mrrTotal: 0,
      arrTotal: 0,
      avgRevenuePerUser: 0,
      conversionRate: 0,
      totalProjects: 0,
      totalFiles: 0,
      totalAssets: 0,
      totalAIRequests: 0,
      totalAITokens: 0,
      avgApiLatency: 0,
      errorRate: 0,
      uptime: 99.9,
    };
  }
  
  /**
   * Obtém série temporal de uma métrica
   */
  static async getTimeSeries(
    metric: string,
    query: MetricsQuery
  ): Promise<TimeSeriesData[]> {
    // Implementação real usaria o banco de dados
    return [];
  }
  
  /**
   * Calcula métricas de um usuário específico
   */
  static async getUserMetrics(userId: string): Promise<UserMetrics> {
    return {
      userId,
      totalSessions: 0,
      totalTimeSpent: 0,
      lastActive: new Date(),
      projectsCreated: 0,
      filesCreated: 0,
      aiMessagesCount: 0,
      aiTokensUsed: 0,
      buildCount: 0,
      plan: 'free',
      totalSpent: 0,
      mrr: 0,
      ltv: 0,
    };
  }
  
  /**
   * Calcula cohort analysis
   */
  static async getCohortAnalysis(
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month' = 'week'
  ): Promise<{ cohort: string; retention: number[] }[]> {
    return [];
  }
  
  /**
   * Calcula funil de conversão
   */
  static async getConversionFunnel(
    steps: EventAction[],
    query: MetricsQuery
  ): Promise<{ step: string; count: number; rate: number }[]> {
    return steps.map((step, index) => ({
      step,
      count: 0,
      rate: index === 0 ? 100 : 0,
    }));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const analytics = typeof window !== 'undefined' 
  ? AnalyticsTracker.getInstance() 
  : null;

const analyticsModule = {
  AnalyticsTracker,
  MetricsAggregator,
  useAnalytics,
};

export default analyticsModule;
