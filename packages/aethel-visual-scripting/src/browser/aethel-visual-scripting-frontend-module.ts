import { ContainerModule } from '@theia/core/shared/inversify';
import { AethelVisualScriptingWidget } from './aethel-visual-scripting-widget';
import { AethelVisualScriptingContribution } from './aethel-visual-scripting-contribution';
import { AethelVisualScriptingClient } from './aethel-visual-scripting-client';
import { AethelVisualScriptingService, AethelVisualScriptingServicePath } from '../common/aethel-visual-scripting-service';
import { bindViewContribution, FrontendApplicationContribution, WidgetFactory } from '@theia/core/lib/browser';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';

export default new ContainerModule(bind => {
    bindViewContribution(bind, AethelVisualScriptingContribution);
    bind(FrontendApplicationContribution).toService(AethelVisualScriptingContribution);
    bind(AethelVisualScriptingWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: AethelVisualScriptingWidget.ID,
        createWidget: () => ctx.container.get<AethelVisualScriptingWidget>(AethelVisualScriptingWidget)
    })).inSingletonScope();

    bind(AethelVisualScriptingClient).toSelf().inSingletonScope();
    bind(AethelVisualScriptingService).toService(AethelVisualScriptingClient);
    WebSocketConnectionProvider.createProxy(bind, AethelVisualScriptingServicePath, AethelVisualScriptingService);
});
