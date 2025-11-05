import { MCPFrontendNotificationService } from '../common';
import { Emitter, Event } from '@theia/core/lib/common/event';
export declare class MCPFrontendNotificationServiceImpl implements MCPFrontendNotificationService {
    protected readonly onDidUpdateMCPServersEmitter: Emitter<void>;
    readonly onDidUpdateMCPServers: Event<void>;
    didUpdateMCPServers(): void;
}
//# sourceMappingURL=mcp-frontend-notification-service.d.ts.map