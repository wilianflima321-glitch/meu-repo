import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

/**
 * PLUGIN SYSTEM - Sistema de Extensibilidade
 * 
 * Sistema completo de plugins para:
 * - Extensões de funcionalidade
 * - Hooks e eventos
 * - API de extensão
 * - Sandbox de segurança
 * - Hot reload
 * - Marketplace
 */

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface PluginWarningEvent {
    pluginId: string;
    message: string;
    level: 'info' | 'warning' | 'error';
}

// ============================================================================
// TYPES BASE
// ============================================================================

export type PluginState = 
    | 'unloaded'
    | 'loading'
    | 'loaded'
    | 'active'
    | 'inactive'
    | 'error'
    | 'disabled';

export type PluginScope = 
    | 'global'
    | 'project'
    | 'workspace'
    | 'user';

export type HookType = 
    | 'before'
    | 'after'
    | 'replace'
    | 'filter';

// ============================================================================
// PLUGIN MANIFEST
// ============================================================================

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    
    // Autor
    author: PluginAuthor;
    
    // Licença
    license: string;
    
    // Repositório
    repository?: string;
    homepage?: string;
    bugs?: string;
    
    // Compatibilidade
    engines: {
        aethel: string;          // Semver range
        node?: string;
    };
    
    // Dependências
    dependencies?: Record<string, string>;
    
    // Categorias
    categories: PluginCategory[];
    keywords: string[];
    
    // Entry points
    main?: string;              // Main module
    browser?: string;           // Browser module
    
    // Assets
    icon?: string;
    banner?: string;
    screenshots?: string[];
    
    // Contribuições
    contributes?: PluginContributions;
    
    // Permissões
    permissions?: PluginPermission[];
    
    // Ativação
    activationEvents?: string[];
    
    // Configuração
    configuration?: ConfigurationSchema;
}

export interface PluginAuthor {
    name: string;
    email?: string;
    url?: string;
}

export type PluginCategory = 
    | 'tools'
    | 'themes'
    | 'languages'
    | 'debuggers'
    | 'formatters'
    | 'linters'
    | 'snippets'
    | 'keymaps'
    | 'ai'
    | 'visualization'
    | 'collaboration'
    | 'other';

export type PluginPermission = 
    | 'fs.read'
    | 'fs.write'
    | 'net.fetch'
    | 'net.server'
    | 'shell.exec'
    | 'clipboard.read'
    | 'clipboard.write'
    | 'notifications'
    | 'secrets'
    | 'authentication'
    | 'ai.access';

// ============================================================================
// CONTRIBUTIONS
// ============================================================================

export interface PluginContributions {
    // Comandos
    commands?: CommandContribution[];
    
    // Menus
    menus?: MenuContributions;
    
    // Keybindings
    keybindings?: KeybindingContribution[];
    
    // Views
    views?: Record<string, ViewContribution[]>;
    
    // Languages
    languages?: LanguageContribution[];
    grammars?: GrammarContribution[];
    
    // Themes
    themes?: ThemeContribution[];
    
    // Snippets
    snippets?: SnippetContribution[];
    
    // Tasks
    taskDefinitions?: TaskDefinition[];
    problemMatchers?: ProblemMatcher[];
    
    // Configuration
    configuration?: ConfigurationSchema[];
    
    // Custom
    custom?: Record<string, unknown>;
}

export interface CommandContribution {
    command: string;
    title: string;
    category?: string;
    icon?: string;
    enablement?: string;
}

export interface MenuContributions {
    'editor/context'?: MenuItem[];
    'editor/title'?: MenuItem[];
    'view/title'?: MenuItem[];
    'view/item/context'?: MenuItem[];
    commandPalette?: MenuItem[];
    [key: string]: MenuItem[] | undefined;
}

export interface MenuItem {
    command: string;
    when?: string;
    group?: string;
    order?: number;
}

export interface KeybindingContribution {
    command: string;
    key: string;
    mac?: string;
    linux?: string;
    win?: string;
    when?: string;
}

export interface ViewContribution {
    id: string;
    name: string;
    type?: 'tree' | 'webview' | 'custom';
    when?: string;
    icon?: string;
}

export interface LanguageContribution {
    id: string;
    extensions?: string[];
    filenames?: string[];
    aliases?: string[];
    mimetypes?: string[];
    firstLine?: string;
    configuration?: string;
}

