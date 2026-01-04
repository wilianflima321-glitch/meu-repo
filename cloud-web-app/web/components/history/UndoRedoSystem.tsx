'use client'

import React, { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react'

// ============================================================================
// TYPES - Professional Undo/Redo System (like Premiere/Photoshop)
// ============================================================================

export interface HistoryAction {
  id: string
  type: string
  name: string              // Human-readable name for UI
  timestamp: number
  // State snapshots for undo/redo
  prevState: unknown
  nextState: unknown
  // Optional grouping for batch operations
  groupId?: string
}

export interface HistoryState {
  past: HistoryAction[]
  future: HistoryAction[]
  maxHistorySize: number
  isBatching: boolean
  batchGroupId: string | null
  batchActions: HistoryAction[]
}

type HistoryActionType =
  | { type: 'PUSH'; action: HistoryAction }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR' }
  | { type: 'START_BATCH'; groupId: string }
  | { type: 'END_BATCH' }
  | { type: 'SET_MAX_SIZE'; size: number }

// ============================================================================
// REDUCER
// ============================================================================

function historyReducer(state: HistoryState, action: HistoryActionType): HistoryState {
  switch (action.type) {
    case 'PUSH': {
      if (state.isBatching) {
        // Add to batch instead of history
        return {
          ...state,
          batchActions: [...state.batchActions, { ...action.action, groupId: state.batchGroupId ?? undefined }]
        }
      }
      
      // Trim history if exceeds max size
      let past = [...state.past, action.action]
      if (past.length > state.maxHistorySize) {
        past = past.slice(past.length - state.maxHistorySize)
      }
      
      return {
        ...state,
        past,
        future: [] // Clear redo stack on new action
      }
    }
    
    case 'UNDO': {
      if (state.past.length === 0) return state
      
      const lastAction = state.past[state.past.length - 1]
      
      // Check if this is part of a group - undo entire group
      if (lastAction.groupId) {
        const groupActions: HistoryAction[] = []
        let newPast = [...state.past]
        
        while (newPast.length > 0 && newPast[newPast.length - 1].groupId === lastAction.groupId) {
          groupActions.unshift(newPast.pop()!)
        }
        
        return {
          ...state,
          past: newPast,
          future: [...groupActions, ...state.future]
        }
      }
      
      return {
        ...state,
        past: state.past.slice(0, -1),
        future: [lastAction, ...state.future]
      }
    }
    
    case 'REDO': {
      if (state.future.length === 0) return state
      
      const nextAction = state.future[0]
      
      // Check if this is part of a group - redo entire group
      if (nextAction.groupId) {
        const groupActions: HistoryAction[] = []
        let newFuture = [...state.future]
        
        while (newFuture.length > 0 && newFuture[0].groupId === nextAction.groupId) {
          groupActions.push(newFuture.shift()!)
        }
        
        return {
          ...state,
          past: [...state.past, ...groupActions],
          future: newFuture
        }
      }
      
      return {
        ...state,
        past: [...state.past, nextAction],
        future: state.future.slice(1)
      }
    }
    
    case 'CLEAR':
      return {
        ...state,
        past: [],
        future: []
      }
    
    case 'START_BATCH':
      return {
        ...state,
        isBatching: true,
        batchGroupId: action.groupId,
        batchActions: []
      }
    
    case 'END_BATCH': {
      if (!state.isBatching || state.batchActions.length === 0) {
        return {
          ...state,
          isBatching: false,
          batchGroupId: null,
          batchActions: []
        }
      }
      
      // Combine batch actions into history
      let past = [...state.past, ...state.batchActions]
      if (past.length > state.maxHistorySize) {
        past = past.slice(past.length - state.maxHistorySize)
      }
      
      return {
        ...state,
        past,
        future: [],
        isBatching: false,
        batchGroupId: null,
        batchActions: []
      }
    }
    
    case 'SET_MAX_SIZE':
      return {
        ...state,
        maxHistorySize: action.size,
        past: state.past.slice(-action.size)
      }
    
    default:
      return state
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface HistoryContextValue {
  canUndo: boolean
  canRedo: boolean
  undoName: string | null
  redoName: string | null
  historyList: { id: string; name: string; isCurrent: boolean }[]
  
  pushAction: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void
  undo: () => HistoryAction | null
  redo: () => HistoryAction | null
  clear: () => void
  startBatch: (groupId: string) => void
  endBatch: () => void
  setMaxSize: (size: number) => void
  
  // Helper to execute an action with automatic undo/redo support
  executeWithHistory: <T>(
    name: string,
    execute: () => T,
    getState: () => unknown,
    setState: (state: unknown) => void
  ) => T
}

const HistoryContext = createContext<HistoryContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

interface HistoryProviderProps {
  children: React.ReactNode
  maxHistorySize?: number
  onUndo?: (action: HistoryAction) => void
  onRedo?: (action: HistoryAction) => void
}

export function HistoryProvider({
  children,
  maxHistorySize = 100,
  onUndo,
  onRedo
}: HistoryProviderProps) {
  const [state, dispatch] = useReducer(historyReducer, {
    past: [],
    future: [],
    maxHistorySize,
    isBatching: false,
    batchGroupId: null,
    batchActions: []
  })
  
  const idCounter = useRef(0)
  
  const pushAction = useCallback((action: Omit<HistoryAction, 'id' | 'timestamp'>) => {
    dispatch({
      type: 'PUSH',
      action: {
        ...action,
        id: `action-${++idCounter.current}`,
        timestamp: Date.now()
      }
    })
  }, [])
  
  const undo = useCallback(() => {
    if (state.past.length === 0) return null
    
    const action = state.past[state.past.length - 1]
    dispatch({ type: 'UNDO' })
    onUndo?.(action)
    
    return action
  }, [state.past, onUndo])
  
  const redo = useCallback(() => {
    if (state.future.length === 0) return null
    
    const action = state.future[0]
    dispatch({ type: 'REDO' })
    onRedo?.(action)
    
    return action
  }, [state.future, onRedo])
  
  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' })
  }, [])
  
  const startBatch = useCallback((groupId: string) => {
    dispatch({ type: 'START_BATCH', groupId })
  }, [])
  
  const endBatch = useCallback(() => {
    dispatch({ type: 'END_BATCH' })
  }, [])
  
  const setMaxSize = useCallback((size: number) => {
    dispatch({ type: 'SET_MAX_SIZE', size })
  }, [])
  
  const executeWithHistory = useCallback(<T,>(
    name: string,
    execute: () => T,
    getState: () => unknown,
    setState: (state: unknown) => void
  ): T => {
    const prevState = getState()
    const result = execute()
    const nextState = getState()
    
    pushAction({
      type: 'state-change',
      name,
      prevState,
      nextState
    })
    
    return result
  }, [pushAction])
  
  const value = useMemo<HistoryContextValue>(() => ({
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undoName: state.past.length > 0 ? state.past[state.past.length - 1].name : null,
    redoName: state.future.length > 0 ? state.future[0].name : null,
    historyList: [
      ...state.future.map((a, i) => ({ id: a.id, name: a.name, isCurrent: false })).reverse(),
      { id: 'current', name: 'Current State', isCurrent: true },
      ...state.past.map((a, i) => ({ id: a.id, name: a.name, isCurrent: false })).reverse()
    ],
    pushAction,
    undo,
    redo,
    clear,
    startBatch,
    endBatch,
    setMaxSize,
    executeWithHistory
  }), [state, pushAction, undo, redo, clear, startBatch, endBatch, setMaxSize, executeWithHistory])
  
  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  )
}

