/** Minimal editor contracts used by AI apply helpers without importing Monaco in shared AI modules. */

export interface EditorRangeLike {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export interface EditorSelectionLike extends EditorRangeLike {
  isEmpty(): boolean
}

export interface EditorModelLike {
  getFullModelRange(): EditorRangeLike
}

export interface StandaloneCodeEditorLike {
  getModel(): EditorModelLike | null
  getSelection(): EditorSelectionLike | null
  getPosition(): { lineNumber: number; column: number } | null
  executeEdits(source: string, edits: Array<{ range: EditorRangeLike; text: string; forceMoveMarkers?: boolean }>): void
  focus(): void
}
