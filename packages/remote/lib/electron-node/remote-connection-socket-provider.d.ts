import { Socket } from 'socket.io-client';
export interface RemoteProxySocketProviderOptions {
    port: number;
    path: string;
}
export declare class RemoteConnectionSocketProvider {
    getProxySocket(options: RemoteProxySocketProviderOptions): Socket;
}
//# sourceMappingURL=remote-connection-socket-provider.d.ts.map