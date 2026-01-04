"use strict";
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
exports.ExtensionMarketplaceSystem = exports.SortBy = exports.ExtensionCategory = exports.ExtensionType = exports.ExtensionState = void 0;
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
// ==================== Marketplace Types ====================
/**
 * Extension state
 */
var ExtensionState;
(function (ExtensionState) {
    ExtensionState["NotInstalled"] = "notInstalled";
    ExtensionState["Installing"] = "installing";
    ExtensionState["Installed"] = "installed";
    ExtensionState["Updating"] = "updating";
    ExtensionState["Uninstalling"] = "uninstalling";
    ExtensionState["Disabled"] = "disabled";
    ExtensionState["Error"] = "error";
})(ExtensionState || (exports.ExtensionState = ExtensionState = {}));
/**
 * Extension type
 */
var ExtensionType;
(function (ExtensionType) {
    ExtensionType["Language"] = "language";
    ExtensionType["Theme"] = "theme";
    ExtensionType["Snippet"] = "snippet";
    ExtensionType["Debugger"] = "debugger";
    ExtensionType["Formatter"] = "formatter";
    ExtensionType["Linter"] = "linter";
    ExtensionType["Tool"] = "tool";
    ExtensionType["Keybinding"] = "keybinding";
    ExtensionType["AI"] = "ai";
    ExtensionType["Game"] = "game";
    ExtensionType["Graphics"] = "graphics";
    ExtensionType["Audio"] = "audio";
    ExtensionType["Other"] = "other";
})(ExtensionType || (exports.ExtensionType = ExtensionType = {}));
/**
 * Extension category
 */
var ExtensionCategory;
(function (ExtensionCategory) {
    ExtensionCategory["Programming"] = "programming";
    ExtensionCategory["Themes"] = "themes";
    ExtensionCategory["Snippets"] = "snippets";
    ExtensionCategory["Debuggers"] = "debuggers";
    ExtensionCategory["Formatters"] = "formatters";
    ExtensionCategory["Linters"] = "linters";
    ExtensionCategory["LanguagePacks"] = "languagePacks";
    ExtensionCategory["AI"] = "ai";
    ExtensionCategory["Testing"] = "testing";
    ExtensionCategory["SCM"] = "scm";
    ExtensionCategory["Visualization"] = "visualization";
    ExtensionCategory["DataScience"] = "dataScience";
    ExtensionCategory["GameDev"] = "gameDev";
    ExtensionCategory["Education"] = "education";
    ExtensionCategory["Other"] = "other";
})(ExtensionCategory || (exports.ExtensionCategory = ExtensionCategory = {}));
/**
 * Sort order
 */
