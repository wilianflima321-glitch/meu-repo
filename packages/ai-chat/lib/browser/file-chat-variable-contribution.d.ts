import { AIVariableContext } from '@theia/ai-core';
import { AIVariableDropResult, FrontendVariableContribution, FrontendVariableService } from '@theia/ai-core/lib/browser';
import { ILogger, QuickInputService, URI } from '@theia/core';
import * as monaco from '@theia/monaco-editor-core';
import { QuickFileSelectService } from '@theia/file-search/lib/browser/quick-file-select-service';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { FileService } from '@theia/filesystem/lib/browser/file-service';
export declare class FileChatVariableContribution implements FrontendVariableContribution {
    protected readonly fileService: FileService;
    protected readonly wsService: WorkspaceService;
    protected readonly quickInputService: QuickInputService;
    protected readonly quickFileSelectService: QuickFileSelectService;
    protected readonly logger: ILogger;
    registerVariables(service: FrontendVariableService): void;
    protected triggerArgumentPicker(): Promise<string | undefined>;
    protected imageArgumentPicker(): Promise<string | undefined>;
    protected provideArgumentCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position, matchString?: string): Promise<monaco.languages.CompletionItem[] | undefined>;
    /**
     * Checks if a file is an image based on its extension.
     */
    protected isImageFile(filePath: string): boolean;
    /**
     * Determines the MIME type based on file extension.
     */
    protected getMimeTypeFromExtension(filePath: string): string;
    /**
     * Converts a file to base64 data URL.
     */
    protected fileToBase64(uri: URI): Promise<string>;
    protected handleDrop(event: DragEvent, _: AIVariableContext): Promise<AIVariableDropResult | undefined>;
}
//# sourceMappingURL=file-chat-variable-contribution.d.ts.map