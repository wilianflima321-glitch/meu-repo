/**
 * Chaos Testing & Reliability
 * Network failures, timeouts, automatic reconnection
 */
export interface ChaosScenario {
    id: string;
    name: string;
    type: 'network' | 'timeout' | 'latency' | 'error';
    probability: number;
    duration?: number;
    enabled: boolean;
}
export interface ReconnectionStrategy {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
}
export declare class ReliabilityManager {
    private scenarios;
    private reconnectionAttempts;
    private readonly DEFAULT_STRATEGY;
    /**
     * Execute with automatic retry and reconnection
     */
    executeWithRetry<T>(operation: () => Promise<T>, operationId: string, strategy?: Partial<ReconnectionStrategy>): Promise<T>;
    /**
     * Apply chaos scenario if enabled
     */
    private applyChaos;
    /**
     * Register chaos scenario
     */
    registerScenario(scenario: ChaosScenario): void;
    /**
     * Enable/disable chaos testing
     */
    setScenarioEnabled(scenarioId: string, enabled: boolean): void;
    /**
     * Get reconnection attempts for operation
     */
    getReconnectionAttempts(operationId: string): number;
    private sleep;
}
/**
 * SLA Monitor
 */
export interface SLATarget {
    service: string;
    metric: string;
    target: number;
    unit: string;
    alertThreshold: number;
}
export declare class SLAMonitor {
    private targets;
    private measurements;
    private alerts;
    /**
     * Register SLA target
     */
    registerTarget(target: SLATarget): void;
    /**
     * Record measurement
     */
    recordMeasurement(service: string, metric: string, value: number): void;
    /**
     * Check if measurement violates SLA
     */
    private checkSLA;
    /**
     * Get SLA compliance
     */
    getCompliance(service: string, metric: string): number;
    /**
     * Get recent alerts
     */
    getAlerts(limit?: number): typeof this.alerts;
}
