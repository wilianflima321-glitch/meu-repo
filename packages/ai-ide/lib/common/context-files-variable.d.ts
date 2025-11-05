import { MaybePromise } from '@theia/core';
import { AIVariable, ResolvedAIVariable, AIVariableContribution, AIVariableResolver, AIVariableService, AIVariableResolutionRequest, AIVariableContext } from '@theia/ai-core';
export declare const CONTEXT_FILES_VARIABLE: AIVariable;
export declare class ContextFilesVariableContribution implements AIVariableContribution, AIVariableResolver {
    registerVariables(service: AIVariableService): void;
    canResolve(request: AIVariableResolutionRequest, context: AIVariableContext): MaybePromise<number>;
    resolve(request: AIVariableResolutionRequest, context: AIVariableContext): Promise<ResolvedAIVariable | undefined>;
}
//# sourceMappingURL=context-files-variable.d.ts.map