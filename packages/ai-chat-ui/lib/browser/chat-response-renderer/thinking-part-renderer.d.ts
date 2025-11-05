import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ChatResponseContent, ThinkingChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
export declare class ThinkingPartRenderer implements ChatResponsePartRenderer<ThinkingChatResponseContent> {
    canHandle(response: ChatResponseContent): number;
    render(response: ThinkingChatResponseContent): ReactNode;
}
//# sourceMappingURL=thinking-part-renderer.d.ts.map