import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { ILogger, MeasurementResult, Stopwatch } from '@theia/core';
import { MeasurementNotificationService } from '../common';
export declare class MetricsFrontendApplicationContribution implements FrontendApplicationContribution {
    protected stopwatch: Stopwatch;
    protected notificationService: MeasurementNotificationService;
    protected logger: ILogger;
    readonly id: string;
    initialize(): void;
    protected doInitialize(): Promise<void>;
    protected notify(result: MeasurementResult): void;
}
//# sourceMappingURL=metrics-frontend-application-contribution.d.ts.map