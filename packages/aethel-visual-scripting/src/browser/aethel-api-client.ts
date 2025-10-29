import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';
import { AethelBackendService, AethelBackendServicePath } from '../common/aethel-backend-service';

@injectable()
export class AethelApiClient implements FrontendApplicationContribution {

    @inject(WebSocketConnectionProvider)
    protected readonly connectionProvider: WebSocketConnectionProvider;

    protected service: AethelBackendService | undefined;

    onStart(): void {
        this.connectionProvider.createProxy<AethelBackendService>(AethelBackendServicePath).then(proxy => {
            this.service = proxy;
        });
    }

    async callBackendMethod(): Promise<string> {
        if (this.service) {
            return await this.service.exampleMethod();
        }
        return 'Backend not connected';
    }
}