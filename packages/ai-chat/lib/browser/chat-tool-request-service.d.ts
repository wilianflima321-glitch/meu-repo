import { ToolRequest } from '@theia/ai-core';
import { ChatToolRequestService, ChatToolRequest } from '../common/chat-tool-request-service';
import { MutableChatRequestModel, ToolCallChatResponseContent } from '../common/chat-model';
import { ChatToolPreferences } from '../common/chat-tool-preferences';
import { ToolConfirmationManager } from './chat-tool-preference-bindings';
/**
 * Frontend-specific implementation of ChatToolRequestService that handles tool confirmation
 */
export declare class FrontendChatToolRequestService extends ChatToolRequestService {
    protected readonly confirmationManager: ToolConfirmationManager;
    protected readonly preferences: ChatToolPreferences;
    protected toChatToolRequest(toolRequest: ToolRequest, request: MutableChatRequestModel): ChatToolRequest;
    /**
     * Find existing tool call content or create a new one for confirmation tracking
     *
     * Looks for ToolCallChatResponseContent nodes where the name field matches the toolRequest id.
     * Starts from the back of the content array to find the most recent match.
     */
    protected findToolCallContent(toolRequest: ToolRequest, arguments_: string, request: MutableChatRequestModel): ToolCallChatResponseContent;
}
//# sourceMappingURL=chat-tool-request-service.d.ts.map