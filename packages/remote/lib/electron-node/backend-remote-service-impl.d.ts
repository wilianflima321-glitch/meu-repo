/// <reference types="yargs" />
import { CliContribution } from '@theia/core/lib/node';
import { Arguments, Argv } from '@theia/core/shared/yargs';
import { BackendRemoteService } from '@theia/core/lib/node/remote/backend-remote-service';
export declare const REMOTE_START = "remote";
export declare class BackendRemoteServiceImpl extends BackendRemoteService implements CliContribution {
    protected isRemote: boolean;
    configure(conf: Argv): void;
    setArguments(args: Arguments): void;
    isRemoteServer(): boolean;
}
//# sourceMappingURL=backend-remote-service-impl.d.ts.map