/**
 * VS Code Languages API Implementation
 * Provides language-related functionality (providers, diagnostics)
 */

export interface CompletionItemProvider {
  provideCompletionItems(
    document: any,
    position: any,
    token: any,
    context: any
  ): any[] | Promise<any[]>;
  resolveCompletionItem?(item: any, token: any): any | Promise<any>;
}

export interface HoverProvider {
  provideHover(document: any, position: any, token: any): any | Promise<any>;
}

export interface DefinitionProvider {
  provideDefinition(document: any, position: any, token: any): any | any[] | Promise<any | any[]>;
}

export interface ReferenceProvider {
  provideReferences(
    document: any,
    position: any,
    context: any,
    token: any
  ): any[] | Promise<any[]>;
}

export interface DocumentSymbolProvider {
  provideDocumentSymbols(document: any, token: any): any[] | Promise<any[]>;
}

export interface WorkspaceSymbolProvider {
  provideWorkspaceSymbols(query: string, token: any): any[] | Promise<any[]>;
  resolveWorkspaceSymbol?(symbol: any, token: any): any | Promise<any>;
}

export interface CodeActionProvider {
  provideCodeActions(
    document: any,
    range: any,
    context: any,
    token: any
  ): any[] | Promise<any[]>;
  resolveCodeAction?(codeAction: any, token: any): any | Promise<any>;
}

export interface CodeLensProvider {
  provideCodeLenses(document: any, token: any): any[] | Promise<any[]>;
  resolveCodeLens?(codeLens: any, token: any): any | Promise<any>;
}

export interface DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(
    document: any,
    options: any,
    token: any
  ): any[] | Promise<any[]>;
}

export interface DocumentRangeFormattingEditProvider {
  provideDocumentRangeFormattingEdits(
    document: any,
    range: any,
    options: any,
    token: any
  ): any[] | Promise<any[]>;
}

export interface RenameProvider {
  provideRenameEdits(
    document: any,
    position: any,
    newName: string,
    token: any
  ): any | Promise<any>;
  prepareRename?(document: any, position: any, token: any): any | Promise<any>;
}

export interface SignatureHelpProvider {
  provideSignatureHelp(
    document: any,
    position: any,
    token: any,
    context: any
  ): any | Promise<any>;
}

export interface DiagnosticCollection {
  name: string;
  set(uri: string, diagnostics: any[]): void;
  set(entries: Array<[string, any[]]>): void;
  delete(uri: string): void;
  clear(): void;
  forEach(callback: (uri: string, diagnostics: any[], collection: DiagnosticCollection) => void): void;
  get(uri: string): any[] | undefined;
  has(uri: string): boolean;
  dispose(): void;
}

class LanguagesAPI {
  private completionProviders: Map<string, CompletionItemProvider[]> = new Map();
  private hoverProviders: Map<string, HoverProvider[]> = new Map();
  private definitionProviders: Map<string, DefinitionProvider[]> = new Map();
  private referenceProviders: Map<string, ReferenceProvider[]> = new Map();
  private documentSymbolProviders: Map<string, DocumentSymbolProvider[]> = new Map();
  private workspaceSymbolProviders: WorkspaceSymbolProvider[] = [];
  private codeActionProviders: Map<string, CodeActionProvider[]> = new Map();
  private codeLensProviders: Map<string, CodeLensProvider[]> = new Map();
  private formattingProviders: Map<string, DocumentFormattingEditProvider[]> = new Map();
  private rangeFormattingProviders: Map<string, DocumentRangeFormattingEditProvider[]> = new Map();
  private renameProviders: Map<string, RenameProvider[]> = new Map();
  private signatureHelpProviders: Map<string, SignatureHelpProvider[]> = new Map();
  private diagnosticCollections: Map<string, DiagnosticCollection> = new Map();

  /**
   * Register completion item provider
   */
  registerCompletionItemProvider(
    selector: string | string[],
    provider: CompletionItemProvider,
    ...triggerCharacters: string[]
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.completionProviders.has(language)) {
        this.completionProviders.set(language, []);
      }
      this.completionProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered completion provider for:', languages, 'triggers:', triggerCharacters);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.completionProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register hover provider
   */
  registerHoverProvider(
    selector: string | string[],
    provider: HoverProvider
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.hoverProviders.has(language)) {
        this.hoverProviders.set(language, []);
      }
      this.hoverProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered hover provider for:', languages);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.hoverProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register definition provider
   */
  registerDefinitionProvider(
    selector: string | string[],
    provider: DefinitionProvider
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.definitionProviders.has(language)) {
        this.definitionProviders.set(language, []);
      }
      this.definitionProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered definition provider for:', languages);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.definitionProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register reference provider
   */
  registerReferenceProvider(
    selector: string | string[],
    provider: ReferenceProvider
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.referenceProviders.has(language)) {
        this.referenceProviders.set(language, []);
      }
      this.referenceProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered reference provider for:', languages);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.referenceProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register document symbol provider
   */
  registerDocumentSymbolProvider(
    selector: string | string[],
    provider: DocumentSymbolProvider
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.documentSymbolProviders.has(language)) {
        this.documentSymbolProviders.set(language, []);
      }
      this.documentSymbolProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered document symbol provider for:', languages);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.documentSymbolProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register workspace symbol provider
   */
  registerWorkspaceSymbolProvider(
    provider: WorkspaceSymbolProvider
  ): { dispose: () => void } {
    this.workspaceSymbolProviders.push(provider);
    console.log('[Languages] Registered workspace symbol provider');

    return {
      dispose: () => {
        const index = this.workspaceSymbolProviders.indexOf(provider);
        if (index > -1) this.workspaceSymbolProviders.splice(index, 1);
      },
    };
  }

