'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

// ============= Types =============

export type DebugState = 'stopped' | 'running' | 'paused' | 'stepping'

export interface Breakpoint {
  id: string
  filePath: string
  line: number
  condition?: string
  hitCount?: number
  enabled: boolean
  verified: boolean
}

export interface StackFrame {
  id: string
  name: string
  filePath: string
  line: number
  column: number
  scopes: Scope[]
}

export interface Scope {
  name: string
  type: 'local' | 'closure' | 'global' | 'with' | 'catch' | 'block'
  variables: Variable[]
}

export interface Variable {
  name: string
  value: string
  type: string
  expandable: boolean
  children?: Variable[]
  changed?: boolean
}

export interface WatchExpression {
  id: string
  expression: string
  result?: string
  error?: string
}

export interface ConsoleMessage {
  id: string
  type: 'log' | 'warn' | 'error' | 'info' | 'debug' | 'output'
  message: string
  timestamp: Date
  source?: string
  line?: number
}

export interface DebugSession {
  id: string
  name: string
  type: 'node' | 'browser' | 'remote'
  state: DebugState
  breakpoints: Breakpoint[]
  callStack: StackFrame[]
  watchExpressions: WatchExpression[]
  console: ConsoleMessage[]
}

// ============= Collapsible Section Component =============

interface CollapsibleSectionProps {
  title: string
  icon: ReactNode
  defaultOpen?: boolean
  badge?: number
  children: ReactNode
}

export function CollapsibleSection({ title, icon, defaultOpen = true, badge, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--aethel-border-secondary)]">
      <button type="button" aria-label={isOpen ? `Collapse ${title} section` : `Expand ${title} section`}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[var(--aethel-surface-quaternary)]/50 text-sm"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--aethel-text-tertiary)]" />
        )}
        {icon}
        <span className="font-medium text-[var(--aethel-text-primary)]">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto px-1.5 py-0.5 text-xs bg-[var(--aethel-surface-quaternary)] rounded">
            {badge}
          </span>
        )}
      </button>
      {isOpen && <div className="pb-2">{children}</div>}
    </div>
  )
}

export { VariableTree } from './DebugVariablesTree'
export { BreakpointList, CallStack } from './DebugBreakpointsStack'
export { ConsoleOutput, WatchExpressions } from './DebugWatchConsole'
