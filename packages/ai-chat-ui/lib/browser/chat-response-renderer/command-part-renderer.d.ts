import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ChatResponseContent, CommandChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
export declare class CommandPartRenderer implements ChatResponsePartRenderer<CommandChatResponseContent> {
    private commandService;
    private commandRegistry;
    canHandle(response: ChatResponseContent): number;
    render(response: CommandChatResponseContent): ReactNode;
    private onCommand;
}
//# sourceMappingURL=command-part-renderer.d.ts.map