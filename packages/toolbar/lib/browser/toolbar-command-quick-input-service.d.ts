import { Command, CommandRegistry, CommandService } from '@theia/core';
import { QuickCommandService, QuickInputService, QuickPickItem } from '@theia/core/lib/browser';
import { ToolbarIconDialogFactory } from './toolbar-icon-selector-dialog';
import { ToolbarController } from './toolbar-controller';
export declare class ToolbarCommandQuickInputService {
    protected readonly commandService: CommandService;
    protected readonly quickInputService: QuickInputService;
    protected readonly commandRegistry: CommandRegistry;
    protected readonly quickCommandService: QuickCommandService;
    protected readonly model: ToolbarController;
    protected readonly iconDialogFactory: ToolbarIconDialogFactory;
    protected quickPickItems: QuickPickItem[];
    protected iconClass: string | undefined;
    protected commandToAdd: Command | undefined;
    protected columnQuickPickItems: QuickPickItem[];
    openIconDialog(): void;
    protected openColumnQP(): Promise<QuickPickItem | undefined>;
    protected generateCommandsList(): QuickPickItem[];
}
//# sourceMappingURL=toolbar-command-quick-input-service.d.ts.map