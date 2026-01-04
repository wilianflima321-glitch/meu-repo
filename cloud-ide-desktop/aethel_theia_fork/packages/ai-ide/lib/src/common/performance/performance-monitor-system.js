"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceMonitorSystem = exports.AlertSeverity = exports.PerformanceCategory = exports.MetricType = void 0;
exports.Profile = Profile;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                }
            };
        };
    }
    fire(event) {
        this.listeners.forEach(l => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Performance Types ====================
/**
 * Metric type
 */
var MetricType;
(function (MetricType) {
    MetricType["Counter"] = "counter";
    MetricType["Gauge"] = "gauge";
    MetricType["Histogram"] = "histogram";
    MetricType["Summary"] = "summary";
    MetricType["Timer"] = "timer";
})(MetricType || (exports.MetricType = MetricType = {}));
/**
 * Performance category
 */
var PerformanceCategory;
(function (PerformanceCategory) {
    PerformanceCategory["Rendering"] = "rendering";
    PerformanceCategory["Scripting"] = "scripting";
    PerformanceCategory["Layout"] = "layout";
    PerformanceCategory["Painting"] = "painting";
    PerformanceCategory["Memory"] = "memory";
    PerformanceCategory["Network"] = "network";
    PerformanceCategory["IO"] = "io";
    PerformanceCategory["GC"] = "gc";
    PerformanceCategory["User"] = "user";
    PerformanceCategory["System"] = "system";
})(PerformanceCategory || (exports.PerformanceCategory = PerformanceCategory = {}));
/**
 * Alert severity
 */
var AlertSeverity;
(function (AlertSeverity) {
    AlertSeverity["Info"] = "info";
    AlertSeverity["Warning"] = "warning";
    AlertSeverity["Critical"] = "critical";
})(AlertSeverity || (exports.AlertSeverity = AlertSeverity = {}));
// ==================== Main Performance Monitor ====================
let PerformanceMonitorSystem = class PerformanceMonitorSystem {
    constructor() {
        // Configuration
        this.config = {
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
        this.metrics = new Map();
        this.metricValues = new Map();
        this.histograms = new Map();
        // Frame timing
        this.frameTimings = [];
        this.frameNumber = 0;
        this.lastFrameTime = 0;
        this.frameRequestId = null;
        // Memory
        this.memorySnapshots = [];
        this.memoryTimer = null;
        // Profiling
        this.activeProfiles = new Map();
        this.completedProfiles = [];
        this.profileStack = [];
        // Alerts
        this.thresholds = new Map();
        this.alerts = [];
        this.alertCooldowns = new Map();
        // Events
        this.onMetricRecordedEmitter = new Emitter();
        this.onMetricRecorded = this.onMetricRecordedEmitter.event;
        this.onFrameCompletedEmitter = new Emitter();
        this.onFrameCompleted = this.onFrameCompletedEmitter.event;
        this.onAlertTriggeredEmitter = new Emitter();
        this.onAlertTriggered = this.onAlertTriggeredEmitter.event;
        this.onProfileCompletedEmitter = new Emitter();
        this.onProfileCompleted = this.onProfileCompletedEmitter.event;
        this.initialize();
    }
    // ==================== Initialization ====================
    /**
     * Initialize performance monitor
     */
    initialize() {
        this.registerDefaultMetrics();
        this.registerDefaultThresholds();
        if (this.config.enabled) {
            this.start();
        }
    }
    /**
     * Register default metrics
     */
    registerDefaultMetrics() {
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
    registerDefaultThresholds() {
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
    start() {
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
    stop() {
        this.config.enabled = false;
        this.stopFrameTracking();
        this.stopMemoryTracking();
    }
    /**
     * Start frame tracking
     */
    startFrameTracking() {
        if (typeof requestAnimationFrame === 'undefined')
            return;
        this.lastFrameTime = performance.now();
        const trackFrame = (timestamp) => {
            if (!this.config.enabled || !this.config.trackFrameTiming)
                return;
            const deltaTime = timestamp - this.lastFrameTime;
            const fps = 1000 / deltaTime;
            const timing = {
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
    stopFrameTracking() {
        if (this.frameRequestId !== null) {
            cancelAnimationFrame(this.frameRequestId);
            this.frameRequestId = null;
        }
    }
    /**
     * Start memory tracking
     */
    startMemoryTracking() {
        if (typeof performance === 'undefined' || !performance.memory)
            return;
        this.memoryTimer = setInterval(() => {
            this.sampleMemory();
        }, this.config.memorySampleInterval);
    }
    /**
     * Stop memory tracking
     */
    stopMemoryTracking() {
        if (this.memoryTimer !== null) {
            clearInterval(this.memoryTimer);
            this.memoryTimer = null;
        }
    }
    /**
     * Sample memory
     */
    sampleMemory() {
        const memory = performance.memory;
        if (!memory)
            return;
        const snapshot = {
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
    registerMetric(definition) {
        this.metrics.set(definition.name, definition);
        this.metricValues.set(definition.name, []);
        if (definition.type === MetricType.Histogram) {
            this.histograms.set(definition.name, []);
        }
    }
    /**
     * Record metric value
     */
    recordValue(name, value, labels) {
        const metric = this.metrics.get(name);
        if (!metric)
            return;
        const metricValue = {
            name,
            value,
            timestamp: Date.now(),
            labels
        };
        const values = this.metricValues.get(name);
        values.push(metricValue);
        // Trim old values
        while (values.length > this.config.maxSamples) {
            values.shift();
        }
        // Update histogram
        if (metric.type === MetricType.Histogram) {
            const histogram = this.histograms.get(name);
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
    increment(name, amount = 1, labels) {
        const values = this.metricValues.get(name);
        const lastValue = values && values.length > 0 ? values[values.length - 1].value : 0;
        this.recordValue(name, lastValue + amount, labels);
    }
    /**
     * Set gauge value
     */
    setGauge(name, value, labels) {
        this.recordValue(name, value, labels);
    }
    /**
     * Record histogram value
     */
    recordHistogram(name, value, labels) {
        this.recordValue(name, value, labels);
    }
    /**
     * Get metric values
     */
    getValues(name, since) {
        const values = this.metricValues.get(name) || [];
        if (since) {
            return values.filter(v => v.timestamp >= since);
        }
        return [...values];
    }
    /**
     * Get latest metric value
     */
    getLatestValue(name) {
        const values = this.metricValues.get(name);
        return values && values.length > 0 ? values[values.length - 1].value : undefined;
    }
    /**
     * Get metric statistics
     */
    getStatistics(name) {
        const values = this.metricValues.get(name);
        if (!values || values.length === 0)
            return undefined;
        const numbers = values.map(v => v.value).sort((a, b) => a - b);
        const count = numbers.length;
        const sum = numbers.reduce((a, b) => a + b, 0);
        const avg = sum / count;
        // Variance
        const squaredDiffs = numbers.map(v => Math.pow(v - avg, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
        const stdDev = Math.sqrt(variance);
        // Percentiles
        const percentile = (p) => {
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
    beginProfile(name, category = PerformanceCategory.User) {
        if (!this.config.profilingEnabled)
            return '';
        const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const entry = {
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
    endProfile(id) {
        const entry = this.activeProfiles.get(id);
        if (!entry)
            return undefined;
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
    async profile(name, fn, category = PerformanceCategory.User) {
        const id = this.beginProfile(name, category);
        try {
            const result = await fn();
            return result;
        }
        finally {
            this.endProfile(id);
        }
    }
    /**
     * Get completed profiles
     */
    getProfiles(since) {
        if (since) {
            return this.completedProfiles.filter(p => p.startTime >= since);
        }
        return [...this.completedProfiles];
    }
    /**
     * Clear profiles
     */
    clearProfiles() {
        this.completedProfiles.length = 0;
    }
    // ==================== Frame Timing ====================
    /**
     * Get frame timings
     */
    getFrameTimings(count) {
        const timings = count
            ? this.frameTimings.slice(-count)
            : [...this.frameTimings];
        return timings;
    }
    /**
     * Get average FPS
     */
    getAverageFPS(samples = 60) {
        const timings = this.frameTimings.slice(-samples);
        if (timings.length === 0)
            return 0;
        const avgDelta = timings.reduce((sum, t) => sum + t.deltaTime, 0) / timings.length;
        return 1000 / avgDelta;
    }
    /**
     * Get dropped frames count
     */
    getDroppedFramesCount(samples = 60) {
        const timings = this.frameTimings.slice(-samples);
        return timings.filter(t => t.dropped).length;
    }
    // ==================== Memory ====================
    /**
     * Get memory snapshots
     */
    getMemorySnapshots(count) {
        const snapshots = count
            ? this.memorySnapshots.slice(-count)
            : [...this.memorySnapshots];
        return snapshots;
    }
    /**
     * Get current memory usage
     */
    getCurrentMemory() {
        return this.memorySnapshots[this.memorySnapshots.length - 1];
    }
    /**
     * Force garbage collection (if available)
     */
    forceGC() {
        if (typeof global.gc === 'function') {
            global.gc();
            return true;
        }
        return false;
    }
    // ==================== Thresholds & Alerts ====================
    /**
     * Set threshold
     */
    setThreshold(threshold) {
        this.thresholds.set(threshold.metric, threshold);
    }
    /**
     * Remove threshold
     */
    removeThreshold(metric) {
        this.thresholds.delete(metric);
    }
    /**
     * Check thresholds
     */
    checkThresholds(metric, value) {
        if (!this.config.alertsEnabled)
            return;
        const threshold = this.thresholds.get(metric);
        if (!threshold)
            return;
        // Check cooldown
        const lastAlert = this.alertCooldowns.get(metric);
        if (lastAlert && Date.now() - lastAlert < this.config.alertCooldown) {
            return;
        }
        const compare = (actual, expected, op) => {
            switch (op) {
                case 'gt': return actual > expected;
                case 'lt': return actual < expected;
                case 'gte': return actual >= expected;
                case 'lte': return actual <= expected;
                case 'eq': return actual === expected;
                default: return false;
            }
        };
        let severity = null;
        let breachedThreshold = 0;
        if (compare(value, threshold.criticalValue, threshold.comparison)) {
            severity = AlertSeverity.Critical;
            breachedThreshold = threshold.criticalValue;
        }
        else if (compare(value, threshold.warningValue, threshold.comparison)) {
            severity = AlertSeverity.Warning;
            breachedThreshold = threshold.warningValue;
        }
        if (severity) {
            const alert = {
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
    getAlerts(unresolved) {
        if (unresolved) {
            return this.alerts.filter(a => !a.resolved);
        }
        return [...this.alerts];
    }
    /**
     * Resolve alert
     */
    resolveAlert(alertId) {
        const alert = this.alerts.find(a => a.id === alertId);
        if (alert) {
            alert.resolved = true;
        }
    }
    /**
     * Clear alerts
     */
    clearAlerts() {
        this.alerts.length = 0;
    }
    // ==================== Export ====================
    /**
     * Export data
     */
    exportData(options) {
        const data = {
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
            data.metrics[name] = {
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
                ? this.frameTimings.filter(t => t.timestamp >= options.since)
                : this.frameTimings;
        }
        // Memory
        if (options?.includeMemory) {
            data.memorySnapshots = options.since
                ? this.memorySnapshots.filter(s => s.timestamp >= options.since)
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
    toCsv(data) {
        const lines = [];
        // Export metrics as CSV
        for (const [name, metricData] of Object.entries(data.metrics)) {
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
    toChromeTrace(data) {
        const events = [];
        // Convert profiles to trace events
        const profiles = data.profiles || [];
        const addProfile = (profile, pid = 1, tid = 1) => {
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
    getSummary() {
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
    updateConfig(updates) {
        const wasEnabled = this.config.enabled;
        this.config = { ...this.config, ...updates };
        // Handle enable/disable
        if (updates.enabled !== undefined) {
            if (updates.enabled && !wasEnabled) {
                this.start();
            }
            else if (!updates.enabled && wasEnabled) {
                this.stop();
            }
        }
    }
    /**
     * Clear all data
     */
    clearAll() {
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
    dispose() {
        this.stop();
        this.clearAll();
        this.onMetricRecordedEmitter.dispose();
        this.onFrameCompletedEmitter.dispose();
        this.onAlertTriggeredEmitter.dispose();
        this.onProfileCompletedEmitter.dispose();
    }
};
exports.PerformanceMonitorSystem = PerformanceMonitorSystem;
exports.PerformanceMonitorSystem = PerformanceMonitorSystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], PerformanceMonitorSystem);
// ==================== Decorators ====================
/**
 * Profile decorator
 */
function Profile(name, category = PerformanceCategory.User) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const profileName = name || `${target.constructor.name}.${propertyKey}`;
        descriptor.value = async function (...args) {
            // Would need access to PerformanceMonitorSystem instance
            const start = performance.now();
            try {
                return await originalMethod.apply(this, args);
            }
            finally {
                const duration = performance.now() - start;
                console.debug(`[Profile] ${profileName}: ${duration.toFixed(2)}ms`);
            }
        };
        return descriptor;
    };
}
// ==================== Export ====================
exports.default = PerformanceMonitorSystem;
