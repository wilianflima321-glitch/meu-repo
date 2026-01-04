/**
 * Performance Monitor System - Real-Time Metrics Infrastructure
 *
 * Sistema de monitoramento de performance profissional para IDE de produção.
 * Inspirado em Chrome DevTools, Unreal Engine Profiler, Unity Profiler.
 * Suporta:
 * - Métricas em tempo real (FPS, memória, CPU)
 * - Profiling de funções
 * - Detecção de memory leaks
 * - Análise de frame timing
 * - Rastreamento de eventos
 * - Alertas de performance
 * - Exportação de relatórios
 * - Integração com telemetria
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Metric type
 */
export declare enum MetricType {
    Counter = "counter",
    Gauge = "gauge",
    Histogram = "histogram",
    Summary = "summary",
    Timer = "timer"
}
/**
 * Performance category
 */
export declare enum PerformanceCategory {
    Rendering = "rendering",
    Scripting = "scripting",
    Layout = "layout",
    Painting = "painting",
    Memory = "memory",
    Network = "network",
    IO = "io",
    GC = "gc",
    User = "user",
    System = "system"
}
/**
 * Alert severity
 */
export declare enum AlertSeverity {
    Info = "info",
    Warning = "warning",
    Critical = "critical"
}
/**
 * Metric definition
 */
export interface MetricDefinition {
    name: string;
    type: MetricType;
    category: PerformanceCategory;
    description?: string;
    unit?: string;
    labels?: string[];
}
/**
 * Metric value
 */
export interface MetricValue {
    name: string;
    value: number;
    timestamp: number;
    labels?: Record<string, string>;
}
/**
 * Frame timing
 */
export interface FrameTiming {
    frameNumber: number;
    timestamp: number;
    deltaTime: number;
    fps: number;
    scripting: number;
    rendering: number;
    painting: number;
    idle: number;
    total: number;
    dropped: boolean;
}
/**
 * Memory snapshot
 */
export interface MemorySnapshot {
    timestamp: number;
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    allocations?: number;
    gcTime?: number;
    external?: number;
}
/**
 * Profile entry
 */
export interface ProfileEntry {
    id: string;
    name: string;
    category: PerformanceCategory;
    startTime: number;
    endTime?: number;
    duration?: number;
    selfTime?: number;
    children?: ProfileEntry[];
    metadata?: Record<string, unknown>;
}
/**
 * Performance alert
 */
export interface PerformanceAlert {
    id: string;
    severity: AlertSeverity;
    metric: string;
    message: string;
    value: number;
    threshold: number;
    timestamp: number;
    resolved: boolean;
}
/**
 * Performance config
 */
export interface PerformanceConfig {
    enabled: boolean;
    sampleRate: number;
    maxSamples: number;
    trackFrameTiming: boolean;
    targetFPS: number;
    frameDropThreshold: number;
    trackMemory: boolean;
    memorySampleInterval: number;
    memoryWarningThreshold: number;
    memoryCriticalThreshold: number;
    profilingEnabled: boolean;
    maxProfileDepth: number;
    alertsEnabled: boolean;
    alertCooldown: number;
    exportFormat: 'json' | 'csv' | 'chrome-trace';
}
/**
 * Threshold definition
 */
export interface ThresholdDefinition {
    metric: string;
    warningValue: number;
    criticalValue: number;
    comparison: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
    duration?: number;
}
/**
 * Metric recorded event
 */
export interface MetricRecordedEvent {
    metric: MetricValue;
}
/**
 * Frame completed event
 */
export interface FrameCompletedEvent {
    timing: FrameTiming;
}
/**
 * Alert triggered event
 */
export interface AlertTriggeredEvent {
    alert: PerformanceAlert;
}
/**
 * Profile completed event
 */
