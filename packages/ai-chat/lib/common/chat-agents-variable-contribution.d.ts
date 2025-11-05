import { MaybePromise } from '@theia/core';
import { AIVariable, AIVariableContext, AIVariableContribution, AIVariableResolutionRequest, AIVariableResolver, AIVariableService, ResolvedAIVariable } from '@theia/ai-core';
import { ChatAgentService } from './chat-agent-service';
export declare const CHAT_AGENTS_VARIABLE: AIVariable;
export interface ChatAgentDescriptor {
    id: string;
    name: string;
    description: string;
}
export declare class ChatAgentsVariableContribution implements AIVariableContribution, AIVariableResolver {
    protected readonly agents: ChatAgentService;
    registerVariables(service: AIVariableService): void;
    canResolve(request: AIVariableResolutionRequest, _context: AIVariableContext): MaybePromise<number>;
    resolve(request: AIVariableResolutionRequest, context: AIVariableContext): Promise<ResolvedAIVariable | undefined>;
    resolveAgentsVariable(_request: AIVariableResolutionRequest): ResolvedAIVariable;
}
//# sourceMappingURL=chat-agents-variable-contribution.d.ts.map