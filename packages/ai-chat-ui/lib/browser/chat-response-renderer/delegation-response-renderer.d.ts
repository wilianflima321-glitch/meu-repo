import { ChatResponseContent } from '@theia/ai-chat';
import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import * as React from '@theia/core/shared/react';
import { DelegationResponseContent } from '@theia/ai-chat/lib/browser/delegation-response-content';
import { ResponseNode } from '../chat-tree-view';
import { SubChatWidgetFactory } from '../chat-tree-view/sub-chat-widget';
export declare class DelegationResponseRenderer implements ChatResponsePartRenderer<DelegationResponseContent> {
    subChatWidgetFactory: SubChatWidgetFactory;
    canHandle(response: ChatResponseContent): number;
    render(response: DelegationResponseContent, parentNode: ResponseNode): React.ReactNode;
    private renderExpandableNode;
}
//# sourceMappingURL=delegation-response-renderer.d.ts.map