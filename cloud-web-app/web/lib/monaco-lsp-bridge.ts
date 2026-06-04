// @aethel-heavy-async-boundary IDE/Monaco runtime module; never import from public/dashboard/admin route shells.
/**
 * Monaco LSP Bridge
 *
 * Connects Monaco Editor to the LSP server via WebSocket for real-time
 * language intelligence features like autocomplete, hover, go-to-definition, etc.
 */

import * as monaco from 'monaco-editor';

import { createComponentLogger, logger } from '@/lib/observability/logger';
import { DEFAULT_LSP_ROOT_URI, DEFAULT_LSP_WORKSPACE_FOLDERS, DEFAULT_LSP_WS_URL, LSP_CLIENT_CAPABILITIES, LSP_REQUEST_TIMEOUT_MS, SUPPORTED_LSP_LANGUAGES } from './monaco-lsp-bridge.config';
import { LSP_COMPLETION_KIND_MAP, LSP_SEVERITY_MAP } from './monaco-lsp-bridge.maps';
import type { CompletionItem, Diagnostic, Hover, Location, LspMessage, Range, TextDocumentPositionParams } from './monaco-lsp-bridge.types';

const log = createComponentLogger('monaco-lsp-bridge');

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

  constructor(private wsUrl: string = DEFAULT_LSP_WS_URL) {}

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
        log.info('[LSP Bridge] Connected to LSP server');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onclose = () => {
        log.info('[LSP Bridge] Disconnected from LSP server');
        this.handleDisconnect();
      };

      this.ws.onerror = (error) => {
        logger.error('[LSP Bridge] WebSocket error:', error);
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
      log.info(`[LSP Bridge] Attempting reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

      setTimeout(async () => {
        try {
          await this.connect();
          await this.initializeLsp();
          // Re-sync open documents
          for (const [uri, doc] of this.openDocuments) {
            await this.didOpen(uri, doc.languageId, ''); // Need to get content from Monaco
          }
        } catch (error) {
          logger.error('[LSP Bridge] Reconnect failed:', error);
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
      capabilities: LSP_CLIENT_CAPABILITIES,
      rootUri: DEFAULT_LSP_ROOT_URI,
      workspaceFolders: DEFAULT_LSP_WORKSPACE_FOLDERS,
    });

    this.serverCapabilities = result.capabilities;
    await this.sendNotification('initialized', {});
    log.info('[LSP Bridge] LSP initialized with capabilities:', this.serverCapabilities);
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
      }, LSP_REQUEST_TIMEOUT_MS);
    });
  }

  /**
   * Send a notification to LSP server
   */
  private sendNotification(method: string, params: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('[LSP Bridge] Cannot send notification, not connected');
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
        log.info('[LSP Message]', params);
        break;
      case 'window/logMessage':
        log.info('[LSP Log]', params);
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
    for (const language of SUPPORTED_LSP_LANGUAGES) {
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
      logger.error('[LSP Bridge] Completion error:', error);
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
      logger.error('[LSP Bridge] Hover error:', error);
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
      logger.error('[LSP Bridge] Definition error:', error);
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
      logger.error('[LSP Bridge] References error:', error);
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
      logger.error('[LSP Bridge] Signature help error:', error);
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
      logger.error('[LSP Bridge] Formatting error:', error);
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
      logger.error('[LSP Bridge] Rename error:', error);
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
