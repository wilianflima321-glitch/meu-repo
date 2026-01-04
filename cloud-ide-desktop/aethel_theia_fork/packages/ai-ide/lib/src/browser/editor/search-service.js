"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const inversify_1 = require("inversify");
let SearchService = class SearchService {
    constructor() {
        this.currentSearch = '';
        this.currentReplace = '';
        this.options = {
            caseSensitive: false,
            wholeWord: false,
            regex: false,
            preserveCase: false
        };
        this.results = [];
    }
    /**
     * Search in current file
     */
    async searchInFile(uri, content, searchTerm, options) {
        this.currentSearch = searchTerm;
        if (options) {
            this.options = { ...this.options, ...options };
        }
        const results = [];
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
    async searchInWorkspace(searchTerm, options, include, exclude) {
        this.currentSearch = searchTerm;
        if (options) {
            this.options = { ...this.options, ...options };
        }
        // Placeholder - actual implementation would search all files
        // This would integrate with workspace file system
        const resultsByFile = new Map();
        return resultsByFile;
    }
    /**
     * Replace in current file
     */
    async replaceInFile(uri, content, searchTerm, replaceTerm, options) {
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
        }
        else {
            const parts = content.split(pattern);
            replacements = parts.length - 1;
            newContent = parts.join(replaceTerm);
        }
        return { content: newContent, replacements };
    }
    /**
     * Replace in workspace
     */
    async replaceInWorkspace(searchTerm, replaceTerm, options, include, exclude) {
        this.currentSearch = searchTerm;
        this.currentReplace = replaceTerm;
        if (options) {
            this.options = { ...this.options, ...options };
        }
        // Placeholder - actual implementation would replace in all files
        const results = [];
        return results;
    }
    /**
     * Replace next occurrence
     */
    async replaceNext(uri, content, cursorLine, cursorColumn) {
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
    getResults() {
        return [...this.results];
    }
    /**
     * Get search options
     */
    getOptions() {
        return { ...this.options };
    }
    /**
     * Set search options
     */
    setOptions(options) {
        this.options = { ...this.options, ...options };
    }
    /**
     * Clear search results
     */
    clearResults() {
        this.results = [];
        this.currentSearch = '';
        this.currentReplace = '';
    }
    /**
     * Build search pattern from search term
     */
    buildSearchPattern(searchTerm) {
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
    findMatches(line, pattern) {
        const matches = [];
        let match;
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
    getPreview(lines, lineNum, contextLines = 0) {
        const start = Math.max(0, lineNum - contextLines);
        const end = Math.min(lines.length, lineNum + contextLines + 1);
        return lines.slice(start, end).join('\n');
    }
    /**
     * Get search statistics
     */
    getStatistics() {
        const filesWithResults = new Set(this.results.map(r => r.uri)).size;
        return {
            totalResults: this.results.length,
            filesWithResults,
            currentSearch: this.currentSearch,
            currentReplace: this.currentReplace,
            options: { ...this.options }
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, inversify_1.injectable)()
], SearchService);
