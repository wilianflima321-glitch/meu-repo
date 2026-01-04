"use strict";
/**
 * @file ide-toolkit.ts
 * @description Kit de Ferramentas Unificado para Aethel IDE
 *
 * Implementação profissional do toolkit de IDE inspirada em:
 * - VS Code Extension API
 * - JetBrains Platform SDK
 * - Eclipse RCP
 * - Atom/Electron APIs
 *
 * Features:
 * - Workspace management
 * - Document handling
 * - Command system
 * - Extension host
 * - Panel management
 * - Status bar
 * - Quick pick
 * - Input boxes
 * - Tree views
 * - Webview panels
 * - Terminal integration
 * - File system access
 * - Configuration API
 * - Diagnostic collection
 *
 * @version 2.2.0
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IDEToolkit = exports.IDEToolkitContainerModule = exports.IDE_TOOLKIT_TYPES = exports.WorkspaceService = exports.WorkspaceServiceSymbol = exports.ConfigurationService = exports.ConfigurationServiceSymbol = exports.DiagnosticCollection = exports.DiagnosticCollectionSymbol = exports.TreeViewService = exports.TreeViewServiceSymbol = exports.PanelManager = exports.PanelManagerSymbol = exports.PanelViewType = exports.StatusBarService = exports.StatusBarServiceSymbol = exports.InputBoxService = exports.InputBoxServiceSymbol = exports.QuickPickService = exports.QuickPickServiceSymbol = exports.CommandRegistry = exports.CommandRegistrySymbol = exports.DocumentManager = exports.DocumentManagerSymbol = exports.StatusBarAlignment = exports.ViewColumn = exports.DiagnosticSeverity = void 0;
exports.createIDEToolkitContainer = createIDEToolkitContainer;
exports.createIDEToolkit = createIDEToolkit;
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
                },
            };
        };
    }
    fire(event) {
        this.listeners.forEach((l) => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
/**
 * Diagnostic severity
 */
var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    DiagnosticSeverity[DiagnosticSeverity["Error"] = 0] = "Error";
    DiagnosticSeverity[DiagnosticSeverity["Warning"] = 1] = "Warning";
    DiagnosticSeverity[DiagnosticSeverity["Information"] = 2] = "Information";
    DiagnosticSeverity[DiagnosticSeverity["Hint"] = 3] = "Hint";
})(DiagnosticSeverity || (exports.DiagnosticSeverity = DiagnosticSeverity = {}));
/**
 * View column
 */
var ViewColumn;
(function (ViewColumn) {
    ViewColumn[ViewColumn["Active"] = -1] = "Active";
    ViewColumn[ViewColumn["Beside"] = -2] = "Beside";
    ViewColumn[ViewColumn["One"] = 1] = "One";
    ViewColumn[ViewColumn["Two"] = 2] = "Two";
    ViewColumn[ViewColumn["Three"] = 3] = "Three";
})(ViewColumn || (exports.ViewColumn = ViewColumn = {}));
/**
 * Status bar alignment
 */
var StatusBarAlignment;
(function (StatusBarAlignment) {
    StatusBarAlignment[StatusBarAlignment["Left"] = 1] = "Left";
    StatusBarAlignment[StatusBarAlignment["Right"] = 2] = "Right";
})(StatusBarAlignment || (exports.StatusBarAlignment = StatusBarAlignment = {}));
// ==================== Document Manager ====================
exports.DocumentManagerSymbol = Symbol('DocumentManager');
/**
 * Document management system
 */
