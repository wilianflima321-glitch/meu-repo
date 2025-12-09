import { injectable } from 'inversify';

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

@injectable()
export class SearchService {
    private currentSearch: string = '';
    private currentReplace: string = '';
    private options: SearchOptions = {
        caseSensitive: false,
        wholeWord: false,
        regex: false,
        preserveCase: false
    };
    private results: SearchResult[] = [];

    /**
     * Search in current file
     */
    async searchInFile(
        uri: string,
        content: string,
        searchTerm: string,
        options?: Partial<SearchOptions>
    ): Promise<SearchResult[]> {
        this.currentSearch = searchTerm;
        if (options) {
            this.options = { ...this.options, ...options };
        }

        const results: SearchResult[] = [];
        const lines = content.split('\n');
        
        const pattern = this.buildSearchPattern(searchTerm);
        
        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            const matches = this.findMatches(line, pattern);
            
            for (const match of matches) {
                results.push({
                    uri,
                    line: lineNum + 1,
                    column: match.index + 1,
                    length: match.length,
                    preview: this.getPreview(lines, lineNum),
                    matchText: match.text
                });
            }
        }

        this.results = results;
        return results;
    }

    /**
     * Search in workspace
     */
    async searchInWorkspace(
        searchTerm: string,
        options?: Partial<SearchOptions>,
        include?: string[],
        exclude?: string[]
    ): Promise<Map<string, SearchResult[]>> {
        this.currentSearch = searchTerm;
        if (options) {
            this.options = { ...this.options, ...options };
        }

        // Placeholder - actual implementation would search all files
        // This would integrate with workspace file system
        const resultsByFile = new Map<string, SearchResult[]>();
        
        return resultsByFile;
    }

    /**
     * Replace in current file
     */
    async replaceInFile(
        uri: string,
        content: string,
        searchTerm: string,
        replaceTerm: string,
        options?: Partial<SearchOptions>
    ): Promise<{ content: string; replacements: number }> {
        this.currentSearch = searchTerm;
        this.currentReplace = replaceTerm;
        if (options) {
            this.options = { ...this.options, ...options };
        }

        const pattern = this.buildSearchPattern(searchTerm);
        let replacements = 0;
        let newContent = content;

        if (this.options.regex) {
            const regex = new RegExp(pattern.source, pattern.flags + 'g');
            newContent = content.replace(regex, () => {
                replacements++;
                return replaceTerm;
            });
        } else {
            const parts = content.split(pattern);
            replacements = parts.length - 1;
            newContent = parts.join(replaceTerm);
        }

        return { content: newContent, replacements };
    }

    /**
     * Replace in workspace
     */
    async replaceInWorkspace(
        searchTerm: string,
        replaceTerm: string,
        options?: Partial<SearchOptions>,
        include?: string[],
        exclude?: string[]
    ): Promise<ReplaceResult[]> {
        this.currentSearch = searchTerm;
        this.currentReplace = replaceTerm;
        if (options) {
            this.options = { ...this.options, ...options };
        }

        // Placeholder - actual implementation would replace in all files
        const results: ReplaceResult[] = [];
        
        return results;
    }

    /**
     * Replace next occurrence
     */
    async replaceNext(
        uri: string,
        content: string,
        cursorLine: number,
        cursorColumn: number
    ): Promise<{ content: string; newCursorLine: number; newCursorColumn: number } | null> {
        if (!this.currentSearch || !this.currentReplace) {
            return null;
        }

        const pattern = this.buildSearchPattern(this.currentSearch);
        const lines = content.split('\n');
        
        // Find next match from cursor position
        for (let lineNum = cursorLine - 1; lineNum < lines.length; lineNum++) {
            const line = lines[lineNum];
            const startCol = lineNum === cursorLine - 1 ? cursorColumn - 1 : 0;
            const matches = this.findMatches(line.substring(startCol), pattern);
            
            if (matches.length > 0) {
                const match = matches[0];
                const actualCol = startCol + match.index;
                
                // Replace this occurrence
                const before = line.substring(0, actualCol);
                const after = line.substring(actualCol + match.length);
                lines[lineNum] = before + this.currentReplace + after;
                
                return {
                    content: lines.join('\n'),
                    newCursorLine: lineNum + 1,
                    newCursorColumn: actualCol + this.currentReplace.length + 1
                };
            }
        }

        return null;
    }

    /**
     * Get current search results
     */
    getResults(): SearchResult[] {
        return [...this.results];
    }

    /**
     * Get search options
     */
    getOptions(): SearchOptions {
        return { ...this.options };
    }

    /**
     * Set search options
     */
    setOptions(options: Partial<SearchOptions>): void {
        this.options = { ...this.options, ...options };
    }

    /**
     * Clear search results
     */
    clearResults(): void {
        this.results = [];
        this.currentSearch = '';
        this.currentReplace = '';
    }

    /**
     * Build search pattern from search term
     */
    private buildSearchPattern(searchTerm: string): RegExp {
        let pattern = searchTerm;
        let flags = 'g';

        if (!this.options.caseSensitive) {
            flags += 'i';
        }

        if (!this.options.regex) {
            // Escape special regex characters
            pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        if (this.options.wholeWord) {
            pattern = `\\b${pattern}\\b`;
        }

        return new RegExp(pattern, flags);
    }

    /**
     * Find all matches in a line
     */
    private findMatches(
        line: string,
        pattern: RegExp
    ): Array<{ index: number; length: number; text: string }> {
        const matches: Array<{ index: number; length: number; text: string }> = [];
        let match: RegExpExecArray | null;

        // Reset lastIndex for global regex
        pattern.lastIndex = 0;

        while ((match = pattern.exec(line)) !== null) {
            matches.push({
                index: match.index,
                length: match[0].length,
                text: match[0]
            });
            
            // Prevent infinite loop on zero-length matches
            if (match.index === pattern.lastIndex) {
                pattern.lastIndex++;
            }
        }

        return matches;
    }

    /**
     * Get preview text for search result
     */
    private getPreview(lines: string[], lineNum: number, contextLines: number = 0): string {
        const start = Math.max(0, lineNum - contextLines);
        const end = Math.min(lines.length, lineNum + contextLines + 1);
        
        return lines.slice(start, end).join('\n');
    }

    /**
     * Get search statistics
     */
    getStatistics(): {
        totalResults: number;
        filesWithResults: number;
        currentSearch: string;
        currentReplace: string;
        options: SearchOptions;
    } {
        const filesWithResults = new Set(this.results.map(r => r.uri)).size;

        return {
            totalResults: this.results.length,
            filesWithResults,
            currentSearch: this.currentSearch,
            currentReplace: this.currentReplace,
            options: { ...this.options }
        };
    }
}
