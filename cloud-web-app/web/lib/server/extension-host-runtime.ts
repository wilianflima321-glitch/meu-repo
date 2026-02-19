/**
 * Aethel Engine - Extension Host Runtime
 * 
 * Runtime para execução de extensões em processo isolado.
 * Baseado na arquitetura do VS Code Extension Host.
 * 
 * Features:
 * - Worker thread isolation
 * - Extension API sandboxing
 * - IPC messaging
 * - Extension lifecycle management
 * - Activation events
 * - Contribution points
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import * as vm from 'vm';

// ============================================================================
// Types
// ============================================================================

import type {
  ConfigurationProperty,
  ContributedBreakpoint,
  ContributedCommand,
  ContributedConfiguration,
  ContributedCustomEditor,
  ContributedDebugger,
  ContributedGrammar,
  ContributedIconTheme,
  ContributedKeybinding,
  ContributedLanguage,
  ContributedMenu,
  ContributedSnippet,
  ContributedTaskDefinition,
  ContributedTheme,
  ContributedView,
  ContributedViewContainer,
  ContributedWebviewPanel,
  Extension,
  ExtensionContext,
  ExtensionContributes,
  ExtensionHostMessage,
  ExtensionManifest
} from './extension-host-types'

export type {
  ConfigurationProperty,
  ContributedBreakpoint,
  ContributedCommand,
  ContributedConfiguration,
  ContributedCustomEditor,
  ContributedDebugger,
  ContributedGrammar,
  ContributedIconTheme,
  ContributedKeybinding,
  ContributedLanguage,
  ContributedMenu,
  ContributedSnippet,
  ContributedTaskDefinition,
  ContributedTheme,
  ContributedView,
  ContributedViewContainer,
  ContributedWebviewPanel,
  Extension,
  ExtensionContext,
  ExtensionContributes,
  ExtensionHostMessage,
  ExtensionManifest
} from './extension-host-types'

// ============================================================================
// Extension API (Sandbox)
// ============================================================================

class ExtensionAPI {
  private host: ExtensionHostRuntime;
  private extensionId: string;
  
  // Declare all API namespaces
  commands: any;
  window: any;
  workspace: any;
  languages: any;
  debug: any;
  tasks: any;
  extensions: any;
  env: any;
  Uri: any;
  Position: any;
  Range: any;
  Selection: any;
  DiagnosticSeverity: any;
  CompletionItemKind: any;
  SymbolKind: any;
  TreeItemCollapsibleState: any;
  StatusBarAlignment: any;
  ViewColumn: any;
  
  constructor(host: ExtensionHostRuntime, extensionId: string) {
    this.host = host;
    this.extensionId = extensionId;
    
    // Initialize all API namespaces in constructor
    this.commands = {
      registerCommand: (command: string, callback: (...args: any[]) => any) => {
        return this.host.registerCommand(this.extensionId, command, callback);
      },
      executeCommand: <T>(command: string, ...args: any[]): Promise<T> => {
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
      showQuickPick: (items: any[], options?: any) => {
        return this.host.showQuickPick(items, options);
      },
      showInputBox: (options?: any) => {
        return this.host.showInputBox(options);
      },
      createOutputChannel: (name: string) => {
        return this.host.createOutputChannel(this.extensionId, name);
      },
      createTerminal: (options?: any) => {
        return this.host.createTerminal(this.extensionId, options);
      },
      createWebviewPanel: (viewType: string, title: string, showOptions: any, options?: any) => {
        return this.host.createWebviewPanel(this.extensionId, viewType, title, showOptions, options);
      },
      createStatusBarItem: (alignment?: number, priority?: number) => {
        return this.host.createStatusBarItem(this.extensionId, alignment, priority);
      },
      setStatusBarMessage: (text: string, hideAfterTimeout?: number) => {
        return this.host.setStatusBarMessage(text, hideAfterTimeout);
      },
      withProgress: (options: any, task: any) => {
        return this.host.withProgress(this.extensionId, options, task);
      },
      registerTreeDataProvider: (viewId: string, provider: any) => {
        return this.host.registerTreeDataProvider(this.extensionId, viewId, provider);
      },
      createTreeView: (viewId: string, options: any) => {
        return this.host.createTreeView(this.extensionId, viewId, options);
      },
      onDidChangeActiveTextEditor: (listener: any) => {
        return this.host.onEvent('activeTextEditorChanged', listener);
      },
      onDidChangeTextEditorSelection: (listener: any) => {
        return this.host.onEvent('textEditorSelectionChanged', listener);
      },
    };
    
    this.workspace = {
      get workspaceFolders() { return host.getWorkspaceFolders(); },
      get name() { return host.getWorkspaceName(); },
      getConfiguration: (section?: string, scope?: any) => {
        return this.host.getConfiguration(section, scope);
      },
      onDidChangeConfiguration: (listener: any) => {
        return this.host.onEvent('configurationChanged', listener);
      },
      findFiles: (include: string, exclude?: string, maxResults?: number) => {
        return this.host.findFiles(include, exclude, maxResults);
      },
      openTextDocument: (uri: any) => {
        return this.host.openTextDocument(uri);
      },
      applyEdit: (edit: any) => {
        return this.host.applyEdit(edit);
      },
      createFileSystemWatcher: (globPattern: string, ignoreCreateEvents?: boolean, ignoreChangeEvents?: boolean, ignoreDeleteEvents?: boolean) => {
        return this.host.createFileSystemWatcher(this.extensionId, globPattern, ignoreCreateEvents, ignoreChangeEvents, ignoreDeleteEvents);
      },
      onDidOpenTextDocument: (listener: any) => {
        return this.host.onEvent('textDocumentOpened', listener);
      },
      onDidCloseTextDocument: (listener: any) => {
        return this.host.onEvent('textDocumentClosed', listener);
      },
      onDidChangeTextDocument: (listener: any) => {
        return this.host.onEvent('textDocumentChanged', listener);
      },
      onDidSaveTextDocument: (listener: any) => {
        return this.host.onEvent('textDocumentSaved', listener);
      },
      registerTextDocumentContentProvider: (scheme: string, provider: any) => {
        return this.host.registerTextDocumentContentProvider(this.extensionId, scheme, provider);
      },
      registerFileSystemProvider: (scheme: string, provider: any, options?: any) => {
        return this.host.registerFileSystemProvider(this.extensionId, scheme, provider, options);
      },
    };
    
    this.languages = {
      registerCompletionItemProvider: (selector: any, provider: any, ...triggerCharacters: string[]) => {
        return this.host.registerCompletionProvider(this.extensionId, selector, provider, triggerCharacters);
      },
      registerHoverProvider: (selector: any, provider: any) => {
        return this.host.registerHoverProvider(this.extensionId, selector, provider);
      },
      registerDefinitionProvider: (selector: any, provider: any) => {
        return this.host.registerDefinitionProvider(this.extensionId, selector, provider);
      },
      registerReferenceProvider: (selector: any, provider: any) => {
        return this.host.registerReferenceProvider(this.extensionId, selector, provider);
      },
      registerDocumentSymbolProvider: (selector: any, provider: any) => {
        return this.host.registerDocumentSymbolProvider(this.extensionId, selector, provider);
      },
      registerCodeActionsProvider: (selector: any, provider: any, metadata?: any) => {
        return this.host.registerCodeActionsProvider(this.extensionId, selector, provider, metadata);
      },
      registerCodeLensProvider: (selector: any, provider: any) => {
        return this.host.registerCodeLensProvider(this.extensionId, selector, provider);
      },
      registerDocumentFormattingEditProvider: (selector: any, provider: any) => {
        return this.host.registerDocumentFormattingProvider(this.extensionId, selector, provider);
      },
      registerDocumentRangeFormattingEditProvider: (selector: any, provider: any) => {
        return this.host.registerDocumentRangeFormattingProvider(this.extensionId, selector, provider);
      },
      registerSignatureHelpProvider: (selector: any, provider: any, ...triggerCharacters: string[]) => {
        return this.host.registerSignatureHelpProvider(this.extensionId, selector, provider, triggerCharacters);
      },
      registerRenameProvider: (selector: any, provider: any) => {
        return this.host.registerRenameProvider(this.extensionId, selector, provider);
      },
      registerDocumentLinkProvider: (selector: any, provider: any) => {
        return this.host.registerDocumentLinkProvider(this.extensionId, selector, provider);
      },
      registerColorProvider: (selector: any, provider: any) => {
        return this.host.registerColorProvider(this.extensionId, selector, provider);
      },
      registerFoldingRangeProvider: (selector: any, provider: any) => {
        return this.host.registerFoldingRangeProvider(this.extensionId, selector, provider);
      },
      registerDeclarationProvider: (selector: any, provider: any) => {
        return this.host.registerDeclarationProvider(this.extensionId, selector, provider);
      },
      registerTypeDefinitionProvider: (selector: any, provider: any) => {
        return this.host.registerTypeDefinitionProvider(this.extensionId, selector, provider);
      },
      registerImplementationProvider: (selector: any, provider: any) => {
        return this.host.registerImplementationProvider(this.extensionId, selector, provider);
      },
      setLanguageConfiguration: (language: string, configuration: any) => {
        return this.host.setLanguageConfiguration(this.extensionId, language, configuration);
      },
      createDiagnosticCollection: (name?: string) => {
        return this.host.createDiagnosticCollection(this.extensionId, name);
      },
      getDiagnostics: (uri?: any) => {
        return this.host.getDiagnostics(uri);
      },
      registerInlayHintsProvider: (selector: any, provider: any) => {
        return this.host.registerInlayHintsProvider(this.extensionId, selector, provider);
      },
    };
    
    this.debug = {
      registerDebugConfigurationProvider: (debugType: string, provider: any) => {
        return this.host.registerDebugConfigurationProvider(this.extensionId, debugType, provider);
      },
      registerDebugAdapterDescriptorFactory: (debugType: string, factory: any) => {
        return this.host.registerDebugAdapterDescriptorFactory(this.extensionId, debugType, factory);
      },
      startDebugging: (folder: any, nameOrConfiguration: any, parentSession?: any) => {
        return this.host.startDebugging(folder, nameOrConfiguration, parentSession);
      },
      stopDebugging: (session?: any) => {
        return this.host.stopDebugging(session);
      },
      get activeDebugSession() { return host.getActiveDebugSession(); },
      get activeDebugConsole() { return host.getActiveDebugConsole(); },
      get breakpoints() { return host.getBreakpoints(); },
      onDidStartDebugSession: (listener: any) => {
        return this.host.onEvent('debugSessionStarted', listener);
      },
      onDidTerminateDebugSession: (listener: any) => {
        return this.host.onEvent('debugSessionTerminated', listener);
      },
      onDidChangeActiveDebugSession: (listener: any) => {
        return this.host.onEvent('activeDebugSessionChanged', listener);
      },
      onDidChangeBreakpoints: (listener: any) => {
        return this.host.onEvent('breakpointsChanged', listener);
      },
    };
    
    this.tasks = {
      registerTaskProvider: (type: string, provider: any) => {
        return this.host.registerTaskProvider(this.extensionId, type, provider);
      },
      fetchTasks: (filter?: any) => {
        return this.host.fetchTasks(filter);
      },
      executeTask: (task: any) => {
        return this.host.executeTask(task);
      },
      get taskExecutions() { return host.getTaskExecutions(); },
      onDidStartTask: (listener: any) => {
        return this.host.onEvent('taskStarted', listener);
      },
      onDidEndTask: (listener: any) => {
        return this.host.onEvent('taskEnded', listener);
      },
    };
    
    this.extensions = {
      getExtension: (extensionId: string) => {
        return this.host.getExtension(extensionId);
      },
      get all() { return host.getAllExtensions(); },
      onDidChange: (listener: any) => {
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
      onDidChangeTelemetryEnabled: (listener: any) => {
        return this.host.onEvent('telemetryEnabledChanged', listener);
      },
      openExternal: (target: any) => {
        return this.host.openExternal(target);
      },
      asExternalUri: (target: any) => {
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
      joinPath: (base: any, ...pathSegments: string[]) => {
        const newPath = path.join(base.path, ...pathSegments);
        return { ...base, path: newPath, toString: () => `${base.scheme}://${newPath}` };
      },
    };
    
    this.Position = class {
      constructor(public line: number, public character: number) {}
      isEqual(other: any) { return this.line === other.line && this.character === other.character; }
      isBefore(other: any) { return this.line < other.line || (this.line === other.line && this.character < other.character); }
      isAfter(other: any) { return this.line > other.line || (this.line === other.line && this.character > other.character); }
      translate(lineDelta?: number, characterDelta?: number) { return new (this.constructor as any)(this.line + (lineDelta || 0), this.character + (characterDelta || 0)); }
    };
    
    this.Range = class {
      public start: any;
      public end: any;
      constructor(start: any, end: any) {
        this.start = start;
        this.end = end;
      }
      static fromPositions(start: any, end: any) { return new this(start, end); }
      get isEmpty() { return this.start.isEqual(this.end); }
      get isSingleLine() { return this.start.line === this.end.line; }
      contains(positionOrRange: any) {
        if (positionOrRange.start) {
          return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
        }
        return !positionOrRange.isBefore(this.start) && !positionOrRange.isAfter(this.end);
      }
    };
    
    this.Selection = class {
      public anchor: any;
      public active: any;
      public start: any;
      public end: any;
      constructor(anchor: any, active: any) {
        this.anchor = anchor;
        this.active = active;
        this.start = anchor;
        this.end = active;
      }
      get isReversed() { return this.anchor.isAfter(this.active); }
      get isEmpty() { return this.start.isEqual(this.end); }
      get isSingleLine() { return this.start.line === this.end.line; }
    };
    
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
  private commands: Map<string, { extensionId: string; callback: (...args: any[]) => any }> = new Map();
  private providers: Map<string, any[]> = new Map();
  private disposables: Map<string, (() => void)[]> = new Map();
  private worker: Worker | null = null;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private requestId: number = 0;
  
  // Workspace state
  private workspaceFolders: any[] = [];
  private workspaceName: string = '';
  private configuration: Map<string, any> = new Map();
  
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
      type ExtModule = { activate?: (ctx: ExtensionContext) => Promise<any>; deactivate?: () => Promise<void> };
      const extensionModule: ExtModule = sandbox.module.exports || sandbox.exports;
      
      // Call activate
      if (extensionModule.activate && typeof extensionModule.activate === 'function') {
        extension.exports = await extensionModule.activate(context);
      }
      
      extension.isActive = true;
      this.emit('extensionActivated', extension);
      
    } catch (error: any) {
      this.emit('extensionError', { extensionId, error: error.message });
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
        console.error(`Error disposing ${extensionId}:`, error);
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
    
    const globalState = new Map<string, any>();
    const workspaceState = new Map<string, any>();
    const secrets = new Map<string, string>();
    
    return {
      extensionPath: extension.extensionPath,
      extensionUri: `file://${extension.extensionPath}`,
      globalStoragePath,
      workspaceStoragePath,
      logPath,
      subscriptions: [],
      globalState: {
        get: <T>(key: string, defaultValue?: T) => globalState.get(key) ?? defaultValue,
        update: async (key: string, value: any) => { globalState.set(key, value); },
        keys: () => Array.from(globalState.keys()),
      },
      workspaceState: {
        get: <T>(key: string, defaultValue?: T) => workspaceState.get(key) ?? defaultValue,
        update: async (key: string, value: any) => { workspaceState.set(key, value); },
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
  
  private createRequire(basePath: string): (id: string) => any {
    return (id: string) => {
      // Handle built-in modules
      if (['path', 'fs', 'os', 'crypto', 'util', 'events', 'stream', 'buffer'].includes(id)) {
        return require(id);
      }
      
      // Handle relative paths
      if (id.startsWith('.')) {
        return require(path.join(basePath, id));
      }
      
      // Handle node_modules
      const nodeModulesPath = path.join(basePath, 'node_modules', id);
      if (fs.existsSync(nodeModulesPath)) {
        return require(nodeModulesPath);
      }
      
      // Fallback to global require
      return require(id);
    };
  }
  
  // ==========================================================================
  // API Implementation Stubs (to be connected to main process)
  // ==========================================================================
  
  registerCommand(extensionId: string, command: string, callback: (...args: any[]) => any) {
    this.commands.set(command, { extensionId, callback });
    return { dispose: () => this.commands.delete(command) };
  }
  
  async executeCommand(command: string, ...args: any[]): Promise<any> {
    const cmd = this.commands.get(command);
    if (cmd) {
      return await cmd.callback(...args);
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
  
  showQuickPick(items: any[], options?: any): Promise<any> {
    this.emit('showQuickPick', { items, options });
    return Promise.resolve(undefined);
  }
  
  showInputBox(options?: any): Promise<string | undefined> {
    this.emit('showInputBox', { options });
    return Promise.resolve(undefined);
  }
  
  createOutputChannel(extensionId: string, name: string): any {
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
  
  createTerminal(extensionId: string, options?: any): any {
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
  
  createWebviewPanel(extensionId: string, viewType: string, title: string, showOptions: any, options?: any): any {
    this.emit('webviewPanelCreate', { extensionId, viewType, title, showOptions, options });
    return {
      viewType,
      title,
      webview: {
        html: '',
        onDidReceiveMessage: (listener: any) => ({ dispose: () => {} }),
        postMessage: (message: any) => Promise.resolve(true),
        asWebviewUri: (uri: any) => uri,
      },
      visible: true,
      active: true,
      dispose: () => this.emit('webviewPanelDispose', { viewType }),
      reveal: () => this.emit('webviewPanelReveal', { viewType }),
      onDidChangeViewState: (listener: any) => ({ dispose: () => {} }),
      onDidDispose: (listener: any) => ({ dispose: () => {} }),
    };
  }
  
  createStatusBarItem(extensionId: string, alignment?: number, priority?: number): any {
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
  
  withProgress(extensionId: string, options: any, task: any): Promise<any> {
    this.emit('progressStart', { extensionId, options });
    return task({
      report: (value: any) => this.emit('progressReport', { value }),
    });
  }
  
  // Stubs for remaining methods
  registerTreeDataProvider(extensionId: string, viewId: string, provider: any) { return { dispose: () => {} }; }
  createTreeView(extensionId: string, viewId: string, options: any) { return { dispose: () => {} }; }
  onEvent(event: string, listener: any) { this.on(event, listener); return { dispose: () => this.off(event, listener) }; }
  getWorkspaceFolders() { return this.workspaceFolders; }
  getWorkspaceName() { return this.workspaceName; }
  getConfiguration(section?: string, scope?: any) { return { get: (key: string) => this.configuration.get(`${section}.${key}`) }; }
  findFiles(include: string, exclude?: string, maxResults?: number) { return Promise.resolve([]); }
  openTextDocument(uri: any) { return Promise.resolve({}); }
  applyEdit(edit: any) { return Promise.resolve(true); }
  createFileSystemWatcher(extensionId: string, pattern: string, ...args: any[]) { return { dispose: () => {} }; }
  registerTextDocumentContentProvider(extensionId: string, scheme: string, provider: any) { return { dispose: () => {} }; }
  registerFileSystemProvider(extensionId: string, scheme: string, provider: any, options?: any) { return { dispose: () => {} }; }
  registerCompletionProvider(extensionId: string, selector: any, provider: any, triggers: string[]) { return { dispose: () => {} }; }
  registerHoverProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerDefinitionProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerReferenceProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerDocumentSymbolProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerCodeActionsProvider(extensionId: string, selector: any, provider: any, metadata?: any) { return { dispose: () => {} }; }
  registerCodeLensProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerDocumentFormattingProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerDocumentRangeFormattingProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerSignatureHelpProvider(extensionId: string, selector: any, provider: any, triggers: string[]) { return { dispose: () => {} }; }
  registerRenameProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerDocumentLinkProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerColorProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerFoldingRangeProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerDeclarationProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerTypeDefinitionProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerImplementationProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  setLanguageConfiguration(extensionId: string, language: string, configuration: any) { return { dispose: () => {} }; }
  createDiagnosticCollection(extensionId: string, name?: string) { return { dispose: () => {}, set: () => {}, delete: () => {}, clear: () => {} }; }
  getDiagnostics(uri?: any) { return []; }
  registerInlayHintsProvider(extensionId: string, selector: any, provider: any) { return { dispose: () => {} }; }
  registerDebugConfigurationProvider(extensionId: string, debugType: string, provider: any) { return { dispose: () => {} }; }
  registerDebugAdapterDescriptorFactory(extensionId: string, debugType: string, factory: any) { return { dispose: () => {} }; }
  startDebugging(folder: any, config: any, parent?: any) { return Promise.resolve(true); }
  stopDebugging(session?: any) { return Promise.resolve(); }
  getActiveDebugSession() { return undefined; }
  getActiveDebugConsole() { return { append: () => {}, appendLine: () => {} }; }
  getBreakpoints() { return []; }
  registerTaskProvider(extensionId: string, type: string, provider: any) { return { dispose: () => {} }; }
  fetchTasks(filter?: any) { return Promise.resolve([]); }
  executeTask(task: any) { return Promise.resolve({ terminate: () => {} }); }
  getTaskExecutions() { return []; }
  getExtension(extensionId: string) { return this.extensions.get(extensionId); }
  getAllExtensions() { return Array.from(this.extensions.values()); }
  getAppRoot() { return process.cwd(); }
  getLanguage() { return 'en'; }
  getClipboard() { return { readText: () => Promise.resolve(''), writeText: () => Promise.resolve() }; }
  getMachineId() { return 'aethel-machine'; }
  getSessionId() { return `session_${Date.now()}`; }
  getShell() { return process.env.SHELL || 'bash'; }
  openExternal(target: any) { return Promise.resolve(true); }
  asExternalUri(target: any) { return Promise.resolve(target); }
  
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