let DocumentManager = class DocumentManager {
    constructor() {
        this._onDidOpenDocument = new Emitter();
        this._onDidCloseDocument = new Emitter();
        this._onDidChangeDocument = new Emitter();
        this._onDidSaveDocument = new Emitter();
        this.documents = new Map();
        this.editors = new Map();
        this.onDidOpenDocument = this._onDidOpenDocument.event;
        this.onDidCloseDocument = this._onDidCloseDocument.event;
        this.onDidChangeDocument = this._onDidChangeDocument.event;
        this.onDidSaveDocument = this._onDidSaveDocument.event;
    }
    /**
     * Get all open documents
     */
    getDocuments() {
        return Array.from(this.documents.values());
    }
    /**
     * Get document by URI
     */
    getDocument(uri) {
        return this.documents.get(uri.toString());
    }
    /**
     * Open a document
     */
    async openDocument(uri) {
        const existing = this.documents.get(uri.toString());
        if (existing)
            return existing;
        const doc = await this.loadDocument(uri);
        this.documents.set(uri.toString(), doc);
        this._onDidOpenDocument.fire(doc);
        return doc;
    }
    /**
     * Close a document
     */
    closeDocument(uri) {
        const doc = this.documents.get(uri.toString());
        if (doc) {
            this.documents.delete(uri.toString());
            this._onDidCloseDocument.fire(doc);
        }
    }
    /**
     * Get active editor
     */
    getActiveEditor() {
        return this.activeEditor;
    }
    /**
     * Get all visible editors
     */
    getVisibleEditors() {
        return Array.from(this.editors.values());
    }
    /**
     * Show document in editor
     */
    async showDocument(doc, column) {
        // Implementation would create/show editor
        const editor = this.createEditor(doc, column);
        this.editors.set(doc.uri.toString(), editor);
        this.activeEditor = editor;
        return editor;
    }
    /**
     * Apply workspace edit
     */
    async applyEdit(edit) {
        for (const entry of edit.entries) {
            const doc = await this.openDocument(entry.uri);
            // Apply edits to document
            this._onDidChangeDocument.fire({ document: doc, changes: entry.edits });
        }
        return true;
    }
    async loadDocument(uri) {
        // Implementation would load from file system
        return {
            uri,
            fileName: uri.path.split('/').pop() ?? '',
            languageId: this.detectLanguage(uri),
            version: 1,
            isDirty: false,
            isClosed: false,
            lineCount: 0,
            getText: () => '',
            getLine: () => '',
            positionAt: () => ({ line: 0, character: 0 }),
            offsetAt: () => 0,
            save: async () => true,
        };
    }
    createEditor(doc, column) {
        return {
            document: doc,
            selection: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
                anchor: { line: 0, character: 0 },
                active: { line: 0, character: 0 },
                isReversed: false,
            },
            selections: [],
            viewColumn: column ?? ViewColumn.One,
            edit: async () => true,
            insertSnippet: async () => true,
            revealRange: () => { },
            setDecorations: () => { },
        };
    }
    detectLanguage(uri) {
        const ext = uri.path.split('.').pop()?.toLowerCase() ?? '';
        const languageMap = {
            ts: 'typescript',
            tsx: 'typescriptreact',
            js: 'javascript',
            jsx: 'javascriptreact',
            py: 'python',
            rs: 'rust',
            go: 'go',
            java: 'java',
            cpp: 'cpp',
            c: 'c',
            cs: 'csharp',
            rb: 'ruby',
            php: 'php',
            html: 'html',
            css: 'css',
            scss: 'scss',
            json: 'json',
            yaml: 'yaml',
            yml: 'yaml',
            md: 'markdown',
            sql: 'sql',
        };
        return languageMap[ext] ?? 'plaintext';
    }
    dispose() {
        this._onDidOpenDocument.dispose();
        this._onDidCloseDocument.dispose();
        this._onDidChangeDocument.dispose();
        this._onDidSaveDocument.dispose();
    }
};
exports.DocumentManager = DocumentManager;
exports.DocumentManager = DocumentManager = __decorate([
    (0, inversify_1.injectable)()
], DocumentManager);
exports.CommandRegistrySymbol = Symbol('CommandRegistry');
/**
 * Command registry and executor
 */