// ============================================================================
// HOOK
// ============================================================================

export function useHistory() {
  const context = useContext(HistoryContext)
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider')
  }
  return context
}

// ============================================================================
// HISTORY PANEL COMPONENT (like Photoshop's History panel)
// ============================================================================

interface HistoryPanelProps {
  maxVisible?: number
}

export function HistoryPanel({ maxVisible = 20 }: HistoryPanelProps) {
  const {
    canUndo,
    canRedo,
    undoName,
    redoName,
    historyList,
    undo,
    redo,
    clear
  } = useHistory()
  
  return (
    <div style={{
      background: '#1a1b1e',
      borderRadius: 4,
      padding: 8,
      minWidth: 200
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottom: '1px solid #373a40'
      }}>
        <span style={{ color: '#c1c2c5', fontSize: 12, fontWeight: 600 }}>History</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={undo}
            disabled={!canUndo}
            title={undoName ? `Undo: ${undoName}` : 'Nothing to undo'}
            style={{
              background: canUndo ? '#25262b' : 'transparent',
              border: '1px solid #373a40',
              borderRadius: 3,
              color: canUndo ? '#c1c2c5' : '#5c5f66',
              padding: '2px 6px',
              cursor: canUndo ? 'pointer' : 'not-allowed',
              fontSize: 11
            }}
          >
            ↶
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title={redoName ? `Redo: ${redoName}` : 'Nothing to redo'}
            style={{
              background: canRedo ? '#25262b' : 'transparent',
              border: '1px solid #373a40',
              borderRadius: 3,
              color: canRedo ? '#c1c2c5' : '#5c5f66',
              padding: '2px 6px',
              cursor: canRedo ? 'pointer' : 'not-allowed',
              fontSize: 11
            }}
          >
            ↷
          </button>
          <button
            onClick={clear}
            title="Clear history"
            style={{
              background: 'transparent',
              border: '1px solid #373a40',
              borderRadius: 3,
              color: '#868e96',
              padding: '2px 6px',
              cursor: 'pointer',
              fontSize: 11
            }}
          >
            🗑️
          </button>
        </div>
      </div>
      
      {/* History list */}
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {historyList.slice(0, maxVisible).map((item, index) => (
          <div
            key={item.id}
            style={{
              padding: '4px 8px',
              marginBottom: 2,
              borderRadius: 3,
              background: item.isCurrent ? '#339af0' : '#25262b',
              color: item.isCurrent ? '#fff' : '#909296',
              fontSize: 11,
              cursor: 'default',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span style={{ opacity: 0.6 }}>
              {item.isCurrent ? '●' : index < historyList.findIndex(h => h.isCurrent) ? '↑' : '↓'}
            </span>
            {item.name}
          </div>
        ))}
      </div>
      
      {historyList.length > maxVisible && (
        <div style={{ color: '#5c5f66', fontSize: 10, textAlign: 'center', marginTop: 4 }}>
          +{historyList.length - maxVisible} more
        </div>
      )}
    </div>
  )
}

// ============================================================================
// KEYBOARD SHORTCUTS HOOK
// ============================================================================

export function useHistoryShortcuts() {
  const { undo, redo, canUndo, canRedo } = useHistory()
  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
      }
      
      // Ctrl+Shift+Z / Cmd+Shift+Z = Redo
      // OR Ctrl+Y / Cmd+Y = Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault()
        if (canRedo) redo()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canUndo, canRedo])
}

// ============================================================================
// UTILITY: Create undoable state hook
// ============================================================================

export function useUndoableState<T>(
  initialState: T,
  actionName: string
): [T, (newState: T | ((prev: T) => T)) => void] {
  const { pushAction } = useHistory()
  const [state, setStateInternal] = React.useState<T>(initialState)
  const prevStateRef = useRef<T>(initialState)
  
  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setStateInternal(prev => {
      const next = typeof newState === 'function' ? (newState as (prev: T) => T)(prev) : newState
      
      pushAction({
        type: 'state-change',
        name: actionName,
        prevState: prevStateRef.current,
        nextState: next
      })
      
      prevStateRef.current = next
      return next
    })
  }, [pushAction, actionName])
  
  return [state, setState]
}

export default HistoryProvider
