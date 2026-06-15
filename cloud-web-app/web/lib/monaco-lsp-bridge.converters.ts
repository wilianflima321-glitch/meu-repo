// @aethel-heavy-async-boundary IDE/Monaco runtime module; never import from public/dashboard/admin route shells.
import * as monaco from 'monaco-editor';

import { LSP_COMPLETION_KIND_MAP } from './monaco-lsp-bridge.maps';
import type { CompletionItem, Hover, Range } from './monaco-lsp-bridge.types';

export function toMonacoRange(range: Range): monaco.IRange {
  return {
    startLineNumber: range.start.line + 1,
    startColumn: range.start.character + 1,
    endLineNumber: range.end.line + 1,
    endColumn: range.end.character + 1,
  };
}

export function toMonacoCompletionItem(
  item: CompletionItem,
  position: monaco.Position,
): monaco.languages.CompletionItem {
  const range = item.textEdit?.range
    ? toMonacoRange(item.textEdit.range)
    : {
        startLineNumber: position.lineNumber,
        startColumn: position.column,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      };

  let documentation: string | monaco.IMarkdownString | undefined;
  if (typeof item.documentation === 'string') {
    documentation = item.documentation;
  } else if (item.documentation && typeof item.documentation === 'object' && 'value' in item.documentation) {
    documentation = { value: item.documentation.value };
  }

  return {
    label: item.label,
    kind: LSP_COMPLETION_KIND_MAP[item.kind || 1] || monaco.languages.CompletionItemKind.Text,
    detail: item.detail,
    documentation,
    insertText: item.insertText || item.textEdit?.newText || item.label,
    insertTextRules: item.insertTextFormat === 2
      ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
      : undefined,
    range,
    sortText: item.sortText,
    filterText: item.filterText,
    preselect: item.preselect,
  };
}

export function toMonacoHoverContents(result: Hover): monaco.IMarkdownString[] {
  const contents: monaco.IMarkdownString[] = [];

  if (typeof result.contents === 'string') {
    contents.push({ value: result.contents });
  } else if (Array.isArray(result.contents)) {
    for (const c of result.contents) {
      if (typeof c === 'string') {
        contents.push({ value: c });
      } else {
        contents.push({ value: `\`\`\`${c.language}\n${c.value}\n\`\`\`` });
      }
    }
  } else if ('value' in result.contents) {
    contents.push({ value: result.contents.value });
  }

  return contents;
}