  /**
   * Register code action provider
   */
  registerCodeActionsProvider(
    selector: string | string[],
    provider: CodeActionProvider,
    metadata?: any
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.codeActionProviders.has(language)) {
        this.codeActionProviders.set(language, []);
      }
      this.codeActionProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered code action provider for:', languages);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.codeActionProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register code lens provider
   */
  registerCodeLensProvider(
    selector: string | string[],
    provider: CodeLensProvider
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.codeLensProviders.has(language)) {
        this.codeLensProviders.set(language, []);
      }
      this.codeLensProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered code lens provider for:', languages);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.codeLensProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register document formatting edit provider
   */
  registerDocumentFormattingEditProvider(
    selector: string | string[],
    provider: DocumentFormattingEditProvider
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.formattingProviders.has(language)) {
        this.formattingProviders.set(language, []);
      }
      this.formattingProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered formatting provider for:', languages);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.formattingProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register document range formatting edit provider
   */
  registerDocumentRangeFormattingEditProvider(
    selector: string | string[],
    provider: DocumentRangeFormattingEditProvider
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.rangeFormattingProviders.has(language)) {
        this.rangeFormattingProviders.set(language, []);
      }
      this.rangeFormattingProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered range formatting provider for:', languages);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.rangeFormattingProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register rename provider
   */
  registerRenameProvider(
    selector: string | string[],
    provider: RenameProvider
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.renameProviders.has(language)) {
        this.renameProviders.set(language, []);
      }
      this.renameProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered rename provider for:', languages);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.renameProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Register signature help provider
   */
  registerSignatureHelpProvider(
    selector: string | string[],
    provider: SignatureHelpProvider,
    ...triggerCharacters: string[]
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.signatureHelpProviders.has(language)) {
        this.signatureHelpProviders.set(language, []);
      }
      this.signatureHelpProviders.get(language)!.push(provider);
    }

    console.log('[Languages] Registered signature help provider for:', languages, 'triggers:', triggerCharacters);

    return {
      dispose: () => {
        for (const language of languages) {
          const providers = this.signatureHelpProviders.get(language);
          if (providers) {
            const index = providers.indexOf(provider);
            if (index > -1) providers.splice(index, 1);
          }
        }
      },
    };
  }

  /**
   * Create diagnostic collection
   */
  createDiagnosticCollection(name?: string): DiagnosticCollection {
    const collectionName = name || `collection-${this.diagnosticCollections.size}`;
    const diagnostics = new Map<string, any[]>();

    const collection: DiagnosticCollection = {
      name: collectionName,
      set: (uriOrEntries: string | Array<[string, any[]]>, diagnosticsArray?: any[]) => {
        if (typeof uriOrEntries === 'string') {
          diagnostics.set(uriOrEntries, diagnosticsArray || []);
        } else {
          for (const [uri, diags] of uriOrEntries) {
            diagnostics.set(uri, diags);
          }
        }
        console.log('[Languages] Set diagnostics for collection:', collectionName);
      },
      delete: (uri: string) => {
        diagnostics.delete(uri);
        console.log('[Languages] Deleted diagnostics for:', uri);
      },
      clear: () => {
        diagnostics.clear();
        console.log('[Languages] Cleared diagnostics collection:', collectionName);
      },
      forEach: (callback) => {
        diagnostics.forEach((diags, uri) => {
          callback(uri, diags, collection);
        });
      },
      get: (uri: string) => diagnostics.get(uri),
      has: (uri: string) => diagnostics.has(uri),
      dispose: () => {
        diagnostics.clear();
        this.diagnosticCollections.delete(collectionName);
        console.log('[Languages] Disposed diagnostic collection:', collectionName);
      },
    };

    this.diagnosticCollections.set(collectionName, collection);
    console.log('[Languages] Created diagnostic collection:', collectionName);

    return collection;
  }

  /**
   * Get languages
   */
  getLanguages(): string[] {
    return [
      'typescript', 'javascript', 'typescriptreact', 'javascriptreact',
      'python', 'go', 'rust', 'java', 'csharp', 'cpp', 'c',
      'php', 'ruby', 'json', 'markdown', 'html', 'css', 'scss',
      'yaml', 'xml', 'shellscript', 'plaintext',
    ];
  }

  /**
   * Set language configuration
   */
  setLanguageConfiguration(
    language: string,
    configuration: any
  ): { dispose: () => void } {
    console.log('[Languages] Set language configuration for:', language);

    return {
      dispose: () => {
        console.log('[Languages] Disposed language configuration for:', language);
      },
    };
  }

  /**
   * Get providers for language
   */
  getCompletionProviders(language: string): CompletionItemProvider[] {
    return this.completionProviders.get(language) || [];
  }

  getHoverProviders(language: string): HoverProvider[] {
    return this.hoverProviders.get(language) || [];
  }

  getDefinitionProviders(language: string): DefinitionProvider[] {
    return this.definitionProviders.get(language) || [];
  }

  getReferenceProviders(language: string): ReferenceProvider[] {
    return this.referenceProviders.get(language) || [];
  }

  getCodeActionProviders(language: string): CodeActionProvider[] {
    return this.codeActionProviders.get(language) || [];
  }
}

// Singleton instance
let languagesInstance: LanguagesAPI | null = null;

export function getLanguagesAPI(): LanguagesAPI {
  if (!languagesInstance) {
    languagesInstance = new LanguagesAPI();
  }
  return languagesInstance;
}

export const languages = getLanguagesAPI();
