/**
 * Minimal shim barrel for @theia/ai-chat/lib/common
 */

export * from './chat-agents';
export * from './chat-agent-service';
export * from './chat-tool-request-service';
export * from './chat-model';

export const DefaultChatAgentId: string;
export const FallbackChatAgentId: string;
