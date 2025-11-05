import { AIVariableContext } from '@theia/ai-core';
import * as monaco from '@theia/monaco-editor-core';
export interface CodeCompletionVariableContext {
    model: monaco.editor.ITextModel;
    position: monaco.Position;
    context: monaco.languages.InlineCompletionContext;
}
export declare namespace CodeCompletionVariableContext {
    function is(context: AIVariableContext): context is CodeCompletionVariableContext;
}
//# sourceMappingURL=code-completion-variable-context.d.ts.map