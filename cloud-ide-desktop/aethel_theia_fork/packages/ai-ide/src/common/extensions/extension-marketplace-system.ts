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

// ==================== Marketplace Types ====================

/**
 * Extension state
 */
export enum ExtensionState {
    NotInstalled = 'notInstalled',
    Installing = 'installing',
    Installed = 'installed',
    Updating = 'updating',
    Uninstalling = 'uninstalling',
    Disabled = 'disabled',
    Error = 'error'
}

/**
 * Extension type
 */
export enum ExtensionType {
    Language = 'language',
    Theme = 'theme',
    Snippet = 'snippet',
    Debugger = 'debugger',
    Formatter = 'formatter',
    Linter = 'linter',
    Tool = 'tool',
    Keybinding = 'keybinding',
    AI = 'ai',
    Game = 'game',
    Graphics = 'graphics',
    Audio = 'audio',
    Other = 'other'
}

/**
 * Extension category
 */
export enum ExtensionCategory {
    Programming = 'programming',
    Themes = 'themes',
    Snippets = 'snippets',
    Debuggers = 'debuggers',
    Formatters = 'formatters',
    Linters = 'linters',
    LanguagePacks = 'languagePacks',
    AI = 'ai',
    Testing = 'testing',
    SCM = 'scm',
    Visualization = 'visualization',
    DataScience = 'dataScience',
    GameDev = 'gameDev',
    Education = 'education',
    Other = 'other'
}

/**
 * Sort order
 */
export enum SortBy {
    Relevance = 'relevance',
    Downloads = 'downloads',
    Rating = 'rating',
    RecentlyUpdated = 'recentlyUpdated',
    Name = 'name',
    PublisherName = 'publisherName',
    TrendingDaily = 'trendingDaily',
    TrendingWeekly = 'trendingWeekly',
    TrendingMonthly = 'trendingMonthly'
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
    
    // Categories and keywords
    categories?: ExtensionCategory[];
    keywords?: string[];
    
    // Engine compatibility
    engines: {
        aethel: string;
        vscode?: string;
        theia?: string;
    };
    
    // Activation
    activationEvents?: string[];
    main?: string;
    browser?: string;
    
    // Contributions
    contributes?: ExtensionContributions;
    
    // Dependencies
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    extensionDependencies?: string[];
    extensionPack?: string[];
    
    // Metadata
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
    
    // Repository
    repository?: {
        type: string;
        url: string;
    };
    bugs?: {
        url: string;
    };
    homepage?: string;
    license?: string;
    
    // Pricing
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

// Contribution types (simplified)
export interface ExtensionCommand { command: string; title: string; category?: string; icon?: string; }
export interface MenuContribution { command: string; when?: string; group?: string; }
export interface KeybindingContribution { command: string; key: string; mac?: string; linux?: string; when?: string; }
export interface LanguageContribution { id: string; aliases?: string[]; extensions?: string[]; filenames?: string[]; configuration?: string; }
export interface GrammarContribution { language: string; scopeName: string; path: string; }
export interface ThemeContribution { id: string; label: string; uiTheme: string; path: string; }
export interface IconThemeContribution { id: string; label: string; path: string; }
export interface ProductIconThemeContribution { id: string; label: string; path: string; }
export interface SnippetContribution { language: string; path: string; }
export interface JsonValidationContribution { fileMatch: string | string[]; url: string; }
export interface ViewContribution { id: string; name: string; when?: string; icon?: string; }
export interface ViewContainerContribution { id: string; title: string; icon: string; }
export interface ConfigurationContribution { title: string; properties: Record<string, unknown>; }
export interface TaskDefinitionContribution { type: string; required?: string[]; properties?: Record<string, unknown>; }
export interface ProblemMatcherContribution { name: string; owner: string; pattern: unknown; }
export interface ProblemPatternContribution { name: string; regexp: string; }
export interface DebuggerContribution { type: string; label: string; program?: string; }
export interface BreakpointContribution { language: string; }
export interface TerminalContribution { profiles?: unknown[]; }
export interface ColorContribution { id: string; description: string; defaults: unknown; }
export interface SemanticTokenTypeContribution { id: string; description: string; }
export interface SemanticTokenModifierContribution { id: string; description: string; }
export interface SemanticTokenScopeContribution { language?: string; scopes: Record<string, string[]>; }
export interface CustomEditorContribution { viewType: string; displayName: string; selector: unknown[]; }
export interface NotebookContribution { type: string; displayName: string; selector: unknown[]; }
export interface NotebookRendererContribution { id: string; displayName: string; mimeTypes: string[]; }

/**
 * Extension info from marketplace
 */
export interface MarketplaceExtension {
    id: string;
    manifest: ExtensionManifest;
    
