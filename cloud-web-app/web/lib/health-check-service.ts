import { createComponentLogger, logger } from '@/lib/observability/logger'

import { registerDefaultHealthServices } from './health-check.default-services';
import type {
  HealthStatus,
  ServiceHealth,
  SystemMetrics,
  HealthReport,
  HealthAlert,
  ServiceConfig
} from './health-check.types';

const log = createComponentLogger('health-check')

export class HealthCheckService {
  private static instance: HealthCheckService;
  private services: Map<string, ServiceConfig> = new Map();
  private lastResults: Map<string, ServiceHealth> = new Map();
  private alerts: HealthAlert[] = [];
  private metrics: SystemMetrics;
  private checkIntervals: Map<string, NodeJS.Timeout> = new Map();
  private alertCallbacks: Set<(alert: HealthAlert) => void> = new Set();
  private startTime: Date;

  private constructor() {
    this.startTime = new Date();
    this.metrics = this.initializeMetrics();
    this.registerDefaultServices();
    if (typeof window === 'undefined') {
      this.startMetricsCollection();
    }
  }

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Inicializa métricas padrão
   */
  private initializeMetrics(): SystemMetrics {
    return {
      timestamp: new Date(),
      uptime: 0,
      memory: { used: 0, total: 0, percentage: 0 },
      requests: { total: 0, perSecond: 0, avgLatency: 0 },
      errors: { total: 0, rate: 0 },
      activeConnections: 0,
    };
  }

  /**
   * Registers default service checks.
   */
  private registerDefaultServices(): void {
    registerDefaultHealthServices((config) => this.registerService(config));
  }

  /**
   * Inicia coleta de métricas do sistema
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectMetrics();
    }, 10000); // A cada 10 segundos
  }

  /**
   * Coleta métricas do sistema
   */
  private collectMetrics(): void {
    const now = new Date();
    const uptime = Math.floor((now.getTime() - this.startTime.getTime()) / 1000);

    // Node.js memory
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage();
      this.metrics.memory = {
        used: mem.heapUsed,
        total: mem.heapTotal,
        percentage: (mem.heapUsed / mem.heapTotal) * 100,
      };
    }

