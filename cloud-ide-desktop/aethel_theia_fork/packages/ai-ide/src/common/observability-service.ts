import { injectable } from 'inversify';

export interface MetricRecord {
    timestamp: number;
    duration: number;
    success: boolean;
    error?: string;
}

export interface AgentMetrics {
    agentId: string;
    totalRequests: number;
    successCount: number;
    errorCount: number;
    durations: number[];
    errors: Map<string, number>;
    lastError?: string;
    lastErrorTime?: number;
}

export interface ProviderMetrics {
    providerId: string;
    totalRequests: number;
    successCount: number;
    errorCount: number;
    durations: number[];
    errors: Map<string, number>;
    lastError?: string;
    lastErrorTime?: number;
}

@injectable()
export class ObservabilityService {
    private agentMetrics = new Map<string, AgentMetrics>();
    private providerMetrics = new Map<string, ProviderMetrics>();
    private readonly MAX_DURATIONS = 1000;

    // Agent metrics
    recordAgentRequest(agentId: string, duration: number, success: boolean, error?: string): void {
        let metrics = this.agentMetrics.get(agentId);
        
        if (!metrics) {
            metrics = {
                agentId,
                totalRequests: 0,
                successCount: 0,
                errorCount: 0,
                durations: [],
                errors: new Map()
            };
            this.agentMetrics.set(agentId, metrics);
        }

        metrics.totalRequests++;
        metrics.durations.push(duration);
        
        if (success) {
            metrics.successCount++;
        } else {
            metrics.errorCount++;
            if (error) {
                metrics.errors.set(error, (metrics.errors.get(error) || 0) + 1);
                metrics.lastError = error;
                metrics.lastErrorTime = Date.now();
            }
        }

        // Keep only recent durations
        if (metrics.durations.length > this.MAX_DURATIONS) {
            metrics.durations = metrics.durations.slice(-this.MAX_DURATIONS);
        }
    }

    getAgentMetrics(agentId: string): AgentMetrics | undefined {
        return this.agentMetrics.get(agentId);
    }

    getAllAgentMetrics(): AgentMetrics[] {
        return Array.from(this.agentMetrics.values());
    }

    // Provider metrics
    recordProviderRequest(providerId: string, duration: number, success: boolean, error?: string): void {
        let metrics = this.providerMetrics.get(providerId);
        
        if (!metrics) {
            metrics = {
                providerId,
                totalRequests: 0,
                successCount: 0,
                errorCount: 0,
                durations: [],
                errors: new Map()
            };
            this.providerMetrics.set(providerId, metrics);
        }

        metrics.totalRequests++;
        metrics.durations.push(duration);
        
        if (success) {
            metrics.successCount++;
        } else {
            metrics.errorCount++;
            if (error) {
                metrics.errors.set(error, (metrics.errors.get(error) || 0) + 1);
                metrics.lastError = error;
                metrics.lastErrorTime = Date.now();
            }
        }

        // Keep only recent durations
        if (metrics.durations.length > this.MAX_DURATIONS) {
            metrics.durations = metrics.durations.slice(-this.MAX_DURATIONS);
        }
    }

    getProviderMetrics(providerId: string): ProviderMetrics | undefined {
        return this.providerMetrics.get(providerId);
    }

    getAllProviderMetrics(): ProviderMetrics[] {
        return Array.from(this.providerMetrics.values());
    }

    // Percentile calculations
    calculatePercentile(durations: number[], percentile: number): number {
        if (durations.length === 0) return 0;
        
        const sorted = [...durations].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * percentile);
        return sorted[index] || 0;
    }

    getAgentP95(agentId: string): number {
        const metrics = this.agentMetrics.get(agentId);
        return metrics ? this.calculatePercentile(metrics.durations, 0.95) : 0;
    }

    getAgentP99(agentId: string): number {
        const metrics = this.agentMetrics.get(agentId);
        return metrics ? this.calculatePercentile(metrics.durations, 0.99) : 0;
    }

    getProviderP95(providerId: string): number {
        const metrics = this.providerMetrics.get(providerId);
        return metrics ? this.calculatePercentile(metrics.durations, 0.95) : 0;
    }

    getProviderP99(providerId: string): number {
        const metrics = this.providerMetrics.get(providerId);
        return metrics ? this.calculatePercentile(metrics.durations, 0.99) : 0;
    }

    // Error analysis
    getTopErrors(agentId: string, limit: number = 5): Array<{ error: string; count: number }> {
        const metrics = this.agentMetrics.get(agentId);
        if (!metrics) return [];

        return Array.from(metrics.errors.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    getProviderTopErrors(providerId: string, limit: number = 5): Array<{ error: string; count: number }> {
        const metrics = this.providerMetrics.get(providerId);
        if (!metrics) return [];

        return Array.from(metrics.errors.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }

    // Export metrics
    exportPrometheus(): string {
        let output = '# AI IDE Metrics\n\n';

        // Agent metrics
        output += '# Agent Metrics\n';
        for (const metrics of this.agentMetrics.values()) {
            const p95 = this.getAgentP95(metrics.agentId);
            const p99 = this.getAgentP99(metrics.agentId);
            const errorRate = metrics.totalRequests > 0 
                ? (metrics.errorCount / metrics.totalRequests) * 100 
                : 0;

            output += `ai_agent_requests_total{agent="${metrics.agentId}"} ${metrics.totalRequests}\n`;
            output += `ai_agent_requests_success{agent="${metrics.agentId}"} ${metrics.successCount}\n`;
            output += `ai_agent_requests_error{agent="${metrics.agentId}"} ${metrics.errorCount}\n`;
            output += `ai_agent_error_rate{agent="${metrics.agentId}"} ${errorRate.toFixed(2)}\n`;
            output += `ai_agent_duration_p95{agent="${metrics.agentId}"} ${p95}\n`;
            output += `ai_agent_duration_p99{agent="${metrics.agentId}"} ${p99}\n`;
        }

        output += '\n# Provider Metrics\n';
        for (const metrics of this.providerMetrics.values()) {
            const p95 = this.getProviderP95(metrics.providerId);
            const p99 = this.getProviderP99(metrics.providerId);
            const errorRate = metrics.totalRequests > 0 
                ? (metrics.errorCount / metrics.totalRequests) * 100 
                : 0;

            output += `ai_provider_requests_total{provider="${metrics.providerId}"} ${metrics.totalRequests}\n`;
            output += `ai_provider_requests_success{provider="${metrics.providerId}"} ${metrics.successCount}\n`;
            output += `ai_provider_requests_error{provider="${metrics.providerId}"} ${metrics.errorCount}\n`;
            output += `ai_provider_error_rate{provider="${metrics.providerId}"} ${errorRate.toFixed(2)}\n`;
            output += `ai_provider_duration_p95{provider="${metrics.providerId}"} ${p95}\n`;
            output += `ai_provider_duration_p99{provider="${metrics.providerId}"} ${p99}\n`;
        }

        return output;
    }

    // Reset metrics
    reset(): void {
        this.agentMetrics.clear();
        this.providerMetrics.clear();
    }

    resetAgent(agentId: string): void {
        this.agentMetrics.delete(agentId);
    }

    resetProvider(providerId: string): void {
        this.providerMetrics.delete(providerId);
    }
}
