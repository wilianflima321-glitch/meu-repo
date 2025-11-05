import { Command } from '@theia/core';
import { RequestNode, ResponseNode } from './chat-tree-view';
export interface ChatNodeToolbarAction {
    /**
     * The command to execute when the item is selected. The handler will receive the `RequestNode` or `ResponseNode` as first argument.
     */
    commandId: string;
    /**
     * Icon class name(s) for the item (e.g. 'codicon codicon-feedback').
     */
    icon: string;
    /**
     * Priority among the items. Can be negative. The smaller the number the left-most the item will be placed in the toolbar. It is `0` by default.
     */
    priority?: number;
    /**
     * Optional tooltip for the item.
     */
    tooltip?: string;
}
/**
 * Clients implement this interface if they want to contribute to the toolbar of chat nodes.
 *
 * ### Example
 * ```ts
 * bind(ChatNodeToolbarActionContribution).toDynamicValue(context => ({
 *  getToolbarActions: (args: RequestNode | ResponseNode) => {
 *      if (isResponseNode(args)) {
 *          return [{
 *              commandId: 'core.about',
 *              icon: 'codicon codicon-feedback',
 *              tooltip: 'Show about dialog on response nodes'
 *          }];
 *      } else {
 *          return [];
 *      }
 *  }
 * }));
 * ```
 */
export declare const ChatNodeToolbarActionContribution: unique symbol;
export interface ChatNodeToolbarActionContribution {
    /**
     * Returns the toolbar actions for the given node.
     */
    getToolbarActions(node: RequestNode | ResponseNode): ChatNodeToolbarAction[];
}
export declare namespace ChatNodeToolbarCommands {
    const EDIT: Command;
    const CANCEL: Command;
    const RETRY: Command;
}
export declare class DefaultChatNodeToolbarActionContribution implements ChatNodeToolbarActionContribution {
    getToolbarActions(node: RequestNode | ResponseNode): ChatNodeToolbarAction[];
}
//# sourceMappingURL=chat-node-toolbar-action-contribution.d.ts.map