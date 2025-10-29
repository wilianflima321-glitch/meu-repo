import { ContainerModule } from '@theia/core/shared/inversify';
import { AethelAiRuntimeWidget } from './aethel-ai-runtime-widget';
import { AethelAiRuntimeContribution } from './aethel-ai-runtime-contribution';
import { AethelAiRuntimeClient } from './aethel-ai-runtime-client';
import { AethelAiRuntimeService, AethelAiRuntimeServicePath } from '../common/aethel-ai-runtime-service';
import { bindViewContribution, FrontendApplicationContribution, WidgetFactory } from '@theia/core/lib/browser';
import { WebSocketConnectionProvider } from '@theia/core/lib/browser';

export default new ContainerModule(bind => {
    bindViewContribution(bind, AethelAiRuntimeContribution);
    bind(FrontendApplicationContribution).toService(AethelAiRuntimeContribution);
    bind(AethelAiRuntimeWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: AethelAiRuntimeWidget.ID,
        createWidget: () => ctx.container.get<AethelAiRuntimeWidget>(AethelAiRuntimeWidget)
    })).inSingletonScope();

    bind(AethelAiRuntimeClient).toSelf().inSingletonScope();
    bind(AethelAiRuntimeService).toService(AethelAiRuntimeClient);
    WebSocketConnectionProvider.createProxy(bind, AethelAiRuntimeServicePath, AethelAiRuntimeService);
});
