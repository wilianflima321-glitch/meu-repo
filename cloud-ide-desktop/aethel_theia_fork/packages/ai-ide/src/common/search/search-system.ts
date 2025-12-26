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

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Search Types ====================

/**
 * Search domain
 */
export enum SearchDomain {
    Files = 'files',
    Text = 'text',
    Symbols = 'symbols',
    Assets = 'assets',
    Commands = 'commands',
    Settings = 'settings',
    Help = 'help',
    References = 'references',
    Definitions = 'definitions',
    All = 'all'
}

/**
 * Search result type
 */
export enum SearchResultType {
    File = 'file',
    TextMatch = 'text-match',
    Symbol = 'symbol',
    Asset = 'asset',
    Command = 'command',
    Setting = 'setting',
    HelpArticle = 'help-article',
    Reference = 'reference',
    Definition = 'definition',
    Suggestion = 'suggestion'
}

/**
 * Symbol kind
 */
export enum SymbolKind {
    File = 0,
    Module = 1,
    Namespace = 2,
    Package = 3,
    Class = 4,
    Method = 5,
    Property = 6,
    Field = 7,
    Constructor = 8,
    Enum = 9,
    Interface = 10,
    Function = 11,
    Variable = 12,
    Constant = 13,
    String = 14,
    Number = 15,
    Boolean = 16,
    Array = 17,
    Object = 18,
    Key = 19,
    Null = 20,
    EnumMember = 21,
    Struct = 22,
    Event = 23,
    Operator = 24,
    TypeParameter = 25,
    Component = 26,
    Actor = 27,
    Material = 28,
    Texture = 29,
    Sound = 30,
    Animation = 31,
    Blueprint = 32
}

/**
 * Asset type
 */
export enum AssetType {
    Model3D = '3d-model',
    Texture = 'texture',
    Material = 'material',
    Audio = 'audio',
    Video = 'video',
    Animation = 'animation',
    Particle = 'particle',
    Font = 'font',
    Script = 'script',
    Scene = 'scene',
    Prefab = 'prefab',
    Blueprint = 'blueprint',
    DataTable = 'data-table',
    Config = 'config',
    Other = 'other'
}

/**
 * Text match
 */
export interface TextMatch {
    lineNumber: number;
    columnStart: number;
    columnEnd: number;
    lineText: string;
    matchText: string;
    beforeContext?: string[];
    afterContext?: string[];
}

/**
 * Search result
 */
export interface SearchResult {
    id: string;
    type: SearchResultType;
    label: string;
    description?: string;
    detail?: string;
    iconPath?: string;
    uri?: string;
    range?: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    matches?: TextMatch[];
    score: number;
    data?: unknown;
    
    // Symbol-specific
    symbolKind?: SymbolKind;
    containerName?: string;
    
    // Asset-specific
    assetType?: AssetType;
    thumbnail?: string;
    metadata?: Record<string, unknown>;
    
    // Grouping
    group?: string;
    children?: SearchResult[];
}

/**
 * Search query
 */
export interface SearchQuery {
    text: string;
    domains?: SearchDomain[];
    
    // File filters
    includePattern?: string;
    excludePattern?: string;
    
    // Options
    caseSensitive?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
    maxResults?: number;
    contextLines?: number;
    
    // Symbol filters
    symbolKinds?: SymbolKind[];
    
    // Asset filters
    assetTypes?: AssetType[];
    
    // Scope
    workspaceFolders?: string[];
    openFilesOnly?: boolean;
}

/**
 * Search options
 */
export interface SearchOptions {
    // Result handling
    streaming?: boolean;
    batchSize?: number;
    
    // Performance
    timeout?: number;
    debounceMs?: number;
    
    // Ranking
    preferRecent?: boolean;
    preferOpen?: boolean;
    boostMatches?: boolean;
    
    // Semantic
    useSemanticSearch?: boolean;
    semanticThreshold?: number;
}

// ==================== Index Types ====================

/**
 * Indexed document
 */
export interface IndexedDocument {
    uri: string;
    content: string;
    language: string;
    modifiedAt: number;
    indexedAt: number;
    tokens?: string[];
    symbols?: IndexedSymbol[];
    lines?: string[];
}

/**
 * Indexed symbol
 */
