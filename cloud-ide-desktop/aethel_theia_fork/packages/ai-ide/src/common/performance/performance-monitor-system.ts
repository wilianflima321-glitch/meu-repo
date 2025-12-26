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

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Performance Types ====================

/**
 * Metric type
 */
export enum MetricType {
    Counter = 'counter',
    Gauge = 'gauge',
    Histogram = 'histogram',
    Summary = 'summary',
    Timer = 'timer'
}

/**
 * Performance category
 */
export enum PerformanceCategory {
    Rendering = 'rendering',
    Scripting = 'scripting',
    Layout = 'layout',
    Painting = 'painting',
    Memory = 'memory',
    Network = 'network',
    IO = 'io',
    GC = 'gc',
    User = 'user',
    System = 'system'
}

/**
 * Alert severity
 */
export enum AlertSeverity {
    Info = 'info',
    Warning = 'warning',
    Critical = 'critical'
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
    // Sampling
    enabled: boolean;
    sampleRate: number;
    maxSamples: number;
    
    // Frame timing
    trackFrameTiming: boolean;
    targetFPS: number;
    frameDropThreshold: number;
    
    // Memory
    trackMemory: boolean;
    memorySampleInterval: number;
    memoryWarningThreshold: number;
    memoryCriticalThreshold: number;
    
    // Profiling
    profilingEnabled: boolean;
    maxProfileDepth: number;
    
    // Alerts
    alertsEnabled: boolean;
    alertCooldown: number;
    
    // Export
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

// ==================== Events ====================

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

// ==================== Main Performance Monitor ====================

@injectable()
export class PerformanceMonitorSystem {
    // Configuration
    private config: PerformanceConfig = {
        enabled: true,
        sampleRate: 60,
        maxSamples: 10000,
        trackFrameTiming: true,
        targetFPS: 60,
        frameDropThreshold: 16.67 * 1.5, // 1.5x frame budget
        trackMemory: true,
        memorySampleInterval: 1000,
        memoryWarningThreshold: 0.7,
        memoryCriticalThreshold: 0.9,
        profilingEnabled: true,
        maxProfileDepth: 100,
        alertsEnabled: true,
        alertCooldown: 5000,
        exportFormat: 'json'
    };

    // Metrics storage
    private readonly metrics: Map<string, MetricDefinition> = new Map();
    private readonly metricValues: Map<string, MetricValue[]> = new Map();
    private readonly histograms: Map<string, number[]> = new Map();
    
    // Frame timing
    private frameTimings: FrameTiming[] = [];
    private frameNumber = 0;
    private lastFrameTime = 0;
    private frameRequestId: number | null = null;
    
    // Memory
    private memorySnapshots: MemorySnapshot[] = [];
    private memoryTimer: ReturnType<typeof setInterval> | null = null;
    
    // Profiling
    private activeProfiles: Map<string, ProfileEntry> = new Map();
    private completedProfiles: ProfileEntry[] = [];
    private profileStack: ProfileEntry[] = [];
    
    // Alerts
    private readonly thresholds: Map<string, ThresholdDefinition> = new Map();
    private readonly alerts: PerformanceAlert[] = [];
    private readonly alertCooldowns: Map<string, number> = new Map();
    
    // Events
    private readonly onMetricRecordedEmitter = new Emitter<MetricRecordedEvent>();
    readonly onMetricRecorded: Event<MetricRecordedEvent> = this.onMetricRecordedEmitter.event;
    
    private readonly onFrameCompletedEmitter = new Emitter<FrameCompletedEvent>();
    readonly onFrameCompleted: Event<FrameCompletedEvent> = this.onFrameCompletedEmitter.event;
    
    private readonly onAlertTriggeredEmitter = new Emitter<AlertTriggeredEvent>();
    readonly onAlertTriggered: Event<AlertTriggeredEvent> = this.onAlertTriggeredEmitter.event;
    
    private readonly onProfileCompletedEmitter = new Emitter<ProfileCompletedEvent>();
    readonly onProfileCompleted: Event<ProfileCompletedEvent> = this.onProfileCompletedEmitter.event;

    constructor() {
        this.initialize();
    }

    // ==================== Initialization ====================

    /**
     * Initialize performance monitor
     */
    private initialize(): void {
        this.registerDefaultMetrics();
        this.registerDefaultThresholds();
        
        if (this.config.enabled) {
            this.start();
        }
    }

