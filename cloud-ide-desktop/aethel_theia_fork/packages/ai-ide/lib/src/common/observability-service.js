"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityService = void 0;
const inversify_1 = require("inversify");
let ObservabilityService = class ObservabilityService {
    constructor() {
        this.agentMetrics = new Map();
        this.providerMetrics = new Map();
        this.MAX_DURATIONS = 1000;
    }
    // Agent metrics
    recordAgentRequest(agentId, duration, success, error) {
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
        }
        else {
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
    getAgentMetrics(agentId) {
        return this.agentMetrics.get(agentId);
    }
    getAllAgentMetrics() {
        return Array.from(this.agentMetrics.values());
    }
    // Provider metrics
    recordProviderRequest(providerId, duration, success, error) {
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
        }
        else {
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
    getProviderMetrics(providerId) {
        return this.providerMetrics.get(providerId);
    }
    getAllProviderMetrics() {
        return Array.from(this.providerMetrics.values());
    }
    // Percentile calculations
    calculatePercentile(durations, percentile) {
        if (durations.length === 0)
            return 0;
        const sorted = [...durations].sort((a, b) => a - b);
        const index = Math.floor(sorted.length * percentile);
        return sorted[index] || 0;
    }
    getAgentP95(agentId) {
        const metrics = this.agentMetrics.get(agentId);
        return metrics ? this.calculatePercentile(metrics.durations, 0.95) : 0;
    }
    getAgentP99(agentId) {
        const metrics = this.agentMetrics.get(agentId);
        return metrics ? this.calculatePercentile(metrics.durations, 0.99) : 0;
    }
    getProviderP95(providerId) {
        const metrics = this.providerMetrics.get(providerId);
        return metrics ? this.calculatePercentile(metrics.durations, 0.95) : 0;
    }
    getProviderP99(providerId) {
        const metrics = this.providerMetrics.get(providerId);
        return metrics ? this.calculatePercentile(metrics.durations, 0.99) : 0;
    }
    // Error analysis
    getTopErrors(agentId, limit = 5) {
        const metrics = this.agentMetrics.get(agentId);
        if (!metrics)
            return [];
        return Array.from(metrics.errors.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    getProviderTopErrors(providerId, limit = 5) {
        const metrics = this.providerMetrics.get(providerId);
        if (!metrics)
            return [];
        return Array.from(metrics.errors.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    }
    // Export metrics
    exportPrometheus() {
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
    reset() {
        this.agentMetrics.clear();
        this.providerMetrics.clear();
    }
    resetAgent(agentId) {
        this.agentMetrics.delete(agentId);
    }
    resetProvider(providerId) {
        this.providerMetrics.delete(providerId);
    }
};
exports.ObservabilityService = ObservabilityService;
exports.ObservabilityService = ObservabilityService = __decorate([
    (0, inversify_1.injectable)()
], ObservabilityService);
