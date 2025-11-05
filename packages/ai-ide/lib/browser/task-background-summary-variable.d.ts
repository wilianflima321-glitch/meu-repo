import { MaybePromise } from '@theia/core';
import { AIVariable, ResolvedAIVariable, AIVariableContribution, AIVariableService, AIVariableResolutionRequest, AIVariableContext, AIVariableResolverWithVariableDependencies, AIVariableArg } from '@theia/ai-core';
export declare const TASK_CONTEXT_SUMMARY_VARIABLE: AIVariable;
export declare class TaskContextSummaryVariableContribution implements AIVariableContribution, AIVariableResolverWithVariableDependencies {
    registerVariables(service: AIVariableService): void;
    canResolve(request: AIVariableResolutionRequest, context: AIVariableContext): MaybePromise<number>;
    resolve(request: AIVariableResolutionRequest, context: AIVariableContext, resolveDependency?: (variable: AIVariableArg) => Promise<ResolvedAIVariable | undefined>): Promise<ResolvedAIVariable | undefined>;
}
//# sourceMappingURL=task-background-summary-variable.d.ts.map