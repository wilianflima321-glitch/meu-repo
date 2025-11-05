/// <reference types="node" />
/// <reference types="node" />
import * as http from 'http';
import * as https from 'https';
import * as express from '@theia/core/shared/express';
import { ContributionProvider } from '@theia/core/lib/common';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { MetricsContribution } from './metrics-contribution';
export declare class MetricsBackendApplicationContribution implements BackendApplicationContribution {
    protected readonly metricsProviders: ContributionProvider<MetricsContribution>;
    static ENDPOINT: string;
    constructor(metricsProviders: ContributionProvider<MetricsContribution>);
    configure(app: express.Application): void;
    onStart(server: http.Server | https.Server): void;
    fetchMetricsFromProviders(): string;
}
//# sourceMappingURL=metrics-backend-application-contribution.d.ts.map