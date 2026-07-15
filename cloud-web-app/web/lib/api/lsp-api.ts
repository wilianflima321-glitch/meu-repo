import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/lsp-api')


/**
 * LSP API Client
 * Handles communication with backend LSP servers
 */

export interface LSPServerConfig {
  language: string;
  command: string;
  args: string[];
  initializationOptions?: unknown;
}

export interface LSPRequest {
  method: string;
  params?: LSPParams;
}

export interface LSPResponse<TResult = LSPResult> {
  result?: TResult;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface LSPNotification {
  method: string;
  params?: LSPParams;
}

export type LSPParams = Record<string, unknown>;
export type LSPResult = unknown;

export interface LSPPosition {
  line: number;
  character: number;
}

export interface LSPRange {
  start: LSPPosition;
  end: LSPPosition;
}

export interface LSPTextDocumentContentChangeEvent {
  range?: LSPRange;
  rangeLength?: number;
  text: string;
}

export interface LSPClientCapabilities {
  [key: string]: unknown;
}

export type LSPCompletionResult = { items?: unknown[] } | unknown[];
export type LSPHoverResult = { contents?: unknown; range?: LSPRange } | null;
export type LSPLocationResult = unknown[] | null;
export type LSPSymbolResult = unknown[];
export type LSPCodeActionContext = Record<string, unknown>;
export type LSPCodeActionResult = unknown[];
export type LSPFormattingOptions = Record<string, unknown>;
export type LSPTextEditResult = unknown[];
export type LSPWorkspaceEditResult = Record<string, unknown> | null;

export class LSPApiClient {
  private baseUrl: string;
  private sessions: Map<string, string> = new Map(); // language -> sessionId
  private messageHandlers: Map<string, (notification: LSPNotification) => void> = new Map();

  constructor(baseUrl: string = '/api/lsp') {
    this.baseUrl = baseUrl;
  }

  /**
   * Start LSP server for language
   */
  async startServer(config: LSPServerConfig): Promise<string> {
    const response = await fetch(`${this.baseUrl}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to start LSP server: ${response.statusText}`);
    }

    const data = await response.json() as { sessionId?: string };
    const sessionId = data.sessionId;
    if (!sessionId) {
      throw new Error('LSP server did not return a sessionId');
    }
    this.sessions.set(config.language, sessionId);

    log.info(`[LSP API] Started server for ${config.language}: ${sessionId}`);
    return sessionId;
  }

