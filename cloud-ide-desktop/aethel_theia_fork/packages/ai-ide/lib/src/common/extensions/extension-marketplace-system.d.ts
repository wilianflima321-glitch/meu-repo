/**
 * Extension Marketplace System - Professional Plugin Infrastructure
 *
 * Sistema de marketplace de extensões profissional para IDE de produção.
 * Inspirado em VS Code Marketplace, JetBrains Marketplace, Unity Asset Store.
 * Suporta:
 * - Browse e busca de extensões
 * - Instalação/atualização/desinstalação
 * - Verificação de compatibilidade
 * - Ratings e reviews
 * - Dependências
 * - Publisher verification
 * - Extensões locais e remotas
 * - Auto-update
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Extension state
 */
export declare enum ExtensionState {
    NotInstalled = "notInstalled",
    Installing = "installing",
    Installed = "installed",
    Updating = "updating",
    Uninstalling = "uninstalling",
    Disabled = "disabled",
    Error = "error"
}
/**
 * Extension type
 */
export declare enum ExtensionType {
    Language = "language",
    Theme = "theme",
    Snippet = "snippet",
    Debugger = "debugger",
    Formatter = "formatter",
    Linter = "linter",
    Tool = "tool",
    Keybinding = "keybinding",
    AI = "ai",
    Game = "game",
    Graphics = "graphics",
    Audio = "audio",
    Other = "other"
}
/**
 * Extension category
 */
export declare enum ExtensionCategory {
    Programming = "programming",
    Themes = "themes",
    Snippets = "snippets",
    Debuggers = "debuggers",
    Formatters = "formatters",
    Linters = "linters",
    LanguagePacks = "languagePacks",
    AI = "ai",
    Testing = "testing",
    SCM = "scm",
    Visualization = "visualization",
    DataScience = "dataScience",
    GameDev = "gameDev",
    Education = "education",
    Other = "other"
}
/**
 * Sort order
 */
export declare enum SortBy {
    Relevance = "relevance",
    Downloads = "downloads",
    Rating = "rating",
    RecentlyUpdated = "recentlyUpdated",
    Name = "name",
    PublisherName = "publisherName",
    TrendingDaily = "trendingDaily",
    TrendingWeekly = "trendingWeekly",
    TrendingMonthly = "trendingMonthly"
}
/**
 * Extension manifest
 */
export interface ExtensionManifest {
    name: string;
    displayName: string;
    description: string;
    version: string;
    publisher: string;
    publisherDisplayName?: string;
    categories?: ExtensionCategory[];
    keywords?: string[];
    engines: {
        aethel: string;
        vscode?: string;
        theia?: string;
    };
    activationEvents?: string[];
    main?: string;
    browser?: string;
    contributes?: ExtensionContributions;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    extensionDependencies?: string[];
    extensionPack?: string[];
    icon?: string;
    galleryBanner?: {
        color?: string;
        theme?: 'dark' | 'light';
    };
    preview?: boolean;
    badges?: Array<{
        url: string;
        href: string;
        description: string;
    }>;
    repository?: {
        type: string;
        url: string;
    };
    bugs?: {
        url: string;
    };
    homepage?: string;
    license?: string;
    pricing?: 'Free' | 'Trial' | 'Paid';
}
/**
 * Extension contributions
 */
