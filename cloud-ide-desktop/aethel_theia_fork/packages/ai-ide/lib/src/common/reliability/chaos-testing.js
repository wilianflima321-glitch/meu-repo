"use strict";
/**
 * Chaos Testing & Reliability
 * Network failures, timeouts, automatic reconnection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SLAMonitor = exports.ReliabilityManager = void 0;
class ReliabilityManager {
    constructor() {
        this.scenarios = new Map();
        this.reconnectionAttempts = new Map();
        this.DEFAULT_STRATEGY = {
            maxRetries: 5,
            initialDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            jitter: true
        };
    }
    /**
     * Execute with automatic retry and reconnection
     */
    async executeWithRetry(operation, operationId, strategy = {}) {
        const config = { ...this.DEFAULT_STRATEGY, ...strategy };
        let attempt = 0;
        let delay = config.initialDelay;
        while (attempt < config.maxRetries) {
            try {
                // Apply chaos if enabled
                await this.applyChaos(operationId);
                const result = await operation();
                // Reset attempts on success
                this.reconnectionAttempts.delete(operationId);
                return result;
            }
            catch (error) {
                attempt++;
                this.reconnectionAttempts.set(operationId, attempt);
                if (attempt >= config.maxRetries) {
                    throw new Error(`Operation failed after ${attempt} attempts: ${error}`);
                }
                // Calculate delay with exponential backoff
                const jitter = config.jitter ? Math.random() * 0.3 * delay : 0;
                const waitTime = Math.min(delay + jitter, config.maxDelay);
                console.warn(`Retry ${attempt}/${config.maxRetries} after ${waitTime}ms`, error);
                await this.sleep(waitTime);
                delay *= config.backoffMultiplier;
            }
        }
        throw new Error('Unexpected retry loop exit');
    }
    /**
     * Apply chaos scenario if enabled
     */
    async applyChaos(operationId) {
        for (const scenario of this.scenarios.values()) {
            if (!scenario.enabled)
                continue;
            if (Math.random() > scenario.probability)
                continue;
            switch (scenario.type) {
                case 'network':
                    throw new Error('Simulated network failure');
                case 'timeout':
                    await this.sleep(scenario.duration || 60000);
                    throw new Error('Simulated timeout');
                case 'latency':
                    await this.sleep(scenario.duration || 5000);
                    break;
                case 'error':
                    throw new Error('Simulated error');
            }
        }
    }
    /**
     * Register chaos scenario
     */
    registerScenario(scenario) {
        this.scenarios.set(scenario.id, scenario);
    }
    /**
     * Enable/disable chaos testing
     */
    setScenarioEnabled(scenarioId, enabled) {
        const scenario = this.scenarios.get(scenarioId);
        if (scenario) {
            scenario.enabled = enabled;
        }
    }
    /**
     * Get reconnection attempts for operation
     */
    getReconnectionAttempts(operationId) {
        return this.reconnectionAttempts.get(operationId) || 0;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ReliabilityManager = ReliabilityManager;
class SLAMonitor {
    constructor() {
        this.targets = new Map();
        this.measurements = new Map();
        this.alerts = [];
    }
    /**
     * Register SLA target
     */
    registerTarget(target) {
        const key = `${target.service}:${target.metric}`;
        this.targets.set(key, target);
        this.measurements.set(key, []);
    }
    /**
     * Record measurement
     */
    recordMeasurement(service, metric, value) {
        const key = `${service}:${metric}`;
        const measurements = this.measurements.get(key) || [];
        measurements.push(value);
        // Keep last 1000 measurements
        if (measurements.length > 1000) {
            measurements.shift();
        }
        this.measurements.set(key, measurements);
        // Check SLA
        this.checkSLA(key, value);
    }
    /**
     * Check if measurement violates SLA
     */
    checkSLA(key, value) {
        const target = this.targets.get(key);
        if (!target)
            return;
        if (value > target.alertThreshold) {
            this.alerts.push({
                service: target.service,
                metric: target.metric,
                value,
                threshold: target.alertThreshold,
                timestamp: Date.now()
            });
            console.error(`SLA violation: ${target.service} ${target.metric} = ${value} > ${target.alertThreshold}`);
        }
    }
    /**
     * Get SLA compliance
     */
    getCompliance(service, metric) {
        const key = `${service}:${metric}`;
        const target = this.targets.get(key);
        const measurements = this.measurements.get(key);
        if (!target || !measurements || measurements.length === 0) {
            return 1.0;
        }
        const compliant = measurements.filter(m => m <= target.target).length;
        return compliant / measurements.length;
    }
    /**
     * Get recent alerts
     */
    getAlerts(limit = 10) {
        return this.alerts.slice(-limit);
    }
}
exports.SLAMonitor = SLAMonitor;
