export type RemoteStatus = RemoteConnectedStatus | RemoteDisconnectedStatus;
export interface RemoteDisconnectedStatus {
    alive: false;
}
export interface RemoteConnectedStatus {
    alive: true;
    type: string;
    name: string;
}
export declare const RemoteStatusServicePath = "/remote/status";
export declare const RemoteStatusService: unique symbol;
export interface RemoteStatusService {
    getStatus(localPort: number): Promise<RemoteStatus>;
    connectionClosed(localPort: number): Promise<void>;
}
//# sourceMappingURL=remote-status-service.d.ts.map