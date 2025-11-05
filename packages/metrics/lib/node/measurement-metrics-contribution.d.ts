import { MetricsContribution } from './metrics-contribution';
import { MeasurementResult, Stopwatch } from '@theia/core';
import { MeasurementNotificationService } from '../common';
import { LogLevelCliContribution } from '@theia/core/lib/node/logger-cli-contribution';
export declare class MeasurementMetricsBackendContribution implements MetricsContribution, MeasurementNotificationService {
    protected backendStopwatch: Stopwatch;
    protected logLevelCli: LogLevelCliContribution;
    protected metrics: string;
    protected frontendCounters: Map<string, string>;
    startCollecting(): void;
    getMetrics(): string;
    protected appendMetricsValue(id: string, result: MeasurementResult): void;
    protected onBackendMeasurement(result: MeasurementResult): void;
    protected createFrontendCounterId(frontendId: string): string;
    protected toCounterId(frontendId: string): string;
    onFrontendMeasurement(frontendId: string, result: MeasurementResult): void;
}
//# sourceMappingURL=measurement-metrics-contribution.d.ts.map