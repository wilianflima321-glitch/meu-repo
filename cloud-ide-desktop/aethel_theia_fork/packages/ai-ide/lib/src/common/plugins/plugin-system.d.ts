import { Event } from '@theia/core/lib/common';
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
export interface PluginWarningEvent {
    pluginId: string;
    message: string;
    level: 'info' | 'warning' | 'error';
}
export type PluginState = 'unloaded' | 'loading' | 'loaded' | 'active' | 'inactive' | 'error' | 'disabled';
export type PluginScope = 'global' | 'project' | 'workspace' | 'user';
export type HookType = 'before' | 'after' | 'replace' | 'filter';
export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: PluginAuthor;
    license: string;
    repository?: string;
    homepage?: string;
    bugs?: string;
    engines: {
        aethel: string;
        node?: string;
    };
    dependencies?: Record<string, string>;
    categories: PluginCategory[];
    keywords: string[];
    main?: string;
    browser?: string;
    icon?: string;
    banner?: string;
    screenshots?: string[];
    contributes?: PluginContributions;
    permissions?: PluginPermission[];
    activationEvents?: string[];
    configuration?: ConfigurationSchema;
}
export interface PluginAuthor {
    name: string;
    email?: string;
    url?: string;
}
export type PluginCategory = 'tools' | 'themes' | 'languages' | 'debuggers' | 'formatters' | 'linters' | 'snippets' | 'keymaps' | 'ai' | 'visualization' | 'collaboration' | 'other';
export type PluginPermission = 'fs.read' | 'fs.write' | 'net.fetch' | 'net.server' | 'shell.exec' | 'clipboard.read' | 'clipboard.write' | 'notifications' | 'secrets' | 'authentication' | 'ai.access';
export interface PluginContributions {
    commands?: CommandContribution[];
    menus?: MenuContributions;
    keybindings?: KeybindingContribution[];
    views?: Record<string, ViewContribution[]>;
    languages?: LanguageContribution[];
    grammars?: GrammarContribution[];
    themes?: ThemeContribution[];
    snippets?: SnippetContribution[];
    taskDefinitions?: TaskDefinition[];
    problemMatchers?: ProblemMatcher[];
    configuration?: ConfigurationSchema[];
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
export interface Plugin {
    manifest: PluginManifest;
    state: PluginState;
    exports?: PluginExports;
    context?: PluginContext;
    path: string;
    instance?: unknown;
    error?: string;
    loadedAt?: number;
    activatedAt?: number;
    resolvedDependencies?: Map<string, Plugin>;
}
export interface PluginExports {
    activate?: (context: PluginContext) => Promise<PluginAPI | void>;
    deactivate?: () => Promise<void>;
    [key: string]: unknown;
}
export interface PluginContext {
    pluginId: string;
    pluginPath: string;
    globalState: PluginStorage;
    workspaceState: PluginStorage;
    secrets: SecretStorage;
    subscriptions: Disposable[];
    logger: PluginLogger;
    asAbsolutePath: (relativePath: string) => string;
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
export interface PluginAPI {
    registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => Disposable;
    registerProvider: (type: string, provider: unknown) => Disposable;
    registerView: (viewId: string, view: unknown) => Disposable;
    onDidChange: <T>(event: string, listener: (e: T) => void) => Disposable;
    executeCommand: <T>(command: string, ...args: unknown[]) => Promise<T>;
    showMessage: (message: string, type?: 'info' | 'warning' | 'error') => Promise<void>;
    showQuickPick: <T>(items: T[], options?: QuickPickOptions) => Promise<T | undefined>;
    showInputBox: (options?: InputBoxOptions) => Promise<string | undefined>;
    getConfiguration: (section?: string) => Configuration;
    getWorkspaceFolders: () => WorkspaceFolder[];
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
    prevented: boolean;
    stopped: boolean;
}
export declare class PluginSystem {
    private plugins;
    private hooks;
    private commands;
    private providers;
    private configurations;
    private eventListeners;
    private activationPromises;
    private listeners;
    private readonly onPluginWarningEmitter;
    readonly onPluginWarning: Event<PluginWarningEvent>;
    constructor();
    /**
     * Instala plugin
     */
    install(source: string | PluginManifest, options?: InstallOptions): Promise<Plugin>;
    /**
     * Desinstala plugin
     */
    uninstall(pluginId: string): Promise<void>;
    /**
     * Carrega plugin
     */
    load(pluginId: string): Promise<void>;
    /**
     * Descarrega plugin
     */
    unload(pluginId: string): Promise<void>;
    /**
     * Ativa plugin
     */
    activate(pluginId: string): Promise<void>;
    private performActivation;
    /**
     * Desativa plugin
     */
    deactivate(pluginId: string): Promise<void>;
    /**
     * Recarrega plugin
     */
    reload(pluginId: string): Promise<void>;
    /**
     * Registra hook
     */
    registerHook(hookName: string, pluginId: string, handler: HookHandler, options?: {
        type?: HookType;
        priority?: number;
    }): Disposable;
    /**
     * Executa hooks
     */
    executeHooks(hookName: string, ...args: unknown[]): Promise<unknown>;
    /**
     * Registra comando
     */
    registerCommand(command: string, handler: CommandHandler, pluginId?: string): Disposable;
    /**
     * Executa comando
     */
    executeCommand<T>(command: string, ...args: unknown[]): Promise<T>;
    /**
     * Lista comandos
     */
    getCommands(): string[];
    /**
     * Registra provider
     */
    registerProvider(type: string, id: string, provider: unknown, pluginId?: string): Disposable;
    /**
     * Obtém provider
     */
    getProvider<T>(type: string, id: string): T | undefined;
    /**
     * Lista providers de um tipo
     */
    getProviders<T>(type: string): Map<string, T>;
    /**
     * Obtém configuração
     */
    getConfiguration<T>(key: string, defaultValue?: T): T | undefined;
    /**
     * Define configuração
     */
    setConfiguration(key: string, value: unknown): void;
    /**
     * Emite evento para listeners de plugins
     */
    emitEvent(event: string, ...args: unknown[]): void;
    /**
     * Registra listener de evento
     */
    onEvent(event: string, listener: (...args: unknown[]) => void): Disposable;
    /**
     * Trigger activation event
     */
    triggerActivation(event: string): Promise<void>;
    private loadManifest;
    private checkCompatibility;
    private validatePermissions;
    private resolveDependencies;
    private loadModule;
    private createContext;
    private createLogger;
    private registerContributions;
    private removePluginContributions;
    private registerBuiltInHooks;
    private generateId;
    /**
     * Obtém plugin
     */
    getPlugin(pluginId: string): Plugin | undefined;
    /**
     * Lista plugins
     */
    listPlugins(filter?: {
        state?: PluginState;
        category?: PluginCategory;
    }): Plugin[];
    on(event: string, callback: (event: PluginEvent) => void): void;
    off(event: string, callback: (event: PluginEvent) => void): void;
    private emit;
}
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
