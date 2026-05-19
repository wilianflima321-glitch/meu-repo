/**
 * Monaco LSP HTTP Client
 *
 * Conecta Monaco Editor ao LSP server via HTTP API.
 * Mais simples que WebSocket para requests pontuais.
 */

import type * as monaco from 'monaco-editor';

import {createComponentLogger, logger} from '@/lib/observability/logger'

const log = createComponentLogger('monaco-lsp-http')

// LSP Message Types
interface LspResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | null;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

interface CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
  insertTextFormat?: number;
  textEdit?: { range: LspRange; newText: string };
  additionalTextEdits?: { range: LspRange; newText: string }[];
  sortText?: string;
  filterText?: string;
  preselect?: boolean;
}

interface CompletionList {
  isIncomplete: boolean;
  items: CompletionItem[];
}

interface LspRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

interface Hover {
  contents: string | { kind: string; value: string } | Array<string | { language: string; value: string }>;
  range?: LspRange;
}

interface SignatureHelp {
  signatures: {
    label: string;
    documentation?: string | { kind: string; value: string };
    parameters?: { label: string | [number, number]; documentation?: string | { kind: string; value: string } }[];
  }[];
  activeSignature?: number;
  activeParameter?: number;
}

interface Location {
  uri: string;
  range: LspRange;
}

interface Diagnostic {
  range: LspRange;
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
}

function hasStringValue(value: unknown): value is { value: string } {
  return value !== null && typeof value === 'object' && 'value' in value && typeof value.value === 'string';
}

function hasLanguageValue(value: unknown): value is { language: string; value: string } {
  return (
    value !== null &&
    typeof value === 'object' &&
    'language' in value &&
    'value' in value &&
    typeof value.language === 'string' &&
    typeof value.value === 'string'
  );
}

type MonacoApi = typeof import('monaco-editor');

function getCompletionKind(monacoApi: MonacoApi, kind?: number): monaco.languages.CompletionItemKind {
  const kinds = monacoApi.languages.CompletionItemKind;
  const map: Record<number, monaco.languages.CompletionItemKind> = {
    1: kinds.Text,
    2: kinds.Method,
    3: kinds.Function,
    4: kinds.Constructor,
    5: kinds.Field,
    6: kinds.Variable,
    7: kinds.Class,
    8: kinds.Interface,
    9: kinds.Module,
    10: kinds.Property,
    11: kinds.Unit,
    12: kinds.Value,
    13: kinds.Enum,
    14: kinds.Keyword,
    15: kinds.Snippet,
    16: kinds.Color,
    17: kinds.File,
    18: kinds.Reference,
    19: kinds.Folder,
    20: kinds.EnumMember,
    21: kinds.Constant,
    22: kinds.Struct,
    23: kinds.Event,
    24: kinds.Operator,
    25: kinds.TypeParameter,
  };
  return map[kind || 1] || kinds.Text;
}

function getMarkerSeverity(monacoApi: MonacoApi, severity?: number): monaco.MarkerSeverity {
  const severities = monacoApi.MarkerSeverity;
  const map: Record<number, monaco.MarkerSeverity> = {
    1: severities.Error,
    2: severities.Warning,
    3: severities.Info,
    4: severities.Hint,
  };
  return map[severity || 1] || severities.Error;
}

// Singleton state
interface LspState {
  initialized: Map<string, boolean>;
  requestId: number;
}

const lspState: LspState = {
  initialized: new Map(),
  requestId: 0,
};

/**
 * Send LSP request via HTTP API
 */
async function sendLspRequest<T>(
  language: string,
  method: string,
  params: unknown
): Promise<T | null> {
  try {
    const response = await fetch('/api/lsp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        method,
        params,
        id: ++lspState.requestId,
      }),
    });

    if (!response.ok) {
      logger.warn(`[LSP HTTP] Request failed: ${response.status}`);
      return null;
    }

    const data: LspResponse<T> = await response.json();

    if (data.error) {
      logger.warn(`[LSP HTTP] Error:`, data.error);
      return null;
    }

    return data.result ?? null;
  } catch (error) {
    logger.error('[LSP HTTP] Request error:', error);
    return null;
  }
}

/**
 * Initialize LSP for a language (if not already)
 */
async function ensureInitialized(language: string, documentUri: string): Promise<boolean> {
  const key = `${language}`;

  if (lspState.initialized.get(key)) {
    return true;
  }

  try {
    const result = await sendLspRequest(language, 'initialize', {
      processId: null,
      capabilities: {
        textDocument: {
          synchronization: { didSave: true },
          completion: {
            completionItem: { snippetSupport: true, documentationFormat: ['markdown', 'plaintext'] },
            contextSupport: true,
          },
          hover: { contentFormat: ['markdown', 'plaintext'] },
          signatureHelp: { signatureInformation: { documentationFormat: ['markdown', 'plaintext'] } },
          definition: {},
          references: {},
          documentHighlight: {},
          codeAction: {},
          formatting: {},
          rename: { prepareSupport: true },
          publishDiagnostics: { relatedInformation: true },
        },
        workspace: { applyEdit: true, workspaceFolders: true },
      },
      rootUri: 'file:///workspace',
      workspaceFolders: [{ uri: 'file:///workspace', name: 'workspace' }],
    });

    if (result) {
      lspState.initialized.set(key, true);
      // Send initialized notification
      await sendLspRequest(language, 'initialized', {});
      return true;
    }
    return false;
  } catch (error) {
    logger.error('[LSP HTTP] Initialize failed:', error);
    return false;
  }
}

