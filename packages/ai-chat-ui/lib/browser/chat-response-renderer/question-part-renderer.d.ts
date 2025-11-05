import { ChatResponseContent, QuestionResponseContent } from '@theia/ai-chat';
import { ReactNode } from '@theia/core/shared/react';
import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ResponseNode } from '../chat-tree-view';
export declare class QuestionPartRenderer implements ChatResponsePartRenderer<QuestionResponseContent> {
    canHandle(response: ChatResponseContent): number;
    render(question: QuestionResponseContent, node: ResponseNode): ReactNode;
}
//# sourceMappingURL=question-part-renderer.d.ts.map