    this.metrics.timestamp = now;
    this.metrics.uptime = uptime;
  }

  // ==========================================================================
  // SERVICE REGISTRATION
  // ==========================================================================

  /**
   * Registra um serviço para monitoramento
   */
  registerService(config: ServiceConfig): void {
    this.services.set(config.name, config);

    // Inicia checks periódicos
    if (config.interval) {
      const intervalId = setInterval(() => {
        this.checkService(config.name);
      }, config.interval);
      this.checkIntervals.set(config.name, intervalId);
    }

    // Faz check inicial
    this.checkService(config.name);
  }

  /**
   * Remove serviço do monitoramento
   */
  unregisterService(name: string): void {
    this.services.delete(name);
    this.lastResults.delete(name);

    const interval = this.checkIntervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(name);
    }
  }

  // ==========================================================================
  // HEALTH CHECKS
  // ==========================================================================

  /**
   * Verifica um serviço específico
   */
  async checkService(name: string): Promise<ServiceHealth> {
    const config = this.services.get(name);
    if (!config) {
      return {
        service: name,
        type: 'external_api',
        status: 'unknown',
        lastCheck: new Date(),
        message: 'Service not registered',
      };
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), config.timeout || 5000);
      });

      const result = await Promise.race([config.check(), timeoutPromise]);

      const health: ServiceHealth = {
        service: name,
        type: config.type,
        status: result.healthy ? 'healthy' : 'unhealthy',
        latency: result.latency,
        message: result.message,
        lastCheck: new Date(),
        metadata: result.metadata,
      };

      // Verifica degradação por latência
      if (result.healthy && result.latency && result.latency > 1000) {
        health.status = 'degraded';
      }

      this.lastResults.set(name, health);

      // Gera alertas se necessário
      this.checkForAlerts(health, config);

      return health;
    } catch (error) {
      const health: ServiceHealth = {
        service: name,
        type: config.type,
        status: 'unhealthy',
        lastCheck: new Date(),
        message: error instanceof Error ? error.message : 'Check failed',
      };

      this.lastResults.set(name, health);
      this.checkForAlerts(health, config);

      return health;
    }
  }

  /**
   * Verifica todos os serviços
   */
  async checkAllServices(): Promise<ServiceHealth[]> {
    const checks = Array.from(this.services.keys()).map(name =>
      this.checkService(name)
    );
    return Promise.all(checks);
  }

  /**
   * Gera relatório completo de saúde
   */
  async getHealthReport(): Promise<HealthReport> {
    const services = await this.checkAllServices();

    const criticalServices = Array.from(this.services.values())
      .filter(s => s.critical)
      .map(s => s.name);

    const hasUnhealthyCritical = services.some(
      s => criticalServices.includes(s.service) && s.status === 'unhealthy'
    );

    const hasDegraded = services.some(s => s.status === 'degraded');

    let overallStatus: HealthStatus = 'healthy';
    if (hasUnhealthyCritical) {
      overallStatus = 'unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'degraded';
    }

    const passed = services.filter(s => s.status === 'healthy').length;
    const failed = services.filter(s => s.status === 'unhealthy').length;

    return {
      status: overallStatus,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services,
      metrics: this.metrics,
      checks: {
        passed,
        failed,
        total: services.length,
      },
    };
  }

  /**
   * Endpoint de liveness (serviço rodando?)
   */
  isAlive(): boolean {
    return true;
  }

  /**
   * Endpoint de readiness (pronto para receber tráfego?)
   */
  async isReady(): Promise<boolean> {
    const criticalServices = Array.from(this.services.entries())
      .filter(([, config]) => config.critical)
      .map(([name]) => name);

    for (const name of criticalServices) {
      const health = this.lastResults.get(name);
      if (!health || health.status === 'unhealthy') {
        return false;
      }
    }

    return true;
  }

  // ==========================================================================
  // ALERTS
  // ==========================================================================

  /**
   * Verifica se deve gerar alerta
   */
  private checkForAlerts(health: ServiceHealth, config: ServiceConfig): void {
    // Serviço unhealthy
    if (health.status === 'unhealthy') {
      const existingAlert = this.alerts.find(
        a => a.service === health.service && !a.resolved
      );

      if (!existingAlert) {
        const alert: HealthAlert = {
          id: `alert_${Date.now()}`,
          service: health.service,
          severity: config.critical ? 'critical' : 'error',
          message: `Service ${health.service} is unhealthy: ${health.message || 'Check failed'}`,
          timestamp: new Date(),
          resolved: false,
          metadata: health.metadata,
        };

        this.alerts.push(alert);
        this.notifyAlert(alert);
      }
    }

    // Serviço recuperado
    if (health.status === 'healthy') {
      const unresolvedAlert = this.alerts.find(
        a => a.service === health.service && !a.resolved
      );

      if (unresolvedAlert) {
        unresolvedAlert.resolved = true;
        unresolvedAlert.resolvedAt = new Date();

        const recoveryAlert: HealthAlert = {
          id: `alert_${Date.now()}`,
          service: health.service,
          severity: 'info',
          message: `Service ${health.service} recovered`,
          timestamp: new Date(),
          resolved: true,
        };

        this.notifyAlert(recoveryAlert);
      }
    }

    // Latência alta
    if (health.latency && health.latency > 2000) {
      const alert: HealthAlert = {
        id: `alert_${Date.now()}`,
        service: health.service,
        severity: 'warning',
        message: `Service ${health.service} has high latency: ${health.latency}ms`,
        timestamp: new Date(),
        resolved: false,
        metadata: { latency: health.latency },
      };

      this.notifyAlert(alert);
    }
  }

  /**
   * Notifica callbacks de alerta
   */
  private notifyAlert(alert: HealthAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (e) {
        logger.error('[HealthCheck] Alert callback error:', e);
      }
    });

    // Envia para sistema de notificações
    this.sendAlertNotification(alert);
  }

  /**
   * Envia notificação de alerta
   */
  private async sendAlertNotification(alert: HealthAlert): Promise<void> {
    // Webhook
    if (process.env.HEALTH_ALERT_WEBHOOK) {
      try {
        await fetch(process.env.HEALTH_ALERT_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
        });
      } catch (e) {
        logger.error('[HealthCheck] Failed to send alert webhook:', e);
      }
    }

    // Console (sempre)
    const prefix = alert.severity === 'critical' ? '🚨' : alert.severity === 'error' ? '❌' : '⚠️';
    log.info(`${prefix} [HealthAlert] ${alert.message}`);
  }

  /**
   * Subscribe para alertas
   */
  onAlert(callback: (alert: HealthAlert) => void): () => void {
    this.alertCallbacks.add(callback);
    return () => this.alertCallbacks.delete(callback);
  }

  /**
   * Obtém alertas ativos
   */
  getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Obtém histórico de alertas
   */
  getAlertHistory(limit = 100): HealthAlert[] {
    return this.alerts.slice(-limit);
  }

  // ==========================================================================
  // METRICS
  // ==========================================================================

  /**
   * Incrementa contador de requests
   */
  trackRequest(latency: number): void {
    this.metrics.requests.total++;

    // Média móvel de latência
    const alpha = 0.1;
    this.metrics.requests.avgLatency =
      alpha * latency + (1 - alpha) * this.metrics.requests.avgLatency;
  }

  /**
   * Incrementa contador de erros
   */
  trackError(): void {
    this.metrics.errors.total++;
  }

  /**
   * Atualiza conexões ativas
   */
  setActiveConnections(count: number): void {
    this.metrics.activeConnections = count;
  }

  /**
   * Obtém métricas atuais
   */
  getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtém último resultado de um serviço
   */
  getServiceHealth(name: string): ServiceHealth | undefined {
    return this.lastResults.get(name);
  }

  /**
   * Obtém todos os últimos resultados
   */
  getAllServiceHealth(): ServiceHealth[] {
    return Array.from(this.lastResults.values());
  }
}

