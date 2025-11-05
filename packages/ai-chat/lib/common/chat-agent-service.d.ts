import { ContributionProvider, ILogger } from '@theia/core';
import { ChatAgent } from './chat-agents';
import { AgentService } from '@theia/ai-core';
export declare const ChatAgentService: unique symbol;
export declare const ChatAgentServiceFactory: unique symbol;
/**
 * The ChatAgentService provides access to the available chat agents.
 */
export interface ChatAgentService {
    /**
     * Returns all available agents.
     */
    getAgents(): ChatAgent[];
    /**
     * Returns the specified agent, if available
     */
    getAgent(id: string): ChatAgent | undefined;
    /**
     * Returns all agents, including disabled ones.
     */
    getAllAgents(): ChatAgent[];
    /**
     * Allows to register a chat agent programmatically.
     * @param agent the agent to register
     */
    registerChatAgent(agent: ChatAgent): void;
    /**
     * Allows to unregister a chat agent programmatically.
     * @param agentId the agent id to unregister
     */
    unregisterChatAgent(agentId: string): void;
}
export declare class ChatAgentServiceImpl implements ChatAgentService {
    protected readonly agentContributions: ContributionProvider<ChatAgent>;
    protected logger: ILogger;
    protected agentService: AgentService;
    protected _agents: ChatAgent[];
    protected get agents(): ChatAgent[];
    registerChatAgent(agent: ChatAgent): void;
    unregisterChatAgent(agentId: string): void;
    getAgent(id: string): ChatAgent | undefined;
    getAgents(): ChatAgent[];
    getAllAgents(): ChatAgent[];
    private _agentIsEnabled;
}
//# sourceMappingURL=chat-agent-service.d.ts.map