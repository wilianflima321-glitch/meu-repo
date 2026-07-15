'use client';

import type { Monaco } from '@monaco-editor/react';
import type * as monacoEditor from 'monaco-editor';

import type { DocumentSymbol, SymbolKind } from '@/components/outline/OutlinePanel';

type TypeScriptTextSpan = {
  start: number;
  length: number;
};

type TypeScriptNavigationTree = {
  text?: string;
  kind?: string;
  kindModifiers?: string;
  spans?: TypeScriptTextSpan[];
  nameSpan?: TypeScriptTextSpan;
  childItems?: TypeScriptNavigationTree[];
};

function clampOffset(model: monacoEditor.editor.ITextModel, offset: number): number {
  return Math.max(0, Math.min(offset, model.getValueLength()));
}

function toSymbolRange(
  model: monacoEditor.editor.ITextModel,
  span: TypeScriptTextSpan,
): DocumentSymbol['range'] {
  const start = model.getPositionAt(clampOffset(model, span.start));
  const end = model.getPositionAt(clampOffset(model, span.start + Math.max(span.length, 0)));

  return {
    startLine: start.lineNumber,
    startColumn: start.column,
    endLine: end.lineNumber,
    endColumn: end.column,
  };
}

function mergeNavigationSpans(spans: TypeScriptTextSpan[] | undefined): TypeScriptTextSpan | null {
  if (!Array.isArray(spans) || spans.length === 0) return null;

  let start = Number.POSITIVE_INFINITY;
  let end = 0;

  for (const span of spans) {
    start = Math.min(start, span.start);
    end = Math.max(end, span.start + Math.max(span.length, 0));
  }

  if (!Number.isFinite(start)) return null;
  return {
    start,
    length: Math.max(0, end - start),
  };
}

export function mapTypeScriptNavigationKind(kind: string | undefined): SymbolKind {
  switch (kind) {
    case 'module':
    case 'external module name':
      return 'module';
    case 'namespace':
      return 'namespace';
    case 'class':
    case 'local class':
      return 'class';
    case 'interface':
      return 'interface';
    case 'enum':
      return 'enum';
    case 'enum member':
      return 'enumMember';
    case 'type':
    case 'type alias':
      return 'typeParameter';
    case 'constructor':
      return 'constructor';
    case 'member function':
      return 'method';
    case 'function':
    case 'local function':
      return 'function';
    case 'getter':
    case 'setter':
    case 'member variable':
    case 'member accessor':
    case 'property':
      return 'property';
    case 'const':
      return 'constant';
    case 'let':
    case 'var':
    case 'variable':
    case 'local var':
      return 'variable';
    default:
      if (!kind) return 'variable';
      if (kind.includes('class')) return 'class';
      if (kind.includes('interface')) return 'interface';
      if (kind.includes('enum member')) return 'enumMember';
      if (kind.includes('enum')) return 'enum';
      if (kind.includes('constructor')) return 'constructor';
      if (kind.includes('function')) return 'function';
      if (kind.includes('method')) return 'method';
      if (kind.includes('property') || kind.includes('variable')) return 'property';
      if (kind.includes('const')) return 'constant';
      if (kind.includes('module')) return 'module';
      if (kind.includes('namespace')) return 'namespace';
      if (kind.includes('type')) return 'typeParameter';
      return 'variable';
  }
}

export function mapTypeScriptNavigationTree(
  model: monacoEditor.editor.ITextModel,
  items: TypeScriptNavigationTree[] | undefined,
): DocumentSymbol[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  return items.flatMap((item) => {
    const fullSpan = mergeNavigationSpans(item.spans);
    if (!item.text || !fullSpan) return [];

    const childSymbols = mapTypeScriptNavigationTree(model, item.childItems);
    const selectionSpan = item.nameSpan ?? fullSpan;

    return [
      {
        name: item.text,
        kind: mapTypeScriptNavigationKind(item.kind),
        deprecated: item.kindModifiers?.includes('deprecated') || undefined,
        range: toSymbolRange(model, fullSpan),
        selectionRange: toSymbolRange(model, selectionSpan),
        children: childSymbols.length > 0 ? childSymbols : undefined,
      },
    ] satisfies DocumentSymbol[];
  });
}

export async function resolveAuthoritativeDocumentSymbols(
  monaco: Monaco,
  model: monacoEditor.editor.ITextModel,
): Promise<DocumentSymbol[] | null> {
  const languageId = model.getLanguageId();
  const typescriptWorkerFactory =
    languageId === 'typescript' || languageId === 'typescriptreact'
      ? monaco.languages.typescript.getTypeScriptWorker
      : languageId === 'javascript' || languageId === 'javascriptreact'
        ? monaco.languages.typescript.getJavaScriptWorker
        : null;

  if (!typescriptWorkerFactory) {
    return null;
  }

  const getWorker = await typescriptWorkerFactory();
  const worker = await getWorker(model.uri);
  const navigationTree = await (
    worker as { getNavigationTree?: (fileName: string) => Promise<TypeScriptNavigationTree | undefined> }
  ).getNavigationTree?.(model.uri.toString());

  if (!navigationTree) {
    return [];
  }

  return mapTypeScriptNavigationTree(model, navigationTree.childItems);
}
