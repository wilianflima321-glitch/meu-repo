import { injectable, inject } from '@theia/core/shared/inversify';
import { Command, CommandRegistry, MenuModelRegistry } from '@theia/core/lib/common';
import { CommonMenus } from '@theia/core/lib/browser';
import { AethelVisualScriptingWidget } from './aethel-visual-scripting-widget';
import { AbstractViewContribution } from '@theia/core/lib/browser';

export const AethelVisualScriptingCommand: Command = { id: 'aethel.visual-scripting.open' };

@injectable()
export class AethelVisualScriptingContribution extends AbstractViewContribution<AethelVisualScriptingWidget> {

    constructor() {
        super({
            widgetId: AethelVisualScriptingWidget.ID,
            widgetName: AethelVisualScriptingWidget.LABEL,
            defaultWidgetOptions: { area: 'main' },
            toggleCommandId: AethelVisualScriptingCommand.id
        });
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(AethelVisualScriptingCommand, {
            execute: () => super.openView({ reveal: true })
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.EDIT_FIND, {
            commandId: AethelVisualScriptingCommand.id,
            label: 'Open Visual Scripting Editor'
        });
    }
}