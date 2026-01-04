/**
 * Search and Replace Service
 * Professional search/replace with accessible UI
 */
export interface SearchOptions {
    caseSensitive: boolean;
    wholeWord: boolean;
    regex: boolean;
    preserveCase: boolean;
}
export interface SearchResult {
    uri: string;
    line: number;
    column: number;
    length: number;
    preview: string;
    matchText: string;
}
export interface ReplaceResult {
    uri: string;
    replacements: number;
    success: boolean;
    error?: string;
}
export declare class SearchService {
    private currentSearch;
    private currentReplace;
    private options;
    private results;
    /**
     * Search in current file
     */
    searchInFile(uri: string, content: string, searchTerm: string, options?: Partial<SearchOptions>): Promise<SearchResult[]>;
    /**
     * Search in workspace
     */
    searchInWorkspace(searchTerm: string, options?: Partial<SearchOptions>, include?: string[], exclude?: string[]): Promise<Map<string, SearchResult[]>>;
    /**
     * Replace in current file
     */
    replaceInFile(uri: string, content: string, searchTerm: string, replaceTerm: string, options?: Partial<SearchOptions>): Promise<{
        content: string;
        replacements: number;
    }>;
    /**
     * Replace in workspace
     */
    replaceInWorkspace(searchTerm: string, replaceTerm: string, options?: Partial<SearchOptions>, include?: string[], exclude?: string[]): Promise<ReplaceResult[]>;
    /**
     * Replace next occurrence
     */
    replaceNext(uri: string, content: string, cursorLine: number, cursorColumn: number): Promise<{
        content: string;
        newCursorLine: number;
        newCursorColumn: number;
    } | null>;
    /**
     * Get current search results
     */
    getResults(): SearchResult[];
    /**
     * Get search options
     */
    getOptions(): SearchOptions;
    /**
     * Set search options
     */
    setOptions(options: Partial<SearchOptions>): void;
    /**
     * Clear search results
     */
    clearResults(): void;
    /**
     * Build search pattern from search term
     */
    private buildSearchPattern;
    /**
     * Find all matches in a line
     */
    private findMatches;
    /**
     * Get preview text for search result
     */
    private getPreview;
    /**
     * Get search statistics
     */
    getStatistics(): {
        totalResults: number;
        filesWithResults: number;
        currentSearch: string;
        currentReplace: string;
        options: SearchOptions;
    };
}