    /**
     * Register default metrics
     */
    private registerDefaultMetrics(): void {
        // Frame metrics
        this.registerMetric({
            name: 'fps',
            type: MetricType.Gauge,
            category: PerformanceCategory.Rendering,
            description: 'Frames per second',
            unit: 'fps'
        });
        
        this.registerMetric({
            name: 'frame_time',
            type: MetricType.Histogram,
            category: PerformanceCategory.Rendering,
            description: 'Frame time',
            unit: 'ms'
        });
        
        // Memory metrics
        this.registerMetric({
            name: 'heap_used',
            type: MetricType.Gauge,
            category: PerformanceCategory.Memory,
            description: 'Used JS heap size',
            unit: 'bytes'
        });
        
        this.registerMetric({
            name: 'heap_total',
            type: MetricType.Gauge,
            category: PerformanceCategory.Memory,
            description: 'Total JS heap size',
            unit: 'bytes'
        });
        
        this.registerMetric({
            name: 'heap_limit',
            type: MetricType.Gauge,
            category: PerformanceCategory.Memory,
            description: 'JS heap size limit',
            unit: 'bytes'
        });
        
        // Script metrics
        this.registerMetric({
            name: 'script_time',
            type: MetricType.Histogram,
            category: PerformanceCategory.Scripting,
            description: 'Script execution time',
            unit: 'ms'
        });
    }

    /**
     * Register default thresholds
     */
    private registerDefaultThresholds(): void {
        this.setThreshold({
            metric: 'fps',
            warningValue: 50,
            criticalValue: 30,
            comparison: 'lt'
        });
        
        this.setThreshold({
            metric: 'frame_time',
            warningValue: 20,
            criticalValue: 33.33,
            comparison: 'gt'
        });
        
        this.setThreshold({
            metric: 'heap_used',
            warningValue: this.config.memoryWarningThreshold,
            criticalValue: this.config.memoryCriticalThreshold,
            comparison: 'gt'
        });
    }

    // ==================== Control ====================

    /**
     * Start monitoring
     */
    start(): void {
        this.config.enabled = true;
        
        if (this.config.trackFrameTiming) {
            this.startFrameTracking();
        }
        
        if (this.config.trackMemory) {
            this.startMemoryTracking();
        }
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        this.config.enabled = false;
        this.stopFrameTracking();
        this.stopMemoryTracking();
    }

    /**
     * Start frame tracking
     */
    private startFrameTracking(): void {
        if (typeof requestAnimationFrame === 'undefined') return;
        
        this.lastFrameTime = performance.now();
        
        const trackFrame = (timestamp: number) => {
            if (!this.config.enabled || !this.config.trackFrameTiming) return;
            
            const deltaTime = timestamp - this.lastFrameTime;
            const fps = 1000 / deltaTime;
            
            const timing: FrameTiming = {
                frameNumber: ++this.frameNumber,
                timestamp,
                deltaTime,
                fps,
                scripting: 0, // Would need Performance Timeline API
                rendering: 0,
                painting: 0,
                idle: 0,
                total: deltaTime,
                dropped: deltaTime > this.config.frameDropThreshold
            };
            
            this.frameTimings.push(timing);
            
            // Trim old frames
            while (this.frameTimings.length > this.config.maxSamples) {
                this.frameTimings.shift();
            }
            
            // Record metrics
            this.recordValue('fps', fps);
            this.recordValue('frame_time', deltaTime);
            
            // Check for alerts
            this.checkThresholds('fps', fps);
            this.checkThresholds('frame_time', deltaTime);
            
            this.onFrameCompletedEmitter.fire({ timing });
            
            this.lastFrameTime = timestamp;
            this.frameRequestId = requestAnimationFrame(trackFrame);
        };
        
        this.frameRequestId = requestAnimationFrame(trackFrame);
    }

    /**
     * Stop frame tracking
     */
    private stopFrameTracking(): void {
        if (this.frameRequestId !== null) {
            cancelAnimationFrame(this.frameRequestId);
            this.frameRequestId = null;
        }
    }

    /**
     * Start memory tracking
     */
    private startMemoryTracking(): void {
        if (typeof performance === 'undefined' || !(performance as any).memory) return;
        
        this.memoryTimer = setInterval(() => {
            this.sampleMemory();
        }, this.config.memorySampleInterval);
    }

