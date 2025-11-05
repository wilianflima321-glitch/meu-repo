import { ToolProvider, ToolRequest } from '@theia/ai-core';
import { ChatAgentService, ChatService } from '../common';
export declare const AGENT_DELEGATION_FUNCTION_ID = "delegateToAgent";
export declare class AgentDelegationTool implements ToolProvider {
    static ID: string;
    protected readonly getChatAgentService: () => ChatAgentService;
    protected readonly getChatService: () => ChatService;
    getTool(): ToolRequest;
    private delegateToAgent;
    /**
     * Sets up monitoring of the ChangeSet in the delegated session and bubbles changes to the parent session.
     * @param delegatedSession The session created for the delegated agent
     * @param parentModel The parent session model that should receive the bubbled changes
     * @param agentName The name of the agent for attribution purposes
     */
    private setupChangeSetBubbling;
    /**
     * Bubbles the ChangeSet from the delegated session to the parent session.
     * @param delegatedSession The session from which to bubble changes
     * @param parentModel The parent session model to receive the bubbled changes
     * @param agentName The name of the agent for attribution purposes
     */
    private bubbleChangeSet;
}
//# sourceMappingURL=agent-delegation-tool.d.ts.map