let CommandRegistry = class CommandRegistry {
    constructor() {
        this._onDidRegisterCommand = new Emitter();
        this._onDidExecuteCommand = new Emitter();
        this.commands = new Map();
        this.handlers = new Map();
        this.onDidRegisterCommand = this._onDidRegisterCommand.event;
        this.onDidExecuteCommand = this._onDidExecuteCommand.event;
    }
    /**
     * Register a command
     */
    registerCommand(command, handler) {
        this.commands.set(command.id, command);
        this.handlers.set(command.id, handler);
        this._onDidRegisterCommand.fire(command);
        return {
            dispose: () => {
                this.commands.delete(command.id);
                this.handlers.delete(command.id);
            },
        };
    }
    /**
     * Execute a command
     */
    async executeCommand(commandId, ...args) {
        const handler = this.handlers.get(commandId);
        if (!handler) {
            console.warn(`Command not found: ${commandId}`);
            return undefined;
        }
        this._onDidExecuteCommand.fire({ commandId, args });
        return handler(...args);
    }
    /**
     * Get all registered commands
     */
    getCommands() {
        return Array.from(this.commands.values());
    }
    /**
     * Get commands by category
     */
    getCommandsByCategory(category) {
        return this.getCommands().filter((cmd) => cmd.category === category);
    }
    /**
     * Check if command exists
     */
    hasCommand(commandId) {
        return this.commands.has(commandId);
    }
    dispose() {
        this.commands.clear();
        this.handlers.clear();
        this._onDidRegisterCommand.dispose();
        this._onDidExecuteCommand.dispose();
    }
};
exports.CommandRegistry = CommandRegistry;
exports.CommandRegistry = CommandRegistry = __decorate([
    (0, inversify_1.injectable)()
], CommandRegistry);
exports.QuickPickServiceSymbol = Symbol('QuickPickService');
/**
 * Quick pick service
 */
let QuickPickService = class QuickPickService {
    constructor() {
        this._onDidShow = new Emitter();
        this._onDidHide = new Emitter();
        this.onDidShow = this._onDidShow.event;
        this.onDidHide = this._onDidHide.event;
    }
    /**
     * Show quick pick
     */
    async show(items, options) {
        this._onDidShow.fire();
        const resolvedItems = await items;
        // Implementation would show UI
        // For now, return first item
        const result = options?.canPickMany
            ? resolvedItems.filter((i) => i.picked)
            : resolvedItems[0];
        this._onDidHide.fire();
        return result;
    }
    /**
     * Show string quick pick
     */
    async showStrings(items, options) {
        const quickPickItems = items.map((label) => ({ label }));
        const result = await this.show(quickPickItems, options);
        return Array.isArray(result) ? result[0]?.label : result?.label;
    }
    dispose() {
        this._onDidShow.dispose();
        this._onDidHide.dispose();
    }
};
exports.QuickPickService = QuickPickService;
exports.QuickPickService = QuickPickService = __decorate([
    (0, inversify_1.injectable)()
], QuickPickService);
exports.InputBoxServiceSymbol = Symbol('InputBoxService');
/**
 * Input box service
 */
let InputBoxService = class InputBoxService {
    constructor() {
        this._onDidShow = new Emitter();
        this._onDidHide = new Emitter();
        this.onDidShow = this._onDidShow.event;
        this.onDidHide = this._onDidHide.event;
    }
    /**
     * Show input box
     */
    async show(options) {
        this._onDidShow.fire();
        // Implementation would show UI
        // For now, return default value
        const result = options?.value ?? '';
        this._onDidHide.fire();
        return result;
    }
    dispose() {
        this._onDidShow.dispose();
        this._onDidHide.dispose();
    }
};
exports.InputBoxService = InputBoxService;
exports.InputBoxService = InputBoxService = __decorate([
    (0, inversify_1.injectable)()
], InputBoxService);
exports.StatusBarServiceSymbol = Symbol('StatusBarService');
/**
 * Status bar service
 */
