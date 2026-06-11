import * as monaco from 'monaco-editor';

import { SUPPORTED_LSP_LANGUAGES } from './monaco-lsp-bridge.config';

export interface MonacoLspProviderCallbacks {
  provideCompletionItems: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
  ) => Promise<monaco.languages.CompletionList | null>;
  provideHover: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ) => Promise<monaco.languages.Hover | null>;
  provideDefinition: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ) => Promise<monaco.languages.Definition | null>;
  provideReferences: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.ReferenceContext,
  ) => Promise<monaco.languages.Location[] | null>;
  provideSignatureHelp: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
  ) => Promise<monaco.languages.SignatureHelpResult | null>;
  provideDocumentFormatting: (
    model: monaco.editor.ITextModel,
    options: monaco.languages.FormattingOptions,
  ) => Promise<monaco.languages.TextEdit[] | null>;
  provideRenameEdits: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    newName: string,
  ) => Promise<monaco.languages.WorkspaceEdit | null>;
}

export function registerMonacoLspProviders(callbacks: MonacoLspProviderCallbacks): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = [];

  for (const language of SUPPORTED_LSP_LANGUAGES) {
    disposables.push(monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['.', ':', '<', '"', '/', '@', '#'],
      provideCompletionItems: callbacks.provideCompletionItems,
    }));
    disposables.push(monaco.languages.registerHoverProvider(language, {
      provideHover: callbacks.provideHover,
    }));
    disposables.push(monaco.languages.registerDefinitionProvider(language, {
      provideDefinition: callbacks.provideDefinition,
    }));
    disposables.push(monaco.languages.registerReferenceProvider(language, {
      provideReferences: callbacks.provideReferences,
    }));
    disposables.push(monaco.languages.registerSignatureHelpProvider(language, {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp: callbacks.provideSignatureHelp,
    }));
    disposables.push(monaco.languages.registerDocumentFormattingEditProvider(language, {
      provideDocumentFormattingEdits: callbacks.provideDocumentFormatting,
    }));
    disposables.push(monaco.languages.registerRenameProvider(language, {
      provideRenameEdits: callbacks.provideRenameEdits,
    }));
  }

  return disposables;
}
