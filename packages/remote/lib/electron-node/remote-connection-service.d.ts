import { RemoteConnection } from './remote-types';
import { Disposable } from '@theia/core';
import { RemoteCopyService } from './setup/remote-copy-service';
import { BackendApplicationContribution } from '@theia/core/lib/node';
import { RemoteSetupService } from './setup/remote-setup-service';
export declare class RemoteConnectionService implements BackendApplicationContribution {
    protected readonly copyService: RemoteCopyService;
    protected readonly remoteSetupService: RemoteSetupService;
    protected readonly connections: Map<string, RemoteConnection>;
    getConnection(id: string): RemoteConnection | undefined;
    getConnectionFromPort(port: number): RemoteConnection | undefined;
    register(connection: RemoteConnection): Disposable;
    onStop(): void;
}
//# sourceMappingURL=remote-connection-service.d.ts.map