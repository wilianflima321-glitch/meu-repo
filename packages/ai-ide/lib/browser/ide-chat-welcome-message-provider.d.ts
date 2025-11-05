import { ChatWelcomeMessageProvider } from '@theia/ai-chat-ui/lib/browser/chat-tree-view';
import * as React from '@theia/core/shared/react';
import { CommandRegistry } from '@theia/core';
export declare class IdeChatWelcomeMessageProvider implements ChatWelcomeMessageProvider {
    protected commandRegistry: CommandRegistry;
    renderWelcomeMessage?(): React.ReactNode;
    renderDisabledMessage?(): React.ReactNode;
    protected renderLinkButton(title: string, openCommandId: string, ...commandArgs: unknown[]): React.ReactNode;
}
//# sourceMappingURL=ide-chat-welcome-message-provider.d.ts.map