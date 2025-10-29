import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { connectionHandler, RpcConnectionHandler } from '@theia/core/lib/common/messaging/proxy-factory';
import { AethelVisualScriptingBackendService, AethelVisualScriptingServiceHandler } from './aethel-visual-scripting-backend-service';

export default new ContainerModule(bind => {
    bind(AethelVisualScriptingBackendService).toSelf().inSingletonScope();
    bind(BackendApplicationContribution).toService(AethelVisualScriptingBackendService);
    bind(RpcConnectionHandler).toConstantValue(AethelVisualScriptingServiceHandler);
});
