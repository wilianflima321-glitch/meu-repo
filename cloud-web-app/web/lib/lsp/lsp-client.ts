/**
 * LSP Client Implementation
 * Provides Language Server Protocol client for multiple languages
 */

export interface LSPClientConfig {
  language: string;
  serverCommand: string;
  serverArgs: string[];
  rootPath: string;
  initializationOptions?: Record<string, unknown>;
}

export interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: 1 | 2 | 3 | 4; // Error, Warning, Information, Hint
  message: string;
  source?: string;
  code?: string | number;
}

export interface CompletionItem {
  label: string;
  kind: number;
  detail?: string;
  documentation?: string;
  insertText?: string;
  sortText?: string;
  filterText?: string;
}

export interface Location {
  uri: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface Hover {
  contents: string | { language: string; value: string };
  range?: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

export interface SignatureHelp {
  signatures: Array<{
    label: string;
    documentation?: string;
    parameters?: Array<{
      label: string;
      documentation?: string;
    }>;
  }>;
  activeSignature: number;
  activeParameter: number;
}

export interface CodeAction {
  title: string;
  kind?: string;
  diagnostics?: Diagnostic[];
  edit?: {
    changes: Record<string, Array<{
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      newText: string;
    }>>;
  };
  command?: {
    title: string;
    command: string;
    arguments?: unknown[];
  };
}

export class LSPClient {
  private config: LSPClientConfig;
  private initialized: boolean = false;
  private messageId: number = 0;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = new Map();

  constructor(config: LSPClientConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const initializeParams = {
      processId: null,
      rootPath: this.config.rootPath,
      rootUri: `file://${this.config.rootPath}`,
      capabilities: {
        textDocument: {
          synchronization: {
            dynamicRegistration: true,
            willSave: true,
            willSaveWaitUntil: true,
            didSave: true
          },
          completion: {
            dynamicRegistration: true,
            completionItem: {
              snippetSupport: true,
              commitCharactersSupport: true,
              documentationFormat: ['markdown', 'plaintext'],
              deprecatedSupport: true,
              preselectSupport: true
            },
            contextSupport: true
          },
          hover: {
            dynamicRegistration: true,
            contentFormat: ['markdown', 'plaintext']
          },
          signatureHelp: {
            dynamicRegistration: true,
            signatureInformation: {
              documentationFormat: ['markdown', 'plaintext'],
              parameterInformation: {
                labelOffsetSupport: true
              }
            }
          },
          definition: {
            dynamicRegistration: true,
            linkSupport: true
          },
          references: {
            dynamicRegistration: true
          },
          documentHighlight: {
            dynamicRegistration: true
          },
          documentSymbol: {
            dynamicRegistration: true,
            symbolKind: {
              valueSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
            },
            hierarchicalDocumentSymbolSupport: true
          },
          codeAction: {
            dynamicRegistration: true,
            codeActionLiteralSupport: {
              codeActionKind: {
                valueSet: [
                  'quickfix',
                  'refactor',
                  'refactor.extract',
                  'refactor.inline',
                  'refactor.rewrite',
                  'source',
                  'source.organizeImports'
                ]
              }
            }
          },
          formatting: {
            dynamicRegistration: true
          },
          rangeFormatting: {
            dynamicRegistration: true
          },
          rename: {
            dynamicRegistration: true,
            prepareSupport: true
          },
          publishDiagnostics: {
            relatedInformation: true,
            tagSupport: {
              valueSet: [1, 2]
            }
          }
        },
        workspace: {
          applyEdit: true,
          workspaceEdit: {
            documentChanges: true,
            resourceOperations: ['create', 'rename', 'delete']
          },
          didChangeConfiguration: {
            dynamicRegistration: true
          },
          didChangeWatchedFiles: {
            dynamicRegistration: true
          },
          symbol: {
            dynamicRegistration: true,
            symbolKind: {
              valueSet: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]
            }
          },
          executeCommand: {
            dynamicRegistration: true
          },
          configuration: true,
          workspaceFolders: true
        }
      },
      initializationOptions: this.config.initializationOptions || {},
      trace: 'verbose'
    };

    try {
      const response = await this.sendRequest('initialize', initializeParams);
      this.initialized = true;
      await this.sendNotification('initialized', {});
      console.log(`LSP client initialized for ${this.config.language}`);
    } catch (error) {
      console.error(`Failed to initialize LSP client for ${this.config.language}:`, error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.sendRequest('shutdown', null);
      await this.sendNotification('exit', null);
      this.initialized = false;
      console.log(`LSP client shut down for ${this.config.language}`);
    } catch (error) {
      console.error(`Failed to shutdown LSP client for ${this.config.language}:`, error);
    }
  }

  async didOpen(uri: string, languageId: string, version: number, text: string): Promise<void> {
    await this.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId,
        version,
        text
      }
    });
  }

  async didChange(uri: string, version: number, changes: Array<{
    range?: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    text: string;
  }>): Promise<void> {
    await this.sendNotification('textDocument/didChange', {
      textDocument: { uri, version },
      contentChanges: changes
    });
  }

  async didClose(uri: string): Promise<void> {
    await this.sendNotification('textDocument/didClose', {
      textDocument: { uri }
    });
  }

  async completion(uri: string, line: number, character: number): Promise<CompletionItem[]> {
    const response = await this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position: { line, character }
    });

    if (!response) {
      return [];
    }

    const items = Array.isArray(response) ? response : response.items || [];
    return items;
  }

  async hover(uri: string, line: number, character: number): Promise<Hover | null> {
    const response = await this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character }
    });

    return response || null;
  }

  async signatureHelp(uri: string, line: number, character: number): Promise<SignatureHelp | null> {
    const response = await this.sendRequest('textDocument/signatureHelp', {
      textDocument: { uri },
      position: { line, character }
    });

    return response || null;
  }

  async definition(uri: string, line: number, character: number): Promise<Location[]> {
    const response = await this.sendRequest('textDocument/definition', {
      textDocument: { uri },
      position: { line, character }
    });

    if (!response) {
      return [];
    }

    return Array.isArray(response) ? response : [response];
  }

  async references(uri: string, line: number, character: number, includeDeclaration: boolean = true): Promise<Location[]> {
    const response = await this.sendRequest('textDocument/references', {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration }
    });

    return response || [];
  }

  async rename(uri: string, line: number, character: number, newName: string): Promise<{
    changes: Record<string, Array<{
      range: {
        start: { line: number; character: number };
        end: { line: number; character: number };
      };
      newText: string;
    }>>;
  } | null> {
    const response = await this.sendRequest('textDocument/rename', {
      textDocument: { uri },
      position: { line, character },
      newName
    });

    return response || null;
  }

  async codeAction(uri: string, range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  }, diagnostics: Diagnostic[]): Promise<CodeAction[]> {
    const response = await this.sendRequest('textDocument/codeAction', {
      textDocument: { uri },
      range,
      context: { diagnostics }
    });

    return response || [];
  }

  async formatting(uri: string, options: {
    tabSize: number;
    insertSpaces: boolean;
  }): Promise<Array<{
    range: {
      start: { line: number; character: number };
      end: { line: number; character: number };
    };
    newText: string;
  }>> {
    const response = await this.sendRequest('textDocument/formatting', {
      textDocument: { uri },
      options
    });

    return response || [];
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    const id = ++this.messageId;

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // Simulate LSP request via API
      fetch('/api/lsp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: this.config.language,
          method,
          params,
          id
        })
      })
        .then(res => res.json())
        .then(data => {
          const pending = this.pendingRequests.get(id);
          if (pending) {
            this.pendingRequests.delete(id);
            if (data.error) {
              pending.reject(data.error);
            } else {
              pending.resolve(data.result);
            }
          }
        })
        .catch(error => {
          const pending = this.pendingRequests.get(id);
          if (pending) {
            this.pendingRequests.delete(id);
            pending.reject(error);
          }
        });

      // Timeout after 30 seconds
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(new Error('LSP request timeout'));
        }
      }, 30000);
    });
  }

  private async sendNotification(method: string, params: any): Promise<void> {
    // Notifications don't expect a response
    await fetch('/api/lsp/notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: this.config.language,
        method,
        params
      })
    });
  }
}

