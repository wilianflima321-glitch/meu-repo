import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('analytics')


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

import type {
  AnalyticsEvent,
  DashboardMetrics,
  EventAction,
  EventCategory,
  PerformanceMetric,
} from './analytics.types'
import { MetricsAggregator } from './analytics-metrics'
export type {
  AnalyticsEvent,
  DashboardMetrics,
  EventAction,
  EventCategory,
  MetricsQuery,
  PerformanceMetric,
  TimeSeriesData,
  UserMetrics,
} from './analytics.types'
export { MetricsAggregator } from './analytics-metrics'

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
      log.info('[Analytics]', category, action, options);
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
      log.info('[Performance]', name, value, unit);
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
      log.error('[Analytics] Failed to flush', error);
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
// SINGLETON EXPORT
// ============================================================================

type AnalyticsFacade = Pick<
  AnalyticsTracker,
  'track' | 'trackError' | 'trackPerformance' | 'trackPageLoad' | 'measure' | 'setUser' | 'clearUser' | 'flush'
>;

function createAnalyticsFacade(): AnalyticsFacade {
  return {
    track: (...args) => AnalyticsTracker.getInstance().track(...args),
    trackError: (...args) => AnalyticsTracker.getInstance().trackError(...args),
    trackPerformance: (...args) => AnalyticsTracker.getInstance().trackPerformance(...args),
    trackPageLoad: (...args) => AnalyticsTracker.getInstance().trackPageLoad(...args),
    measure: (...args) => AnalyticsTracker.getInstance().measure(...args),
    setUser: (...args) => AnalyticsTracker.getInstance().setUser(...args),
    clearUser: (...args) => AnalyticsTracker.getInstance().clearUser(...args),
    flush: (...args) => AnalyticsTracker.getInstance().flush(...args),
  };
}

export const analytics: AnalyticsFacade | null = typeof window !== 'undefined'
  ? createAnalyticsFacade()
  : null;

const analyticsModule = {
  AnalyticsTracker,
  MetricsAggregator,
  useAnalytics,
};

export default analyticsModule;
