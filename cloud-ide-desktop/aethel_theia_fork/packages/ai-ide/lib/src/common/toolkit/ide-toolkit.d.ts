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
import { Container, ContainerModule } from 'inversify';
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
type Disposable = {
    dispose: () => void;
};
/**
 * URI representation
 */
export interface Uri {
    scheme: string;
    authority: string;
    path: string;
    query: string;
    fragment: string;
    fsPath: string;
    toString(): string;
}
/**
 * Position in a document
 */
export interface Position {
    line: number;
    character: number;
}
/**
 * Range in a document
 */
export interface Range {
    start: Position;
    end: Position;
}
/**
 * Selection in a document
 */
export interface Selection extends Range {
    anchor: Position;
    active: Position;
    isReversed: boolean;
}
/**
 * Text edit
 */
export interface TextEdit {
    range: Range;
    newText: string;
}
/**
 * Workspace edit
 */
export interface WorkspaceEdit {
    entries: Array<{
        uri: Uri;
        edits: TextEdit[];
    }>;
}
/**
 * Diagnostic severity
 */
export declare enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3
}
/**
 * Diagnostic
 */
export interface Diagnostic {
    range: Range;
    message: string;
    severity: DiagnosticSeverity;
    code?: string | number;
    source?: string;
    relatedInformation?: Array<{
        location: {
            uri: Uri;
            range: Range;
        };
        message: string;
    }>;
}
/**
 * View column
 */
export declare enum ViewColumn {
    Active = -1,
    Beside = -2,
    One = 1,
    Two = 2,
    Three = 3
}
/**
 * Status bar alignment
 */
export declare enum StatusBarAlignment {
    Left = 1,
    Right = 2
}
/**
 * Text document
 */
export interface TextDocument {
    uri: Uri;
    fileName: string;
    languageId: string;
    version: number;
    isDirty: boolean;
    isClosed: boolean;
    lineCount: number;
    getText(range?: Range): string;
    getLine(lineNumber: number): string;
    positionAt(offset: number): Position;
    offsetAt(position: Position): number;
    save(): Promise<boolean>;
}
/**
 * Text editor
 */
export interface TextEditor {
    document: TextDocument;
    selection: Selection;
    selections: Selection[];
    viewColumn?: ViewColumn;
    edit(callback: (editBuilder: TextEditorEdit) => void): Promise<boolean>;
    insertSnippet(snippet: string, location?: Position | Range): Promise<boolean>;
    revealRange(range: Range, revealType?: 'center' | 'top' | 'bottom'): void;
    setDecorations(decorationType: string, ranges: Range[]): void;
}
/**
 * Text editor edit
 */
export interface TextEditorEdit {
    insert(position: Position, value: string): void;
    delete(range: Range): void;
    replace(range: Range, value: string): void;
}
export declare const DocumentManagerSymbol: unique symbol;
/**
 * Document management system
 */
export declare class DocumentManager {
    private readonly _onDidOpenDocument;
    private readonly _onDidCloseDocument;
    private readonly _onDidChangeDocument;
    private readonly _onDidSaveDocument;
    private documents;
    private editors;
    private activeEditor?;
    readonly onDidOpenDocument: Event<TextDocument>;
    readonly onDidCloseDocument: Event<TextDocument>;
    readonly onDidChangeDocument: Event<{
        document: TextDocument;
        changes: TextEdit[];
    }>;
    readonly onDidSaveDocument: Event<TextDocument>;
    /**
     * Get all open documents
     */
    getDocuments(): TextDocument[];
    /**
     * Get document by URI
     */
    getDocument(uri: Uri): TextDocument | undefined;
    /**
     * Open a document
     */
    openDocument(uri: Uri): Promise<TextDocument>;
    /**
     * Close a document
     */
    closeDocument(uri: Uri): void;
    /**
     * Get active editor
     */
    getActiveEditor(): TextEditor | undefined;
    /**
     * Get all visible editors
     */
    getVisibleEditors(): TextEditor[];
    /**
     * Show document in editor
     */
    showDocument(doc: TextDocument, column?: ViewColumn): Promise<TextEditor>;
    /**
     * Apply workspace edit
     */
    applyEdit(edit: WorkspaceEdit): Promise<boolean>;
    private loadDocument;
    private createEditor;
    private detectLanguage;
    dispose(): void;
}
/**
 * Command definition
 */
export interface Command {
    id: string;
    title: string;
    category?: string;
    icon?: string;
    keybinding?: string;
    when?: string;
}
export declare const CommandRegistrySymbol: unique symbol;
/**
 * Command registry and executor
 */
export declare class CommandRegistry {
    private readonly _onDidRegisterCommand;
    private readonly _onDidExecuteCommand;
    private commands;
    private handlers;
    readonly onDidRegisterCommand: Event<Command>;
    readonly onDidExecuteCommand: Event<{
        commandId: string;
        args: unknown[];
    }>;
    /**
     * Register a command
     */
    registerCommand(command: Command, handler: (...args: unknown[]) => unknown): Disposable;
    /**
     * Execute a command
     */
    executeCommand<T = unknown>(commandId: string, ...args: unknown[]): Promise<T | undefined>;
    /**
     * Get all registered commands
     */
    getCommands(): Command[];
    /**
     * Get commands by category
     */
    getCommandsByCategory(category: string): Command[];
    /**
     * Check if command exists
     */
    hasCommand(commandId: string): boolean;
    dispose(): void;
}
/**
 * Quick pick item
 */