    // Marketplace metadata
    publishedDate: string;
    lastUpdated: string;
    releaseDate?: string;
    
    // Statistics
    statistics: ExtensionStatistics;
    
    // Assets
    assets: ExtensionAssets;
    
    // Publisher
    publisher: PublisherInfo;
    
    // Flags
    flags: ExtensionFlags;
    
    // Versions
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
    
    // Runtime
    isActive: boolean;
    activationReason?: string;
    
    // Update
    availableUpdate?: ExtensionVersion;
    autoUpdate: boolean;
    
    // Local extension
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
    
    // Filters
    featured?: boolean;
    trending?: boolean;
    verified?: boolean;
    
    // Target
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

// ==================== Events ====================

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

// ==================== Marketplace Client Interface ====================

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

// ==================== Main Extension Marketplace System ====================

@injectable()
export class ExtensionMarketplaceSystem {
    // Installed extensions
    private readonly installed: Map<string, InstalledExtension> = new Map();
    
    // Builtin extensions
    private readonly builtins: Map<string, InstalledExtension> = new Map();
    
    // Active extensions
    private readonly active: Set<string> = new Set();
    
    // Pending operations
    private readonly pendingInstalls: Map<string, Promise<InstalledExtension>> = new Map();
    private readonly pendingUninstalls: Map<string, Promise<void>> = new Map();
    
    // Marketplace client
    private marketplaceClient: MarketplaceClient | null = null;
    
    // Paths
    private extensionsPath: string = '';
    private userExtensionsPath: string = '';
    
    // Auto-update
    private autoUpdateEnabled: boolean = true;
    private checkUpdateInterval: number = 3600000; // 1 hour
    private updateCheckTimer: ReturnType<typeof setInterval> | null = null;
    
    // Events
    private readonly onInstalledEmitter = new Emitter<ExtensionInstalledEvent>();
    readonly onInstalled: Event<ExtensionInstalledEvent> = this.onInstalledEmitter.event;
    
    private readonly onUninstalledEmitter = new Emitter<ExtensionUninstalledEvent>();
    readonly onUninstalled: Event<ExtensionUninstalledEvent> = this.onUninstalledEmitter.event;
    
    private readonly onUpdatedEmitter = new Emitter<ExtensionUpdatedEvent>();
    readonly onUpdated: Event<ExtensionUpdatedEvent> = this.onUpdatedEmitter.event;
    
    private readonly onStateChangedEmitter = new Emitter<ExtensionStateChangedEvent>();
    readonly onStateChanged: Event<ExtensionStateChangedEvent> = this.onStateChangedEmitter.event;
    
    private readonly onActivatedEmitter = new Emitter<ExtensionActivatedEvent>();
    readonly onActivated: Event<ExtensionActivatedEvent> = this.onActivatedEmitter.event;
    
    private readonly onSearchResultsEmitter = new Emitter<SearchResult>();
    readonly onSearchResults: Event<SearchResult> = this.onSearchResultsEmitter.event;

    constructor() {
        // Initialize will be called after DI
    }

    // ==================== Initialization ====================

