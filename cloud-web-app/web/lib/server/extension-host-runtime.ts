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
import { ExtensionAPI } from './extension-api-runtime';

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
