import { logger } from '@/lib/observability/logger';
// Extension host runtime with worker isolation and sandboxed extension execution.

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import * as vm from 'vm';

// ============================================================================
// Types
// ============================================================================

export interface ExtensionManifest {
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  description?: string;
  main?: string;
  browser?: string;
  activationEvents?: string[];
  contributes?: ExtensionContributes;
  dependencies?: Record<string, string>;
  engines?: {
    aethel?: string;
    vscode?: string;
  };
  categories?: string[];
  keywords?: string[];
  icon?: string;
  repository?: string;
  license?: string;
}

export interface ExtensionContributes {
  commands?: ContributedCommand[];
  menus?: Record<string, ContributedMenu[]>;
  keybindings?: ContributedKeybinding[];
  configuration?: ContributedConfiguration;
  themes?: ContributedTheme[];
  iconThemes?: ContributedIconTheme[];
  languages?: ContributedLanguage[];
  grammars?: ContributedGrammar[];
  snippets?: ContributedSnippet[];
  views?: Record<string, ContributedView[]>;
  viewsContainers?: {
    activitybar?: ContributedViewContainer[];
    panel?: ContributedViewContainer[];
  };
  taskDefinitions?: ContributedTaskDefinition[];
  debuggers?: ContributedDebugger[];
  breakpoints?: ContributedBreakpoint[];
  customEditors?: ContributedCustomEditor[];
  webviewPanels?: ContributedWebviewPanel[];
}

export interface ContributedCommand {
  command: string;
  title: string;
  category?: string;
  icon?: string | { light: string; dark: string };
  enablement?: string;
}

export interface ContributedMenu {
  command: string;
  when?: string;
  group?: string;
}

export interface ContributedKeybinding {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
}

export interface ContributedConfiguration {
  title?: string;
  properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  type: string | string[];
  default?: unknown;
  description?: string;
  enum?: unknown[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  items?: unknown;
  scope?: 'application' | 'machine' | 'window' | 'resource' | 'language-overridable';
}

export interface ContributedTheme {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
  path: string;
}

export interface ContributedIconTheme {
  id: string;
  label: string;
  path: string;
}

export interface ContributedLanguage {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  filenamePatterns?: string[];
  firstLine?: string;
  configuration?: string;
  icon?: { light: string; dark: string };
}

export interface ContributedGrammar {
  language?: string;
  scopeName: string;
  path: string;
  embeddedLanguages?: Record<string, string>;
  tokenTypes?: Record<string, string>;
  injectTo?: string[];
}

export interface ContributedSnippet {
  language: string;
  path: string;
}

export interface ContributedView {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
  visibility?: 'visible' | 'hidden' | 'collapsed';
}

export interface ContributedViewContainer {
  id: string;
  title: string;
  icon: string;
}

export interface ContributedTaskDefinition {
  type: string;
  required?: string[];
  properties?: Record<string, unknown>;
}

export interface ContributedDebugger {
  type: string;
  label: string;
  program?: string;
  runtime?: string;
  languages?: string[];
  variables?: Record<string, unknown>;
  configurationAttributes?: unknown;
  initialConfigurations?: unknown[];
  configurationSnippets?: unknown[];
}

export interface ContributedBreakpoint {
  language: string;
}

export interface ContributedCustomEditor {
  viewType: string;
  displayName: string;
  selector: { filenamePattern: string }[];
  priority?: 'default' | 'option';
}

export interface ContributedWebviewPanel {
  viewType: string;
  displayName: string;
}

export interface Extension {
  id: string;
  manifest: ExtensionManifest;
  extensionPath: string;
  isActive: boolean;
  exports?: unknown;
}

export interface ExtensionContext {
  extensionPath: string;
  extensionUri: string;
  globalStoragePath: string;
  workspaceStoragePath: string;
  logPath: string;
  subscriptions: { dispose: () => void }[];
  globalState: {
    get<T>(key: string, defaultValue?: T): T | undefined;
    update(key: string, value: unknown): Promise<void>;
    keys(): readonly string[];
  };
  workspaceState: {
    get<T>(key: string, defaultValue?: T): T | undefined;
    update(key: string, value: unknown): Promise<void>;
    keys(): readonly string[];
  };
  secrets: {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  asAbsolutePath(relativePath: string): string;
}

export interface ExtensionHostMessage {
  id: string;
  type: string;
  payload: unknown;
}

type Disposable = { dispose: () => void };
type ApiNamespace = Record<string, unknown>;
type NumericEnum = Record<string, number>;
type ExtensionCallback = (...args: unknown[]) => unknown | Promise<unknown>;
type EventListener = (...args: unknown[]) => void;
type ProviderLike = unknown;
type DocumentSelector = string | readonly string[] | Record<string, unknown>;
type QuickPickOptions = Record<string, unknown>;
type InputBoxOptions = Record<string, unknown>;
type ViewShowOptions = Record<string, unknown>;
type WebviewPanelOptions = Record<string, unknown>;
type TerminalOptions = { name?: string } & Record<string, unknown>;
type ProgressOptions = Record<string, unknown>;
type ProgressReport = { message?: string; increment?: number };
type ProgressReporter = { report: (value: ProgressReport) => void };
type ProgressTask<R> = (progress: ProgressReporter) => R | Promise<R>;
type WorkspaceFolder = { uri: UriLike; name: string; index: number };
type WorkspaceEdit = Record<string, unknown>;
type DebugConfiguration = Record<string, unknown>;
type DebugSession = Record<string, unknown>;
type TaskFilter = Record<string, unknown>;
type TaskLike = Record<string, unknown>;

type UriLike = {
  scheme: string;
  path: string;
  toString: () => string;
};

type UriFactory = {
  file: (p: string) => UriLike;
  parse: (value: string) => UriLike;
  joinPath: (base: UriLike, ...pathSegments: string[]) => UriLike;
};

type OutputChannel = {
  name: string;
  append: (value: string) => void;
  appendLine: (value: string) => void;
  clear: () => void;
  show: () => void;
  hide: () => void;
  dispose: () => void;
};

type Terminal = {
  name: string;
  processId: Promise<number>;
  sendText: (text: string) => void;
  show: () => void;
  hide: () => void;
  dispose: () => void;
};

type WebviewPanel = {
  viewType: string;
  title: string;
  webview: {
    html: string;
    onDidReceiveMessage: (listener: EventListener) => Disposable;
    postMessage: (message: unknown) => Promise<boolean>;
    asWebviewUri: (uri: UriLike) => UriLike;
  };
  visible: boolean;
  active: boolean;
  dispose: () => void;
  reveal: () => void;
  onDidChangeViewState: (listener: EventListener) => Disposable;
  onDidDispose: (listener: EventListener) => Disposable;
};

type StatusBarItem = {
  id: string;
  alignment: number;
  priority: number;
  text: string;
  tooltip: string;
  color: string | undefined;
  backgroundColor: string | undefined;
  command: string | undefined;
  show: () => void;
  hide: () => void;
  dispose: () => void;
};

type ConfigurationReader = {
  get: (key: string) => unknown;
};

type DebugConsole = {
  append: (value?: string) => void;
  appendLine: (value?: string) => void;
};

type TaskExecution = {
  terminate: () => void;
};

interface PositionLike {
  line: number;
  character: number;
  isEqual(other: PositionLike): boolean;
  isBefore(other: PositionLike): boolean;
  isAfter(other: PositionLike): boolean;
}

type RangeLike = {
  start: PositionLike;
  end: PositionLike;
};

class RuntimePosition implements PositionLike {
  constructor(public line: number, public character: number) {}

