import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { connectionHandler, RpcConnectionHandler } from '@theia/core/lib/common/messaging/proxy-factory';
import { AethelAiRuntimeBackendService, AethelAiRuntimeServiceHandler } from './aethel-ai-runtime-backend-service';

export default new ContainerModule(bind => {
    bind(AethelAiRuntimeBackendService).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(AethelAiRuntimeBackendService);
    bind(RpcConnectionHandler).toConstantValue(AethelAiRuntimeServiceHandler);
});