'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Plus,
  Minus,
  RefreshCw,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Upload,
  Download,
  History,
  FileCode,
  FilePlus,
  FileX,
  FileDiff,
  RotateCcw,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { getGitClient, GitStatus, GitFileStatus, GitCommit as GitCommitType, GitBranch as GitBranchType } from '@/lib/git/git-client'
import { getConsentManager, createConsentRequest } from '@/lib/consent/consent-manager'

// ============= Types =============

interface GitFile {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'conflicted'
  staged: boolean
  additions?: number
  deletions?: number
  oldPath?: string
}

interface GitCommitInfo {
  hash: string
  message: string
  author: string
  date: Date
  branch?: string
}

interface GitBranchInfo {
  name: string
  current: boolean
  remote?: boolean
  ahead?: number
  behind?: number
}

interface GitPanelProps {
  workspacePath?: string
  onOpenDiff?: (path: string) => void
  className?: string
}

// ============= Status Icon Helper =============

function getStatusIcon(status: GitFile['status']) {
  switch (status) {
    case 'modified':
      return { icon: FileDiff, color: 'text-[var(--aethel-warning-light)]', label: 'M' }
    case 'added':
      return { icon: FilePlus, color: 'text-[var(--aethel-success-light)]', label: 'A' }
    case 'deleted':
      return { icon: FileX, color: 'text-[var(--aethel-error)]', label: 'D' }
    case 'renamed':
      return { icon: FileCode, color: 'text-[var(--aethel-info-light)]', label: 'R' }
    case 'untracked':
      return { icon: FilePlus, color: 'text-[var(--aethel-text-tertiary)]', label: 'U' }
    case 'conflicted':
      return { icon: AlertCircle, color: 'text-[var(--aethel-error)]', label: 'C' }
    default:
      return { icon: FileCode, color: 'text-[var(--aethel-text-tertiary)]', label: '?' }
  }
}

// ============= Convert Git Status to GitFile format =============

function convertToGitFiles(status: GitStatus): GitFile[] {
  const files: GitFile[] = []

  status.staged.forEach(f => {
    files.push({
      path: f.path,
      status: f.status as GitFile['status'],
      staged: true,
      oldPath: f.oldPath,
    })
  })

  status.unstaged.forEach(f => {
    files.push({
      path: f.path,
      status: f.status as GitFile['status'],
      staged: false,
      oldPath: f.oldPath,
    })
  })

  status.untracked.forEach(f => {
    files.push({
      path: f.path,
      status: 'untracked',
      staged: false,
    })
  })

  status.conflicted.forEach(f => {
    files.push({
      path: f.path,
      status: 'conflicted',
      staged: false,
    })
  })

  return files
}

// ============= File Item Component =============

interface FileItemProps {
  file: GitFile
  onStage: () => void
  onUnstage: () => void
  onDiscard: () => void
  onOpenDiff: () => void
}

