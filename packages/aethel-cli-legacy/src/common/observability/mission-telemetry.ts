import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core';

/**
 * Mission metric
 */
export interface MissionMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  domain: 'code' | 'trading' | 'research' | 'creative';
  labels: Record<string, string>;
}

/**
 * SLO definition
 */
export interface SLO {
  id: string;
  name: string;
  domain: 'code' | 'trading' | 'research' | 'creative';
  metric: string;
  target: number;
  unit: string;
  comparison: 'lt' | 'lte' | 'gt' | 'gte' | 'eq';
  alertThreshold: number;
  window: number; // seconds
  enabled: boolean;
}

/**
 * SLO status
 */
export interface SLOStatus {
  slo: SLO;
  currentValue: number;
  targetValue: number;
  compliance: number; // 0-1
  breached: boolean;
  lastBreach?: number;
  breachCount: number;
}

/**
 * Alert
 */
export interface Alert {
  id: string;
  sloId: string;
  severity: 'warning' | 'critical';
  message: string;
  currentValue: number;
  targetValue: number;
  timestamp: number;
  acknowledged: boolean;
}

/**
 * Domain-specific metrics
 */

// Code metrics
export interface CodeMetrics {
  passAtK: number;
  buildTime: number;
  testCoverage: number;
  lintErrors: number;
  securityIssues: number;
  deploymentFrequency: number;
  changeFailureRate: number;
  meanTimeToRestore: number;
}

// Trading metrics
export interface TradingMetrics {
  decisionLatency: number;
  slippage: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  orderFillRate: number;
  dataLatency: number;
}

// Research metrics
export interface ResearchMetrics {
  factuality: number;
  sourceCoverage: number;
  fetchSuccess: number;
  citationRate: number;
  biasScore: number;
  dataFreshness: number;
}

// Creative metrics
export interface CreativeMetrics {
  shotToPreview: number;
  styleConsistency: number;
  assetRejection: number;
  renderTime: number;
  characterConsistency: number;
  timelineCoherence: number;
}

/**
 * Mission telemetry service
 */
@injectable()
export class MissionTelemetry {
  private metrics: MissionMetric[] = [];
  private slos: Map<string, SLO> = new Map();
  private sloStatuses: Map<string, SLOStatus> = new Map();
  private alerts: Alert[] = [];

  private readonly onMetricEmitter = new Emitter<MissionMetric>();
  readonly onMetric: Event<MissionMetric> = this.onMetricEmitter.event;

  private readonly onSLOBreachEmitter = new Emitter<SLOStatus>();
  readonly onSLOBreach: Event<SLOStatus> = this.onSLOBreachEmitter.event;

  private readonly onAlertEmitter = new Emitter<Alert>();
  readonly onAlert: Event<Alert> = this.onAlertEmitter.event;

  constructor() {
    this.initializeSLOs();
    this.startSLOMonitoring();
  }

  /**
   * Record metric
   */
  recordMetric(metric: Omit<MissionMetric, 'timestamp'>): void {
    const fullMetric: MissionMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);
    this.onMetricEmitter.fire(fullMetric);