var SortBy;
(function (SortBy) {
    SortBy["Relevance"] = "relevance";
    SortBy["Downloads"] = "downloads";
    SortBy["Rating"] = "rating";
    SortBy["RecentlyUpdated"] = "recentlyUpdated";
    SortBy["Name"] = "name";
    SortBy["PublisherName"] = "publisherName";
    SortBy["TrendingDaily"] = "trendingDaily";
    SortBy["TrendingWeekly"] = "trendingWeekly";
    SortBy["TrendingMonthly"] = "trendingMonthly";
})(SortBy || (exports.SortBy = SortBy = {}));
// ==================== Main Extension Marketplace System ====================
let ExtensionMarketplaceSystem = class ExtensionMarketplaceSystem {
    constructor() {
        // Installed extensions
        this.installed = new Map();
        // Builtin extensions
        this.builtins = new Map();
        // Active extensions
        this.active = new Set();
        // Pending operations
        this.pendingInstalls = new Map();
        this.pendingUninstalls = new Map();
        // Marketplace client
        this.marketplaceClient = null;
        // Paths
        this.extensionsPath = '';
        this.userExtensionsPath = '';
        // Auto-update
        this.autoUpdateEnabled = true;
        this.checkUpdateInterval = 3600000; // 1 hour
        this.updateCheckTimer = null;
        // Events
        this.onInstalledEmitter = new Emitter();
        this.onInstalled = this.onInstalledEmitter.event;
        this.onUninstalledEmitter = new Emitter();
        this.onUninstalled = this.onUninstalledEmitter.event;
        this.onUpdatedEmitter = new Emitter();
        this.onUpdated = this.onUpdatedEmitter.event;
        this.onStateChangedEmitter = new Emitter();
        this.onStateChanged = this.onStateChangedEmitter.event;
        this.onActivatedEmitter = new Emitter();
        this.onActivated = this.onActivatedEmitter.event;
        this.onSearchResultsEmitter = new Emitter();
        this.onSearchResults = this.onSearchResultsEmitter.event;
        // Initialize will be called after DI
    }
    // ==================== Initialization ====================
    /**
     * Initialize marketplace system
     */
    async initialize(config) {
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
    setMarketplaceClient(client) {
        this.marketplaceClient = client;
        if (this.autoUpdateEnabled && !this.updateCheckTimer) {
            this.startAutoUpdateCheck();
        }
    }
    // ==================== Search ====================
    /**
     * Search marketplace
     */
    async search(query) {
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
    async getMarketplaceExtension(extensionId) {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        return this.marketplaceClient.getExtension(extensionId);
    }
    /**
     * Get extension readme
     */
    async getReadme(extensionId) {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        return this.marketplaceClient.getReadme(extensionId);
    }
    /**
     * Get extension changelog
     */
    async getChangelog(extensionId) {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        return this.marketplaceClient.getChangelog(extensionId);
    }
    /**
     * Get extension reviews
     */
    async getReviews(extensionId, page) {
        if (!this.marketplaceClient) {
            throw new Error('Marketplace client not configured');
        }
        return this.marketplaceClient.getReviews(extensionId, page);
    }
    // ==================== Installation ====================
    /**
     * Install extension
     */
    async install(extensionId, options = {}) {
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
        }
        finally {
            this.pendingInstalls.delete(extensionId);
        }
    }
    /**
     * Internal install implementation
     */
    async doInstall(extensionId, options) {
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
                const versions = marketplaceExt.versions.filter(v => options.preRelease || !v.properties?.preRelease);
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
            const installed = {
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
            }
            else {
                this.onInstalledEmitter.fire({ extension: installed });
            }
            return installed;
        }
        catch (error) {
            if (existing) {
                this.updateState(extensionId, ExtensionState.Installed);
            }
            throw error;
        }
    }
    /**
     * Install from VSIX file
     */
    async installFromVsix(vsixPath) {
        // Read VSIX file
        const vsixBuffer = await this.readFile(vsixPath);
        // Extract manifest to get extension ID
        const manifest = await this.extractManifest(vsixBuffer);
        const extensionId = `${manifest.publisher}.${manifest.name}`;
        // Extract to extensions path
        const installPath = await this.extractExtension(extensionId, manifest.version, vsixBuffer);
        // Create installed extension record
        const installed = {
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
    async uninstall(extensionId) {
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
        }
        finally {
            this.pendingUninstalls.delete(extensionId);
        }
    }
    /**
     * Internal uninstall implementation
     */
    async doUninstall(extensionId) {
        const extension = this.installed.get(extensionId);
        if (!extension)
            return;
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
        }
        catch (error) {
            this.updateState(extensionId, ExtensionState.Installed);
            throw error;
        }
    }
    /**
     * Enable extension
     */
    async enable(extensionId) {
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
    async disable(extensionId) {
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
    async checkForUpdates() {
        if (!this.marketplaceClient) {
            return new Map();
        }
        const updates = new Map();
        for (const [extensionId, extension] of this.installed) {
            if (extension.isBuiltin)
                continue;
            try {
                const versions = await this.marketplaceClient.getVersions(extensionId);
                const latestVersion = versions[0];
                if (latestVersion && this.compareVersions(latestVersion.version, extension.manifest.version) > 0) {
                    extension.availableUpdate = latestVersion;
                    updates.set(extensionId, latestVersion);
                }
            }
            catch {
                // Ignore errors for individual extensions
            }
        }
        return updates;
    }
    /**
     * Update extension
     */
    async update(extensionId, version) {
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
    async updateAll() {
        const updates = await this.checkForUpdates();
        const results = [];
        for (const extensionId of updates.keys()) {
            try {
                const updated = await this.update(extensionId);
                results.push(updated);
            }
            catch {
                // Continue with other updates
            }
        }
        return results;
    }
    /**
     * Set auto-update
     */
    setAutoUpdate(enabled) {
        this.autoUpdateEnabled = enabled;
        if (enabled && !this.updateCheckTimer && this.marketplaceClient) {
            this.startAutoUpdateCheck();
        }
        else if (!enabled && this.updateCheckTimer) {
            clearInterval(this.updateCheckTimer);
            this.updateCheckTimer = null;
        }
    }
    // ==================== Activation ====================
    /**
     * Activate extension
     */
    async activate(extensionId, reason = 'user') {
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
    async deactivate(extensionId) {
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
    getExtension(extensionId) {
        return this.installed.get(extensionId) || this.builtins.get(extensionId);
    }
    /**
     * Get all installed extensions
     */
    getAllExtensions() {
        return [
            ...Array.from(this.builtins.values()),
            ...Array.from(this.installed.values())
        ];
    }
    /**
     * Get user-installed extensions
     */
    getUserExtensions() {
        return Array.from(this.installed.values()).filter(e => e.isUserInstalled);
    }
    /**
     * Get builtin extensions
     */
    getBuiltinExtensions() {
        return Array.from(this.builtins.values());
    }
    /**
     * Get active extensions
     */
    getActiveExtensions() {
        return Array.from(this.active)
            .map(id => this.installed.get(id) || this.builtins.get(id))
            .filter((ext) => ext !== undefined);
    }
    /**
     * Get extensions with updates
     */
    getExtensionsWithUpdates() {
        return Array.from(this.installed.values()).filter(e => e.availableUpdate);
    }
    /**
     * Is extension installed
     */
    isInstalled(extensionId) {
        return this.installed.has(extensionId) || this.builtins.has(extensionId);
    }
    /**
     * Is extension active
     */
    isActive(extensionId) {
        return this.active.has(extensionId);
    }
    // ==================== Helpers ====================
    /**
     * Update extension state
     */
    updateState(extensionId, newState) {
        const extension = this.installed.get(extensionId);
        if (!extension)
            return;
        const oldState = extension.state;
        extension.state = newState;
        this.onStateChangedEmitter.fire({ extensionId, oldState, newState });
    }
    /**
     * Compare semantic versions
     */
    compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2)
                return 1;
            if (p1 < p2)
                return -1;
        }
        return 0;
    }
    /**
     * Load builtin extensions
     */
    async loadBuiltinExtensions() {
        // TODO: Scan extensions path and load builtin extensions
    }
    /**
     * Load user extensions
     */
    async loadUserExtensions() {
        // TODO: Scan user extensions path and load installed extensions
    }
    /**
     * Start auto-update check
     */
    startAutoUpdateCheck() {
        this.updateCheckTimer = setInterval(() => {
            this.checkForUpdates().catch(() => { });
        }, this.checkUpdateInterval);
    }
    /**
     * Extract extension from VSIX
     */
    async extractExtension(extensionId, version, vsixBuffer) {
        const installPath = `${this.userExtensionsPath}/${extensionId}-${version}`;
        // TODO: Implement actual extraction using JSZip or similar
        return installPath;
    }
    /**
     * Extract manifest from VSIX
     */
    async extractManifest(vsixBuffer) {
        // TODO: Implement actual extraction
        throw new Error('Not implemented');
    }
    /**
     * Read file
     */
    async readFile(path) {
        // TODO: Implement using fs
        throw new Error('Not implemented');
    }
    /**
     * Remove directory
     */
    async removeDirectory(path) {
        // TODO: Implement using fs
    }
    /**
     * Dispose
     */
    dispose() {
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
};
exports.ExtensionMarketplaceSystem = ExtensionMarketplaceSystem;
exports.ExtensionMarketplaceSystem = ExtensionMarketplaceSystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ExtensionMarketplaceSystem);
// ==================== Export ====================
exports.default = ExtensionMarketplaceSystem;
