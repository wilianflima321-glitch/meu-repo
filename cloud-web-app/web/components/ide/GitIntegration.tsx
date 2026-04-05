'use client'

import { useState } from 'react'
import { GitBranch, GitCommit, GitPullRequest, Refresh, Plus, X, Check, AlertTriangle, Clock } from 'lucide-react'

interface GitStatus {
  branch: string
  status: 'clean' | 'modified' | 'conflict'
  ahead: number
  behind: number
  staged: number
  unstaged: number
  untracked: number
}

interface Commit {
  id: string
  message: string
  author: string
  timestamp: number
  hash: string
}

interface GitIntegrationProps {
  status?: GitStatus | null
  commits?: Commit[]
  branches?: string[]
  onCommit?: (message: string) => void
  onPush?: () => void
  onPull?: () => void
  onBranchChange?: (branch: string) => void
}

const STATUS_LABELS: Record<GitStatus['status'], string> = {
  clean: 'limpo',
  modified: 'modificado',
  conflict: 'conflito',
}

export function GitIntegration({
  status: initialStatus,
  commits: initialCommits,
  branches: initialBranches,
  onCommit,
  onPush,
  onPull,
  onBranchChange,
}: GitIntegrationProps) {
  const [status, setStatus] = useState<GitStatus | null>(initialStatus ?? null)
  const [commits] = useState<Commit[]>(initialCommits ?? [])
  const [showCommitDialog, setShowCommitDialog] = useState(false)
  const [commitMessage, setCommitMessage] = useState('')
  const [branches] = useState(initialBranches ?? [])
  const [showBranchMenu, setShowBranchMenu] = useState(false)

  const handleCommit = () => {
    if (!commitMessage.trim()) return
    onCommit?.(commitMessage)
    setCommitMessage('')
    setShowCommitDialog(false)
    if (status) {
      setStatus(prev => (prev ? { ...prev, status: 'clean', staged: 0, unstaged: 0 } : prev))
    }
  }

  const statusLabel = status ? STATUS_LABELS[status.status] : 'integração pendente'
  const canCommit = Boolean(status && status.status !== 'clean')

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[var(--aethel-primary-light)]" />
          <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Git</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBranchMenu(!showBranchMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_70%,transparent)] text-xs text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-primary)] transition-colors"
            disabled={!status}
          >
            <GitBranch className="w-3.5 h-3.5" />
            {status?.branch ?? 'Sem repositório'}
          </button>
          <button
            type="button"
            onClick={onPull}
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Atualizar (pull)"
            aria-label="Atualizar (pull)"
          >
            <GitPullRequest className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onPush}
            className="p-1.5 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
            title="Enviar (push)"
            aria-label="Enviar (push)"
          >
            <Refresh className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Branch Menu */}
      {showBranchMenu && status && branches.length > 0 && (
        <div className="absolute top-12 right-4 w-48 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_95%,transparent)] shadow-lg z-10">
          {branches.map(branch => (
            <button
              key={branch}
              type="button"
              onClick={() => {
                onBranchChange?.(branch)
                setStatus(prev => (prev ? { ...prev, branch } : prev))
                setShowBranchMenu(false)
              }}
              className={`w-full px-3 py-2 text-left text-xs transition-colors ${
                branch === status.branch
                  ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] text-[var(--aethel-primary-light)]'
                  : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]'
              }`}
            >
              {branch}
            </button>
          ))}
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-xs text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors border-t border-[var(--aethel-border-secondary)] flex items-center gap-2"
          >
            <Plus className="w-3 h-3" />
            Nova branch
          </button>
        </div>
      )}

      {/* Status */}
      <div className={`px-4 py-2 border-b border-[var(--aethel-border-primary)] flex items-center justify-between ${
        status?.status === 'clean'
          ? 'bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)]'
          : status?.status === 'conflict'
            ? 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]'
            : status?.status === 'modified'
              ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)]'
              : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]'
      }`)}>
        <div className="flex items-center gap-2">
          {status?.status === 'clean' && <Check className="w-3.5 h-3.5 text-[var(--aethel-success-light)]" />}
          {status?.status === 'conflict' && <AlertTriangle className="w-3.5 h-3.5 text-[var(--aethel-error-light)]" />}
          {status?.status === 'modified' && <Clock className="w-3.5 h-3.5 text-[var(--aethel-warning-light)]" />}
          <span className="text-xs text-[var(--aethel-text-secondary)] capitalize">{statusLabel}</span>
        </div>
        {status && (
          <div className="flex items-center gap-3 text-[10px] text-[var(--aethel-text-tertiary)]">
            <span>+{status.ahead}</span>
            <span>-{status.behind}</span>
          </div>
        )}
      </div>

      {/* Changes */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <div className="text-[10px] font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider mb-2">
          Mudanças
        </div>

        {status?.staged && status.staged > 0 && (
          <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--aethel-text-primary)]">Preparados</span>
              <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{status.staged} arquivo(s)</span>
            </div>
            <div className="text-[10px] text-[var(--aethel-text-secondary)]">
              Pronto para commit
            </div>
          </div>
        )}

        {status?.unstaged && status.unstaged > 0 && (
          <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--aethel-text-primary)]">Não preparados</span>
              <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{status.unstaged} arquivo(s)</span>
            </div>
            <div className="text-[10px] text-[var(--aethel-text-secondary)]">
              Modificações não preparadas
            </div>
          </div>
        )}

        {status?.untracked && status.untracked > 0 && (
          <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--aethel-text-primary)]">Não rastreados</span>
              <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{status.untracked} arquivo(s)</span>
            </div>
            <div className="text-[10px] text-[var(--aethel-text-secondary)]">
              Arquivos novos não rastreados
            </div>
          </div>
        )}

        {status?.status === 'clean' && (
          <div className="flex items-center justify-center py-8 text-[var(--aethel-text-tertiary)] text-sm">
            <div className="text-center">
              <Check className="w-12 h-12 mx-auto mb-3 text-[var(--aethel-success-light)]" />
              <p>Workspace sem pendências</p>
              <p className="text-xs mt-1">Nenhuma modificação pendente</p>
            </div>
          </div>
        )}
        {!status && (
          <div className="flex items-center justify-center py-8 text-[var(--aethel-text-tertiary)] text-sm">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-[var(--aethel-warning-light)]" />
              <p>Integração Git pendente</p>
              <p className="text-xs mt-1">Conecte um backend Git para exibir status real.</p>
            </div>
          </div>
        )}
      </div>

      {/* Commits History */}
      <div className="border-t border-[var(--aethel-border-primary)]">
        <div className="px-4 py-2 border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--aethel-text-primary)]">Commits recentes</span>
            <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{commits.length}</span>
          </div>
        </div>
        <div className="max-h-48 overflow-auto p-2 space-y-1">
          {commits.length === 0 ? (
            <div className="px-3 py-6 text-center text-[10px] text-[var(--aethel-text-tertiary)]">
              Sem histórico disponível (integração pendente).
            </div>
          ) : (
            commits.map(commit => (
              <div key={commit.id} className="flex items-start gap-2 px-2 py-2 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors">
                <GitCommit className="w-3.5 h-3.5 text-[var(--aethel-primary-light)] mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--aethel-text-secondary)] truncate">{commit.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{commit.hash}</span>
                    <span className="text-[10px] text-[var(--aethel-text-quaternary)]">{commit.author}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Commit Dialog */}
      {showCommitDialog && (
        <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Criar commit</span>
              <button
                type="button"
                onClick={() => setShowCommitDialog(false)}
                className="p-1 rounded-lg text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Mensagem do commit..."
              rows={3}
              className="w-full rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[var(--aethel-primary)] resize-none mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCommitDialog(false)}
                className="px-4 py-2 text-xs text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={!commitMessage.trim()}
                className="rounded-lg bg-[var(--aethel-primary)] px-4 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition-colors hover:brightness-110 disabled:opacity-50"
              >
                Comitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[var(--aethel-border-primary)] px-4 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowCommitDialog(true)}
          disabled={!canCommit}
          className="flex items-center gap-2 rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-primary)] transition-colors hover:brightness-110 disabled:opacity-50"
        >
          <GitCommit className="w-3.5 h-3.5" />
          Criar commit
        </button>
        <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{status ? `Branch ${status.branch}` : 'Sem repositório ativo'}</span>
      </div>
    </div>
  )
}
