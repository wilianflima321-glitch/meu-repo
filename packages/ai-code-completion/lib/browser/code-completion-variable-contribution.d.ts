import { AIVariableContext, AIVariableResolutionRequest, AIVariableResolver, ResolvedAIVariable } from '@theia/ai-core';
import { FrontendVariableContribution, FrontendVariableService } from '@theia/ai-core/lib/browser';
import { MaybePromise, PreferenceService } from '@theia/core';
import { CodeCompletionVariableContext } from './code-completion-variable-context';
export declare class CodeCompletionVariableContribution implements FrontendVariableContribution, AIVariableResolver {
    protected preferences: PreferenceService;
    registerVariables(service: FrontendVariableService): void;
    canResolve(_request: AIVariableResolutionRequest, context: AIVariableContext): MaybePromise<number>;
    resolve(request: AIVariableResolutionRequest, context: AIVariableContext): Promise<ResolvedAIVariable | undefined>;
    protected resolvePrefix(context: CodeCompletionVariableContext): ResolvedAIVariable | undefined;
    protected resolveSuffix(context: CodeCompletionVariableContext): ResolvedAIVariable | undefined;
    protected resolveLanguage(context: CodeCompletionVariableContext): ResolvedAIVariable | undefined;
    protected resolveFile(context: CodeCompletionVariableContext): ResolvedAIVariable | undefined;
}
//# sourceMappingURL=code-completion-variable-contribution.d.ts.map