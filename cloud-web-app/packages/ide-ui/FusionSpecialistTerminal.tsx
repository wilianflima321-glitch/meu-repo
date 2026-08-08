'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronRight, Cpu, Loader2, Terminal, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type IntentStatus = 'idle' | 'running' | 'success' | 'error'

interface HistoryEntry {
  id: string
  intent: string
  timestamp: Date
  status: IntentStatus
  output?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 64
const HISTORY_KEY = 'aethel.fusion.terminal.history'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadHistory(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveHistory(entries: string[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(-MAX_HISTORY)))
  } catch { /* quota */ }
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ─── StatusDot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: IntentStatus }) {
  const config = {
    idle:    { cls: 'bg-[var(--aethel-text-quaternary)]', pulse: false },
    running: { cls: 'bg-[var(--aethel-primary)]',        pulse: true  },
    success: { cls: 'bg-[var(--aethel-success)]',        pulse: false },
    error:   { cls: 'bg-[var(--aethel-error)]',          pulse: false },
  }[status]

  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${config.cls} ${config.pulse ? 'animate-pulse' : ''}`}
      aria-hidden="true"
    />
  )
}

// ─── OutputLine ──────────────────────────────────────────────────────────────

function OutputLine({ entry }: { entry: HistoryEntry }) {
  const statusColors: Record<IntentStatus, string> = {
    idle:    'text-[var(--aethel-text-tertiary)]',
    running: 'text-[var(--aethel-primary-light)]',
    success: 'text-[var(--aethel-success-light)]',
    error:   'text-[var(--aethel-error-light)]',
  }

  return (
    <div className="group py-1.5">
      {/* Command line */}
      <div className="flex items-start gap-2">
        <span className="shrink-0 font-mono text-[10px] text-[var(--aethel-text-quaternary)] pt-[1px]">
          {formatTimestamp(entry.timestamp)}
        </span>
        <ChevronRight className="h-3 w-3 shrink-0 text-[var(--aethel-primary)] mt-[1px]" aria-hidden="true" />
        <span className="font-mono text-xs text-[var(--aethel-text-primary)] break-all leading-5">
          {entry.intent}
        </span>
        <StatusDot status={entry.status} />
      </div>

      {/* Output response */}
      {entry.output && (
        <div className={`mt-1 ml-[88px] font-mono text-xs leading-5 whitespace-pre-wrap ${statusColors[entry.status]}`}>
          {entry.output}
        </div>
      )}
    </div>
  )
}

// ─── FusionSpecialistTerminal ─────────────────────────────────────────────────

/**
 * Fusion Specialist Terminal — Maestro intent dispatch surface.
 *
 * Receives natural-language intents ("gravity low on water layer 3") and routes
 * them to the Maestro IPC bridge (Tauri command `fusion_dispatch_intent`).
 * Falls back to a structured placeholder response in browser/non-Tauri context.
 *
 * Design parity: Warp, VS Code integrated terminal, Cursor inline terminal.
 */
export const FusionSpecialistTerminal: React.FC<{
  onClose?: () => void
}> = ({ onClose }) => {
  const [intent, setIntent]       = useState('')
  const [status, setStatus]       = useState<IntentStatus>('idle')
  const [history, setHistory]     = useState<HistoryEntry[]>([])
  const [historyNav, setHistoryNav] = useState(-1)
  const [commandHistory]          = useState<string[]>(() => loadHistory())
  const inputRef                  = useRef<HTMLInputElement>(null)
  const outputRef                 = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [history])

  const dispatchIntent = useCallback(async (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed || status === 'running') return

    const entry: HistoryEntry = {
      id:        crypto.randomUUID(),
      intent:    trimmed,
      timestamp: new Date(),
      status:    'running',
    }
    setHistory((prev) => [...prev, entry])
    setStatus('running')
    setIntent('')
    setHistoryNav(-1)

    // Persist to session command history
    const nextCmd = [trimmed, ...commandHistory.filter((c) => c !== trimmed)].slice(0, MAX_HISTORY)
    nextCmd.forEach((c, i) => { commandHistory[i] = c })
    commandHistory.length = nextCmd.length
    saveHistory(nextCmd)

    try {
      // Attempt Tauri IPC bridge — available in the studio-local desktop context.
      // In web context this resolves with a capability-gated fallback.
      let output: string

      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        const { invoke } = await import('@tauri-apps/api/tauri')
        output = await invoke<string>('fusion_dispatch_intent', { intent: trimmed })
      } else {
        // Browser fallback — returns a structured capability note so the UI
        // is never silent. Real dispatch requires the local desktop app.
        await new Promise((r) => setTimeout(r, 320))
        output = `[Maestro] Intent received. Desktop runtime required for execution.\nIntent parsed: "${trimmed}"\nRoute: fusion_dispatch_intent → IPC bridge → Rust kernel`
      }

      setHistory((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: 'success', output } : e
        )
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setHistory((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: 'error', output: `[Error] ${message}` } : e
        )
      )
    } finally {
      setStatus('idle')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandHistory, status])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void dispatchIntent(intent)
      return
    }

    // Navigate command history with Up/Down arrows
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const nextNav = Math.min(historyNav + 1, commandHistory.length - 1)
      setHistoryNav(nextNav)
      setIntent(commandHistory[nextNav] ?? '')
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const nextNav = Math.max(historyNav - 1, -1)
      setHistoryNav(nextNav)
      setIntent(nextNav === -1 ? '' : commandHistory[nextNav] ?? '')
      return
    }

    if (e.key === 'Escape') {
      setIntent('')
      setHistoryNav(-1)
    }
  }

  const clearHistory = () => setHistory([])

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_92%,transparent)] shadow-[0_24px_80px_rgba(2,6,23,0.54)] backdrop-blur-2xl"
      style={{ minWidth: 420, maxWidth: 640 }}
      role="dialog"
      aria-label="Fusion Specialist Terminal — Maestro intent dispatch"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)]">
            <Terminal className="h-3.5 w-3.5 text-[var(--aethel-primary-light)]" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-[var(--aethel-text-primary)]">Fusion Terminal</p>
            <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Maestro IPC &mdash; Direct Intent</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <StatusDot status={status} />
          <span className="text-[10px] uppercase tracking-widest text-[var(--aethel-text-quaternary)]">
            {status}
          </span>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="ml-2 rounded px-2 py-1 text-[10px] text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]"
              aria-label="Clear terminal output"
            >
              Clear
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-1 flex h-6 w-6 items-center justify-center rounded text-[var(--aethel-text-tertiary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] hover:text-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]"
              aria-label="Close terminal"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Output pane */}
      <div
        ref={outputRef}
        className="min-h-[140px] max-h-[320px] overflow-y-auto px-4 py-3 font-mono"
        aria-live="polite"
        aria-label="Terminal output"
      >
        {history.length === 0 ? (
          <div className="flex h-20 flex-col items-center justify-center gap-2 text-center">
            <Cpu className="h-6 w-6 text-[var(--aethel-text-quaternary)]" aria-hidden="true" />
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              Invoke the Maestro via direct intent
            </p>
            <p className="text-[10px] text-[var(--aethel-text-quaternary)]">
              eg. &ldquo;Set water gravity to 0.2 on layer ocean&rdquo;
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--aethel-border-subtle)]">
            {history.map((entry) => (
              <OutputLine key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {/* Running indicator */}
        {status === 'running' && (
          <div className="mt-2 flex items-center gap-2 text-[var(--aethel-primary-light)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            <span className="font-mono text-xs">Dispatching to Maestro&hellip;</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-3 py-2.5">
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--aethel-primary)]" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Invoke Maestro… (eg. gravity inverted on water)"
          disabled={status === 'running'}
          className="flex-1 bg-transparent font-mono text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)] disabled:opacity-50"
          aria-label="Maestro intent input"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => void dispatchIntent(intent)}
          disabled={!intent.trim() || status === 'running'}
          className="flex h-7 items-center gap-1.5 rounded-lg border-none bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] px-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-primary)]"
          aria-label="Send intent to Maestro"
        >
          {status === 'running'
            ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            : <ChevronRight className="h-3 w-3" aria-hidden="true" />}
          Run
        </button>
      </div>

      {/* Keyboard hint footer */}
      <div className="flex items-center justify-between border-t border-[var(--aethel-border-subtle)] px-4 py-1.5">
        <span className="text-[10px] text-[var(--aethel-text-quaternary)]">
          Enter to run&nbsp;&middot;&nbsp;↑↓ history&nbsp;&middot;&nbsp;Esc to clear
        </span>
        <span className="text-[10px] text-[var(--aethel-text-quaternary)]">
          {commandHistory.length > 0 ? `${commandHistory.length} in history` : ''}
        </span>
      </div>
    </div>
  )
}