export interface QuickPickItem {
    label: string;
    description?: string;
    detail?: string;
    picked?: boolean;
    alwaysShow?: boolean;
    iconPath?: string;
    buttons?: Array<{
        iconPath: string;
        tooltip?: string;
    }>;
}
/**
 * Quick pick options
 */
export interface QuickPickOptions {
    title?: string;
    placeholder?: string;
    canPickMany?: boolean;
    matchOnDescription?: boolean;
    matchOnDetail?: boolean;
    ignoreFocusOut?: boolean;
}
export declare const QuickPickServiceSymbol: unique symbol;
/**
 * Quick pick service
 */
export declare class QuickPickService {
    private readonly _onDidShow;
    private readonly _onDidHide;
    readonly onDidShow: Event<void>;
    readonly onDidHide: Event<void>;
    /**
     * Show quick pick
     */
    show<T extends QuickPickItem>(items: T[] | Promise<T[]>, options?: QuickPickOptions): Promise<T | T[] | undefined>;
    /**
     * Show string quick pick
     */
    showStrings(items: string[], options?: QuickPickOptions): Promise<string | undefined>;
    dispose(): void;
}
/**
 * Input box options
 */
export interface InputBoxOptions {
    title?: string;
    prompt?: string;
    value?: string;
    placeholder?: string;
    password?: boolean;
    ignoreFocusOut?: boolean;
    validateInput?: (value: string) => string | undefined | null | Promise<string | undefined | null>;
}
export declare const InputBoxServiceSymbol: unique symbol;
/**
 * Input box service
 */
export declare class InputBoxService {
    private readonly _onDidShow;
    private readonly _onDidHide;
    readonly onDidShow: Event<void>;
    readonly onDidHide: Event<void>;
    /**
     * Show input box
     */
    show(options?: InputBoxOptions): Promise<string | undefined>;
    dispose(): void;
}
/**
 * Status bar item
 */
export interface StatusBarItem {
    id: string;
    alignment: StatusBarAlignment;
    priority: number;
    text: string;
    tooltip?: string;
    color?: string;
    backgroundColor?: string;
    command?: string;
    show(): void;
    hide(): void;
    dispose(): void;
}
export declare const StatusBarServiceSymbol: unique symbol;
/**
 * Status bar service
 */
export declare class StatusBarService {
    private readonly _onDidChangeItems;
    private items;
    private itemIdCounter;
    readonly onDidChangeItems: Event<StatusBarItem[]>;
    /**
     * Create status bar item
     */
    createItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem;
    /**
     * Get visible items
     */
    getVisibleItems(): StatusBarItem[];
    /**
     * Set message temporarily
     */
    setMessage(text: string, timeout?: number): Disposable;
    dispose(): void;
}
/**
 * Panel view types
 */
export declare enum PanelViewType {
    Terminal = "terminal",
    Output = "output",
    Problems = "problems",
    DebugConsole = "debug-console",
    Custom = "custom"
}
/**
 * Panel configuration
 */
export interface PanelConfig {
    id: string;
    title: string;
    type: PanelViewType;
    icon?: string;
    closeable?: boolean;
    preserveOnHide?: boolean;
}
export declare const PanelManagerSymbol: unique symbol;
/**
 * Panel management system
 */
export declare class PanelManager {
    private readonly _onDidOpenPanel;
    private readonly _onDidClosePanel;
    private readonly _onDidChangeActivePanel;
    private panels;
    private activePanel?;
    readonly onDidOpenPanel: Event<PanelConfig>;
    readonly onDidClosePanel: Event<string>;
    readonly onDidChangeActivePanel: Event<string | undefined>;
    /**
     * Create a panel
     */
    createPanel(config: PanelConfig): Disposable;
    /**
     * Open/show a panel
     */
    openPanel(id: string): void;
    /**
     * Close a panel
     */
    closePanel(id: string): void;
    /**
     * Get all panels
     */
    getPanels(): PanelConfig[];
    /**
     * Get active panel
     */
    getActivePanel(): PanelConfig | undefined;
    dispose(): void;
}
/**
 * Tree item
 */
export interface TreeItem {
    id: string;
    label: string;
    description?: string;
    tooltip?: string;
    iconPath?: string;
    collapsibleState?: 'none' | 'collapsed' | 'expanded';
    command?: string;
    contextValue?: string;
    children?: TreeItem[];
}
/**
 * Tree data provider
 */
export interface TreeDataProvider<T> {
    getTreeItem(element: T): TreeItem | Promise<TreeItem>;
    getChildren(element?: T): T[] | Promise<T[]>;
    getParent?(element: T): T | undefined | Promise<T | undefined>;
    onDidChangeTreeData?: Event<T | undefined | null>;
}
export declare const TreeViewServiceSymbol: unique symbol;
/**
 * Tree view service
 */
