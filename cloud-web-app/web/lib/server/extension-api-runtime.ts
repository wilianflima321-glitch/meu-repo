/**
 * Sandboxed extension API facade bound to ExtensionHostRuntime.
 */
import type { ExtensionHostRuntime } from './extension-host-runtime';

export class ExtensionAPI {
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

