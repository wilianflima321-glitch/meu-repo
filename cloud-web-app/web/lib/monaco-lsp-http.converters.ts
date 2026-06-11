import type * as monaco from 'monaco-editor';

// LSP Message Types
export interface LspResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | null;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export interface CompletionItem {
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

export interface CompletionList {
  isIncomplete: boolean;
  items: CompletionItem[];
}

export interface LspRange {
  start: { line: number; character: number };
  end: { line: number; character: number };
}

export interface Hover {
  contents: string | { kind: string; value: string } | Array<string | { language: string; value: string }>;
  range?: LspRange;
}

export interface SignatureHelp {
  signatures: {
    label: string;
    documentation?: string | { kind: string; value: string };
    parameters?: { label: string | [number, number]; documentation?: string | { kind: string; value: string } }[];
  }[];
  activeSignature?: number;
  activeParameter?: number;
}

export interface Location {
  uri: string;
  range: LspRange;
}

export interface Diagnostic {
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

export type MonacoApi = typeof import('monaco-editor');

export function getCompletionKind(monacoApi: MonacoApi, kind?: number): monaco.languages.CompletionItemKind {
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

export function getMarkerSeverity(monacoApi: MonacoApi, severity?: number): monaco.MarkerSeverity {
  const severities = monacoApi.MarkerSeverity;
  const map: Record<number, monaco.MarkerSeverity> = {
    1: severities.Error,
    2: severities.Warning,
    3: severities.Info,
    4: severities.Hint,
  };
  return map[severity || 1] || severities.Error;
}


export function toPosition(position: monaco.Position): { line: number; character: number } {
  return { line: position.lineNumber - 1, character: position.column - 1 };
}
export function toMonacoRange(range: LspRange): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}
export function toMonacoCompletionItem(
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
export function toMonacoHover(hover: Hover): monaco.languages.Hover {
  const contents: monaco.IMarkdownString[] = [];

  if (typeof hover.contents === 'string') {
    contents.push({ value: hover.contents });
  } else if (Array.isArray(hover.contents)) {
    for (const c of hover.contents) {
      if (typeof c === 'string') {
        contents.push({ value: c });
      } else if (hasLanguageValue(c)) {
        contents.push({ value: `\`\`\`${c.language}
${c.value}
\`\`\`` });
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
