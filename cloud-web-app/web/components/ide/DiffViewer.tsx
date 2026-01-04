'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Copy,
  RotateCcw,
  FilePlus,
  FileCode,
  Maximize2,
  Minimize2,
} from 'lucide-react'

// ============= Types =============

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed' | 'modified'
  lineNumber: { old: number | null; new: number | null }
  content: string
  accepted?: boolean
}

interface DiffHunk {
  id: string
  startLine: number
  endLine: number
  lines: DiffLine[]
  accepted: boolean | null // null = pending, true = accepted, false = rejected
}

export interface DiffViewerProps {
  originalContent?: string
  modifiedContent?: string
  fileName?: string
  filePath?: string
  language?: string
  onAcceptAll?: () => void
  onRejectAll?: () => void
  onAcceptHunk?: (hunkId: string) => void
  onRejectHunk?: (hunkId: string) => void
  onApply?: (content: string) => void
  onClose?: () => void
  mode?: 'side-by-side' | 'inline' | 'unified'
  className?: string
}

// ============= Diff Algorithm =============

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const diff: DiffLine[] = []
  
  // Simple LCS-based diff (in production, use a library like diff-match-patch)
  const lcs = computeLCS(oldLines, newLines)
  
  let oldIdx = 0
  let newIdx = 0
  let lcsIdx = 0
  
  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    const oldLine = oldLines[oldIdx]
    const newLine = newLines[newIdx]
    const lcsLine = lcs[lcsIdx]
    
    if (oldIdx < oldLines.length && oldLine === lcsLine && newIdx < newLines.length && newLine === lcsLine) {
      // Unchanged line
      diff.push({
        type: 'unchanged',
        lineNumber: { old: oldIdx + 1, new: newIdx + 1 },
        content: oldLine,
      })
      oldIdx++
      newIdx++
      lcsIdx++
    } else if (oldIdx < oldLines.length && oldLine !== lcsLine) {
      // Removed line
      diff.push({
        type: 'removed',
        lineNumber: { old: oldIdx + 1, new: null },
        content: oldLine,
      })
      oldIdx++
    } else if (newIdx < newLines.length && newLine !== lcsLine) {
      // Added line
      diff.push({
        type: 'added',
        lineNumber: { old: null, new: newIdx + 1 },
        content: newLine,
      })
      newIdx++
    } else {
      // Edge case
      if (oldIdx < oldLines.length) {
        diff.push({
          type: 'removed',
          lineNumber: { old: oldIdx + 1, new: null },
          content: oldLines[oldIdx],
        })
        oldIdx++
      }
      if (newIdx < newLines.length) {
        diff.push({
          type: 'added',
          lineNumber: { old: null, new: newIdx + 1 },
          content: newLines[newIdx],
        })
        newIdx++
      }
    }
  }
  
  return diff
}

function computeLCS(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  // Backtrack to find LCS
  const lcs: string[] = []
  let i = m, j = n
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      lcs.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }
  
  return lcs
}

// ============= Diff Hunks Grouping =============

function groupIntoHunks(diff: DiffLine[]): DiffHunk[] {
  const hunks: DiffHunk[] = []
  let currentHunk: DiffLine[] = []
  let hunkStart = 0
  let lastChangeIdx = -10 // Context lines threshold
  
  diff.forEach((line, idx) => {
    if (line.type !== 'unchanged') {
      // Start new hunk or extend current
      if (idx - lastChangeIdx > 3 && currentHunk.length > 0) {
        // Close previous hunk (with context)
        hunks.push({
          id: `hunk-${hunks.length}`,
          startLine: hunkStart,
          endLine: lastChangeIdx + 3,
          lines: currentHunk,
          accepted: null,
        })
        currentHunk = []
        // Add leading context
        const contextStart = Math.max(0, idx - 3)
        for (let i = contextStart; i < idx; i++) {
          currentHunk.push(diff[i])
        }
        hunkStart = contextStart
      }
      currentHunk.push(line)
      lastChangeIdx = idx
    } else {
      // Context line
      if (idx - lastChangeIdx <= 3) {
        currentHunk.push(line)
      } else if (currentHunk.length === 0) {
        // Leading context for potential hunk
        if (currentHunk.length < 3) {
          currentHunk.push(line)
          // Track hunk start on first line added
          if (hunkStart === -1) hunkStart = idx
        }
      }
    }
  })
  
  // Close last hunk
  if (currentHunk.some(l => l.type !== 'unchanged')) {
    hunks.push({
      id: `hunk-${hunks.length}`,
      startLine: hunkStart,
      endLine: diff.length - 1,
      lines: currentHunk,
      accepted: null,
    })
  }
  
  return hunks
}

// ============= Diff Line Component =============

interface DiffLineProps {
  line: DiffLine
  showLineNumbers: boolean
  highlightSyntax?: boolean
}