  isEqual(other: PositionLike): boolean {
    return this.line === other.line && this.character === other.character;
  }

  isBefore(other: PositionLike): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character);
  }

  isAfter(other: PositionLike): boolean {
    return this.line > other.line || (this.line === other.line && this.character > other.character);
  }

  translate(lineDelta = 0, characterDelta = 0): RuntimePosition {
    return new RuntimePosition(this.line + lineDelta, this.character + characterDelta);
  }
}

class RuntimeRange implements RangeLike {
  constructor(public start: PositionLike, public end: PositionLike) {}

  static fromPositions(start: PositionLike, end: PositionLike): RuntimeRange {
    return new RuntimeRange(start, end);
  }

  get isEmpty(): boolean {
    return this.start.isEqual(this.end);
  }

  get isSingleLine(): boolean {
    return this.start.line === this.end.line;
  }

  contains(positionOrRange: PositionLike | RangeLike): boolean {
    if ('start' in positionOrRange) {
      return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
    }
    return !positionOrRange.isBefore(this.start) && !positionOrRange.isAfter(this.end);
  }
}

class RuntimeSelection extends RuntimeRange {
  constructor(public anchor: PositionLike, public active: PositionLike) {
    super(anchor, active);
  }

  get isReversed(): boolean {
    return this.anchor.isAfter(this.active);
  }
}

const nativeRequire = eval('require') as NodeRequire;

// ============================================================================
// Extension API (Sandbox)
// ============================================================================

class ExtensionAPI {
  private host: ExtensionHostRuntime;
  private extensionId: string;
  
  // Declare all API namespaces
  commands: ApiNamespace;
  window: ApiNamespace;
  workspace: ApiNamespace;
  languages: ApiNamespace;
  debug: ApiNamespace;
  tasks: ApiNamespace;
  extensions: ApiNamespace;
  env: ApiNamespace;
  Uri: UriFactory;
  Position: typeof RuntimePosition;
  Range: typeof RuntimeRange;
  Selection: typeof RuntimeSelection;
  DiagnosticSeverity: NumericEnum;
  CompletionItemKind: NumericEnum;
  SymbolKind: NumericEnum;
  TreeItemCollapsibleState: NumericEnum;
  StatusBarAlignment: NumericEnum;
  ViewColumn: NumericEnum;
  
