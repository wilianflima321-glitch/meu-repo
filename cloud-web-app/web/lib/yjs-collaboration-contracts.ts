export interface UserInfo {
  id: string
  name: string
  color: string
  avatar?: string
  cursor?: CursorPosition
  selection?: SelectionRange
}

export interface CursorPosition {
  x: number
  y: number
  z?: number
  filePath?: string
  pane?: string
  line?: number
  column?: number
}

export interface SelectionRange {
  filePath?: string
  pane?: string
  start: { index: number; length: number }
  end: { index: number; length: number }
}

export interface CollaborationConfig {
  documentName: string
  serverUrl?: string
  persistenceEnabled?: boolean
  persistenceName?: string
  user: { id: string; name: string; color?: string }
  onSync?: () => void
  onPersistenceSync?: () => void
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
  onAwarenessChange?: (users: Map<number, UserInfo>) => void
}

export interface SceneObject {
  id: string
  type: string
  name: string
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  scale: { x: number; y: number; z: number }
  visible: boolean
  locked: boolean
  lockedBy?: string
  parentId?: string
  children?: string[]
  properties: Record<string, unknown>
}

export type CollaborationEventListener = (data: unknown) => void

export interface MonacoPosition { lineNumber: number; column: number }

export interface MonacoRangeLike {
  startLineNumber: number
  startColumn: number
  endLineNumber: number
  endColumn: number
}

export interface MonacoContentChange {
  range: { startLineNumber: number; startColumn: number }
  rangeLength: number
  text: string
}

export interface MonacoModelLike {
  getValue(): string
  setValue(value: string): void
  getPositionAt(offset: number): MonacoPosition
  getOffsetAt(position: MonacoPosition): number
  onDidChangeContent(callback: (event: { changes: MonacoContentChange[] }) => void): { dispose: () => void }
}

export interface MonacoEditorLike {
  getModel(): MonacoModelLike | null
  executeEdits(source: string, edits: Array<{ range: MonacoRangeLike; text: string }>): void
}

export interface YTextDelta {
  retain?: number
  insert?: string
  delete?: number
}

export interface UseCollaborationOptions {
  documentName: string
  serverUrl?: string
  persistenceEnabled?: boolean
  persistenceName?: string
  userId: string
  userName: string
  userColor?: string
}

export interface UseCollaborationResult<TSession = unknown> {
  session: TSession | null
  isConnected: boolean
  isSynced: boolean
  isPersistenceSynced: boolean
  users: UserInfo[]
  error: Error | null
  connect: () => Promise<void>
  disconnect: () => void
  updateCursor: (position: CursorPosition) => void
  updateSelection: (selection: SelectionRange | null) => void
}

export interface MonacoBinding {
  destroy: () => void
}