    /**
     * Initialize marketplace system
     */
    async initialize(config: {
        extensionsPath: string;
        userExtensionsPath: string;
        marketplaceClient?: MarketplaceClient;
        autoUpdate?: boolean;
    }): Promise<void> {
        this.extensionsPath = config.extensionsPath;
        this.userExtensionsPath = config.userExtensionsPath;
        this.marketplaceClient = config.marketplaceClient || null;
        this.autoUpdateEnabled = config.autoUpdate ?? true;
        
        // Load builtin extensions
        await this.loadBuiltinExtensions();
        
        // Load user extensions
        await this.loadUserExtensions();
        
        // Start auto-update check
        if (this.autoUpdateEnabled && this.marketplaceClient) {
            this.startAutoUpdateCheck();
        }
    }

    /**
     * Set marketplace client
     */
    setMarketplaceClient(client: MarketplaceClient): void {
        this.marketplaceClient = client;
        
        if (this.autoUpdateEnabled && !this.updateCheckTimer) {
            this.startAutoUpdateCheck();
        }
    }

    // ==================== Search ====================

    /**
     * Search marketplace
     */
    async search(query: SearchQuery): Promise<SearchResult> {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        
        const result = await this.marketplaceClient.search(query);
        
        // Mark installed extensions
        for (const ext of result.extensions) {
            const installed = this.installed.get(ext.id);
            if (installed) {
                // Check for updates
                const latestVersion = ext.versions[0];
                if (latestVersion && this.compareVersions(latestVersion.version, installed.manifest.version) > 0) {
                    installed.availableUpdate = latestVersion;
                }
            }
        }
        
        this.onSearchResultsEmitter.fire(result);
        return result;
    }

    /**
     * Get extension details from marketplace
     */
    async getMarketplaceExtension(extensionId: string): Promise<MarketplaceExtension | null> {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        
        return this.marketplaceClient.getExtension(extensionId);
    }

    /**
     * Get extension readme
     */
    async getReadme(extensionId: string): Promise<string> {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        
        return this.marketplaceClient.getReadme(extensionId);
    }

    /**
     * Get extension changelog
     */
    async getChangelog(extensionId: string): Promise<string> {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        
        return this.marketplaceClient.getChangelog(extensionId);
    }

    /**
     * Get extension reviews
     */
    async getReviews(extensionId: string, page?: number): Promise<ExtensionReview[]> {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        
        return this.marketplaceClient.getReviews(extensionId, page);
    }

    // ==================== Installation ====================

    /**
     * Install extension
     */
    async install(extensionId: string, options: InstallOptions = {}): Promise<InstalledExtension> {
        // Check if already installing
        const pending = this.pendingInstalls.get(extensionId);
        if (pending) {
            return pending;
        }
        
        // Check if already installed
        const existing = this.installed.get(extensionId);
        if (existing && !options.force) {
            // Check if update needed
            if (!options.version || this.compareVersions(existing.manifest.version, options.version) >= 0) {
                return existing;
            }
        }
        
        // Start installation
        const installPromise = this.doInstall(extensionId, options);
        this.pendingInstalls.set(extensionId, installPromise);
        
        try {
            const installed = await installPromise;
            return installed;
        } finally {
            this.pendingInstalls.delete(extensionId);
        }
    }

