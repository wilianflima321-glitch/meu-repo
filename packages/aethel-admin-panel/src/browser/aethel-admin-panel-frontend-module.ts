import { ContainerModule } from \'@theia/core/shared/inversify\';
import { AethelAdminPanelWidget } from \'./aethel-admin-panel-widget\';
import { WidgetFactory } from \'@theia/core/lib/browser\';

export default new ContainerModule(bind => {
    bind(AethelAdminPanelWidget).toSelf();
    bind(WidgetFactory).toDynamicValue(ctx => ({
        id: AethelAdminPanelWidget.ID,
        createWidget: () => ctx.container.get(AethelAdminPanelWidget)
    })).inSingletonScope();
});