export interface ProfileCompletedEvent {
    profile: ProfileEntry;
}
export declare class PerformanceMonitorSystem {
    private config;
    private readonly metrics;
    private readonly metricValues;
    private readonly histograms;
    private frameTimings;
    private frameNumber;
    private lastFrameTime;
    private frameRequestId;
    private memorySnapshots;
    private memoryTimer;
    private activeProfiles;
    private completedProfiles;
    private profileStack;
    private readonly thresholds;
    private readonly alerts;
    private readonly alertCooldowns;
    private readonly onMetricRecordedEmitter;
    readonly onMetricRecorded: Event<MetricRecordedEvent>;
    private readonly onFrameCompletedEmitter;
    readonly onFrameCompleted: Event<FrameCompletedEvent>;
    private readonly onAlertTriggeredEmitter;
    readonly onAlertTriggered: Event<AlertTriggeredEvent>;
    private readonly onProfileCompletedEmitter;
    readonly onProfileCompleted: Event<ProfileCompletedEvent>;
    constructor();
    /**
     * Initialize performance monitor
     */
    private initialize;
    /**
     * Register default metrics
     */
    private registerDefaultMetrics;
    /**
     * Register default thresholds
     */
    private registerDefaultThresholds;
    /**
     * Start monitoring
     */
    start(): void;
    /**
     * Stop monitoring
     */
    stop(): void;
    /**
     * Start frame tracking
     */
    private startFrameTracking;
    /**
     * Stop frame tracking
     */
    private stopFrameTracking;
    /**
     * Start memory tracking
     */
    private startMemoryTracking;
    /**
     * Stop memory tracking
     */
    private stopMemoryTracking;
    /**
     * Sample memory
     */
    private sampleMemory;
    /**
     * Register metric
     */
    registerMetric(definition: MetricDefinition): void;
    /**
     * Record metric value
     */
    recordValue(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Increment counter
     */
    increment(name: string, amount?: number, labels?: Record<string, string>): void;
    /**
     * Set gauge value
     */
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Record histogram value
     */
    recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
    /**
     * Get metric values
     */
    getValues(name: string, since?: number): MetricValue[];
    /**
     * Get latest metric value
     */
    getLatestValue(name: string): number | undefined;
    /**
     * Get metric statistics
     */
    getStatistics(name: string): {
        min: number;
        max: number;
        avg: number;
        median: number;
        p95: number;
        p99: number;
        stdDev: number;
        count: number;
    } | undefined;
    /**
     * Begin profile
     */
    beginProfile(name: string, category?: PerformanceCategory): string;
    /**
     * End profile
     */
    endProfile(id: string): ProfileEntry | undefined;
    /**
     * Profile function execution
     */
    profile<T>(name: string, fn: () => T | Promise<T>, category?: PerformanceCategory): Promise<T>;
    /**
     * Get completed profiles
     */
    getProfiles(since?: number): ProfileEntry[];
    /**
     * Clear profiles
     */
    clearProfiles(): void;
    /**
     * Get frame timings
     */
    getFrameTimings(count?: number): FrameTiming[];
    /**
     * Get average FPS
     */
    getAverageFPS(samples?: number): number;
    /**
     * Get dropped frames count
     */
    getDroppedFramesCount(samples?: number): number;
    /**
     * Get memory snapshots
     */
    getMemorySnapshots(count?: number): MemorySnapshot[];
    /**
     * Get current memory usage
     */
    getCurrentMemory(): MemorySnapshot | undefined;
    /**
     * Force garbage collection (if available)
     */
    forceGC(): boolean;
    /**
     * Set threshold
     */
    setThreshold(threshold: ThresholdDefinition): void;
    /**
     * Remove threshold
     */
    removeThreshold(metric: string): void;
    /**
     * Check thresholds
     */
    private checkThresholds;
    /**
     * Get alerts
     */
    getAlerts(unresolved?: boolean): PerformanceAlert[];
    /**
     * Resolve alert
     */
    resolveAlert(alertId: string): void;
    /**
     * Clear alerts
     */
    clearAlerts(): void;
    /**
     * Export data
     */
    exportData(options?: {
        metrics?: string[];
        includeProfiles?: boolean;
        includeFrameTimings?: boolean;
        includeMemory?: boolean;
        since?: number;
    }): string;
    /**
     * Convert to CSV
     */
    private toCsv;
    /**
     * Convert to Chrome Trace format
     */
    private toChromeTrace;
    /**
     * Get summary
     */
    getSummary(): {
        fps: {
            current: number;
            average: number;
            min: number;
            max: number;
        };
        memory: {
            used: number;
            total: number;
            limit: number;
            percentage: number;
        };
        frameDrops: {
            count: number;
            percentage: number;
        };
        alerts: {
            warning: number;
            critical: number;
        };
    };
    /**
     * Update config
     */
    updateConfig(updates: Partial<PerformanceConfig>): void;
    /**
     * Clear all data
     */
    clearAll(): void;
    /**
     * Dispose
     */
    dispose(): void;
}
/**
 * Profile decorator
 */
export declare function Profile(name?: string, category?: PerformanceCategory): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export default PerformanceMonitorSystem;