export interface ExtensionContributions {
    commands?: ExtensionCommand[];
    menus?: Record<string, MenuContribution[]>;
    keybindings?: KeybindingContribution[];
    languages?: LanguageContribution[];
    grammars?: GrammarContribution[];
    themes?: ThemeContribution[];
    iconThemes?: IconThemeContribution[];
    productIconThemes?: ProductIconThemeContribution[];
    snippets?: SnippetContribution[];
    jsonValidation?: JsonValidationContribution[];
    views?: Record<string, ViewContribution[]>;
    viewsContainers?: Record<string, ViewContainerContribution[]>;
    configuration?: ConfigurationContribution | ConfigurationContribution[];
    configurationDefaults?: Record<string, unknown>;
    taskDefinitions?: TaskDefinitionContribution[];
    problemMatchers?: ProblemMatcherContribution[];
    problemPatterns?: ProblemPatternContribution[];
    debuggers?: DebuggerContribution[];
    breakpoints?: BreakpointContribution[];
    terminal?: TerminalContribution;
    colors?: ColorContribution[];
    semanticTokenTypes?: SemanticTokenTypeContribution[];
    semanticTokenModifiers?: SemanticTokenModifierContribution[];
    semanticTokenScopes?: SemanticTokenScopeContribution[];
    customEditors?: CustomEditorContribution[];
    notebooks?: NotebookContribution[];
    notebookRenderer?: NotebookRendererContribution[];
}
export interface ExtensionCommand {
    command: string;
    title: string;
    category?: string;
    icon?: string;
}
export interface MenuContribution {
    command: string;
    when?: string;
    group?: string;
}
export interface KeybindingContribution {
    command: string;
    key: string;
    mac?: string;
    linux?: string;
    when?: string;
}
export interface LanguageContribution {
    id: string;
    aliases?: string[];
    extensions?: string[];
    filenames?: string[];
    configuration?: string;
}
export interface GrammarContribution {
    language: string;
    scopeName: string;
    path: string;
}
export interface ThemeContribution {
    id: string;
    label: string;
    uiTheme: string;
    path: string;
}
export interface IconThemeContribution {
    id: string;
    label: string;
    path: string;
}
export interface ProductIconThemeContribution {
    id: string;
    label: string;
    path: string;
}
export interface SnippetContribution {
    language: string;
    path: string;
}
export interface JsonValidationContribution {
    fileMatch: string | string[];
    url: string;
}
export interface ViewContribution {
    id: string;
    name: string;
    when?: string;
    icon?: string;
}
export interface ViewContainerContribution {
    id: string;
    title: string;
    icon: string;
}
export interface ConfigurationContribution {
    title: string;
    properties: Record<string, unknown>;
}
export interface TaskDefinitionContribution {
    type: string;
    required?: string[];
    properties?: Record<string, unknown>;
}
export interface ProblemMatcherContribution {
    name: string;
    owner: string;
    pattern: unknown;
}
export interface ProblemPatternContribution {
    name: string;
    regexp: string;
}
export interface DebuggerContribution {
    type: string;
    label: string;
    program?: string;
}
export interface BreakpointContribution {
    language: string;
}
export interface TerminalContribution {
    profiles?: unknown[];
}
export interface ColorContribution {
    id: string;
    description: string;
    defaults: unknown;
}
export interface SemanticTokenTypeContribution {
    id: string;
    description: string;
}
export interface SemanticTokenModifierContribution {
    id: string;
    description: string;
}
export interface SemanticTokenScopeContribution {
    language?: string;
    scopes: Record<string, string[]>;
}
export interface CustomEditorContribution {
    viewType: string;
    displayName: string;
    selector: unknown[];
}
export interface NotebookContribution {
    type: string;
    displayName: string;
    selector: unknown[];
}
export interface NotebookRendererContribution {
    id: string;
    displayName: string;
    mimeTypes: string[];
}
/**
 * Extension info from marketplace
 */
export interface MarketplaceExtension {
    id: string;
    manifest: ExtensionManifest;
    publishedDate: string;
    lastUpdated: string;
    releaseDate?: string;
    statistics: ExtensionStatistics;
    assets: ExtensionAssets;
    publisher: PublisherInfo;
    flags: ExtensionFlags;
    versions: ExtensionVersion[];
}
/**
 * Extension statistics
 */
export interface ExtensionStatistics {
    downloads: number;
    installs: number;
    averageRating: number;
    ratingCount: number;
    trendingDaily?: number;
    trendingWeekly?: number;
    trendingMonthly?: number;
}
/**
 * Extension assets
 */
export interface ExtensionAssets {
    icon?: string;
    readme?: string;
    changelog?: string;
    license?: string;
    repository?: string;
    manifest: string;
    vsix: string;
}
/**
 * Publisher info
 */
export interface PublisherInfo {
    publisherId: string;
    publisherName: string;
    displayName: string;
    flags: PublisherFlags;
    domain?: string;
    isDomainVerified: boolean;
}
/**
 * Publisher flags
 */
