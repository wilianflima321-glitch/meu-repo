import { ChatAgent, ChatAgentLocation, ChatServiceImpl, ChatSession, ParsedChatRequest, SessionOptions } from '../common';
import { PreferenceService } from '@theia/core/lib/common';
import { ChangeSetFileService } from './change-set-file-service';
/**
 * Customizes the ChatServiceImpl to consider preference based default chat agent
 */
export declare class FrontendChatServiceImpl extends ChatServiceImpl {
    protected readonly preferenceService: PreferenceService;
    protected readonly changeSetFileService: ChangeSetFileService;
    protected isPinChatAgentEnabled(): boolean;
    protected initialAgentSelection(parsedRequest: ParsedChatRequest): ChatAgent | undefined;
    protected getConfiguredDefaultChatAgent(): ChatAgent | undefined;
    createSession(location?: ChatAgentLocation, options?: SessionOptions, pinnedAgent?: ChatAgent): ChatSession;
}
//# sourceMappingURL=frontend-chat-service.d.ts.map