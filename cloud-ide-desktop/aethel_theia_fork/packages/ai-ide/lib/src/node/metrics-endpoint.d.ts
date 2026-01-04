import { ObservabilityService } from '../common/observability-service';
import { WorkspaceExecutorService } from './workspace-executor-service';
/**
 * Unified Prometheus Metrics Endpoint
 * Aggregates metrics from all AI IDE components:
 * - Workspace Executor
 * - AI Agents
 * - LLM Providers
 * - Voice Input (placeholder)
 */
export declare class MetricsEndpoint {
    private observability;
    private executor;
    constructor(observability: ObservabilityService, executor: WorkspaceExecutorService);
    /**
     * Generate Prometheus-format metrics for all components
     */
    exportMetrics(): string;
    private exportExecutorMetrics;
    private exportAgentMetrics;
    private exportProviderMetrics;
    private exportVoiceMetrics;
    private exportSystemMetrics;
    /**
     * Export metrics in JSON format for programmatic access
     */
    exportJSON(): string;
}