function DiffLineComponent({ line, showLineNumbers, highlightSyntax }: DiffLineProps) {
  const bgColor = {
    unchanged: 'bg-transparent',
    added: 'bg-emerald-500/10',
    removed: 'bg-red-500/10',
    modified: 'bg-amber-500/10',
  }[line.type]
  
  const textColor = {
    unchanged: 'text-slate-300',
    added: 'text-emerald-300',
    removed: 'text-red-300',
    modified: 'text-amber-300',
  }[line.type]
  
  const marker = {
    unchanged: ' ',
    added: '+',
    removed: '-',
    modified: '~',
  }[line.type]
  
  return (
    <div className={`flex items-stretch ${bgColor} hover:bg-slate-800/30`}>
      {showLineNumbers && (
        <>
          <div className="w-12 flex-shrink-0 text-right pr-2 text-slate-600 text-xs font-mono border-r border-slate-800 select-none">
            {line.lineNumber.old || ''}
          </div>
          <div className="w-12 flex-shrink-0 text-right pr-2 text-slate-600 text-xs font-mono border-r border-slate-800 select-none">
            {line.lineNumber.new || ''}
          </div>
        </>
      )}
      <div className={`w-6 flex-shrink-0 text-center text-xs font-mono ${textColor}`}>
        {marker}
      </div>
      <pre className={`flex-1 text-sm font-mono px-2 ${textColor} whitespace-pre overflow-x-auto`}>
        {line.content}
      </pre>
    </div>
  )
}

// ============= Diff Hunk Component =============

interface DiffHunkProps {
  hunk: DiffHunk
  onAccept: () => void
  onReject: () => void
  showLineNumbers: boolean
}

function DiffHunkComponent({ hunk, onAccept, onReject, showLineNumbers }: DiffHunkProps) {
  const hasChanges = hunk.lines.some(l => l.type !== 'unchanged')
  
  return (
    <div className={`border rounded-lg overflow-hidden mb-4 ${
      hunk.accepted === true 
        ? 'border-emerald-500/50' 
        : hunk.accepted === false 
        ? 'border-red-500/50 opacity-50' 
        : 'border-slate-700'
    }`}>
      {/* Hunk header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/50 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-mono">
          @@ Lines {hunk.startLine + 1} - {hunk.endLine + 1} @@
        </span>
        
        {hasChanges && hunk.accepted === null && (
          <div className="flex items-center gap-1">
            <button
              onClick={onAccept}
              className="flex items-center gap-1 px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs"
            >
              <Check className="w-3 h-3" />
              Accept
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1 px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-xs"
            >
              <X className="w-3 h-3" />
              Reject
            </button>
          </div>
        )}
        
        {hunk.accepted === true && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <Check className="w-3 h-3" />
            Accepted
          </span>
        )}
        
        {hunk.accepted === false && (
          <span className="text-xs text-red-400 flex items-center gap-1">
            <X className="w-3 h-3" />
            Rejected
          </span>
        )}
      </div>
      
      {/* Hunk content */}
      <div className="overflow-x-auto">
        {hunk.lines.map((line, idx) => (
          <DiffLineComponent
            key={idx}
            line={line}
            showLineNumbers={showLineNumbers}
          />
        ))}
      </div>
    </div>
  )
}

// ============= Side by Side View =============

interface SideBySideViewProps {
  originalContent: string
  modifiedContent: string
}

function SideBySideView({ originalContent, modifiedContent }: SideBySideViewProps) {
  const originalLines = originalContent.split('\n')
  const modifiedLines = modifiedContent.split('\n')
  const diff = computeDiff(originalContent, modifiedContent)
  
  // Build aligned lines for side-by-side
  const leftLines: (DiffLine | null)[] = []
  const rightLines: (DiffLine | null)[] = []
  
  diff.forEach(line => {
    if (line.type === 'unchanged') {
      leftLines.push(line)
      rightLines.push(line)
    } else if (line.type === 'removed') {
      leftLines.push(line)
      rightLines.push(null) // Empty space on right
    } else if (line.type === 'added') {
      leftLines.push(null) // Empty space on left
      rightLines.push(line)
    }
  })
  
  return (
    <div className="flex">
      {/* Left (Original) */}
      <div className="flex-1 border-r border-slate-700">
        <div className="px-3 py-1.5 bg-red-500/10 border-b border-slate-700 text-xs font-semibold text-red-400">
          Original
        </div>
        <div className="overflow-x-auto">
          {leftLines.map((line, idx) => (
            line ? (
              <DiffLineComponent key={idx} line={line} showLineNumbers={true} />
            ) : (
              <div key={idx} className="h-6 bg-slate-900/50" />
            )
          ))}
        </div>
      </div>
      
      {/* Right (Modified) */}
      <div className="flex-1">
        <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-slate-700 text-xs font-semibold text-emerald-400">
          Modified
        </div>
        <div className="overflow-x-auto">
          {rightLines.map((line, idx) => (
            line ? (
              <DiffLineComponent key={idx} line={line} showLineNumbers={true} />
            ) : (
              <div key={idx} className="h-6 bg-slate-900/50" />
            )
          ))}
        </div>
      </div>
    </div>
  )
}

