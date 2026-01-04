import { Event } from '@theia/core';
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
    window: number;
    enabled: boolean;
}
/**
 * SLO status
 */
export interface SLOStatus {
    slo: SLO;
    currentValue: number;
    targetValue: number;
    compliance: number;
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
export interface ResearchMetrics {
    factuality: number;
    sourceCoverage: number;
    fetchSuccess: number;
    citationRate: number;
    biasScore: number;
    dataFreshness: number;
}
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
export declare class MissionTelemetry {
    private static readonly missionRuns;
    private metrics;
    private slos;
    private sloStatuses;
    private alerts;
    private readonly onMetricEmitter;
    readonly onMetric: Event<MissionMetric>;
    private readonly onSLOBreachEmitter;
    readonly onSLOBreach: Event<SLOStatus>;
    private readonly onAlertEmitter;
    readonly onAlert: Event<Alert>;
    constructor();
    startMission(missionId: string, info?: {
        name?: string;
        startTime?: Date;
    }): void;
    completeMission(missionId: string): void;
    failMission(missionId: string): void;
    endMission(missionId: string, arg?: 'completed' | 'failed' | string | {
        status?: string;
        endTime?: Date;
    }): void;
    recordTokenUsage(missionId: string, usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    }): void;
    static recordMissionCost(missionId: string, cost: number): void;
    getMissionMetrics(missionId: string): {
        missionId: string;
        status: string;
        duration: number;
        totalCost: number;
        tokenUsage: {
            promptTokens: number;
            completionTokens: number;
            totalTokens: number;
        };
    };
    /**
     * Record metric
     */
    recordMetric(metric: Omit<MissionMetric, 'timestamp'>): void;
    /**
     * Record code metrics
     */
    recordCodeMetrics(metrics: Partial<CodeMetrics>, labels?: Record<string, string>): void;
    /**
     * Record trading metrics
     */
    recordTradingMetrics(metrics: Partial<TradingMetrics>, labels?: Record<string, string>): void;
    /**
     * Record research metrics
     */
    recordResearchMetrics(metrics: Partial<ResearchMetrics>, labels?: Record<string, string>): void;
    /**
     * Record creative metrics
     */
    recordCreativeMetrics(metrics: Partial<CreativeMetrics>, labels?: Record<string, string>): void;
    /**
     * Get metrics for domain
     */
    getMetrics(domain: 'code' | 'trading' | 'research' | 'creative', timeRange?: {
        start: number;
        end: number;
    }): MissionMetric[];
    /**
     * Get metric statistics
     */
    getMetricStats(metricName: string, timeRange?: {
        start: number;
        end: number;
    }): {
        min: number;
        max: number;
        avg: number;
        p50: number;
        p95: number;
        p99: number;
    };
    /**
     * Get SLO status
     */
    getSLOStatus(sloId: string): SLOStatus | undefined;
    /**
     * Get all SLO statuses for domain
     */
    getSLOStatuses(domain: 'code' | 'trading' | 'research' | 'creative'): SLOStatus[];
    /**
     * Get active alerts
     */
    getActiveAlerts(): Alert[];
    /**
     * Acknowledge alert
     */
    acknowledgeAlert(alertId: string): void;
    /**
     * Get dashboard data for domain
     */
    getDashboard(domain: 'code' | 'trading' | 'research' | 'creative'): any;
    private initializeSLOs;
    private startSLOMonitoring;
    private checkSLOs;
    private evaluateSLO;
    private calculateCompliance;
    private createAlert;
    private getCodeDashboard;
    private getTradingDashboard;
    private getResearchDashboard;
    private getCreativeDashboard;
}
