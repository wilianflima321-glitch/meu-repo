'use client'

/**
 * Block 7A.1 + 7B.5 — Virtualized console (5k cap) + playtest postMessage bridge.
 * Desktop IPC remains [HELD] (evaluatePlaytestConsoleBridgeCapability).
 */

import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Terminal, X, Trash2, Filter, AlertTriangle, Info, CheckCircle2, Bug } from 'lucide-react'
import { appendCappedLog, CONSOLE_LOG_CAPACITY } from '../../web/lib/ui/virtual-window'
import {
  evaluatePlaytestConsoleBridgeCapability,
  isPlaytestConsoleMessage,
} from '../../web/lib/console/playtest-console-bridge'

const NODE_ID_PATTERN = /\bnode-\d{10,}\b/g
const LOG_ROW_HEIGHT = 52

function focusVisualScriptNode(nodeId: string) {
  window.dispatchEvent(new CustomEvent('aethel.visualScript.focusNode', { detail: { nodeId } }))
}

function renderMessageWithNodeLinks(message: string): ReactNode {
  const matches = Array.from(message.matchAll(NODE_ID_PATTERN))
  if (matches.length === 0) return message

  const segments: ReactNode[] = []
  let cursor = 0
  matches.forEach((match, index) => {
    const nodeId = match[0]
    const start = match.index ?? 0
    if (start > cursor) segments.push(message.slice(cursor, start))
    segments.push(
      <button
        key={`${nodeId}-${index}`}
        type="button"
        onClick={() => focusVisualScriptNode(nodeId)}
        aria-label={`Focus visual script node ${nodeId}`}
        title="Fly the Visual Scripting canvas to this node"
        className="mx-0.5 inline rounded bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)] px-1 font-semibold text-[var(--aethel-info-light)] underline decoration-dotted underline-offset-2 hover:bg-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)]"
      >
        {nodeId}
      </button>,
    )
    cursor = start + nodeId.length
  })
  if (cursor < message.length) segments.push(message.slice(cursor))
  return segments
}

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

