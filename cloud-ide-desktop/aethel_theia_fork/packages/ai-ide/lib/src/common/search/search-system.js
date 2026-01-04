"use strict";
/**
 * Search System - Professional Global Search Infrastructure
 *
 * Sistema de busca global profissional para IDE de produção.
 * Inspirado em VS Code, JetBrains, Unreal Engine.
 * Suporta:
 * - Busca em arquivos (texto completo)
 * - Busca de símbolos (código)
 * - Busca de assets (3D, texturas, áudio)
 * - Busca de comandos
 * - Busca de configurações
 * - Busca semântica (AI-powered)
 * - Filtros avançados
 * - Histórico de buscas
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchSystem = exports.AssetType = exports.SymbolKind = exports.SearchResultType = exports.SearchDomain = void 0;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                }
            };
        };
    }
    fire(event) {
        this.listeners.forEach(l => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Search Types ====================
/**
 * Search domain
 */
var SearchDomain;
(function (SearchDomain) {
    SearchDomain["Files"] = "files";
    SearchDomain["Text"] = "text";
    SearchDomain["Symbols"] = "symbols";
    SearchDomain["Assets"] = "assets";
    SearchDomain["Commands"] = "commands";
    SearchDomain["Settings"] = "settings";
    SearchDomain["Help"] = "help";
    SearchDomain["References"] = "references";
    SearchDomain["Definitions"] = "definitions";
    SearchDomain["All"] = "all";
})(SearchDomain || (exports.SearchDomain = SearchDomain = {}));
/**
 * Search result type
 */
var SearchResultType;
(function (SearchResultType) {
    SearchResultType["File"] = "file";
    SearchResultType["TextMatch"] = "text-match";
    SearchResultType["Symbol"] = "symbol";
    SearchResultType["Asset"] = "asset";
    SearchResultType["Command"] = "command";
    SearchResultType["Setting"] = "setting";
    SearchResultType["HelpArticle"] = "help-article";
    SearchResultType["Reference"] = "reference";
    SearchResultType["Definition"] = "definition";
    SearchResultType["Suggestion"] = "suggestion";
})(SearchResultType || (exports.SearchResultType = SearchResultType = {}));
/**
 * Symbol kind
 */
var SymbolKind;
(function (SymbolKind) {
    SymbolKind[SymbolKind["File"] = 0] = "File";
    SymbolKind[SymbolKind["Module"] = 1] = "Module";
    SymbolKind[SymbolKind["Namespace"] = 2] = "Namespace";
    SymbolKind[SymbolKind["Package"] = 3] = "Package";
    SymbolKind[SymbolKind["Class"] = 4] = "Class";
    SymbolKind[SymbolKind["Method"] = 5] = "Method";
    SymbolKind[SymbolKind["Property"] = 6] = "Property";
    SymbolKind[SymbolKind["Field"] = 7] = "Field";
    SymbolKind[SymbolKind["Constructor"] = 8] = "Constructor";
    SymbolKind[SymbolKind["Enum"] = 9] = "Enum";
    SymbolKind[SymbolKind["Interface"] = 10] = "Interface";
    SymbolKind[SymbolKind["Function"] = 11] = "Function";
    SymbolKind[SymbolKind["Variable"] = 12] = "Variable";
    SymbolKind[SymbolKind["Constant"] = 13] = "Constant";
    SymbolKind[SymbolKind["String"] = 14] = "String";
    SymbolKind[SymbolKind["Number"] = 15] = "Number";
    SymbolKind[SymbolKind["Boolean"] = 16] = "Boolean";
    SymbolKind[SymbolKind["Array"] = 17] = "Array";
    SymbolKind[SymbolKind["Object"] = 18] = "Object";
    SymbolKind[SymbolKind["Key"] = 19] = "Key";
    SymbolKind[SymbolKind["Null"] = 20] = "Null";
    SymbolKind[SymbolKind["EnumMember"] = 21] = "EnumMember";
    SymbolKind[SymbolKind["Struct"] = 22] = "Struct";
    SymbolKind[SymbolKind["Event"] = 23] = "Event";
    SymbolKind[SymbolKind["Operator"] = 24] = "Operator";
    SymbolKind[SymbolKind["TypeParameter"] = 25] = "TypeParameter";
    SymbolKind[SymbolKind["Component"] = 26] = "Component";
    SymbolKind[SymbolKind["Actor"] = 27] = "Actor";
    SymbolKind[SymbolKind["Material"] = 28] = "Material";
    SymbolKind[SymbolKind["Texture"] = 29] = "Texture";
    SymbolKind[SymbolKind["Sound"] = 30] = "Sound";
    SymbolKind[SymbolKind["Animation"] = 31] = "Animation";
    SymbolKind[SymbolKind["Blueprint"] = 32] = "Blueprint";
})(SymbolKind || (exports.SymbolKind = SymbolKind = {}));
/**
 * Asset type
 */
