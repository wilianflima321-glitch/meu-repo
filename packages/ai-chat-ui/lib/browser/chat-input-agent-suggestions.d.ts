import * as React from '@theia/core/shared/react';
import { OpenerService } from '@theia/core/lib/browser';
import { ChatSuggestion } from '@theia/ai-chat';
interface ChatInputAgentSuggestionsProps {
    suggestions: readonly ChatSuggestion[];
    opener: OpenerService;
}
export declare const ChatInputAgentSuggestions: React.FC<ChatInputAgentSuggestionsProps>;
export {};
//# sourceMappingURL=chat-input-agent-suggestions.d.ts.map