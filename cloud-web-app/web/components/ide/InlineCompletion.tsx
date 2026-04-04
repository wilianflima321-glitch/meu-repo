'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Sparkles, X, Check, Keyboard } from 'lucide-react'
import { DEFAULT_OPENROUTER_MODEL_ID, OPENROUTER_BUDGET_OPTIONS } from '@/lib/ai/openrouter-models'

// ============= Types =============

interface CompletionSuggestion {
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

interface InlineCompletionProps {
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

interface GhostTextState {
  visible: boolean
  suggestion: CompletionSuggestion | null
  position: { top: number; left: number }
  loading: boolean
}

// ============= Ghost Text Provider =============

class GhostTextProvider {
  private abortController: AbortController | null = null
  private cache: Map<string, CompletionSuggestion[]> = new Map()

  async getSuggestion(
    content: string,
    position: { line: number; column: number },
    language: string,
    filePath: string,
    model: string = DEFAULT_OPENROUTER_MODEL_ID
  ): Promise<CompletionSuggestion | null> {
    // Cancel previous request
    if (this.abortController) {
      this.abortController.abort()
    }
    this.abortController = new AbortController()

    // Get context around cursor
    const lines = content.split('\n')
    const currentLine = lines[position.line] || ''
    const prefix = currentLine.substring(0, position.column)
    const suffix = currentLine.substring(position.column)

    // Get surrounding context (5 lines before and after)
    const contextBefore = lines.slice(Math.max(0, position.line - 5), position.line).join('\n')
    const contextAfter = lines.slice(position.line + 1, position.line + 6).join('\n')

    // Build prompt
    const prompt = this.buildPrompt(contextBefore, prefix, suffix, contextAfter, language)

    // Check cache
    const cacheKey = `${filePath}:${position.line}:${position.column}:${prefix}`
    const cached = this.cache.get(cacheKey)
    if (cached && cached.length > 0) {
      return cached[0]
    }

    try {
      const response = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          maxTokens: 150,
          temperature: 0.2,
          stop: ['\n\n', '```', '// ---'],
        }),
        signal: this.abortController.signal,
      })

      if (!response.ok) {
        throw new Error('Completion request failed')
      }

      const data = await response.json()
      const completionText = data.suggestion?.trim()

      if (!completionText) {
        return null
      }

      const suggestion: CompletionSuggestion = {
        id: crypto.randomUUID(),
        text: completionText,
        displayText: this.truncateForDisplay(completionText),
        insertText: completionText,
        range: {
          startLine: position.line,
          startColumn: position.column,
          endLine: position.line,
          endColumn: position.column,
        },
        source: 'ai',
        confidence: data.confidence || 0.8,
        model,
      }

      // Cache the result
      this.cache.set(cacheKey, [suggestion])

      return suggestion
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null
      }
      console.error('Ghost text error:', error)
      return null
    }
  }

  private buildPrompt(
    contextBefore: string,
    prefix: string,
    suffix: string,
    contextAfter: string,
    language: string
  ): string {
    return `Complete the code at the cursor position. Return ONLY the completion, no explanation.

Language: ${language}

Context before:
\`\`\`${language}
${contextBefore}
\`\`\`

Current line (cursor at |):
${prefix}|${suffix}

Context after:
\`\`\`${language}
${contextAfter}
\`\`\`

Completion (continue from cursor):`
  }

  private truncateForDisplay(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  clearCache() {
    this.cache.clear()
  }

  cancel() {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }
}

// ============= Debouncer =============

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ============= Ghost Text Overlay Component =============

interface GhostTextOverlayProps {
  text: string
  position: { top: number; left: number }
  onAccept: () => void
  onReject: () => void
  visible: boolean
}

function GhostTextOverlay({ text, position, onAccept, onReject, visible }: GhostTextOverlayProps) {
  if (!visible || !text) return null

  // Split into lines for multi-line display
  const lines = text.split('\n')

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {/* Ghost text */}
      <div className="font-mono text-sm">
        {lines.map((line, i) => (
          <div
            key={i}
            className="text-[var(--aethel-text-tertiary)] opacity-60"
            style={{
              whiteSpace: 'pre',
              fontStyle: 'italic',
            }}
          >
            {line}
          </div>
        ))}
      </div>

      {/* Hint tooltip */}
      <div
        className="absolute -top-6 left-0 flex items-center gap-1 px-2 py-0.5 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-xs text-[var(--aethel-text-tertiary)] pointer-events-auto whitespace-nowrap"
      >
        <kbd className="px-1 py-0.5 bg-[var(--aethel-surface-quaternary)] rounded text-[10px]">Tab</kbd>
        <span>aceitar</span>
        <span className="mx-1 text-[var(--aethel-text-quaternary)]">|</span>
        <kbd className="px-1 py-0.5 bg-[var(--aethel-surface-quaternary)] rounded text-[10px]">Esc</kbd>
        <span>dispensar</span>
      </div>
    </div>
  )
}

