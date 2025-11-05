export declare const RemoteRemotePortForwardingProviderPath = "/remote/port-forwarding";
export declare const RemotePortForwardingProvider: unique symbol;
export interface ForwardedPort {
    port: number;
    address?: string;
}
export interface RemotePortForwardingProvider {
    forwardPort(connectionPort: number, portToForward: ForwardedPort): Promise<void>;
    portRemoved(port: ForwardedPort): Promise<void>;
    getForwardedPorts(): Promise<ForwardedPort[]>;
}
//# sourceMappingURL=remote-port-forwarding-provider.d.ts.map