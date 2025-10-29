import { injectable } from '@theia/core/shared/inversify';
import { Command, CommandRegistry, MenuModelRegistry } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { AethelAiRuntimeWidget } from './aethel-ai-runtime-widget';
import { AbstractViewContribution } from '@theia/core/lib/browser';

export const AethelAiRuntimeCommand: Command = { id: 'aethel.ai-runtime.open' };

@injectable()
export class AethelAiRuntimeContribution extends AbstractViewContribution<AethelAiRuntimeWidget> {

    constructor() {
        super({
            widgetId: AethelAiRuntimeWidget.ID,
            widgetName: AethelAiRuntimeWidget.LABEL,
            defaultWidgetOptions: { area: 'main' },
            toggleCommandId: AethelAiRuntimeCommand.id
        });
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(AethelAiRuntimeCommand, {
            execute: () => super.openView({ reveal: true })
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.EDIT_FIND, {
            commandId: AethelAiRuntimeCommand.id,
            label: 'Open AI Runtime'
        });
    }
}