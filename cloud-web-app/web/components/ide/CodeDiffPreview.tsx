'use client'

import { useState } from 'react'
import { Check, X, Eye, GitMerge, AlertTriangle } from 'lucide-react'

interface DiffLine {
  lineNumber: number
  content: string
  type: 'added' | 'removed' | 'unchanged' | 'context'
}

interface DiffFile {
  path: string
  oldContent: string
  newContent: string
  lines: DiffLine[]
}

interface CodeDiffPreviewProps {
  diffs: DiffFile[]
  onAccept: (filePaths: string[]) => void
  onReject: (filePaths: string[]) => void
  onAcceptLine: (filePath: string, lineNumber: number) => void
  onRejectLine: (filePath: string, lineNumber: number) => void
}

export function CodeDiffPreview({
  diffs,
  onAccept,
  onReject,
  onAcceptLine,
  onRejectLine,
}: CodeDiffPreviewProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(diffs[0]?.path || null)
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set())

  const hasDiffs = diffs.length > 0
  const selectedDiff = diffs.find(d => d.path === selectedFile)

  const toggleLineExpansion = (lineId: string) => {
    setExpandedLines(prev => {
      const next = new Set(prev)
      if (next.has(lineId)) {
        next.delete(lineId)
      } else {
        next.add(lineId)
      }
      return next
    })
  }

  const getLineClass = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return 'bg-[color-mix(in_srgb,var(--aethel-success)_15%,transparent)] text-[var(--aethel-success-light)]'
      case 'removed':
        return 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error-light)]'
      case 'context':
        return 'text-[var(--aethel-text-tertiary)]'
      default:
        return 'text-[var(--aethel-text-secondary)]'
    }
  }

  const getLinePrefix = (type: DiffLine['type']) => {
    switch (type) {
      case 'added':
        return '+'
      case 'removed':
        return '-'
      default:
        return ' '
    }
  }

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="flex items-center gap-2">
          <GitMerge className="w-4 h-4 text-[var(--aethel-info-light)]" />
          <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Prévia de diff</span>
          <span className="text-xs text-[var(--aethel-text-tertiary)]">{diffs.length} arquivo(s)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onReject(diffs.map(d => d.path))}
            disabled={!hasDiffs}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] hover:text-[var(--aethel-error-light)]"
          >
            <X className="w-3.5 h-3.5" />
            Rejeitar tudo
          </button>
          <button
            type="button"
            onClick={() => onAccept(diffs.map(d => d.path))}
            disabled={!hasDiffs}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-primary)] transition-colors hover:brightness-110"
          >
            <Check className="w-3.5 h-3.5" />
            Aplicar mudanças
          </button>
        </div>
      </div>

      {/* File List */}
      <div className="flex border-b border-[var(--aethel-border-primary)]">
        <div className="flex overflow-x-auto">
          {diffs.map(diff => (
            <button
              key={diff.path}
              type="button"
              onClick={() => setSelectedFile(diff.path)}
              className={`flex items-center gap-2 px-4 py-2 text-xs border-b-2 transition-colors whitespace-nowrap ${
                selectedFile === diff.path
                   'border-[var(--aethel-primary)] bg-[color-mix(in_srgb,var(--aethel-primary)_10%,transparent)] text-[var(--aethel-text-primary)]'
                  : 'border-transparent text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-[var(--aethel-warning)]" />
              <span className="truncate max-w-[200px]">{diff.path}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Diff Content */}
      <div className="flex-1 overflow-auto">
        {!hasDiffs && (
          <div className="p-4">
            <div className="flex items-center justify-center rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-4 text-xs text-[var(--aethel-text-tertiary)]">
              Nenhuma mudança pendente para pré-visualização.
            </div>
          </div>
        )}
        {selectedDiff && hasDiffs && (
          <div className="p-4">
            <div className="font-mono text-xs">
              {selectedDiff.lines.map((line, index) => {
                const lineId = `${selectedDiff.path}-${line.lineNumber}`
                const isExpanded = expandedLines.has(lineId)
                
                return (
                  <div
                    key={lineId}
                    className={`flex ${getLineClass(line.type)} hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]`}
                  >
                    <span className="w-8 text-right text-[var(--aethel-text-quaternary)] select-none">
                      {line.lineNumber}
                    </span>
                    <span className="w-4 select-none">{getLinePrefix(line.type)}</span>
                    <span className="flex-1 whitespace-pre">{line.content}</span>
                    {(line.type === 'added' || line.type === 'removed') && (
                      <div className="flex items-center gap-1 ml-2">
                        {onAcceptLine && (
                          <button
                            type="button"
                            onClick={() => onAcceptLine(selectedDiff.path, line.lineNumber)}
                            className="p-1 rounded hover:bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] transition-colors"
                            title="Aceitar linha"
                          >
                            <Check className="w-3 h-3 text-[var(--aethel-success-light)]" />
                          </button>
                        )}
                        {onRejectLine && (
                          <button
                            type="button"
                            onClick={() => onRejectLine(selectedDiff.path, line.lineNumber)}
                            className="p-1 rounded hover:bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] transition-colors"
                            title="Rejeitar linha"
                          >
                            <X className="w-3 h-3 text-[var(--aethel-error-light)]" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
        <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--aethel-success)]" />
              {diffs.reduce((acc, d) => acc + d.lines.filter(l => l.type === 'added').length, 0)} adições
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--aethel-error)]" />
              {diffs.reduce((acc, d) => acc + d.lines.filter(l => l.type === 'removed').length, 0)} remoções
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" />
            <span>Prévia antes de aplicar</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to generate diff lines from old and new content
export function generateDiffLines(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const lines: DiffLine[] = []
  
  // Simple diff algorithm (can be replaced with proper diff library)
  const maxLines = Math.max(oldLines.length, newLines.length)
  
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]
    
    if (oldLine === newLine) {
      if (oldLine !== undefined) {
        lines.push({
          lineNumber: i + 1,
          content: oldLine,
          type: 'unchanged',
        })
      }
    } else if (oldLine === undefined && newLine !== undefined) {
      lines.push({
        lineNumber: i + 1,
        content: newLine,
        type: 'added',
      })
    } else if (oldLine !== undefined && newLine === undefined) {
      lines.push({
        lineNumber: i + 1,
        content: oldLine,
        type: 'removed',
      })
    } else {
      // Both exist but different
      lines.push({
        lineNumber: i + 1,
        content: oldLine,
        type: 'removed',
      })
      lines.push({
        lineNumber: i + 1,
        content: newLine,
        type: 'added',
      })
    }
  }
  
  return lines
}