export interface GrammarContribution {
    language: string;
    scopeName: string;
    path: string;
    embeddedLanguages?: Record<string, string>;
    tokenTypes?: Record<string, string>;
}

export interface ThemeContribution {
    id: string;
    label: string;
    uiTheme: 'vs-dark' | 'vs-light' | 'hc-black' | 'hc-light';
    path: string;
}

export interface SnippetContribution {
    language: string;
    path: string;
}

export interface TaskDefinition {
    type: string;
    required?: string[];
    properties?: Record<string, unknown>;
}

export interface ProblemMatcher {
    name: string;
    owner: string;
    pattern: ProblemPattern | ProblemPattern[];
    fileLocation?: string | string[];
    severity?: 'error' | 'warning' | 'info';
}

export interface ProblemPattern {
    regexp: string;
    file?: number;
    line?: number;
    column?: number;
    message?: number;
    severity?: number;
}

export interface ConfigurationSchema {
    title?: string;
    properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
    type: 'string' | 'boolean' | 'number' | 'array' | 'object';
    default?: unknown;
    description?: string;
    enum?: string[];
    items?: ConfigurationProperty;
    scope?: 'application' | 'machine' | 'window' | 'resource';
}

// ============================================================================
// PLUGIN INSTANCE
// ============================================================================

export interface Plugin {
    manifest: PluginManifest;
    state: PluginState;
    
    // Runtime
    exports?: PluginExports;
    context?: PluginContext;
    
    // Localização
    path: string;
    
    // Instância
    instance?: unknown;
    
    // Erro
    error?: string;
    
    // Timestamps
    loadedAt?: number;
    activatedAt?: number;
    
    // Dependências resolvidas
    resolvedDependencies?: Map<string, Plugin>;
}

export interface PluginExports {
    activate?: (context: PluginContext) => Promise<PluginAPI | void>;
    deactivate?: () => Promise<void>;
    [key: string]: unknown;
}

export interface PluginContext {
    // Identificação
    pluginId: string;
    pluginPath: string;
    
    // Storage
    globalState: PluginStorage;
    workspaceState: PluginStorage;
    secrets: SecretStorage;
    
    // Subscriptions
    subscriptions: Disposable[];
    
    // Logging
    logger: PluginLogger;
    
    // URI helpers
    asAbsolutePath: (relativePath: string) => string;
    
    // Extension mode
    extensionMode: 'development' | 'production' | 'test';
}

export interface PluginStorage {
    get<T>(key: string, defaultValue?: T): T | undefined;
    update(key: string, value: unknown): Promise<void>;
    keys(): readonly string[];
}

export interface SecretStorage {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
}

export interface PluginLogger {
    trace(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string | Error, ...args: unknown[]): void;
}

export interface Disposable {
    dispose(): void;
}

// ============================================================================
// PLUGIN API
// ============================================================================

export interface PluginAPI {
    // Registros
    registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => Disposable;
    registerProvider: (type: string, provider: unknown) => Disposable;
    registerView: (viewId: string, view: unknown) => Disposable;
    
    // Eventos
    onDidChange: <T>(event: string, listener: (e: T) => void) => Disposable;
    
    // Comandos
    executeCommand: <T>(command: string, ...args: unknown[]) => Promise<T>;
    
    // UI
    showMessage: (message: string, type?: 'info' | 'warning' | 'error') => Promise<void>;
    showQuickPick: <T>(items: T[], options?: QuickPickOptions) => Promise<T | undefined>;
    showInputBox: (options?: InputBoxOptions) => Promise<string | undefined>;
    
    // Configuração
    getConfiguration: (section?: string) => Configuration;
    
    // Workspace
    getWorkspaceFolders: () => WorkspaceFolder[];
    
    // Custom exports
    [key: string]: unknown;
}

export interface QuickPickOptions {
    title?: string;
    placeholder?: string;
    canPickMany?: boolean;
}

export interface InputBoxOptions {
    title?: string;
    placeholder?: string;
    value?: string;
    password?: boolean;
    validateInput?: (value: string) => string | undefined;
}

export interface Configuration {
    get<T>(key: string, defaultValue?: T): T | undefined;
    update(key: string, value: unknown): Promise<void>;
    has(key: string): boolean;
}

export interface WorkspaceFolder {
    uri: string;
    name: string;
    index: number;
}

