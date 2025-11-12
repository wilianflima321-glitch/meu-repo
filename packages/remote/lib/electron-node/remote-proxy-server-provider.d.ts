/// <reference types="node" />
import * as net from 'net';
export declare class RemoteProxyServerProvider {
    getProxyServer(callback?: (socket: net.Socket) => void): Promise<net.Server>;
}
//# sourceMappingURL=remote-proxy-server-provider.d.ts.map