/**
 * Convert Monaco position to LSP position
 */
function toPosition(position: monaco.Position): { line: number; character: number } {
  return { line: position.lineNumber - 1, character: position.column - 1 };
}

/**
 * Convert LSP range to Monaco range
 */
function toMonacoRange(range: LspRange): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

/**
 * Convert LSP completion item to Monaco
 */
function toMonacoCompletionItem(
  monacoApi: MonacoApi,
  item: CompletionItem,
  range: monaco.IRange
): monaco.languages.CompletionItem {
  let documentation: monaco.languages.CompletionItem['documentation'];
  if (typeof item.documentation === 'string') {
    documentation = item.documentation;
  } else if (hasStringValue(item.documentation)) {
    documentation = { value: item.documentation.value };
  }

  return {
    label: item.label,
    kind: getCompletionKind(monacoApi, item.kind),
    detail: item.detail,
    documentation,
    insertText: item.insertText || item.label,
    insertTextRules: item.insertTextFormat === 2
      ? monacoApi.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    range: item.textEdit ? toMonacoRange(item.textEdit.range) : range,
    sortText: item.sortText,
    filterText: item.filterText,
    preselect: item.preselect,
  };
}

/**
 * Convert LSP hover to Monaco
 */
function toMonacoHover(hover: Hover): monaco.languages.Hover {
  const contents: monaco.IMarkdownString[] = [];

  if (typeof hover.contents === 'string') {
    contents.push({ value: hover.contents });
  } else if (Array.isArray(hover.contents)) {
    for (const c of hover.contents) {
      if (typeof c === 'string') {
        contents.push({ value: c });
      } else if (hasLanguageValue(c)) {
        contents.push({ value: `\`\`\`${c.language}\n${c.value}\n\`\`\`` });
      }
    }
  } else if (hasStringValue(hover.contents)) {
    contents.push({ value: hover.contents.value });
  }

  return {
    contents,
    range: hover.range ? toMonacoRange(hover.range) : undefined,
  };
}

/**
 * Monaco Completion Provider using LSP HTTP
 */
export function createLspCompletionProvider(
  monacoApi: MonacoApi,
  language: string
): monaco.languages.CompletionItemProvider {
  return {
    triggerCharacters: ['.', ':', '<', '"', "'", '/', '@', '*'],

    async provideCompletionItems(
      model,
      position,
      _context,
      _token
    ): Promise<monaco.languages.CompletionList | null> {
      const uri = model.uri.toString();
      await ensureInitialized(language, uri);

      // Send didOpen if needed (simplified - in real app track open documents)
      await sendLspRequest(language, 'textDocument/didOpen', {
        textDocument: {
          uri,
          languageId: language,
          version: model.getVersionId(),
          text: model.getValue(),
        },
      });

      const result = await sendLspRequest<CompletionList | CompletionItem[]>(
        language,
        'textDocument/completion',
        {
          textDocument: { uri },
          position: toPosition(position),
          context: { triggerKind: 1 },
        }
      );

      if (!result) {
        return { suggestions: [] };
      }

      const items = Array.isArray(result) ? result : result.items;
      const word = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };

      return {
        suggestions: items.map((item) => toMonacoCompletionItem(monacoApi, item, range)),
        incomplete: !Array.isArray(result) && result.isIncomplete,
      };
    },
  };
}

/**
 * Monaco Hover Provider using LSP HTTP
 */
export function createLspHoverProvider(language: string): monaco.languages.HoverProvider {
  return {
    async provideHover(model, position): Promise<monaco.languages.Hover | null> {
      const uri = model.uri.toString();
      await ensureInitialized(language, uri);

      const result = await sendLspRequest<Hover>(language, 'textDocument/hover', {
        textDocument: { uri },
        position: toPosition(position),
      });

      if (!result) {
        return null;
      }

      return toMonacoHover(result);
    },
  };
}

/**
 * Monaco Signature Help Provider using LSP HTTP
 */
