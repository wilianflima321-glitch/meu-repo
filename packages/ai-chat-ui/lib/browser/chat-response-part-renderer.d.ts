import { ChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
import { ResponseNode } from './chat-tree-view/chat-view-tree-widget';
export declare const ChatResponsePartRenderer: unique symbol;
export interface ChatResponsePartRenderer<T extends ChatResponseContent> {
    canHandle(response: ChatResponseContent): number;
    render(response: T, parentNode: ResponseNode): ReactNode;
}
//# sourceMappingURL=chat-response-part-renderer.d.ts.map