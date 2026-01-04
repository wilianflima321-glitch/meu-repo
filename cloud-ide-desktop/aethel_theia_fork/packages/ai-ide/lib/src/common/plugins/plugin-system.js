"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginSystem = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
// ============================================================================
// PLUGIN SYSTEM
// ============================================================================
let PluginSystem = class PluginSystem {
    constructor() {
        this.plugins = new Map();
        this.hooks = new Map();
        this.commands = new Map();
        this.providers = new Map();
        this.configurations = new Map();
        this.eventListeners = new Map();
        this.activationPromises = new Map();
        this.listeners = new Map();
        // Event emitters
        this.onPluginWarningEmitter = new common_1.Emitter();
        this.onPluginWarning = this.onPluginWarningEmitter.event;
        this.registerBuiltInHooks();
    }
    // ========================================================================
    // PLUGIN MANAGEMENT
    // ========================================================================
    /**
     * Instala plugin
     */
    async install(source, options = {}) {
        let manifest;
        let path;
        if (typeof source === 'string') {
            // Carregar do caminho ou URL
            manifest = await this.loadManifest(source);
            path = source;
        }
        else {
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
        const plugin = {
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
    async uninstall(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin)
            return;
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
    async load(pluginId) {
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
        }
        catch (error) {
            plugin.state = 'error';
            plugin.error = error instanceof Error ? error.message : String(error);
            this.emit('error', { pluginId, error: plugin.error });
            throw error;
        }
    }
    /**
     * Descarrega plugin
     */
    async unload(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || plugin.state === 'unloaded')
            return;
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
    async activate(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginId}`);
        }
        // Carregar se necessário
        if (plugin.state === 'unloaded' || plugin.state === 'error') {
            await this.load(pluginId);
        }
        if (plugin.state === 'active')
            return;
        // Evitar ativação paralela
        const existing = this.activationPromises.get(pluginId);
        if (existing) {
            return existing;
        }
        const activatePromise = this.performActivation(plugin);
        this.activationPromises.set(pluginId, activatePromise);
        try {
            await activatePromise;
        }
        finally {
            this.activationPromises.delete(pluginId);
        }
    }
    async performActivation(plugin) {
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
        }
        catch (error) {
            plugin.state = 'error';
            plugin.error = error instanceof Error ? error.message : String(error);
            this.emit('error', { pluginId: plugin.manifest.id, error: plugin.error });
            throw error;
        }
    }
    /**
     * Desativa plugin
     */
    async deactivate(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || plugin.state !== 'active')
            return;
        try {
            if (plugin.exports?.deactivate) {
                await plugin.exports.deactivate();
            }
            plugin.state = 'inactive';
            this.emit('deactivated', { pluginId });
        }
        catch (error) {
            plugin.state = 'error';
            plugin.error = error instanceof Error ? error.message : String(error);
            throw error;
        }
    }
    /**
     * Recarrega plugin
     */
    async reload(pluginId) {
        await this.unload(pluginId);
        await this.load(pluginId);
    }
    // ========================================================================
    // HOOKS
    // ========================================================================
    /**
     * Registra hook
     */
    registerHook(hookName, pluginId, handler, options = {}) {
        const hook = {
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
        const hooks = this.hooks.get(hookName);
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
    async executeHooks(hookName, ...args) {
        const hooks = this.hooks.get(hookName) || [];
        let result;
        const context = {
            hookName,
            args,
            preventDefault: () => { context.prevented = true; },
            stopPropagation: () => { context.stopped = true; },
            prevented: false,
            stopped: false,
        };
        // Before hooks
        for (const hook of hooks.filter(h => h.type === 'before')) {
            if (context.stopped)
                break;
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
            if (context.stopped)
                break;
            await hook.handler(context);
        }
        // Filter hooks
        for (const hook of hooks.filter(h => h.type === 'filter')) {
            if (context.stopped)
                break;
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
    registerCommand(command, handler, pluginId) {
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
    async executeCommand(command, ...args) {
        // Trigger activation events
        await this.triggerActivation(`onCommand:${command}`);
        const handler = this.commands.get(command);
        if (!handler) {
            throw new Error(`Command not found: ${command}`);
        }
        // Execute hooks
        await this.executeHooks(`command:${command}:before`, ...args);
        const result = await handler(...args);
        await this.executeHooks(`command:${command}:after`, result, ...args);
        return result;
    }
    /**
     * Lista comandos
     */
    getCommands() {
        return Array.from(this.commands.keys());
    }
    // ========================================================================
    // PROVIDERS
    // ========================================================================
    /**
     * Registra provider
     */
    registerProvider(type, id, provider, pluginId) {
        if (!this.providers.has(type)) {
            this.providers.set(type, new Map());
        }
        const typeProviders = this.providers.get(type);
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
    getProvider(type, id) {
        return this.providers.get(type)?.get(id);
    }
    /**
     * Lista providers de um tipo
     */
    getProviders(type) {
        return (this.providers.get(type) || new Map());
    }
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    /**
     * Obtém configuração
     */
    getConfiguration(key, defaultValue) {
        const value = this.configurations.get(key);
        return (value !== undefined ? value : defaultValue);
    }
    /**
     * Define configuração
     */
    setConfiguration(key, value) {
        this.configurations.set(key, value);
        this.emitEvent(`configuration:${key}:changed`, value);
    }
    // ========================================================================
    // EVENTS
    // ========================================================================
    /**
     * Emite evento para listeners de plugins
     */
    emitEvent(event, ...args) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(...args);
                }
                catch (error) {
                    console.error(`Event listener error: ${error}`);
                }
            }
        }
    }
    /**
     * Registra listener de evento
     */
    onEvent(event, listener) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(listener);
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
    async triggerActivation(event) {
        const toActivate = [];
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
    async loadManifest(path) {
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
        }
        catch (error) {
            throw new Error(`Failed to load plugin manifest from ${path}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    checkCompatibility(manifest) {
        // Verificar versão do engine usando semver-like comparison
        const requiredVersion = manifest.engines?.aethel || '*';
        const currentVersion = '2.0.0'; // Engine version
        if (requiredVersion !== '*') {
            // Simple semver check for major version compatibility
            const requiredMajor = parseInt(requiredVersion.split('.')[0].replace(/[^0-9]/g, ''), 10);
            const currentMajor = parseInt(currentVersion.split('.')[0], 10);
            // Check if major version is compatible
            if (!isNaN(requiredMajor) && requiredMajor > currentMajor) {
                throw new Error(`Plugin requires Aethel Engine ${requiredVersion}, but current version is ${currentVersion}`);
            }
        }
    }
    async validatePermissions(manifest) {
        const permissions = manifest.permissions || [];
        // Define sensitive permissions that require explicit confirmation
        const sensitivePermissions = permissions.filter(p => ['fs.write', 'shell.exec', 'net.server', 'secrets'].includes(p));
        if (sensitivePermissions.length > 0) {
            // Log sensitive permissions for audit
            console.warn(`[PluginSystem] Plugin ${manifest.id} requests sensitive permissions:`, sensitivePermissions);
            // In production, emit event for UI to show confirmation dialog
            this.onPluginWarningEmitter.fire({
                pluginId: manifest.id,
                message: `Plugin requests sensitive permissions: ${sensitivePermissions.join(', ')}`,
                level: 'warning',
            });
            // For now, auto-approve (in production, wait for user confirmation)
        }
    }
    async resolveDependencies(plugin) {
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
                throw new Error(`Dependency ${depId} version ${dep.manifest.version} is not compatible with required ${version}`);
            }
            plugin.resolvedDependencies.set(depId, dep);
        }
    }
    async loadModule(plugin) {
        // Load plugin module dynamically
        const mainPath = `${plugin.path}/${plugin.manifest.main}`;
        try {
            // In browser environment with module support
            if (typeof window !== 'undefined') {
                // Try dynamic import
                try {
                    const module = await Promise.resolve(`${mainPath}`).then(s => __importStar(require(s)));
                    return module;
                }
                catch {
                    // Fallback: return empty exports (plugin may use contributes only)
                    console.warn(`[PluginSystem] Could not load module for ${plugin.manifest.id}, using contributes-only mode`);
                    return {};
                }
            }
            // Non-browser: return empty exports
            return {};
        }
        catch (error) {
            console.error(`[PluginSystem] Failed to load module for ${plugin.manifest.id}:`, error);
            return {};
        }
    }
    createContext(plugin) {
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
            asAbsolutePath: (relativePath) => `${plugin.path}/${relativePath}`,
            extensionMode: 'production',
        };
    }
    createLogger(pluginId) {
        const prefix = `[${pluginId}]`;
        return {
            trace: (msg, ...args) => console.trace(prefix, msg, ...args),
            debug: (msg, ...args) => console.debug(prefix, msg, ...args),
            info: (msg, ...args) => console.info(prefix, msg, ...args),
            warn: (msg, ...args) => console.warn(prefix, msg, ...args),
            error: (msg, ...args) => console.error(prefix, msg, ...args),
        };
    }
    registerContributions(plugin) {
        const contributes = plugin.manifest.contributes;
        if (!contributes)
            return;
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
    removePluginContributions(pluginId) {
        // Remover hooks
        for (const [name, hooks] of this.hooks) {
            this.hooks.set(name, hooks.filter(h => h.pluginId !== pluginId));
        }
        // Outros registros são removidos via dispose()
    }
    registerBuiltInHooks() {
        // Placeholder para hooks internos
    }
    generateId() {
        return `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    // ========================================================================
    // QUERIES
    // ========================================================================
    /**
     * Obtém plugin
     */
    getPlugin(pluginId) {
        return this.plugins.get(pluginId);
    }
    /**
     * Lista plugins
     */
    listPlugins(filter) {
        let plugins = Array.from(this.plugins.values());
        if (filter?.state) {
            plugins = plugins.filter(p => p.state === filter.state);
        }
        if (filter?.category) {
            plugins = plugins.filter(p => p.manifest.categories.includes(filter.category));
        }
        return plugins;
    }
    // ========================================================================
    // EVENTS (Plugin System)
    // ========================================================================
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }
    off(event, callback) {
        this.listeners.get(event)?.delete(callback);
    }
    emit(event, data) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }
};
exports.PluginSystem = PluginSystem;
exports.PluginSystem = PluginSystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], PluginSystem);
// ============================================================================
// HELPER CLASSES
// ============================================================================
class MemoryStorage {
    constructor() {
        this.data = new Map();
    }
    get(key, defaultValue) {
        const value = this.data.get(key);
        return (value !== undefined ? value : defaultValue);
    }
    async update(key, value) {
        this.data.set(key, value);
    }
    keys() {
        return Array.from(this.data.keys());
    }
}
class MemorySecretStorage {
    constructor() {
        this.secrets = new Map();
    }
    async get(key) {
        return this.secrets.get(key);
    }
    async store(key, value) {
        this.secrets.set(key, value);
    }
    async delete(key) {
        this.secrets.delete(key);
    }
}
