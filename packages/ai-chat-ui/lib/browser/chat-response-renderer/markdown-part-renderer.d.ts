import { ChatResponsePartRenderer } from '../chat-response-part-renderer';
import { ChatResponseContent, InformationalChatResponseContent, MarkdownChatResponseContent } from '@theia/ai-chat/lib/common';
import { ReactNode } from '@theia/core/shared/react';
import * as React from '@theia/core/shared/react';
import * as markdownit from '@theia/core/shared/markdown-it';
import { MarkdownString } from '@theia/core/lib/common/markdown-rendering';
import { OpenerService } from '@theia/core/lib/browser';
export declare class MarkdownPartRenderer implements ChatResponsePartRenderer<MarkdownChatResponseContent | InformationalChatResponseContent> {
    protected readonly openerService: OpenerService;
    protected readonly markdownIt: markdownit;
    canHandle(response: ChatResponseContent): number;
    render(response: MarkdownChatResponseContent | InformationalChatResponseContent): ReactNode;
}
export interface DeclaredEventsEventListenerObject extends EventListenerObject {
    handledEvents?: (keyof HTMLElementEventMap)[];
}
/**
 * This hook uses markdown-it directly to render markdown.
 * The reason to use markdown-it directly is that the MarkdownRenderer is
 * overridden by theia with a monaco version. This monaco version strips all html
 * tags from the markdown with empty content. This leads to unexpected behavior when
 * rendering markdown with html tags.
 *
 * Moreover, we want to intercept link clicks to use the Theia OpenerService instead of the default browser behavior.
 *
 * @param markdown the string to render as markdown
 * @param skipSurroundingParagraph whether to remove a surrounding paragraph element (default: false)
 * @param openerService the service to handle link opening
 * @param eventHandler `handleEvent` will be called by default for `click` events and additionally
 * for all events enumerated in {@link DeclaredEventsEventListenerObject.handledEvents}. If `handleEvent` returns `true`,
 * no additional handlers will be run for the event.
 * @returns the ref to use in an element to render the markdown
 */
export declare const useMarkdownRendering: (markdown: string | MarkdownString, openerService: OpenerService, skipSurroundingParagraph?: boolean, eventHandler?: DeclaredEventsEventListenerObject) => React.MutableRefObject<HTMLDivElement | null>;
//# sourceMappingURL=markdown-part-renderer.d.ts.map