export function createLspSignatureHelpProvider(language: string): monaco.languages.SignatureHelpProvider {
  return {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],

    async provideSignatureHelp(model, position): Promise<monaco.languages.SignatureHelpResult | null> {
      const uri = model.uri.toString();
      await ensureInitialized(language, uri);

      const result = await sendLspRequest<SignatureHelp>(language, 'textDocument/signatureHelp', {
        textDocument: { uri },
        position: toPosition(position),
      });

      if (!result || !result.signatures || result.signatures.length === 0) {
        return null;
      }

      const signatures: monaco.languages.SignatureInformation[] = result.signatures.map((sig) => ({
        label: sig.label,
        documentation: typeof sig.documentation === 'string'
          ? sig.documentation
          : sig.documentation?.value,
        parameters: sig.parameters?.map((p) => ({
          label: typeof p.label === 'string' ? p.label : [p.label[0], p.label[1]],
          documentation: typeof p.documentation === 'string'
            ? p.documentation
            : hasStringValue(p.documentation)
              ? p.documentation.value
              : undefined,
        })) || [],
      }));

      return {
        value: {
          signatures,
          activeSignature: result.activeSignature ?? 0,
          activeParameter: result.activeParameter ?? 0,
        },
        dispose: () => {},
      };
    },
  };
}

/**
 * Monaco Definition Provider using LSP HTTP
 */
export function createLspDefinitionProvider(
  monacoApi: MonacoApi,
  language: string
): monaco.languages.DefinitionProvider {
  return {
    async provideDefinition(model, position): Promise<monaco.languages.Definition | null> {
      const uri = model.uri.toString();
      await ensureInitialized(language, uri);

      const result = await sendLspRequest<Location | Location[]>(language, 'textDocument/definition', {
        textDocument: { uri },
        position: toPosition(position),
      });

      if (!result) {
        return null;
      }

      const locations = Array.isArray(result) ? result : [result];
      return locations.map((loc) => ({
        uri: monacoApi.Uri.parse(loc.uri),
        range: toMonacoRange(loc.range),
      }));
    },
  };
}

/**
 * Monaco References Provider using LSP HTTP
 */
export function createLspReferencesProvider(
  monacoApi: MonacoApi,
  language: string
): monaco.languages.ReferenceProvider {
  return {
    async provideReferences(model, position, context): Promise<monaco.languages.Location[] | null> {
      const uri = model.uri.toString();
      await ensureInitialized(language, uri);

      const result = await sendLspRequest<Location[]>(language, 'textDocument/references', {
        textDocument: { uri },
        position: toPosition(position),
        context: { includeDeclaration: context.includeDeclaration },
      });

      if (!result) {
        return null;
      }

      return result.map((loc) => ({
        uri: monacoApi.Uri.parse(loc.uri),
        range: toMonacoRange(loc.range),
      }));
    },
  };
}

/**
 * Register all LSP providers for a language in Monaco
 */
export function registerLspProviders(
  monaco: MonacoApi,
  language: string
): monaco.IDisposable[] {
  const disposables: monaco.IDisposable[] = [];

  disposables.push(
    monaco.languages.registerCompletionItemProvider(language, createLspCompletionProvider(monaco, language))
  );

  disposables.push(
    monaco.languages.registerHoverProvider(language, createLspHoverProvider(language))
  );

  disposables.push(
    monaco.languages.registerSignatureHelpProvider(language, createLspSignatureHelpProvider(language))
  );

  disposables.push(
    monaco.languages.registerDefinitionProvider(language, createLspDefinitionProvider(monaco, language))
  );

  disposables.push(
    monaco.languages.registerReferenceProvider(language, createLspReferencesProvider(monaco, language))
  );

  log.info(`[LSP HTTP] Registered providers for language: ${language}`);
  return disposables;
}

/**
 * Get diagnostics for a document
 */
export async function getDiagnostics(
  language: string,
  uri: string,
  content: string
): Promise<Diagnostic[]> {
  await ensureInitialized(language, uri);

  // Send didOpen/didChange
  await sendLspRequest(language, 'textDocument/didOpen', {
    textDocument: { uri, languageId: language, version: 1, text: content },
  });

  // LSP typically sends diagnostics via notification, but we can request via pulling
  // For now return empty - would need to implement proper diagnostic pull
  return [];
}

/**
 * Apply diagnostics to Monaco editor
 */
export function applyDiagnosticsToMonaco(
  monaco: MonacoApi,
  model: monaco.editor.ITextModel,
  diagnostics: Diagnostic[]
): void {
  const markers: monaco.editor.IMarkerData[] = diagnostics.map((d) => ({
    severity: getMarkerSeverity(monaco, d.severity),
    message: d.message,
    startLineNumber: d.range.start.line + 1,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1,
    endColumn: d.range.end.character + 1,
    source: d.source,
    code: d.code?.toString(),
  }));

  monaco.editor.setModelMarkers(model, 'lsp', markers);
}

const monacoLspHttp = {
  registerLspProviders,
  createLspCompletionProvider,
  createLspHoverProvider,
  createLspSignatureHelpProvider,
  createLspDefinitionProvider,
  createLspReferencesProvider,
  getDiagnostics,
  applyDiagnosticsToMonaco,
};

export default monacoLspHttp;
