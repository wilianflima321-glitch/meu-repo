'use client'

/**
 * IDE bottom-dock Diagnostics — reads ProblemsManager authority (Monaco/LSP).
 * Fail-closed honest empty state when no diagnostics are published.
 */

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, FileCode } from 'lucide-react'
import {
  getProblemsManager,
  type Diagnostic,
  type ProblemStats,
} from '@/lib/problems/problems-manager'

function basename(uri: string): string {
  const normalized = uri.replace(/\\/g, '/')
  const parts = normalized.split('/')
  return parts[parts.length - 1] || uri
}

function severityClass(severity: Diagnostic['severity']): string {
  switch (severity) {
    case 'error':
      return 'text-[var(--aethel-error-light)]'
    case 'warning':
      return 'text-[var(--aethel-warning-light)]'
    case 'info':
      return 'text-[var(--aethel-info-light)]'
    default:
      return 'text-[var(--aethel-text-tertiary)]'
  }
}

export function IdeDiagnosticsDock() {
  const [problems, setProblems] = useState<Diagnostic[]>([])
  const [stats, setStats] = useState<ProblemStats>({
    errors: 0,
    warnings: 0,
    infos: 0,
    hints: 0,
    total: 0,
  })

  useEffect(() => {
    const manager = getProblemsManager()
    const refresh = () => {
      setProblems(manager.getProblems())
      setStats(manager.getStats())
    }
    refresh()
    return manager.onDidChangeProblems(() => refresh())
  }, [])

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--aethel-bg-base)] border border-[var(--aethel-glass-border)]"
      data-testid="ide-diagnostics-dock"
      aria-label="Problems and diagnostics"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--aethel-glass-border)] px-3 py-2 bg-[var(--aethel-surface-primary)]">
        <div className="flex items-center gap-2 font-mono">
          <FileCode className="w-4 h-4 text-indigo-400" />
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--aethel-text-primary)]">
            Problems &amp; Diagnostics
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="flex items-center gap-1 text-[var(--aethel-error)] font-bold">
            <AlertCircle className="w-3 h-3" /> {stats.errors} Errors
          </span>
          <span className="flex items-center gap-1 text-[var(--aethel-warning)] font-bold">
            <AlertTriangle className="w-3 h-3" /> {stats.warnings} Warnings
          </span>
          <span className="text-[var(--aethel-text-tertiary)]">
            {stats.total} Total
          </span>
        </div>
      </div>

      {problems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-xs text-[var(--aethel-text-secondary)] font-mono">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-1">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="font-bold text-[var(--aethel-text-primary)]">No diagnostics reported</p>
          <p className="max-w-md text-[11px] text-[var(--aethel-text-tertiary)]">
            Zero workspace errors detected. Language Server Protocol (LSP) and Monaco diagnostics are active.
          </p>
        </div>
      ) : (
        <ul className="min-h-0 flex-1 list-none overflow-auto p-0 m-0 font-mono">
          {problems.map((problem, index) => (
            <li
              key={`${problem.uri}:${problem.range.start.line}:${problem.range.start.character}:${index}`}
              className="border-b border-[var(--aethel-glass-border)] px-3 py-2 text-[11px] hover:bg-[var(--aethel-surface-secondary)] transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2">
                {problem.severity === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5 text-[var(--aethel-error)] shrink-0" />
                ) : problem.severity === 'warning' ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--aethel-warning)] shrink-0" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-[var(--aethel-info)] shrink-0" />
                )}
                <span className={`font-bold uppercase ${severityClass(problem.severity)}`}>
                  {problem.severity}
                </span>
                <span className="text-[var(--aethel-text-primary)] font-bold">{basename(problem.uri)}</span>
                <span className="text-[var(--aethel-text-tertiary)]">
                  L{problem.range.start.line + 1}:{problem.range.start.character + 1}
                </span>
                {problem.source ? (
                  <span className="text-[10px] bg-[var(--aethel-surface-tertiary)] px-1.5 py-0.5 rounded border border-[var(--aethel-glass-border)] text-[var(--aethel-text-quaternary)]">
                    {problem.source}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 pl-5 text-[var(--aethel-text-secondary)]">{problem.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default IdeDiagnosticsDock