// ============= Main Diff Viewer Component =============

export default function DiffViewer({
  originalContent = '',
  modifiedContent = '',
  fileName,
  filePath,
  language = 'typescript',
  onAcceptAll = () => {},
  onRejectAll = () => {},
  onAcceptHunk = () => {},
  onRejectHunk = () => {},
  onApply = () => {},
  onClose = () => {},
  mode = 'unified',
  className = '',
}: DiffViewerProps) {
  const resolvedFileName = fileName || filePath?.split('/').pop() || 'file';
  const [viewMode, setViewMode] = useState<'side-by-side' | 'inline' | 'unified'>(mode)
  const [hunks, setHunks] = useState<DiffHunk[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  
  // Compute diff and hunks
  useEffect(() => {
    const diff = computeDiff(originalContent, modifiedContent)
    const groupedHunks = groupIntoHunks(diff)
    setHunks(groupedHunks)
  }, [originalContent, modifiedContent])
  
  // Handle hunk accept/reject
  const handleAcceptHunk = useCallback((hunkId: string) => {
    setHunks(prev => prev.map(h => 
      h.id === hunkId ? { ...h, accepted: true } : h
    ))
    onAcceptHunk(hunkId)
  }, [onAcceptHunk])
  
  const handleRejectHunk = useCallback((hunkId: string) => {
    setHunks(prev => prev.map(h => 
      h.id === hunkId ? { ...h, accepted: false } : h
    ))
    onRejectHunk(hunkId)
  }, [onRejectHunk])
  
  // Accept/Reject all
  const handleAcceptAll = useCallback(() => {
    setHunks(prev => prev.map(h => ({ ...h, accepted: true })))
    onAcceptAll()
  }, [onAcceptAll])
  
  const handleRejectAll = useCallback(() => {
    setHunks(prev => prev.map(h => ({ ...h, accepted: false })))
    onRejectAll()
  }, [onRejectAll])
  
  // Apply changes
  const handleApply = useCallback(() => {
    // Build final content from accepted hunks
    const acceptedHunks = hunks.filter(h => h.accepted === true)
    // In real implementation, merge accepted changes into original
    onApply(modifiedContent)
  }, [hunks, modifiedContent, onApply])
  
  // Stats
  const stats = useMemo(() => {
    const diff = computeDiff(originalContent, modifiedContent)
    return {
      additions: diff.filter(l => l.type === 'added').length,
      deletions: diff.filter(l => l.type === 'removed').length,
      hunks: hunks.length,
      pending: hunks.filter(h => h.accepted === null).length,
      accepted: hunks.filter(h => h.accepted === true).length,
      rejected: hunks.filter(h => h.accepted === false).length,
    }
  }, [originalContent, modifiedContent, hunks])
  
  // Copy to clipboard
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(modifiedContent)
  }, [modifiedContent])
  
  return (
    <div className={`flex flex-col h-full bg-slate-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <FileCode className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-white">{resolvedFileName}</span>
          <span className="text-xs text-slate-500">{language}</span>
          
          {/* Stats */}
          <div className="flex items-center gap-2 ml-4 text-xs">
            <span className="text-emerald-400">+{stats.additions}</span>
            <span className="text-red-400">-{stats.deletions}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">{stats.hunks} hunks</span>
            {stats.pending > 0 && (
              <span className="text-amber-400">{stats.pending} pending</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-700 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('unified')}
              className={`px-2 py-1 text-xs ${viewMode === 'unified' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Unified
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2 py-1 text-xs ${viewMode === 'side-by-side' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Side by Side
            </button>
          </div>
          
          {/* Actions */}
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
            title="Copy modified"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded text-slate-400"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'side-by-side' ? (
          <SideBySideView
            originalContent={originalContent}
            modifiedContent={modifiedContent}
          />
        ) : (
          <div className="p-4">
            {hunks.map(hunk => (
              <DiffHunkComponent
                key={hunk.id}
                hunk={hunk}
                onAccept={() => handleAcceptHunk(hunk.id)}
                onReject={() => handleRejectHunk(hunk.id)}
                showLineNumbers={true}
              />
            ))}
            
            {hunks.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Check className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No differences found</p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer actions */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAcceptAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm"
          >
            <Check className="w-4 h-4" />
            Accept All
          </button>
          <button
            onClick={handleRejectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded text-sm"
          >
            <X className="w-4 h-4" />
            Reject All
          </button>
          <button
            onClick={() => {
              setHunks(prev => prev.map(h => ({ ...h, accepted: null })))
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">
            {stats.accepted}/{stats.hunks} changes accepted
          </span>
          <button
            onClick={handleApply}
            disabled={stats.pending > 0}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium ${
              stats.pending > 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <FilePlus className="w-4 h-4" />
            Apply Changes
          </button>
        </div>
      </div>
    </div>
  )
}