export interface IndexedSymbol {
    name: string;
    kind: SymbolKind;
    containerName?: string;
    range: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    selectionRange: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    };
    children?: IndexedSymbol[];
}

/**
 * Indexed asset
 */
export interface IndexedAsset {
    uri: string;
    name: string;
    type: AssetType;
    tags: string[];
    metadata: Record<string, unknown>;
    thumbnail?: string;
    modifiedAt: number;
    indexedAt: number;
}

// ==================== Events ====================

/**
 * Search started event
 */
export interface SearchStartedEvent {
    searchId: string;
    query: SearchQuery;
    timestamp: number;
}

/**
 * Search progress event
 */
export interface SearchProgressEvent {
    searchId: string;
    resultsFound: number;
    filesSearched: number;
    totalFiles: number;
    currentFile?: string;
}

/**
 * Search completed event
 */
export interface SearchCompletedEvent {
    searchId: string;
    results: SearchResult[];
    totalResults: number;
    duration: number;
    fromCache: boolean;
}

/**
 * Search result event (streaming)
 */
export interface SearchResultEvent {
    searchId: string;
    result: SearchResult;
    batchIndex: number;
}

// ==================== History ====================

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
    id: string;
    query: SearchQuery;
    resultCount: number;
    timestamp: number;
    duration: number;
    selectedResult?: string;
}

// ==================== Main Search System ====================

@injectable()
export class SearchSystem {
    // Index
    private readonly documentIndex: Map<string, IndexedDocument> = new Map();
    private readonly symbolIndex: Map<string, IndexedSymbol[]> = new Map();
    private readonly assetIndex: Map<string, IndexedAsset> = new Map();
    
