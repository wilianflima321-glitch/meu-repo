'use client'

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react'
import {
  Terminal as TerminalIcon,
  X,
  Maximize2,
  Minimize2,
  Plus,
  ChevronRight,
  Loader2,
} from 'lucide-react'

interface TerminalLine {
  id: string
  type: 'input' | 'output' | 'error' | 'info'
  content: string
  timestamp: Date
}

interface CommandHistoryEntry {
  command: string
  timestamp: Date
}

interface TerminalProps {
  initialLines?: TerminalLine[]
  onCommand?: (command: string) => Promise<string | void>
  className?: string
}

// Common commands for autocomplete
const COMMON_COMMANDS = [
  'npm install',
  'npm run dev',
  'npm run build',
  'npm run test',
  'npm start',
  'git status',
  'git add .',
  'git commit -m ""',
  'git push',
  'git pull',
  'git checkout',
  'git branch',
  'cd',
  'ls',
  'pwd',
  'clear',
  'exit',
  'node',
  'python',
  'pip install',
  'cargo build',
  'cargo run',
  'go run',
  'go build',
]

// Task buttons for quick actions
const QUICK_TASKS = [
  { label: 'Install', command: 'npm install', color: 'text-emerald-400' },
  { label: 'Dev', command: 'npm run dev', color: 'text-blue-400' },
  { label: 'Build', command: 'npm run build', color: 'text-amber-400' },
  { label: 'Test', command: 'npm run test', color: 'text-purple-400' },
]