    // Keep bounded (last 100k metrics)
    if (this.metrics.length > 100000) {
      this.metrics = this.metrics.slice(-100000);
    }
  }

  /**
   * Record code metrics
   */
  recordCodeMetrics(metrics: Partial<CodeMetrics>, labels: Record<string, string> = {}): void {
    if (metrics.passAtK !== undefined) {
      this.recordMetric({
        name: 'code.pass_at_k',
        value: metrics.passAtK,
        unit: 'ratio',
        domain: 'code',
        labels,
      });
    }

    if (metrics.buildTime !== undefined) {
      this.recordMetric({
        name: 'code.build_time',
        value: metrics.buildTime,
        unit: 'seconds',
        domain: 'code',
        labels,
      });
    }

    if (metrics.testCoverage !== undefined) {
      this.recordMetric({
        name: 'code.test_coverage',
        value: metrics.testCoverage,
        unit: 'ratio',
        domain: 'code',
        labels,
      });
    }

    if (metrics.lintErrors !== undefined) {
      this.recordMetric({
        name: 'code.lint_errors',
        value: metrics.lintErrors,
        unit: 'count',
        domain: 'code',
        labels,
      });
    }

    if (metrics.securityIssues !== undefined) {
      this.recordMetric({
        name: 'code.security_issues',
        value: metrics.securityIssues,
        unit: 'count',
        domain: 'code',
        labels,
      });
    }
  }

  /**
   * Record trading metrics
   */
  recordTradingMetrics(metrics: Partial<TradingMetrics>, labels: Record<string, string> = {}): void {
    if (metrics.decisionLatency !== undefined) {
      this.recordMetric({
        name: 'trading.decision_latency',
        value: metrics.decisionLatency,
        unit: 'ms',
        domain: 'trading',
        labels,
      });
    }

    if (metrics.slippage !== undefined) {
      this.recordMetric({
        name: 'trading.slippage',
        value: metrics.slippage,
        unit: 'ratio',
        domain: 'trading',
        labels,
      });
    }

    if (metrics.winRate !== undefined) {
      this.recordMetric({
        name: 'trading.win_rate',
        value: metrics.winRate,
        unit: 'ratio',
        domain: 'trading',
        labels,
      });
    }

    if (metrics.sharpeRatio !== undefined) {
      this.recordMetric({
        name: 'trading.sharpe_ratio',
        value: metrics.sharpeRatio,
        unit: 'ratio',
        domain: 'trading',
        labels,
      });
    }

    if (metrics.maxDrawdown !== undefined) {
      this.recordMetric({
        name: 'trading.max_drawdown',
        value: metrics.maxDrawdown,
        unit: 'ratio',
        domain: 'trading',
        labels,
      });
    }
  }

  /**
   * Record research metrics
   */
  recordResearchMetrics(metrics: Partial<ResearchMetrics>, labels: Record<string, string> = {}): void {
    if (metrics.factuality !== undefined) {
      this.recordMetric({
        name: 'research.factuality',
        value: metrics.factuality,
        unit: 'ratio',
        domain: 'research',
        labels,
      });
    }

    if (metrics.sourceCoverage !== undefined) {
      this.recordMetric({
        name: 'research.source_coverage',
        value: metrics.sourceCoverage,
        unit: 'count',
        domain: 'research',
        labels,
      });
    }

    if (metrics.fetchSuccess !== undefined) {
      this.recordMetric({
        name: 'research.fetch_success',
        value: metrics.fetchSuccess,
        unit: 'ratio',
        domain: 'research',
        labels,
      });
    }

    if (metrics.citationRate !== undefined) {
      this.recordMetric({
        name: 'research.citation_rate',
        value: metrics.citationRate,
        unit: 'ratio',
        domain: 'research',
        labels,
      });
    }
  }

  /**
   * Record creative metrics
   */
  recordCreativeMetrics(metrics: Partial<CreativeMetrics>, labels: Record<string, string> = {}): void {
    if (metrics.shotToPreview !== undefined) {
      this.recordMetric({
        name: 'creative.shot_to_preview',
        value: metrics.shotToPreview,
        unit: 'seconds',
        domain: 'creative',
        labels,
      });
    }

    if (metrics.styleConsistency !== undefined) {
      this.recordMetric({
        name: 'creative.style_consistency',
        value: metrics.styleConsistency,
        unit: 'ratio',
        domain: 'creative',
        labels,
      });
    }

    if (metrics.assetRejection !== undefined) {
      this.recordMetric({
        name: 'creative.asset_rejection',
        value: metrics.assetRejection,
        unit: 'ratio',
        domain: 'creative',
        labels,
      });
    }

    if (metrics.renderTime !== undefined) {
      this.recordMetric({
        name: 'creative.render_time',
        value: metrics.renderTime,
        unit: 'seconds',
        domain: 'creative',
        labels,
      });
    }
  }

  /**
   * Get metrics for domain
   */
  getMetrics(
    domain: 'code' | 'trading' | 'research' | 'creative',
    timeRange?: { start: number; end: number }
  ): MissionMetric[] {
    let filtered = this.metrics.filter(m => m.domain === domain);

    if (timeRange) {
      filtered = filtered.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return filtered;
  }

  /**
   * Get metric statistics
   */
  getMetricStats(
    metricName: string,
    timeRange?: { start: number; end: number }
  ): { min: number; max: number; avg: number; p50: number; p95: number; p99: number } {
    let filtered = this.metrics.filter(m => m.name === metricName);

    if (timeRange) {
      filtered = filtered.filter(
        m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    if (filtered.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const values = filtered.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  }

  /**
   * Get SLO status
   */
  getSLOStatus(sloId: string): SLOStatus | undefined {
    return this.sloStatuses.get(sloId);
  }

  /**
   * Get all SLO statuses for domain
   */
  getSLOStatuses(domain: 'code' | 'trading' | 'research' | 'creative'): SLOStatus[] {
    return Array.from(this.sloStatuses.values()).filter(
      status => status.slo.domain === domain
    );
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Get dashboard data for domain
   */
  getDashboard(domain: 'code' | 'trading' | 'research' | 'creative'): any {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const timeRange = { start: oneHourAgo, end: now };

    const slos = this.getSLOStatuses(domain);
    const metrics = this.getMetrics(domain, timeRange);
    const alerts = this.getActiveAlerts().filter(a => {
      const slo = this.slos.get(a.sloId);
      return slo?.domain === domain;
    });

    // Domain-specific dashboards
    switch (domain) {
      case 'code':
        return this.getCodeDashboard(timeRange, slos, metrics, alerts);
      case 'trading':
        return this.getTradingDashboard(timeRange, slos, metrics, alerts);
      case 'research':
        return this.getResearchDashboard(timeRange, slos, metrics, alerts);
      case 'creative':
        return this.getCreativeDashboard(timeRange, slos, metrics, alerts);
    }
  }

  // Private methods

  private initializeSLOs(): void {
    // Code SLOs
    this.slos.set('code.pass_at_k', {
      id: 'code.pass_at_k',
      name: 'Code Pass@K',
      domain: 'code',
      metric: 'code.pass_at_k',
      target: 0.8,
      unit: 'ratio',
      comparison: 'gte',
      alertThreshold: 0.6,
      window: 3600,
      enabled: true,
    });

    this.slos.set('code.build_time', {
      id: 'code.build_time',
      name: 'Build Time',
      domain: 'code',
      metric: 'code.build_time',
      target: 300,
      unit: 'seconds',
      comparison: 'lte',
      alertThreshold: 600,
      window: 3600,
      enabled: true,
    });

    this.slos.set('code.test_coverage', {
      id: 'code.test_coverage',
      name: 'Test Coverage',
      domain: 'code',
      metric: 'code.test_coverage',
      target: 0.8,
      unit: 'ratio',
      comparison: 'gte',
      alertThreshold: 0.6,
      window: 3600,
      enabled: true,
    });

    // Trading SLOs
    this.slos.set('trading.decision_latency', {
      id: 'trading.decision_latency',
      name: 'Decision Latency',
      domain: 'trading',
      metric: 'trading.decision_latency',
      target: 100,
      unit: 'ms',
      comparison: 'lte',
      alertThreshold: 500,
      window: 3600,
      enabled: true,
    });

    this.slos.set('trading.slippage', {
      id: 'trading.slippage',
      name: 'Slippage',
      domain: 'trading',
      metric: 'trading.slippage',
      target: 0.001,
      unit: 'ratio',
      comparison: 'lte',
      alertThreshold: 0.005,
      window: 3600,
      enabled: true,
    });

    this.slos.set('trading.win_rate', {
      id: 'trading.win_rate',
      name: 'Win Rate',
      domain: 'trading',
      metric: 'trading.win_rate',
      target: 0.55,
      unit: 'ratio',
      comparison: 'gte',
      alertThreshold: 0.45,
      window: 86400,
      enabled: true,
    });

    // Research SLOs
    this.slos.set('research.factuality', {
      id: 'research.factuality',
      name: 'Factuality',
      domain: 'research',
      metric: 'research.factuality',
      target: 0.9,
      unit: 'ratio',
      comparison: 'gte',
      alertThreshold: 0.7,
      window: 3600,
      enabled: true,
    });

    this.slos.set('research.source_coverage', {
      id: 'research.source_coverage',
      name: 'Source Coverage',
      domain: 'research',
      metric: 'research.source_coverage',
      target: 5,
      unit: 'count',
      comparison: 'gte',
      alertThreshold: 2,
      window: 3600,
      enabled: true,
    });

    this.slos.set('research.fetch_success', {
      id: 'research.fetch_success',
      name: 'Fetch Success Rate',
      domain: 'research',
      metric: 'research.fetch_success',
      target: 0.95,
      unit: 'ratio',
      comparison: 'gte',
      alertThreshold: 0.8,
      window: 3600,
      enabled: true,
    });

    // Creative SLOs
    this.slos.set('creative.shot_to_preview', {
      id: 'creative.shot_to_preview',
      name: 'Shot to Preview Time',
      domain: 'creative',
      metric: 'creative.shot_to_preview',
      target: 300,
      unit: 'seconds',
      comparison: 'lte',
      alertThreshold: 600,
      window: 3600,
      enabled: true,
    });

    this.slos.set('creative.style_consistency', {
      id: 'creative.style_consistency',
      name: 'Style Consistency',
      domain: 'creative',
      metric: 'creative.style_consistency',
      target: 0.9,
      unit: 'ratio',
      comparison: 'gte',
      alertThreshold: 0.7,
      window: 3600,
      enabled: true,
    });

    this.slos.set('creative.asset_rejection', {
      id: 'creative.asset_rejection',
      name: 'Asset Rejection Rate',
      domain: 'creative',
      metric: 'creative.asset_rejection',
      target: 0.1,
      unit: 'ratio',
      comparison: 'lte',
      alertThreshold: 0.3,
      window: 3600,
      enabled: true,
    });
  }

  private startSLOMonitoring(): void {
    setInterval(() => {
      this.checkSLOs();
    }, 60000); // Check every minute
  }

  private checkSLOs(): void {
    for (const slo of this.slos.values()) {
      if (!slo.enabled) continue;

      const status = this.evaluateSLO(slo);
      this.sloStatuses.set(slo.id, status);

      if (status.breached) {
        this.onSLOBreachEmitter.fire(status);
        this.createAlert(slo, status);
      }
    }
  }

  private evaluateSLO(slo: SLO): SLOStatus {
    const now = Date.now();
    const windowStart = now - slo.window * 1000;
    const timeRange = { start: windowStart, end: now };

    const stats = this.getMetricStats(slo.metric, timeRange);
    const currentValue = stats.p95; // Use P95 for evaluation

    let breached = false;
    switch (slo.comparison) {
      case 'lt':
        breached = currentValue >= slo.alertThreshold;
        break;
      case 'lte':
        breached = currentValue > slo.alertThreshold;
        break;
      case 'gt':
        breached = currentValue <= slo.alertThreshold;
        break;
      case 'gte':
        breached = currentValue < slo.alertThreshold;
        break;
      case 'eq':
        breached = currentValue !== slo.target;
        break;
    }

    const compliance = this.calculateCompliance(currentValue, slo);

    const existing = this.sloStatuses.get(slo.id);
    const breachCount = breached
      ? (existing?.breachCount || 0) + 1
      : existing?.breachCount || 0;

    return {
      slo,
      currentValue,
      targetValue: slo.target,
      compliance,
      breached,
      lastBreach: breached ? now : existing?.lastBreach,
      breachCount,
    };
  }

  private calculateCompliance(currentValue: number, slo: SLO): number {
    const diff = Math.abs(currentValue - slo.target);
    const range = Math.abs(slo.alertThreshold - slo.target);
    
    if (range === 0) return 1.0;
    
    const compliance = 1.0 - Math.min(diff / range, 1.0);
    return Math.max(0, Math.min(1, compliance));
  }

  private createAlert(slo: SLO, status: SLOStatus): void {
    const severity = status.compliance < 0.5 ? 'critical' : 'warning';

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sloId: slo.id,
      severity,
      message: `${slo.name} breached: ${status.currentValue.toFixed(2)} ${slo.unit} (target: ${slo.target} ${slo.unit})`,
      currentValue: status.currentValue,
      targetValue: slo.target,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.onAlertEmitter.fire(alert);

    // Keep bounded (last 1000 alerts)
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  private getCodeDashboard(timeRange: any, slos: SLOStatus[], metrics: MissionMetric[], alerts: Alert[]): any {
    return {
      domain: 'code',
      slos: slos.map(s => ({
        name: s.slo.name,
        current: s.currentValue,
        target: s.targetValue,
        compliance: s.compliance,
        breached: s.breached,
      })),
      metrics: {
        passAtK: this.getMetricStats('code.pass_at_k', timeRange),
        buildTime: this.getMetricStats('code.build_time', timeRange),
        testCoverage: this.getMetricStats('code.test_coverage', timeRange),
      },
      alerts: alerts.length,
    };
  }

  private getTradingDashboard(timeRange: any, slos: SLOStatus[], metrics: MissionMetric[], alerts: Alert[]): any {
    return {
      domain: 'trading',
      slos: slos.map(s => ({
        name: s.slo.name,
        current: s.currentValue,
        target: s.targetValue,
        compliance: s.compliance,
        breached: s.breached,
      })),
      metrics: {
        decisionLatency: this.getMetricStats('trading.decision_latency', timeRange),
        slippage: this.getMetricStats('trading.slippage', timeRange),
        winRate: this.getMetricStats('trading.win_rate', timeRange),
      },
      alerts: alerts.length,
    };
  }

  private getResearchDashboard(timeRange: any, slos: SLOStatus[], metrics: MissionMetric[], alerts: Alert[]): any {
    return {
      domain: 'research',
      slos: slos.map(s => ({
        name: s.slo.name,
        current: s.currentValue,
        target: s.targetValue,
        compliance: s.compliance,
        breached: s.breached,
      })),
      metrics: {
        factuality: this.getMetricStats('research.factuality', timeRange),
        sourceCoverage: this.getMetricStats('research.source_coverage', timeRange),
        fetchSuccess: this.getMetricStats('research.fetch_success', timeRange),
      },
      alerts: alerts.length,
    };
  }

  private getCreativeDashboard(timeRange: any, slos: SLOStatus[], metrics: MissionMetric[], alerts: Alert[]): any {
    return {
      domain: 'creative',
      slos: slos.map(s => ({
        name: s.slo.name,
        current: s.currentValue,
        target: s.targetValue,
        compliance: s.compliance,
        breached: s.breached,
      })),
      metrics: {
        shotToPreview: this.getMetricStats('creative.shot_to_preview', timeRange),
        styleConsistency: this.getMetricStats('creative.style_consistency', timeRange),
        assetRejection: this.getMetricStats('creative.asset_rejection', timeRange),
      },
      alerts: alerts.length,
    };
  }
}