// ============= Loading Indicator =============

function CompletionLoading({ position }: { position: { top: number; left: number } }) {
  return (
    <div
      className="absolute z-50 flex items-center gap-1"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <Sparkles className="w-3 h-3 text-[var(--aethel-info)] animate-pulse" />
      <span className="text-xs text-[var(--aethel-text-tertiary)]">Analisando...</span>
    </div>
  )
}

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

// ============= Completion Status Bar =============

interface CompletionStatusProps {
  enabled: boolean
  onToggle: () => void
  currentModel: string
  suggestions: number
  acceptRate: number
}

export function CompletionStatusBar({
  enabled,
  onToggle,
  currentModel,
  suggestions,
  acceptRate,
}: CompletionStatusProps) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <button type="button"
        onClick={onToggle}
        className={`flex items-center gap-1 px-2 py-1 rounded ${
          enabled
            ? 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info)]'
            : 'bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]'
        }`}
      >
        <Sparkles className="w-3 h-3" />
        <span>Copilot {enabled ? 'ATIVO' : 'DESLIGADO'}</span>
      </button>

      {enabled && (
        <>
          <span className="text-[var(--aethel-text-tertiary)]">|</span>
          <span className="text-[var(--aethel-text-tertiary)]">{currentModel}</span>
          <span className="text-[var(--aethel-text-tertiary)]">|</span>
          <span className="text-[var(--aethel-text-tertiary)]">{suggestions} sugestoes</span>
          <span className="text-[var(--aethel-text-tertiary)]">|</span>
          <span className="text-[var(--aethel-success)]">{(acceptRate * 100).toFixed(0)}% aceitos</span>
        </>
      )}
    </div>
  )
}

// ============= Completion Settings Panel =============

interface CompletionSettingsProps {
  settings: {
    enabled: boolean
    debounceMs: number
    model: string
    maxTokens: number
    temperature: number
  }
  onSettingsChange: (settings: CompletionSettingsProps['settings']) => void
}

export function CompletionSettings({ settings, onSettingsChange }: CompletionSettingsProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Ajustes de completacao IA</h3>

      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm text-[var(--aethel-text-tertiary)]">Ativar completacao inline</label>
        <button type="button"
          onClick={() => onSettingsChange({ ...settings, enabled: !settings.enabled })}
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.enabled ? 'bg-[var(--aethel-primary)]' : 'bg-[var(--aethel-surface-quaternary)]'
          }`}
        >
          <div className={`w-4 h-4 rounded-full bg-[var(--aethel-surface-secondary)] transition-transform ${
            settings.enabled ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </button>
      </div>

      {/* Model selector */}
      <div>
        <label className="text-sm text-[var(--aethel-text-tertiary)] block mb-1">Modelo</label>
        <select
          value={settings.model}
          onChange={(e) => onSettingsChange({ ...settings, model: e.target.value })}
          className="w-full px-3 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-primary)]"
        >
          {OPENROUTER_BUDGET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Debounce */}
      <div>
        <label className="text-sm text-[var(--aethel-text-tertiary)] block mb-1">
          Atraso: {settings.debounceMs}ms
        </label>
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={settings.debounceMs}
          onChange={(e) => onSettingsChange({ ...settings, debounceMs: parseInt(e.target.value) })}
          className="w-full accent-[var(--aethel-info)]"
        />
      </div>

      {/* Temperature */}
      <div>
        <label className="text-sm text-[var(--aethel-text-tertiary)] block mb-1">
          Criatividade: {settings.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={settings.temperature}
          onChange={(e) => onSettingsChange({ ...settings, temperature: parseFloat(e.target.value) })}
          className="w-full accent-[var(--aethel-info)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
          <span>Preciso</span>
          <span>Criativo</span>
        </div>
      </div>
    </div>
  )
}
