import { MutableChatRequestModel } from '@theia/ai-chat';
import { ChangeSetFileElementFactory } from '@theia/ai-chat/lib/browser/change-set-file-element';
import { ToolProvider, ToolRequest, ToolRequestParameters } from '@theia/ai-core';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
import { WorkspaceFunctionScope } from './workspace-functions';
export declare const FileChangeSetTitleProvider: unique symbol;
export interface FileChangeSetTitleProvider {
    getChangeSetTitle(ctx: MutableChatRequestModel): string;
}
export declare class SuggestFileContent implements ToolProvider {
    static ID: string;
    protected readonly workspaceFunctionScope: WorkspaceFunctionScope;
    fileService: FileService;
    protected readonly fileChangeFactory: ChangeSetFileElementFactory;
    protected readonly fileChangeSetTitleProvider: FileChangeSetTitleProvider;
    getTool(): ToolRequest;
}
export declare class WriteFileContent implements ToolProvider {
    static ID: string;
    protected readonly workspaceFunctionScope: WorkspaceFunctionScope;
    fileService: FileService;
    protected readonly fileChangeFactory: ChangeSetFileElementFactory;
    protected readonly fileChangeSetTitleProvider: FileChangeSetTitleProvider;
    getTool(): ToolRequest;
}
export declare class ReplaceContentInFileFunctionHelper {
    protected readonly workspaceFunctionScope: WorkspaceFunctionScope;
    fileService: FileService;
    protected readonly fileChangeFactory: ChangeSetFileElementFactory;
    protected readonly fileChangeSetTitleProvider: FileChangeSetTitleProvider;
    private replacer;
    constructor();
    getToolMetadata(supportMultipleReplace?: boolean, immediateApplication?: boolean): {
        description: string;
        parameters: ToolRequestParameters;
    };
    createChangesetFromToolCall(toolCallString: string, ctx: MutableChatRequestModel): Promise<string>;
    writeChangesetFromToolCall(toolCallString: string, ctx: MutableChatRequestModel): Promise<string>;
    private processReplacementsCommon;
    private findExistingChangeElement;
    clearFileChanges(path: string, ctx: MutableChatRequestModel): Promise<string>;
    getProposedFileState(path: string, ctx: MutableChatRequestModel): Promise<string>;
}
export declare class SimpleSuggestFileReplacements implements ToolProvider {
    static ID: string;
    protected readonly replaceContentInFileFunctionHelper: ReplaceContentInFileFunctionHelper;
    getTool(): ToolRequest;
}
export declare class SimpleWriteFileReplacements implements ToolProvider {
    static ID: string;
    protected readonly replaceContentInFileFunctionHelper: ReplaceContentInFileFunctionHelper;
    getTool(): ToolRequest;
}
export declare class SuggestFileReplacements implements ToolProvider {
    static ID: string;
    protected readonly replaceContentInFileFunctionHelper: ReplaceContentInFileFunctionHelper;
    getTool(): ToolRequest;
}
export declare class WriteFileReplacements implements ToolProvider {
    static ID: string;
    protected readonly replaceContentInFileFunctionHelper: ReplaceContentInFileFunctionHelper;
    getTool(): ToolRequest;
}
export declare class ClearFileChanges implements ToolProvider {
    static ID: string;
    protected readonly replaceContentInFileFunctionHelper: ReplaceContentInFileFunctionHelper;
    getTool(): ToolRequest;
}
export declare class GetProposedFileState implements ToolProvider {
    static ID: string;
    protected readonly replaceContentInFileFunctionHelper: ReplaceContentInFileFunctionHelper;
    getTool(): ToolRequest;
}
export declare class DefaultFileChangeSetTitleProvider implements FileChangeSetTitleProvider {
    getChangeSetTitle(ctx: MutableChatRequestModel): string;
}
//# sourceMappingURL=file-changeset-functions.d.ts.map