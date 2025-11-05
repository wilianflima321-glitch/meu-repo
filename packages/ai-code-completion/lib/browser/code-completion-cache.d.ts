import * as monaco from '@theia/monaco-editor-core';
export declare class CodeCompletionCache {
    private cache;
    private maxSize;
    constructor();
    /**
     * Generate a unique cache key for code completion based on the file path, cursor position, and the hashed context (prefix and suffix).
     * The prefix and suffix are hashed to avoid storing large or sensitive content directly in the cache key.
     *
     * @param filePath Path of the current file
     * @param model Monaco text model of the file
     * @param position Current cursor position in the editor
     * @returns Unique cache key as a string
     */
    generateKey(filePath: string, model: monaco.editor.ITextModel, position: monaco.Position): string;
    /**
     * Hash a string using a simple hash algorithm (FNV-1a 32-bit).
     * This is not cryptographically secure but is sufficient for cache key uniqueness.
     * @param str The string to hash
     * @returns The hash as a hex string
     */
    private static hashString;
    /**
     * Get a cached completion if available
     * @param key Cache key
     * @returns Cached completion or undefined
     */
    get(key: string): monaco.languages.InlineCompletions | undefined;
    /**
     * Store a completion in the cache
     * @param key Cache key
     * @param value Completion value to cache
     */
    put(key: string, value: monaco.languages.InlineCompletions | undefined): void;
    /**
     * Clear the entire cache
     */
    clear(): void;
    /**
     * Remove the least recently used entry from the cache
     */
    private removeLeastRecentlyUsed;
    /**
     * Set the maximum cache size
     * @param size New maximum cache size
     */
    setMaxSize(size: number): void;
}
//# sourceMappingURL=code-completion-cache.d.ts.map