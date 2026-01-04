/**
 * Minimal shim for @theia/ai-chat chat-tool-request-service
 */

export interface ChatToolRequest {
    id?: string;
    name?: string;
    arguments?: any;
}
