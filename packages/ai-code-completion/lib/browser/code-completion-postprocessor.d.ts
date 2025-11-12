import { PreferenceService } from '@theia/core/lib/common';
export interface CodeCompletionPostProcessor {
    postProcess(text: string): string;
}
export declare const CodeCompletionPostProcessor: unique symbol;
export declare class DefaultCodeCompletionPostProcessor {
    protected readonly preferenceService: PreferenceService;
    postProcess(text: string): string;
    stripBackticks(text: string): string;
}
//# sourceMappingURL=code-completion-postprocessor.d.ts.map