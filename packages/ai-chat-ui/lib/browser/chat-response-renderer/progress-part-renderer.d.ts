import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ChatResponseContent, ProgressChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
export declare class ProgressPartRenderer implements ChatResponsePartRenderer<ProgressChatResponseContent> {
    canHandle(response: ChatResponseContent): number;
    render(response: ProgressChatResponseContent): ReactNode;
}
//# sourceMappingURL=progress-part-renderer.d.ts.map