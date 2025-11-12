import { MutableChatRequestModel, ChatResponseContent } from './chat-model';
export type ResponseContentFactory = (content: string, request: MutableChatRequestModel) => ChatResponseContent;
export declare const MarkdownContentFactory: ResponseContentFactory;
/**
 * Default response content factory used if no other `ResponseContentMatcher` applies.
 * By default, this factory creates a markdown content object.
 *
 * @see MarkdownChatResponseContentImpl
 */
export declare class DefaultResponseContentFactory {
    create(content: string, request: MutableChatRequestModel): ChatResponseContent;
}
/**
 * Clients can contribute response content matchers to parse a chat response into specific
 * `ChatResponseContent` instances.
 */
export interface ResponseContentMatcher {
    /** Regular expression for finding the start delimiter. */
    start: RegExp;
    /** Regular expression for finding the start delimiter. */
    end: RegExp;
    /**
     * The factory creating a response content from the matching content,
     * from start index to end index of the match (including delimiters).
     */
    contentFactory: ResponseContentFactory;
    /**
     * Optional factory for creating a response content when only the start delimiter has been matched,
     * but not yet the end delimiter. Used during streaming to provide better visual feedback.
     * If not provided, the default content factory will be used until the end delimiter is matched.
     */
    incompleteContentFactory?: ResponseContentFactory;
}
export declare const CodeContentMatcher: ResponseContentMatcher;
/**
 * Clients can contribute response content matchers to parse the response content.
 *
 * The default chat user interface will collect all contributed matchers and use them
 * to parse the response into structured content parts (e.g. code blocks, markdown blocks),
 * which are then rendered with a `ChatResponsePartRenderer` registered for the respective
 * content part type.
 *
 * ### Example
 * ```ts
 * bind(ResponseContentMatcherProvider).to(MyResponseContentMatcherProvider);
 * ...
 * @injectable()
 * export class MyResponseContentMatcherProvider implements ResponseContentMatcherProvider {
 *     readonly matchers: ResponseContentMatcher[] = [{
 *       start: /^<command>$/m,
 *       end: /^</command>$/m,
 *       contentFactory: (content: string) => {
 *         const command = content.replace(/^<command>\n|<\/command>$/g, '');
 *         return new MyChatResponseContentImpl(command.trim());
 *       }
 *   }];
 * }
 * ```
 *
 * @see ResponseContentMatcher
 */
export declare const ResponseContentMatcherProvider: unique symbol;
export interface ResponseContentMatcherProvider {
    readonly matchers: ResponseContentMatcher[];
}
export declare class DefaultResponseContentMatcherProvider implements ResponseContentMatcherProvider {
    readonly matchers: ResponseContentMatcher[];
}
//# sourceMappingURL=response-content-matcher.d.ts.map