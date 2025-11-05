import { Command, CommandContribution, CommandRegistry, InMemoryResources, MessageService, QuickInputService } from '@theia/core';
import { ApplicationShell, OpenerService } from '@theia/core/lib/browser';
import { ClipboardService } from '@theia/core/lib/browser/clipboard-service';
import { LanguageService } from '@theia/core/lib/browser/language-service';
import { MergeEditor } from './merge-editor';
export declare namespace MergeEditorDevCommands {
    const MERGE_EDITOR_DEV_CATEGORY = "Merge Editor (Dev)";
    const COPY_CONTENTS_TO_JSON: Command;
    const OPEN_CONTENTS_FROM_JSON: Command;
}
export declare class MergeEditorDevContribution implements CommandContribution {
    protected readonly shell: ApplicationShell;
    protected readonly clipboardService: ClipboardService;
    protected readonly messageService: MessageService;
    protected readonly quickInputService: QuickInputService;
    protected readonly languageService: LanguageService;
    protected readonly inMemoryResources: InMemoryResources;
    protected readonly openerService: OpenerService;
    protected getMergeEditor(widget?: import("@lumino/widgets/types/widget").Widget | undefined): MergeEditor | undefined;
    registerCommands(commands: CommandRegistry): void;
    protected copyContentsToJSON(editor: MergeEditor): void;
    protected openContentsFromJSON(): Promise<void>;
}
export interface MergeEditorContents {
    base: string;
    input1: string;
    input2: string;
    result: string;
    languageId?: string;
}
//# sourceMappingURL=merge-editor-dev-contribution.d.ts.map