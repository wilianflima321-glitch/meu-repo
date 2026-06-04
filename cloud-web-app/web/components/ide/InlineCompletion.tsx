'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { DEFAULT_OPENROUTER_MODEL_ID } from '@/lib/ai/openrouter-models'
import {
  CompletionLoading,
  GhostTextOverlay,
  GhostTextProvider,
  useDebounce,
  type GhostTextState,
  type InlineCompletionProps,
} from './InlineCompletion.parts'

export { CompletionSettings, CompletionStatusBar } from './InlineCompletion.parts'

// ============= Main Component =============

export default function InlineCompletion({
  content,
  cursorPosition,
  language,
  filePath,
  onAccept,
  onReject,
  onPartialAccept,
  enabled = true,
  debounceMs = 500,
  maxSuggestions = 1,
  showGhostText = true,
  model = DEFAULT_OPENROUTER_MODEL_ID,
}: InlineCompletionProps) {
  const [ghostText, setGhostText] = useState<GhostTextState>({
    visible: false,
    suggestion: null,
    position: { top: 0, left: 0 },
    loading: false,
  })

  const providerRef = useRef<GhostTextProvider>(new GhostTextProvider())
  const debouncedPosition = useDebounce(cursorPosition, debounceMs)
  const debouncedContent = useDebounce(content, debounceMs)

  // Calculate ghost text position (this would need editor coordinates in real impl)
  const calculatePosition = useCallback((line: number, column: number) => {
    // In real implementation, this would use editor's coordinate system
    const lineHeight = 20 // px
    const charWidth = 8.4 // px (monospace)

    return {
      top: line * lineHeight,
      left: column * charWidth,
    }
  }, [])

  // Fetch completion when cursor moves (debounced)
  useEffect(() => {
    if (!enabled || !showGhostText) {
      setGhostText(prev => ({ ...prev, visible: false, loading: false }))
      return
    }

    const provider = providerRef.current

    const fetchCompletion = async () => {
      setGhostText(prev => ({
        ...prev,
        loading: true,
        position: calculatePosition(debouncedPosition.line, debouncedPosition.column),
      }))

      const suggestion = await provider.getSuggestion(
        debouncedContent,
        debouncedPosition,
        language,
        filePath,
        model
      )

      setGhostText({
        visible: !!suggestion,
        suggestion,
        position: calculatePosition(debouncedPosition.line, debouncedPosition.column),
        loading: false,
      })
    }

    fetchCompletion()

    return () => {
      provider.cancel()
    }
  }, [debouncedPosition, debouncedContent, language, filePath, model, enabled, showGhostText, calculatePosition])

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!ghostText.visible || !ghostText.suggestion) return

      // Tab - Accept full suggestion
      if (e.key === 'Tab') {
        e.preventDefault()
        onAccept(ghostText.suggestion)
        setGhostText(prev => ({ ...prev, visible: false, suggestion: null }))
      }

      // Escape - Reject suggestion
      if (e.key === 'Escape') {
        e.preventDefault()
        onReject()
        setGhostText(prev => ({ ...prev, visible: false, suggestion: null }))
        providerRef.current.cancel()
      }

      // Ctrl+Right - Accept word by word
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault()
        const words = ghostText.suggestion.insertText.split(/\s+/)
        if (words.length > 0) {
          onPartialAccept(words[0] + ' ')
          const remaining = words.slice(1).join(' ')
          if (remaining) {
            setGhostText(prev => ({
              ...prev,
              suggestion: {
                ...prev.suggestion!,
                insertText: remaining,
                displayText: remaining,
              },
            }))
          } else {
            setGhostText(prev => ({ ...prev, visible: false, suggestion: null }))
          }
        }
      }

      // Any other key - dismiss
      if (!['Tab', 'Escape', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        setGhostText(prev => ({ ...prev, visible: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [ghostText, onAccept, onReject, onPartialAccept])

  if (!enabled) return null

  return (
    <>
      {/* Loading indicator */}
      {ghostText.loading && (
        <CompletionLoading position={ghostText.position} />
      )}

      {/* Ghost text overlay */}
      {showGhostText && ghostText.visible && ghostText.suggestion && (
        <GhostTextOverlay
          text={ghostText.suggestion.displayText}
          position={ghostText.position}
          onAccept={() => {
            if (ghostText.suggestion) {
              onAccept(ghostText.suggestion)
              setGhostText(prev => ({ ...prev, visible: false, suggestion: null }))
            }
          }}
          onReject={() => {
            onReject()
            setGhostText(prev => ({ ...prev, visible: false, suggestion: null }))
          }}
          visible={ghostText.visible}
        />
      )}
    </>
  )
}