let StatusBarService = class StatusBarService {
    constructor() {
        this._onDidChangeItems = new Emitter();
        this.items = new Map();
        this.itemIdCounter = 0;
        this.onDidChangeItems = this._onDidChangeItems.event;
    }
    /**
     * Create status bar item
     */
    createItem(alignment = StatusBarAlignment.Left, priority = 0) {
        const id = `status-bar-${++this.itemIdCounter}`;
        let visible = false;
        const item = {
            id,
            alignment,
            priority,
            text: '',
            show: () => {
                visible = true;
                this.items.set(id, item);
                this._onDidChangeItems.fire(this.getVisibleItems());
            },
            hide: () => {
                visible = false;
                this.items.delete(id);
                this._onDidChangeItems.fire(this.getVisibleItems());
            },
            dispose: () => {
                this.items.delete(id);
                this._onDidChangeItems.fire(this.getVisibleItems());
            },
        };
        return item;
    }
    /**
     * Get visible items
     */
    getVisibleItems() {
        return Array.from(this.items.values()).sort((a, b) => {
            if (a.alignment !== b.alignment) {
                return a.alignment - b.alignment;
            }
            return b.priority - a.priority;
        });
    }
    /**
     * Set message temporarily
     */
    setMessage(text, timeout) {
        const item = this.createItem(StatusBarAlignment.Left, 1000);
        item.text = text;
        item.show();
        if (timeout) {
            setTimeout(() => item.dispose(), timeout);
        }
        return { dispose: () => item.dispose() };
    }
    dispose() {
        this.items.clear();
        this._onDidChangeItems.dispose();
    }
};
exports.StatusBarService = StatusBarService;
exports.StatusBarService = StatusBarService = __decorate([
    (0, inversify_1.injectable)()
], StatusBarService);
// ==================== Panel System ====================
/**
 * Panel view types
 */
var PanelViewType;
(function (PanelViewType) {
    PanelViewType["Terminal"] = "terminal";
    PanelViewType["Output"] = "output";
    PanelViewType["Problems"] = "problems";
    PanelViewType["DebugConsole"] = "debug-console";
    PanelViewType["Custom"] = "custom";
})(PanelViewType || (exports.PanelViewType = PanelViewType = {}));
exports.PanelManagerSymbol = Symbol('PanelManager');
/**
 * Panel management system
 */
let PanelManager = class PanelManager {
    constructor() {
        this._onDidOpenPanel = new Emitter();
        this._onDidClosePanel = new Emitter();
        this._onDidChangeActivePanel = new Emitter();
        this.panels = new Map();
        this.onDidOpenPanel = this._onDidOpenPanel.event;
        this.onDidClosePanel = this._onDidClosePanel.event;
        this.onDidChangeActivePanel = this._onDidChangeActivePanel.event;
    }
    /**
     * Create a panel
     */
    createPanel(config) {
        this.panels.set(config.id, config);
        this._onDidOpenPanel.fire(config);
        return {
            dispose: () => this.closePanel(config.id),
        };
    }
    /**
     * Open/show a panel
     */
    openPanel(id) {
        if (this.panels.has(id)) {
            this.activePanel = id;
            this._onDidChangeActivePanel.fire(id);
        }
    }
    /**
     * Close a panel
     */
    closePanel(id) {
        if (this.panels.has(id)) {
            this.panels.delete(id);
            if (this.activePanel === id) {
                this.activePanel = undefined;
                this._onDidChangeActivePanel.fire(undefined);
            }
            this._onDidClosePanel.fire(id);
        }
    }
    /**
     * Get all panels
     */
    getPanels() {
        return Array.from(this.panels.values());
    }
    /**
     * Get active panel
     */
    getActivePanel() {
        return this.activePanel ? this.panels.get(this.activePanel) : undefined;
    }
    dispose() {
        this.panels.clear();
        this._onDidOpenPanel.dispose();
        this._onDidClosePanel.dispose();
        this._onDidChangeActivePanel.dispose();
    }
};
exports.PanelManager = PanelManager;
exports.PanelManager = PanelManager = __decorate([
    (0, inversify_1.injectable)()
], PanelManager);
exports.TreeViewServiceSymbol = Symbol('TreeViewService');
/**
 * Tree view service
 */