    /**
     * Internal install implementation
     */
    private async doInstall(extensionId: string, options: InstallOptions): Promise<InstalledExtension> {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        
        const existing = this.installed.get(extensionId);
        const previousVersion = existing?.manifest.version;
        
        // Update state
        if (existing) {
            this.updateState(extensionId, ExtensionState.Updating);
        }
        
        try {
            // Get extension info
            const marketplaceExt = await this.marketplaceClient.getExtension(extensionId);
            if (!marketplaceExt) {
                throw new Error(`Extension not found: ${extensionId}`);
            }
            
            // Determine version to install
            let targetVersion = options.version;
            if (!targetVersion) {
                const versions = marketplaceExt.versions.filter(v => 
                    options.preRelease || !v.properties?.preRelease
                );
                targetVersion = versions[0]?.version;
            }
            
            if (!targetVersion) {
                throw new Error(`No compatible version found for: ${extensionId}`);
            }
            
            // Check compatibility
            const versionInfo = marketplaceExt.versions.find(v => v.version === targetVersion);
            if (!versionInfo) {
                throw new Error(`Version ${targetVersion} not found for: ${extensionId}`);
            }
            
            // Install dependencies first
            if (options.installDependencies !== false && marketplaceExt.manifest.extensionDependencies) {
                for (const depId of marketplaceExt.manifest.extensionDependencies) {
                    if (!this.installed.has(depId)) {
                        await this.install(depId, { installDependencies: true });
                    }
                }
            }
            
            // Download VSIX
            const vsixBuffer = await this.marketplaceClient.download(extensionId, targetVersion);
            
            // Extract to extensions path
            const installPath = await this.extractExtension(extensionId, targetVersion, vsixBuffer);
            
            // Create installed extension record
            const installed: InstalledExtension = {
                id: extensionId,
                manifest: marketplaceExt.manifest,
                state: ExtensionState.Installed,
                installPath,
                installedAt: existing?.installedAt || Date.now(),
                updatedAt: Date.now(),
                isBuiltin: false,
                isUserInstalled: true,
                isActive: false,
                autoUpdate: true,
                marketplaceInfo: marketplaceExt
            };
            
            // Store
            this.installed.set(extensionId, installed);
            
            // Fire events
            if (previousVersion) {
                this.onUpdatedEmitter.fire({ extension: installed, previousVersion });
            } else {
                this.onInstalledEmitter.fire({ extension: installed });
            }
            
            return installed;
            
        } catch (error) {
            if (existing) {
                this.updateState(extensionId, ExtensionState.Installed);
            }
            throw error;
        }
    }

    /**
     * Install from VSIX file
     */
    async installFromVsix(vsixPath: string): Promise<InstalledExtension> {
        // Read VSIX file
        const vsixBuffer = await this.readFile(vsixPath);
        
        // Extract manifest to get extension ID
        const manifest = await this.extractManifest(vsixBuffer);
        const extensionId = `${manifest.publisher}.${manifest.name}`;
        
        // Extract to extensions path
        const installPath = await this.extractExtension(extensionId, manifest.version, vsixBuffer);
        
        // Create installed extension record
        const installed: InstalledExtension = {
            id: extensionId,
            manifest,
            state: ExtensionState.Installed,
            installPath,
            installedAt: Date.now(),
            isBuiltin: false,
            isUserInstalled: true,
            isActive: false,
            autoUpdate: false
        };
        
        // Store
        this.installed.set(extensionId, installed);
        
        // Fire event
        this.onInstalledEmitter.fire({ extension: installed });
        
        return installed;
    }

    /**
     * Uninstall extension
     */
    async uninstall(extensionId: string): Promise<void> {
        // Check if already uninstalling
        const pending = this.pendingUninstalls.get(extensionId);
        if (pending) {
            return pending;
        }
        
        const extension = this.installed.get(extensionId);
        if (!extension) {
            return;
        }
        
        if (extension.isBuiltin) {
            throw new Error('Cannot uninstall builtin extension');
        }
        
        const uninstallPromise = this.doUninstall(extensionId);
        this.pendingUninstalls.set(extensionId, uninstallPromise);
        
        try {
            await uninstallPromise;
        } finally {
            this.pendingUninstalls.delete(extensionId);
        }
    }

    /**
     * Internal uninstall implementation
     */
    private async doUninstall(extensionId: string): Promise<void> {
        const extension = this.installed.get(extensionId);
        if (!extension) return;
        
        // Update state
        this.updateState(extensionId, ExtensionState.Uninstalling);
        
        try {
            // Deactivate if active
            if (extension.isActive) {
                await this.deactivate(extensionId);
            }
            
            // Remove files
            await this.removeDirectory(extension.installPath);
            
            // Remove from map
            this.installed.delete(extensionId);
            this.active.delete(extensionId);
            
            // Fire event
            this.onUninstalledEmitter.fire({ extensionId });
            
        } catch (error) {
            this.updateState(extensionId, ExtensionState.Installed);
            throw error;
        }
    }

