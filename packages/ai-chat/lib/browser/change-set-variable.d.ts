import { MaybePromise } from '@theia/core';
import { AIVariable, ResolvedAIVariable, AIVariableContribution, AIVariableResolver, AIVariableService, AIVariableResolutionRequest, AIVariableContext } from '@theia/ai-core';
import { WorkspaceService } from '@theia/workspace/lib/browser';
export declare const CHANGE_SET_SUMMARY_VARIABLE: AIVariable;
export declare class ChangeSetVariableContribution implements AIVariableContribution, AIVariableResolver {
    protected readonly workspaceService: WorkspaceService;
    registerVariables(service: AIVariableService): void;
    canResolve(request: AIVariableResolutionRequest, context: AIVariableContext): MaybePromise<number>;
    resolve(request: AIVariableResolutionRequest, context: AIVariableContext): Promise<ResolvedAIVariable | undefined>;
}
//# sourceMappingURL=change-set-variable.d.ts.map