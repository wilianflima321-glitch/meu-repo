import { Emitter } from '@theia/core';
import { RemotePortForwardingProvider } from '../../electron-common/remote-port-forwarding-provider';
export interface ForwardedPort {
    localPort?: number;
    address?: string;
    origin?: string;
    editing: boolean;
}
export declare class PortForwardingService {
    readonly provider: RemotePortForwardingProvider;
    protected readonly onDidChangePortsEmitter: Emitter<void>;
    readonly onDidChangePorts: import("@theia/core").Event<void>;
    forwardedPorts: ForwardedPort[];
    init(): void;
    forwardNewPort(origin?: string): ForwardedPort;
    updatePort(port: ForwardedPort, newAdress: string): void;
    removePort(port: ForwardedPort): void;
    isValidAddress(address: string): boolean;
}
//# sourceMappingURL=port-forwarding-service.d.ts.map