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
export declare class ObservabilityService {
    private agentMetrics;
    private providerMetrics;
    private readonly MAX_DURATIONS;
    recordAgentRequest(agentId: string, duration: number, success: boolean, error?: string): void;
    getAgentMetrics(agentId: string): AgentMetrics | undefined;
    getAllAgentMetrics(): AgentMetrics[];
    recordProviderRequest(providerId: string, duration: number, success: boolean, error?: string): void;
    getProviderMetrics(providerId: string): ProviderMetrics | undefined;
    getAllProviderMetrics(): ProviderMetrics[];
    calculatePercentile(durations: number[], percentile: number): number;
    getAgentP95(agentId: string): number;
    getAgentP99(agentId: string): number;
    getProviderP95(providerId: string): number;
    getProviderP99(providerId: string): number;
    getTopErrors(agentId: string, limit?: number): Array<{
        error: string;
        count: number;
    }>;
    getProviderTopErrors(providerId: string, limit?: number): Array<{
        error: string;
        count: number;
    }>;
    exportPrometheus(): string;
    reset(): void;
    resetAgent(agentId: string): void;
    resetProvider(providerId: string): void;
}
