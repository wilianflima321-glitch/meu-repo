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