    /**
     * Enable extension
     */
    async enable(extensionId: string): Promise<void> {
        const extension = this.installed.get(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }
        
        if (extension.state === ExtensionState.Installed) {
            return; // Already enabled
        }
        
        if (extension.state !== ExtensionState.Disabled) {
            throw new Error(`Cannot enable extension in state: ${extension.state}`);
        }
        
        this.updateState(extensionId, ExtensionState.Installed);
    }

    /**
     * Disable extension
     */
    async disable(extensionId: string): Promise<void> {
        const extension = this.installed.get(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }
        
        if (extension.state === ExtensionState.Disabled) {
            return; // Already disabled
        }
        
        // Deactivate if active
        if (extension.isActive) {
            await this.deactivate(extensionId);
        }
        
        this.updateState(extensionId, ExtensionState.Disabled);
    }

    // ==================== Update ====================

    /**
     * Check for updates
     */
    async checkForUpdates(): Promise<Map<string, ExtensionVersion>> {
        if (!this.marketplaceClient) {
            return new Map();
        }
        
        const updates = new Map<string, ExtensionVersion>();
        
        for (const [extensionId, extension] of this.installed) {
            if (extension.isBuiltin) continue;
            
            try {
                const versions = await this.marketplaceClient.getVersions(extensionId);
                const latestVersion = versions[0];
                
                if (latestVersion && this.compareVersions(latestVersion.version, extension.manifest.version) > 0) {
                    extension.availableUpdate = latestVersion;
                    updates.set(extensionId, latestVersion);
                }
            } catch {
                // Ignore errors for individual extensions
            }
        }
        
        return updates;
    }

    /**
     * Update extension
     */
    async update(extensionId: string, version?: string): Promise<InstalledExtension> {
        const extension = this.installed.get(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }
        
        const targetVersion = version || extension.availableUpdate?.version;
        if (!targetVersion) {
            throw new Error(`No update available for: ${extensionId}`);
        }
        
        return this.install(extensionId, { version: targetVersion, force: true });
    }

    /**
     * Update all extensions
     */
    async updateAll(): Promise<InstalledExtension[]> {
        const updates = await this.checkForUpdates();
        const results: InstalledExtension[] = [];
        
        for (const extensionId of updates.keys()) {
            try {
                const updated = await this.update(extensionId);
                results.push(updated);
            } catch {
                // Continue with other updates
            }
        }
        
        return results;
    }

    /**
     * Set auto-update
     */
    setAutoUpdate(enabled: boolean): void {
        this.autoUpdateEnabled = enabled;
        
        if (enabled && !this.updateCheckTimer && this.marketplaceClient) {
            this.startAutoUpdateCheck();
        } else if (!enabled && this.updateCheckTimer) {
            clearInterval(this.updateCheckTimer);
            this.updateCheckTimer = null;
        }
    }

    // ==================== Activation ====================

    /**
     * Activate extension
     */
    async activate(extensionId: string, reason: string = 'user'): Promise<void> {
        const extension = this.installed.get(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }
        
        if (extension.isActive) {
            return; // Already active
        }
        
        if (extension.state !== ExtensionState.Installed) {
            throw new Error(`Cannot activate extension in state: ${extension.state}`);
        }
        
        // Activate dependencies first
        if (extension.manifest.extensionDependencies) {
            for (const depId of extension.manifest.extensionDependencies) {
                await this.activate(depId, 'dependency');
            }
        }
        
        // TODO: Actually load and run extension code
        // This would involve the extension host
        
        extension.isActive = true;
        extension.activationReason = reason;
        this.active.add(extensionId);
        
        this.onActivatedEmitter.fire({ extensionId, reason });
    }

    /**
     * Deactivate extension
     */
    async deactivate(extensionId: string): Promise<void> {
        const extension = this.installed.get(extensionId);
        if (!extension || !extension.isActive) {
            return;
        }
        
        // TODO: Actually deactivate extension
        // This would involve the extension host
        
        extension.isActive = false;
        extension.activationReason = undefined;
        this.active.delete(extensionId);
    }

    // ==================== Getters ====================

