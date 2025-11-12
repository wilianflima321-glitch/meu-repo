import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ChatResponseContent, ToolCallChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
import { OpenerService } from '@theia/core/lib/browser';
import { ToolConfirmationMode } from '@theia/ai-chat/lib/common/chat-tool-preferences';
import { ResponseNode } from '../chat-tree-view';
import { ToolConfirmationManager } from '@theia/ai-chat/lib/browser/chat-tool-preference-bindings';
export declare class ToolCallPartRenderer implements ChatResponsePartRenderer<ToolCallChatResponseContent> {
    protected toolConfirmationManager: ToolConfirmationManager;
    protected openerService: OpenerService;
    canHandle(response: ChatResponseContent): number;
    render(response: ToolCallChatResponseContent, parentNode: ResponseNode): ReactNode;
    protected renderResult(response: ToolCallChatResponseContent): ReactNode;
    private tryParse;
    protected getToolConfirmationSettings(responseId: string, chatId: string): ToolConfirmationMode;
    protected renderCollapsibleArguments(args: string | undefined): ReactNode;
    private prettyPrintArgs;
}
//# sourceMappingURL=toolcall-part-renderer.d.ts.map