export interface PublisherFlags {
    verified: boolean;
    trusted: boolean;
    partner: boolean;
}
/**
 * Extension flags
 */
export interface ExtensionFlags {
    verified: boolean;
    preview: boolean;
    deprecated: boolean;
    paid: boolean;
    trial: boolean;
    featured: boolean;
    trending: boolean;
}
/**
 * Extension version
 */
export interface ExtensionVersion {
    version: string;
    lastUpdated: string;
    targetPlatform?: string;
    files: ExtensionFiles;
    properties?: ExtensionProperties;
    assetUri?: string;
    fallbackAssetUri?: string;
}
/**
 * Extension files
 */
export interface ExtensionFiles {
    vsixManifest: string;
    vsix: string;
    manifest: string;
    icon?: string;
    readme?: string;
    changelog?: string;
    license?: string;
}
/**
 * Extension properties
 */
export interface ExtensionProperties {
    engine: string;
    localizedLanguages?: string[];
    webExtension?: boolean;
    preRelease?: boolean;
    isPreReleaseVersion?: boolean;
    executionEnvironment?: string;
}
/**
 * Installed extension
 */
export interface InstalledExtension {
    id: string;
    manifest: ExtensionManifest;
    state: ExtensionState;
    installPath: string;
    installedAt: number;
    updatedAt?: number;
    isBuiltin: boolean;
    isUserInstalled: boolean;
    isActive: boolean;
    activationReason?: string;
    availableUpdate?: ExtensionVersion;
    autoUpdate: boolean;
    marketplaceInfo?: MarketplaceExtension;
}
/**
 * Search query
 */
export interface SearchQuery {
    text?: string;
    categories?: ExtensionCategory[];
    types?: ExtensionType[];
    sortBy?: SortBy;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    pageSize?: number;
    includePrerelease?: boolean;
    featured?: boolean;
    trending?: boolean;
    verified?: boolean;
    targetPlatform?: string;
}
/**
 * Search result
 */
