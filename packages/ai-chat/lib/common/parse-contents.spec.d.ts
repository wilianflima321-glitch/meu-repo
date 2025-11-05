import { ChatResponseContent } from './chat-model';
import { ResponseContentMatcher } from './response-content-matcher';
export declare const TestCodeContentMatcher: ResponseContentMatcher;
export declare class CommandChatResponseContentImpl implements ChatResponseContent {
    readonly command: string;
    constructor(command: string);
    kind: string;
}
export declare const CommandContentMatcher: ResponseContentMatcher;
//# sourceMappingURL=parse-contents.spec.d.ts.map