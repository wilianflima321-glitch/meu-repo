import { ResponseNode } from './chat-view-tree-widget';
import * as React from '@theia/core/shared/react';
import { ContributionProvider } from '@theia/core';
import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ChatNodeToolbarActionContribution } from '../chat-node-toolbar-action-contribution';
import { ChatResponseContent } from '@theia/ai-chat';
import { ContextMenuRenderer, TreeNode } from '@theia/core/lib/browser';
/**
 * Subset of the ChatViewTreeWidget used to render ResponseNodes for delegated prompts.
 */
export declare class SubChatWidget {
    protected readonly chatResponsePartRenderers: ContributionProvider<ChatResponsePartRenderer<ChatResponseContent>>;
    protected readonly chatNodeToolbarActionContributions: ContributionProvider<ChatNodeToolbarActionContribution>;
    contextMenuRenderer: ContextMenuRenderer;
    renderChatResponse(node: ResponseNode): React.ReactNode;
    protected getChatResponsePartRenderer(content: ChatResponseContent, node: ResponseNode): React.ReactNode;
    protected handleContextMenu(node: TreeNode | undefined, event: React.MouseEvent<HTMLElement>): void;
}
export declare const SubChatWidgetFactory: unique symbol;
export type SubChatWidgetFactory = () => SubChatWidget;
//# sourceMappingURL=sub-chat-widget.d.ts.map