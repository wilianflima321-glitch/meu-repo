'use client'

import { useState } from 'react'
import { AlertTriangle, XCircle, Info, CheckCircle, ChevronDown, ChevronUp, FileText, Code, ExternalLink } from 'lucide-react'

interface Error {
  id: string
  type: 'error' | 'warning' | 'info' | 'success'
  severity: 'critical' | 'major' | 'minor' | 'suggestion'
  message: string
  code: string
  line: number
  column: number
  file: string
  documentation: string
  fixable: boolean
}

interface ErrorHighlightingProps {
  errors: Error[]
  onErrorSelect: (error: Error) => void
  onErrorDismiss: (errorId: string) => void
  onFixError: (errorId: string) => void
}

export function ErrorHighlighting({ errors = [], onErrorSelect, onErrorDismiss, onFixError }: ErrorHighlightingProps) {
  const [selectedError, setSelectedError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const [expanded, setExpanded] = useState(true)

  const filteredErrors = errors.filter(e => {
    if (filter === 'all') return true
    return e.type === filter
  })

  const getErrorIcon = (type: Error['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-4 h-4 text-[var(--aethel-error-light)]" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-[var(--aethel-warning-light)]" />
      case 'info':
        return <Info className="w-4 h-4 text-[var(--aethel-info-light)]" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-[var(--aethel-success-light)]" />
    }
  }

  const getSeverityColor = (severity: Error['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-l-4 border-[var(--aethel-error)]'
      case 'major':
        return 'border-l-4 border-[var(--aethel-warning)]'
      case 'minor':
        return 'border-l-4 border-[var(--aethel-info)]'
      case 'suggestion':
        return 'border-l-4 border-[var(--aethel-success)]'
    }
  }

  const getTypeCount = (type: Error['type']) => errors.filter(e => e.type === type).length

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--aethel-warning-light)]" />
          <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Problemas</span>
          <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{filteredErrors.length}</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
        >
          {expanded  <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-1 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-4 py-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-[10px] rounded-full transition-colors ${
                filter === 'all'
                   'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
              }`}
            >
              Todos {filteredErrors.length}
            </button>
            <button
              type="button"
              onClick={() => setFilter('error')}
              className={`px-3 py-1 text-[10px] rounded-full transition-colors ${
                filter === 'error'
                   'bg-[var(--aethel-error)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
              }`}
            >
              Erros {getTypeCount('error')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('warning')}
              className={`px-3 py-1 text-[10px] rounded-full transition-colors ${
                filter === 'warning'
                   'bg-[var(--aethel-warning)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
              }`}
            >
              Alertas {getTypeCount('warning')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('info')}
              className={`px-3 py-1 text-[10px] rounded-full transition-colors ${
                filter === 'info'
                   'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
              }`}
            >
              Info {getTypeCount('info')}
            </button>
          </div>

          {/* Errors List */}
          <div className="flex-1 overflow-auto p-4 space-y-2">
            {filteredErrors.length === 0  (
              <div className="flex items-center justify-center py-8 text-[var(--aethel-text-tertiary)] text-sm">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[var(--aethel-success-light)]" />
                  <p>{errors.length === 0  'Integração Monaco pendente' : 'Nenhum problema encontrado'}</p>
                  <p className="text-xs mt-1">
                    {errors.length === 0  'Aguardando diagnósticos do editor.' : 'Seu código está limpo'}
                  </p>
                </div>
              </div>
            ) : (
              filteredErrors.map(error => (
                <div
                  key={error.id}
                  className={`rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3 ${getSeverityColor(error.severity)} ${
                    selectedError === error.id  'ring-2 ring-[var(--aethel-primary)]' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getErrorIcon(error.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--aethel-text-primary)]">{error.message}</span>
                        {error.fixable && (
                          <button
                            type="button"
                            onClick={() => onFixError.(error.id)}
                            className="px-2 py-0.5 text-[10px] rounded bg-[var(--aethel-success)] text-[var(--aethel-text-primary)] hover:brightness-110 transition-colors"
                          >
                            Fix
                          </button>
                        )}
                      </div>
                      {error.code && (
                        <p className="text-[10px] text-[var(--aethel-text-tertiary)] font-mono">{error.code}</p>
                      )}
                      {(error.line || error.file) && (
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--aethel-text-quaternary)]">
                          {error.file && <span>{error.file}</span>}
                          {error.line && <span>Linha {error.line}</span>}
                          {error.column && <span>Col {error.column}</span>}
                        </div>
                      )}
                      {error.documentation && selectedError === error.id && (
                        <div className="mt-2 p-2 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)]">
                          <p className="text-[10px] text-[var(--aethel-text-secondary)]">{error.documentation}</p>
                          <button
                            type="button"
                            className="mt-2 flex items-center gap-1 text-[10px] text-[var(--aethel-primary-light)] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Saiba mais
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedError(selectedError === error.id  null : error.id)}
                        className="p-1 rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
                        title="Ver detalhes"
                      >
                        <FileText className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onErrorDismiss.(error.id)}
                        className="p-1 rounded text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] transition-colors"
                        title="Dispensar"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-2">
            <div className="flex items-center justify-between text-[10px] text-[var(--aethel-text-tertiary)]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-[var(--aethel-error-light)]" />
                  {getTypeCount('error')} erros
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-[var(--aethel-warning-light)]" />
                  {getTypeCount('warning')} alertas
                </span>
              </div>
              <span>{filteredErrors.length} total</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
// Diagnósticos reais devem ser fornecidos pela integração Monaco/LSP.
