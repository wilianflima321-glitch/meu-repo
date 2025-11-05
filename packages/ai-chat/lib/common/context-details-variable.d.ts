import { MaybePromise } from '@theia/core';
import { AIVariable, ResolvedAIVariable, AIVariableContribution, AIVariableResolver, AIVariableService, AIVariableResolutionRequest, AIVariableContext } from '@theia/ai-core';
export declare const CONTEXT_DETAILS_VARIABLE: AIVariable;
export declare class ContextDetailsVariableContribution implements AIVariableContribution, AIVariableResolver {
    registerVariables(service: AIVariableService): void;
    canResolve(request: AIVariableResolutionRequest, context: AIVariableContext): MaybePromise<number>;
    resolve(request: AIVariableResolutionRequest, context: AIVariableContext): Promise<ResolvedAIVariable | undefined>;
}
//# sourceMappingURL=context-details-variable.d.ts.map