export interface SearchResult {
    extensions: MarketplaceExtension[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
}
/**
 * Install options
 */
export interface InstallOptions {
    version?: string;
    preRelease?: boolean;
    installDependencies?: boolean;
    force?: boolean;
}
/**
 * Review
 */
export interface ExtensionReview {
    id: string;
    extensionId: string;
    rating: number;
    text: string;
    publishedDate: string;
    updatedDate?: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    helpfulCount?: number;
    reply?: ReviewReply;
}
/**
 * Review reply
 */
export interface ReviewReply {
    text: string;
    publishedDate: string;
    publisherName: string;
}
export interface ExtensionInstalledEvent {
    extension: InstalledExtension;
}
export interface ExtensionUninstalledEvent {
    extensionId: string;
}
export interface ExtensionUpdatedEvent {
    extension: InstalledExtension;
    previousVersion: string;
}
export interface ExtensionStateChangedEvent {
    extensionId: string;
    oldState: ExtensionState;
    newState: ExtensionState;
}
export interface ExtensionActivatedEvent {
    extensionId: string;
    reason: string;
}
export interface MarketplaceClient {
    search(query: SearchQuery): Promise<SearchResult>;
    getExtension(extensionId: string): Promise<MarketplaceExtension | null>;
    getVersions(extensionId: string): Promise<ExtensionVersion[]>;
    getReviews(extensionId: string, page?: number): Promise<ExtensionReview[]>;
    download(extensionId: string, version?: string): Promise<Buffer>;
    getReadme(extensionId: string): Promise<string>;
    getChangelog(extensionId: string): Promise<string>;
    reportExtension(extensionId: string, reason: string): Promise<void>;
}
export declare class ExtensionMarketplaceSystem {
    private readonly installed;
    private readonly builtins;
    private readonly active;
    private readonly pendingInstalls;
    private readonly pendingUninstalls;
    private marketplaceClient;
    private extensionsPath;
    private userExtensionsPath;
    private autoUpdateEnabled;
    private checkUpdateInterval;
    private updateCheckTimer;
    private readonly onInstalledEmitter;
    readonly onInstalled: Event<ExtensionInstalledEvent>;
    private readonly onUninstalledEmitter;
    readonly onUninstalled: Event<ExtensionUninstalledEvent>;
    private readonly onUpdatedEmitter;
    readonly onUpdated: Event<ExtensionUpdatedEvent>;
    private readonly onStateChangedEmitter;
    readonly onStateChanged: Event<ExtensionStateChangedEvent>;
    private readonly onActivatedEmitter;
    readonly onActivated: Event<ExtensionActivatedEvent>;
    private readonly onSearchResultsEmitter;
    readonly onSearchResults: Event<SearchResult>;
    constructor();
    /**
     * Initialize marketplace system
     */
    initialize(config: {
        extensionsPath: string;
        userExtensionsPath: string;
        marketplaceClient?: MarketplaceClient;
        autoUpdate?: boolean;
    }): Promise<void>;
    /**
     * Set marketplace client
     */
    setMarketplaceClient(client: MarketplaceClient): void;
    /**
     * Search marketplace
     */
    search(query: SearchQuery): Promise<SearchResult>;
    /**
     * Get extension details from marketplace
     */
    getMarketplaceExtension(extensionId: string): Promise<MarketplaceExtension | null>;
    /**
     * Get extension readme
     */
    getReadme(extensionId: string): Promise<string>;
    /**
     * Get extension changelog
     */
    getChangelog(extensionId: string): Promise<string>;
    /**
     * Get extension reviews
     */
    getReviews(extensionId: string, page?: number): Promise<ExtensionReview[]>;
    /**
     * Install extension
     */
    install(extensionId: string, options?: InstallOptions): Promise<InstalledExtension>;
    /**
     * Internal install implementation
     */
    private doInstall;
    /**
     * Install from VSIX file
     */
    installFromVsix(vsixPath: string): Promise<InstalledExtension>;
    /**
     * Uninstall extension
     */
    uninstall(extensionId: string): Promise<void>;
    /**
     * Internal uninstall implementation
     */
    private doUninstall;
    /**
     * Enable extension
     */
    enable(extensionId: string): Promise<void>;
    /**
     * Disable extension
     */
    disable(extensionId: string): Promise<void>;
    /**
     * Check for updates
     */
    checkForUpdates(): Promise<Map<string, ExtensionVersion>>;
    /**
     * Update extension
     */
    update(extensionId: string, version?: string): Promise<InstalledExtension>;
    /**
     * Update all extensions
     */
    updateAll(): Promise<InstalledExtension[]>;
    /**
     * Set auto-update
     */
    setAutoUpdate(enabled: boolean): void;
    /**
     * Activate extension
     */
    activate(extensionId: string, reason?: string): Promise<void>;
    /**
     * Deactivate extension
     */
    deactivate(extensionId: string): Promise<void>;
    /**
     * Get installed extension
     */
    getExtension(extensionId: string): InstalledExtension | undefined;
    /**
     * Get all installed extensions
     */
    getAllExtensions(): InstalledExtension[];
    /**
     * Get user-installed extensions
     */
    getUserExtensions(): InstalledExtension[];
    /**
     * Get builtin extensions
     */
    getBuiltinExtensions(): InstalledExtension[];
    /**
     * Get active extensions
     */
    getActiveExtensions(): InstalledExtension[];
    /**
     * Get extensions with updates
     */
    getExtensionsWithUpdates(): InstalledExtension[];
    /**
     * Is extension installed
     */
    isInstalled(extensionId: string): boolean;
    /**
     * Is extension active
     */
    isActive(extensionId: string): boolean;
    /**
     * Update extension state
     */
    private updateState;
    /**
     * Compare semantic versions
     */
    private compareVersions;
    /**
     * Load builtin extensions
     */
    private loadBuiltinExtensions;
    /**
     * Load user extensions
     */
    private loadUserExtensions;
    /**
     * Start auto-update check
     */
    private startAutoUpdateCheck;
    /**
     * Extract extension from VSIX
     */
    private extractExtension;
    /**
     * Extract manifest from VSIX
     */
    private extractManifest;
    /**
     * Read file
     */
    private readFile;
    /**
     * Remove directory
     */
    private removeDirectory;
    /**
     * Dispose
     */
    dispose(): void;
}
export default ExtensionMarketplaceSystem;
