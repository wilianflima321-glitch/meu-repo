import { StorageService } from '@theia/core/lib/browser';
/**
 * Manages navigation state for a single chat input widget.
 * Each widget has its own independent navigation state while sharing the same history.
 */
export declare class ChatInputNavigationState {
    private readonly historyService;
    private currentIndex;
    private preservedInput?;
    private isNavigating;
    constructor(historyService: ChatInputHistoryService);
    getPreviousPrompt(currentInput: string): string | undefined;
    getNextPrompt(): string | undefined;
    stopNavigation(): void;
}
/**
 * Manages shared prompt history across all chat input widgets.
 * Each prompt is stored only once and shared between all chat inputs.
 */
export declare class ChatInputHistoryService {
    protected readonly storageService: StorageService;
    protected history: string[];
    init(): Promise<void>;
    /**
     * Get read-only access to the current prompt history.
     */
    getPrompts(): readonly string[];
    clearHistory(): void;
    addToHistory(prompt: string): void;
    protected persistHistory(): Promise<void>;
}
//# sourceMappingURL=chat-input-history.d.ts.map