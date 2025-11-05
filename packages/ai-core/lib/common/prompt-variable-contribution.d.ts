import { CommandService, ILogger } from '@theia/core';
import * as monaco from '@theia/monaco-editor-core';
import { AIVariable, AIVariableContribution, AIVariableService, AIVariableResolutionRequest, AIVariableContext, ResolvedAIVariable, AIVariableResolverWithVariableDependencies, AIVariableArg } from './variable-service';
import { PromptService } from './prompt-service';
export declare const PROMPT_VARIABLE: AIVariable;
export declare class PromptVariableContribution implements AIVariableContribution, AIVariableResolverWithVariableDependencies {
    protected readonly commandService: CommandService;
    protected readonly promptService: PromptService;
    protected logger: ILogger;
    registerVariables(service: AIVariableService): void;
    canResolve(request: AIVariableResolutionRequest, context: AIVariableContext): number;
    resolve(request: AIVariableResolutionRequest, context: AIVariableContext, resolveDependency?: (variable: AIVariableArg) => Promise<ResolvedAIVariable | undefined>): Promise<ResolvedAIVariable | undefined>;
    protected triggerArgumentPicker(): Promise<string | undefined>;
    protected provideArgumentCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position): Promise<monaco.languages.CompletionItem[] | undefined>;
}
//# sourceMappingURL=prompt-variable-contribution.d.ts.map