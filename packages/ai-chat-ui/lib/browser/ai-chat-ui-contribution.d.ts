import { CommandRegistry, MessageService, QuickInputButton, QuickInputService, QuickPickItem } from '@theia/core';
import { Widget } from '@theia/core/lib/browser';
import { ChatAgent, ChatService } from '@theia/ai-chat';
import { ChatAgentService } from '@theia/ai-chat/lib/common/chat-agent-service';
import { EditorManager } from '@theia/editor/lib/browser/editor-manager';
import { AbstractViewContribution } from '@theia/core/lib/browser/shell/view-contribution';
import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { ChatViewWidget } from './chat-view-widget';
import { SecondaryWindowHandler } from '@theia/core/lib/browser/secondary-window-handler';
import { AIActivationService } from '@theia/ai-core/lib/browser';
import { TaskContextService } from '@theia/ai-chat/lib/browser/task-context-service';
export declare const AI_CHAT_TOGGLE_COMMAND_ID = "aiChat:toggle";
export declare class AIChatContribution extends AbstractViewContribution<ChatViewWidget> implements TabBarToolbarContribution {
    protected readonly chatService: ChatService;
    protected readonly quickInputService: QuickInputService;
    protected readonly taskContextService: TaskContextService;
    protected readonly messageService: MessageService;
    protected readonly chatAgentService: ChatAgentService;
    protected readonly editorManager: EditorManager;
    protected readonly activationService: AIActivationService;
    protected static readonly RENAME_CHAT_BUTTON: QuickInputButton;
    protected static readonly REMOVE_CHAT_BUTTON: QuickInputButton;
    protected readonly secondaryWindowHandler: SecondaryWindowHandler;
    constructor();
    initialize(): void;
    registerCommands(registry: CommandRegistry): void;
    registerToolbarItems(registry: TabBarToolbarRegistry): void;
    protected selectChat(sessionId?: string): Promise<void>;
    protected askForChatSession(): Promise<QuickPickItem | undefined>;
    protected withWidget(widget?: Widget | undefined, predicate?: (output: ChatViewWidget) => boolean): boolean | false;
    protected extractChatView(chatView: ChatViewWidget): void;
    canExtractChatView(chatView: ChatViewWidget): boolean;
    protected summarizeActiveSession(): Promise<string | undefined>;
    /**
     * Prompts the user to select a chat agent
     * @returns The selected agent or undefined if cancelled
     */
    /**
     * Prompts the user to select a chat agent with an optional default (pre-selected) agent.
     * @param defaultAgentId The id of the agent to pre-select, if present
     * @returns The selected agent or undefined if cancelled
     */
    protected selectAgent(defaultAgentId?: string): Promise<ChatAgent | undefined>;
    /**
     * Prompts the user to select a task context with special marking for currently opened files
     * @returns The selected task context ID or undefined if cancelled
     */
    protected selectTaskContextWithMarking(): Promise<string | undefined>;
    /**
     * Returns information about task context files that are currently opened
     * @returns Object with arrays of opened context IDs and the active context ID
     */
    protected getOpenedTaskContextFiles(): {
        openedIds: string[];
        activeId?: string;
    };
}
//# sourceMappingURL=ai-chat-ui-contribution.d.ts.map