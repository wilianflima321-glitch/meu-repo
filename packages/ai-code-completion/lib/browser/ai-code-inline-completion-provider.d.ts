import * as monaco from '@theia/monaco-editor-core';
import { CodeCompletionAgent } from './code-completion-agent';
export declare class AICodeInlineCompletionsProvider implements monaco.languages.InlineCompletionsProvider {
    protected readonly agent: CodeCompletionAgent;
    private readonly agentService;
    provideInlineCompletions(model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.InlineCompletionContext, token: monaco.CancellationToken): Promise<monaco.languages.InlineCompletions | undefined>;
    freeInlineCompletions(completions: monaco.languages.InlineCompletions<monaco.languages.InlineCompletion>): void;
}
//# sourceMappingURL=ai-code-inline-completion-provider.d.ts.map