    /**
     * Stop memory tracking
     */
    private stopMemoryTracking(): void {
        if (this.memoryTimer !== null) {
            clearInterval(this.memoryTimer);
            this.memoryTimer = null;
        }
    }

    /**
     * Sample memory
     */
    private sampleMemory(): void {
        const memory = (performance as any).memory;
        if (!memory) return;
        
        const snapshot: MemorySnapshot = {
            timestamp: Date.now(),
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
        };
        
        this.memorySnapshots.push(snapshot);
        
        // Trim old snapshots
        while (this.memorySnapshots.length > this.config.maxSamples) {
            this.memorySnapshots.shift();
        }
        
        // Record metrics
        this.recordValue('heap_used', snapshot.usedJSHeapSize);
        this.recordValue('heap_total', snapshot.totalJSHeapSize);
        this.recordValue('heap_limit', snapshot.jsHeapSizeLimit);
        
        // Check for alerts (using ratio)
        const ratio = snapshot.usedJSHeapSize / snapshot.jsHeapSizeLimit;
        this.checkThresholds('heap_used', ratio);
    }

    // ==================== Metrics ====================

    /**
     * Register metric
     */
    registerMetric(definition: MetricDefinition): void {
        this.metrics.set(definition.name, definition);
        this.metricValues.set(definition.name, []);
        
        if (definition.type === MetricType.Histogram) {
            this.histograms.set(definition.name, []);
        }
    }

    /**
     * Record metric value
     */
    recordValue(name: string, value: number, labels?: Record<string, string>): void {
        const metric = this.metrics.get(name);
        if (!metric) return;
        
        const metricValue: MetricValue = {
            name,
            value,
            timestamp: Date.now(),
            labels
        };
        
        const values = this.metricValues.get(name)!;
        values.push(metricValue);
        
        // Trim old values
        while (values.length > this.config.maxSamples) {
            values.shift();
        }
        
        // Update histogram
        if (metric.type === MetricType.Histogram) {
            const histogram = this.histograms.get(name)!;
            histogram.push(value);
            while (histogram.length > this.config.maxSamples) {
                histogram.shift();
            }
        }
        
        this.onMetricRecordedEmitter.fire({ metric: metricValue });
    }

    /**
     * Increment counter
     */
    increment(name: string, amount: number = 1, labels?: Record<string, string>): void {
        const values = this.metricValues.get(name);
        const lastValue = values && values.length > 0 ? values[values.length - 1].value : 0;
        this.recordValue(name, lastValue + amount, labels);
    }

    /**
     * Set gauge value
     */
    setGauge(name: string, value: number, labels?: Record<string, string>): void {
        this.recordValue(name, value, labels);
    }

    /**
     * Record histogram value
     */
    recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
        this.recordValue(name, value, labels);
    }

    /**
     * Get metric values
     */
    getValues(name: string, since?: number): MetricValue[] {
        const values = this.metricValues.get(name) || [];
        if (since) {
            return values.filter(v => v.timestamp >= since);
        }
        return [...values];
    }

