import { ObservabilityService } from '../../common/observability-service';
export interface HealthStatus {
    component: string;
    status: 'healthy' | 'degraded' | 'error';
    message?: string;
    metrics?: Record<string, number>;
}
export declare class AIHealthWidget {
    private observability;
    private container;
    private refreshInterval;
    constructor(observability: ObservabilityService);
    render(container: HTMLElement): void;
    dispose(): void;
    private updateContent;
    private renderAgentMetrics;
    private renderProviderMetrics;
    private renderExecutorMetrics;
    private renderErrorSummary;
    private exportMetrics;
}
