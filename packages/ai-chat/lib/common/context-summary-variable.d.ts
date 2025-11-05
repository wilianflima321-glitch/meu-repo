import { MaybePromise } from '@theia/core';
import { AIVariable, ResolvedAIVariable, AIVariableContribution, AIVariableResolver, AIVariableService, AIVariableResolutionRequest, AIVariableContext } from '@theia/ai-core';
export declare const CONTEXT_SUMMARY_VARIABLE: AIVariable;
export declare class ContextSummaryVariableContribution implements AIVariableContribution, AIVariableResolver {
    registerVariables(service: AIVariableService): void;
    canResolve(request: AIVariableResolutionRequest, context: AIVariableContext): MaybePromise<number>;
    resolve(request: AIVariableResolutionRequest, context: AIVariableContext): Promise<ResolvedAIVariable | undefined>;
}
//# sourceMappingURL=context-summary-variable.d.ts.map