    /**
     * Get latest metric value
     */
    getLatestValue(name: string): number | undefined {
        const values = this.metricValues.get(name);
        return values && values.length > 0 ? values[values.length - 1].value : undefined;
    }

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
    } | undefined {
        const values = this.metricValues.get(name);
        if (!values || values.length === 0) return undefined;
        
        const numbers = values.map(v => v.value).sort((a, b) => a - b);
        const count = numbers.length;
        const sum = numbers.reduce((a, b) => a + b, 0);
        const avg = sum / count;
        
        // Variance
        const squaredDiffs = numbers.map(v => Math.pow(v - avg, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
        const stdDev = Math.sqrt(variance);
        
        // Percentiles
        const percentile = (p: number) => {
            const index = Math.ceil((p / 100) * count) - 1;
            return numbers[Math.max(0, index)];
        };
        
        return {
            min: numbers[0],
            max: numbers[count - 1],
            avg,
            median: percentile(50),
            p95: percentile(95),
            p99: percentile(99),
            stdDev,
            count
        };
    }

    // ==================== Profiling ====================

    /**
     * Begin profile
     */
    beginProfile(name: string, category: PerformanceCategory = PerformanceCategory.User): string {
        if (!this.config.profilingEnabled) return '';
        
        const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const entry: ProfileEntry = {
            id,
            name,
            category,
            startTime: performance.now(),
            children: []
        };
        
        // Nest under parent if exists
        if (this.profileStack.length > 0) {
            const parent = this.profileStack[this.profileStack.length - 1];
            parent.children = parent.children || [];
            parent.children.push(entry);
        }
        
        this.activeProfiles.set(id, entry);
        this.profileStack.push(entry);
        
        return id;
    }

    /**
     * End profile
     */
    endProfile(id: string): ProfileEntry | undefined {
        const entry = this.activeProfiles.get(id);
        if (!entry) return undefined;
        
        entry.endTime = performance.now();
        entry.duration = entry.endTime - entry.startTime;
        
        // Calculate self time
        const childTime = entry.children?.reduce((sum, child) => sum + (child.duration || 0), 0) || 0;
        entry.selfTime = entry.duration - childTime;
        
        // Remove from stack
        const stackIndex = this.profileStack.indexOf(entry);
        if (stackIndex !== -1) {
            this.profileStack.splice(stackIndex, 1);
        }
        
        this.activeProfiles.delete(id);
        
        // Store if root profile
        if (this.profileStack.length === 0 || !this.profileStack.some(p => p.children?.includes(entry))) {
            this.completedProfiles.push(entry);
            
            // Trim old profiles
            while (this.completedProfiles.length > 1000) {
                this.completedProfiles.shift();
            }
            
            this.onProfileCompletedEmitter.fire({ profile: entry });
        }
        
        // Record as metric
        this.recordHistogram(`profile_${entry.name}`, entry.duration);
        
        return entry;
    }

    /**
     * Profile function execution
     */
    async profile<T>(
        name: string,
        fn: () => T | Promise<T>,
        category: PerformanceCategory = PerformanceCategory.User
    ): Promise<T> {
        const id = this.beginProfile(name, category);
        try {
            const result = await fn();
            return result;
        } finally {
            this.endProfile(id);
        }
    }

    /**
     * Get completed profiles
     */
    getProfiles(since?: number): ProfileEntry[] {
        if (since) {
            return this.completedProfiles.filter(p => p.startTime >= since);
        }
        return [...this.completedProfiles];
    }

    /**
     * Clear profiles
     */
    clearProfiles(): void {
        this.completedProfiles.length = 0;
    }

    // ==================== Frame Timing ====================

    /**
     * Get frame timings
     */
    getFrameTimings(count?: number): FrameTiming[] {
        const timings = count 
            ? this.frameTimings.slice(-count)
            : [...this.frameTimings];
        return timings;
    }

    /**
     * Get average FPS
     */
    getAverageFPS(samples: number = 60): number {
        const timings = this.frameTimings.slice(-samples);
        if (timings.length === 0) return 0;
        
        const avgDelta = timings.reduce((sum, t) => sum + t.deltaTime, 0) / timings.length;
        return 1000 / avgDelta;
    }

    /**
     * Get dropped frames count
     */
    getDroppedFramesCount(samples: number = 60): number {
        const timings = this.frameTimings.slice(-samples);
        return timings.filter(t => t.dropped).length;
    }

    // ==================== Memory ====================

    /**
     * Get memory snapshots
     */
    getMemorySnapshots(count?: number): MemorySnapshot[] {
        const snapshots = count
            ? this.memorySnapshots.slice(-count)
            : [...this.memorySnapshots];
        return snapshots;
    }

    /**
     * Get current memory usage
     */
    getCurrentMemory(): MemorySnapshot | undefined {
        return this.memorySnapshots[this.memorySnapshots.length - 1];
    }

    /**
     * Force garbage collection (if available)
     */
    forceGC(): boolean {
        if (typeof (global as any).gc === 'function') {
            (global as any).gc();
            return true;
        }
        return false;
    }

    // ==================== Thresholds & Alerts ====================

    /**
     * Set threshold
     */
    setThreshold(threshold: ThresholdDefinition): void {
        this.thresholds.set(threshold.metric, threshold);
    }

    /**
     * Remove threshold
     */
    removeThreshold(metric: string): void {
        this.thresholds.delete(metric);
    }

    /**
     * Check thresholds
     */
    private checkThresholds(metric: string, value: number): void {
        if (!this.config.alertsEnabled) return;
        
        const threshold = this.thresholds.get(metric);
        if (!threshold) return;
        
        // Check cooldown
        const lastAlert = this.alertCooldowns.get(metric);
        if (lastAlert && Date.now() - lastAlert < this.config.alertCooldown) {
            return;
        }
        
        const compare = (actual: number, expected: number, op: string): boolean => {
            switch (op) {
                case 'gt': return actual > expected;
                case 'lt': return actual < expected;
                case 'gte': return actual >= expected;
                case 'lte': return actual <= expected;
                case 'eq': return actual === expected;
                default: return false;
            }
        };
        
        let severity: AlertSeverity | null = null;
        let breachedThreshold = 0;
        
        if (compare(value, threshold.criticalValue, threshold.comparison)) {
            severity = AlertSeverity.Critical;
            breachedThreshold = threshold.criticalValue;
        } else if (compare(value, threshold.warningValue, threshold.comparison)) {
            severity = AlertSeverity.Warning;
            breachedThreshold = threshold.warningValue;
        }
        
        if (severity) {
            const alert: PerformanceAlert = {
                id: `alert_${Date.now()}`,
                severity,
                metric,
                message: `${metric} ${threshold.comparison} ${breachedThreshold}: ${value.toFixed(2)}`,
                value,
                threshold: breachedThreshold,
                timestamp: Date.now(),
                resolved: false
            };
            
            this.alerts.push(alert);
            this.alertCooldowns.set(metric, Date.now());
            
            this.onAlertTriggeredEmitter.fire({ alert });
        }
    }

    /**
     * Get alerts
     */
    getAlerts(unresolved?: boolean): PerformanceAlert[] {
        if (unresolved) {
            return this.alerts.filter(a => !a.resolved);
        }
        return [...this.alerts];
    }

    /**
     * Resolve alert
     */
    resolveAlert(alertId: string): void {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
        }
    }

    /**
     * Clear alerts
     */
    clearAlerts(): void {
        this.alerts.length = 0;
    }

    // ==================== Export ====================

    /**
     * Export data
     */
    exportData(options?: {
        metrics?: string[];
        includeProfiles?: boolean;
        includeFrameTimings?: boolean;
        includeMemory?: boolean;
        since?: number;
    }): string {
        const data: Record<string, unknown> = {
            exportedAt: new Date().toISOString(),
            config: this.config
        };
        
        // Metrics
        const metricsToExport = options?.metrics || Array.from(this.metrics.keys());
        data.metrics = {};
        
        for (const name of metricsToExport) {
            const definition = this.metrics.get(name);
            const values = this.getValues(name, options?.since);
            const stats = this.getStatistics(name);
            
            (data.metrics as Record<string, unknown>)[name] = {
                definition,
                values,
                statistics: stats
            };
        }
        
        // Profiles
        if (options?.includeProfiles) {
            data.profiles = this.getProfiles(options.since);
        }
        
        // Frame timings
        if (options?.includeFrameTimings) {
            data.frameTimings = options.since
                ? this.frameTimings.filter(t => t.timestamp >= options.since!)
                : this.frameTimings;
        }
        
        // Memory
        if (options?.includeMemory) {
            data.memorySnapshots = options.since
                ? this.memorySnapshots.filter(s => s.timestamp >= options.since!)
                : this.memorySnapshots;
        }
        
        // Alerts
        data.alerts = this.alerts;
        
        switch (this.config.exportFormat) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.toCsv(data);
            case 'chrome-trace':
                return this.toChromeTrace(data);
            default:
                return JSON.stringify(data);
        }
    }

    /**
     * Convert to CSV
     */
    private toCsv(data: Record<string, unknown>): string {
        const lines: string[] = [];
        
        // Export metrics as CSV
        for (const [name, metricData] of Object.entries(data.metrics as Record<string, any>)) {
            lines.push(`# Metric: ${name}`);
            lines.push('timestamp,value');
            
            for (const value of metricData.values) {
                lines.push(`${value.timestamp},${value.value}`);
            }
            
            lines.push('');
        }
        
        return lines.join('\n');
    }

    /**
     * Convert to Chrome Trace format
     */
    private toChromeTrace(data: Record<string, unknown>): string {
        const events: unknown[] = [];
        
        // Convert profiles to trace events
        const profiles = data.profiles as ProfileEntry[] || [];
        
        const addProfile = (profile: ProfileEntry, pid: number = 1, tid: number = 1) => {
            events.push({
                name: profile.name,
                cat: profile.category,
                ph: 'X',
                ts: profile.startTime * 1000,
                dur: (profile.duration || 0) * 1000,
                pid,
                tid
            });
            
            for (const child of profile.children || []) {
                addProfile(child, pid, tid);
            }
        };
        
        for (const profile of profiles) {
            addProfile(profile);
        }
        
        return JSON.stringify({ traceEvents: events });
    }

    // ==================== Utilities ====================

    /**
     * Get summary
     */
    getSummary(): {
        fps: { current: number; average: number; min: number; max: number };
        memory: { used: number; total: number; limit: number; percentage: number };
        frameDrops: { count: number; percentage: number };
        alerts: { warning: number; critical: number };
    } {
        const fpsStats = this.getStatistics('fps');
        const currentFps = this.getLatestValue('fps') || 0;
        
        const currentMemory = this.getCurrentMemory();
        const memoryUsed = currentMemory?.usedJSHeapSize || 0;
        const memoryTotal = currentMemory?.totalJSHeapSize || 0;
        const memoryLimit = currentMemory?.jsHeapSizeLimit || 0;
        
        const recentFrames = this.frameTimings.slice(-300);
        const droppedCount = recentFrames.filter(t => t.dropped).length;
        
        const unresolvedAlerts = this.alerts.filter(a => !a.resolved);
        
        return {
            fps: {
                current: currentFps,
                average: fpsStats?.avg || 0,
                min: fpsStats?.min || 0,
                max: fpsStats?.max || 0
            },
            memory: {
                used: memoryUsed,
                total: memoryTotal,
                limit: memoryLimit,
                percentage: memoryLimit > 0 ? (memoryUsed / memoryLimit) * 100 : 0
            },
            frameDrops: {
                count: droppedCount,
                percentage: recentFrames.length > 0 ? (droppedCount / recentFrames.length) * 100 : 0
            },
            alerts: {
                warning: unresolvedAlerts.filter(a => a.severity === AlertSeverity.Warning).length,
                critical: unresolvedAlerts.filter(a => a.severity === AlertSeverity.Critical).length
            }
        };
    }

    /**
     * Update config
     */
    updateConfig(updates: Partial<PerformanceConfig>): void {
        const wasEnabled = this.config.enabled;
        this.config = { ...this.config, ...updates };
        
        // Handle enable/disable
        if (updates.enabled !== undefined) {
            if (updates.enabled && !wasEnabled) {
                this.start();
            } else if (!updates.enabled && wasEnabled) {
                this.stop();
            }
        }
    }

    /**
     * Clear all data
     */
    clearAll(): void {
        for (const values of this.metricValues.values()) {
            values.length = 0;
        }
        for (const histogram of this.histograms.values()) {
            histogram.length = 0;
        }
        this.frameTimings.length = 0;
        this.memorySnapshots.length = 0;
        this.completedProfiles.length = 0;
        this.alerts.length = 0;
        this.alertCooldowns.clear();
    }

    /**
     * Dispose
     */
    dispose(): void {
        this.stop();
        this.clearAll();
        
        this.onMetricRecordedEmitter.dispose();
        this.onFrameCompletedEmitter.dispose();
        this.onAlertTriggeredEmitter.dispose();
        this.onProfileCompletedEmitter.dispose();
    }
}

// ==================== Decorators ====================

/**
 * Profile decorator
 */
export function Profile(name?: string, category: PerformanceCategory = PerformanceCategory.User) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const profileName = name || `${target.constructor.name}.${propertyKey}`;
        
        descriptor.value = async function (...args: any[]) {
            // Would need access to PerformanceMonitorSystem instance
            const start = performance.now();
            try {
                return await originalMethod.apply(this, args);
            } finally {
                const duration = performance.now() - start;
                console.debug(`[Profile] ${profileName}: ${duration.toFixed(2)}ms`);
            }
        };
        
        return descriptor;
    };
}

// ==================== Export ====================

export default PerformanceMonitorSystem;
