'use client'

/**
 * Debug Panel - Professional Debugging Interface
 * Like VS Code/Chrome DevTools debugger
 *
 * Features:
 * - Breakpoints management
 * - Variable inspection
 * - Call stack navigation
 * - Watch expressions
 * - Step controls
 * - Console output
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Play,
  Pause,
  Square,
  SkipForward,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  RefreshCw,
  Circle,
  XCircle,
  ChevronRight,
  ChevronDown,
  Eye,
  Plus,
  Trash2,
  Terminal,
  Code,
  Layers,
  Variable,
  FunctionSquare,
  Braces,
  AlertCircle,
  CheckCircle,
  Info,
  Search,
  Filter,
  Settings,
} from 'lucide-react'

// ============= Types =============

type DebugState = 'stopped' | 'running' | 'paused' | 'stepping'

interface Breakpoint {
  id: string
  filePath: string
  line: number
  condition?: string
  hitCount?: number
  enabled: boolean
  verified: boolean
}

interface StackFrame {
  id: string
  name: string
  filePath: string
  line: number
  column: number
  scopes: Scope[]
}

interface Scope {
  name: string
  type: 'local' | 'closure' | 'global' | 'with' | 'catch' | 'block'
  variables: Variable[]
}

interface Variable {
  name: string
  value: string
  type: string
  expandable: boolean
  children?: Variable[]
  changed?: boolean
}

interface WatchExpression {
  id: string
  expression: string
  result?: string
  error?: string
}

interface ConsoleMessage {
  id: string
  type: 'log' | 'warn' | 'error' | 'info' | 'debug' | 'output'
  message: string
  timestamp: Date
  source?: string
  line?: number
}

interface DebugSession {
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
  icon: React.ReactNode
  defaultOpen?: boolean
  badge?: number
  children: React.ReactNode
}

function CollapsibleSection({ title, icon, defaultOpen = true, badge, children }: CollapsibleSectionProps) {
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

// ============= Variable Tree Component =============

interface VariableTreeProps {
  variables: Variable[]
  depth?: number
  onInspect?: (variable: Variable) => void
}

function VariableTree({ variables, depth = 0, onInspect }: VariableTreeProps) {
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

// ============= Breakpoint List Component =============

interface BreakpointListProps {
  breakpoints: Breakpoint[]
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  onEdit: (id: string) => void
  onNavigate: (breakpoint: Breakpoint) => void
}

function BreakpointList({ breakpoints, onToggle, onRemove, onEdit, onNavigate }: BreakpointListProps) {
  return (
    <div className="text-xs">
      {breakpoints.length === 0 ? (
        <div className="px-3 py-2 text-[var(--aethel-text-tertiary)] text-center">
          Nenhum breakpoint
        </div>
      ) : (
        breakpoints.map(bp => (
          <div
            key={bp.id}
            className="flex items-center gap-2 px-3 py-1 hover:bg-[var(--aethel-surface-quaternary)]/50 group"
          >
            <button type="button" aria-label={bp.enabled ? `Disable breakpoint at ${bp.filePath}:${bp.line}` : `Enable breakpoint at ${bp.filePath}:${bp.line}`}
              onClick={() => onToggle(bp.id)}
              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                bp.enabled
                  ? bp.verified
                    ? 'bg-[var(--aethel-success)] border-[var(--aethel-success)]'
                    : 'bg-[var(--aethel-text-tertiary)] border-[var(--aethel-border-secondary)]'
                  : 'border-[var(--aethel-border-secondary)]'
              }`}
            />

            <button type="button" aria-label={`Open breakpoint ${bp.filePath}:${bp.line}`}
              onClick={() => onNavigate(bp)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="text-[var(--aethel-text-primary)] truncate">
                {bp.filePath.split('/').pop()}:{bp.line}
              </div>
              {bp.condition && (
                <div className="text-[var(--aethel-text-tertiary)] truncate">
                  when: {bp.condition}
                </div>
              )}
            </button>

            {bp.hitCount !== undefined && bp.hitCount > 0 && (
              <span className="text-[var(--aethel-text-tertiary)]">{bp.hitCount}×</span>
            )}

            <button type="button" aria-label={`Remove breakpoint ${bp.filePath}:${bp.line}`}
              onClick={() => onRemove(bp.id)}
              className="p-1 text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error)] opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))
      )}
    </div>
  )
}

// ============= Call Stack Component =============

interface CallStackProps {
  frames: StackFrame[]
  selectedFrameId: string | null
  onSelectFrame: (frame: StackFrame) => void
}

function CallStack({ frames, selectedFrameId, onSelectFrame }: CallStackProps) {
  return (
    <div className="text-xs">
      {frames.length === 0 ? (
        <div className="px-3 py-2 text-[var(--aethel-text-tertiary)] text-center">
          Nao pausado
        </div>
      ) : (
        frames.map((frame, idx) => (
          <button type="button" aria-label={`Select stack frame ${frame.name}`}
            key={frame.id}
            onClick={() => onSelectFrame(frame)}
            className={`flex items-center gap-2 w-full px-3 py-1 text-left ${
              frame.id === selectedFrameId
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_22%,transparent)]'
                : 'hover:bg-[var(--aethel-surface-quaternary)]/50'
            }`}
          >
            <FunctionSquare className="w-3 h-3 text-[var(--aethel-warning-light)] flex-shrink-0" />
            <span className="text-[var(--aethel-text-primary)] truncate">{frame.name}</span>
            <span className="ml-auto text-[var(--aethel-text-tertiary)] text-[10px]">
              {frame.filePath.split('/').pop()}:{frame.line}
            </span>
          </button>
        ))
      )}
    </div>
  )
}

// ============= Watch Expressions Component =============

interface WatchExpressionsProps {
  expressions: WatchExpression[]
  onAdd: (expression: string) => void
  onRemove: (id: string) => void
  onEdit: (id: string, expression: string) => void
}

function WatchExpressions({ expressions, onAdd, onRemove, onEdit }: WatchExpressionsProps) {
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
          placeholder="Adicionar expressao..."
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
              <div className="text-[var(--aethel-text-quaternary)]">indisponivel</div>
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

function ConsoleOutput({ messages, onClear, filter }: ConsoleOutputProps) {
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
          title="Limpar console"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <button type="button" aria-label={showFilter ? 'Hide console filters' : 'Show console filters'}
          onClick={() => setShowFilter(!showFilter)}
          className={`p-1 ${showFilter ? 'text-[var(--aethel-info-light)]' : 'text-[var(--aethel-text-tertiary)]'} hover:text-[var(--aethel-text-primary)]`}
          title="Filtro"
        >
          <Filter className="w-3 h-3" />
        </button>
        <span className="text-xs text-[var(--aethel-text-tertiary)] ml-auto">
          {filteredMessages.length} mensagens
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

// ============= Main Debug Panel Component =============

export interface DebugPanelProps {
  session?: DebugSession
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
  onStepOver?: () => void
  onStepInto?: () => void
  onStepOut?: () => void
  onRestart?: () => void
  onToggleBreakpoint?: (id: string) => void
  onRemoveBreakpoint?: (id: string) => void
  onAddWatch?: (expression: string) => void
  onRemoveWatch?: (id: string) => void
  onNavigateToFile?: (filePath: string, line: number) => void
}

export default function DebugPanel({
  session,
  onPlay = () => {},
  onPause = () => {},
  onStop = () => {},
  onStepOver = () => {},
  onStepInto = () => {},
  onStepOut = () => {},
  onRestart = () => {},
  onToggleBreakpoint = () => {},
  onRemoveBreakpoint = () => {},
  onAddWatch = () => {},
  onRemoveWatch = () => {},
  onNavigateToFile = () => {},
}: DebugPanelProps) {
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'variables' | 'watch' | 'console'>('variables')

  // Mock session for demo
  const demoSession: DebugSession = session || {
    id: 'demo',
    name: 'Node.js Debug',
    type: 'node',
    state: 'paused',
    breakpoints: [
      { id: '1', filePath: 'src/index.ts', line: 42, enabled: true, verified: true },
      { id: '2', filePath: 'src/utils.ts', line: 15, enabled: true, verified: true, condition: 'x > 10' },
      { id: '3', filePath: 'src/api.ts', line: 88, enabled: false, verified: false },
    ],
    callStack: [
      {
        id: 'frame-1',
        name: 'processRequest',
        filePath: 'src/api.ts',
        line: 45,
        column: 12,
        scopes: [
          {
            name: 'Local',
            type: 'local',
            variables: [
              { name: 'request', value: '{method: "GET", url: "/api/users"}', type: 'object', expandable: true },
              { name: 'response', value: 'undefined', type: 'undefined', expandable: false },
              { name: 'userId', value: '42', type: 'number', expandable: false, changed: true },
            ],
          },
        ],
      },
      {
        id: 'frame-2',
        name: 'handleRoute',
        filePath: 'src/router.ts',
        line: 23,
        column: 8,
        scopes: [],
      },
      {
        id: 'frame-3',
        name: 'main',
        filePath: 'src/index.ts',
        line: 10,
        column: 4,
        scopes: [],
      },
    ],
    watchExpressions: [
      { id: 'w1', expression: 'request.method', result: '"GET"' },
      { id: 'w2', expression: 'users.length', result: '5' },
      { id: 'w3', expression: 'invalidVar', error: 'ReferenceError: invalidVar is not defined' },
    ],
    console: [
      { id: 'c1', type: 'log', message: 'Server started on port 3000', timestamp: new Date() },
      { id: 'c2', type: 'info', message: 'Database connected', timestamp: new Date() },
      { id: 'c3', type: 'warn', message: 'Deprecated API usage in utils.ts', timestamp: new Date(), source: 'utils.ts', line: 25 },
      { id: 'c4', type: 'error', message: 'Failed to fetch user: Network error', timestamp: new Date(), source: 'api.ts', line: 67 },
      { id: 'c5', type: 'log', message: 'Request: GET /api/users/42', timestamp: new Date() },
    ],
  }

  const currentFrame = demoSession.callStack.find(f => f.id === selectedFrameId) || demoSession.callStack[0]

  const isPaused = demoSession.state === 'paused'
  const isRunning = demoSession.state === 'running'

  return (
    <div className="flex flex-col h-full bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)]">
      {/* Debug toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-[var(--aethel-surface-tertiary)] border-b border-[var(--aethel-border-secondary)]">
        {/* Play/Pause */}
        {isPaused ? (
          <button type="button" aria-label="Continue debugging"
            onClick={onPlay}
            className="p-1.5 bg-[var(--aethel-success)] hover:brightness-110 rounded text-[var(--aethel-text-primary)]"
            title="Continuar (F5)"
          >
            <Play className="w-4 h-4" />
          </button>
        ) : (
          <button type="button" aria-label="Pause debugging"
            onClick={onPause}
            className="p-1.5 bg-[var(--aethel-warning-dark)] hover:bg-[var(--aethel-warning)] rounded text-[var(--aethel-text-primary)]"
            title="Pausar (F6)"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}

        {/* Stop */}
        <button type="button" aria-label="Stop debugging"
          onClick={onStop}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-error)]"
          title="Parar (Shift+F5)"
        >
          <Square className="w-4 h-4" />
        </button>

        {/* Restart */}
        <button type="button" aria-label="Restart debugging"
          onClick={onRestart}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)]"
          title="Reiniciar (Ctrl+Shift+F5)"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-[var(--aethel-surface-quaternary)] mx-1" />

        {/* Step controls */}
        <button type="button" aria-label="Step over"
          onClick={onStepOver}
          disabled={!isPaused}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)] disabled:opacity-50"
          title="Passo sobre (F10)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button type="button" aria-label="Step into"
          onClick={onStepInto}
          disabled={!isPaused}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)] disabled:opacity-50"
          title="Entrar (F11)"
        >
          <ArrowDown className="w-4 h-4" />
        </button>

        <button type="button" aria-label="Step out"
          onClick={onStepOut}
          disabled={!isPaused}
          className="p-1.5 hover:bg-[var(--aethel-surface-quaternary)] rounded text-[var(--aethel-text-tertiary)] disabled:opacity-50"
          title="Sair (Shift+F11)"
        >
          <ArrowUp className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* Session info */}
        <span className="text-xs text-[var(--aethel-text-tertiary)]">
          {demoSession.name}
        </span>
        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
          isPaused ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)]' :
          isRunning ? 'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[var(--aethel-success-light)]' :
          'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]'
        }`}>
          {demoSession.state}
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Breakpoints, Call Stack, Variables */}
        <div className="w-72 border-r border-[var(--aethel-border-secondary)] overflow-y-auto">
          <CollapsibleSection
            title="Pontos de parada"
            icon={<Circle className="w-4 h-4 text-[var(--aethel-error)]" />}
            badge={demoSession.breakpoints.filter(b => b.enabled).length}
          >
            <BreakpointList
              breakpoints={demoSession.breakpoints}
              onToggle={onToggleBreakpoint}
              onRemove={onRemoveBreakpoint}
              onEdit={(id) => {}}
              onNavigate={(bp) => onNavigateToFile(bp.filePath, bp.line)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Pilha de chamadas"
            icon={<Layers className="w-4 h-4 text-[var(--aethel-info-light)]" />}
            badge={demoSession.callStack.length}
          >
            <CallStack
              frames={demoSession.callStack}
              selectedFrameId={selectedFrameId || demoSession.callStack[0]?.id}
              onSelectFrame={(frame) => {
                setSelectedFrameId(frame.id)
                onNavigateToFile(frame.filePath, frame.line)
              }}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Variaveis"
            icon={<Variable className="w-4 h-4 text-[var(--aethel-success-light)]" />}
          >
            {currentFrame?.scopes.map(scope => (
              <div key={scope.name} className="mb-2">
                <div className="px-3 py-1 text-xs text-[var(--aethel-text-tertiary)] uppercase">
                  {scope.name}
                </div>
                <VariableTree variables={scope.variables} />
              </div>
            ))}
          </CollapsibleSection>

          <CollapsibleSection
            title="Observacao"
            icon={<Eye className="w-4 h-4 text-[var(--aethel-info-light)]" />}
            badge={demoSession.watchExpressions.length}
          >
            <WatchExpressions
              expressions={demoSession.watchExpressions}
              onAdd={onAddWatch}
              onRemove={onRemoveWatch}
              onEdit={(id, expr) => {}}
            />
          </CollapsibleSection>
        </div>

        {/* Right panel - Console */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-2 py-1 bg-[var(--aethel-surface-tertiary)] border-b border-[var(--aethel-border-secondary)]">
            <button type="button" aria-label="Open debug console tab"
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1 text-xs rounded ${
                activeTab === 'console'
                  ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              <Terminal className="w-3 h-3 inline mr-1" />
              Console
            </button>
          </div>

          {/* Console content */}
          <div className="flex-1 overflow-hidden">
            <ConsoleOutput
              messages={demoSession.console}
              onClear={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  )
}


