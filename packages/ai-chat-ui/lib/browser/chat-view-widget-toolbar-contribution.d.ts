import { TabBarToolbarContribution, TabBarToolbarRegistry } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { AIChatContribution } from './ai-chat-ui-contribution';
import { Emitter, InMemoryResources } from '@theia/core';
import { CommandRegistry } from '@theia/core/lib/common/command';
import { MonacoEditorProvider } from '@theia/monaco/lib/browser/monaco-editor-provider';
import { AIActivationService } from '@theia/ai-core/lib/browser';
export declare class ChatViewWidgetToolbarContribution implements TabBarToolbarContribution {
    protected readonly chatContribution: AIChatContribution;
    protected readonly commandRegistry: CommandRegistry;
    protected readonly editorProvider: MonacoEditorProvider;
    protected readonly resources: InMemoryResources;
    protected readonly activationService: AIActivationService;
    protected readonly onChatWidgetStateChangedEmitter: Emitter<void>;
    protected readonly onChatWidgetStateChanged: import("@theia/core").Event<void>;
    private readonly sessionSettingsURI;
    protected init(): void;
    registerToolbarItems(registry: TabBarToolbarRegistry): void;
    protected openJsonDataDialog(): Promise<void>;
}
//# sourceMappingURL=chat-view-widget-toolbar-contribution.d.ts.map