  constructor(host: ExtensionHostRuntime, extensionId: string) {
    this.host = host;
    this.extensionId = extensionId;
    
    // Initialize all API namespaces in constructor
    this.commands = {
      registerCommand: (command: string, callback: ExtensionCallback) => {
        return this.host.registerCommand(this.extensionId, command, callback);
      },
      executeCommand: <T>(command: string, ...args: unknown[]): Promise<T> => {
        return this.host.executeCommand(command, ...args);
      },
      getCommands: (filterInternal?: boolean): Promise<string[]> => {
        return this.host.getCommands(filterInternal);
      },
    };
    
    this.window = {
      showInformationMessage: (message: string, ...items: string[]) => {
        return this.host.showMessage('info', message, items);
      },
      showWarningMessage: (message: string, ...items: string[]) => {
        return this.host.showMessage('warning', message, items);
      },
      showErrorMessage: (message: string, ...items: string[]) => {
        return this.host.showMessage('error', message, items);
      },
      showQuickPick: (items: readonly unknown[], options?: QuickPickOptions) => {
        return this.host.showQuickPick(items, options);
      },
      showInputBox: (options?: Record<string, unknown>) => {
        return this.host.showInputBox(options);
      },
      createOutputChannel: (name: string) => {
        return this.host.createOutputChannel(this.extensionId, name);
      },
      createTerminal: (options?: Record<string, unknown>) => {
        return this.host.createTerminal(this.extensionId, options);
      },
      createWebviewPanel: (viewType: string, title: string, showOptions: ViewShowOptions, options?: WebviewPanelOptions) => {
        return this.host.createWebviewPanel(this.extensionId, viewType, title, showOptions, options);
      },
      createStatusBarItem: (alignment?: number, priority?: number) => {
        return this.host.createStatusBarItem(this.extensionId, alignment, priority);
      },
      setStatusBarMessage: (text: string, hideAfterTimeout?: number) => {
        return this.host.setStatusBarMessage(text, hideAfterTimeout);
      },
      withProgress: <R>(options: ProgressOptions, task: ProgressTask<R>) => {
        return this.host.withProgress(this.extensionId, options, task);
      },
      registerTreeDataProvider: (viewId: string, provider: ProviderLike) => {
        return this.host.registerTreeDataProvider(this.extensionId, viewId, provider);
      },
      createTreeView: (viewId: string, options: Record<string, unknown>) => {
        return this.host.createTreeView(this.extensionId, viewId, options);
      },
      onDidChangeActiveTextEditor: (listener: EventListener) => {
        return this.host.onEvent('activeTextEditorChanged', listener);
      },
      onDidChangeTextEditorSelection: (listener: EventListener) => {
        return this.host.onEvent('textEditorSelectionChanged', listener);
      },
    };
    
    this.workspace = {
      get workspaceFolders() { return host.getWorkspaceFolders(); },
      get name() { return host.getWorkspaceName(); },
      getConfiguration: (section?: string, scope?: unknown) => {
        return this.host.getConfiguration(section, scope);
      },
      onDidChangeConfiguration: (listener: EventListener) => {
        return this.host.onEvent('configurationChanged', listener);
      },
      findFiles: (include: string, exclude?: string, maxResults?: number) => {
        return this.host.findFiles(include, exclude, maxResults);
      },
      openTextDocument: (uri: UriLike) => {
        return this.host.openTextDocument(uri);
      },
      applyEdit: (edit: WorkspaceEdit) => {
        return this.host.applyEdit(edit);
      },
      createFileSystemWatcher: (globPattern: string, ignoreCreateEvents?: boolean, ignoreChangeEvents?: boolean, ignoreDeleteEvents?: boolean) => {
        return this.host.createFileSystemWatcher(this.extensionId, globPattern, ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents);
      },
      onDidOpenTextDocument: (listener: EventListener) => {
        return this.host.onEvent('textDocumentOpened', listener);
      },
      onDidCloseTextDocument: (listener: EventListener) => {
        return this.host.onEvent('textDocumentClosed', listener);
      },
      onDidChangeTextDocument: (listener: EventListener) => {
        return this.host.onEvent('textDocumentChanged', listener);
      },
      onDidSaveTextDocument: (listener: EventListener) => {
        return this.host.onEvent('textDocumentSaved', listener);
      },
      registerTextDocumentContentProvider: (scheme: string, provider: ProviderLike) => {
        return this.host.registerTextDocumentContentProvider(this.extensionId, scheme, provider);
      },
      registerFileSystemProvider: (scheme: string, provider: ProviderLike, options?: Record<string, unknown>) => {
        return this.host.registerFileSystemProvider(this.extensionId, scheme, provider, options);
      },
    };
    
    this.languages = {
      registerCompletionItemProvider: (selector: DocumentSelector, provider: ProviderLike, ...triggerCharacters: string[]) => {
        return this.host.registerCompletionProvider(this.extensionId, selector, provider, triggerCharacters);
      },
      registerHoverProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerHoverProvider(this.extensionId, selector, provider);
      },
      registerDefinitionProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerDefinitionProvider(this.extensionId, selector, provider);
      },
      registerReferenceProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerReferenceProvider(this.extensionId, selector, provider);
      },
      registerDocumentSymbolProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerDocumentSymbolProvider(this.extensionId, selector, provider);
      },
      registerCodeActionsProvider: (selector: DocumentSelector, provider: ProviderLike, metadata?: Record<string, unknown>) => {
        return this.host.registerCodeActionsProvider(this.extensionId, selector, provider, metadata);
      },
      registerCodeLensProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerCodeLensProvider(this.extensionId, selector, provider);
      },
      registerDocumentFormattingEditProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerDocumentFormattingProvider(this.extensionId, selector, provider);
      },
      registerDocumentRangeFormattingEditProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerDocumentRangeFormattingProvider(this.extensionId, selector, provider);
      },
      registerSignatureHelpProvider: (selector: DocumentSelector, provider: ProviderLike, ...triggerCharacters: string[]) => {
        return this.host.registerSignatureHelpProvider(this.extensionId, selector, provider, triggerCharacters);
      },
      registerRenameProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerRenameProvider(this.extensionId, selector, provider);
      },
      registerDocumentLinkProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerDocumentLinkProvider(this.extensionId, selector, provider);
      },
      registerColorProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerColorProvider(this.extensionId, selector, provider);
      },
      registerFoldingRangeProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerFoldingRangeProvider(this.extensionId, selector, provider);
      },
      registerDeclarationProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerDeclarationProvider(this.extensionId, selector, provider);
      },
      registerTypeDefinitionProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerTypeDefinitionProvider(this.extensionId, selector, provider);
      },
      registerImplementationProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerImplementationProvider(this.extensionId, selector, provider);
      },
      setLanguageConfiguration: (language: string, configuration: Record<string, unknown>) => {
        return this.host.setLanguageConfiguration(this.extensionId, language, configuration);
      },
      createDiagnosticCollection: (name?: string) => {
        return this.host.createDiagnosticCollection(this.extensionId, name);
      },
      getDiagnostics: (uri?: UriLike) => {
        return this.host.getDiagnostics(uri);
      },
      registerInlayHintsProvider: (selector: DocumentSelector, provider: ProviderLike) => {
        return this.host.registerInlayHintsProvider(this.extensionId, selector, provider);
      },
    };
    
    this.debug = {
      registerDebugConfigurationProvider: (debugType: string, provider: ProviderLike) => {
        return this.host.registerDebugConfigurationProvider(this.extensionId, debugType, provider);
      },
      registerDebugAdapterDescriptorFactory: (debugType: string, factory: ProviderLike) => {
        return this.host.registerDebugAdapterDescriptorFactory(this.extensionId, debugType, factory);
      },
      startDebugging: (folder: WorkspaceFolder | undefined, nameOrConfiguration: DebugConfiguration, parentSession?: DebugSession) => {
        return this.host.startDebugging(folder, nameOrConfiguration, parentSession);
      },
      stopDebugging: (session?: DebugSession) => {
        return this.host.stopDebugging(session);
      },
      get activeDebugSession() { return host.getActiveDebugSession(); },
      get activeDebugConsole() { return host.getActiveDebugConsole(); },
      get breakpoints() { return host.getBreakpoints(); },
      onDidStartDebugSession: (listener: EventListener) => {
        return this.host.onEvent('debugSessionStarted', listener);
      },
      onDidTerminateDebugSession: (listener: EventListener) => {
        return this.host.onEvent('debugSessionTerminated', listener);
      },
      onDidChangeActiveDebugSession: (listener: EventListener) => {
        return this.host.onEvent('activeDebugSessionChanged', listener);
      },
      onDidChangeBreakpoints: (listener: EventListener) => {
        return this.host.onEvent('breakpointsChanged', listener);
      },
    };
    
    this.tasks = {
      registerTaskProvider: (type: string, provider: ProviderLike) => {
        return this.host.registerTaskProvider(this.extensionId, type, provider);
      },
      fetchTasks: (filter?: TaskFilter) => {
        return this.host.fetchTasks(filter);
      },
      executeTask: (task: TaskLike) => {
        return this.host.executeTask(task);
      },
      get taskExecutions() { return host.getTaskExecutions(); },
      onDidStartTask: (listener: EventListener) => {
        return this.host.onEvent('taskStarted', listener);
      },
      onDidEndTask: (listener: EventListener) => {
        return this.host.onEvent('taskEnded', listener);
      },
    };
    
    this.extensions = {
      getExtension: (extensionId: string) => {
        return this.host.getExtension(extensionId);
      },
      get all() { return host.getAllExtensions(); },
      onDidChange: (listener: EventListener) => {
        return this.host.onEvent('extensionsChanged', listener);
      },
    };
    
    this.env = {
      appName: 'Aethel Engine',
      get appRoot() { return host.getAppRoot(); },
      get language() { return host.getLanguage(); },
      get clipboard() { return host.getClipboard(); },
      get machineId() { return host.getMachineId(); },
      get sessionId() { return host.getSessionId(); },
      get shell() { return host.getShell(); },
      uiKind: 1, // Desktop
      remoteName: undefined,
      isNewAppInstall: false,
      isTelemetryEnabled: false,
      onDidChangeTelemetryEnabled: (listener: EventListener) => {
        return this.host.onEvent('telemetryEnabledChanged', listener);
      },
      openExternal: (target: UriLike | string) => {
        return this.host.openExternal(target);
      },
      asExternalUri: (target: UriLike | string) => {
        return this.host.asExternalUri(target);
      },
    };
    
    this.Uri = {
      file: (p: string) => ({ scheme: 'file', path: p, toString: () => `file://${p}` }),
      parse: (value: string) => {
        const match = value.match(/^(\w+):\/\/(.*)$/);
        if (match) {
          return { scheme: match[1], path: match[2], toString: () => value };
        }
        return { scheme: 'file', path: value, toString: () => value };
      },
      joinPath: (base: UriLike, ...pathSegments: string[]) => {
        const newPath = path.join(base.path, ...pathSegments);
        return { ...base, path: newPath, toString: () => `${base.scheme}://${newPath}` };
      },
    };
    
    this.Position = RuntimePosition;
    this.Range = RuntimeRange;
    this.Selection = RuntimeSelection;
    
    this.DiagnosticSeverity = {
      Error: 0,
      Warning: 1,
      Information: 2,
      Hint: 3,
    };
    
    this.CompletionItemKind = {
      Text: 0, Method: 1, Function: 2, Constructor: 3, Field: 4,
      Variable: 5, Class: 6, Interface: 7, Module: 8, Property: 9,
      Unit: 10, Value: 11, Enum: 12, Keyword: 13, Snippet: 14,
      Color: 15, File: 16, Reference: 17, Folder: 18, EnumMember: 19,
      Constant: 20, Struct: 21, Event: 22, Operator: 23, TypeParameter: 24,
    };
    
    this.SymbolKind = {
      File: 0, Module: 1, Namespace: 2, Package: 3, Class: 4,
      Method: 5, Property: 6, Field: 7, Constructor: 8, Enum: 9,
      Interface: 10, Function: 11, Variable: 12, Constant: 13, String: 14,
      Number: 15, Boolean: 16, Array: 17, Object: 18, Key: 19,
      Null: 20, EnumMember: 21, Struct: 22, Event: 23, Operator: 24, TypeParameter: 25,
    };
    
    this.TreeItemCollapsibleState = {
      None: 0,
      Collapsed: 1,
      Expanded: 2,
    };
    
    this.StatusBarAlignment = {
      Left: 1,
      Right: 2,
    };
    
    this.ViewColumn = {
      Active: -1,
      Beside: -2,
      One: 1,
      Two: 2,
      Three: 3,
    };
  }
}

