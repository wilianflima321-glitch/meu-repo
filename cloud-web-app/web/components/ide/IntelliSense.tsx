'use client'

import { useState } from 'react'
import { Lightbulb, Code, Variable, Type, ChevronRight, Star, Clock, FileText } from 'lucide-react'

interface Suggestion {
  id: string
  type: 'function' | 'variable' | 'type' | 'snippet' | 'keyword'
  label: string
  detail: string
  documentation: string
  sortText: string
  preselect: boolean
}

interface IntelliSenseProps {
  suggestions?: Suggestion[]
  onSuggestionSelect?: (suggestion: Suggestion) => void
  triggerCharacter?: string
  position?: { x: number; y: number }
  visible?: boolean
}

export function IntelliSense({ suggestions = [], onSuggestionSelect, visible = true }: IntelliSenseProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filter, setFilter] = useState('')

  const filteredSuggestions = suggestions.filter(s =>
    s.label.toLowerCase().includes(filter.toLowerCase())
  )

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'function':
        return <Code className="w-3.5 h-3.5 text-[var(--aethel-primary-light)]" />
      case 'variable':
        return <Variable className="w-3.5 h-3.5 text-[var(--aethel-info-light)]" />
      case 'type':
        return <Type className="w-3.5 h-3.5 text-[var(--aethel-warning-light)]" />
      case 'snippet':
        return <Code className="w-3.5 h-3.5 text-[var(--aethel-success-light)]" />
      default:
        return <Lightbulb className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
    }
  }

  const getTypeColor = (type: Suggestion['type']) => {
    switch (type) {
      case 'function':
        return 'text-[var(--aethel-primary-light)]'
      case 'variable':
        return 'text-[var(--aethel-info-light)]'
      case 'type':
        return 'text-[var(--aethel-warning-light)]'
      case 'snippet':
        return 'text-[var(--aethel-success-light)]'
      default:
        return 'text-[var(--aethel-text-secondary)]'
    }
  }

  if (!visible) return null

  return (
    <div className="w-80 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)] shadow-[0_24px_60px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-[var(--aethel-primary-light)]" />
          <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">IntelliSense</span>
        </div>
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{filteredSuggestions.length}</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-[var(--aethel-border-secondary)]">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar sugestões..."
          className="w-full px-3 py-1.5 text-xs rounded border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-primary)]"
        />
      </div>

      {/* Suggestions */}
      <div className="max-h-64 overflow-auto py-1">
        {filteredSuggestions.length === 0 ? (
          <div className="px-4 py-8 text-center text-[var(--aethel-text-tertiary)] text-sm">
            {suggestions.length === 0 ? 'Integração Monaco pendente' : 'Nenhuma sugestão encontrada'}
          </div>
        ) : (
          filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => onSuggestionSelect?.(suggestion)}
              className={`w-full flex items-start gap-3 px-3 py-2 text-left transition-colors ${
 index === selectedIndex ?
 'bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)]'
 : 'hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
 }`}
            >
              <div className={`p-1 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] ${getTypeColor(suggestion.type)}`}>
                {getSuggestionIcon(suggestion.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--aethel-text-primary)]">{suggestion.label}</span>
                  {suggestion.preselect && <Star className="w-3 h-3 text-[var(--aethel-warning-light)]" />}
                </div>
                {suggestion.detail && (
                  <p className="text-[10px] text-[var(--aethel-text-tertiary)]">{suggestion.detail}</p>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--aethel-text-quaternary)] flex-shrink-0" />
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] text-[var(--aethel-text-tertiary)]">
          <Clock className="w-3 h-3" />
          <span>Recentes</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--aethel-text-tertiary)]">
          <FileText className="w-3 h-3" />
          <span>Documentação</span>
        </div>
      </div>
    </div>
  )
}

// Sugestões reais devem ser fornecidas pelo Monaco/LSP.
