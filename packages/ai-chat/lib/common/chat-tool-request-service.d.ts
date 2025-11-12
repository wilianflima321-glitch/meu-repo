import { ToolRequest } from '@theia/ai-core';
import { MutableChatRequestModel } from './chat-model';
export interface ChatToolRequest extends ToolRequest {
    handler(arg_string: string, context: MutableChatRequestModel): ReturnType<ToolRequest['handler']>;
    handler(arg_string: string, ctx?: unknown): ReturnType<ToolRequest['handler']>;
}
/**
 * Wraps tool requests in a chat context.
 *
 * This service extracts tool requests from a given chat request model and wraps their
 * handler functions to provide additional context, such as the chat request model.
 */
export declare class ChatToolRequestService {
    getChatToolRequests(request: MutableChatRequestModel): ChatToolRequest[];
    toChatToolRequests(toolRequests: ToolRequest[] | undefined, request: MutableChatRequestModel): ChatToolRequest[];
    protected toChatToolRequest(toolRequest: ToolRequest, request: MutableChatRequestModel): ChatToolRequest;
}
//# sourceMappingURL=chat-tool-request-service.d.ts.map