  /**
   * Stop LSP server
   */
  async stopServer(language: string): Promise<void> {
    const sessionId = this.sessions.get(language);
    if (!sessionId) {
      // No active session, nothing to stop
      log.info(`[LSP API] No active session for ${language}, skipping stop`);
      return;
    }

    const response = await fetch(`${this.baseUrl}/stop/${sessionId}`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to stop LSP server: ${response.statusText}`);
    }

    this.sessions.delete(language);
    log.info(`[LSP API] Stopped server for ${language}`);
  }

  /**
   * Initialize LSP server
   */
  async initialize(language: string, rootUri: string, capabilities: LSPClientCapabilities): Promise<LSPResult> {
    return this.sendRequest(language, {
      method: 'initialize',
      params: {
        processId: null,
        rootUri,
        capabilities,
      },
    });
  }

  /**
   * Send initialized notification
   */
  async initialized(language: string): Promise<void> {
    await this.sendNotification(language, {
      method: 'initialized',
      params: {},
    });
  }

  /**
   * Open document
   */
  async didOpen(language: string, uri: string, languageId: string, version: number, text: string): Promise<void> {
    await this.sendNotification(language, {
      method: 'textDocument/didOpen',
      params: {
        textDocument: {
          uri,
          languageId,
          version,
          text,
        },
      },
    });
  }

  /**
   * Change document
   */
  async didChange(language: string, uri: string, version: number, changes: LSPTextDocumentContentChangeEvent[]): Promise<void> {
    await this.sendNotification(language, {
      method: 'textDocument/didChange',
      params: {
        textDocument: { uri, version },
        contentChanges: changes,
      },
    });
  }

  /**
   * Close document
   */
  async didClose(language: string, uri: string): Promise<void> {
    await this.sendNotification(language, {
      method: 'textDocument/didClose',
      params: {
        textDocument: { uri },
      },
    });
  }

  /**
   * Request completion
   */
  async completion(language: string, uri: string, position: LSPPosition): Promise<LSPCompletionResult> {
    return this.sendRequest(language, {
      method: 'textDocument/completion',
      params: {
        textDocument: { uri },
        position,
      },
    });
  }

  /**
   * Request hover
   */
  async hover(language: string, uri: string, position: LSPPosition): Promise<LSPHoverResult> {
    return this.sendRequest(language, {
      method: 'textDocument/hover',
      params: {
        textDocument: { uri },
        position,
      },
    });
  }

  /**
   * Request definition
   */
  async definition(language: string, uri: string, position: LSPPosition): Promise<LSPLocationResult> {
    return this.sendRequest(language, {
      method: 'textDocument/definition',
      params: {
        textDocument: { uri },
        position,
      },
    });
  }

  /**
   * Request references
   */
  async references(language: string, uri: string, position: LSPPosition): Promise<LSPLocationResult> {
    return this.sendRequest(language, {
      method: 'textDocument/references',
      params: {
        textDocument: { uri },
        position,
        context: { includeDeclaration: true },
      },
    });
  }

  /**
   * Request document symbols
   */
  async documentSymbols(language: string, uri: string): Promise<LSPSymbolResult> {
    return this.sendRequest(language, {
      method: 'textDocument/documentSymbol',
      params: {
        textDocument: { uri },
      },
    });
  }

  /**
   * Request workspace symbols
   */
  async workspaceSymbols(language: string, query: string): Promise<LSPSymbolResult> {
    return this.sendRequest(language, {
      method: 'workspace/symbol',
      params: { query },
    });
  }

  /**
   * Request code actions
   */
  async codeActions(language: string, uri: string, range: LSPRange, context: LSPCodeActionContext): Promise<LSPCodeActionResult> {
    return this.sendRequest(language, {
      method: 'textDocument/codeAction',
      params: {
        textDocument: { uri },
        range,
        context,
      },
    });
  }

  /**
   * Request formatting
   */
  async formatting(language: string, uri: string, options: LSPFormattingOptions): Promise<LSPTextEditResult> {
    return this.sendRequest(language, {
      method: 'textDocument/formatting',
      params: {
        textDocument: { uri },
        options,
      },
    });
  }

  /**
   * Request rename
   */
  async rename(language: string, uri: string, position: LSPPosition, newName: string): Promise<LSPWorkspaceEditResult> {
    return this.sendRequest(language, {
      method: 'textDocument/rename',
      params: {
        textDocument: { uri },
        position,
        newName,
      },
    });
  }

  /**
   * Send generic request
   */
  async sendRequest<TResult = LSPResult>(language: string, request: LSPRequest): Promise<TResult> {
    const sessionId = this.sessions.get(language);
    if (!sessionId) {
      throw new Error(`No active session for ${language}`);
    }

    const response = await fetch(`${this.baseUrl}/request/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`LSP request failed: ${response.statusText}`);
    }

    const data = await response.json() as LSPResponse<TResult>;
    
    if (data.error) {
      throw new Error(`LSP error: ${data.error.message}`);
    }

    return data.result as TResult;
  }

  /**
   * Send notification
   */
  async sendNotification(language: string, notification: LSPNotification): Promise<void> {
    const sessionId = this.sessions.get(language);
    if (!sessionId) {
      throw new Error(`No active session for ${language}`);
    }

    const response = await fetch(`${this.baseUrl}/notification/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      throw new Error(`LSP notification failed: ${response.statusText}`);
    }
  }

  /**
   * Subscribe to notifications
   */
  onNotification(language: string, handler: (notification: LSPNotification) => void): void {
    this.messageHandlers.set(language, handler);
  }

  /**
   * Get active sessions
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Check if server is active
   */
  isServerActive(language: string): boolean {
    return this.sessions.has(language);
  }
}

// Singleton instance
let lspApiClientInstance: LSPApiClient | null = null;

export function getLSPApiClient(): LSPApiClient {
  if (!lspApiClientInstance) {
    lspApiClientInstance = new LSPApiClient();
  }
  return lspApiClientInstance;
}