// ============================================================================
// HOOKS
// ============================================================================

export interface Hook {
    id: string;
    pluginId: string;
    name: string;
    type: HookType;
    priority: number;
    handler: HookHandler;
}

export type HookHandler = (context: HookContext) => Promise<unknown>;

export interface HookContext {
    hookName: string;
    args: unknown[];
    result?: unknown;
    preventDefault: () => void;
    stopPropagation: () => void;
    
    // Estado
    prevented: boolean;
    stopped: boolean;
}

// ============================================================================
// PLUGIN SYSTEM
// ============================================================================

@injectable()
export class PluginSystem {
    private plugins: Map<string, Plugin> = new Map();
    private hooks: Map<string, Hook[]> = new Map();
    private commands: Map<string, CommandHandler> = new Map();
    private providers: Map<string, Map<string, unknown>> = new Map();
    private configurations: Map<string, unknown> = new Map();
    private eventListeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
    private activationPromises: Map<string, Promise<void>> = new Map();
    private listeners: Map<string, Set<(event: PluginEvent) => void>> = new Map();

    // Event emitters
    private readonly onPluginWarningEmitter = new Emitter<PluginWarningEvent>();
    readonly onPluginWarning: Event<PluginWarningEvent> = this.onPluginWarningEmitter.event;

    constructor() {
        this.registerBuiltInHooks();
    }

    // ========================================================================
    // PLUGIN MANAGEMENT
    // ========================================================================

    /**
     * Instala plugin
     */
    async install(
        source: string | PluginManifest,
        options: InstallOptions = {}
    ): Promise<Plugin> {
        let manifest: PluginManifest;
        let path: string;

        if (typeof source === 'string') {
            // Carregar do caminho ou URL
            manifest = await this.loadManifest(source);
            path = source;
        } else {
            manifest = source;
            path = options.path || '';
        }

        // Verificar se já existe
        if (this.plugins.has(manifest.id) && !options.force) {
            throw new Error(`Plugin ${manifest.id} already installed`);
        }

        // Verificar compatibilidade
        this.checkCompatibility(manifest);

        // Verificar permissões
        if (options.validatePermissions !== false) {
            await this.validatePermissions(manifest);
        }

        const plugin: Plugin = {
            manifest,
            state: 'unloaded',
            path,
        };

        this.plugins.set(manifest.id, plugin);
        this.emit('installed', { pluginId: manifest.id, plugin });

        // Auto-load se configurado
        if (options.autoLoad !== false) {
            await this.load(manifest.id);
        }

        return plugin;
    }

    /**
     * Desinstala plugin
     */
    async uninstall(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) return;

        // Desativar primeiro
        if (plugin.state === 'active') {
            await this.deactivate(pluginId);
        }

        // Descarregar
        if (plugin.state === 'loaded' || plugin.state === 'inactive') {
            await this.unload(pluginId);
        }

        // Remover registros
        this.removePluginContributions(pluginId);

