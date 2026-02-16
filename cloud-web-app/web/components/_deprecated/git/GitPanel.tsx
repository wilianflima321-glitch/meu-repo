'use client'

/**
 * Git Panel - Professional Source Control Interface
 * Like VS Code Source Control Panel
 * 
 * Features:
 * - File status (staged, modified, untracked)
 * - Staging/unstaging
 * - Commit with message
 * - Branch management
 * - Diff preview
 * - History/log
 * - Push/Pull/Fetch
 * - Stash management
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Plus,
  Minus,
  Check,
  X,
  RotateCcw,
  RefreshCw,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
  File,
  FileText,
  FilePlus,
  FileMinus,
  FileQuestion,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  FolderOpen,
  Clock,
  User,
  MessageSquare,
  MoreHorizontal,
  Search,
  Filter,
  History,
  Tag,
  Archive,
  Package,
  AlertTriangle,
  CheckCircle,
  Circle,
} from 'lucide-react'

// ============= Types =============

export type FileStatus = 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' | 'ignored' | 'conflicted'

export interface GitFile {
  path: string
  status: FileStatus
  staged: boolean
  oldPath?: string // For renamed files
  additions?: number
  deletions?: number
}

export interface GitBranchInfo {
  name: string
  isRemote: boolean
  isCurrent: boolean
  ahead?: number
  behind?: number
  lastCommit?: string
  lastCommitDate?: Date
}

export interface GitCommitInfo {
  hash: string
  shortHash: string
  message: string
  author: string
  authorEmail: string
  date: Date
  parents: string[]
}

export interface GitStash {
  id: number
  message: string
  branch: string
  date: Date
}

interface GitPanelProps {
  files?: GitFile[]
  branches?: GitBranchInfo[]
  commits?: GitCommitInfo[]
  stashes?: GitStash[]
  currentBranch?: string
  remoteUrl?: string
  onStage?: (paths: string[]) => void
  onUnstage?: (paths: string[]) => void
  onCommit?: (message: string) => void
  onPush?: () => void
  onPull?: () => void
  onFetch?: () => void
  onCheckout?: (branch: string) => void
  onCreateBranch?: (name: string) => void
  onDeleteBranch?: (name: string) => void
  onMerge?: (branch: string) => void
  onStash?: (message?: string) => void
  onStashPop?: (id: number) => void
  onDiscard?: (paths: string[]) => void
  onOpenFile?: (path: string) => void
  onShowDiff?: (path: string) => void
}

// ============= Status Icons =============

const STATUS_ICONS: Record<FileStatus, React.ReactNode> = {
  modified: <Edit3 className="w-4 h-4 text-amber-400" />,
  added: <FilePlus className="w-4 h-4 text-green-400" />,
  deleted: <FileMinus className="w-4 h-4 text-red-400" />,
  renamed: <FileText className="w-4 h-4 text-blue-400" />,
  untracked: <FileQuestion className="w-4 h-4 text-slate-400" />,
  ignored: <EyeOff className="w-4 h-4 text-slate-600" />,
  conflicted: <AlertTriangle className="w-4 h-4 text-red-500" />,
}

const STATUS_LABELS: Record<FileStatus, string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  untracked: 'U',
  ignored: 'I',
  conflicted: 'C',
}

// ============= Mock Data =============

const MOCK_FILES: GitFile[] = [
  { path: 'src/components/App.tsx', status: 'modified', staged: true, additions: 15, deletions: 3 },
  { path: 'src/services/api.ts', status: 'modified', staged: true, additions: 42, deletions: 12 },
  { path: 'src/utils/helpers.ts', status: 'modified', staged: false, additions: 8, deletions: 2 },
  { path: 'src/components/NewFeature.tsx', status: 'added', staged: true, additions: 150 },
  { path: 'src/deprecated/old.ts', status: 'deleted', staged: false, deletions: 45 },
  { path: 'README.md', status: 'modified', staged: false, additions: 5, deletions: 1 },
  { path: 'package.json', status: 'modified', staged: false, additions: 2, deletions: 1 },
  { path: '.env.local', status: 'untracked', staged: false },
  { path: 'notes.txt', status: 'untracked', staged: false },
]

const MOCK_BRANCHES: GitBranchInfo[] = [
  { name: 'main', isRemote: false, isCurrent: false, ahead: 0, behind: 2 },
  { name: 'develop', isRemote: false, isCurrent: true, ahead: 3, behind: 0 },
  { name: 'feature/new-ui', isRemote: false, isCurrent: false, ahead: 5, behind: 1 },
  { name: 'feature/ai-integration', isRemote: false, isCurrent: false },
  { name: 'bugfix/login-issue', isRemote: false, isCurrent: false },
  { name: 'origin/main', isRemote: true, isCurrent: false },
  { name: 'origin/develop', isRemote: true, isCurrent: false },
]

const MOCK_COMMITS: GitCommitInfo[] = [
  {
    hash: 'abc123def456',
    shortHash: 'abc123d',
    message: 'feat: Add AI copilot integration',
    author: 'John Doe',
    authorEmail: 'john@example.com',
    date: new Date(Date.now() - 1000 * 60 * 30),
    parents: ['def456'],
  },
  {
    hash: 'def456abc789',
    shortHash: 'def456a',
    message: 'fix: Resolve login authentication bug',
    author: 'Jane Smith',
    authorEmail: 'jane@example.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2),
    parents: ['789abc'],
  },
  {
    hash: '789abcdef012',
    shortHash: '789abcd',
    message: 'chore: Update dependencies',
    author: 'John Doe',
    authorEmail: 'john@example.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24),
    parents: ['012def'],
  },
  {
    hash: '012defabc345',
    shortHash: '012defa',
    message: 'docs: Update README with new features',
    author: 'Jane Smith',
    authorEmail: 'jane@example.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    parents: ['345abc'],
  },
]

const MOCK_STASHES: GitStash[] = [
  { id: 0, message: 'WIP: New feature', branch: 'feature/new-ui', date: new Date(Date.now() - 1000 * 60 * 60) },
  { id: 1, message: 'Save before checkout', branch: 'develop', date: new Date(Date.now() - 1000 * 60 * 60 * 24) },
]

// ============= Main Component =============

export default function GitPanel({
  files = MOCK_FILES,
  branches = MOCK_BRANCHES,
  commits = MOCK_COMMITS,
  stashes = MOCK_STASHES,
  currentBranch = 'develop',
  remoteUrl = 'git@github.com:user/repo.git',
  onStage,
  onUnstage,
  onCommit,
  onPush,
  onPull,
  onFetch,
  onCheckout,
  onCreateBranch,
  onDeleteBranch,
  onMerge,
  onStash,
  onStashPop,
  onDiscard,
  onOpenFile,
  onShowDiff,
}: GitPanelProps) {
  const [activeTab, setActiveTab] = useState<'changes' | 'branches' | 'history' | 'stashes'>('changes')
  const [commitMessage, setCommitMessage] = useState('')
  const [isAmend, setIsAmend] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['staged', 'changes']))
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showBranchDialog, setShowBranchDialog] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Separate staged and unstaged files
  const { stagedFiles, unstagedFiles, untrackedFiles } = useMemo(() => {
    return {
      stagedFiles: files.filter((f) => f.staged),
      unstagedFiles: files.filter((f) => !f.staged && f.status !== 'untracked'),
      untrackedFiles: files.filter((f) => f.status === 'untracked'),
    }
  }, [files])
  
  // Get current branch info
  const currentBranchInfo = useMemo(() => {
    return branches.find((b) => b.isCurrent)
  }, [branches])
  
  // Toggle section
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])
  
  // Stage all
  const stageAll = useCallback(() => {
    const paths = [...unstagedFiles, ...untrackedFiles].map((f) => f.path)
    onStage?.(paths)
  }, [unstagedFiles, untrackedFiles, onStage])
  
  // Unstage all
  const unstageAll = useCallback(() => {
    const paths = stagedFiles.map((f) => f.path)
    onUnstage?.(paths)
  }, [stagedFiles, onUnstage])
  
  // Commit
  const handleCommit = useCallback(() => {
    if (!commitMessage.trim()) return
    onCommit?.(commitMessage)
    setCommitMessage('')
    setIsAmend(false)
  }, [commitMessage, onCommit])
  
  // Sync (push + pull)
  const handleSync = useCallback(async () => {
    setIsSyncing(true)
    await onPull?.()
    await onPush?.()
    setIsSyncing(false)
  }, [onPull, onPush])
  
  // Create branch
  const handleCreateBranch = useCallback(() => {
    if (!newBranchName.trim()) return
    onCreateBranch?.(newBranchName)
    setNewBranchName('')
    setShowBranchDialog(false)
  }, [newBranchName, onCreateBranch])
  
  // Format date
  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    
    return date.toLocaleDateString()
  }
  
  return (
    <div className="h-full flex flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-sky-400" />
          <span className="text-sm font-medium">Source Control</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={onFetch}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
            title="Fetch"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onPull}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
            title="Pull"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onPush}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
            title="Push"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={handleSync}
            className={`p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded ${
              isSyncing ? 'animate-spin' : ''
            }`}
            title="Sync"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
            title="More actions"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Branch Selector */}
      <div className="px-3 py-2 border-b border-slate-700">
        <button
          onClick={() => setShowBranchDialog(true)}
          className="w-full flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-left"
        >
          <GitBranch className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium flex-1">{currentBranch}</span>
          {currentBranchInfo?.ahead !== undefined && currentBranchInfo.ahead > 0 && (
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
              ↑{currentBranchInfo.ahead}
            </span>
          )}
          {currentBranchInfo?.behind !== undefined && currentBranchInfo.behind > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
              ↓{currentBranchInfo.behind}
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {(['changes', 'branches', 'history', 'stashes'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-sky-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
            {tab === 'changes' && files.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-slate-700 rounded text-xs">
                {files.length}
              </span>
            )}
            {tab === 'stashes' && stashes.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-slate-700 rounded text-xs">
                {stashes.length}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'changes' && (
          <ChangesTab
            stagedFiles={stagedFiles}
            unstagedFiles={unstagedFiles}
            untrackedFiles={untrackedFiles}
            expandedSections={expandedSections}
            commitMessage={commitMessage}
            isAmend={isAmend}
            onToggleSection={toggleSection}
            onStage={onStage}
            onUnstage={onUnstage}
            onStageAll={stageAll}
            onUnstageAll={unstageAll}
            onDiscard={onDiscard}
            onOpenFile={onOpenFile}
            onShowDiff={onShowDiff}
            onCommitMessageChange={setCommitMessage}
            onAmendChange={setIsAmend}
            onCommit={handleCommit}
          />
        )}
        
        {activeTab === 'branches' && (
          <BranchesTab
            branches={branches}
            currentBranch={currentBranch}
            onCheckout={onCheckout}
            onCreateBranch={() => setShowBranchDialog(true)}
            onDeleteBranch={onDeleteBranch}
            onMerge={onMerge}
          />
        )}
        
        {activeTab === 'history' && (
          <HistoryTab
            commits={commits}
            formatDate={formatDate}
          />
        )}
        
        {activeTab === 'stashes' && (
          <StashesTab
            stashes={stashes}
            onStash={onStash}
            onStashPop={onStashPop}
            formatDate={formatDate}
          />
        )}
      </div>
      
      {/* Branch Dialog */}
      {showBranchDialog && (
        <BranchDialog
          branches={branches}
          currentBranch={currentBranch}
          newBranchName={newBranchName}
          onNewBranchNameChange={setNewBranchName}
          onCreateBranch={handleCreateBranch}
          onCheckout={onCheckout}
          onClose={() => setShowBranchDialog(false)}
        />
      )}
    </div>
  )
}

// ============= Changes Tab =============

interface ChangesTabProps {
  stagedFiles: GitFile[]
  unstagedFiles: GitFile[]
  untrackedFiles: GitFile[]
  expandedSections: Set<string>
  commitMessage: string
  isAmend: boolean
  onToggleSection: (section: string) => void
  onStage?: (paths: string[]) => void
  onUnstage?: (paths: string[]) => void
  onStageAll: () => void
  onUnstageAll: () => void
  onDiscard?: (paths: string[]) => void
  onOpenFile?: (path: string) => void
  onShowDiff?: (path: string) => void
  onCommitMessageChange: (msg: string) => void
  onAmendChange: (amend: boolean) => void
  onCommit: () => void
}

function ChangesTab({
  stagedFiles,
  unstagedFiles,
  untrackedFiles,
  expandedSections,
  commitMessage,
  isAmend,
  onToggleSection,
  onStage,
  onUnstage,
  onStageAll,
  onUnstageAll,
  onDiscard,
  onOpenFile,
  onShowDiff,
  onCommitMessageChange,
  onAmendChange,
  onCommit,
}: ChangesTabProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Commit Input */}
      <div className="p-3 border-b border-slate-700">
        <textarea
          value={commitMessage}
          onChange={(e) => onCommitMessageChange(e.target.value)}
          placeholder="Commit message..."
          className="w-full h-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-sky-500"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={onCommit}
            disabled={!commitMessage.trim() || stagedFiles.length === 0}
            className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:text-slate-500 rounded text-sm font-medium transition-colors"
          >
            <Check className="w-4 h-4 inline mr-2" />
            Commit{stagedFiles.length > 0 && ` (${stagedFiles.length})`}
          </button>
          <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={isAmend}
              onChange={(e) => onAmendChange(e.target.checked)}
              className="rounded border-slate-600"
            />
            Amend
          </label>
        </div>
      </div>
      
      {/* File List */}
      <div className="flex-1 overflow-y-auto">
        {/* Staged Changes */}
        <FileSection
          title="Staged Changes"
          files={stagedFiles}
          sectionKey="staged"
          isExpanded={expandedSections.has('staged')}
          onToggle={() => onToggleSection('staged')}
          onStageFile={(path) => onUnstage?.([path])}
          onDiscardFile={(path) => onUnstage?.([path])}
          onOpenFile={onOpenFile}
          onShowDiff={onShowDiff}
          stageAction="unstage"
          actionIcon={<Minus className="w-3 h-3" />}
          headerAction={
            stagedFiles.length > 0 && (
              <button
                onClick={onUnstageAll}
                className="p-1 text-slate-400 hover:text-white"
                title="Unstage all"
              >
                <Minus className="w-4 h-4" />
              </button>
            )
          }
        />
        
        {/* Changes */}
        <FileSection
          title="Changes"
          files={unstagedFiles}
          sectionKey="changes"
          isExpanded={expandedSections.has('changes')}
          onToggle={() => onToggleSection('changes')}
          onStageFile={(path) => onStage?.([path])}
          onDiscardFile={(path) => onDiscard?.([path])}
          onOpenFile={onOpenFile}
          onShowDiff={onShowDiff}
          stageAction="stage"
          actionIcon={<Plus className="w-3 h-3" />}
          headerAction={
            unstagedFiles.length > 0 && (
              <button
                onClick={onStageAll}
                className="p-1 text-slate-400 hover:text-white"
                title="Stage all"
              >
                <Plus className="w-4 h-4" />
              </button>
            )
          }
        />
        
        {/* Untracked */}
        {untrackedFiles.length > 0 && (
          <FileSection
            title="Untracked"
            files={untrackedFiles}
            sectionKey="untracked"
            isExpanded={expandedSections.has('untracked')}
            onToggle={() => onToggleSection('untracked')}
            onStageFile={(path) => onStage?.([path])}
            onDiscardFile={(path) => onDiscard?.([path])}
            onOpenFile={onOpenFile}
            stageAction="stage"
            actionIcon={<Plus className="w-3 h-3" />}
          />
        )}
      </div>
    </div>
  )
}

