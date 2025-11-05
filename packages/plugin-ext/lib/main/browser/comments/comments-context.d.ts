import { ContextKeyService, ContextKey } from '@theia/core/lib/browser/context-key-service';
export declare class CommentsContext {
    protected readonly contextKeyService: ContextKeyService;
    protected readonly contextKeys: Set<string>;
    protected _commentIsEmpty: ContextKey<boolean>;
    protected _commentController: ContextKey<string | undefined>;
    protected _comment: ContextKey<string | undefined>;
    get commentController(): ContextKey<string | undefined>;
    get comment(): ContextKey<string | undefined>;
    get commentIsEmpty(): ContextKey<boolean>;
    protected init(): void;
}
//# sourceMappingURL=comments-context.d.ts.map