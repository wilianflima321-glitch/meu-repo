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
      return { icon: FileDiff, color: 'text-amber-400', label: 'M' }
    case 'added':
      return { icon: FilePlus, color: 'text-emerald-400', label: 'A' }
    case 'deleted':
      return { icon: FileX, color: 'text-red-400', label: 'D' }
    case 'renamed':
      return { icon: FileCode, color: 'text-blue-400', label: 'R' }
    case 'untracked':
      return { icon: FilePlus, color: 'text-slate-400', label: 'U' }
    case 'conflicted':
      return { icon: AlertCircle, color: 'text-red-500', label: 'C' }
    default:
      return { icon: FileCode, color: 'text-slate-400', label: '?' }
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
    <div className="group flex items-center gap-1 px-2 py-1 hover:bg-slate-800/50 rounded text-sm">
      {/* Status indicator */}
      <span className={`w-4 text-center font-mono text-xs ${status.color}`}>
        {status.label}
      </span>

      {/* File info */}
      <button
        onClick={onOpenDiff}
        className="flex-1 flex items-center gap-1 text-left truncate"
      >
        <span className="text-slate-300 truncate">{fileName}</span>
        {dirPath && (
          <span className="text-slate-500 text-xs truncate">{dirPath}</span>
        )}
      </button>

      {/* Stats */}
      {(file.additions || file.deletions) && (
        <div className="flex items-center gap-1 text-xs">
          {file.additions && <span className="text-emerald-400">+{file.additions}</span>}
          {file.deletions && <span className="text-red-400">-{file.deletions}</span>}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onOpenDiff}
          className="p-1 rounded hover:bg-slate-700 text-slate-400"
          title="View Diff"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        {!file.staged && file.status !== 'untracked' && (
          <button
            onClick={onDiscard}
            className="p-1 rounded hover:bg-slate-700 text-slate-400"
            title="Discard Changes"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        {file.staged ? (
          <button
            onClick={onUnstage}
            className="p-1 rounded hover:bg-slate-700 text-slate-400"
            title="Unstage"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onStage}
            className="p-1 rounded hover:bg-slate-700 text-slate-400"
            title="Stage"
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
      setError('Failed to fetch git status')
      console.error('Git status error:', err)
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
      console.error('Fetch branches error:', err)
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
      console.error('Fetch commits error:', err)
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
      console.error('Stage file error:', err)
    }
  }

  const handleUnstageFile = async (path: string) => {
    try {
      await gitClient.reset([path])
      await fetchStatus()
    } catch (err) {
      console.error('Unstage file error:', err)
    }
  }

  const handleStageAll = async () => {
    try {
      await gitClient.add(['.'])
      await fetchStatus()
    } catch (err) {
      console.error('Stage all error:', err)
    }
  }

  const handleUnstageAll = async () => {
    try {
      await gitClient.reset(['.'])
      await fetchStatus()
    } catch (err) {
      console.error('Unstage all error:', err)
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
      console.error('Commit error:', err)
    }
  }, [commitMessage, gitClient, fetchStatus, fetchCommits])

  const handlePush = async () => {
    // Request consent for push operation
    const request = createConsentRequest('git.push', {
      description: `Push ${ahead} commits to remote repository`,
      details: [
        `Branch: ${currentBranch}`,
        `Commits ahead: ${ahead}`,
        'This will upload your changes to the remote repository'
      ]
    })

    const response = await consentManager.requestConsent(request)
    
    if (response.approved) {
      try {
        await gitClient.push()
        await fetchStatus()
      } catch (err) {
        console.error('Push error:', err)
      }
    }
  }

  const handlePull = async () => {
    try {
      await gitClient.pull()
      await fetchStatus()
      await fetchCommits()
    } catch (err) {
      console.error('Pull error:', err)
    }
  }

  const handleFetch = async () => {
    try {
      await gitClient.fetch()
      await fetchStatus()
    } catch (err) {
      console.error('Fetch error:', err)
    }
  }

  const handleCheckout = async (branchName: string) => {
    try {
      await gitClient.checkout(branchName)
      await fetchStatus()
      await fetchBranches()
      setShowBranches(false)
    } catch (err) {
      console.error('Checkout error:', err)
    }
  }

  const handleDiscardChanges = async (path: string) => {
    try {
      await gitClient.discardChanges([path])
      await fetchStatus()
    } catch (err) {
      console.error('Discard changes error:', err)
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
      <div className={`h-full flex items-center justify-center ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`h-full flex flex-col items-center justify-center gap-2 ${className}`}>
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={fetchStatus}
          className="text-sm text-sky-400 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Branch Selector */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800">
        <button
          onClick={() => setShowBranches(!showBranches)}
          className="flex items-center gap-2 text-sm hover:text-white transition-colors"
        >
          <GitBranch className="w-4 h-4 text-sky-400" />
          <span>{currentBranch}</span>
          {ahead > 0 && (
            <span className="text-xs text-emerald-400">↑{ahead}</span>
          )}
          {behind > 0 && (
            <span className="text-xs text-amber-400">↓{behind}</span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleFetch}
            className="p-1 rounded hover:bg-slate-800 text-slate-400"
            title="Fetch"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePull}
            className="p-1 rounded hover:bg-slate-800 text-slate-400"
            title="Pull"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={handlePush}
            className="p-1 rounded hover:bg-slate-800 text-slate-400"
            title="Push"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1 rounded hover:bg-slate-800 ${showHistory ? 'text-sky-400' : 'text-slate-400'}`}
            title="History"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Branch List */}
      {showBranches && (
        <div className="border-b border-slate-800 max-h-48 overflow-y-auto">
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Branches
            </div>
            {branches.filter(b => !b.remote).map(branch => (
              <button
                key={branch.name}
                onClick={() => handleCheckout(branch.name)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                  ${branch.current ? 'bg-sky-500/20 text-sky-300' : 'hover:bg-slate-800 text-slate-300'}
                `}
              >
                <GitBranch className="w-4 h-4" />
                <span className="flex-1 text-left">{branch.name}</span>
                {branch.current && <Check className="w-4 h-4" />}
              </button>
            ))}
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-3 mb-2">
              Remote
            </div>
            {branches.filter(b => b.remote).map(branch => (
              <button
                key={branch.name}
                onClick={() => handleCheckout(branch.name)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-slate-800 text-slate-400"
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
        <div className="border-b border-slate-800 max-h-64 overflow-y-auto">
          <div className="px-3 py-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Recent Commits
            </div>
            {commits.map(commit => (
              <div
                key={commit.hash}
                className="flex items-start gap-2 px-2 py-2 rounded hover:bg-slate-800/50"
              >
                <GitCommit className="w-4 h-4 text-slate-500 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-300 truncate">{commit.message}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono">{commit.hash}</span>
                    <span>•</span>
                    <span>{commit.author.split('@')[0]}</span>
                    <span>•</span>
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
        <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/30">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{conflictedFiles.length} file(s) with merge conflicts</span>
          </div>
        </div>
      )}

      {/* Commit Message Input */}
      <div className="px-3 py-2 border-b border-slate-800">
        <textarea
          ref={inputRef}
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500">
            {stagedFiles.length} staged file{stagedFiles.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={handleCommit}
            disabled={!commitMessage.trim() || stagedFiles.length === 0}
            className={`
              px-3 py-1.5 rounded text-sm font-medium transition-colors
              ${commitMessage.trim() && stagedFiles.length > 0
                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            Commit (⌘↵)
          </button>
        </div>
      </div>

      {/* File Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged Changes */}
        {stagedFiles.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('staged')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-800/50"
            >
              {expandedSections.staged ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">Staged Changes ({stagedFiles.length})</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleUnstageAll()
                }}
                className="p-1 rounded hover:bg-slate-700"
                title="Unstage All"
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
            <button
              onClick={() => toggleSection('changes')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-800/50"
            >
              {expandedSections.changes ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">Changes ({changedFiles.length})</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleStageAll()
                }}
                className="p-1 rounded hover:bg-slate-700"
                title="Stage All"
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
            <button
              onClick={() => toggleSection('untracked')}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:bg-slate-800/50"
            >
              {expandedSections.untracked ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="flex-1 text-left">Untracked ({untrackedFiles.length})</span>
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
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Check className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">No changes to commit</p>
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

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}
