import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ChatResponseContent, HorizontalLayoutChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
import { ContributionProvider } from '@theia/core';
import { ResponseNode } from '../chat-tree-view/chat-view-tree-widget';
export declare class HorizontalLayoutPartRenderer implements ChatResponsePartRenderer<ChatResponseContent> {
    protected readonly chatResponsePartRenderers: ContributionProvider<ChatResponsePartRenderer<ChatResponseContent>>;
    canHandle(response: ChatResponseContent): number;
    render(response: HorizontalLayoutChatResponseContent, parentNode: ResponseNode): ReactNode;
}
//# sourceMappingURL=horizontal-layout-part-renderer.d.ts.map