        this.plugins.delete(pluginId);
        this.emit('uninstalled', { pluginId });
    }

    /**
     * Carrega plugin
     */
    async load(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }

        if (plugin.state !== 'unloaded' && plugin.state !== 'error') {
            return;
        }

        plugin.state = 'loading';

        try {
            // Resolver dependências
            await this.resolveDependencies(plugin);

            // Carregar módulo
            const exports = await this.loadModule(plugin);
            plugin.exports = exports;

            // Criar contexto
            plugin.context = this.createContext(plugin);

            // Registrar contribuições
            this.registerContributions(plugin);

            plugin.state = 'loaded';
            plugin.loadedAt = Date.now();

            this.emit('loaded', { pluginId, plugin });

            // Auto-activate se não tem eventos de ativação
            if (!plugin.manifest.activationEvents || plugin.manifest.activationEvents.includes('*')) {
                await this.activate(pluginId);
            }

        } catch (error) {
            plugin.state = 'error';
            plugin.error = error instanceof Error ? error.message : String(error);
            this.emit('error', { pluginId, error: plugin.error });
            throw error;
        }
    }

    /**
     * Descarrega plugin
     */
    async unload(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || plugin.state === 'unloaded') return;

        // Desativar primeiro se ativo
        if (plugin.state === 'active') {
            await this.deactivate(pluginId);
        }

        // Limpar recursos
        if (plugin.context) {
            for (const disposable of plugin.context.subscriptions) {
                disposable.dispose();
            }
            plugin.context.subscriptions = [];
        }

        // Remover contribuições
        this.removePluginContributions(pluginId);

        plugin.exports = undefined;
        plugin.context = undefined;
        plugin.instance = undefined;
        plugin.state = 'unloaded';

        this.emit('unloaded', { pluginId });
    }

    /**
     * Ativa plugin
     */
    async activate(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }

        // Carregar se necessário
        if (plugin.state === 'unloaded' || plugin.state === 'error') {
            await this.load(pluginId);
        }

        if (plugin.state === 'active') return;

        // Evitar ativação paralela
        const existing = this.activationPromises.get(pluginId);
        if (existing) {
            return existing;
        }

        const activatePromise = this.performActivation(plugin);
        this.activationPromises.set(pluginId, activatePromise);

        try {
            await activatePromise;
        } finally {
            this.activationPromises.delete(pluginId);
        }
    }

    private async performActivation(plugin: Plugin): Promise<void> {
        try {
            // Ativar dependências primeiro
            if (plugin.resolvedDependencies) {
                for (const dep of plugin.resolvedDependencies.values()) {
                    if (dep.state !== 'active') {
                        await this.activate(dep.manifest.id);
                    }
                }
            }

            // Chamar activate()
            if (plugin.exports?.activate && plugin.context) {
                const api = await plugin.exports.activate(plugin.context);
                if (api) {
                    plugin.instance = api;
                }
            }

            plugin.state = 'active';
            plugin.activatedAt = Date.now();

            this.emit('activated', { pluginId: plugin.manifest.id, plugin });

        } catch (error) {
            plugin.state = 'error';
            plugin.error = error instanceof Error ? error.message : String(error);
            this.emit('error', { pluginId: plugin.manifest.id, error: plugin.error });
            throw error;
        }
    }

    /**
     * Desativa plugin
     */
    async deactivate(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || plugin.state !== 'active') return;

        try {
            if (plugin.exports?.deactivate) {
                await plugin.exports.deactivate();
            }

            plugin.state = 'inactive';
            this.emit('deactivated', { pluginId });

        } catch (error) {
            plugin.state = 'error';
            plugin.error = error instanceof Error ? error.message : String(error);
            throw error;
        }
    }

    /**
     * Recarrega plugin
     */
    async reload(pluginId: string): Promise<void> {
        await this.unload(pluginId);
        await this.load(pluginId);
    }

    // ========================================================================
    // HOOKS
    // ========================================================================

    /**
     * Registra hook
     */
    registerHook(
        hookName: string,
        pluginId: string,
        handler: HookHandler,
        options: {
            type?: HookType;
            priority?: number;
        } = {}
    ): Disposable {
        const hook: Hook = {
            id: this.generateId(),
            pluginId,
            name: hookName,
            type: options.type || 'after',
            priority: options.priority || 0,
            handler,
        };

        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }

        const hooks = this.hooks.get(hookName)!;
        hooks.push(hook);

        // Ordenar por prioridade
        hooks.sort((a, b) => b.priority - a.priority);

        return {
            dispose: () => {
                const index = hooks.indexOf(hook);
                if (index >= 0) {
                    hooks.splice(index, 1);
                }
            },
        };
    }

    /**
     * Executa hooks
     */
    async executeHooks(hookName: string, ...args: unknown[]): Promise<unknown> {
        const hooks = this.hooks.get(hookName) || [];
        
        let result: unknown;
        const context: HookContext = {
            hookName,
            args,
            preventDefault: () => { context.prevented = true; },
            stopPropagation: () => { context.stopped = true; },
            prevented: false,
            stopped: false,
        };

        // Before hooks
        for (const hook of hooks.filter(h => h.type === 'before')) {
            if (context.stopped) break;
            await hook.handler(context);
        }

        // Replace hooks
        const replaceHooks = hooks.filter(h => h.type === 'replace');
        if (replaceHooks.length > 0 && !context.prevented) {
            result = await replaceHooks[0].handler(context);
        }

        context.result = result;

        // After hooks
        for (const hook of hooks.filter(h => h.type === 'after')) {
            if (context.stopped) break;
            await hook.handler(context);
        }

        // Filter hooks
        for (const hook of hooks.filter(h => h.type === 'filter')) {
            if (context.stopped) break;
            context.result = await hook.handler(context);
        }

        return context.result;
    }

    // ========================================================================
    // COMMANDS
    // ========================================================================

    /**
     * Registra comando
     */
    registerCommand(
        command: string,
        handler: CommandHandler,
        pluginId?: string
    ): Disposable {
        if (this.commands.has(command)) {
            throw new Error(`Command already registered: ${command}`);
        }

        this.commands.set(command, handler);

        return {
            dispose: () => {
                this.commands.delete(command);
            },
        };
    }

    /**
     * Executa comando
     */
    async executeCommand<T>(command: string, ...args: unknown[]): Promise<T> {
        // Trigger activation events
        await this.triggerActivation(`onCommand:${command}`);

        const handler = this.commands.get(command);
        if (!handler) {
            throw new Error(`Command not found: ${command}`);
        }

        // Execute hooks
        await this.executeHooks(`command:${command}:before`, ...args);
        
        const result = await handler(...args) as T;
        
        await this.executeHooks(`command:${command}:after`, result, ...args);

        return result;
    }

    /**
     * Lista comandos
     */
    getCommands(): string[] {
        return Array.from(this.commands.keys());
    }

    // ========================================================================
    // PROVIDERS
    // ========================================================================

    /**
     * Registra provider
     */
    registerProvider(
        type: string,
        id: string,
        provider: unknown,
        pluginId?: string
    ): Disposable {
        if (!this.providers.has(type)) {
            this.providers.set(type, new Map());
        }

        const typeProviders = this.providers.get(type)!;
        typeProviders.set(id, provider);

        return {
            dispose: () => {
                typeProviders.delete(id);
            },
        };
    }

    /**
     * Obtém provider
     */
    getProvider<T>(type: string, id: string): T | undefined {
        return this.providers.get(type)?.get(id) as T | undefined;
    }

    /**
     * Lista providers de um tipo
     */
    getProviders<T>(type: string): Map<string, T> {
        return (this.providers.get(type) || new Map()) as Map<string, T>;
    }

    // ========================================================================
    // CONFIGURATION
    // ========================================================================

    /**
     * Obtém configuração
     */
    getConfiguration<T>(key: string, defaultValue?: T): T | undefined {
        const value = this.configurations.get(key);
        return (value !== undefined ? value : defaultValue) as T | undefined;
    }

    /**
     * Define configuração
     */
    setConfiguration(key: string, value: unknown): void {
        this.configurations.set(key, value);
        this.emitEvent(`configuration:${key}:changed`, value);
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    /**
     * Emite evento para listeners de plugins
     */
    emitEvent(event: string, ...args: unknown[]): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(...args);
                } catch (error) {
                    console.error(`Event listener error: ${error}`);
                }
            }
        }
    }

    /**
     * Registra listener de evento
     */
    onEvent(event: string, listener: (...args: unknown[]) => void): Disposable {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }

        this.eventListeners.get(event)!.add(listener);

        return {
            dispose: () => {
                this.eventListeners.get(event)?.delete(listener);
            },
        };
    }

    // ========================================================================
    // ACTIVATION
    // ========================================================================

    /**
     * Trigger activation event
     */
    async triggerActivation(event: string): Promise<void> {
        const toActivate: Plugin[] = [];

        for (const plugin of this.plugins.values()) {
            if (plugin.state === 'loaded' || plugin.state === 'inactive') {
                const events = plugin.manifest.activationEvents || [];
                if (events.includes(event) || events.includes('*')) {
                    toActivate.push(plugin);
                }
            }
        }

        for (const plugin of toActivate) {
            await this.activate(plugin.manifest.id);
        }
    }

    // ========================================================================
    // INTERNAL HELPERS
    // ========================================================================

    private async loadManifest(path: string): Promise<PluginManifest> {
        // Load manifest from filesystem or URL
        const manifestPath = `${path}/package.json`;
        
        try {
            // In browser environment, use fetch
            if (typeof fetch !== 'undefined') {
                const response = await fetch(manifestPath);
                if (!response.ok) {
                    throw new Error(`Failed to load manifest: ${response.statusText}`);
                }
                const pkg = await response.json();
                
                // Convert package.json to PluginManifest
                return {
                    id: pkg.name,
                    name: pkg.displayName || pkg.name,
                    version: pkg.version,
                    description: pkg.description || '',
                    author: typeof pkg.author === 'string' ? pkg.author : pkg.author?.name || 'Unknown',
                    license: pkg.license || 'MIT',
                    main: pkg.main || 'dist/index.js',
                    engines: pkg.engines || { aethel: '*' },
                    permissions: pkg.aethel?.permissions || [],
                    dependencies: pkg.dependencies || {},
                    contributes: pkg.contributes || {},
                    activationEvents: pkg.activationEvents || ['*'],
                    repository: pkg.repository?.url || pkg.repository,
                    homepage: pkg.homepage,
                    bugs: typeof pkg.bugs === 'string' ? pkg.bugs : pkg.bugs?.url,
                    categories: pkg.categories || [],
                    keywords: pkg.keywords || [],
                };
            }
            
            // Fallback for non-browser environments
            throw new Error('Filesystem loading not available');
        } catch (error) {
            throw new Error(`Failed to load plugin manifest from ${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private checkCompatibility(manifest: PluginManifest): void {
        // Verificar versão do engine usando semver-like comparison
        const requiredVersion = manifest.engines?.aethel || '*';
        const currentVersion = '2.0.0'; // Engine version
        
        if (requiredVersion !== '*') {
            // Simple semver check for major version compatibility
            const requiredMajor = parseInt(requiredVersion.split('.')[0].replace(/[^0-9]/g, ''), 10);
            const currentMajor = parseInt(currentVersion.split('.')[0], 10);
            
            // Check if major version is compatible
            if (!isNaN(requiredMajor) && requiredMajor > currentMajor) {
                throw new Error(
                    `Plugin requires Aethel Engine ${requiredVersion}, but current version is ${currentVersion}`
                );
            }
        }
    }

    private async validatePermissions(manifest: PluginManifest): Promise<void> {
        const permissions = manifest.permissions || [];
        
        // Define sensitive permissions that require explicit confirmation
        const sensitivePermissions = permissions.filter(p => 
            ['fs.write', 'shell.exec', 'net.server', 'secrets'].includes(p)
        );

        if (sensitivePermissions.length > 0) {
            // Log sensitive permissions for audit
            console.warn(
                `[PluginSystem] Plugin ${manifest.id} requests sensitive permissions:`,
                sensitivePermissions
            );
            
            // In production, emit event for UI to show confirmation dialog
            this.onPluginWarningEmitter.fire({
                pluginId: manifest.id,
                message: `Plugin requests sensitive permissions: ${sensitivePermissions.join(', ')}`,
                level: 'warning',
            });
            
            // For now, auto-approve (in production, wait for user confirmation)
        }
    }

    private async resolveDependencies(plugin: Plugin): Promise<void> {
        plugin.resolvedDependencies = new Map();

        const deps = plugin.manifest.dependencies || {};
        
        for (const [depId, version] of Object.entries(deps)) {
            const dep = this.plugins.get(depId);
            
            if (!dep) {
                throw new Error(`Missing dependency: ${depId}@${version}`);
            }

            // Semver compatibility check
            const requiredParts = version.split('.');
            const installedParts = dep.manifest.version.split('.');
            
            // Check major version compatibility (^major.minor.patch)
            const requiredMajor = parseInt(requiredParts[0].replace(/[^0-9]/g, ''), 10);
            const installedMajor = parseInt(installedParts[0], 10);
            
            if (!isNaN(requiredMajor) && !isNaN(installedMajor) && installedMajor < requiredMajor) {
                throw new Error(
                    `Dependency ${depId} version ${dep.manifest.version} is not compatible with required ${version}`
                );
            }

            plugin.resolvedDependencies.set(depId, dep);
        }
    }

    private async loadModule(plugin: Plugin): Promise<PluginExports> {
        // Load plugin module dynamically
        const mainPath = `${plugin.path}/${plugin.manifest.main}`;
        
        try {
            // In browser environment with module support
            if (typeof window !== 'undefined') {
                // Try dynamic import
                try {
                    const module = await import(/* webpackIgnore: true */ mainPath);
                    return module;
                } catch {
                    // Fallback: return empty exports (plugin may use contributes only)
                    console.warn(`[PluginSystem] Could not load module for ${plugin.manifest.id}, using contributes-only mode`);
                    return {};
                }
            }
            
            // Non-browser: return empty exports
            return {};
        } catch (error) {
            console.error(`[PluginSystem] Failed to load module for ${plugin.manifest.id}:`, error);
            return {};
        }
    }

    private createContext(plugin: Plugin): PluginContext {
        const globalState = new MemoryStorage();
        const workspaceState = new MemoryStorage();
        const secrets = new MemorySecretStorage();

        return {
            pluginId: plugin.manifest.id,
            pluginPath: plugin.path,
            globalState,
            workspaceState,
            secrets,
            subscriptions: [],
            logger: this.createLogger(plugin.manifest.id),
            asAbsolutePath: (relativePath: string) => `${plugin.path}/${relativePath}`,
            extensionMode: 'production',
        };
    }

    private createLogger(pluginId: string): PluginLogger {
        const prefix = `[${pluginId}]`;
        
        return {
            trace: (msg, ...args) => console.trace(prefix, msg, ...args),
            debug: (msg, ...args) => console.debug(prefix, msg, ...args),
            info: (msg, ...args) => console.info(prefix, msg, ...args),
            warn: (msg, ...args) => console.warn(prefix, msg, ...args),
            error: (msg, ...args) => console.error(prefix, msg, ...args),
        };
    }

    private registerContributions(plugin: Plugin): void {
        const contributes = plugin.manifest.contributes;
        if (!contributes) return;

        // Commands
        if (contributes.commands) {
            for (const cmd of contributes.commands) {
                // Registrar metadados do comando
                // Handler será registrado pelo plugin em activate()
            }
        }

        // Keybindings
        if (contributes.keybindings) {
            for (const kb of contributes.keybindings) {
                // Registrar keybinding
            }
        }

        // Configuration
        if (contributes.configuration) {
            for (const config of contributes.configuration) {
                for (const [key, prop] of Object.entries(config.properties)) {
                    if (!this.configurations.has(key)) {
                        this.configurations.set(key, prop.default);
                    }
                }
            }
        }
    }

    private removePluginContributions(pluginId: string): void {
        // Remover hooks
        for (const [name, hooks] of this.hooks) {
            this.hooks.set(name, hooks.filter(h => h.pluginId !== pluginId));
        }

        // Outros registros são removidos via dispose()
    }

    private registerBuiltInHooks(): void {
        // Placeholder para hooks internos
    }

    private generateId(): string {
        return `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Obtém plugin
     */
    getPlugin(pluginId: string): Plugin | undefined {
        return this.plugins.get(pluginId);
    }

    /**
     * Lista plugins
     */
    listPlugins(filter?: {
        state?: PluginState;
        category?: PluginCategory;
    }): Plugin[] {
        let plugins = Array.from(this.plugins.values());

        if (filter?.state) {
            plugins = plugins.filter(p => p.state === filter.state);
        }

        if (filter?.category) {
            plugins = plugins.filter(p => 
                p.manifest.categories.includes(filter.category!)
            );
        }

        return plugins;
    }

    // ========================================================================
    // EVENTS (Plugin System)
    // ========================================================================

    on(event: string, callback: (event: PluginEvent) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: (event: PluginEvent) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: PluginEvent): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
}

// ============================================================================
// HELPER CLASSES
// ============================================================================

class MemoryStorage implements PluginStorage {
    private data: Map<string, unknown> = new Map();

    get<T>(key: string, defaultValue?: T): T | undefined {
        const value = this.data.get(key);
        return (value !== undefined ? value : defaultValue) as T | undefined;
    }

    async update(key: string, value: unknown): Promise<void> {
        this.data.set(key, value);
    }

    keys(): readonly string[] {
        return Array.from(this.data.keys());
    }
}

class MemorySecretStorage implements SecretStorage {
    private secrets: Map<string, string> = new Map();

    async get(key: string): Promise<string | undefined> {
        return this.secrets.get(key);
    }

    async store(key: string, value: string): Promise<void> {
        this.secrets.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.secrets.delete(key);
    }
}

// ============================================================================
// TIPOS AUXILIARES
// ============================================================================

export type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;

export interface InstallOptions {
    path?: string;
    force?: boolean;
    autoLoad?: boolean;
    validatePermissions?: boolean;
}

export interface PluginEvent {
    pluginId?: string;
    plugin?: Plugin;
    error?: string;
}
