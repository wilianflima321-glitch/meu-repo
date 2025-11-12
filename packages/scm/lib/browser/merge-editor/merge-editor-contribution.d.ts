import { Command, CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry } from '@theia/core';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { ApplicationShell, FrontendApplicationContribution, KeybindingContribution, KeybindingRegistry, LabelProvider } from '@theia/core/lib/browser';
import { ColorContribution } from '@theia/core/lib/browser/color-application-contribution';
import { ColorRegistry } from '@theia/core/lib/browser/color-registry';
import { MergeEditor, MergeEditorSettings } from './merge-editor';
export declare namespace MergeEditorCommands {
    const MERGE_EDITOR_CATEGORY = "Merge Editor";
    const ACCEPT_MERGE: Command;
    const GO_TO_NEXT_UNHANDLED_CONFLICT: Command;
    const GO_TO_PREVIOUS_UNHANDLED_CONFLICT: Command;
    const SET_MIXED_LAYOUT: Command;
    const SET_COLUMN_LAYOUT: Command;
    const SHOW_BASE: Command;
    const SHOW_BASE_TOP: Command;
    const SHOW_BASE_CENTER: Command;
}
export declare class MergeEditorContribution implements FrontendApplicationContribution, CommandContribution, MenuContribution, TabBarToolbarContribution, KeybindingContribution, ColorContribution {
    protected readonly settings: MergeEditorSettings;
    protected readonly shell: ApplicationShell;
    protected readonly labelProvider: LabelProvider;
    onStart(): void;
    onStop(): void;
    protected getMergeEditor(widget?: import("@lumino/widgets/types/widget").Widget | undefined): MergeEditor | undefined;
    registerCommands(commands: CommandRegistry): void;
    registerMenus(menus: MenuModelRegistry): void;
    registerToolbarItems(registry: TabBarToolbarRegistry): void;
    registerKeybindings(keybindings: KeybindingRegistry): void;
    /**
     * It should be aligned with https://code.visualstudio.com/api/references/theme-color#merge-conflicts-colors
     */
    registerColors(colors: ColorRegistry): void;
}
//# sourceMappingURL=merge-editor-contribution.d.ts.map