export default function Terminal({
  initialLines = [],
  onCommand,
  className = '',
}: TerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>(initialLines)
  const [input, setInput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const [commandHistory, setCommandHistory] = useState<CommandHistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState(0)
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  // Load command history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('aethel-terminal-history')
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory)
        setCommandHistory(parsed.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp)
        })))
      } catch (e) {
        console.warn('Failed to parse terminal history')
      }
    }
  }, [])

  // Save command history to localStorage
  useEffect(() => {
    if (commandHistory.length > 0) {
      localStorage.setItem(
        'aethel-terminal-history',
        JSON.stringify(commandHistory.slice(-100)) // Keep last 100 commands
      )
    }
  }, [commandHistory])

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [lines])

  // Update suggestions based on input
  useEffect(() => {
    if (input.length > 0) {
      const filtered = COMMON_COMMANDS.filter(cmd =>
        cmd.toLowerCase().startsWith(input.toLowerCase())
      )
      
      // Also search in command history
      const historyMatches = commandHistory
        .filter(h => h.command.toLowerCase().startsWith(input.toLowerCase()))
        .map(h => h.command)
        .reverse()
        .slice(0, 3)
      
      const combined = [...new Set([...historyMatches, ...filtered])].slice(0, 5)
      setSuggestions(combined)
      setShowSuggestions(combined.length > 0)
      setSelectedSuggestion(0)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [input, commandHistory])

  const addLine = useCallback((type: TerminalLine['type'], content: string) => {
    setLines(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type,
        content,
        timestamp: new Date(),
      },
    ])
  }, [])

  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) return

    // Add to history
    setCommandHistory(prev => [
      ...prev,
      { command: command.trim(), timestamp: new Date() }
    ])
    setHistoryIndex(-1)

    // Add input line
    addLine('input', command)

    // Handle built-in commands
    if (command.trim() === 'clear') {
      setLines([])
      return
    }

    if (command.trim() === 'history') {
      const historyOutput = commandHistory
        .slice(-20)
        .map((h, i) => `  ${i + 1}  ${h.command}`)
        .join('\n')
      addLine('output', historyOutput || 'No commands in history')
      return
    }

    if (command.trim() === 'help') {
      addLine('info', `
Available commands:
  clear     - Clear terminal
  history   - Show command history
  help      - Show this help message
  
Use ↑/↓ arrows to navigate command history
Use Tab for autocomplete
Press Ctrl+C to cancel running command
      `.trim())
      return
    }

    // Execute command
    setIsExecuting(true)
    try {
      if (onCommand) {
        const result = await onCommand(command)
        if (result) {
          addLine('output', result)
        }
      } else {
        // Simulated response when no handler
        await new Promise(resolve => setTimeout(resolve, 500))
        addLine('info', `Command executed: ${command}`)
      }
    } catch (error) {
      addLine('error', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }, [addLine, commandHistory, onCommand])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Handle suggestions
    if (showSuggestions) {
      if (e.key === 'Tab') {
        e.preventDefault()
        if (suggestions[selectedSuggestion]) {
          setInput(suggestions[selectedSuggestion])
          setShowSuggestions(false)
        }
        return
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        return
      }
      
      if (e.key === 'ArrowUp' && suggestions.length > 0) {
        e.preventDefault()
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : prev)
        return
      }
      
      if (e.key === 'Escape') {
        setShowSuggestions(false)
        return
      }
    }

    // Handle command history navigation
    if (e.key === 'ArrowUp' && !showSuggestions) {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 
          ? historyIndex + 1 
          : historyIndex
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex]?.command || '')
      }
      return
    }

    if (e.key === 'ArrowDown' && !showSuggestions) {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[commandHistory.length - 1 - newIndex]?.command || '')
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
      return
    }

    // Execute command on Enter
    if (e.key === 'Enter' && !isExecuting) {
      setShowSuggestions(false)
      executeCommand(input)
      setInput('')
      return
    }

    // Cancel on Ctrl+C
    if (e.key === 'c' && e.ctrlKey) {
      if (isExecuting) {
        addLine('error', '^C')
        setIsExecuting(false)
      }
      return
    }
  }

  const handleQuickTask = (command: string) => {
    executeCommand(command)
  }

  const lineColors: Record<TerminalLine['type'], string> = {
    input: 'text-emerald-400',
    output: 'text-slate-300',
    error: 'text-red-400',
    info: 'text-blue-400',
  }

  return (
    <div
      ref={terminalRef}
      className={`
        flex flex-col bg-slate-950 rounded-lg border border-slate-800 overflow-hidden
        ${isMaximized ? 'fixed inset-4 z-50' : 'h-80'}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Terminal</span>
          {isExecuting && (
            <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Quick Tasks */}
          <div className="hidden sm:flex items-center gap-1 mr-4">
            {QUICK_TASKS.map(task => (
              <button
                key={task.command}
                onClick={() => handleQuickTask(task.command)}
                disabled={isExecuting}
                className={`
                  px-2 py-1 text-xs font-medium rounded
                  bg-slate-800 hover:bg-slate-700 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${task.color}
                `}
              >
                {task.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setLines([])}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Output Area */}
      <div
        ref={outputRef}
        className="flex-1 p-4 overflow-y-auto font-mono text-sm"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.length === 0 && (
          <div className="text-slate-500">
            Terminal ready. Type 'help' for available commands.
          </div>
        )}
        
        {lines.map(line => (
          <div key={line.id} className={`mb-1 ${lineColors[line.type]}`}>
            {line.type === 'input' && (
              <span className="text-slate-500 mr-2">$</span>
            )}
            <span className="whitespace-pre-wrap">{line.content}</span>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="relative px-4 py-3 bg-slate-900/50 border-t border-slate-800">
        {/* Autocomplete Suggestions */}
        {showSuggestions && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                onClick={() => {
                  setInput(suggestion)
                  setShowSuggestions(false)
                  inputRef.current?.focus()
                }}
                className={`
                  w-full px-3 py-2 text-left text-sm font-mono
                  ${index === selectedSuggestion
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700'
                  }
                `}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isExecuting ? 'Running...' : 'Enter command...'}
            disabled={isExecuting}
            className="flex-1 bg-transparent text-slate-100 font-mono text-sm outline-none placeholder-slate-600 disabled:opacity-50"
            autoFocus
          />
        </div>
        
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
          <span>↑↓ History</span>
          <span>Tab Autocomplete</span>
          <span>Ctrl+C Cancel</span>
        </div>
      </div>
    </div>
  )
}
