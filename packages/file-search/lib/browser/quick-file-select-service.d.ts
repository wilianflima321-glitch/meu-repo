import { KeybindingRegistry, OpenerService, QuickAccessRegistry } from '@theia/core/lib/browser';
import { LabelProvider } from '@theia/core/lib/browser/label-provider';
import { QuickInputService, QuickPickItem, QuickPicks } from '@theia/core/lib/browser/quick-input/quick-input-service';
import { CancellationToken, PreferenceService, QuickPickSeparator } from '@theia/core/lib/common';
import { MessageService } from '@theia/core/lib/common/message-service';
import URI from '@theia/core/lib/common/uri';
import { Range } from '@theia/editor/lib/browser';
import { NavigationLocationService } from '@theia/editor/lib/browser/navigation/navigation-location-service';
import { FileSystemPreferences } from '@theia/filesystem/lib/common';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { FileSearchService } from '../common/file-search-service';
export interface FilterAndRange {
    filter: string;
    range?: Range;
}
export interface QuickFileSelectOptions {
    /** Whether to hide .gitignored (and other ignored) files. */
    hideIgnoredFiles?: boolean;
    /** Executed when the item is selected. */
    onSelect?: (item: FileQuickPickItem) => void;
}
export type FileQuickPickItem = QuickPickItem & {
    uri: URI;
};
export declare namespace FileQuickPickItem {
    function is(obj: QuickPickItem | QuickPickSeparator): obj is FileQuickPickItem;
}
export declare class QuickFileSelectService {
    protected readonly keybindingRegistry: KeybindingRegistry;
    protected readonly workspaceService: WorkspaceService;
    protected readonly openerService: OpenerService;
    protected readonly quickInputService: QuickInputService;
    protected readonly quickAccessRegistry: QuickAccessRegistry;
    protected readonly fileSearchService: FileSearchService;
    protected readonly labelProvider: LabelProvider;
    protected readonly navigationLocationService: NavigationLocationService;
    protected readonly messageService: MessageService;
    protected readonly fsPreferences: FileSystemPreferences;
    protected readonly preferences: PreferenceService;
    /**
     * The score constants when comparing file search results.
     */
    private static readonly Scores;
    getPicks(fileFilter?: string, token?: CancellationToken, options?: QuickFileSelectOptions): Promise<QuickPicks>;
    protected compareItems(left: FileQuickPickItem, right: FileQuickPickItem, fileFilter: string): number;
    private toItem;
    private getItemIconClasses;
    private getItemDescription;
    /**
     * Splits the given expression into a structure of search-file-filter and
     * location-range.
     *
     * @param expression patterns of <path><#|:><line><#|:|,><col?>
     */
    protected splitFilterAndRange(expression: string): FilterAndRange;
}
//# sourceMappingURL=quick-file-select-service.d.ts.map