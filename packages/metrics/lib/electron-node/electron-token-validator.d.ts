/// <reference types="node" />
import { ElectronTokenValidator } from '@theia/core/lib/electron-node/token/electron-token-validator';
import { IncomingMessage } from 'http';
import { MaybePromise } from '@theia/core';
export declare class MetricsElectronTokenValidator extends ElectronTokenValidator {
    protected init(): void;
    allowWsUpgrade(request: IncomingMessage): MaybePromise<boolean>;
    allowRequest(request: IncomingMessage): boolean;
}
//# sourceMappingURL=electron-token-validator.d.ts.map