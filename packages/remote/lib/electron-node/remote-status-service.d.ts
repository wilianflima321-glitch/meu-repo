import { RemoteStatus, RemoteStatusService } from '../electron-common/remote-status-service';
import { RemoteConnectionService } from './remote-connection-service';
export declare class RemoteStatusServiceImpl implements RemoteStatusService {
    protected remoteConnectionService: RemoteConnectionService;
    getStatus(localPort: number): Promise<RemoteStatus>;
    connectionClosed(localPort: number): Promise<void>;
}
//# sourceMappingURL=remote-status-service.d.ts.map