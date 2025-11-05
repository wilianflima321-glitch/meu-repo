import { MutableChatRequestModel, ChatResponseContent } from './chat-model';
import { ResponseContentFactory, ResponseContentMatcher } from './response-content-matcher';
interface Match {
    matcher: ResponseContentMatcher;
    index: number;
    content: string;
    isComplete: boolean;
}
export declare function parseContents(text: string, request: MutableChatRequestModel, contentMatchers?: ResponseContentMatcher[], defaultContentFactory?: ResponseContentFactory): ChatResponseContent[];
export declare function findFirstMatch(contentMatchers: ResponseContentMatcher[], text: string): Match | undefined;
export {};
//# sourceMappingURL=parse-contents.d.ts.map