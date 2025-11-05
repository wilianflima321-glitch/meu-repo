import { ContainerModule } from '@theia/core/shared/inversify';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser/messaging/ws-connection-provider';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application';
import { LanguageExtensionManager, LanguageExtensionManagerPath } from '../common/language-extension-manager-protocol';
import { LanguageExtensionContribution } from './language-ext/language-extension-contribution';
import { DebugAdapterManager, DebugAdapterManagerPath } from '../common/debug-adapter-manager-protocol';
import { DebugAdapterContribution } from './debug-ext/debug-adapter-contribution';
import { bindLanguageExtensionViewContribution } from './components/language-extension-view-contribution';

export default new ContainerModule((bind, unbind, isBound, rebind) => {
    // Bind the language extension contribution
    bind(LanguageExtensionContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(LanguageExtensionContribution);

    // Bind the debug adapter contribution
    bind(DebugAdapterContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toService(DebugAdapterContribution);

    // Bind the UI components
    bindLanguageExtensionViewContribution(bind);

    // Bind the language extension manager proxy
    bind(LanguageExtensionManager).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<LanguageExtensionManager>(LanguageExtensionManagerPath);
    }).inSingletonScope();

    // Bind the debug adapter manager proxy
    bind(DebugAdapterManager).toDynamicValue(ctx => {
        const connection = ctx.container.get(WebSocketConnectionProvider);
        return connection.createProxy<DebugAdapterManager>(DebugAdapterManagerPath);
    }).inSingletonScope();
});