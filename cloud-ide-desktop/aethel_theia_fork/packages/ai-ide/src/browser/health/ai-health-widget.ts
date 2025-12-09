import { injectable, inject } from 'inversify';
import { ObservabilityService } from '../../common/observability-service';
import { WorkspaceExecutorService } from '../../node/workspace-executor-service';
import { nls } from '../../common/nls';

export interface HealthStatus {
    component: string;
    status: 'healthy' | 'degraded' | 'error';
    message?: string;
    metrics?: Record<string, number>;
}

@injectable()
export class AIHealthWidget {
    private container: HTMLElement | null = null;
    private refreshInterval: number | null = null;

    constructor(
        @inject(ObservabilityService) private observability: ObservabilityService
    ) {}

    render(container: HTMLElement): void {
        this.container = container;
        this.updateContent();
        
        // Auto-refresh every 5 seconds
        this.refreshInterval = window.setInterval(() => {
            this.updateContent();
        }, 5000);
    }

    dispose(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    private updateContent(): void {
        if (!this.container) return;

        const agentMetrics = this.observability.getAllAgentMetrics();
        const providerMetrics = this.observability.getAllProviderMetrics();

        this.container.innerHTML = `
            <div class="ai-ide-widget ai-ide-widget-elevated">
                <div class="ai-ide-widget-header">
                    <div>
                        <h2 class="ai-ide-widget-title">${nls('health.title')}</h2>
                        <p class="ai-ide-widget-subtitle">System performance and metrics</p>
                    </div>
                    <div class="ai-ide-widget-actions">
                        <button class="ai-ide-button ai-ide-button-secondary" id="refresh-health">
                            <span class="codicon codicon-refresh"></span>
                            ${nls('health.refresh')}
                        </button>
                        <button class="ai-ide-button" id="export-metrics">
                            <span class="codicon codicon-file"></span>
                            ${nls('health.exportMetrics')}
                        </button>
                    </div>
                </div>

                <div class="ai-ide-health-panel">
                    ${this.renderAgentMetrics(agentMetrics)}
                    ${this.renderProviderMetrics(providerMetrics)}
                    ${this.renderExecutorMetrics()}
                </div>

                <div style="margin-top: 24px;">
                    <h3 class="ai-ide-widget-title" style="font-size: 14px; margin-bottom: 12px;">
                        ${nls('health.errors')}
                    </h3>
                    ${this.renderErrorSummary(agentMetrics, providerMetrics)}
                </div>
            </div>
        `;

        // Attach event listeners
        this.container.querySelector('#refresh-health')?.addEventListener('click', () => {
            this.updateContent();
        });

        this.container.querySelector('#export-metrics')?.addEventListener('click', () => {
            this.exportMetrics();
        });
    }

    private renderAgentMetrics(metrics: any[]): string {
        if (metrics.length === 0) {
            return `
                <div class="ai-ide-health-card">
                    <h3 class="ai-ide-widget-title" style="font-size: 14px; margin-bottom: 12px;">
                        ${nls('config.agents')}
                    </h3>
                    <p class="ai-ide-text-muted">No agent activity recorded</p>
                </div>
            `;
        }

        return metrics.map(m => {
            const p95 = this.observability.getAgentP95(m.agentId);
            const p99 = this.observability.getAgentP99(m.agentId);
            const errorRate = m.totalRequests > 0 
                ? ((m.errorCount / m.totalRequests) * 100).toFixed(1)
                : '0.0';
            const statusClass = m.errorCount > 0 ? 'warning' : 'success';

            return `
                <div class="ai-ide-health-card">
                    <h3 class="ai-ide-widget-title" style="font-size: 14px; margin-bottom: 12px;">
                        ${m.agentId} Agent
                    </h3>
                    <div class="ai-ide-health-metric">
                        <span class="ai-ide-health-label">${nls('health.totalRequests')}</span>
                        <span class="ai-ide-health-value">${m.totalRequests}</span>
                    </div>
                    <div class="ai-ide-health-metric">
                        <span class="ai-ide-health-label">${nls('health.errorRate')}</span>
                        <span class="ai-ide-health-value ${statusClass}">${errorRate}%</span>
                    </div>
                    <div class="ai-ide-health-metric">
                        <span class="ai-ide-health-label">${nls('health.p95')}</span>
                        <span class="ai-ide-health-value">${p95.toFixed(0)}ms</span>
                    </div>
                    <div class="ai-ide-health-metric">
                        <span class="ai-ide-health-label">${nls('health.p99')}</span>
                        <span class="ai-ide-health-value">${p99.toFixed(0)}ms</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    private renderProviderMetrics(metrics: any[]): string {
        if (metrics.length === 0) {
            return `
                <div class="ai-ide-health-card">
                    <h3 class="ai-ide-widget-title" style="font-size: 14px; margin-bottom: 12px;">
                        ${nls('config.providers')}
                    </h3>
                    <p class="ai-ide-text-muted">No provider activity recorded</p>
                </div>
            `;
        }

        return metrics.map(m => {
            const p95 = this.observability.getProviderP95(m.providerId);
            const p99 = this.observability.getProviderP99(m.providerId);
            const errorRate = m.totalRequests > 0 
                ? ((m.errorCount / m.totalRequests) * 100).toFixed(1)
                : '0.0';
            const statusClass = m.errorCount > 0 ? 'warning' : 'success';

            return `
                <div class="ai-ide-health-card">
                    <h3 class="ai-ide-widget-title" style="font-size: 14px; margin-bottom: 12px;">
                        ${m.providerId} Provider
                    </h3>
                    <div class="ai-ide-health-metric">
                        <span class="ai-ide-health-label">${nls('health.totalRequests')}</span>
                        <span class="ai-ide-health-value">${m.totalRequests}</span>
                    </div>
                    <div class="ai-ide-health-metric">
                        <span class="ai-ide-health-label">${nls('health.errorRate')}</span>
                        <span class="ai-ide-health-value ${statusClass}">${errorRate}%</span>
                    </div>
                    <div class="ai-ide-health-metric">
                        <span class="ai-ide-health-label">${nls('health.p95')}</span>
                        <span class="ai-ide-health-value">${p95.toFixed(0)}ms</span>
                    </div>
                    <div class="ai-ide-health-metric">
                        <span class="ai-ide-health-label">${nls('health.p99')}</span>
                        <span class="ai-ide-health-value">${p99.toFixed(0)}ms</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    private renderExecutorMetrics(): string {
        // Placeholder for executor metrics
        // In real implementation, would fetch from WorkspaceExecutorService
        return `
            <div class="ai-ide-health-card">
                <h3 class="ai-ide-widget-title" style="font-size: 14px; margin-bottom: 12px;">
                    Workspace Executor
                </h3>
                <div class="ai-ide-health-metric">
                    <span class="ai-ide-health-label">${nls('health.status')}</span>
                    <span class="ai-ide-health-value success">Ready</span>
                </div>
                <p class="ai-ide-text-muted" style="margin-top: 8px; font-size: 12px;">
                    Click status bar to view logs and metrics
                </p>
            </div>
        `;
    }

    private renderErrorSummary(agentMetrics: any[], providerMetrics: any[]): string {
        const allErrors: Array<{ source: string; error: string; count: number }> = [];

        // Collect agent errors
        for (const m of agentMetrics) {
            const topErrors = this.observability.getTopErrors(m.agentId, 3);
            for (const e of topErrors) {
                allErrors.push({
                    source: `${m.agentId} Agent`,
                    error: e.error,
                    count: e.count
                });
            }
        }

        // Collect provider errors
        for (const m of providerMetrics) {
            const topErrors = this.observability.getProviderTopErrors(m.providerId, 3);
            for (const e of topErrors) {
                allErrors.push({
                    source: `${m.providerId} Provider`,
                    error: e.error,
                    count: e.count
                });
            }
        }

        if (allErrors.length === 0) {
            return '<p class="ai-ide-text-muted">No errors recorded</p>';
        }

        // Sort by count and take top 10
        allErrors.sort((a, b) => b.count - a.count);
        const topErrors = allErrors.slice(0, 10);

        return `
            <div style="background: var(--ai-ide-surface); border: 1px solid var(--ai-ide-border-muted); border-radius: var(--ai-ide-radius-sm); padding: 12px;">
                ${topErrors.map(e => `
                    <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--ai-ide-border-muted);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 12px; color: var(--ai-ide-text-muted);">${e.source}</span>
                            <span style="font-size: 12px; font-weight: 600; color: #ef4444;">${e.count}×</span>
                        </div>
                        <div style="font-size: 13px; color: var(--ai-ide-text); margin-top: 4px;">${e.error}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    private exportMetrics(): void {
        const metrics = this.observability.exportPrometheus();
        const blob = new Blob([metrics], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-ide-metrics-${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
