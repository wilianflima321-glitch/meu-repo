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
    <div className="border-b border-slate-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-slate-700/50 text-sm"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
        {icon}
        <span className="font-medium text-white">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto px-1.5 py-0.5 text-xs bg-slate-600 rounded">
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
            className={`flex items-center gap-1 px-3 py-0.5 hover:bg-slate-700/50 cursor-pointer ${
              variable.changed ? 'bg-amber-500/10' : ''
            }`}
            style={{ paddingLeft: `${depth * 16 + 12}px` }}
            onClick={() => variable.expandable && toggleExpanded(variable.name)}
            onDoubleClick={() => onInspect?.(variable)}
          >
            {variable.expandable ? (
              expanded.has(variable.name) ? (
                <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
              )
            ) : (
              <span className="w-3" />
            )}
            
            <span className={`${variable.changed ? 'text-amber-300' : 'text-indigo-300'}`}>
              {variable.name}
            </span>
            <span className="text-slate-500">:</span>
            <span className={`ml-1 truncate ${getTypeColor(variable.type)}`}>
              {formatValue(variable.value, variable.type)}
            </span>
            <span className="ml-auto text-slate-600 text-[10px]">
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
    case 'string': return 'text-emerald-300'
    case 'number': return 'text-blue-300'
    case 'boolean': return 'text-purple-300'
    case 'null':
    case 'undefined': return 'text-slate-500'
    case 'function': return 'text-amber-300'
    case 'object':
    case 'array': return 'text-cyan-300'
    default: return 'text-slate-300'
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
        <div className="px-3 py-2 text-slate-500 text-center">
          No breakpoints
        </div>
      ) : (
        breakpoints.map(bp => (
          <div
            key={bp.id}
            className="flex items-center gap-2 px-3 py-1 hover:bg-slate-700/50 group"
          >
            <button
              onClick={() => onToggle(bp.id)}
              className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                bp.enabled
                  ? bp.verified
                    ? 'bg-red-500 border-red-500'
                    : 'bg-slate-500 border-slate-500'
                  : 'border-slate-600'
              }`}
            />
            
            <button
              onClick={() => onNavigate(bp)}
              className="flex-1 min-w-0 text-left"
            >
              <div className="text-white truncate">
                {bp.filePath.split('/').pop()}:{bp.line}
              </div>
              {bp.condition && (
                <div className="text-slate-500 truncate">
                  when: {bp.condition}
                </div>
              )}
            </button>
            
            {bp.hitCount !== undefined && bp.hitCount > 0 && (
              <span className="text-slate-500">{bp.hitCount}×</span>
            )}
            
            <button
              onClick={() => onRemove(bp.id)}
              className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
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
        <div className="px-3 py-2 text-slate-500 text-center">
          Not paused
        </div>
      ) : (
        frames.map((frame, idx) => (
          <button
            key={frame.id}
            onClick={() => onSelectFrame(frame)}
            className={`flex items-center gap-2 w-full px-3 py-1 text-left ${
              frame.id === selectedFrameId
                ? 'bg-indigo-600/30'
                : 'hover:bg-slate-700/50'
            }`}
          >
            <FunctionSquare className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span className="text-white truncate">{frame.name}</span>
            <span className="ml-auto text-slate-500 text-[10px]">
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
          placeholder="Add expression..."
          className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-600"
        />
        <button
          onClick={handleAdd}
          className="p-1 text-slate-400 hover:text-white"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      
      {/* Expressions list */}
      {expressions.map(expr => (
        <div
          key={expr.id}
          className="flex items-start gap-2 px-3 py-1 hover:bg-slate-700/50 group"
        >
          <Eye className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-indigo-300">{expr.expression}</div>
            {expr.error ? (
              <div className="text-red-400 truncate">{expr.error}</div>
            ) : expr.result !== undefined ? (
              <div className="text-slate-300 truncate">{expr.result}</div>
            ) : (
              <div className="text-slate-600">not available</div>
            )}
          </div>
          <button
            onClick={() => onRemove(expr.id)}
            className="p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100"
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
      case 'error': return <XCircle className="w-3 h-3 text-red-400" />
      case 'warn': return <AlertCircle className="w-3 h-3 text-amber-400" />
      case 'info': return <Info className="w-3 h-3 text-blue-400" />
      case 'debug': return <Code className="w-3 h-3 text-slate-400" />
      default: return <ChevronRight className="w-3 h-3 text-slate-500" />
    }
  }
  
  const getMessageColor = (type: ConsoleMessage['type']) => {
    switch (type) {
      case 'error': return 'text-red-300 bg-red-500/10'
      case 'warn': return 'text-amber-300 bg-amber-500/10'
      case 'info': return 'text-blue-300'
      default: return 'text-slate-300'
    }
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Console toolbar */}
      <div className="flex items-center gap-2 px-2 py-1 border-b border-slate-700">
        <button
          onClick={onClear}
          className="p-1 text-slate-400 hover:text-white"
          title="Clear console"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`p-1 ${showFilter ? 'text-indigo-400' : 'text-slate-400'} hover:text-white`}
          title="Filter"
        >
          <Filter className="w-3 h-3" />
        </button>
        <span className="text-xs text-slate-500 ml-auto">
          {filteredMessages.length} messages
        </span>
      </div>
      
      {/* Filter bar */}
      {showFilter && (
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-800 border-b border-slate-700">
          {(['log', 'warn', 'error', 'info', 'debug'] as const).map(type => (
            <button
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
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-700 text-slate-400'
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
            className={`flex items-start gap-2 px-2 py-1 border-b border-slate-800 ${getMessageColor(msg.type)}`}
          >
            {getMessageIcon(msg.type)}
            <span className="flex-1 whitespace-pre-wrap break-all">{msg.message}</span>
            {msg.source && (
              <span className="text-slate-600 text-[10px]">
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
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Debug toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-800 border-b border-slate-700">
        {/* Play/Pause */}
        {isPaused ? (
          <button
            onClick={onPlay}
            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white"
            title="Continue (F5)"
          >
            <Play className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onPause}
            className="p-1.5 bg-amber-600 hover:bg-amber-500 rounded text-white"
            title="Pause (F6)"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
        
        {/* Stop */}
        <button
          onClick={onStop}
          className="p-1.5 hover:bg-slate-700 rounded text-red-400"
          title="Stop (Shift+F5)"
        >
          <Square className="w-4 h-4" />
        </button>
        
        {/* Restart */}
        <button
          onClick={onRestart}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
          title="Restart (Ctrl+Shift+F5)"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        
        <div className="w-px h-4 bg-slate-700 mx-1" />
        
        {/* Step controls */}
        <button
          onClick={onStepOver}
          disabled={!isPaused}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-50"
          title="Step Over (F10)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        
        <button
          onClick={onStepInto}
          disabled={!isPaused}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-50"
          title="Step Into (F11)"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        
        <button
          onClick={onStepOut}
          disabled={!isPaused}
          className="p-1.5 hover:bg-slate-700 rounded text-slate-400 disabled:opacity-50"
          title="Step Out (Shift+F11)"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        
        <div className="flex-1" />
        
        {/* Session info */}
        <span className="text-xs text-slate-400">
          {demoSession.name}
        </span>
        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
          isPaused ? 'bg-amber-500/20 text-amber-400' :
          isRunning ? 'bg-emerald-500/20 text-emerald-400' :
          'bg-slate-700 text-slate-400'
        }`}>
          {demoSession.state}
        </span>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - Breakpoints, Call Stack, Variables */}
        <div className="w-72 border-r border-slate-700 overflow-y-auto">
          <CollapsibleSection
            title="Breakpoints"
            icon={<Circle className="w-4 h-4 text-red-400" />}
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
            title="Call Stack"
            icon={<Layers className="w-4 h-4 text-blue-400" />}
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
            title="Variables"
            icon={<Variable className="w-4 h-4 text-emerald-400" />}
          >
            {currentFrame?.scopes.map(scope => (
              <div key={scope.name} className="mb-2">
                <div className="px-3 py-1 text-xs text-slate-500 uppercase">
                  {scope.name}
                </div>
                <VariableTree variables={scope.variables} />
              </div>
            ))}
          </CollapsibleSection>
          
          <CollapsibleSection
            title="Watch"
            icon={<Eye className="w-4 h-4 text-purple-400" />}
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
          <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 border-b border-slate-700">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1 text-xs rounded ${
                activeTab === 'console'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
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
