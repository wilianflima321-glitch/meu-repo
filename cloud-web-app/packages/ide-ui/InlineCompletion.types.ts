// ============= Types =============

export interface CompletionSuggestion {
  id: string
  text: string
  displayText: string
  insertText: string
  range: {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  }
  source: 'ai' | 'lsp' | 'snippet'
  confidence: number
  model?: string
}

export interface InlineCompletionProps {
  // Editor state
  content: string
  cursorPosition: { line: number; column: number }
  language: string
  filePath: string

  // Callbacks
  onAccept: (suggestion: CompletionSuggestion) => void
  onReject: () => void
  onPartialAccept: (text: string) => void

  // Config
  enabled?: boolean
  debounceMs?: number
  maxSuggestions?: number
  showGhostText?: boolean
  model?: string
}

export interface GhostTextState {
  visible: boolean
  suggestion: CompletionSuggestion | null
  position: { top: number; left: number }
  loading: boolean
}
