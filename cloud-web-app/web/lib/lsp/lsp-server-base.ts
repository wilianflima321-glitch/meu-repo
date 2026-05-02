/**
 * Base class for LSP server implementations
 * Handles process lifecycle, communication, and common LSP operations
 */

import { EventEmitter } from 'events';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('lsp/lsp-server-base')

export interface LSPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string | undefined>;
  cwd?: string;
  initializationOptions?: unknown;
  language?: string;
}

export interface InitializeParams {
  processId: number | null;
  rootUri: string | null;
  capabilities: ClientCapabilities;
  workspaceFolders?: WorkspaceFolder[];
}

export interface ClientCapabilities {
  workspace?: {
    workspaceFolders?: boolean;
    configuration?: boolean;
  };
  textDocument?: {
    completion?: {
      completionItem?: {
        snippetSupport?: boolean;
        documentationFormat?: string[];
      };
    };
    hover?: {
      contentFormat?: string[];
    };
    signatureHelp?: {
      signatureInformation?: {
        documentationFormat?: string[];
      };
    };
  };
}

export interface WorkspaceFolder {
  uri: string;
  name: string;
}

export interface InitializeResult {
  capabilities: ServerCapabilities;
  serverInfo?: {
    name: string;
    version?: string;
  };
}

export interface ServerCapabilities {
  textDocumentSync?: number;
  completionProvider?: {
    triggerCharacters?: string[];
    resolveProvider?: boolean;
  };
  hoverProvider?: boolean;
  signatureHelpProvider?: {
    triggerCharacters?: string[];
  };
  definitionProvider?: boolean;
  referencesProvider?: boolean;
  documentHighlightProvider?: boolean;
  documentSymbolProvider?: boolean;
  workspaceSymbolProvider?: boolean;
  codeActionProvider?: boolean;
  codeLensProvider?: {
    resolveProvider?: boolean;
  };
  documentFormattingProvider?: boolean;
  documentRangeFormattingProvider?: boolean;
  renameProvider?: boolean;
  documentLinkProvider?: {
    resolveProvider?: boolean;
  };
  executeCommandProvider?: {
    commands: string[];
  };
}

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface Diagnostic {
  range: Range;
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
}

export interface CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string;
  sortText?: string;
  filterText?: string;
  insertText?: string;
  insertTextFormat?: number;
  textEdit?: {
    range: Range;
    newText: string;
  };
}

export interface Hover {
  contents: string | { language: string; value: string };
  range?: Range;
}

export type LSPParams = object;
export type WorkspaceEdit = Record<string, unknown> | null;
export type TextEdit = { range: Range; newText: string };
export type CodeActionContext = Record<string, unknown>;
export type CodeAction = { title: string; kind: string; [key: string]: unknown };
export type ContentChange = { range?: Range; rangeLength?: number; text: string };

type JsonRpcResponse<TResult = unknown> = {
  jsonrpc?: '2.0';
  id: number;
  result?: TResult;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && 'id' in value);
}

export abstract class LSPServerBase extends EventEmitter {
  protected config: LSPServerConfig;
  protected process: unknown = null;
  protected messageId = 0;
  protected pendingRequests = new Map<number, PendingRequest>();
  protected buffer = '';
  protected initialized = false;
  protected capabilities: ServerCapabilities = {};

