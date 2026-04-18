'use client'

import { useState, useEffect, useRef } from 'react'
import { Terminal, X, Trash2, Filter, AlertTriangle, Info, CheckCircle2, Bug } from 'lucide-react'

interface ConsoleLog {
  id: string
  type: 'log' | 'warn' | 'error' | 'info' | 'debug'
  message: string
  timestamp: number
  source?: string
  stack?: string
}

interface ConsoleIntegrationProps {
  onClear?: () => void
  filter?: ConsoleLog['type'][]
}

export function ConsoleIntegration({ onClear = () => undefined, filter = [] }: ConsoleIntegrationProps) {
  const [logs, setLogs] = useState<ConsoleLog[]>([])
  const [activeFilter, setActiveFilter] = useState<ConsoleLog['type'] | 'all'>('all')
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error
    const originalInfo = console.info
    const originalDebug = console.debug

    const addLog = (type: ConsoleLog['type'], args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      
      const log: ConsoleLog = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        message,
        timestamp: Date.now(),
        source: 'browser',
        stack: type === 'error' && args[0].stack ? args[0].stack : undefined,
      }
      
      setLogs(prev => [...prev.slice(-99), log]) // Keep last 100 logs
    }

    console.log = (...args) => {
      originalLog(...args)
      addLog('log', args)
    }
    console.warn = (...args) => {
      originalWarn(...args)
      addLog('warn', args)
    }
    console.error = (...args) => {
      originalError(...args)
      addLog('error', args)
    }
    console.info = (...args) => {
      originalInfo(...args)
      addLog('info', args)
    }
    console.debug = (...args) => {
      originalDebug(...args)
      addLog('debug', args)
    }

    return () => {
      console.log = originalLog
      console.warn = originalWarn
      console.error = originalError
      console.info = originalInfo
      console.debug = originalDebug
    }
  }, [])

  const filteredLogs = activeFilter === 'all'
    ? logs
    : logs.filter(log => log.type === activeFilter)

  const clearLogs = () => {
    setLogs([])
    onClear()
  }

  const getLogIcon = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-3.5 h-3.5 text-[var(--aethel-error-light)]" />
      case 'warn':
        return <Bug className="w-3.5 h-3.5 text-[var(--aethel-warning-light)]" />
      case 'info':
        return <Info className="w-3.5 h-3.5 text-[var(--aethel-info-light)]" />
      case 'debug':
        return <Terminal className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-[var(--aethel-success-light)]" />
    }
  }

  const getLogColor = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error':
        return 'text-[var(--aethel-error-light)]'
      case 'warn':
        return 'text-[var(--aethel-warning-light)]'
      case 'info':
        return 'text-[var(--aethel-info-light)]'
      case 'debug':
        return 'text-[var(--aethel-text-tertiary)]'
      default:
        return 'text-[var(--aethel-text-secondary)]'
    }
  }

  const logCounts = {
    all: logs.length,
    error: logs.filter(l => l.type === 'error').length,
    warn: logs.filter(l => l.type === 'warn').length,
    info: logs.filter(l => l.type === 'info').length,
    log: logs.filter(l => l.type === 'log').length,
    debug: logs.filter(l => l.type === 'debug').length,
  }

  return (
    <div className="flex flex-col bg-[var(--aethel-surface-primary)] border-t border-[var(--aethel-border-primary)]">
      {/* Console Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:text-[var(--aethel-text-secondary)] transition-colors"
          >
            <Terminal className="w-4 h-4 text-[var(--aethel-info-light)]" />
            Console
            <span className="text-xs text-[var(--aethel-text-tertiary)]">
              {logCounts.all}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearLogs}
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Limpar console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title={isExpanded ? 'Recolher' : 'Expandir'}
          >
           <X className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {/* Console Filters */}
      {isExpanded && (
        <div className="flex items-center gap-2 border-b border-[var(--aethel-border-primary)] px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
          <Filter className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
 activeFilter === 'all' ?
 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
 : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
 }`}
            >
              Todos ({logCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('error')}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
 activeFilter === 'error' ?
 'bg-[var(--aethel-error)] text-[var(--aethel-text-primary)]'
 : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
 }`}
            >
              Erros ({logCounts.error})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('warn')}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
 activeFilter === 'warn' ?
 'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]'
 : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
 }`}
            >
              Alertas ({logCounts.warn})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('log')}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
 activeFilter === 'log' ?
 'bg-[var(--aethel-success)] text-[var(--aethel-text-primary)]'
 : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
 }`}
            >
              Logs ({logCounts.log})
            </button>
          </div>
        </div>
      )}

      {/* Console Content */}
      {isExpanded && (
        <div
          ref={containerRef}
          className="flex-1 overflow-auto max-h-48 p-3 space-y-1 font-mono text-xs"
        >
          {filteredLogs.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[var(--aethel-text-tertiary)]">
              Nenhum log ainda
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className={`flex items-start gap-2 py-1 px-2 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] ${getLogColor(log.type)}`}
              >
                {getLogIcon(log.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--aethel-text-quaternary)]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="font-medium">{log.type.toUpperCase()}</span>
                  </div>
                  <div className="whitespace-pre-wrap break-all">{log.message}</div>
                  {log.stack && (
                    <details className="mt-1">
                     <summary className="cursor-pointer text-[10px] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]">
                        Stack trace
                      </summary>
                      <pre className="mt-1 text-[10px] text-[var(--aethel-text-quaternary)] whitespace-pre-wrap">
                        {log.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
