import { LanguageModelService } from '@theia/ai-core/lib/browser';
import { Agent, AgentSpecificVariables, LanguageModelRegistry, LanguageModelRequirement, PromptService, PromptVariantSet } from '@theia/ai-core/lib/common';
import { ILogger, ProgressService } from '@theia/core';
import * as monaco from '@theia/monaco-editor-core';
import { CodeCompletionPostProcessor } from './code-completion-postprocessor';
export declare const CodeCompletionAgent: unique symbol;
export interface CodeCompletionAgent extends Agent {
    provideInlineCompletions(model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.InlineCompletionContext, token: monaco.CancellationToken): Promise<monaco.languages.InlineCompletions | undefined>;
}
export declare class CodeCompletionAgentImpl implements CodeCompletionAgent {
    protected languageModelService: LanguageModelService;
    provideInlineCompletions(model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.InlineCompletionContext, token: monaco.CancellationToken): Promise<monaco.languages.InlineCompletions | undefined>;
    protected logger: ILogger;
    protected languageModelRegistry: LanguageModelRegistry;
    protected promptService: PromptService;
    protected progressService: ProgressService;
    protected postProcessor: CodeCompletionPostProcessor;
    id: string;
    name: string;
    description: string;
    prompts: PromptVariantSet[];
    languageModelRequirements: LanguageModelRequirement[];
    readonly variables: string[];
    readonly functions: string[];
    readonly agentSpecificVariables: AgentSpecificVariables[];
}
//# sourceMappingURL=code-completion-agent.d.ts.map