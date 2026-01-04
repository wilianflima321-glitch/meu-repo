"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MissionTelemetry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissionTelemetry = void 0;
const inversify_1 = require("inversify");
const core_1 = require("@theia/core");
/**
 * Mission telemetry service
 */
let MissionTelemetry = class MissionTelemetry {
    static { MissionTelemetry_1 = this; }
    static { this.missionRuns = new Map(); }
    constructor() {
        this.metrics = [];
        this.slos = new Map();
        this.sloStatuses = new Map();
        this.alerts = [];
        this.onMetricEmitter = new core_1.Emitter();
        this.onMetric = this.onMetricEmitter.event;
        this.onSLOBreachEmitter = new core_1.Emitter();
        this.onSLOBreach = this.onSLOBreachEmitter.event;
        this.onAlertEmitter = new core_1.Emitter();
        this.onAlert = this.onAlertEmitter.event;
        this.initializeSLOs();
        this.startSLOMonitoring();
    }
    startMission(missionId, info = {}) {
        const startTime = info.startTime ? info.startTime.getTime() : Date.now();
        MissionTelemetry_1.missionRuns.set(missionId, {
            missionId,
            name: info.name,
            startTime,
            status: 'running',
            totalCost: 0,
            tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        });
    }
    completeMission(missionId) {
        const run = MissionTelemetry_1.missionRuns.get(missionId);
        if (run) {
            run.status = 'completed';
            run.endTime = Date.now();
        }
    }
    failMission(missionId) {
        const run = MissionTelemetry_1.missionRuns.get(missionId);
        if (run) {
            run.status = 'failed';
            run.endTime = Date.now();
        }
    }
    endMission(missionId, arg = 'completed') {
        const status = typeof arg === 'string' ? arg : (arg.status ?? 'completed');
        if (status === 'failed') {
            this.failMission(missionId);
        }
        else {
            this.completeMission(missionId);
        }
        const run = MissionTelemetry_1.missionRuns.get(missionId);
        if (run && typeof arg !== 'string' && arg.endTime) {
            run.endTime = arg.endTime.getTime();
        }
    }
    recordTokenUsage(missionId, usage) {
        const run = MissionTelemetry_1.missionRuns.get(missionId);
        if (!run) {
            // Lazily create if test calls recordTokenUsage before startMission
            this.startMission(missionId);
            return this.recordTokenUsage(missionId, usage);
        }
        run.tokenUsage.promptTokens += usage.promptTokens;
        run.tokenUsage.completionTokens += usage.completionTokens;
        run.tokenUsage.totalTokens += usage.totalTokens;
    }
    static recordMissionCost(missionId, cost) {
        const run = MissionTelemetry_1.missionRuns.get(missionId);
        if (run) {
            run.totalCost += cost;
        }
    }
    getMissionMetrics(missionId) {
        const run = MissionTelemetry_1.missionRuns.get(missionId);
        if (!run) {
            return {
                missionId,
                status: 'unknown',
                duration: 0,
                totalCost: 0,
                tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
            };
        }
        const end = run.endTime ?? Date.now();
        return {
            missionId,
            status: run.status,
            duration: Math.max(0, end - run.startTime),
            totalCost: run.totalCost,
            tokenUsage: run.tokenUsage,
        };
    }
    /**
     * Record metric
     */
    recordMetric(metric) {
        const fullMetric = {
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
    recordCodeMetrics(metrics, labels = {}) {
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
    recordTradingMetrics(metrics, labels = {}) {
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
    recordResearchMetrics(metrics, labels = {}) {
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
    recordCreativeMetrics(metrics, labels = {}) {
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
    getMetrics(domain, timeRange) {
        let filtered = this.metrics.filter(m => m.domain === domain);
        if (timeRange) {
            filtered = filtered.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
        }
        return filtered;
    }
    /**
     * Get metric statistics
     */
    getMetricStats(metricName, timeRange) {
        let filtered = this.metrics.filter(m => m.name === metricName);
        if (timeRange) {
            filtered = filtered.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
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
    getSLOStatus(sloId) {
        return this.sloStatuses.get(sloId);
    }
    /**
     * Get all SLO statuses for domain
     */
    getSLOStatuses(domain) {
        return Array.from(this.sloStatuses.values()).filter(status => status.slo.domain === domain);
    }
    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return this.alerts.filter(a => !a.acknowledged);
    }
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.acknowledged = true;
        }
    }
    /**
     * Get dashboard data for domain
     */
    getDashboard(domain) {
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
    initializeSLOs() {
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
    startSLOMonitoring() {
        setInterval(() => {
            this.checkSLOs();
        }, 60000); // Check every minute
    }
    checkSLOs() {
        for (const slo of this.slos.values()) {
            if (!slo.enabled)
                continue;
            const status = this.evaluateSLO(slo);
            this.sloStatuses.set(slo.id, status);
            if (status.breached) {
                this.onSLOBreachEmitter.fire(status);
                this.createAlert(slo, status);
            }
        }
    }
    evaluateSLO(slo) {
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
    calculateCompliance(currentValue, slo) {
        const diff = Math.abs(currentValue - slo.target);
        const range = Math.abs(slo.alertThreshold - slo.target);
        if (range === 0)
            return 1.0;
        const compliance = 1.0 - Math.min(diff / range, 1.0);
        return Math.max(0, Math.min(1, compliance));
    }
    createAlert(slo, status) {
        const severity = status.compliance < 0.5 ? 'critical' : 'warning';
        const alert = {
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
    getCodeDashboard(timeRange, slos, metrics, alerts) {
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
    getTradingDashboard(timeRange, slos, metrics, alerts) {
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
    getResearchDashboard(timeRange, slos, metrics, alerts) {
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
    getCreativeDashboard(timeRange, slos, metrics, alerts) {
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
};
exports.MissionTelemetry = MissionTelemetry;
exports.MissionTelemetry = MissionTelemetry = MissionTelemetry_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], MissionTelemetry);