var AssetType;
(function (AssetType) {
    AssetType["Model3D"] = "3d-model";
    AssetType["Texture"] = "texture";
    AssetType["Material"] = "material";
    AssetType["Audio"] = "audio";
    AssetType["Video"] = "video";
    AssetType["Animation"] = "animation";
    AssetType["Particle"] = "particle";
    AssetType["Font"] = "font";
    AssetType["Script"] = "script";
    AssetType["Scene"] = "scene";
    AssetType["Prefab"] = "prefab";
    AssetType["Blueprint"] = "blueprint";
    AssetType["DataTable"] = "data-table";
    AssetType["Config"] = "config";
    AssetType["Other"] = "other";
})(AssetType || (exports.AssetType = AssetType = {}));
// ==================== Main Search System ====================
let SearchSystem = class SearchSystem {
    constructor() {
        // Index
        this.documentIndex = new Map();
        this.symbolIndex = new Map();
        this.assetIndex = new Map();
        // Cache
        this.resultCache = new Map();
        this.CACHE_TTL = 60000; // 1 minute
        // History
        this.searchHistory = [];
        this.MAX_HISTORY = 100;
        // Active searches
        this.activeSearches = new Map();
        // Providers
        this.searchProviders = new Map();
        // Debounce
        this.debounceTimer = null;
        // Events
        this.onSearchStartedEmitter = new Emitter();
        this.onSearchStarted = this.onSearchStartedEmitter.event;
        this.onSearchProgressEmitter = new Emitter();
        this.onSearchProgress = this.onSearchProgressEmitter.event;
        this.onSearchCompletedEmitter = new Emitter();
        this.onSearchCompleted = this.onSearchCompletedEmitter.event;
        this.onSearchResultEmitter = new Emitter();
        this.onSearchResult = this.onSearchResultEmitter.event;
        this.onIndexUpdatedEmitter = new Emitter();
        this.onIndexUpdated = this.onIndexUpdatedEmitter.event;
        this.registerDefaultProviders();
    }
    // ==================== Search ====================
    /**
     * Perform search
     */
    async search(query, options = {}) {
        const searchId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();
        // Check cache
        const cacheKey = this.getCacheKey(query);
        const cached = this.resultCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            this.recordHistory(query, cached.results.length, Date.now() - startTime);
            this.onSearchCompletedEmitter.fire({
                searchId,
                results: cached.results,
                totalResults: cached.results.length,
                duration: Date.now() - startTime,
                fromCache: true
            });
            return cached.results;
        }
        // Debounce if specified
        if (options.debounceMs) {
            return new Promise((resolve) => {
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                }
                this.debounceTimer = setTimeout(async () => {
                    const results = await this.executeSearch(searchId, query, options);
                    resolve(results);
                }, options.debounceMs);
            });
        }
        return this.executeSearch(searchId, query, options);
    }
    /**
     * Execute search
     */
    async executeSearch(searchId, query, options) {
        const startTime = Date.now();
        let cancelled = false;
        // Register cancellation
        this.activeSearches.set(searchId, {
            cancel: () => { cancelled = true; }
        });
        // Fire started event
        this.onSearchStartedEmitter.fire({
            searchId,
            query,
            timestamp: startTime
        });
        const results = [];
        const domains = query.domains || [SearchDomain.All];
        try {
            // Search in each domain
            for (const domain of domains) {
                if (cancelled)
                    break;
                if (domain === SearchDomain.All) {
                    // Search all domains
                    for (const [providerDomain, provider] of this.searchProviders) {
                        if (cancelled)
                            break;
                        const domainResults = await provider.search(query, options);
                        results.push(...domainResults);
                        // Emit streaming results
                        if (options.streaming) {
                            for (const result of domainResults) {
                                this.onSearchResultEmitter.fire({
                                    searchId,
                                    result,
                                    batchIndex: results.length
                                });
                            }
                        }
                    }
                }
                else {
                    const provider = this.searchProviders.get(domain);
                    if (provider) {
                        const domainResults = await provider.search(query, options);
                        results.push(...domainResults);
                    }
                }
                // Check timeout
                if (options.timeout && Date.now() - startTime > options.timeout) {
                    break;
                }
            }
            // Rank results
            const rankedResults = this.rankResults(results, query, options);
            // Limit results
            const limitedResults = query.maxResults
                ? rankedResults.slice(0, query.maxResults)
                : rankedResults;
            // Cache results
            const cacheKey = this.getCacheKey(query);
            this.resultCache.set(cacheKey, {
                results: limitedResults,
                timestamp: Date.now()
            });
            // Record history
            this.recordHistory(query, limitedResults.length, Date.now() - startTime);
            // Fire completed event
            this.onSearchCompletedEmitter.fire({
                searchId,
                results: limitedResults,
                totalResults: limitedResults.length,
                duration: Date.now() - startTime,
                fromCache: false
            });
            return limitedResults;
        }
        finally {
            this.activeSearches.delete(searchId);
        }
    }
    /**
     * Cancel search
     */
    cancelSearch(searchId) {
        const search = this.activeSearches.get(searchId);
        if (search) {
            search.cancel();
            this.activeSearches.delete(searchId);
        }
    }
    /**
     * Cancel all searches
     */
    cancelAllSearches() {
        for (const search of this.activeSearches.values()) {
            search.cancel();
        }
        this.activeSearches.clear();
    }
    // ==================== Quick Search ====================
    /**
     * Quick file search (like Ctrl+P)
     */
    async searchFiles(query, options) {
        return this.search({
            text: query,
            domains: [SearchDomain.Files],
            maxResults: options?.streaming ? undefined : 50
        }, options);
    }
    /**
     * Quick symbol search (like Ctrl+Shift+O)
     */
    async searchSymbols(query, options) {
        return this.search({
            text: query,
            domains: [SearchDomain.Symbols],
            maxResults: options?.streaming ? undefined : 50
        }, options);
    }
    /**
     * Full text search (like Ctrl+Shift+F)
     */
    async searchText(query, options) {
        return this.search({
            text: query,
            domains: [SearchDomain.Text],
            includePattern: options?.includePattern,
            excludePattern: options?.excludePattern,
            caseSensitive: options?.caseSensitive,
            wholeWord: options?.wholeWord,
            useRegex: options?.useRegex,
            contextLines: 2
        }, options);
    }
    /**
     * Asset search
     */
    async searchAssets(query, assetTypes, options) {
        return this.search({
            text: query,
            domains: [SearchDomain.Assets],
            assetTypes,
            maxResults: options?.streaming ? undefined : 100
        }, options);
    }
    /**
     * Command search
     */
    async searchCommands(query, options) {
        return this.search({
            text: query,
            domains: [SearchDomain.Commands],
            maxResults: 30
        }, options);
    }
    /**
     * Settings search
     */
    async searchSettings(query, options) {
        return this.search({
            text: query,
            domains: [SearchDomain.Settings],
            maxResults: 50
        }, options);
    }
    // ==================== Indexing ====================
    /**
     * Index document
     */
    indexDocument(uri, content, language) {
        const isNew = !this.documentIndex.has(uri);
        const doc = {
            uri,
            content,
            language,
            modifiedAt: Date.now(),
            indexedAt: Date.now(),
            tokens: this.tokenize(content),
            lines: content.split('\n')
        };
        this.documentIndex.set(uri, doc);
        // Invalidate cache for this document
        this.invalidateCache(uri);
        this.onIndexUpdatedEmitter.fire({
            uri,
            action: isNew ? 'added' : 'updated'
        });
    }
    /**
     * Index symbols for document
     */
    indexSymbols(uri, symbols) {
        this.symbolIndex.set(uri, symbols);
        this.invalidateCache(uri);
    }
    /**
     * Index asset
     */
    indexAsset(asset) {
        const isNew = !this.assetIndex.has(asset.uri);
        this.assetIndex.set(asset.uri, {
            ...asset,
            indexedAt: Date.now()
        });
        this.onIndexUpdatedEmitter.fire({
            uri: asset.uri,
            action: isNew ? 'added' : 'updated'
        });
    }
    /**
     * Remove from index
     */
    removeFromIndex(uri) {
        this.documentIndex.delete(uri);
        this.symbolIndex.delete(uri);
        this.assetIndex.delete(uri);
        this.invalidateCache(uri);
        this.onIndexUpdatedEmitter.fire({
            uri,
            action: 'removed'
        });
    }
    /**
     * Clear index
     */
    clearIndex() {
        this.documentIndex.clear();
        this.symbolIndex.clear();
        this.assetIndex.clear();
        this.resultCache.clear();
    }
    /**
     * Get index stats
     */
    getIndexStats() {
        let totalSymbols = 0;
        for (const symbols of this.symbolIndex.values()) {
            totalSymbols += this.countSymbols(symbols);
        }
        return {
            documents: this.documentIndex.size,
            symbols: totalSymbols,
            assets: this.assetIndex.size,
            cacheSize: this.resultCache.size
        };
    }
    /**
     * Count symbols recursively
     */
    countSymbols(symbols) {
        let count = symbols.length;
        for (const symbol of symbols) {
            if (symbol.children) {
                count += this.countSymbols(symbol.children);
            }
        }
        return count;
    }
    // ==================== Providers ====================
    /**
     * Register search provider
     */
    registerProvider(domain, provider) {
        this.searchProviders.set(domain, provider);
        return {
            dispose: () => this.searchProviders.delete(domain)
        };
    }
    /**
     * Register default providers
     */
    registerDefaultProviders() {
        // File search provider
        this.registerProvider(SearchDomain.Files, {
            search: async (query, options) => this.searchInFiles(query, options)
        });
        // Text search provider
        this.registerProvider(SearchDomain.Text, {
            search: async (query, options) => this.searchInText(query, options)
        });
        // Symbol search provider
        this.registerProvider(SearchDomain.Symbols, {
            search: async (query, options) => this.searchInSymbols(query, options)
        });
        // Asset search provider
        this.registerProvider(SearchDomain.Assets, {
            search: async (query, options) => this.searchInAssets(query, options)
        });
    }
    /**
     * Search in files (by filename)
     */
    async searchInFiles(query, options) {
        const results = [];
        const queryLower = query.text.toLowerCase();
        for (const [uri, doc] of this.documentIndex) {
            const filename = this.getFilename(uri);
            const filenameLower = filename.toLowerCase();
            // Fuzzy match
            const score = this.fuzzyMatch(filenameLower, queryLower);
            if (score > 0) {
                results.push({
                    id: `file_${uri}`,
                    type: SearchResultType.File,
                    label: filename,
                    description: this.getDirectory(uri),
                    uri,
                    iconPath: this.getFileIcon(doc.language),
                    score
                });
            }
        }
        return results;
    }
    /**
     * Search in text (full text search)
     */
    async searchInText(query, options) {
        const results = [];
        const searchPattern = this.createSearchPattern(query);
        for (const [uri, doc] of this.documentIndex) {
            // Check include/exclude patterns
            if (query.includePattern && !this.matchGlob(uri, query.includePattern)) {
                continue;
            }
            if (query.excludePattern && this.matchGlob(uri, query.excludePattern)) {
                continue;
            }
            const matches = [];
            for (let i = 0; i < (doc.lines?.length || 0); i++) {
                const line = doc.lines[i];
                let match;
                while ((match = searchPattern.exec(line)) !== null) {
                    matches.push({
                        lineNumber: i + 1,
                        columnStart: match.index + 1,
                        columnEnd: match.index + match[0].length + 1,
                        lineText: line,
                        matchText: match[0],
                        beforeContext: query.contextLines
                            ? doc.lines.slice(Math.max(0, i - query.contextLines), i)
                            : undefined,
                        afterContext: query.contextLines
                            ? doc.lines.slice(i + 1, i + 1 + query.contextLines)
                            : undefined
                    });
                    // Don't match again at same position
                    if (!searchPattern.global)
                        break;
                }
                searchPattern.lastIndex = 0;
            }
            if (matches.length > 0) {
                results.push({
                    id: `text_${uri}`,
                    type: SearchResultType.TextMatch,
                    label: this.getFilename(uri),
                    description: `${matches.length} match${matches.length > 1 ? 'es' : ''}`,
                    uri,
                    matches,
                    score: matches.length
                });
            }
        }
        return results;
    }
    /**
     * Search in symbols
     */
    async searchInSymbols(query, options) {
        const results = [];
        const queryLower = query.text.toLowerCase();
        for (const [uri, symbols] of this.symbolIndex) {
            this.searchSymbolsRecursive(symbols, uri, queryLower, query.symbolKinds, results);
        }
        return results;
    }
    /**
     * Recursively search symbols
     */
    searchSymbolsRecursive(symbols, uri, query, kinds, results) {
        for (const symbol of symbols) {
            // Filter by kind
            if (kinds && !kinds.includes(symbol.kind)) {
                continue;
            }
            const score = this.fuzzyMatch(symbol.name.toLowerCase(), query);
            if (score > 0) {
                results.push({
                    id: `symbol_${uri}_${symbol.name}_${symbol.range.startLine}`,
                    type: SearchResultType.Symbol,
                    label: symbol.name,
                    description: symbol.containerName,
                    uri,
                    range: symbol.range,
                    symbolKind: symbol.kind,
                    containerName: symbol.containerName,
                    iconPath: this.getSymbolIcon(symbol.kind),
                    score
                });
            }
            // Search children
            if (symbol.children) {
                this.searchSymbolsRecursive(symbol.children, uri, query, kinds, results);
            }
        }
    }
    /**
     * Search in assets
     */
    async searchInAssets(query, options) {
        const results = [];
        const queryLower = query.text.toLowerCase();
        for (const [uri, asset] of this.assetIndex) {
            // Filter by type
            if (query.assetTypes && !query.assetTypes.includes(asset.type)) {
                continue;
            }
            // Match name
            const nameScore = this.fuzzyMatch(asset.name.toLowerCase(), queryLower);
            // Match tags
            let tagScore = 0;
            for (const tag of asset.tags) {
                tagScore = Math.max(tagScore, this.fuzzyMatch(tag.toLowerCase(), queryLower) * 0.5);
            }
            const score = Math.max(nameScore, tagScore);
            if (score > 0) {
                results.push({
                    id: `asset_${uri}`,
                    type: SearchResultType.Asset,
                    label: asset.name,
                    description: this.getAssetTypeLabel(asset.type),
                    uri,
                    assetType: asset.type,
                    thumbnail: asset.thumbnail,
                    metadata: asset.metadata,
                    iconPath: this.getAssetIcon(asset.type),
                    score
                });
            }
        }
        return results;
    }
    // ==================== Ranking ====================
    /**
     * Rank search results
     */
    rankResults(results, query, options) {
        return results.sort((a, b) => {
            let scoreA = a.score;
            let scoreB = b.score;
            // Boost exact matches
            if (options.boostMatches) {
                if (a.label.toLowerCase() === query.text.toLowerCase())
                    scoreA *= 2;
                if (b.label.toLowerCase() === query.text.toLowerCase())
                    scoreB *= 2;
            }
            // Prefer recent files
            if (options.preferRecent) {
                // Would need access to recent files list
            }
            // Prefer open files
            if (options.preferOpen) {
                // Would need access to open editors
            }
            return scoreB - scoreA;
        });
    }
    // ==================== History ====================
    /**
     * Record search in history
     */
    recordHistory(query, resultCount, duration) {
        const entry = {
            id: `history_${Date.now()}`,
            query,
            resultCount,
            timestamp: Date.now(),
            duration
        };
        this.searchHistory.push(entry);
        // Trim history
        while (this.searchHistory.length > this.MAX_HISTORY) {
            this.searchHistory.shift();
        }
    }
    /**
     * Get search history
     */
    getHistory(limit) {
        const history = [...this.searchHistory].reverse();
        return limit ? history.slice(0, limit) : history;
    }
    /**
     * Clear history
     */
    clearHistory() {
        this.searchHistory.length = 0;
    }
    /**
     * Get recent searches (unique queries)
     */
    getRecentSearches(limit = 10) {
        const seen = new Set();
        const recent = [];
        for (let i = this.searchHistory.length - 1; i >= 0 && recent.length < limit; i--) {
            const entry = this.searchHistory[i];
            const key = entry.query.text;
            if (!seen.has(key)) {
                seen.add(key);
                recent.push(entry.query);
            }
        }
        return recent;
    }
    // ==================== Utilities ====================
    /**
     * Tokenize text for indexing
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .split(/[\s\n\r\t.,;:!?'"(){}[\]<>]+/)
            .filter(t => t.length > 1);
    }
    /**
     * Create search pattern from query
     */
    createSearchPattern(query) {
        let pattern = query.text;
        if (!query.useRegex) {
            pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        if (query.wholeWord) {
            pattern = `\\b${pattern}\\b`;
        }
        const flags = query.caseSensitive ? 'g' : 'gi';
        return new RegExp(pattern, flags);
    }
    /**
     * Fuzzy match scoring
     */
    fuzzyMatch(text, query) {
        if (text === query)
            return 1;
        if (text.includes(query))
            return 0.8;
        if (text.startsWith(query))
            return 0.9;
        // Subsequence match
        let queryIdx = 0;
        let consecutiveMatches = 0;
        let maxConsecutive = 0;
        for (const char of text) {
            if (queryIdx < query.length && char === query[queryIdx]) {
                queryIdx++;
                consecutiveMatches++;
                maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
            }
            else {
                consecutiveMatches = 0;
            }
        }
        if (queryIdx < query.length)
            return 0;
        // Score based on match quality
        const subsequenceScore = queryIdx / query.length;
        const consecutiveBonus = maxConsecutive / query.length * 0.5;
        return Math.min(0.7, subsequenceScore * 0.5 + consecutiveBonus);
    }
    /**
     * Match glob pattern
     */
    matchGlob(path, pattern) {
        const regexPattern = pattern
            .replace(/\*\*/g, '{{GLOBSTAR}}')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.')
            .replace(/{{GLOBSTAR}}/g, '.*');
        return new RegExp(`^${regexPattern}$`).test(path);
    }
    /**
     * Get cache key for query
     */
    getCacheKey(query) {
        return JSON.stringify({
            text: query.text,
            domains: query.domains,
            caseSensitive: query.caseSensitive,
            wholeWord: query.wholeWord,
            useRegex: query.useRegex
        });
    }
    /**
     * Invalidate cache for URI
     */
    invalidateCache(uri) {
        for (const [key, value] of this.resultCache) {
            if (value.results.some(r => r.uri === uri)) {
                this.resultCache.delete(key);
            }
        }
    }
    /**
     * Get filename from URI
     */
    getFilename(uri) {
        return uri.split('/').pop() || uri;
    }
    /**
     * Get directory from URI
     */
    getDirectory(uri) {
        const parts = uri.split('/');
        parts.pop();
        return parts.join('/');
    }
    /**
     * Get file icon
     */
    getFileIcon(language) {
        const icons = {
            typescript: '$(file-code)',
            javascript: '$(file-code)',
            python: '$(file-code)',
            cpp: '$(file-code)',
            csharp: '$(file-code)',
            json: '$(json)',
            markdown: '$(markdown)',
            html: '$(file-code)',
            css: '$(file-code)'
        };
        return icons[language] || '$(file)';
    }
    /**
     * Get symbol icon
     */
    getSymbolIcon(kind) {
        const icons = {
            [SymbolKind.File]: '$(file)',
            [SymbolKind.Module]: '$(package)',
            [SymbolKind.Namespace]: '$(symbol-namespace)',
            [SymbolKind.Package]: '$(package)',
            [SymbolKind.Class]: '$(symbol-class)',
            [SymbolKind.Method]: '$(symbol-method)',
            [SymbolKind.Property]: '$(symbol-property)',
            [SymbolKind.Field]: '$(symbol-field)',
            [SymbolKind.Constructor]: '$(symbol-constructor)',
            [SymbolKind.Enum]: '$(symbol-enum)',
            [SymbolKind.Interface]: '$(symbol-interface)',
            [SymbolKind.Function]: '$(symbol-function)',
            [SymbolKind.Variable]: '$(symbol-variable)',
            [SymbolKind.Constant]: '$(symbol-constant)',
            [SymbolKind.String]: '$(symbol-string)',
            [SymbolKind.Number]: '$(symbol-number)',
            [SymbolKind.Boolean]: '$(symbol-boolean)',
            [SymbolKind.Array]: '$(symbol-array)',
            [SymbolKind.Object]: '$(symbol-object)',
            [SymbolKind.Key]: '$(symbol-key)',
            [SymbolKind.Null]: '$(symbol-null)',
            [SymbolKind.EnumMember]: '$(symbol-enum-member)',
            [SymbolKind.Struct]: '$(symbol-struct)',
            [SymbolKind.Event]: '$(symbol-event)',
            [SymbolKind.Operator]: '$(symbol-operator)',
            [SymbolKind.TypeParameter]: '$(symbol-type-parameter)',
            [SymbolKind.Component]: '$(extensions)',
            [SymbolKind.Actor]: '$(person)',
            [SymbolKind.Material]: '$(paintcan)',
            [SymbolKind.Texture]: '$(file-media)',
            [SymbolKind.Sound]: '$(unmute)',
            [SymbolKind.Animation]: '$(play)',
            [SymbolKind.Blueprint]: '$(circuit-board)'
        };
        return icons[kind] || '$(symbol-misc)';
    }
    /**
     * Get asset icon
     */
    getAssetIcon(type) {
        const icons = {
            [AssetType.Model3D]: '$(file-3d)',
            [AssetType.Texture]: '$(file-media)',
            [AssetType.Material]: '$(paintcan)',
            [AssetType.Audio]: '$(unmute)',
            [AssetType.Video]: '$(play-circle)',
            [AssetType.Animation]: '$(play)',
            [AssetType.Particle]: '$(sparkle)',
            [AssetType.Font]: '$(text-size)',
            [AssetType.Script]: '$(file-code)',
            [AssetType.Scene]: '$(window)',
            [AssetType.Prefab]: '$(package)',
            [AssetType.Blueprint]: '$(circuit-board)',
            [AssetType.DataTable]: '$(table)',
            [AssetType.Config]: '$(settings-gear)',
            [AssetType.Other]: '$(file)'
        };
        return icons[type] || '$(file)';
    }
    /**
     * Get asset type label
     */
    getAssetTypeLabel(type) {
        const labels = {
            [AssetType.Model3D]: '3D Model',
            [AssetType.Texture]: 'Texture',
            [AssetType.Material]: 'Material',
            [AssetType.Audio]: 'Audio',
            [AssetType.Video]: 'Video',
            [AssetType.Animation]: 'Animation',
            [AssetType.Particle]: 'Particle System',
            [AssetType.Font]: 'Font',
            [AssetType.Script]: 'Script',
            [AssetType.Scene]: 'Scene',
            [AssetType.Prefab]: 'Prefab',
            [AssetType.Blueprint]: 'Blueprint',
            [AssetType.DataTable]: 'Data Table',
            [AssetType.Config]: 'Configuration',
            [AssetType.Other]: 'Other'
        };
        return labels[type] || 'Unknown';
    }
    /**
     * Dispose
     */
    dispose() {
        this.cancelAllSearches();
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.clearIndex();
        this.onSearchStartedEmitter.dispose();
        this.onSearchProgressEmitter.dispose();
        this.onSearchCompletedEmitter.dispose();
        this.onSearchResultEmitter.dispose();
        this.onIndexUpdatedEmitter.dispose();
    }
};
exports.SearchSystem = SearchSystem;
exports.SearchSystem = SearchSystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], SearchSystem);
// ==================== Export ====================
exports.default = SearchSystem;
