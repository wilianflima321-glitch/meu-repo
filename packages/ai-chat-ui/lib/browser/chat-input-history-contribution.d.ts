import { CommandContribution, CommandRegistry } from '@theia/core';
import { ApplicationShell, KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser';
import { AIChatInputWidget } from './chat-input-widget';
import { ChatInputHistoryService } from './chat-input-history';
export declare class ChatInputHistoryContribution implements CommandContribution, KeybindingContribution {
    protected readonly shell: ApplicationShell;
    protected readonly historyService: ChatInputHistoryService;
    registerCommands(commands: CommandRegistry): void;
    registerKeybindings(keybindings: KeybindingRegistry): void;
    protected executeNavigatePrevious(): void;
    protected executeNavigateNext(): void;
    protected positionCursorAtEnd(widget: AIChatInputWidget): void;
    protected findFocusedChatInput(): AIChatInputWidget | undefined;
    protected isNavigationEnabled(): boolean;
}
//# sourceMappingURL=chat-input-history-contribution.d.ts.map