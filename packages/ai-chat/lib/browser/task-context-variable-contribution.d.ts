import { AIVariableContext, AIVariableOpener, AIVariableResolutionRequest, AIVariableResolver, ResolvedAIContextVariable } from '@theia/ai-core';
import { FrontendVariableContribution, FrontendVariableService } from '@theia/ai-core/lib/browser';
import { MaybePromise, QuickInputService, QuickPickItem } from '@theia/core';
import { ChatService } from '../common';
import * as monaco from '@theia/monaco-editor-core';
import { TaskContextService } from './task-context-service';
export declare class TaskContextVariableContribution implements FrontendVariableContribution, AIVariableResolver, AIVariableOpener {
    protected readonly quickInputService: QuickInputService;
    protected readonly chatService: ChatService;
    protected readonly taskContextService: TaskContextService;
    registerVariables(service: FrontendVariableService): void;
    protected pickSession(): Promise<string | undefined>;
    protected provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position, matchString?: string): Promise<monaco.languages.CompletionItem[] | undefined>;
    protected getItems(): QuickPickItem[];
    canResolve(request: AIVariableResolutionRequest, context: AIVariableContext): MaybePromise<number>;
    resolve(request: AIVariableResolutionRequest, _context: AIVariableContext): Promise<ResolvedAIContextVariable | undefined>;
    canOpen(request: AIVariableResolutionRequest, context: AIVariableContext): MaybePromise<number>;
    open(request: AIVariableResolutionRequest, _context: AIVariableContext): Promise<void>;
}
//# sourceMappingURL=task-context-variable-contribution.d.ts.map