import { logger } from '@/lib/observability/logger';
// Extension host runtime with worker isolation and sandboxed extension execution.

import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';
import { ExtensionAPI } from './extension-host/api';
import { emitExtensionContributions } from './extension-host-runtime-contributions';
import { createExtensionContext } from './extension-host-runtime-context';
import { executeExtensionModule } from './extension-host-runtime-loader';
import type {
  ConfigurationReader,
  Disposable,
  DebugConfiguration,
  DebugSession,
  DocumentSelector,
  EventListener,
  Extension,
  ExtensionCallback,
  ExtensionManifest,
  InputBoxOptions,
  OutputChannel,
  ProgressOptions,
  ProgressReport,
  ProgressTask,
  ProviderLike,
  QuickPickOptions,
  StatusBarItem,
  TaskFilter,
  TaskLike,
  Terminal,
  TerminalOptions,
  UriLike,
  ViewShowOptions,
  WebviewPanel,
  WebviewPanelOptions,
  WorkspaceEdit,
  WorkspaceFolder,
} from './extension-host/types';

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
  ExtensionContributes,
  ExtensionContext,
  ExtensionManifest,
} from './extension-host/types';

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
      emitExtensionContributions(this, extension);
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
    const context = createExtensionContext(extension);
    
    // Create API instance
    const api = new ExtensionAPI(this, extensionId);
    
    // Load and execute extension
    try {
      const code = fs.readFileSync(fullPath, 'utf-8');
      const extensionModule = await executeExtensionModule({
        code,
        filename: fullPath,
        extensionPath: extension.extensionPath,
        api,
      });
      
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
