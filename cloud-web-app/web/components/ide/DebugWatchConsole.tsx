'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ChevronRight, Code, Eye, Filter, Info, Plus, Trash2, XCircle } from 'lucide-react'
import type { ConsoleMessage, WatchExpression } from './DebugPanel.parts'

// ============= Watch Expressions Component =============

interface WatchExpressionsProps {
  expressions: WatchExpression[]
  onAdd: (expression: string) => void
  onRemove: (id: string) => void
  onEdit: (id: string, expression: string) => void
}

export function WatchExpressions({ expressions, onAdd, onRemove, onEdit }: WatchExpressionsProps) {
  const [newExpression, setNewExpression] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    if (newExpression.trim()) {
      onAdd(newExpression.trim())
      setNewExpression('')
    }
  }

  return (
    <div className="text-xs">
      {/* Add new expression */}
      <div className="flex items-center gap-1 px-2 py-1">
        <input
          ref={inputRef}
          type="text"
          value={newExpression}
          onChange={(e) => setNewExpression(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add expression..."
          className="flex-1 bg-transparent border-none outline-none text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)]"
        />
        <button type="button" aria-label="Add watch expression"
          onClick={handleAdd}
          className="p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Expressions list */}
      {expressions.map(expr => (
        <div
          key={expr.id}
          className="flex items-start gap-2 px-3 py-1 hover:bg-[var(--aethel-surface-quaternary)]/50 group"
        >
          <Eye className="w-3 h-3 text-[var(--aethel-text-tertiary)] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[var(--aethel-info-light)]">{expr.expression}</div>
            {expr.error ? (
              <div className="text-[var(--aethel-error)] truncate">{expr.error}</div>
            ) : expr.result !== undefined ? (
              <div className="text-[var(--aethel-text-secondary)] truncate">{expr.result}</div>
            ) : (
              <div className="text-[var(--aethel-text-quaternary)]">unavailable</div>
            )}
          </div>
          <button type="button" aria-label={`Remove watch expression ${expr.expression}`}
            onClick={() => onRemove(expr.id)}
            className="p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error)] opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

// ============= Console Output Component =============

interface ConsoleOutputProps {
  messages: ConsoleMessage[]
  onClear: () => void
  filter?: string
}

export function ConsoleOutput({ messages, onClear, filter }: ConsoleOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showFilter, setShowFilter] = useState(false)
  const [typeFilter, setTypeFilter] = useState<Set<ConsoleMessage['type']>>(new Set())

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  const filteredMessages = useMemo(() => {
    let filtered = messages
    if (filter) {
      filtered = filtered.filter(m => m.message.toLowerCase().includes(filter.toLowerCase()))
    }
    if (typeFilter.size > 0) {
      filtered = filtered.filter(m => typeFilter.has(m.type))
    }
    return filtered
  }, [messages, filter, typeFilter])

  const getMessageIcon = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error': return <XCircle className="w-3 h-3 text-[var(--aethel-error)]" />
      case 'warn': return <AlertCircle className="w-3 h-3 text-[var(--aethel-warning-light)]" />
      case 'info': return <Info className="w-3 h-3 text-[var(--aethel-info-light)]" />
      case 'debug': return <Code className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
      default: return <ChevronRight className="w-3 h-3 text-[var(--aethel-text-tertiary)]" />
    }
  }

  const getMessageColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error': return 'text-[var(--aethel-error)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]'
      case 'warn': return 'text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]'
      case 'info': return 'text-[var(--aethel-info-light)]'
      default: return 'text-[var(--aethel-text-secondary)]'
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Console toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-[var(--aethel-border-secondary)]">
        <button type="button" aria-label="Clear debug console"
          onClick={onClear}
          className="p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
          title="Clear console"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <button type="button" aria-label={showFilter ? 'Hide console filters' : 'Show console filters'}
          onClick={() => setShowFilter(!showFilter)}
          className={`p-1 ${showFilter ? 'text-[var(--aethel-info-light)]' : 'text-[var(--aethel-text-tertiary)]'} hover:text-[var(--aethel-text-primary)]`}
          title="Filter"
        >
          <Filter className="w-3 h-3" />
        </button>
        <span className="text-xs text-[var(--aethel-text-tertiary)] ml-auto">
          {filteredMessages.length} messages
        </span>
      </div>

      {/* Filter bar */}
      {showFilter && (
        <div className="flex items-center gap-2 px-2 py-1 bg-[var(--aethel-surface-tertiary)] border-b border-[var(--aethel-border-secondary)]">
          {(['log', 'warn', 'error', 'info', 'debug'] as const).map(type => (
            <button type="button" aria-label={`Toggle ${type} console messages`}
              key={type}
              onClick={() => {
                setTypeFilter(prev => {
                  const next = new Set(prev)
                  if (next.has(type)) {
                    next.delete(type)
                  } else {
                    next.add(type)
                  }
                  return next
                })
              }}
              className={`px-2 py-0.5 text-xs rounded ${
                typeFilter.has(type)
                  ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                  : 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto text-xs font-mono">
        {filteredMessages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-2 px-2 py-1 border-b border-[var(--aethel-border-primary)] ${getMessageColor(msg.type)}`}
          >
            {getMessageIcon(msg.type)}
            <span className="flex-1 whitespace-pre-wrap break-all">{msg.message}</span>
            {msg.source && (
              <span className="text-[var(--aethel-text-quaternary)] text-[10px]">
                {msg.source}:{msg.line}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