export declare class TreeViewService {
    private views;
    /**
     * Register a tree view
     */
    registerTreeView<T>(viewId: string, provider: TreeDataProvider<T>, config?: {
        showCollapseAll?: boolean;
        canSelectMany?: boolean;
    }): Disposable;
    /**
     * Get tree data
     */
    getTreeData(viewId: string, element?: unknown): Promise<TreeItem[]>;
    /**
     * Reveal item in tree
     */
    reveal(viewId: string, element: unknown, options?: {
        select?: boolean;
        expand?: boolean;
    }): void;
    dispose(): void;
}
export declare const DiagnosticCollectionSymbol: unique symbol;
/**
 * Diagnostic collection
 */
export declare class DiagnosticCollection {
    private readonly _onDidChangeDiagnostics;
    private diagnostics;
    private name;
    readonly onDidChangeDiagnostics: Event<Uri[]>;
    /**
     * Set diagnostics for a URI
     */
    set(uri: Uri, diagnostics: Diagnostic[]): void;
    /**
     * Delete diagnostics for a URI
     */
    delete(uri: Uri): void;
    /**
     * Get diagnostics for a URI
     */
    get(uri: Uri): Diagnostic[];
    /**
     * Get all diagnostics
     */
    getAll(): Array<{
        uri: Uri;
        diagnostics: Diagnostic[];
    }>;
    /**
     * Clear all diagnostics
     */
    clear(): void;
    /**
     * Get total count
     */
    getCount(): {
        errors: number;
        warnings: number;
        info: number;
        hints: number;
    };
    private parseUri;
    dispose(): void;
}
export declare const ConfigurationServiceSymbol: unique symbol;
/**
 * Configuration service
 */
export declare class ConfigurationService {
    private readonly _onDidChangeConfiguration;
    private config;
    private defaults;
    readonly onDidChangeConfiguration: Event<{
        affectsConfiguration: (section: string) => boolean;
    }>;
    /**
     * Get configuration value
     */
    get<T>(section: string, defaultValue?: T): T;
    /**
     * Update configuration
     */
    update(section: string, value: unknown, global?: boolean): Promise<void>;
    /**
     * Register default values
     */
    registerDefaults(defaults: Record<string, unknown>): void;
    /**
     * Get all configuration
     */
    getAll(): Record<string, unknown>;
    dispose(): void;
}
export declare const WorkspaceServiceSymbol: unique symbol;
/**
 * Workspace folder
 */
export interface WorkspaceFolder {
    uri: Uri;
    name: string;
    index: number;
}
/**
 * Workspace service
 */
export declare class WorkspaceService {
    private readonly _onDidChangeWorkspaceFolders;
    private folders;
    private workspaceName?;
    readonly onDidChangeWorkspaceFolders: Event<{
        added: WorkspaceFolder[];
        removed: WorkspaceFolder[];
    }>;
    /**
     * Get workspace folders
     */
    getWorkspaceFolders(): WorkspaceFolder[];
    /**
     * Get workspace name
     */
    getWorkspaceName(): string | undefined;
    /**
     * Add workspace folder
     */
    addFolder(uri: Uri, name?: string): void;
    /**
     * Remove workspace folder
     */
    removeFolder(uri: Uri): void;
    /**
     * Find files
     */
    findFiles(include: string, exclude?: string, maxResults?: number): Promise<Uri[]>;
    /**
     * Open text document
     */
    openTextDocument(uri: Uri): Promise<TextDocument>;
    dispose(): void;
}
export declare const IDE_TOOLKIT_TYPES: {
    DocumentManager: symbol;
    CommandRegistry: symbol;
    QuickPickService: symbol;
    InputBoxService: symbol;
    StatusBarService: symbol;
    PanelManager: symbol;
    TreeViewService: symbol;
    DiagnosticCollection: symbol;
    ConfigurationService: symbol;
    WorkspaceService: symbol;
};
/**
 * IDE Toolkit container module
 */
export declare const IDEToolkitContainerModule: ContainerModule;
/**
 * Create IDE Toolkit container
 */
export declare function createIDEToolkitContainer(): Container;
/**
 * IDE Toolkit facade for easy access
 */
export declare class IDEToolkit {
    private container;
    constructor(container: Container);
    get documents(): DocumentManager;
    get commands(): CommandRegistry;
    get quickPick(): QuickPickService;
    get inputBox(): InputBoxService;
    get statusBar(): StatusBarService;
    get panels(): PanelManager;
    get treeView(): TreeViewService;
    get diagnostics(): DiagnosticCollection;
    get configuration(): ConfigurationService;
    get workspace(): WorkspaceService;
    /**
     * Register a command with handler
     */
    registerCommand(id: string, handler: (...args: unknown[]) => unknown, options?: {
        title?: string;
        category?: string;
        keybinding?: string;
    }): Disposable;
    /**
     * Show information message
     */
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
    /**
     * Show warning message
     */
    showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
    /**
     * Show error message
     */
    showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
}
/**
 * Create IDE Toolkit instance
 */
export declare function createIDEToolkit(): IDEToolkit;
export {};
