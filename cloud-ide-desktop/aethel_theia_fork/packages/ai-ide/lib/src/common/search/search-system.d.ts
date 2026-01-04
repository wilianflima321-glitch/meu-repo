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
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Search domain
 */
export declare enum SearchDomain {
    Files = "files",
    Text = "text",
    Symbols = "symbols",
    Assets = "assets",
    Commands = "commands",
    Settings = "settings",
    Help = "help",
    References = "references",
    Definitions = "definitions",
    All = "all"
}
/**
 * Search result type
 */
export declare enum SearchResultType {
    File = "file",
    TextMatch = "text-match",
    Symbol = "symbol",
    Asset = "asset",
    Command = "command",
    Setting = "setting",
    HelpArticle = "help-article",
    Reference = "reference",
    Definition = "definition",
    Suggestion = "suggestion"
}
/**
 * Symbol kind
 */
export declare enum SymbolKind {
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
export declare enum AssetType {
    Model3D = "3d-model",
    Texture = "texture",
    Material = "material",
    Audio = "audio",
    Video = "video",
    Animation = "animation",
    Particle = "particle",
    Font = "font",
    Script = "script",
    Scene = "scene",
    Prefab = "prefab",
    Blueprint = "blueprint",
    DataTable = "data-table",
    Config = "config",
    Other = "other"
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
    symbolKind?: SymbolKind;
    containerName?: string;
    assetType?: AssetType;
    thumbnail?: string;
    metadata?: Record<string, unknown>;
    group?: string;
    children?: SearchResult[];
}
/**
 * Search query
 */
export interface SearchQuery {
    text: string;
    domains?: SearchDomain[];
    includePattern?: string;
    excludePattern?: string;
    caseSensitive?: boolean;
    wholeWord?: boolean;
    useRegex?: boolean;
    maxResults?: number;
    contextLines?: number;
    symbolKinds?: SymbolKind[];
    assetTypes?: AssetType[];
    workspaceFolders?: string[];
    openFilesOnly?: boolean;
}
/**
 * Search options
 */
export interface SearchOptions {
    streaming?: boolean;
    batchSize?: number;
    timeout?: number;
    debounceMs?: number;
    preferRecent?: boolean;
    preferOpen?: boolean;
    boostMatches?: boolean;
    useSemanticSearch?: boolean;
    semanticThreshold?: number;
}
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
export declare class SearchSystem {
    private readonly documentIndex;
    private readonly symbolIndex;
    private readonly assetIndex;
    private readonly resultCache;
    private readonly CACHE_TTL;
    private readonly searchHistory;
    private readonly MAX_HISTORY;
    private readonly activeSearches;
    private readonly searchProviders;
    private debounceTimer;
    private readonly onSearchStartedEmitter;
    readonly onSearchStarted: Event<SearchStartedEvent>;
    private readonly onSearchProgressEmitter;
    readonly onSearchProgress: Event<SearchProgressEvent>;
    private readonly onSearchCompletedEmitter;
    readonly onSearchCompleted: Event<SearchCompletedEvent>;
    private readonly onSearchResultEmitter;
    readonly onSearchResult: Event<SearchResultEvent>;
    private readonly onIndexUpdatedEmitter;
    readonly onIndexUpdated: Event<{
        uri: string;
        action: 'added' | 'updated' | 'removed';
    }>;
    constructor();
    /**
     * Perform search
     */
    search(query: SearchQuery, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Execute search
     */
    private executeSearch;
    /**
     * Cancel search
     */
    cancelSearch(searchId: string): void;
    /**
     * Cancel all searches
     */
    cancelAllSearches(): void;
    /**
     * Quick file search (like Ctrl+P)
     */
    searchFiles(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Quick symbol search (like Ctrl+Shift+O)
     */
    searchSymbols(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Full text search (like Ctrl+Shift+F)
     */
    searchText(query: string, options?: SearchOptions & {
        includePattern?: string;
        excludePattern?: string;
        caseSensitive?: boolean;
        wholeWord?: boolean;
        useRegex?: boolean;
    }): Promise<SearchResult[]>;
    /**
     * Asset search
     */
    searchAssets(query: string, assetTypes?: AssetType[], options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Command search
     */
    searchCommands(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Settings search
     */
    searchSettings(query: string, options?: SearchOptions): Promise<SearchResult[]>;
    /**
     * Index document
     */
    indexDocument(uri: string, content: string, language: string): void;
    /**
     * Index symbols for document
     */
    indexSymbols(uri: string, symbols: IndexedSymbol[]): void;
    /**
     * Index asset
     */
    indexAsset(asset: Omit<IndexedAsset, 'indexedAt'>): void;
    /**
     * Remove from index
     */
    removeFromIndex(uri: string): void;
    /**
     * Clear index
     */
    clearIndex(): void;
    /**
     * Get index stats
     */
    getIndexStats(): {
        documents: number;
        symbols: number;
        assets: number;
        cacheSize: number;
    };
    /**
     * Count symbols recursively
     */
    private countSymbols;
    /**
     * Register search provider
     */
    registerProvider(domain: SearchDomain, provider: SearchProvider): Disposable;
    /**
     * Register default providers
     */
    private registerDefaultProviders;
    /**
     * Search in files (by filename)
     */
    private searchInFiles;
    /**
     * Search in text (full text search)
     */
    private searchInText;
    /**
     * Search in symbols
     */
    private searchInSymbols;
    /**
     * Recursively search symbols
     */
    private searchSymbolsRecursive;
    /**
     * Search in assets
     */
    private searchInAssets;
    /**
     * Rank search results
     */
    private rankResults;
    /**
     * Record search in history
     */
    private recordHistory;
    /**
     * Get search history
     */
    getHistory(limit?: number): SearchHistoryEntry[];
    /**
     * Clear history
     */
    clearHistory(): void;
    /**
     * Get recent searches (unique queries)
     */
    getRecentSearches(limit?: number): SearchQuery[];
    /**
     * Tokenize text for indexing
     */
    private tokenize;
    /**
     * Create search pattern from query
     */
    private createSearchPattern;
    /**
     * Fuzzy match scoring
     */
    private fuzzyMatch;
    /**
     * Match glob pattern
     */
    private matchGlob;
    /**
     * Get cache key for query
     */
    private getCacheKey;
    /**
     * Invalidate cache for URI
     */
    private invalidateCache;
    /**
     * Get filename from URI
     */
    private getFilename;
    /**
     * Get directory from URI
     */
    private getDirectory;
    /**
     * Get file icon
     */
    private getFileIcon;
    /**
     * Get symbol icon
     */
    private getSymbolIcon;
    /**
     * Get asset icon
     */
    private getAssetIcon;
    /**
     * Get asset type label
     */
    private getAssetTypeLabel;
    /**
     * Dispose
     */
    dispose(): void;
}
interface SearchProvider {
    search(query: SearchQuery, options: SearchOptions): Promise<SearchResult[]>;
}
interface Disposable {
    dispose(): void;
}
export default SearchSystem;