// ============= File Section =============

interface FileSectionProps {
  title: string
  files: GitFile[]
  sectionKey: string
  isExpanded: boolean
  onToggle: () => void
  onStageFile: (path: string) => void
  onDiscardFile: (path: string) => void
  onOpenFile?: (path: string) => void
  onShowDiff?: (path: string) => void
  stageAction: 'stage' | 'unstage'
  actionIcon: React.ReactNode
  headerAction?: React.ReactNode
}

function FileSection({
  title,
  files,
  sectionKey,
  isExpanded,
  onToggle,
  onStageFile,
  onDiscardFile,
  onOpenFile,
  onShowDiff,
  stageAction,
  actionIcon,
  headerAction,
}: FileSectionProps) {
  if (files.length === 0) return null
  
  return (
    <div>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/50 text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-500" />
        )}
        <span className="text-xs font-semibold text-slate-400 uppercase">{title}</span>
        <span className="text-xs text-slate-500">({files.length})</span>
        <div className="flex-1" />
        {headerAction}
      </button>
      
      {/* Files */}
      {isExpanded && (
        <div>
          {files.map((file) => (
            <div
              key={file.path}
              className="group flex items-center gap-2 px-3 py-1 hover:bg-slate-800/50"
            >
              {STATUS_ICONS[file.status]}
              
              <button
                onClick={() => onOpenFile?.(file.path)}
                className="flex-1 text-left text-sm text-slate-300 hover:text-white truncate"
              >
                {file.path.split('/').pop()}
                <span className="ml-2 text-slate-600">{file.path}</span>
              </button>
              
              {/* Stats */}
              {(file.additions || file.deletions) && (
                <span className="text-xs">
                  {file.additions && <span className="text-green-400">+{file.additions}</span>}
                  {file.additions && file.deletions && ' '}
                  {file.deletions && <span className="text-red-400">-{file.deletions}</span>}
                </span>
              )}
              
              {/* Actions */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                {onShowDiff && file.status !== 'untracked' && (
                  <button
                    onClick={() => onShowDiff(file.path)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                    title="Show diff"
                  >
                    <Eye className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => onDiscardFile(file.path)}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                  title="Discard changes"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onStageFile(file.path)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                  title={stageAction === 'stage' ? 'Stage' : 'Unstage'}
                >
                  {actionIcon}
                </button>
              </div>
              
              {/* Status Badge */}
              <span
                className={`w-4 h-4 flex items-center justify-center text-[10px] font-bold rounded ${
                  file.status === 'modified'
                    ? 'bg-amber-500/20 text-amber-400'
                    : file.status === 'added'
                    ? 'bg-green-500/20 text-green-400'
                    : file.status === 'deleted'
                    ? 'bg-red-500/20 text-red-400'
                    : file.status === 'conflicted'
                    ? 'bg-red-600/20 text-red-500'
                    : 'bg-slate-700 text-slate-400'
                }`}
              >
                {STATUS_LABELS[file.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============= Branches Tab =============

interface BranchesTabProps {
  branches: GitBranchInfo[]
  currentBranch: string
  onCheckout?: (branch: string) => void
  onCreateBranch: () => void
  onDeleteBranch?: (branch: string) => void
  onMerge?: (branch: string) => void
}

function BranchesTab({
  branches,
  currentBranch,
  onCheckout,
  onCreateBranch,
  onDeleteBranch,
  onMerge,
}: BranchesTabProps) {
  const localBranches = branches.filter((b) => !b.isRemote)
  const remoteBranches = branches.filter((b) => b.isRemote)
  
  return (
    <div>
      {/* Actions */}
      <div className="px-3 py-2 border-b border-slate-700">
        <button
          onClick={onCreateBranch}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm"
        >
          <Plus className="w-4 h-4" />
          New Branch
        </button>
      </div>
      
      {/* Local Branches */}
      <div className="px-3 py-2">
        <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Local</div>
        {localBranches.map((branch) => (
          <div
            key={branch.name}
            className={`group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800 ${
              branch.isCurrent ? 'bg-slate-800' : ''
            }`}
          >
            <GitBranch className={`w-4 h-4 ${branch.isCurrent ? 'text-green-400' : 'text-slate-500'}`} />
            <span className={`flex-1 text-sm ${branch.isCurrent ? 'text-white font-medium' : 'text-slate-300'}`}>
              {branch.name}
            </span>
            {branch.ahead !== undefined && branch.ahead > 0 && (
              <span className="text-xs text-green-400">↑{branch.ahead}</span>
            )}
            {branch.behind !== undefined && branch.behind > 0 && (
              <span className="text-xs text-amber-400">↓{branch.behind}</span>
            )}
            {!branch.isCurrent && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => onCheckout?.(branch.name)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                  title="Checkout"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onMerge?.(branch.name)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded"
                  title="Merge into current"
                >
                  <GitMerge className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDeleteBranch?.(branch.name)}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Remote Branches */}
      {remoteBranches.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-800">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Remote</div>
          {remoteBranches.map((branch) => (
            <div
              key={branch.name}
              className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-800"
            >
              <GitBranch className="w-4 h-4 text-slate-600" />
              <span className="flex-1 text-sm text-slate-400">{branch.name}</span>
              <button
                onClick={() => onCheckout?.(branch.name)}
                className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded opacity-0 group-hover:opacity-100"
                title="Checkout"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============= History Tab =============

interface HistoryTabProps {
  commits: GitCommitInfo[]
  formatDate: (date: Date) => string
}

function HistoryTab({ commits, formatDate }: HistoryTabProps) {
  return (
    <div>
      {commits.map((commit, idx) => (
        <div
          key={commit.hash}
          className="flex gap-3 px-3 py-2 hover:bg-slate-800/50 border-b border-slate-800"
        >
          {/* Graph line */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-sky-500 ring-2 ring-slate-900" />
            {idx < commits.length - 1 && (
              <div className="w-0.5 flex-1 bg-slate-700 my-1" />
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <p className="text-sm text-white flex-1 line-clamp-2">{commit.message}</p>
              <code className="text-xs text-slate-500 font-mono">{commit.shortHash}</code>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {commit.author}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(commit.date)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============= Stashes Tab =============

interface StashesTabProps {
  stashes: GitStash[]
  onStash?: (message?: string) => void
  onStashPop?: (id: number) => void
  formatDate: (date: Date) => string
}

function StashesTab({ stashes, onStash, onStashPop, formatDate }: StashesTabProps) {
  const [newStashMessage, setNewStashMessage] = useState('')
  
  const handleStash = () => {
    onStash?.(newStashMessage || undefined)
    setNewStashMessage('')
  }
  
  return (
    <div>
      {/* Create Stash */}
      <div className="p-3 border-b border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newStashMessage}
            onChange={(e) => setNewStashMessage(e.target.value)}
            placeholder="Stash message (optional)"
            className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder:text-slate-500"
          />
          <button
            onClick={handleStash}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-sm"
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Stash List */}
      {stashes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Archive className="w-12 h-12 mb-4 opacity-50" />
          <p className="text-sm">No stashes</p>
        </div>
      ) : (
        <div>
          {stashes.map((stash) => (
            <div
              key={stash.id}
              className="group flex items-center gap-3 px-3 py-2 hover:bg-slate-800/50 border-b border-slate-800"
            >
              <Archive className="w-4 h-4 text-slate-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  stash@{`{${stash.id}}`}: {stash.message}
                </p>
                <p className="text-xs text-slate-500">
                  On {stash.branch} • {formatDate(stash.date)}
                </p>
              </div>
              <button
                onClick={() => onStashPop?.(stash.id)}
                className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded opacity-0 group-hover:opacity-100"
              >
                Pop
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============= Branch Dialog =============

interface BranchDialogProps {
  branches: GitBranchInfo[]
  currentBranch: string
  newBranchName: string
  onNewBranchNameChange: (name: string) => void
  onCreateBranch: () => void
  onCheckout?: (branch: string) => void
  onClose: () => void
}

function BranchDialog({
  branches,
  currentBranch,
  newBranchName,
  onNewBranchNameChange,
  onCreateBranch,
  onCheckout,
  onClose,
}: BranchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const filteredBranches = branches.filter(
    (b) => !b.isRemote && b.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative w-[400px] bg-slate-800 rounded-lg shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
          <GitBranch className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search or create branch..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            autoFocus
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Create New */}
        {searchQuery && !branches.some((b) => b.name === searchQuery) && (
          <button
            onClick={() => {
              onNewBranchNameChange(searchQuery)
              onCreateBranch()
            }}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-700 text-left"
          >
            <Plus className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white">Create branch "{searchQuery}"</span>
          </button>
        )}
        
        {/* Branch List */}
        <div className="max-h-[300px] overflow-y-auto">
          {filteredBranches.map((branch) => (
            <button
              key={branch.name}
              onClick={() => {
                if (!branch.isCurrent) {
                  onCheckout?.(branch.name)
                  onClose()
                }
              }}
              disabled={branch.isCurrent}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left ${
                branch.isCurrent ? 'bg-slate-700/50' : 'hover:bg-slate-700'
              }`}
            >
              <GitBranch className={`w-4 h-4 ${branch.isCurrent ? 'text-green-400' : 'text-slate-500'}`} />
              <span className={`flex-1 text-sm ${branch.isCurrent ? 'text-white' : 'text-slate-300'}`}>
                {branch.name}
              </span>
              {branch.isCurrent && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
