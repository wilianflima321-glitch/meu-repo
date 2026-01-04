/**
 * Monaco LSP Bridge
 * 
 * Connects Monaco Editor to the LSP server via WebSocket for real-time
 * language intelligence features like autocomplete, hover, go-to-definition, etc.
 */

import * as monaco from 'monaco-editor';

// LSP Message Types
interface LspMessage {
  jsonrpc: '2.0';
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

interface TextDocumentIdentifier {
  uri: string;
}

interface TextDocumentPositionParams {
  textDocument: TextDocumentIdentifier;
  position: Position;
}

interface CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
  insertTextFormat?: number;
  textEdit?: { range: Range; newText: string };
  additionalTextEdits?: { range: Range; newText: string }[];
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
}

interface Hover {
  contents: string | { kind: string; value: string } | { language: string; value: string }[];
  range?: Range;
}

interface Location {
  uri: string;
  range: Range;
}

interface Diagnostic {
  range: Range;
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
  relatedInformation?: { location: Location; message: string }[];
}

// LSP to Monaco kind mappings
const LSP_COMPLETION_KIND_MAP: Record<number, monaco.languages.CompletionItemKind> = {
  1: monaco.languages.CompletionItemKind.Text,
  2: monaco.languages.CompletionItemKind.Method,
  3: monaco.languages.CompletionItemKind.Function,
  4: monaco.languages.CompletionItemKind.Constructor,
  5: monaco.languages.CompletionItemKind.Field,
  6: monaco.languages.CompletionItemKind.Variable,
  7: monaco.languages.CompletionItemKind.Class,
  8: monaco.languages.CompletionItemKind.Interface,
  9: monaco.languages.CompletionItemKind.Module,
  10: monaco.languages.CompletionItemKind.Property,
  11: monaco.languages.CompletionItemKind.Unit,
  12: monaco.languages.CompletionItemKind.Value,
  13: monaco.languages.CompletionItemKind.Enum,
  14: monaco.languages.CompletionItemKind.Keyword,
  15: monaco.languages.CompletionItemKind.Snippet,
  16: monaco.languages.CompletionItemKind.Color,
  17: monaco.languages.CompletionItemKind.File,
  18: monaco.languages.CompletionItemKind.Reference,
  19: monaco.languages.CompletionItemKind.Folder,
  20: monaco.languages.CompletionItemKind.EnumMember,
  21: monaco.languages.CompletionItemKind.Constant,
  22: monaco.languages.CompletionItemKind.Struct,
  23: monaco.languages.CompletionItemKind.Event,
  24: monaco.languages.CompletionItemKind.Operator,
  25: monaco.languages.CompletionItemKind.TypeParameter,
};

const LSP_SEVERITY_MAP: Record<number, monaco.MarkerSeverity> = {
  1: monaco.MarkerSeverity.Error,
  2: monaco.MarkerSeverity.Warning,
  3: monaco.MarkerSeverity.Info,
  4: monaco.MarkerSeverity.Hint,
};

/**
 * Monaco LSP Bridge - connects Monaco Editor to LSP server
 */