    /**
     * Get installed extension
     */
    getExtension(extensionId: string): InstalledExtension | undefined {
        return this.installed.get(extensionId) || this.builtins.get(extensionId);
    }

    /**
     * Get all installed extensions
     */
    getAllExtensions(): InstalledExtension[] {
        return [
            ...Array.from(this.builtins.values()),
            ...Array.from(this.installed.values())
        ];
    }

    /**
     * Get user-installed extensions
     */
    getUserExtensions(): InstalledExtension[] {
        return Array.from(this.installed.values()).filter(e => e.isUserInstalled);
    }

    /**
     * Get builtin extensions
     */
    getBuiltinExtensions(): InstalledExtension[] {
        return Array.from(this.builtins.values());
    }

    /**
     * Get active extensions
     */
    getActiveExtensions(): InstalledExtension[] {
        return Array.from(this.active)
            .map(id => this.installed.get(id) || this.builtins.get(id))
            .filter((ext): ext is InstalledExtension => ext !== undefined);
    }

    /**
     * Get extensions with updates
     */
    getExtensionsWithUpdates(): InstalledExtension[] {
        return Array.from(this.installed.values()).filter(e => e.availableUpdate);
    }

    /**
     * Is extension installed
     */
    isInstalled(extensionId: string): boolean {
        return this.installed.has(extensionId) || this.builtins.has(extensionId);
    }

    /**
     * Is extension active
     */
    isActive(extensionId: string): boolean {
        return this.active.has(extensionId);
    }

    // ==================== Helpers ====================

    /**
     * Update extension state
     */
    private updateState(extensionId: string, newState: ExtensionState): void {
        const extension = this.installed.get(extensionId);
        if (!extension) return;
        
        const oldState = extension.state;
        extension.state = newState;
        
        this.onStateChangedEmitter.fire({ extensionId, oldState, newState });
    }

    /**
     * Compare semantic versions
     */
    private compareVersions(v1: string, v2: string): number {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        
        return 0;
    }

    /**
     * Load builtin extensions
     */
    private async loadBuiltinExtensions(): Promise<void> {
        // TODO: Scan extensions path and load builtin extensions
    }

    /**
     * Load user extensions
     */
    private async loadUserExtensions(): Promise<void> {
        // TODO: Scan user extensions path and load installed extensions
    }

    /**
     * Start auto-update check
     */
    private startAutoUpdateCheck(): void {
        this.updateCheckTimer = setInterval(() => {
            this.checkForUpdates().catch(() => {});
        }, this.checkUpdateInterval);
    }

    /**
     * Extract extension from VSIX
     */
    private async extractExtension(extensionId: string, version: string, vsixBuffer: Buffer): Promise<string> {
        const installPath = `${this.userExtensionsPath}/${extensionId}-${version}`;
        // TODO: Implement actual extraction using JSZip or similar
        return installPath;
    }

    /**
     * Extract manifest from VSIX
     */
    private async extractManifest(vsixBuffer: Buffer): Promise<ExtensionManifest> {
        // TODO: Implement actual extraction
        throw new Error('Not implemented');
    }

    /**
     * Read file
     */
    private async readFile(path: string): Promise<Buffer> {
        // TODO: Implement using fs
        throw new Error('Not implemented');
    }

    /**
     * Remove directory
     */
    private async removeDirectory(path: string): Promise<void> {
        // TODO: Implement using fs
    }

    /**
     * Dispose
     */
    dispose(): void {
        if (this.updateCheckTimer) {
            clearInterval(this.updateCheckTimer);
            this.updateCheckTimer = null;
        }
        
        this.installed.clear();
        this.builtins.clear();
        this.active.clear();
        this.pendingInstalls.clear();
        this.pendingUninstalls.clear();
        
        this.onInstalledEmitter.dispose();
        this.onUninstalledEmitter.dispose();
        this.onUpdatedEmitter.dispose();
        this.onStateChangedEmitter.dispose();
        this.onActivatedEmitter.dispose();
        this.onSearchResultsEmitter.dispose();
    }
}

// ==================== Export ====================

export default ExtensionMarketplaceSystem;
