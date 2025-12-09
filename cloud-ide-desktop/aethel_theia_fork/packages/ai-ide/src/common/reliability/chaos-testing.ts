/**
 * Chaos Testing & Reliability
 * Network failures, timeouts, automatic reconnection
 */

export interface ChaosScenario {
    id: string;
    name: string;
    type: 'network' | 'timeout' | 'latency' | 'error';
    probability: number; // 0-1
    duration?: number; // ms
    enabled: boolean;
}

export interface ReconnectionStrategy {
    maxRetries: number;
    initialDelay: number; // ms
    maxDelay: number; // ms
    backoffMultiplier: number;
    jitter: boolean;
}

export class ReliabilityManager {
    private scenarios: Map<string, ChaosScenario> = new Map();
    private reconnectionAttempts: Map<string, number> = new Map();
    
    private readonly DEFAULT_STRATEGY: ReconnectionStrategy = {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        jitter: true
    };

    /**
     * Execute with automatic retry and reconnection
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationId: string,
        strategy: Partial<ReconnectionStrategy> = {}
    ): Promise<T> {
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
            } catch (error) {
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
    private async applyChaos(operationId: string): Promise<void> {
        for (const scenario of this.scenarios.values()) {
            if (!scenario.enabled) continue;
            if (Math.random() > scenario.probability) continue;

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
    registerScenario(scenario: ChaosScenario): void {
        this.scenarios.set(scenario.id, scenario);
    }

    /**
     * Enable/disable chaos testing
     */
    setScenarioEnabled(scenarioId: string, enabled: boolean): void {
        const scenario = this.scenarios.get(scenarioId);
        if (scenario) {
            scenario.enabled = enabled;
        }
    }

    /**
     * Get reconnection attempts for operation
     */
    getReconnectionAttempts(operationId: string): number {
        return this.reconnectionAttempts.get(operationId) || 0;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
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

export class SLAMonitor {
    private targets: Map<string, SLATarget> = new Map();
    private measurements: Map<string, number[]> = new Map();
    private alerts: Array<{ service: string; metric: string; value: number; threshold: number; timestamp: number }> = [];

    /**
     * Register SLA target
     */
    registerTarget(target: SLATarget): void {
        const key = `${target.service}:${target.metric}`;
        this.targets.set(key, target);
        this.measurements.set(key, []);
    }

    /**
     * Record measurement
     */
    recordMeasurement(service: string, metric: string, value: number): void {
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
    private checkSLA(key: string, value: number): void {
        const target = this.targets.get(key);
        if (!target) return;

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
    getCompliance(service: string, metric: string): number {
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
    getAlerts(limit: number = 10): typeof this.alerts {
        return this.alerts.slice(-limit);
    }
}