// Language-specific configurations
export const LSP_CONFIGS: Record<string, Omit<LSPClientConfig, 'rootPath'>> = {
  python: {
    language: 'python',
    serverCommand: 'pylsp',
    serverArgs: [],
    initializationOptions: {
      pylsp: {
        plugins: {
          pycodestyle: { enabled: true },
          pyflakes: { enabled: true },
          pylint: { enabled: false },
          rope_completion: { enabled: true },
          jedi_completion: { enabled: true }
        }
      }
    }
  },
  typescript: {
    language: 'typescript',
    serverCommand: 'typescript-language-server',
    serverArgs: ['--stdio'],
    initializationOptions: {}
  },
  javascript: {
    language: 'javascript',
    serverCommand: 'typescript-language-server',
    serverArgs: ['--stdio'],
    initializationOptions: {}
  },
  go: {
    language: 'go',
    serverCommand: 'gopls',
    serverArgs: ['serve'],
    initializationOptions: {
      usePlaceholders: true,
      completionDocumentation: true
    }
  },
  rust: {
    language: 'rust',
    serverCommand: 'rust-analyzer',
    serverArgs: [],
    initializationOptions: {
      cargo: {
        allFeatures: true
      },
      checkOnSave: {
        command: 'clippy'
      }
    }
  },
  java: {
    language: 'java',
    serverCommand: 'jdtls',
    serverArgs: [],
    initializationOptions: {}
  },
  csharp: {
    language: 'csharp',
    serverCommand: 'omnisharp',
    serverArgs: ['--languageserver'],
    initializationOptions: {}
  },
  cpp: {
    language: 'cpp',
    serverCommand: 'clangd',
    serverArgs: ['--background-index'],
    initializationOptions: {}
  },
  c: {
    language: 'c',
    serverCommand: 'clangd',
    serverArgs: ['--background-index'],
    initializationOptions: {}
  },
  php: {
    language: 'php',
    serverCommand: 'intelephense',
    serverArgs: ['--stdio'],
    initializationOptions: {}
  }
};