  constructor(config: LSPServerConfig) {
    super();
    this.config = config;
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem('aethel-token');
    } catch {
      return null;
    }
  }

  private resolveLanguage(): string {
    if (this.config.language) return this.config.language;
    const cmd = (this.config.command || '').toLowerCase();
    if (cmd.includes('pylsp')) return 'python';
    if (cmd.includes('typescript')) return 'typescript';
    if (cmd.includes('gopls')) return 'go';
    return this.config.command;
  }

  /**
   * Start the LSP server process
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error('Server already started');
    }

    try {
      // Client-side: o runtime real é via /api/lsp/* (server-side).
      // Não inicializa processo aqui.
      this.emit('ready');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop the LSP server process
   */
  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    try {
      await this.sendNotification('exit', {});
      this.process = null;
      this.initialized = false;
      this.emit('stopped');
      log.info(`[LSP] ${this.config.command} server stopped`);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Initialize the LSP server
   */
  async initialize(params: InitializeParams): Promise<InitializeResult> {
    if (this.initialized) {
      throw new Error('Server already initialized');
    }

    const result = await this.sendRequest<InitializeResult>('initialize', params);
    this.capabilities = result.capabilities;
    this.initialized = true;

    // Send initialized notification
    await this.sendNotification('initialized', {});

    this.emit('initialized', result);
    return result;
  }

  /**
   * Send a request to the LSP server
   */
  protected async sendRequest<TResult = unknown>(method: string, params: LSPParams): Promise<TResult> {
    const id = ++this.messageId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve: resolve as (value: unknown) => void, reject });

      const token = this.getAuthToken();
      fetch('/api/lsp/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          language: this.resolveLanguage(),
          method,
          params,
          id,
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => null);
          // Sempre tenta respeitar o payload JSON-RPC.
          if (isJsonRpcResponse(data) && data.error) {
            const errObj = data.error;
            const e = new Error(String(errObj.data || errObj.message || 'LSP error'));
            Object.assign(e, { code: errObj.code });
            throw e;
          }
          if (!res.ok) {
            throw new Error(`LSP request failed (HTTP ${res.status})`);
          }
          return data;
        })
        .then((data) => {
          // Endpoint retorna {jsonrpc,id,result} no sucesso.
          if (isJsonRpcResponse(data) && data.result !== undefined) {
            this.handleResponse({ jsonrpc: '2.0', id, result: data.result });
            return;
          }
          // fallback
          this.handleResponse({ jsonrpc: '2.0', id, result: data });
        })
        .catch((error) => {
          const pending = this.pendingRequests.get(id);
          if (pending) {
            this.pendingRequests.delete(id);
            pending.reject(error);
          }
        });
    });
  }

  /**
   * Send a notification to the LSP server
   */
  protected async sendNotification(method: string, params: LSPParams): Promise<void> {
    const token = this.getAuthToken();
    try {
      const res = await fetch('/api/lsp/notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          language: this.resolveLanguage(),
          method,
          params,
        }),
      });

      // 501 é esperado enquanto não houver backend LSP real.
      if (!res.ok && res.status !== 501) {
        log.warn(`[LSP] Notification failed (${res.status}) for ${method}`);
      }
    } catch (error) {
      // Não quebra o fluxo do editor por notification.
      log.warn('[LSP] Notification error', error);
    }
  }

  /**
   * Handle response from LSP server
   */
  protected handleResponse(response: JsonRpcResponse): void {
    const { id, result, error } = response;
    const pending = this.pendingRequests.get(id);

    if (!pending) {
      log.warn(`[LSP] No pending request for id ${id}`);
      return;
    }

    this.pendingRequests.delete(id);

    if (error) {
      pending.reject(new Error(error.message));
    } else {
      pending.resolve(result);
    }
  }

  /**
   * Handle notification from LSP server
   */
  protected handleNotification(notification: { method: string; params?: unknown }): void {
    const { method, params } = notification;
    this.emit('notification', { method, params });

    // Handle specific notifications
    if (method === 'textDocument/publishDiagnostics') {
      this.emit('diagnostics', params);
    }
  }

  /**
   * Get mock response for testing
   * Override in subclasses for language-specific mocks
   */
  protected abstract getMockResponse(method: string, params: LSPParams): unknown;

  /**
   * Document sync notifications
   */
  async didOpen(uri: string, languageId: string, version: number, text: string): Promise<void> {
    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text,
      },
    });
  }

  async didChange(uri: string, version: number, changes: ContentChange[]): Promise<void> {
    await this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: changes,
    });
  }

  async didSave(uri: string, text?: string): Promise<void> {
    await this.sendNotification('textDocument/didSave', {
      textDocument: { uri },
      text,
    });
  }

  async didClose(uri: string): Promise<void> {
    await this.sendNotification('textDocument/didClose', {
      textDocument: { uri },
    });
  }

  /**
   * Language features
   */
  async completion(uri: string, position: Position): Promise<CompletionItem[]> {
    if (!this.capabilities.completionProvider) {
      return [];
    }

    const result = await this.sendRequest<CompletionItem[] | { items?: CompletionItem[] }>('textDocument/completion', {
      textDocument: { uri },
      position,
    });

    return Array.isArray(result) ? result : result?.items || [];
  }

  async hover(uri: string, position: Position): Promise<Hover | null> {
    if (!this.capabilities.hoverProvider) {
      return null;
    }

    return await this.sendRequest<Hover | null>('textDocument/hover', {
      textDocument: { uri },
      position,
    });
  }

  async definition(uri: string, position: Position): Promise<Location[]> {
    if (!this.capabilities.definitionProvider) {
      return [];
    }

    const result = await this.sendRequest<Location[] | Location | null>('textDocument/definition', {
      textDocument: { uri },
      position,
    });

    return Array.isArray(result) ? result : result ? [result] : [];
  }

  async references(uri: string, position: Position, includeDeclaration: boolean = false): Promise<Location[]> {
    if (!this.capabilities.referencesProvider) {
      return [];
    }

    const result = await this.sendRequest<Location[]>('textDocument/references', {
      textDocument: { uri },
      position,
      context: { includeDeclaration },
    });

    return result || [];
  }

  async rename(uri: string, position: Position, newName: string): Promise<WorkspaceEdit> {
    if (!this.capabilities.renameProvider) {
      return null;
    }

    return await this.sendRequest<WorkspaceEdit>('textDocument/rename', {
      textDocument: { uri },
      position,
      newName,
    });
  }

  async formatting(uri: string, options: Record<string, unknown>): Promise<TextEdit[]> {
    if (!this.capabilities.documentFormattingProvider) {
      return [];
    }

    const result = await this.sendRequest<TextEdit[]>('textDocument/formatting', {
      textDocument: { uri },
      options,
    });

    return result || [];
  }

  async codeAction(uri: string, range: Range, context: CodeActionContext): Promise<CodeAction[]> {
    if (!this.capabilities.codeActionProvider) {
      return [];
    }

    const result = await this.sendRequest<CodeAction[]>('textDocument/codeAction', {
      textDocument: { uri },
      range,
      context,
    });

    return result || [];
  }

  /**
   * Check if server is ready
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Get server capabilities
   */
  getCapabilities(): ServerCapabilities {
    return this.capabilities;
  }
}
