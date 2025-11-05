/// <reference types="node" />
import { ForwardedPort, RemotePortForwardingProvider } from '../electron-common/remote-port-forwarding-provider';
import { Server } from 'net';
import { RemoteConnectionService } from './remote-connection-service';
import { RemoteConnection } from './remote-types';
interface ForwardInfo {
    connection: RemoteConnection;
    port: ForwardedPort;
    server: Server;
}
export declare class RemotePortForwardingProviderImpl implements RemotePortForwardingProvider {
    protected readonly connectionService: RemoteConnectionService;
    protected static forwardedPorts: ForwardInfo[];
    forwardPort(connectionPort: number, portToForward: ForwardedPort): Promise<void>;
    portRemoved(forwardedPort: ForwardedPort): Promise<void>;
    getForwardedPorts(): Promise<ForwardedPort[]>;
}
export {};
//# sourceMappingURL=remote-port-forwarding-provider.d.ts.map