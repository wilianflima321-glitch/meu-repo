/**
 * LSP Manager
 * Manages multiple LSP servers for different languages
 * Updated to use new server implementations
 */

import { LSPServerBase } from './lsp-server-base';
import { createPythonLSPServer } from './servers/python-lsp';
import { createTypeScriptLSPServer } from './servers/typescript-lsp';
import { createGoLSPServer } from './servers/go-lsp';

export class LSPManager {
  private servers: Map<string, LSPServerBase> = new Map();
  private rootPath: string;

  constructor(rootPath: string = '/workspace') {
    this.rootPath = rootPath;
  }

  /**
   * Get or create LSP server for a language
   */
  async getClient(language: string): Promise<LSPServerBase | null> {
    // Return existing server if available
    if (this.servers.has(language)) {
      const server = this.servers.get(language)!;
      if (server.isReady()) {
        return server;
      }
    }

    // Create new server based on language
    let server: LSPServerBase;

    switch (language.toLowerCase()) {
      case 'python':
        server = createPythonLSPServer(this.rootPath);
        break;
      case 'typescript':
      case 'javascript':
      case 'typescriptreact':
      case 'javascriptreact':
        server = createTypeScriptLSPServer(this.rootPath);
        break;
      case 'go':
        server = createGoLSPServer(this.rootPath);
        break;
      default:
        console.warn(`[LSP Manager] No LSP server available for ${language}`);
        return null;
    }

    try {
      // Start server
      await server.start();

      // Initialize server
      await server.initialize({
        processId: null,
        rootUri: `file://${this.rootPath}`,
        capabilities: {
          workspace: {
            workspaceFolders: true,
            configuration: true,
          },
          textDocument: {
            completion: {
              completionItem: {
                snippetSupport: true,
                documentationFormat: ['markdown', 'plaintext'],
              },
            },
            hover: {
              contentFormat: ['markdown', 'plaintext'],
            },
            signatureHelp: {
              signatureInformation: {
                documentationFormat: ['markdown', 'plaintext'],
              },
            },
          },
        },
        workspaceFolders: [
          {
            uri: `file://${this.rootPath}`,
            name: 'workspace',
          },
        ],
      });

      // Setup event listeners
      server.on('diagnostics', (params: any) => {
        console.log(`[LSP] Diagnostics for ${params.uri}:`, params.diagnostics);
      });

      server.on('error', (error: any) => {
        console.error(`[LSP] Error in ${language} server:`, error);
      });

      this.servers.set(language, server);
      console.log(`[LSP Manager] Server for ${language} started`);
      return server;
    } catch (error) {
      console.error(`[LSP Manager] Failed to initialize ${language} server:`, error);
      return null;
    }
  }

  /**
   * Shutdown LSP server for a language
   */
  async shutdownClient(language: string): Promise<void> {
    const server = this.servers.get(language);
    if (server) {
      await server.stop();
      this.servers.delete(language);
      console.log(`[LSP Manager] Server for ${language} stopped`);
    }
  }

  /**
   * Shutdown all LSP servers
   */
  async shutdownAll(): Promise<void> {
    const shutdownPromises = Array.from(this.servers.values()).map(
      server => server.stop()
    );

    await Promise.all(shutdownPromises);
    this.servers.clear();
    console.log('[LSP Manager] All servers stopped');
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return ['python', 'typescript', 'javascript', 'typescriptreact', 'javascriptreact', 'go'];
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language.toLowerCase());
  }

  /**
   * Get active languages
   */
  getActiveLanguages(): string[] {
    return Array.from(this.servers.keys());
  }

  /**
   * Restart server for a language
   */
  async restartServer(language: string): Promise<void> {
    await this.shutdownClient(language);
    await this.getClient(language);
  }
}

// Singleton instance
let lspManagerInstance: LSPManager | null = null;

export function getLSPManager(rootPath?: string): LSPManager {
  if (!lspManagerInstance) {
    lspManagerInstance = new LSPManager(rootPath);
  }
  return lspManagerInstance;
}

export function resetLSPManager(): void {
  if (lspManagerInstance) {
    lspManagerInstance.shutdownAll();
    lspManagerInstance = null;
  }
}
