import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
export declare class TextPartRenderer implements ChatResponsePartRenderer<ChatResponseContent> {
    canHandle(_reponse: ChatResponseContent): number;
    render(response: ChatResponseContent): ReactNode;
}
//# sourceMappingURL=text-part-renderer.d.ts.map