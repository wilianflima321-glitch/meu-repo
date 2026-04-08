import * as monaco from 'monaco-editor'

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
  editor: monaco.editor.IStandaloneCodeEditor,
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
  const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
  editor.executeEdits('aethel-chat-apply', [{ range, text: code, forceMoveMarkers: true }])
  editor.focus()
  return { ok: true }
}

/** Insere um trecho no cursor sem substituir a selecao. */
export function insertSnippetAtCursor(
  editor: monaco.editor.IStandaloneCodeEditor,
  code: string
): ApplyBridgeResult {
  const model = editor.getModel()
  if (!model) return { ok: false, message: 'Editor sem modelo' }
  const position = editor.getPosition()
  if (!position) return { ok: false, message: 'Sem posicao do cursor' }
  const range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
  editor.executeEdits('aethel-chat-insert', [{ range, text: code, forceMoveMarkers: true }])
  editor.focus()
  return { ok: true }
}

export function replaceEntireDocument(
  editor: monaco.editor.IStandaloneCodeEditor,
  code: string
): ApplyBridgeResult {
  const model = editor.getModel()
  if (!model) return { ok: false, message: 'Editor sem modelo' }
  const fullRange = model.getFullModelRange()
  editor.executeEdits('aethel-chat-replace-doc', [{ range: fullRange, text: code, forceMoveMarkers: true }])
  editor.focus()
  return { ok: true }
}

/** Diff simples para blocos de chat; suficiente para staging inicial. */
export function buildChatDiffFile(path: string, oldContent: string, newContent: string): ChatDiffFile {
  if (oldContent === newContent) {
    return {
      path,
      oldContent,
      newContent,
      lines: [{ lineNumber: 1, content: '(sem alteracoes)', type: 'context' }],
    }
  }

  const lines: ChatDiffLine[] = []
  let lineNumber = 1

  for (const line of oldContent.split('\n')) {
    lines.push({ lineNumber: lineNumber++, content: line, type: 'removed' })
  }

  for (const line of newContent.split('\n')) {
    lines.push({ lineNumber: lineNumber++, content: line, type: 'added' })
  }

  return { path, oldContent, newContent, lines }
}
