import type { StandaloneCodeEditorLike } from '@/lib/editor/editor-structural-types'
import { diffLineOps } from '@/lib/ai/diff-line-ops'

/** Diff em memoria para staging; `buildChatDiffFile` alimenta o painel Diff do chat. */
export type ChatDiffLine = {
  lineNumber: number
  content: string
  type: 'added' | 'removed' | 'unchanged' | 'context'
}

export type ChatDiffFile = {
  path: string
  oldContent: string
  newContent: string
  lines: ChatDiffLine[]
}

export type ApplyBridgeResult = { ok: true } | { ok: false; message: string }

/**
 * Substitui a selecao atual; se estiver vazia, insere no cursor.
 */
export function applySnippetAtCursor(
  editor: StandaloneCodeEditorLike,
  code: string
): ApplyBridgeResult {
  const model = editor.getModel()
  if (!model) return { ok: false, message: 'Editor sem modelo' }
  const selection = editor.getSelection()
  if (selection && !selection.isEmpty()) {
    editor.executeEdits('aethel-chat-apply', [{ range: selection, text: code, forceMoveMarkers: true }])
    editor.focus()
    return { ok: true }
  }

  const position = editor.getPosition()
  if (!position) return { ok: false, message: 'Sem posicao do cursor' }
  const range = {
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  }
  editor.executeEdits('aethel-chat-apply', [{ range, text: code, forceMoveMarkers: true }])
  editor.focus()
  return { ok: true }
}

/** Insere um trecho no cursor sem substituir a selecao. */
export function insertSnippetAtCursor(
  editor: StandaloneCodeEditorLike,
  code: string
): ApplyBridgeResult {
  const model = editor.getModel()
  if (!model) return { ok: false, message: 'Editor sem modelo' }
  const position = editor.getPosition()
  if (!position) return { ok: false, message: 'Sem posicao do cursor' }
  const range = {
    startLineNumber: position.lineNumber,
    startColumn: position.column,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  }
  editor.executeEdits('aethel-chat-insert', [{ range, text: code, forceMoveMarkers: true }])
  editor.focus()
  return { ok: true }
}

export function replaceEntireDocument(
  editor: StandaloneCodeEditorLike,
  code: string
): ApplyBridgeResult {
  const model = editor.getModel()
  if (!model) return { ok: false, message: 'Editor sem modelo' }
  const fullRange = model.getFullModelRange()
  editor.executeEdits('aethel-chat-replace-doc', [{ range: fullRange, text: code, forceMoveMarkers: true }])
  editor.focus()
  return { ok: true }
}

/**
 * Builds a real unified line diff (LCS based) for the chat/proposal panels, so
 * "lines changed" counts reflect only actual edits instead of treating the whole
 * file as removed + re-added.
 */
export function buildChatDiffFile(path: string, oldContent: string, newContent: string): ChatDiffFile {
  if (oldContent === newContent) {
    return {
      path,
      oldContent,
      newContent,
      lines: [{ lineNumber: 1, content: '(no changes)', type: 'context' }],
    }
  }

  const { ops } = diffLineOps(oldContent, newContent)
  const lines: ChatDiffLine[] = ops.map((op): ChatDiffLine => {
    if (op.type === 'equal') {
      return { lineNumber: op.newLine, content: op.text, type: 'unchanged' }
    }
    if (op.type === 'del') {
      return { lineNumber: op.oldLine, content: op.text, type: 'removed' }
    }
    return { lineNumber: op.newLine, content: op.text, type: 'added' }
  })

  return { path, oldContent, newContent, lines }
}
