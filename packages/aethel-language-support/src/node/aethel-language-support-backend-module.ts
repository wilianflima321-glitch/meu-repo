import { ContainerModule } from '@theia/core/shared/inversify';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { LanguageExtensionManager, LanguageExtensionManagerPath } from '../common/language-extension-manager-protocol';
import { LanguageExtensionManagerImpl } from './language-extension-manager';
import { DebugAdapterManager, DebugAdapterManagerPath } from '../common/debug-adapter-manager-protocol';
import { DebugAdapterManagerImpl } from './debug-adapter-manager';

export default new ContainerModule(bind => {
    bind(LanguageExtensionManagerImpl).toSelf().inSingletonScope();
    bind(LanguageExtensionManager).toService(LanguageExtensionManagerImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(LanguageExtensionManagerPath, () => 
            ctx.container.get(LanguageExtensionManager)
        )
    ).inSingletonScope();

    bind(DebugAdapterManagerImpl).toSelf().inSingletonScope();
    bind(DebugAdapterManager).toService(DebugAdapterManagerImpl);
    bind(ConnectionHandler).toDynamicValue(ctx =>
        new JsonRpcConnectionHandler(DebugAdapterManagerPath, () =>
            ctx.container.get(DebugAdapterManager)
        )
    ).inSingletonScope();
});