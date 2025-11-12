// Base class for all AI agents

export interface AgentMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: Record<string, unknown>;
}

export interface AgentRequest {
    messages: AgentMessage[];
    contextRefs?: string[];
    tools?: string[];
    workspaceUri?: string;
}

export interface AgentResponse {
    agentId: string;
    content: string;
    metadata?: {
        tokensUsed?: number;
        model?: string;
        cost?: number;
        [key: string]: unknown;
    };
    error?: string;
}

export interface AgentContext {
    preferredProvider?: string;
    workspaceUri?: string;
    userId?: string;
    sessionId?: string;
}

export abstract class Agent {
    constructor(
        public readonly id: string,
        public readonly name: string,
        protected readonly providerService: any,
        protected readonly memoryService?: any
    ) {}

    abstract invoke(
        request: AgentRequest,
        context: AgentContext
    ): Promise<AgentResponse>;

    protected async remember(key: string, value: any): Promise<void> {
        if (this.memoryService) {
            await this.memoryService.store(key, value);
        }
    }

    protected async recall(query: string, k: number = 5): Promise<any[]> {
        if (this.memoryService) {
            return await this.memoryService.search(query, k);
        }
        return [];
    }
}