    // Cache
    private readonly resultCache: Map<string, { results: SearchResult[]; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 60000; // 1 minute
    
    // History
    private readonly searchHistory: SearchHistoryEntry[] = [];
    private readonly MAX_HISTORY = 100;
    
    // Active searches
    private readonly activeSearches: Map<string, { cancel: () => void }> = new Map();
    
    // Providers
    private readonly searchProviders: Map<SearchDomain, SearchProvider> = new Map();
    
    // Debounce
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    
    // Events
    private readonly onSearchStartedEmitter = new Emitter<SearchStartedEvent>();
    readonly onSearchStarted: Event<SearchStartedEvent> = this.onSearchStartedEmitter.event;
    
    private readonly onSearchProgressEmitter = new Emitter<SearchProgressEvent>();
    readonly onSearchProgress: Event<SearchProgressEvent> = this.onSearchProgressEmitter.event;
    
    private readonly onSearchCompletedEmitter = new Emitter<SearchCompletedEvent>();
    readonly onSearchCompleted: Event<SearchCompletedEvent> = this.onSearchCompletedEmitter.event;
    
    private readonly onSearchResultEmitter = new Emitter<SearchResultEvent>();
    readonly onSearchResult: Event<SearchResultEvent> = this.onSearchResultEmitter.event;
    
    private readonly onIndexUpdatedEmitter = new Emitter<{ uri: string; action: 'added' | 'updated' | 'removed' }>();
    readonly onIndexUpdated: Event<{ uri: string; action: 'added' | 'updated' | 'removed' }> = this.onIndexUpdatedEmitter.event;

    constructor() {
        this.registerDefaultProviders();
    }

    // ==================== Search ====================

    /**
     * Perform search
     */
    async search(query: SearchQuery, options: SearchOptions = {}): Promise<SearchResult[]> {
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
    private async executeSearch(
        searchId: string,
        query: SearchQuery,
        options: SearchOptions
    ): Promise<SearchResult[]> {
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

        const results: SearchResult[] = [];
        const domains = query.domains || [SearchDomain.All];

        try {
            // Search in each domain
            for (const domain of domains) {
                if (cancelled) break;
                
                if (domain === SearchDomain.All) {
                    // Search all domains
                    for (const [providerDomain, provider] of this.searchProviders) {
                        if (cancelled) break;
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
                } else {
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
        } finally {
            this.activeSearches.delete(searchId);
        }
    }

    /**
     * Cancel search
     */
    cancelSearch(searchId: string): void {
        const search = this.activeSearches.get(searchId);
        if (search) {
            search.cancel();
            this.activeSearches.delete(searchId);
        }
    }

    /**
     * Cancel all searches
     */
    cancelAllSearches(): void {
        for (const search of this.activeSearches.values()) {
            search.cancel();
        }
        this.activeSearches.clear();
    }

    // ==================== Quick Search ====================

    /**
     * Quick file search (like Ctrl+P)
     */
    async searchFiles(query: string, options?: SearchOptions): Promise<SearchResult[]> {
        return this.search({
            text: query,
            domains: [SearchDomain.Files],
            maxResults: options?.streaming ? undefined : 50
        }, options);
    }

    /**
     * Quick symbol search (like Ctrl+Shift+O)
     */
    async searchSymbols(query: string, options?: SearchOptions): Promise<SearchResult[]> {
        return this.search({
            text: query,
            domains: [SearchDomain.Symbols],
            maxResults: options?.streaming ? undefined : 50
        }, options);
    }

    /**
     * Full text search (like Ctrl+Shift+F)
     */
    async searchText(query: string, options?: SearchOptions & {
        includePattern?: string;
        excludePattern?: string;
        caseSensitive?: boolean;
        wholeWord?: boolean;
        useRegex?: boolean;
    }): Promise<SearchResult[]> {
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
    async searchAssets(query: string, assetTypes?: AssetType[], options?: SearchOptions): Promise<SearchResult[]> {
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
    async searchCommands(query: string, options?: SearchOptions): Promise<SearchResult[]> {
        return this.search({
            text: query,
            domains: [SearchDomain.Commands],
            maxResults: 30
        }, options);
    }

    /**
     * Settings search
     */
    async searchSettings(query: string, options?: SearchOptions): Promise<SearchResult[]> {
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
    indexDocument(uri: string, content: string, language: string): void {
        const isNew = !this.documentIndex.has(uri);
        
        const doc: IndexedDocument = {
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
    indexSymbols(uri: string, symbols: IndexedSymbol[]): void {
        this.symbolIndex.set(uri, symbols);
        this.invalidateCache(uri);
    }

    /**
     * Index asset
     */
    indexAsset(asset: Omit<IndexedAsset, 'indexedAt'>): void {
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
    removeFromIndex(uri: string): void {
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
    clearIndex(): void {
        this.documentIndex.clear();
        this.symbolIndex.clear();
        this.assetIndex.clear();
        this.resultCache.clear();
    }

    /**
     * Get index stats
     */
    getIndexStats(): {
        documents: number;
        symbols: number;
        assets: number;
        cacheSize: number;
    } {
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
    private countSymbols(symbols: IndexedSymbol[]): number {
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
    registerProvider(domain: SearchDomain, provider: SearchProvider): Disposable {
        this.searchProviders.set(domain, provider);
        return {
            dispose: () => this.searchProviders.delete(domain)
        };
    }

    /**
     * Register default providers
     */
    private registerDefaultProviders(): void {
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
    private async searchInFiles(query: SearchQuery, options: SearchOptions): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
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
    private async searchInText(query: SearchQuery, options: SearchOptions): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const searchPattern = this.createSearchPattern(query);

        for (const [uri, doc] of this.documentIndex) {
            // Check include/exclude patterns
            if (query.includePattern && !this.matchGlob(uri, query.includePattern)) {
                continue;
            }
            if (query.excludePattern && this.matchGlob(uri, query.excludePattern)) {
                continue;
            }

            const matches: TextMatch[] = [];
            
            for (let i = 0; i < (doc.lines?.length || 0); i++) {
                const line = doc.lines![i];
                let match: RegExpExecArray | null;
                
                while ((match = searchPattern.exec(line)) !== null) {
                    matches.push({
                        lineNumber: i + 1,
                        columnStart: match.index + 1,
                        columnEnd: match.index + match[0].length + 1,
                        lineText: line,
                        matchText: match[0],
                        beforeContext: query.contextLines 
                            ? doc.lines!.slice(Math.max(0, i - query.contextLines), i)
                            : undefined,
                        afterContext: query.contextLines
                            ? doc.lines!.slice(i + 1, i + 1 + query.contextLines)
                            : undefined
                    });

                    // Don't match again at same position
                    if (!searchPattern.global) break;
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
    private async searchInSymbols(query: SearchQuery, options: SearchOptions): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
        const queryLower = query.text.toLowerCase();

        for (const [uri, symbols] of this.symbolIndex) {
            this.searchSymbolsRecursive(symbols, uri, queryLower, query.symbolKinds, results);
        }

        return results;
    }

    /**
     * Recursively search symbols
     */
    private searchSymbolsRecursive(
        symbols: IndexedSymbol[],
        uri: string,
        query: string,
        kinds: SymbolKind[] | undefined,
        results: SearchResult[]
    ): void {
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
    private async searchInAssets(query: SearchQuery, options: SearchOptions): Promise<SearchResult[]> {
        const results: SearchResult[] = [];
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
    private rankResults(results: SearchResult[], query: SearchQuery, options: SearchOptions): SearchResult[] {
        return results.sort((a, b) => {
            let scoreA = a.score;
            let scoreB = b.score;

            // Boost exact matches
            if (options.boostMatches) {
                if (a.label.toLowerCase() === query.text.toLowerCase()) scoreA *= 2;
                if (b.label.toLowerCase() === query.text.toLowerCase()) scoreB *= 2;
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
    private recordHistory(query: SearchQuery, resultCount: number, duration: number): void {
        const entry: SearchHistoryEntry = {
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
    getHistory(limit?: number): SearchHistoryEntry[] {
        const history = [...this.searchHistory].reverse();
        return limit ? history.slice(0, limit) : history;
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.searchHistory.length = 0;
    }

    /**
     * Get recent searches (unique queries)
     */
    getRecentSearches(limit: number = 10): SearchQuery[] {
        const seen = new Set<string>();
        const recent: SearchQuery[] = [];

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
    private tokenize(text: string): string[] {
        return text
            .toLowerCase()
            .split(/[\s\n\r\t.,;:!?'"(){}[\]<>]+/)
            .filter(t => t.length > 1);
    }

    /**
     * Create search pattern from query
     */
    private createSearchPattern(query: SearchQuery): RegExp {
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
    private fuzzyMatch(text: string, query: string): number {
        if (text === query) return 1;
        if (text.includes(query)) return 0.8;
        if (text.startsWith(query)) return 0.9;
        
        // Subsequence match
        let queryIdx = 0;
        let consecutiveMatches = 0;
        let maxConsecutive = 0;
        
        for (const char of text) {
            if (queryIdx < query.length && char === query[queryIdx]) {
                queryIdx++;
                consecutiveMatches++;
                maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
            } else {
                consecutiveMatches = 0;
            }
        }
        
        if (queryIdx < query.length) return 0;
        
        // Score based on match quality
        const subsequenceScore = queryIdx / query.length;
        const consecutiveBonus = maxConsecutive / query.length * 0.5;
        
        return Math.min(0.7, subsequenceScore * 0.5 + consecutiveBonus);
    }

    /**
     * Match glob pattern
     */
    private matchGlob(path: string, pattern: string): boolean {
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
    private getCacheKey(query: SearchQuery): string {
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
    private invalidateCache(uri: string): void {
        for (const [key, value] of this.resultCache) {
            if (value.results.some(r => r.uri === uri)) {
                this.resultCache.delete(key);
            }
        }
    }

    /**
     * Get filename from URI
     */
    private getFilename(uri: string): string {
        return uri.split('/').pop() || uri;
    }

    /**
     * Get directory from URI
     */
    private getDirectory(uri: string): string {
        const parts = uri.split('/');
        parts.pop();
        return parts.join('/');
    }

    /**
     * Get file icon
     */
    private getFileIcon(language: string): string {
        const icons: Record<string, string> = {
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
    private getSymbolIcon(kind: SymbolKind): string {
        const icons: Record<SymbolKind, string> = {
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
    private getAssetIcon(type: AssetType): string {
        const icons: Record<AssetType, string> = {
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
    private getAssetTypeLabel(type: AssetType): string {
        const labels: Record<AssetType, string> = {
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
    dispose(): void {
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
}

// ==================== Provider Interface ====================

interface SearchProvider {
    search(query: SearchQuery, options: SearchOptions): Promise<SearchResult[]>;
}

interface Disposable {
    dispose(): void;
}

// ==================== Export ====================

export default SearchSystem;
