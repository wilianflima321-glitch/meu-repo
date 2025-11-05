import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ChatResponseContent, ErrorChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
export declare class ErrorPartRenderer implements ChatResponsePartRenderer<ErrorChatResponseContent> {
    canHandle(response: ChatResponseContent): number;
    render(response: ErrorChatResponseContent): ReactNode;
}
//# sourceMappingURL=error-part-renderer.d.ts.map