let TreeViewService = class TreeViewService {
    constructor() {
        this.views = new Map();
    }
    /**
     * Register a tree view
     */
    registerTreeView(viewId, provider, config) {
        this.views.set(viewId, { provider: provider, config: config ?? {} });
        return {
            dispose: () => {
                this.views.delete(viewId);
            },
        };
    }
    /**
     * Get tree data
     */
    async getTreeData(viewId, element) {
        const view = this.views.get(viewId);
        if (!view)
            return [];
        const children = await view.provider.getChildren(element);
        const items = [];
        for (const child of children) {
            const item = await view.provider.getTreeItem(child);
            items.push(item);
        }
        return items;
    }
    /**
     * Reveal item in tree
     */
    reveal(viewId, element, options) {
        // Implementation would reveal item in UI
    }
    dispose() {
        this.views.clear();
    }
};
exports.TreeViewService = TreeViewService;
exports.TreeViewService = TreeViewService = __decorate([
    (0, inversify_1.injectable)()
], TreeViewService);
// ==================== Diagnostic Collection ====================
exports.DiagnosticCollectionSymbol = Symbol('DiagnosticCollection');
/**
 * Diagnostic collection
 */
let DiagnosticCollection = class DiagnosticCollection {
    constructor() {
        this._onDidChangeDiagnostics = new Emitter();
        this.diagnostics = new Map();
        this.name = 'default';
        this.onDidChangeDiagnostics = this._onDidChangeDiagnostics.event;
    }
    /**
     * Set diagnostics for a URI
     */
    set(uri, diagnostics) {
        this.diagnostics.set(uri.toString(), diagnostics);
        this._onDidChangeDiagnostics.fire([uri]);
    }
    /**
     * Delete diagnostics for a URI
     */
    delete(uri) {
        this.diagnostics.delete(uri.toString());
        this._onDidChangeDiagnostics.fire([uri]);
    }
    /**
     * Get diagnostics for a URI
     */
    get(uri) {
        return this.diagnostics.get(uri.toString()) ?? [];
    }
    /**
     * Get all diagnostics
     */
    getAll() {
        const result = [];
        for (const [uriString, diagnostics] of this.diagnostics) {
            result.push({
                uri: this.parseUri(uriString),
                diagnostics,
            });
        }
        return result;
    }
    /**
     * Clear all diagnostics
     */
    clear() {
        const uris = Array.from(this.diagnostics.keys()).map((s) => this.parseUri(s));
        this.diagnostics.clear();
        this._onDidChangeDiagnostics.fire(uris);
    }
    /**
     * Get total count
     */
    getCount() {
        let errors = 0, warnings = 0, info = 0, hints = 0;
        for (const diags of this.diagnostics.values()) {
            for (const d of diags) {
                switch (d.severity) {
                    case DiagnosticSeverity.Error:
                        errors++;
                        break;
                    case DiagnosticSeverity.Warning:
                        warnings++;
                        break;
                    case DiagnosticSeverity.Information:
                        info++;
                        break;
                    case DiagnosticSeverity.Hint:
                        hints++;
                        break;
                }
            }
        }
        return { errors, warnings, info, hints };
    }
    parseUri(uriString) {
        // Simple URI parsing
        const parts = uriString.match(/^(\w+):\/\/([^/]*)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
        return {
            scheme: parts?.[1] ?? 'file',
            authority: parts?.[2] ?? '',
            path: parts?.[3] ?? '',
            query: parts?.[4]?.slice(1) ?? '',
            fragment: parts?.[5]?.slice(1) ?? '',
            fsPath: parts?.[3] ?? '',
            toString: () => uriString,
        };
    }
    dispose() {
        this.diagnostics.clear();
        this._onDidChangeDiagnostics.dispose();
    }
};
exports.DiagnosticCollection = DiagnosticCollection;
exports.DiagnosticCollection = DiagnosticCollection = __decorate([
    (0, inversify_1.injectable)()
], DiagnosticCollection);
// ==================== Configuration API ====================
exports.ConfigurationServiceSymbol = Symbol('ConfigurationService');
/**
 * Configuration service
 */
let ConfigurationService = class ConfigurationService {
    constructor() {
        this._onDidChangeConfiguration = new Emitter();
        this.config = new Map();
        this.defaults = new Map();
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
    }
    /**
     * Get configuration value
     */
    get(section, defaultValue) {
        if (this.config.has(section)) {
            return this.config.get(section);
        }
        if (this.defaults.has(section)) {
            return this.defaults.get(section);
        }
        return defaultValue;
    }
    /**
     * Update configuration
     */
    async update(section, value, global) {
        this.config.set(section, value);
        this._onDidChangeConfiguration.fire({
            affectsConfiguration: (s) => s === section || section.startsWith(s + '.'),
        });
    }
    /**
     * Register default values
     */
    registerDefaults(defaults) {
        for (const [key, value] of Object.entries(defaults)) {
            this.defaults.set(key, value);
        }
    }
    /**
     * Get all configuration
     */
    getAll() {
        const result = {};
        for (const [key, value] of this.defaults) {
            result[key] = value;
        }
        for (const [key, value] of this.config) {
            result[key] = value;
        }
        return result;
    }
    dispose() {
        this._onDidChangeConfiguration.dispose();
    }
};
exports.ConfigurationService = ConfigurationService;
exports.ConfigurationService = ConfigurationService = __decorate([
    (0, inversify_1.injectable)()
], ConfigurationService);
// ==================== Workspace Service ====================
exports.WorkspaceServiceSymbol = Symbol('WorkspaceService');
/**
 * Workspace service
 */
let WorkspaceService = class WorkspaceService {
    constructor() {
        this._onDidChangeWorkspaceFolders = new Emitter();
        this.folders = [];
        this.onDidChangeWorkspaceFolders = this._onDidChangeWorkspaceFolders.event;
    }
    /**
     * Get workspace folders
     */
    getWorkspaceFolders() {
        return [...this.folders];
    }
    /**
     * Get workspace name
     */
    getWorkspaceName() {
        return this.workspaceName;
    }
    /**
     * Add workspace folder
     */
    addFolder(uri, name) {
        const folder = {
            uri,
            name: name ?? uri.path.split('/').pop() ?? 'Folder',
            index: this.folders.length,
        };
        this.folders.push(folder);
        this._onDidChangeWorkspaceFolders.fire({ added: [folder], removed: [] });
    }
    /**
     * Remove workspace folder
     */
    removeFolder(uri) {
        const index = this.folders.findIndex((f) => f.uri.toString() === uri.toString());
        if (index !== -1) {
            const [removed] = this.folders.splice(index, 1);
            // Re-index
            this.folders.forEach((f, i) => f.index = i);
            this._onDidChangeWorkspaceFolders.fire({ added: [], removed: [removed] });
        }
    }
    /**
     * Find files
     */
    async findFiles(include, exclude, maxResults) {
        // Implementation would search file system
        return [];
    }
    /**
     * Open text document
     */
    async openTextDocument(uri) {
        // Implementation would delegate to DocumentManager
        throw new Error('Not implemented');
    }
    dispose() {
        this._onDidChangeWorkspaceFolders.dispose();
    }
};
exports.WorkspaceService = WorkspaceService;
exports.WorkspaceService = WorkspaceService = __decorate([
    (0, inversify_1.injectable)()
], WorkspaceService);
// ==================== IDE Toolkit Container Module ====================
exports.IDE_TOOLKIT_TYPES = {
    DocumentManager: exports.DocumentManagerSymbol,
    CommandRegistry: exports.CommandRegistrySymbol,
    QuickPickService: exports.QuickPickServiceSymbol,
    InputBoxService: exports.InputBoxServiceSymbol,
    StatusBarService: exports.StatusBarServiceSymbol,
    PanelManager: exports.PanelManagerSymbol,
    TreeViewService: exports.TreeViewServiceSymbol,
    DiagnosticCollection: exports.DiagnosticCollectionSymbol,
    ConfigurationService: exports.ConfigurationServiceSymbol,
    WorkspaceService: exports.WorkspaceServiceSymbol,
};
/**
 * IDE Toolkit container module
 */
exports.IDEToolkitContainerModule = new inversify_1.ContainerModule((bind) => {
    bind(exports.IDE_TOOLKIT_TYPES.DocumentManager).to(DocumentManager).inSingletonScope();
    bind(exports.IDE_TOOLKIT_TYPES.CommandRegistry).to(CommandRegistry).inSingletonScope();
    bind(exports.IDE_TOOLKIT_TYPES.QuickPickService).to(QuickPickService).inSingletonScope();
    bind(exports.IDE_TOOLKIT_TYPES.InputBoxService).to(InputBoxService).inSingletonScope();
    bind(exports.IDE_TOOLKIT_TYPES.StatusBarService).to(StatusBarService).inSingletonScope();
    bind(exports.IDE_TOOLKIT_TYPES.PanelManager).to(PanelManager).inSingletonScope();
    bind(exports.IDE_TOOLKIT_TYPES.TreeViewService).to(TreeViewService).inSingletonScope();
    bind(exports.IDE_TOOLKIT_TYPES.DiagnosticCollection).to(DiagnosticCollection).inSingletonScope();
    bind(exports.IDE_TOOLKIT_TYPES.ConfigurationService).to(ConfigurationService).inSingletonScope();
    bind(exports.IDE_TOOLKIT_TYPES.WorkspaceService).to(WorkspaceService).inSingletonScope();
});
/**
 * Create IDE Toolkit container
 */
function createIDEToolkitContainer() {
    const container = new inversify_1.Container();
    container.load(exports.IDEToolkitContainerModule);
    return container;
}
// ==================== Convenience API ====================
/**
 * IDE Toolkit facade for easy access
 */
class IDEToolkit {
    constructor(container) {
        this.container = container;
    }
    get documents() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.DocumentManager);
    }
    get commands() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.CommandRegistry);
    }
    get quickPick() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.QuickPickService);
    }
    get inputBox() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.InputBoxService);
    }
    get statusBar() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.StatusBarService);
    }
    get panels() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.PanelManager);
    }
    get treeView() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.TreeViewService);
    }
    get diagnostics() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.DiagnosticCollection);
    }
    get configuration() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.ConfigurationService);
    }
    get workspace() {
        return this.container.get(exports.IDE_TOOLKIT_TYPES.WorkspaceService);
    }
    /**
     * Register a command with handler
     */
    registerCommand(id, handler, options) {
        return this.commands.registerCommand({
            id,
            title: options?.title ?? id,
            category: options?.category,
            keybinding: options?.keybinding,
        }, handler);
    }
    /**
     * Show information message
     */
    showInformationMessage(message, ...items) {
        return this.quickPick.showStrings([message, ...items]);
    }
    /**
     * Show warning message
     */
    showWarningMessage(message, ...items) {
        return this.quickPick.showStrings([message, ...items]);
    }
    /**
     * Show error message
     */
    showErrorMessage(message, ...items) {
        return this.quickPick.showStrings([message, ...items]);
    }
}
exports.IDEToolkit = IDEToolkit;
/**
 * Create IDE Toolkit instance
 */
function createIDEToolkit() {
    const container = createIDEToolkitContainer();
    return new IDEToolkit(container);
}
