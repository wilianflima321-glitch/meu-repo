import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('extensions/vscode-api/languages')

export type LanguageApiValue = unknown;
export type LanguageApiList = LanguageApiValue[];

/**
 * VS Code Languages API Implementation
 * Provides language-related functionality (providers, diagnostics)
 */

export interface CompletionItemProvider {
  provideCompletionItems(
    document: LanguageApiValue,
    position: LanguageApiValue,
    token: LanguageApiValue,
    context: LanguageApiValue
  ): LanguageApiList | Promise<LanguageApiList>;
  resolveCompletionItem?(item: LanguageApiValue, token: LanguageApiValue): LanguageApiValue | Promise<LanguageApiValue>;
}

export interface HoverProvider {
  provideHover(document: LanguageApiValue, position: LanguageApiValue, token: LanguageApiValue): LanguageApiValue | Promise<LanguageApiValue>;
}

export interface DefinitionProvider {
  provideDefinition(document: LanguageApiValue, position: LanguageApiValue, token: LanguageApiValue): LanguageApiValue | LanguageApiList | Promise<LanguageApiValue | LanguageApiList>;
}

export interface ReferenceProvider {
  provideReferences(
    document: LanguageApiValue,
    position: LanguageApiValue,
    context: LanguageApiValue,
    token: LanguageApiValue
  ): LanguageApiList | Promise<LanguageApiList>;
}

export interface DocumentSymbolProvider {
  provideDocumentSymbols(document: LanguageApiValue, token: LanguageApiValue): LanguageApiList | Promise<LanguageApiList>;
}

export interface WorkspaceSymbolProvider {
  provideWorkspaceSymbols(query: string, token: LanguageApiValue): LanguageApiList | Promise<LanguageApiList>;
  resolveWorkspaceSymbol?(symbol: LanguageApiValue, token: LanguageApiValue): LanguageApiValue | Promise<LanguageApiValue>;
}

export interface CodeActionProvider {
  provideCodeActions(
    document: LanguageApiValue,
    range: LanguageApiValue,
    context: LanguageApiValue,
    token: LanguageApiValue
  ): LanguageApiList | Promise<LanguageApiList>;
  resolveCodeAction?(codeAction: LanguageApiValue, token: LanguageApiValue): LanguageApiValue | Promise<LanguageApiValue>;
}

export interface CodeLensProvider {
  provideCodeLenses(document: LanguageApiValue, token: LanguageApiValue): LanguageApiList | Promise<LanguageApiList>;
  resolveCodeLens?(codeLens: LanguageApiValue, token: LanguageApiValue): LanguageApiValue | Promise<LanguageApiValue>;
}

export interface DocumentFormattingEditProvider {
  provideDocumentFormattingEdits(
    document: LanguageApiValue,
    options: LanguageApiValue,
    token: LanguageApiValue
  ): LanguageApiList | Promise<LanguageApiList>;
}

export interface DocumentRangeFormattingEditProvider {
  provideDocumentRangeFormattingEdits(
    document: LanguageApiValue,
    range: LanguageApiValue,
    options: LanguageApiValue,
    token: LanguageApiValue
  ): LanguageApiList | Promise<LanguageApiList>;
}

export interface RenameProvider {
  provideRenameEdits(
    document: LanguageApiValue,
    position: LanguageApiValue,
    newName: string,
    token: LanguageApiValue
  ): LanguageApiValue | Promise<LanguageApiValue>;
  prepareRename?(document: LanguageApiValue, position: LanguageApiValue, token: LanguageApiValue): LanguageApiValue | Promise<LanguageApiValue>;
}

export interface SignatureHelpProvider {
  provideSignatureHelp(
    document: LanguageApiValue,
    position: LanguageApiValue,
    token: LanguageApiValue,
    context: LanguageApiValue
  ): LanguageApiValue | Promise<LanguageApiValue>;
}

export interface DiagnosticCollection {
  name: string;
  set(uri: string, diagnostics: LanguageApiList): void;
  set(entries: Array<[string, LanguageApiList]>): void;
  delete(uri: string): void;
  clear(): void;
  forEach(callback: (uri: string, diagnostics: LanguageApiList, collection: DiagnosticCollection) => void): void;
  get(uri: string): LanguageApiList | undefined;
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

    log.info('[Languages] Registered completion provider for:', languages, 'triggers:', triggerCharacters);

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

    log.info('[Languages] Registered hover provider for:', languages);

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

    log.info('[Languages] Registered definition provider for:', languages);

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

    log.info('[Languages] Registered reference provider for:', languages);

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

    log.info('[Languages] Registered document symbol provider for:', languages);

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
    log.info('[Languages] Registered workspace symbol provider');

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
    metadata?: LanguageApiValue
  ): { dispose: () => void } {
    const languages = Array.isArray(selector) ? selector : [selector];

    for (const language of languages) {
      if (!this.codeActionProviders.has(language)) {
        this.codeActionProviders.set(language, []);
      }
      this.codeActionProviders.get(language)!.push(provider);
    }

    log.info('[Languages] Registered code action provider for:', languages);

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

    log.info('[Languages] Registered code lens provider for:', languages);

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

    log.info('[Languages] Registered formatting provider for:', languages);

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

    log.info('[Languages] Registered range formatting provider for:', languages);

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

    log.info('[Languages] Registered rename provider for:', languages);

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

    log.info('[Languages] Registered signature help provider for:', languages, 'triggers:', triggerCharacters);

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
    const diagnostics = new Map<string, LanguageApiList>();

    const collection: DiagnosticCollection = {
      name: collectionName,
      set: (uriOrEntries: string | Array<[string, LanguageApiList]>, diagnosticsArray?: LanguageApiList) => {
        if (typeof uriOrEntries === 'string') {
          diagnostics.set(uriOrEntries, diagnosticsArray || []);
        } else {
          for (const [uri, diags] of uriOrEntries) {
            diagnostics.set(uri, diags);
          }
        }
        log.info('[Languages] Set diagnostics for collection:', collectionName);
      },
      delete: (uri: string) => {
        diagnostics.delete(uri);
        log.info('[Languages] Deleted diagnostics for:', uri);
      },
      clear: () => {
        diagnostics.clear();
        log.info('[Languages] Cleared diagnostics collection:', collectionName);
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
        log.info('[Languages] Disposed diagnostic collection:', collectionName);
      },
    };

    this.diagnosticCollections.set(collectionName, collection);
    log.info('[Languages] Created diagnostic collection:', collectionName);

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
    configuration: LanguageApiValue
  ): { dispose: () => void } {
    log.info('[Languages] Set language configuration for:', language);

    return {
      dispose: () => {
        log.info('[Languages] Disposed language configuration for:', language);
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