export class MonacoLspBridge {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private openDocuments = new Map<string, { version: number; languageId: string }>();
  private disposables: monaco.IDisposable[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private serverCapabilities: Record<string, unknown> = {};

  constructor(private wsUrl: string = 'ws://localhost:3001/lsp') {}

  /**
   * Initialize the bridge and connect to LSP server
   */
  async initialize(): Promise<void> {
    await this.connect();
    await this.initializeLsp();
    this.registerProviders();
  }

  /**
   * Connect to WebSocket server
   */
  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[LSP Bridge] Connected to LSP server');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onclose = () => {
        console.log('[LSP Bridge] Disconnected from LSP server');
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[LSP Bridge] WebSocket error:', error);
        reject(new Error('Failed to connect to LSP server'));
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };
    });
  }

  /**
   * Handle disconnection and attempt reconnect
   */
  private async handleDisconnect(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`[LSP Bridge] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(async () => {
        try {
          await this.connect();
          await this.initializeLsp();
          // Re-sync open documents
          for (const [uri, doc] of this.openDocuments) {
            await this.didOpen(uri, doc.languageId, ''); // Need to get content from Monaco
          }
        } catch (error) {
          console.error('[LSP Bridge] Reconnect failed:', error);
        }
      }, delay);
    }
  }

  /**
   * Send LSP initialize request
   */
  private async initializeLsp(): Promise<void> {
    const result = await this.sendRequest<{ capabilities: Record<string, unknown> }>('initialize', {
      processId: null,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: true,
            willSave: true,
            willSaveWaitUntil: true,
            didSave: true,
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              deprecatedSupport: true,
              preselectSupport: true,
              insertReplaceSupport: true,
            },
            contextSupport: true,
          },
          hover: {
            dynamicRegistration: true,
            contentFormat: ['markdown', 'plaintext'],
          },
          signatureHelp: {
            dynamicRegistration: true,
            signatureInformation: {
              documentationFormat: ['markdown', 'plaintext'],
              parameterInformation: { labelOffsetSupport: true },
            },
          },
          definition: { dynamicRegistration: true },
          references: { dynamicRegistration: true },
          documentHighlight: { dynamicRegistration: true },
          documentSymbol: { dynamicRegistration: true },
          codeAction: { dynamicRegistration: true },
          codeLens: { dynamicRegistration: true },
          formatting: { dynamicRegistration: true },
          rangeFormatting: { dynamicRegistration: true },
          rename: { dynamicRegistration: true, prepareSupport: true },
          publishDiagnostics: { relatedInformation: true },
        },
        workspace: {
          applyEdit: true,
          workspaceEdit: { documentChanges: true },
          didChangeConfiguration: { dynamicRegistration: true },
          workspaceFolders: true,
          symbol: { dynamicRegistration: true },
        },
      },
      rootUri: 'file:///workspace',
      workspaceFolders: [{ uri: 'file:///workspace', name: 'workspace' }],
    });

    this.serverCapabilities = result.capabilities;
    await this.sendNotification('initialized', {});
    console.log('[LSP Bridge] LSP initialized with capabilities:', this.serverCapabilities);
  }

  /**
   * Send a request to LSP server
   */
  private sendRequest<T = unknown>(method: string, params: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const id = ++this.requestId;
      const message: LspMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.ws.send(JSON.stringify(message));

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 10000);
    });
  }

  /**
   * Send a notification to LSP server
   */
  private sendNotification(method: string, params: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[LSP Bridge] Cannot send notification, not connected');
      return;
    }

    const message: LspMessage = {
      jsonrpc: '2.0',
      method,
      params,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Handle incoming LSP message
   */
  private handleMessage(message: LspMessage): void {
    // Response to a request
    if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
      return;
    }

    // Server notification
    if (message.method) {
      this.handleNotification(message.method, message.params);
    }
  }

  /**
   * Handle server notifications
   */
  private handleNotification(method: string, params: unknown): void {
    switch (method) {
      case 'textDocument/publishDiagnostics':
        this.handleDiagnostics(params as { uri: string; diagnostics: Diagnostic[] });
        break;
      case 'window/showMessage':
        console.log('[LSP Message]', params);
        break;
      case 'window/logMessage':
        console.log('[LSP Log]', params);
        break;
    }
  }

  /**
   * Handle diagnostics from LSP
   */
  private handleDiagnostics(params: { uri: string; diagnostics: Diagnostic[] }): void {
    const model = monaco.editor.getModels().find(m => m.uri.toString() === params.uri);
    if (!model) return;

    const markers: monaco.editor.IMarkerData[] = params.diagnostics.map(d => ({
      severity: LSP_SEVERITY_MAP[d.severity || 1] || monaco.MarkerSeverity.Error,
      startLineNumber: d.range.start.line + 1,
      startColumn: d.range.start.character + 1,
      endLineNumber: d.range.end.line + 1,
      endColumn: d.range.end.character + 1,
      message: d.message,
      source: d.source,
      code: d.code?.toString(),
    }));

    monaco.editor.setModelMarkers(model, 'lsp', markers);
  }

  /**
   * Register Monaco providers
   */
  private registerProviders(): void {
    // Register for common languages
    const languages = ['typescript', 'javascript', 'python', 'rust', 'go', 'cpp', 'c', 'java'];

    for (const language of languages) {
      // Completion provider
      this.disposables.push(
        monaco.languages.registerCompletionItemProvider(language, {
          triggerCharacters: ['.', ':', '<', '"', '/', '@', '#'],
          provideCompletionItems: async (model, position, context) => {
            return this.provideCompletionItems(model, position, context);
          },
        })
      );

      // Hover provider
      this.disposables.push(
        monaco.languages.registerHoverProvider(language, {
          provideHover: async (model, position) => {
            return this.provideHover(model, position);
          },
        })
      );

      // Definition provider
      this.disposables.push(
        monaco.languages.registerDefinitionProvider(language, {
          provideDefinition: async (model, position) => {
            return this.provideDefinition(model, position);
          },
        })
      );

      // References provider
      this.disposables.push(
        monaco.languages.registerReferenceProvider(language, {
          provideReferences: async (model, position, context) => {
            return this.provideReferences(model, position, context);
          },
        })
      );

      // Signature help provider
      this.disposables.push(
        monaco.languages.registerSignatureHelpProvider(language, {
          signatureHelpTriggerCharacters: ['(', ','],
          provideSignatureHelp: async (model, position) => {
            return this.provideSignatureHelp(model, position);
          },
        })
      );

      // Document formatting provider
      this.disposables.push(
        monaco.languages.registerDocumentFormattingEditProvider(language, {
          provideDocumentFormattingEdits: async (model, options) => {
            return this.provideDocumentFormatting(model, options);
          },
        })
      );

      // Rename provider
      this.disposables.push(
        monaco.languages.registerRenameProvider(language, {
          provideRenameEdits: async (model, position, newName) => {
            return this.provideRenameEdits(model, position, newName);
          },
        })
      );
    }
  }

  /**
   * Notify LSP of document open
   */
  async didOpen(uri: string, languageId: string, text: string): Promise<void> {
    const version = 1;
    this.openDocuments.set(uri, { version, languageId });
    
    this.sendNotification('textDocument/didOpen', {
      textDocument: { uri, languageId, version, text },
    });
  }

  /**
   * Notify LSP of document change
   */
  didChange(uri: string, text: string): void {
    const doc = this.openDocuments.get(uri);
    if (!doc) return;

    doc.version++;
    this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version: doc.version },
      contentChanges: [{ text }],
    });
  }

  /**
   * Notify LSP of document close
   */
  didClose(uri: string): void {
    this.openDocuments.delete(uri);
    this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    });
  }

  /**
   * Notify LSP of document save
   */
  didSave(uri: string, text?: string): void {
    this.sendNotification('textDocument/didSave', {
      textDocument: { uri },
      text,
    });
  }

  /**
   * Provide completion items
   */
  private async provideCompletionItems(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    _context: monaco.languages.CompletionContext
  ): Promise<monaco.languages.CompletionList | null> {
    try {
      const params: TextDocumentPositionParams = {
        textDocument: { uri: model.uri.toString() },
        position: { line: position.lineNumber - 1, character: position.column - 1 },
      };

      const result = await this.sendRequest<CompletionItem[] | { items: CompletionItem[] }>('textDocument/completion', params);
      const items = Array.isArray(result) ? result : result?.items || [];

      return {
        suggestions: items.map(item => this.convertCompletionItem(item, model, position)),
      };
    } catch (error) {
      console.error('[LSP Bridge] Completion error:', error);
      return null;
    }
  }

  /**
   * Convert LSP completion item to Monaco
   */
  private convertCompletionItem(
    item: CompletionItem,
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): monaco.languages.CompletionItem {
    const range = item.textEdit?.range
      ? this.convertRange(item.textEdit.range)
      : {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        };

    let documentation: string | monaco.IMarkdownString | undefined;
    if (typeof item.documentation === 'string') {
      documentation = item.documentation;
    } else if (item.documentation && typeof item.documentation === 'object' && 'value' in item.documentation) {
      documentation = { value: item.documentation.value };
    }

    return {
      label: item.label,
      kind: LSP_COMPLETION_KIND_MAP[item.kind || 1] || monaco.languages.CompletionItemKind.Text,
      detail: item.detail,
      documentation,
      insertText: item.insertText || (item.textEdit?.newText) || item.label,
      insertTextRules: item.insertTextFormat === 2
        ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
        : undefined,
      range,
      sortText: item.sortText,
      filterText: item.filterText,
      preselect: item.preselect,
    };
  }

  /**
   * Provide hover information
   */
  private async provideHover(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): Promise<monaco.languages.Hover | null> {
    try {
      const params: TextDocumentPositionParams = {
        textDocument: { uri: model.uri.toString() },
        position: { line: position.lineNumber - 1, character: position.column - 1 },
      };

      const result = await this.sendRequest<Hover | null>('textDocument/hover', params);
      if (!result) return null;

      const contents: monaco.IMarkdownString[] = [];
      
      if (typeof result.contents === 'string') {
        contents.push({ value: result.contents });
      } else if (Array.isArray(result.contents)) {
        for (const c of result.contents) {
          if (typeof c === 'string') {
            contents.push({ value: c });
          } else {
            contents.push({ value: `\`\`\`${c.language}\n${c.value}\n\`\`\`` });
          }
        }
      } else if ('value' in result.contents) {
        contents.push({ value: result.contents.value });
      }

      return {
        contents,
        range: result.range ? this.convertRange(result.range) : undefined,
      };
    } catch (error) {
      console.error('[LSP Bridge] Hover error:', error);
      return null;
    }
  }

  /**
   * Provide definition locations
   */
  private async provideDefinition(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): Promise<monaco.languages.Definition | null> {
    try {
      const params: TextDocumentPositionParams = {
        textDocument: { uri: model.uri.toString() },
        position: { line: position.lineNumber - 1, character: position.column - 1 },
      };

      const result = await this.sendRequest<Location | Location[] | null>('textDocument/definition', params);
      if (!result) return null;

      const locations = Array.isArray(result) ? result : [result];
      return locations.map(loc => ({
        uri: monaco.Uri.parse(loc.uri),
        range: this.convertRange(loc.range),
      }));
    } catch (error) {
      console.error('[LSP Bridge] Definition error:', error);
      return null;
    }
  }

  /**
   * Provide references
   */
  private async provideReferences(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.ReferenceContext
  ): Promise<monaco.languages.Location[] | null> {
    try {
      const params = {
        textDocument: { uri: model.uri.toString() },
        position: { line: position.lineNumber - 1, character: position.column - 1 },
        context: { includeDeclaration: context.includeDeclaration },
      };

      const result = await this.sendRequest<Location[] | null>('textDocument/references', params);
      if (!result) return null;

      return result.map(loc => ({
        uri: monaco.Uri.parse(loc.uri),
        range: this.convertRange(loc.range),
      }));
    } catch (error) {
      console.error('[LSP Bridge] References error:', error);
      return null;
    }
  }

  /**
   * Provide signature help
   */
  private async provideSignatureHelp(
    model: monaco.editor.ITextModel,
    position: monaco.Position
  ): Promise<monaco.languages.SignatureHelpResult | null> {
    try {
      const params: TextDocumentPositionParams = {
        textDocument: { uri: model.uri.toString() },
        position: { line: position.lineNumber - 1, character: position.column - 1 },
      };

      const result = await this.sendRequest<{
        signatures: { label: string; documentation?: string | { value: string }; parameters?: { label: string | [number, number] }[] }[];
        activeSignature?: number;
        activeParameter?: number;
      } | null>('textDocument/signatureHelp', params);
      
      if (!result || !result.signatures.length) return null;

      return {
        value: {
          signatures: result.signatures.map(sig => ({
            label: sig.label,
            documentation: typeof sig.documentation === 'string' 
              ? sig.documentation 
              : sig.documentation?.value,
            parameters: sig.parameters?.map(p => ({
              label: p.label,
            })) || [],
          })),
          activeSignature: result.activeSignature || 0,
          activeParameter: result.activeParameter || 0,
        },
        dispose: () => {},
      };
    } catch (error) {
      console.error('[LSP Bridge] Signature help error:', error);
      return null;
    }
  }

  /**
   * Provide document formatting
   */
  private async provideDocumentFormatting(
    model: monaco.editor.ITextModel,
    options: monaco.languages.FormattingOptions
  ): Promise<monaco.languages.TextEdit[] | null> {
    try {
      const params = {
        textDocument: { uri: model.uri.toString() },
        options: {
          tabSize: options.tabSize,
          insertSpaces: options.insertSpaces,
        },
      };

      const result = await this.sendRequest<{ range: Range; newText: string }[] | null>('textDocument/formatting', params);
      if (!result) return null;

      return result.map(edit => ({
        range: this.convertRange(edit.range),
        text: edit.newText,
      }));
    } catch (error) {
      console.error('[LSP Bridge] Formatting error:', error);
      return null;
    }
  }

  /**
   * Provide rename edits
   */
  private async provideRenameEdits(
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    newName: string
  ): Promise<monaco.languages.WorkspaceEdit | null> {
    try {
      const params = {
        textDocument: { uri: model.uri.toString() },
        position: { line: position.lineNumber - 1, character: position.column - 1 },
        newName,
      };

      const result = await this.sendRequest<{
        changes?: Record<string, { range: Range; newText: string }[]>;
        documentChanges?: { textDocument: { uri: string }; edits: { range: Range; newText: string }[] }[];
      } | null>('textDocument/rename', params);
      
      if (!result) return null;

      const edits: monaco.languages.IWorkspaceTextEdit[] = [];

      if (result.changes) {
        for (const [uri, changes] of Object.entries(result.changes)) {
          for (const change of changes) {
            edits.push({
              resource: monaco.Uri.parse(uri),
              textEdit: {
                range: this.convertRange(change.range),
                text: change.newText,
              },
              versionId: undefined,
            });
          }
        }
      }

      if (result.documentChanges) {
        for (const docChange of result.documentChanges) {
          for (const edit of docChange.edits) {
            edits.push({
              resource: monaco.Uri.parse(docChange.textDocument.uri),
              textEdit: {
                range: this.convertRange(edit.range),
                text: edit.newText,
              },
              versionId: undefined,
            });
          }
        }
      }

      return { edits };
    } catch (error) {
      console.error('[LSP Bridge] Rename error:', error);
      return null;
    }
  }

  /**
   * Convert LSP range to Monaco range
   */
  private convertRange(range: Range): monaco.IRange {
    return {
      startLineNumber: range.start.line + 1,
      startColumn: range.start.character + 1,
      endLineNumber: range.end.line + 1,
      endColumn: range.end.character + 1,
    };
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.pendingRequests.clear();
    this.openDocuments.clear();
  }
}

// Singleton instance
let bridgeInstance: MonacoLspBridge | null = null;

/**
 * Get or create LSP bridge instance
 */
export function getLspBridge(wsUrl?: string): MonacoLspBridge {
  if (!bridgeInstance) {
    bridgeInstance = new MonacoLspBridge(wsUrl);
  }
  return bridgeInstance;
}

/**
 * Initialize LSP bridge
 */
export async function initializeLspBridge(wsUrl?: string): Promise<MonacoLspBridge> {
  const bridge = getLspBridge(wsUrl);
  await bridge.initialize();
  return bridge;
}

export default MonacoLspBridge;
