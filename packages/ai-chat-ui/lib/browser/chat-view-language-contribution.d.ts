import { ChatAgentService } from '@theia/ai-chat';
import { AIVariableService } from '@theia/ai-core/lib/common';
import { ToolInvocationRegistry } from '@theia/ai-core/lib/common/tool-invocation-registry';
import { MaybePromise } from '@theia/core';
import { FrontendApplication, FrontendApplicationContribution } from '@theia/core/lib/browser';
import * as monaco from '@theia/monaco-editor-core';
import { ProviderResult } from '@theia/monaco-editor-core/esm/vs/editor/common/languages';
import { AIChatFrontendContribution } from '@theia/ai-chat/lib/browser/ai-chat-frontend-contribution';
export declare const CHAT_VIEW_LANGUAGE_ID = "theia-ai-chat-view-language";
export declare const SETTINGS_LANGUAGE_ID = "theia-ai-chat-settings-language";
export declare const CHAT_VIEW_LANGUAGE_EXTENSION = "aichatviewlanguage";
interface CompletionSource<T> {
    triggerCharacter: string;
    getItems: () => T[];
    kind: monaco.languages.CompletionItemKind;
    getId: (item: T) => string;
    getName: (item: T) => string;
    getDescription: (item: T) => string;
    command?: monaco.languages.Command;
}
export declare class ChatViewLanguageContribution implements FrontendApplicationContribution {
    protected readonly agentService: ChatAgentService;
    protected readonly variableService: AIVariableService;
    protected readonly toolInvocationRegistry: ToolInvocationRegistry;
    protected readonly chatFrontendContribution: AIChatFrontendContribution;
    onStart(_app: FrontendApplication): MaybePromise<void>;
    protected registerCompletionProviders(): void;
    protected registerStandardCompletionProvider<T>(source: CompletionSource<T>): void;
    getCompletionRange(model: monaco.editor.ITextModel, position: monaco.Position, triggerCharacter: string): monaco.Range | undefined;
    protected provideCompletions<T>(model: monaco.editor.ITextModel, position: monaco.Position, source: CompletionSource<T>): ProviderResult<monaco.languages.CompletionList>;
    provideVariableWithArgCompletions(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.CompletionList>;
    protected triggerVariableArgumentPicker(): Promise<void>;
    protected getCharacterBeforePosition(model: monaco.editor.ITextModel, position: monaco.Position): string;
}
export {};
//# sourceMappingURL=chat-view-language-contribution.d.ts.map