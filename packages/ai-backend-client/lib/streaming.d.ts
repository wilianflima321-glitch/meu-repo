import { LanguageModelStreamResponsePart, TokenUsageService } from '@theia/ai-core';
import type { ChatStreamChunk } from './index';
export interface BackendStreamContext {
    readonly modelId: string;
    readonly requestId?: string;
    readonly tokenUsageService?: TokenUsageService;
}
/**
 * Wraps the backend streaming payload and exposes it as a Theia language model iterator.
 */
export declare class BackendStreamingIterator implements AsyncIterableIterator<LanguageModelStreamResponsePart> {
    private readonly source;
    private readonly cleanup;
    private readonly context;
    private readonly queue;
    private finished;
    constructor(source: AsyncGenerator<ChatStreamChunk, void, unknown>, cleanup: () => void, context: BackendStreamContext);
    [Symbol.asyncIterator](): AsyncIterableIterator<LanguageModelStreamResponsePart>;
    next(): Promise<IteratorResult<LanguageModelStreamResponsePart>>;
    return(): Promise<IteratorResult<LanguageModelStreamResponsePart>>;
    private finish;
    private recordUsage;
}
//# sourceMappingURL=streaming.d.ts.map