import { KeybindingRegistry, OpenerService, QuickAccessProvider, QuickAccessRegistry } from '@theia/core/lib/browser';
import { QuickInputService, QuickPickItem, QuickPicks } from '@theia/core/lib/browser/quick-input/quick-input-service';
import { CancellationToken, Command } from '@theia/core/lib/common';
import { MessageService } from '@theia/core/lib/common/message-service';
import URI from '@theia/core/lib/common/uri';
import { EditorOpenerOptions, Range } from '@theia/editor/lib/browser';
import { NavigationLocationService } from '@theia/editor/lib/browser/navigation/navigation-location-service';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { QuickFileSelectService } from './quick-file-select-service';
export declare const quickFileOpen: Command;
export interface FilterAndRange {
    filter: string;
    range?: Range;
}
export type FileQuickPickItem = QuickPickItem & {
    uri: URI;
};
export declare class QuickFileOpenService implements QuickAccessProvider {
    static readonly PREFIX = "";
    protected readonly keybindingRegistry: KeybindingRegistry;
    protected readonly workspaceService: WorkspaceService;
    protected readonly openerService: OpenerService;
    protected readonly quickInputService: QuickInputService;
    protected readonly quickAccessRegistry: QuickAccessRegistry;
    protected readonly navigationLocationService: NavigationLocationService;
    protected readonly messageService: MessageService;
    protected readonly quickFileSelectService: QuickFileSelectService;
    registerQuickAccessProvider(): void;
    /**
     * Whether to hide .gitignored (and other ignored) files.
     */
    protected hideIgnoredFiles: boolean;
    /**
     * Whether the dialog is currently open.
     */
    protected isOpen: boolean;
    private updateIsOpen;
    protected filterAndRangeDefault: {
        filter: string;
        range: undefined;
    };
    /**
     * Tracks the user file search filter and location range e.g. fileFilter:line:column or fileFilter:line,column
     */
    protected filterAndRange: FilterAndRange;
    protected init(): void;
    isEnabled(): boolean;
    open(): void;
    protected hideQuickPick(): void;
    /**
     * Get a string (suitable to show to the user) representing the keyboard
     * shortcut used to open the quick file open menu.
     */
    protected getKeyCommand(): string | undefined;
    getPicks(filter: string, token: CancellationToken): Promise<QuickPicks>;
    openFile(uri: URI): void;
    protected buildOpenerOptions(): EditorOpenerOptions;
    private getPlaceHolder;
    /**
     * Splits the given expression into a structure of search-file-filter and
     * location-range.
     *
     * @param expression patterns of <path><#|:><line><#|:|,><col?>
     */
    protected splitFilterAndRange(expression: string): FilterAndRange;
}
//# sourceMappingURL=quick-file-open.d.ts.map