import * as path from 'path';
import type { ExtensionHostRuntime } from '../extension-host-runtime';
import { RuntimePosition, RuntimeRange, RuntimeSelection } from './types';
import type {
  ApiNamespace,
  DebugConfiguration,
  DebugSession,
  Disposable,
  DocumentSelector,
  EventListener,
  ExtensionCallback,
  InputBoxOptions,
  NumericEnum,
  ProgressOptions,
  ProgressReport,
  ProgressTask,
  ProviderLike,
  QuickPickOptions,
  TaskFilter,
  TaskLike,
  TerminalOptions,
  UriFactory,
  UriLike,
  ViewShowOptions,
  WebviewPanelOptions,
  WorkspaceEdit,
  WorkspaceFolder,
} from './types';

// Sandbox-facing VS Code-compatible API facade. Runtime orchestration stays in
// extension-host-runtime.ts; this file only maps extension API calls to host calls.

export class ExtensionAPI {
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