// ============================================================================
// Extension Host Runtime
// ============================================================================

export class ExtensionHostRuntime extends EventEmitter {
  private extensions: Map<string, Extension> = new Map();
  private commands: Map<string, { extensionId: string; callback: ExtensionCallback }> = new Map();
  private providers: Map<string, unknown[]> = new Map();
  private disposables: Map<string, (() => void)[]> = new Map();
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }> = new Map();
  private requestId: number = 0;
  
  // Workspace state
  private workspaceFolders: WorkspaceFolder[] = [];
  private workspaceName: string = '';
  private configuration: Map<string, unknown> = new Map();
  
  constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  // ==========================================================================
  // Extension Management
  // ==========================================================================
  
  async loadExtension(extensionPath: string): Promise<Extension> {
    const manifestPath = path.join(extensionPath, 'package.json');
    
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Extension manifest not found: ${manifestPath}`);
    }
    
    const manifest: ExtensionManifest = JSON.parse(
      fs.readFileSync(manifestPath, 'utf-8')
    );
    
    const id = `${manifest.publisher}.${manifest.name}`;
    
    if (this.extensions.has(id)) {
      return this.extensions.get(id)!;
    }
    
    const extension: Extension = {
      id,
      manifest,
      extensionPath,
      isActive: false,
    };
    
    this.extensions.set(id, extension);
    this.disposables.set(id, []);
    
    // Process contributions
    if (manifest.contributes) {
      this.processContributions(extension);
    }
    
    this.emit('extensionLoaded', extension);
    
    return extension;
  }
  
  async activateExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension) {
      throw new Error(`Extension not found: ${extensionId}`);
    }
    
    if (extension.isActive) {
      return;
    }
    
    const mainPath = extension.manifest.main || extension.manifest.browser;
    if (!mainPath) {
      extension.isActive = true;
      return;
    }
    
    const fullPath = path.join(extension.extensionPath, mainPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Extension main file not found: ${fullPath}`);
    }
    
    // Create extension context
    const context = this.createExtensionContext(extension);
    
    // Create API instance
    const api = new ExtensionAPI(this, extensionId);
    
    // Load and execute extension
    try {
      const code = fs.readFileSync(fullPath, 'utf-8');
      
      // Create sandbox
      const sandbox = {
        exports: {},
        module: { exports: {} },
        require: this.createRequire(extension.extensionPath),
        console,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        setImmediate,
        clearImmediate,
        Buffer,
        process: {
          env: process.env,
          platform: process.platform,
          arch: process.arch,
          version: process.version,
          cwd: () => extension.extensionPath,
        },
        vscode: api,
        aethel: api,
      };
      
      const script = new vm.Script(code, { filename: fullPath });
      const vmContext = vm.createContext(sandbox);
      script.runInContext(vmContext);
      
      // Get exports (cast needed for dynamic module)
      type ExtModule = { activate?: (ctx: ExtensionContext) => unknown | Promise<unknown>; deactivate?: () => void | Promise<void> };
      const extensionModule = (sandbox.module.exports || sandbox.exports) as ExtModule;
      
      // Call activate
      if (extensionModule.activate && typeof extensionModule.activate === 'function') {
        extension.exports = await extensionModule.activate(context);
      }
      
      extension.isActive = true;
      this.emit('extensionActivated', extension);
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit('extensionError', { extensionId, error: message });
      throw error;
    }
  }
  
  async deactivateExtension(extensionId: string): Promise<void> {
    const extension = this.extensions.get(extensionId);
    if (!extension || !extension.isActive) {
      return;
    }
    
    // Dispose all subscriptions
    const disposables = this.disposables.get(extensionId) || [];
    for (const dispose of disposables) {
      try {
        dispose();
      } catch (error) {
        logger.error(`Error disposing ${extensionId}:`, error);
      }
    }
    this.disposables.set(extensionId, []);
    
    // Remove commands
    for (const [cmd, info] of this.commands) {
      if (info.extensionId === extensionId) {
        this.commands.delete(cmd);
      }
    }
    
    extension.isActive = false;
    this.emit('extensionDeactivated', extension);
  }
  
  async unloadExtension(extensionId: string): Promise<void> {
    await this.deactivateExtension(extensionId);
    this.extensions.delete(extensionId);
    this.disposables.delete(extensionId);
    this.emit('extensionUnloaded', extensionId);
  }
  
  // ==========================================================================
  // Contributions Processing
  // ==========================================================================
  
  private processContributions(extension: Extension): void {
    const contrib = extension.manifest.contributes;
    if (!contrib) return;
    
    // Commands
    if (contrib.commands) {
      for (const cmd of contrib.commands) {
        this.emit('commandContributed', {
          extensionId: extension.id,
          command: cmd,
        });
      }
    }
    
    // Keybindings
    if (contrib.keybindings) {
      for (const kb of contrib.keybindings) {
        this.emit('keybindingContributed', {
          extensionId: extension.id,
          keybinding: kb,
        });
      }
    }
    
    // Configuration
    if (contrib.configuration) {
      this.emit('configurationContributed', {
        extensionId: extension.id,
        configuration: contrib.configuration,
      });
    }
    
    // Themes
    if (contrib.themes) {
      for (const theme of contrib.themes) {
        this.emit('themeContributed', {
          extensionId: extension.id,
          theme: {
            ...theme,
            path: path.join(extension.extensionPath, theme.path),
          },
        });
      }
    }
    
    // Languages
    if (contrib.languages) {
      for (const lang of contrib.languages) {
        this.emit('languageContributed', {
          extensionId: extension.id,
          language: lang,
        });
      }
    }
    
    // Grammars
    if (contrib.grammars) {
      for (const grammar of contrib.grammars) {
        this.emit('grammarContributed', {
          extensionId: extension.id,
          grammar: {
            ...grammar,
            path: path.join(extension.extensionPath, grammar.path),
          },
        });
      }
    }
    
    // Snippets
    if (contrib.snippets) {
      for (const snippet of contrib.snippets) {
        this.emit('snippetContributed', {
          extensionId: extension.id,
          snippet: {
            ...snippet,
            path: path.join(extension.extensionPath, snippet.path),
          },
        });
      }
    }
    
    // Views
    if (contrib.views) {
      for (const [containerId, views] of Object.entries(contrib.views)) {
        for (const view of views) {
          this.emit('viewContributed', {
            extensionId: extension.id,
            containerId,
            view,
          });
        }
      }
    }
    
    // View Containers
    if (contrib.viewsContainers) {
      for (const [location, containers] of Object.entries(contrib.viewsContainers)) {
        for (const container of containers) {
          this.emit('viewContainerContributed', {
            extensionId: extension.id,
            location,
            container: {
              ...container,
              icon: path.join(extension.extensionPath, container.icon),
            },
          });
        }
      }
    }
    
    // Debuggers
    if (contrib.debuggers) {
      for (const dbg of contrib.debuggers) {
        this.emit('debuggerContributed', {
          extensionId: extension.id,
          debugger: dbg,
        });
      }
    }
  }
  
  // ==========================================================================
  // Context Creation
  // ==========================================================================
  
  private createExtensionContext(extension: Extension): ExtensionContext {
    const globalStoragePath = path.join(process.env.HOME || '', '.aethel', 'extensions', extension.id, 'global');
    const workspaceStoragePath = path.join(process.env.HOME || '', '.aethel', 'extensions', extension.id, 'workspace');
    const logPath = path.join(process.env.HOME || '', '.aethel', 'logs', extension.id);
    
    // Ensure directories exist
    [globalStoragePath, workspaceStoragePath, logPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    const globalState = new Map<string, unknown>();
    const workspaceState = new Map<string, unknown>();
    const secrets = new Map<string, string>();
    
    return {
      extensionPath: extension.extensionPath,
      extensionUri: `file://${extension.extensionPath}`,
      globalStoragePath,
      workspaceStoragePath,
      logPath,
      subscriptions: [],
      globalState: {
        get: <T>(key: string, defaultValue?: T) => (globalState.get(key) as T | undefined) ?? defaultValue,
        update: async (key: string, value: unknown) => { globalState.set(key, value); },
        keys: () => Array.from(globalState.keys()),
      },
      workspaceState: {
        get: <T>(key: string, defaultValue?: T) => (workspaceState.get(key) as T | undefined) ?? defaultValue,
        update: async (key: string, value: unknown) => { workspaceState.set(key, value); },
        keys: () => Array.from(workspaceState.keys()),
      },
      secrets: {
        get: async (key: string) => secrets.get(key),
        store: async (key: string, value: string) => { secrets.set(key, value); },
        delete: async (key: string) => { secrets.delete(key); },
      },
      asAbsolutePath: (relativePath: string) => path.join(extension.extensionPath, relativePath),
    };
  }
  
  private createRequire(basePath: string): (id: string) => unknown {
    return (id: string) => {
      // Handle relative paths
      if (id.startsWith('.')) {
        return nativeRequire(path.join(basePath, id)) as unknown;
      }

      return nativeRequire(id) as unknown;
    };
  }
  
  // ==========================================================================
  // API Implementation Stubs (to be connected to main process)
  // ==========================================================================
  
  registerCommand(extensionId: string, command: string, callback: ExtensionCallback): Disposable {
    this.commands.set(command, { extensionId, callback });
    return { dispose: () => this.commands.delete(command) };
  }
  
  async executeCommand<T = unknown>(command: string, ...args: unknown[]): Promise<T> {
    const cmd = this.commands.get(command);
    if (cmd) {
      return (await cmd.callback(...args)) as T;
    }
    throw new Error(`Command not found: ${command}`);
  }
  
  async getCommands(filterInternal?: boolean): Promise<string[]> {
    return Array.from(this.commands.keys());
  }
  
  // Message proxies (implement in main thread)
  showMessage(type: string, message: string, items: string[]): Promise<string | undefined> {
    this.emit('showMessage', { type, message, items });
    return Promise.resolve(undefined);
  }
  
  showQuickPick(items: readonly unknown[], options?: QuickPickOptions): Promise<unknown> {
    this.emit('showQuickPick', { items, options });
    return Promise.resolve(undefined);
  }
  
  showInputBox(options?: InputBoxOptions): Promise<string | undefined> {
    this.emit('showInputBox', { options });
    return Promise.resolve(undefined);
  }
  
  createOutputChannel(extensionId: string, name: string): OutputChannel {
    const channel = {
      name,
      append: (value: string) => this.emit('outputAppend', { name, value }),
      appendLine: (value: string) => this.emit('outputAppendLine', { name, value }),
      clear: () => this.emit('outputClear', { name }),
      show: () => this.emit('outputShow', { name }),
      hide: () => this.emit('outputHide', { name }),
      dispose: () => this.emit('outputDispose', { name }),
    };
    this.emit('outputChannelCreated', { extensionId, name });
    return channel;
  }
  
  createTerminal(extensionId: string, options?: TerminalOptions): Terminal {
    this.emit('terminalCreate', { extensionId, options });
    return {
      name: options?.name || 'Extension Terminal',
      processId: Promise.resolve(0),
      sendText: (text: string) => this.emit('terminalSendText', { text }),
      show: () => this.emit('terminalShow', {}),
      hide: () => this.emit('terminalHide', {}),
      dispose: () => this.emit('terminalDispose', {}),
    };
  }
  
  createWebviewPanel(extensionId: string, viewType: string, title: string, showOptions: ViewShowOptions, options?: WebviewPanelOptions): WebviewPanel {
    this.emit('webviewPanelCreate', { extensionId, viewType, title, showOptions, options });
    return {
      viewType,
      title,
      webview: {
        html: '',
        onDidReceiveMessage: (listener: EventListener) => ({ dispose: () => {} }),
        postMessage: (_message: unknown) => Promise.resolve(true),
        asWebviewUri: (uri: UriLike) => uri,
      },
      visible: true,
      active: true,
      dispose: () => this.emit('webviewPanelDispose', { viewType }),
      reveal: () => this.emit('webviewPanelReveal', { viewType }),
      onDidChangeViewState: (listener: EventListener) => ({ dispose: () => {} }),
      onDidDispose: (listener: EventListener) => ({ dispose: () => {} }),
    };
  }
  
  createStatusBarItem(extensionId: string, alignment?: number, priority?: number): StatusBarItem {
    const id = `statusbar_${Date.now()}`;
    return {
      id,
      alignment: alignment || 1,
      priority: priority || 0,
      text: '',
      tooltip: '',
      color: undefined,
      backgroundColor: undefined,
      command: undefined,
      show: () => this.emit('statusBarShow', { id }),
      hide: () => this.emit('statusBarHide', { id }),
      dispose: () => this.emit('statusBarDispose', { id }),
    };
  }
  
  setStatusBarMessage(text: string, hideAfterTimeout?: number): { dispose: () => void } {
    this.emit('statusBarMessage', { text, hideAfterTimeout });
    return { dispose: () => {} };
  }
  
  async withProgress<R>(extensionId: string, options: ProgressOptions, task: ProgressTask<R>): Promise<R> {
    this.emit('progressStart', { extensionId, options });
    return task({
      report: (value: ProgressReport) => this.emit('progressReport', { value }),
    });
  }
  
  // Stubs for remaining methods
  registerTreeDataProvider(extensionId: string, viewId: string, provider: ProviderLike) { return { dispose: () => {} }; }
  createTreeView(extensionId: string, viewId: string, options: Record<string, unknown>) { return { dispose: () => {} }; }
  onEvent(event: string, listener: EventListener) { this.on(event, listener); return { dispose: () => this.off(event, listener) }; }
  getWorkspaceFolders() { return this.workspaceFolders; }
  getWorkspaceName() { return this.workspaceName; }
  getConfiguration(section?: string, _scope?: unknown): ConfigurationReader { return { get: (key: string) => this.configuration.get(`${section}.${key}`) }; }
  findFiles(include: string, exclude?: string, maxResults?: number) { return Promise.resolve([]); }
  openTextDocument(uri: UriLike) { return Promise.resolve({}); }
  applyEdit(_edit: WorkspaceEdit): Promise<boolean> { return Promise.resolve(true); }
  createFileSystemWatcher(extensionId: string, pattern: string, ...args: unknown[]) { return { dispose: () => {} }; }
  registerTextDocumentContentProvider(extensionId: string, scheme: string, provider: ProviderLike) { return { dispose: () => {} }; }
  registerFileSystemProvider(extensionId: string, scheme: string, provider: ProviderLike, options?: Record<string, unknown>) { return { dispose: () => {} }; }
  registerCompletionProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike, triggers: string[]) { return { dispose: () => {} }; }
  registerHoverProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerDefinitionProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerReferenceProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerDocumentSymbolProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerCodeActionsProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike, metadata?: Record<string, unknown>) { return { dispose: () => {} }; }
  registerCodeLensProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerDocumentFormattingProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerDocumentRangeFormattingProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerSignatureHelpProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike, triggers: string[]) { return { dispose: () => {} }; }
  registerRenameProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerDocumentLinkProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerColorProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerFoldingRangeProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerDeclarationProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerTypeDefinitionProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerImplementationProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  setLanguageConfiguration(extensionId: string, language: string, configuration: Record<string, unknown>) { return { dispose: () => {} }; }
  createDiagnosticCollection(extensionId: string, name?: string) { return { dispose: () => {}, set: () => {}, delete: () => {}, clear: () => {} }; }
  getDiagnostics(uri?: UriLike) { return []; }
  registerInlayHintsProvider(extensionId: string, selector: DocumentSelector, provider: ProviderLike) { return { dispose: () => {} }; }
  registerDebugConfigurationProvider(extensionId: string, debugType: string, provider: ProviderLike) { return { dispose: () => {} }; }
  registerDebugAdapterDescriptorFactory(extensionId: string, debugType: string, factory: ProviderLike) { return { dispose: () => {} }; }
  startDebugging(folder: WorkspaceFolder | undefined, config: DebugConfiguration, parent?: DebugSession) { return Promise.resolve(true); }
  stopDebugging(session?: DebugSession) { return Promise.resolve(); }
  getActiveDebugSession() { return undefined; }
  getActiveDebugConsole() { return { append: () => {}, appendLine: () => {} }; }
  getBreakpoints() { return []; }
  registerTaskProvider(extensionId: string, type: string, provider: ProviderLike) { return { dispose: () => {} }; }
  fetchTasks(filter?: TaskFilter) { return Promise.resolve([]); }
  executeTask(task: TaskLike) { return Promise.resolve({ terminate: () => {} }); }
  getTaskExecutions() { return []; }
  getExtension(extensionId: string) { return this.extensions.get(extensionId); }
  getAllExtensions() { return Array.from(this.extensions.values()); }
  getAppRoot() { return process.cwd(); }
  getLanguage() { return 'en'; }
  getClipboard() { return { readText: () => Promise.resolve(''), writeText: () => Promise.resolve() }; }
  getMachineId() { return 'aethel-machine'; }
  getSessionId() { return `session_${Date.now()}`; }
  getShell() { return process.env.SHELL || 'bash'; }
  openExternal(target: UriLike | string) { return Promise.resolve(true); }
  asExternalUri(target: UriLike | string) { return Promise.resolve(target); }
  
  // ==========================================================================
  // Cleanup
  // ==========================================================================
  
  async dispose(): Promise<void> {
    // Deactivate all extensions
    for (const extensionId of this.extensions.keys()) {
      await this.deactivateExtension(extensionId);
    }
    
    this.extensions.clear();
    this.commands.clear();
    this.providers.clear();
    this.disposables.clear();
    
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    this.removeAllListeners();
  }
}

// ============================================================================
// Singleton
// ============================================================================

let extensionHostInstance: ExtensionHostRuntime | null = null;

export function getExtensionHost(): ExtensionHostRuntime {
  if (!extensionHostInstance) {
    extensionHostInstance = new ExtensionHostRuntime();
  }
  return extensionHostInstance;
}

export function destroyExtensionHost(): void {
  if (extensionHostInstance) {
    extensionHostInstance.dispose();
    extensionHostInstance = null;
  }
}

export default ExtensionHostRuntime;
