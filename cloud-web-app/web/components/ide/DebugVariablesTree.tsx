'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { Variable } from './DebugPanel.parts'

// ============= Variable Tree Component =============

interface VariableTreeProps {
  variables: Variable[]
  depth?: number
  onInspect?: (variable: Variable) => void
}

export function VariableTree({ variables, depth = 0, onInspect }: VariableTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleExpanded = (name: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  return (
    <div className="font-mono text-xs">
      {variables.map((variable, idx) => (
        <div key={`${variable.name}-${idx}`}>
          <div
            className={`flex items-center gap-1 px-3 py-0.5 hover:bg-[var(--aethel-surface-quaternary)]/50 cursor-pointer ${
              variable.changed ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]' : ''
            }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
            onClick={() => variable.expandable && toggleExpanded(variable.name)}
            onDoubleClick={() => onInspect?.(variable)}
          >
            {variable.expandable ? (
              expanded.has(variable.name) ? (
                <ChevronDown className="w-3 h-3 text-[var(--aethel-text-tertiary)] flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-[var(--aethel-text-tertiary)] flex-shrink-0" />
              )
            ) : (
              <span className="w-3" />
            )}

            <span className={`${variable.changed ? 'text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)]' : 'text-[var(--aethel-info-light)]'}`}>
              {variable.name}
            </span>
            <span className="text-[var(--aethel-text-tertiary)]">:</span>
            <span className={`ml-1 truncate ${getTypeColor(variable.type)}`}>
              {formatValue(variable.value, variable.type)}
            </span>
            <span className="ml-auto text-[var(--aethel-text-quaternary)] text-[10px]">
              {variable.type}
            </span>
          </div>

          {variable.expandable && expanded.has(variable.name) && variable.children && (
            <VariableTree
              variables={variable.children}
              depth={depth + 1}
              onInspect={onInspect}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'string': return 'text-[var(--aethel-success-light)]'
    case 'number': return 'text-[var(--aethel-info-light)]'
    case 'boolean': return 'text-[var(--aethel-info-light)]'
    case 'null':
    case 'undefined': return 'text-[var(--aethel-text-tertiary)]'
    case 'function': return 'text-[color-mix(in_srgb,var(--aethel-warning-light)_85%,transparent)]'
    case 'object':
    case 'array': return 'text-[var(--aethel-primary-light)]'
    default: return 'text-[var(--aethel-text-secondary)]'
  }
}

function formatValue(value: string, type: string): string {
  if (type === 'string') return `"${value}"`
  if (type === 'function') return value.slice(0, 50) + (value.length > 50 ? '...' : '')
  return value
}
