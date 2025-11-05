import { CommandRegistry, CommandContribution, Command } from '@theia/core/lib/common/command';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { SecondaryWindowHandler } from '@theia/core/lib/browser/secondary-window-handler';
export declare const EXTRACT_WIDGET: Command;
/** Contributes the widget extraction command and registers it in the toolbar of extractable widgets. */
export declare class SecondaryWindowContribution implements CommandContribution, TabBarToolbarContribution {
    protected readonly secondaryWindowHandler: SecondaryWindowHandler;
    registerCommands(commands: CommandRegistry): void;
    registerToolbarItems(registry: TabBarToolbarRegistry): void;
}
//# sourceMappingURL=secondary-window-frontend-contribution.d.ts.map