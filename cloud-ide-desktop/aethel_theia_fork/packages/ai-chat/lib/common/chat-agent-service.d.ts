/**
 * Minimal shim for @theia/ai-chat chat-agent-service
 */

export interface ChatAgent {
    id: string;
    name: string;
    invoke(request: any): Promise<void>;
}

export interface ChatAgentService {
    getAgent(id: string): ChatAgent | undefined;
    getAgents(): ChatAgent[];
}

export const ChatAgentService: unique symbol;
