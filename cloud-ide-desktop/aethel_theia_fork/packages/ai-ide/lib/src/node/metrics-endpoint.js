"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsEndpoint = void 0;
const inversify_1 = require("inversify");
const observability_service_1 = require("../common/observability-service");
const workspace_executor_service_1 = require("./workspace-executor-service");
/**
 * Unified Prometheus Metrics Endpoint
 * Aggregates metrics from all AI IDE components:
 * - Workspace Executor
 * - AI Agents
 * - LLM Providers
 * - Voice Input (placeholder)
 */
let MetricsEndpoint = class MetricsEndpoint {
    constructor(observability, executor) {
        this.observability = observability;
        this.executor = executor;
    }
    /**
     * Generate Prometheus-format metrics for all components
     */
    exportMetrics() {
        const timestamp = Date.now();
        let output = `# AI IDE Unified Metrics
# Generated at ${new Date(timestamp).toISOString()}
# Format: Prometheus text exposition format

`;
        output += this.exportExecutorMetrics();
        output += '\n';
        output += this.exportAgentMetrics();
        output += '\n';
        output += this.exportProviderMetrics();
        output += '\n';
        output += this.exportVoiceMetrics();
        output += '\n';
        output += this.exportSystemMetrics();
        return output;
    }
    exportExecutorMetrics() {
        const metrics = this.executor.getMetrics();
        return `# Workspace Executor Metrics
# HELP ai_executor_total Total number of command executions
# TYPE ai_executor_total counter
ai_executor_total ${metrics.total}

# HELP ai_executor_success Successful command executions
# TYPE ai_executor_success counter
ai_executor_success ${metrics.success}

# HELP ai_executor_failed Failed command executions
# TYPE ai_executor_failed counter
ai_executor_failed ${metrics.failed}

# HELP ai_executor_timed_out Timed out command executions
# TYPE ai_executor_timed_out counter
ai_executor_timed_out ${metrics.timedOut}

# HELP ai_executor_truncated Truncated command executions
# TYPE ai_executor_truncated counter
ai_executor_truncated ${metrics.truncated}

# HELP ai_executor_terminated Terminated command executions
# TYPE ai_executor_terminated counter
ai_executor_terminated ${metrics.terminated}

# HELP ai_executor_duration_p95 95th percentile execution duration (ms)
# TYPE ai_executor_duration_p95 gauge
ai_executor_duration_p95 ${metrics.p95}

# HELP ai_executor_duration_p99 99th percentile execution duration (ms)
# TYPE ai_executor_duration_p99 gauge
ai_executor_duration_p99 ${metrics.p99}`;
    }
    exportAgentMetrics() {
        const agents = this.observability.getAllAgentMetrics();
        if (agents.length === 0) {
            return '# No agent metrics available';
        }
        let output = `# AI Agent Metrics
# HELP ai_agent_requests_total Total requests per agent
# TYPE ai_agent_requests_total counter
`;
        for (const agent of agents) {
            const p95 = this.observability.getAgentP95(agent.agentId);
            const p99 = this.observability.getAgentP99(agent.agentId);
            const errorRate = agent.totalRequests > 0
                ? (agent.errorCount / agent.totalRequests) * 100
                : 0;
            output += `ai_agent_requests_total{agent="${agent.agentId}"} ${agent.totalRequests}\n`;
            output += `ai_agent_requests_success{agent="${agent.agentId}"} ${agent.successCount}\n`;
            output += `ai_agent_requests_error{agent="${agent.agentId}"} ${agent.errorCount}\n`;
            output += `ai_agent_error_rate{agent="${agent.agentId}"} ${errorRate.toFixed(2)}\n`;
            output += `ai_agent_duration_p95{agent="${agent.agentId}"} ${p95}\n`;
            output += `ai_agent_duration_p99{agent="${agent.agentId}"} ${p99}\n`;
        }
        return output.trim();
    }
    exportProviderMetrics() {
        const providers = this.observability.getAllProviderMetrics();
        if (providers.length === 0) {
            return '# No provider metrics available';
        }
        let output = `# LLM Provider Metrics
# HELP ai_provider_requests_total Total requests per provider
# TYPE ai_provider_requests_total counter
`;
        for (const provider of providers) {
            const p95 = this.observability.getProviderP95(provider.providerId);
            const p99 = this.observability.getProviderP99(provider.providerId);
            const errorRate = provider.totalRequests > 0
                ? (provider.errorCount / provider.totalRequests) * 100
                : 0;
            output += `ai_provider_requests_total{provider="${provider.providerId}"} ${provider.totalRequests}\n`;
            output += `ai_provider_requests_success{provider="${provider.providerId}"} ${provider.successCount}\n`;
            output += `ai_provider_requests_error{provider="${provider.providerId}"} ${provider.errorCount}\n`;
            output += `ai_provider_error_rate{provider="${provider.providerId}"} ${errorRate.toFixed(2)}\n`;
            output += `ai_provider_duration_p95{provider="${provider.providerId}"} ${p95}\n`;
            output += `ai_provider_duration_p99{provider="${provider.providerId}"} ${p99}\n`;
        }
        return output.trim();
    }
    exportVoiceMetrics() {
        // Placeholder for voice input metrics
        // In real implementation, would integrate with voice service
        return `# Voice Input Metrics (placeholder)
# HELP ai_voice_sessions_total Total voice input sessions
# TYPE ai_voice_sessions_total counter
ai_voice_sessions_total 0

# HELP ai_voice_recognition_errors Voice recognition errors
# TYPE ai_voice_recognition_errors counter
ai_voice_recognition_errors 0`;
    }
    exportSystemMetrics() {
        const uptime = process.uptime();
        const memory = process.memoryUsage();
        return `# System Metrics
# HELP ai_ide_uptime_seconds AI IDE uptime in seconds
# TYPE ai_ide_uptime_seconds counter
ai_ide_uptime_seconds ${uptime.toFixed(0)}

# HELP ai_ide_memory_heap_used Heap memory used (bytes)
# TYPE ai_ide_memory_heap_used gauge
ai_ide_memory_heap_used ${memory.heapUsed}

# HELP ai_ide_memory_heap_total Total heap memory (bytes)
# TYPE ai_ide_memory_heap_total gauge
ai_ide_memory_heap_total ${memory.heapTotal}

# HELP ai_ide_memory_rss Resident set size (bytes)
# TYPE ai_ide_memory_rss gauge
ai_ide_memory_rss ${memory.rss}`;
    }
    /**
     * Export metrics in JSON format for programmatic access
     */
    exportJSON() {
        const executorMetrics = this.executor.getMetrics();
        const agentMetrics = this.observability.getAllAgentMetrics();
        const providerMetrics = this.observability.getAllProviderMetrics();
        const data = {
            timestamp: new Date().toISOString(),
            executor: executorMetrics,
            agents: agentMetrics.map(a => ({
                id: a.agentId,
                total: a.totalRequests,
                success: a.successCount,
                errors: a.errorCount,
                errorRate: a.totalRequests > 0 ? (a.errorCount / a.totalRequests) * 100 : 0,
                p95: this.observability.getAgentP95(a.agentId),
                p99: this.observability.getAgentP99(a.agentId),
                topErrors: this.observability.getTopErrors(a.agentId, 5)
            })),
            providers: providerMetrics.map(p => ({
                id: p.providerId,
                total: p.totalRequests,
                success: p.successCount,
                errors: p.errorCount,
                errorRate: p.totalRequests > 0 ? (p.errorCount / p.totalRequests) * 100 : 0,
                p95: this.observability.getProviderP95(p.providerId),
                p99: this.observability.getProviderP99(p.providerId),
                topErrors: this.observability.getProviderTopErrors(p.providerId, 5)
            })),
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage()
            }
        };
        return JSON.stringify(data, null, 2);
    }
};
exports.MetricsEndpoint = MetricsEndpoint;
exports.MetricsEndpoint = MetricsEndpoint = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(observability_service_1.ObservabilityService)),
    __param(1, (0, inversify_1.inject)(workspace_executor_service_1.WorkspaceExecutorService)),
    __metadata("design:paramtypes", [observability_service_1.ObservabilityService,
        workspace_executor_service_1.WorkspaceExecutorService])
], MetricsEndpoint);