function FileItem({ file, onStage, onUnstage, onDiscard, onOpenDiff }: FileItemProps) {
  const status = getStatusIcon(file.status)
  const fileName = file.path.split('/').pop()
  const dirPath = file.path.split('/').slice(0, -1).join('/')

  return (
    <div className="group flex items-center gap-1 px-2 py-1 hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] rounded text-sm">
      {/* Status indicator */}
      <span className={`w-4 text-center font-mono text-xs ${status.color}`}>
        {status.label}
      </span>

      {/* File info */}
      <button type="button" aria-label={`Abrir diff de ${fileName}`}
        onClick={onOpenDiff}
        className="flex-1 flex items-center gap-1 text-left truncate"
      >
        <span className="text-[var(--aethel-text-secondary)] truncate">{fileName}</span>
        {dirPath && (
          <span className="text-[var(--aethel-text-tertiary)] text-xs truncate">{dirPath}</span>
        )}
      </button>

      {/* Stats */}
      {(file.additions || file.deletions) && (
        <div className="flex items-center gap-1 text-xs">
          {file.additions && <span className="text-[var(--aethel-success-light)]">+{file.additions}</span>}
          {file.deletions && <span className="text-[var(--aethel-error)]">-{file.deletions}</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" aria-label={`Ver diff de ${fileName}`}
          onClick={onOpenDiff}
          className="p-1 rounded hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]"
          title="Ver diff"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        {!file.staged && file.status !== 'untracked' && (
          <button type="button" aria-label={`Descartar altera??es de ${fileName}`}
            onClick={onDiscard}
            className="p-1 rounded hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]"
            title="Descartar alterações"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        {file.staged ? (
          <button type="button" aria-label={`Remover ${fileName} do stage`}
            onClick={onUnstage}
            className="p-1 rounded hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]"
            title="Remover do stage"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button type="button" aria-label={`Adicionar ${fileName} ao stage`}
            onClick={onStage}
            className="p-1 rounded hover:bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-tertiary)]"
            title="Adicionar ao stage"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

// ============= Main Component =============

export default function GitPanelPro({
  workspacePath = '/workspace',
  onOpenDiff,
  className = '',
}: GitPanelProps) {
  // Git client and consent manager
  const gitClient = useMemo(() => getGitClient(workspacePath), [workspacePath])
  const consentManager = useMemo(() => getConsentManager(), [])

  // State
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [files, setFiles] = useState<GitFile[]>([])
  const [commits, setCommits] = useState<GitCommitInfo[]>([])
  const [branches, setBranches] = useState<GitBranchInfo[]>([])
  const [currentBranch, setCurrentBranch] = useState('main')
  const [ahead, setAhead] = useState(0)
  const [behind, setBehind] = useState(0)

  const [commitMessage, setCommitMessage] = useState('')
  const [showBranches, setShowBranches] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    staged: true,
    changes: true,
    untracked: true,
  })
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Fetch git status
  const fetchStatus = useCallback(async () => {
    try {
      setError(null)
      const status = await gitClient.status()
      setFiles(convertToGitFiles(status))
      setCurrentBranch(status.branch)
      setAhead(status.ahead)
      setBehind(status.behind)
    } catch (err) {
      setError('Failed to load Git status')
      console.error('Error fetching Git status:', err)
    } finally {
      setLoading(false)
    }
  }, [gitClient])

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const branchList = await gitClient.branches()
      setBranches(branchList.map(b => ({
        name: b.name,
        current: b.current,
        remote: b.remote?.startsWith('origin'),
        upstream: b.upstream,
      })))
    } catch (err) {
      console.error('Error fetching branches:', err)
    }
  }, [gitClient])

  // Fetch commits
  const fetchCommits = useCallback(async () => {
    try {
      const log = await gitClient.log(20)
      setCommits(log.map(c => ({
        hash: c.hash.substring(0, 7),
        message: c.message,
        author: c.email || c.author,
        date: new Date(c.date),
      })))
    } catch (err) {
      console.error('Error fetching commits:', err)
    }
  }, [gitClient])

  // Initial load
  useEffect(() => {
    fetchStatus()
    fetchBranches()
    fetchCommits()

    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus, fetchBranches, fetchCommits])

  // Git operations
  const handleStageFile = async (path: string) => {
    try {
      await gitClient.add([path])
      await fetchStatus()
    } catch (err) {
      console.error('Error staging file:', err)
    }
  }

  const handleUnstageFile = async (path: string) => {
    try {
      await gitClient.reset([path])
      await fetchStatus()
    } catch (err) {
      console.error('Error unstaging file:', err)
    }
  }

  const handleStageAll = async () => {
    try {
      await gitClient.add(['.'])
      await fetchStatus()
    } catch (err) {
      console.error('Error staging all files:', err)
    }
  }

  const handleUnstageAll = async () => {
    try {
      await gitClient.reset(['.'])
      await fetchStatus()
    } catch (err) {
      console.error('Error unstaging all files:', err)
    }
  }

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return
    try {
      await gitClient.commit(commitMessage)
      setCommitMessage('')
      await fetchStatus()
      await fetchCommits()
    } catch (err) {
      console.error('Error committing:', err)
    }
  }, [commitMessage, gitClient, fetchStatus, fetchCommits])

  const handlePush = async () => {
    // Request consent for push operation
    const request = createConsentRequest('git.push', {
      description: `Enviar ${ahead} commits para o repositório remoto`,
      details: [
        `Branch: ${currentBranch}`,
        `Commits pendentes: ${ahead}`,
        'Isso vai enviar suas mudanças para o repositório remoto'
      ]
    })

    const response = await consentManager.requestConsent(request)

    if (response.approved) {
      try {
        await gitClient.push()
        await fetchStatus()
      } catch (err) {
        console.error('Error pushing:', err)
      }
    }
  }

  const handlePull = async () => {
    try {
      await gitClient.pull()
      await fetchStatus()
      await fetchCommits()
    } catch (err) {
      console.error('Error pulling:', err)
    }
  }

  const handleFetch = async () => {
    try {
      await gitClient.fetch()
      await fetchStatus()
    } catch (err) {
      console.error('Error fetching:', err)
    }
  }

  const handleCheckout = async (branchName: string) => {
    try {
      await gitClient.checkout(branchName)
      await fetchStatus()
      await fetchBranches()
      setShowBranches(false)
    } catch (err) {
      console.error('Error switching branch:', err)
    }
  }

  const handleDiscardChanges = async (path: string) => {
    try {
      await gitClient.discardChanges([path])
      await fetchStatus()
    } catch (err) {
      console.error('Error discarding changes:', err)
    }
  }

  // Categorize files
  const stagedFiles = files.filter(f => f.staged)
  const changedFiles = files.filter(f => !f.staged && f.status !== 'untracked' && f.status !== 'conflicted')
  const untrackedFiles = files.filter(f => f.status === 'untracked')
  const conflictedFiles = files.filter(f => f.status === 'conflicted')

  // Toggle section
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Handle keyboard shortcut for commit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && commitMessage.trim()) {
        handleCommit()
      }
    }
    const input = inputRef.current
    input?.addEventListener('keydown', handleKeyDown)
    return () => input?.removeEventListener('keydown', handleKeyDown)
  }, [commitMessage, handleCommit])

  // Loading state
  if (loading) {
    return (
      <div className={`flex h-full items-center justify-center p-6 ${className}`}>
        <div
          className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_82%,transparent)] px-6 py-5 text-center shadow-[0_18px_48px_rgba(2,6,23,0.24)]"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-7 w-7 animate-spin text-[var(--aethel-info-light)]" />
          <div>
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Loading Git panel</p>
            <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">
              Buscando branch atual, alterações locais e histórico recente.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`flex h-full items-center justify-center p-6 ${className}`}>
        <div
          className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-6 py-5 text-center"
          role="alert"
        >
          <AlertCircle className="h-8 w-8 text-[var(--aethel-error)]" />
          <div>
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Não foi possível ler o repositório</p>
            <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">{error}</p>
          </div>
          <p className="text-[11px] text-[var(--aethel-text-quaternary)]">
            Verifique se o workspace atual possui um `.git` acessivel e tente novamente.
          </p>
          <button type="button" aria-label="Tentar carregar status do Git novamente"
            onClick={fetchStatus}
            className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_86%,transparent)] px-3 py-1.5 text-sm font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Branch Selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <button type="button" aria-label="Alternar seletor de branches"
          onClick={() => setShowBranches(!showBranches)}
          className="flex items-center gap-2 text-sm transition-colors hover:text-[var(--aethel-text-primary)]"
        >
          <GitBranch className="w-4 h-4 text-[var(--aethel-info-light)]" />
          <span>{currentBranch}</span>
          {ahead > 0 && (
            <span className="text-xs text-[var(--aethel-success-light)]">+{ahead}</span>
          )}
          {behind > 0 && (
            <span className="text-xs text-[var(--aethel-warning-light)]">-{behind}</span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Buscar atualiza??es do reposit?rio"
            onClick={handleFetch}
            className="p-1 rounded hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]"
            title="Buscar atualizacoes"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Baixar mudan?as do reposit?rio"
            onClick={handlePull}
            className="p-1 rounded hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]"
            title="Baixar mudanças"
          >
            <Download className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Enviar mudan?as para o reposit?rio"
            onClick={handlePush}
            className="p-1 rounded hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]"
            title="Enviar mudanças"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button type="button" aria-label="Alternar hist?rico de commits"
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1 rounded hover:bg-[var(--aethel-surface-tertiary)] ${showHistory ? 'text-[var(--aethel-info-light)]' : 'text-[var(--aethel-text-tertiary)]'}`}
            title="Historico"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Branch List */}
      {showBranches && (
        <div className="border-b border-[var(--aethel-border-primary)] max-h-48 overflow-y-auto">
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider mb-2">
              Branches locais
            </div>
            {branches.filter(b => !b.remote).map(branch => (
              <button type="button" aria-label={`Trocar para a branch ${branch.name}`}
                key={branch.name}
                onClick={() => handleCheckout(branch.name)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                  ${branch.current ? 'border border-[color-mix(in_srgb,var(--aethel-info)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]' : 'hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-secondary)]'}
                `}
              >
                <GitBranch className="w-4 h-4" />
                <span className="flex-1 text-left">{branch.name}</span>
                {branch.current && <Check className="w-4 h-4" />}
              </button>
            ))}
            <div className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider mt-3 mb-2">
              Branches remotas
            </div>
            {branches.filter(b => b.remote).map(branch => (
              <button type="button" aria-label={`Trocar para a branch ${branch.name}`}
                key={branch.name}
                onClick={() => handleCheckout(branch.name)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]"
              >
                <GitBranch className="w-4 h-4" />
                <span className="flex-1 text-left">{branch.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Commit History */}
      {showHistory && (
        <div className="border-b border-[var(--aethel-border-primary)] max-h-64 overflow-y-auto">
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider mb-2">
              Commits recentes
            </div>
            {commits.map(commit => (
              <div
                key={commit.hash}
                className="flex items-start gap-2 px-2 py-2 rounded hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]"
              >
                <GitCommit className="w-4 h-4 text-[var(--aethel-text-tertiary)] mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--aethel-text-secondary)] truncate">{commit.message}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--aethel-text-tertiary)]">
                    <span className="font-mono">{commit.hash}</span>
                    <span>-</span>
                    <span>{commit.author.split('@')[0]}</span>
                    <span>-</span>
                    <span>{formatRelativeTime(commit.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflicted Files Warning */}
      {conflictedFiles.length > 0 && (
        <div className="border-b border-[color-mix(in_srgb,var(--aethel-error)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-3 py-2">
          <div className="flex items-center gap-2 text-[var(--aethel-error)] text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{conflictedFiles.length} arquivo(s) com conflito de merge</span>
          </div>
        </div>
      )}

      {/* Commit Message Input */}
      <div className="px-3 py-2 border-b border-[var(--aethel-border-primary)]">
        <textarea
          ref={inputRef}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Descreva este commit..."
          className="w-full px-3 py-2 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-secondary)] rounded text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] focus:outline-none focus:border-[var(--aethel-info)] resize-none"
          rows={3}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-[var(--aethel-text-tertiary)]">
            {stagedFiles.length} arquivo(s) em stage
          </span>
          <button type="button" aria-label="Criar commit com arquivos em stage"
            onClick={handleCommit}
            disabled={!commitMessage.trim() || stagedFiles.length === 0}
            className={`
              rounded px-3 py-1.5 text-sm font-medium transition-colors
              ${commitMessage.trim() && stagedFiles.length > 0
                ? 'bg-[var(--aethel-info)] text-[var(--aethel-text-primary)] hover:brightness-110'
                : 'cursor-not-allowed bg-[var(--aethel-surface-tertiary)] text-[var(--aethel-text-tertiary)]'
              }
            `}
          >
            Commit (Ctrl+Enter)
          </button>
        </div>
      </div>

      {/* File Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged Changes */}
        {stagedFiles.length > 0 && (
          <div>
            <button type="button" aria-label="Alternar se??o de arquivos em stage"
              onClick={() => toggleSection('staged')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]"
            >
              {expandedSections.staged ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">Em stage ({stagedFiles.length})</span>
              <button type="button" aria-label="Adicionar todas as altera??es ao stage"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUnstageAll()
                }}
                className="p-1 rounded hover:bg-[var(--aethel-surface-quaternary)]"
                title="Remover tudo do stage"
              >
                <Minus className="w-3 h-3" />
              </button>
            </button>
            {expandedSections.staged && (
              <div className="px-1">
                {stagedFiles.map(file => (
                  <FileItem
                    key={file.path}
                    file={file}
                    onStage={() => handleStageFile(file.path)}
                    onUnstage={() => handleUnstageFile(file.path)}
                    onDiscard={() => handleDiscardChanges(file.path)}
                    onOpenDiff={() => onOpenDiff?.(file.path)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Changes */}
        {changedFiles.length > 0 && (
          <div>
            <button type="button" aria-label="Alternar se??o de altera??es"
              onClick={() => toggleSection('changes')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]"
            >
              {expandedSections.changes ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">Alteracoes ({changedFiles.length})</span>
              <button type="button" aria-label="Adicionar todas as altera??es ao stage"
                onClick={(e) => {
                  e.stopPropagation()
                  handleStageAll()
                }}
                className="p-1 rounded hover:bg-[var(--aethel-surface-quaternary)]"
                title="Colocar tudo em stage"
              >
                <Plus className="w-3 h-3" />
              </button>
            </button>
            {expandedSections.changes && (
              <div className="px-1">
                {changedFiles.map(file => (
                  <FileItem
                    key={file.path}
                    file={file}
                    onStage={() => handleStageFile(file.path)}
                    onUnstage={() => handleUnstageFile(file.path)}
                    onDiscard={() => handleDiscardChanges(file.path)}
                    onOpenDiff={() => onOpenDiff?.(file.path)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Untracked */}
        {untrackedFiles.length > 0 && (
          <div>
            <button type="button" aria-label="Alternar se??o de arquivos n?o rastreados"
              onClick={() => toggleSection('untracked')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--aethel-text-tertiary)] uppercase tracking-wider hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)]"
            >
              {expandedSections.untracked ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">Nao rastreados ({untrackedFiles.length})</span>
            </button>
            {expandedSections.untracked && (
              <div className="px-1">
                {untrackedFiles.map(file => (
                  <FileItem
                    key={file.path}
                    file={file}
                    onStage={() => handleStageFile(file.path)}
                    onUnstage={() => handleUnstageFile(file.path)}
                    onDiscard={() => handleDiscardChanges(file.path)}
                    onOpenDiff={() => onOpenDiff?.(file.path)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {files.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center text-[var(--aethel-text-tertiary)]" role="status" aria-live="polite">
            <div className="mb-3 rounded-full border border-[color-mix(in_srgb,var(--aethel-success)_24%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] p-3">
              <Check className="h-8 w-8 text-[var(--aethel-success-light)]" />
            </div>
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Workspace limpo</p>
            <p className="mt-1 max-w-xs text-xs text-[var(--aethel-text-tertiary)]">
              Nenhuma alteracao pendente para stage ou commit neste momento.
            </p>
            <button type="button" aria-label="Atualizar status do Git"
              onClick={fetchStatus}
              className="mt-4 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_86%,transparent)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              Atualizar status
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============= Helpers =============

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes} min atras`
  if (hours < 24) return `${hours} h atras`
  if (days < 7) return `${days} d atras`
  return date.toLocaleDateString()
}
