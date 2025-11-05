import { Command, CommandContribution, CommandRegistry, CommandService, MenuContribution, MenuModelRegistry } from '@theia/core';
import { ClipboardService } from '@theia/core/lib/browser/clipboard-service';
import { RequestNode, ResponseNode } from './chat-tree-view/chat-view-tree-widget';
import { AICommandHandlerFactory } from '@theia/ai-core/lib/browser';
export declare namespace ChatViewCommands {
    const COPY_MESSAGE: Command;
    const COPY_ALL: Command;
    const COPY_CODE: Command;
    const EDIT: Command;
}
export declare class ChatViewMenuContribution implements MenuContribution, CommandContribution {
    protected readonly clipboardService: ClipboardService;
    protected readonly commandService: CommandService;
    protected readonly commandHandlerFactory: AICommandHandlerFactory;
    registerCommands(commands: CommandRegistry): void;
    protected copyMessage(args: (RequestNode | ResponseNode)[]): void;
    protected getCopyTextAndJoin(args: (RequestNode | ResponseNode)[] | undefined): string;
    protected getCopyText(arg: RequestNode | ResponseNode): string;
    registerMenus(menus: MenuModelRegistry): void;
}
//# sourceMappingURL=chat-view-contribution.d.ts.map