export function ConsoleIntegration({ onClear = () => undefined }: ConsoleIntegrationProps) {
  const [logs, setLogs] = useState<ConsoleLog[]>([])
  const [activeFilter, setActiveFilter] = useState<ConsoleLog['type'] | 'all'>('all')
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bridgeCapability = useMemo(() => evaluatePlaytestConsoleBridgeCapability(), [])

  const pushLog = useCallback((log: ConsoleLog) => {
    setLogs((prev) => appendCappedLog(prev, log, CONSOLE_LOG_CAPACITY))
  }, [])

  useEffect(() => {
    type ConsoleMethod = (...args: unknown[]) => void
    type ConsoleBridge = {
      log?: ConsoleMethod
      warn?: ConsoleMethod
      error?: ConsoleMethod
      info?: ConsoleMethod
      debug?: ConsoleMethod
    }

    const consoleApi = Reflect.get(globalThis, 'console') as ConsoleBridge | undefined
    if (!consoleApi) return

    const originalLog = consoleApi.log?.bind(consoleApi) ?? (() => undefined)
    const originalWarn = consoleApi.warn?.bind(consoleApi) ?? (() => undefined)
    const originalError = consoleApi.error?.bind(consoleApi) ?? (() => undefined)
    const originalInfo = consoleApi.info?.bind(consoleApi) ?? (() => undefined)
    const originalDebug = consoleApi.debug?.bind(consoleApi) ?? (() => undefined)

    const addLog = (type: ConsoleLog['type'], args: unknown[]) => {
      const message = args
        .map((arg) => (typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)))
        .join(' ')
      const firstArg = args[0]
      const stack = firstArg instanceof Error ? firstArg.stack : undefined

      pushLog({
        id: `${Date.now()}-${Math.random()}`,
        type,
        message,
        timestamp: Date.now(),
        source: 'browser',
        stack: type === 'error' ? stack : undefined,
      })
    }

    consoleApi.log = (...args) => {
      originalLog(...args)
      addLog('log', args)
    }
    consoleApi.warn = (...args) => {
      originalWarn(...args)
      addLog('warn', args)
    }
    consoleApi.error = (...args) => {
      originalError(...args)
      addLog('error', args)
    }
    consoleApi.info = (...args) => {
      originalInfo(...args)
      addLog('info', args)
    }
    consoleApi.debug = (...args) => {
      originalDebug(...args)
      addLog('debug', args)
    }

    return () => {
      consoleApi.log = originalLog
      consoleApi.warn = originalWarn
      consoleApi.error = originalError
      consoleApi.info = originalInfo
      consoleApi.debug = originalDebug
    }
  }, [pushLog])

  // 7B.5 — ingest playtest iframe/console via postMessage (desktop IPC HELD)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isPlaytestConsoleMessage(event.data)) return
      pushLog({
        id: `playtest-${event.data.timestamp ?? Date.now()}-${Math.random()}`,
        type: event.data.level,
        message: event.data.message,
        timestamp: event.data.timestamp ?? Date.now(),
        source: event.data.source ?? 'playtest',
        stack: event.data.stack,
      })
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [pushLog])

  const filteredLogs = useMemo(
    () => (activeFilter === 'all' ? logs : logs.filter((log) => log.type === activeFilter)),
    [logs, activeFilter],
  )

  const rowVirtualizer = useVirtualizer({
    count: filteredLogs.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => LOG_ROW_HEIGHT,
    overscan: 10,
    getItemKey: (index) => filteredLogs[index]?.id ?? index,
  })

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
    error: logs.filter((l) => l.type === 'error').length,
    warn: logs.filter((l) => l.type === 'warn').length,
    info: logs.filter((l) => l.type === 'info').length,
    log: logs.filter((l) => l.type === 'log').length,
    debug: logs.filter((l) => l.type === 'debug').length,
  }

  return (
    <div className="flex flex-col bg-[var(--aethel-surface-primary)] border-t border-[var(--aethel-border-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:text-[var(--aethel-text-secondary)] transition-colors"
          >
            <Terminal className="w-4 h-4 text-[var(--aethel-info-light)]" />
            Console
            <span className="text-xs text-[var(--aethel-text-tertiary)]">{logCounts.all}</span>
          </button>
          <span
            className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]"
            title={bridgeCapability.note}
          >
            IPC [{bridgeCapability.desktopIpc}]
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearLogs}
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Clear console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <X className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex items-center gap-2 border-b border-[var(--aethel-border-primary)] px-4 py-2 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
          <Filter className="w-3.5 h-3.5 text-[var(--aethel-text-tertiary)]" />
          <div className="flex items-center gap-1">
            {(
              [
                ['all', logCounts.all],
                ['error', logCounts.error],
                ['warn', logCounts.warn],
                ['log', logCounts.log],
              ] as const
            ).map(([key, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key === 'all' ? 'all' : key)}
                className={`px-2 py-1 text-[10px] rounded transition-colors ${
                  activeFilter === key
                    ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                    : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
                }`}
              >
                {key === 'all' ? 'All' : key === 'error' ? 'Errors' : key === 'warn' ? 'Warnings' : 'Logs'} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {isExpanded && (
        <div ref={scrollRef} className="h-48 overflow-auto p-3 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[var(--aethel-text-tertiary)]">No logs yet</div>
          ) : (
            <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const log = filteredLogs[virtualRow.index]
                if (!log) return null
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className="absolute left-0 top-0 w-full"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div
                      className={`flex items-start gap-2 rounded px-2 py-1 hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] ${getLogColor(log.type)}`}
                    >
                      {getLogIcon(log.type)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--aethel-text-quaternary)]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className="font-medium">{log.type.toUpperCase()}</span>
                          {log.source && log.source !== 'browser' ? (
                            <span className="text-[9px] uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">
                              {log.source}
                            </span>
                          ) : null}
                        </div>
                        <div className="whitespace-pre-wrap break-all">{renderMessageWithNodeLinks(log.message)}</div>
                        {log.stack ? (
                          <details className="mt-1">
                            <summary className="cursor-pointer text-[10px] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]">
                              Stack trace
                            </summary>
                            <pre className="mt-1 whitespace-pre-wrap text-[10px] text-[var(--aethel-text-quaternary)]">
                              {renderMessageWithNodeLinks(log.stack)}
                            </pre>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
