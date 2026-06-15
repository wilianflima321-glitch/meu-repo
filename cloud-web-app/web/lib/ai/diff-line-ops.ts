/**
 * Line-level diff helpers for the Frente A40 "ghost preview" of a staged AI
 * change. Produces line ranges to mark as removed (in the current editor model)
 * and blocks of inserted lines to render as green ghost view zones, so the user
 * sees the pending change holographically before it is applied.
 */

export type GhostRemovedRange = {
  /** 1-based start line in the current (old) model. */
  startLine: number
  /** 1-based end line in the current (old) model (inclusive). */
  endLine: number
}

export type GhostAddition = {
  /** Insert the ghost lines visually after this 1-based old line (0 = top of file). */
  afterLine: number
  lines: string[]
}

export type GhostDiffHunks = {
  changed: boolean
  removedRanges: GhostRemovedRange[]
  additions: GhostAddition[]
  /** True when the diff was too large to compute precisely and we fell back. */
  approximate: boolean
}

type DiffOp =
  | { type: 'equal'; oldLine: number }
  | { type: 'del'; oldLine: number }
  | { type: 'ins'; text: string }

function splitLines(text: string): string[] {
  // Normalize CRLF so diffs are not polluted by line-ending differences.
  return text.replace(/\r\n/g, '\n').split('\n')
}

/**
 * Classic Longest Common Subsequence diff over lines. Returns an ordered op
 * list (equal/del/ins). O(n*m) time and space — guarded by `maxCells`.
 */
function lcsLineDiff(oldLines: string[], newLines: string[], maxCells: number): DiffOp[] | null {
  const n = oldLines.length
  const m = newLines.length
  if ((n + 1) * (m + 1) > maxCells) return null

  // dp[i][j] = LCS length of oldLines[i..] and newLines[j..]
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const ops: DiffOp[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ type: 'equal', oldLine: i + 1 })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', oldLine: i + 1 })
      i++
    } else {
      ops.push({ type: 'ins', text: newLines[j] })
      j++
    }
  }
  while (i < n) ops.push({ type: 'del', oldLine: i++ + 1 })
  while (j < m) ops.push({ type: 'ins', text: newLines[j++] })
  return ops
}

export function computeGhostDiffHunks(
  oldText: string,
  newText: string,
  maxCells = 4_000_000,
): GhostDiffHunks {
  if (oldText === newText) {
    return { changed: false, removedRanges: [], additions: [], approximate: false }
  }

  const oldLines = splitLines(oldText)
  const newLines = splitLines(newText)
  const ops = lcsLineDiff(oldLines, newLines, maxCells)

  if (!ops) {
    // Fallback for very large files: mark the whole document as replaced.
    return {
      changed: true,
      removedRanges: oldLines.length > 0 ? [{ startLine: 1, endLine: oldLines.length }] : [],
      additions: [{ afterLine: oldLines.length, lines: newLines }],
      approximate: true,
    }
  }

  const removedRanges: GhostRemovedRange[] = []
  const additions: GhostAddition[] = []
  let lastOldLine = 0
  let pendingRemoval: GhostRemovedRange | null = null
  let pendingAddition: GhostAddition | null = null

  const flushRemoval = () => {
    if (pendingRemoval) {
      removedRanges.push(pendingRemoval)
      pendingRemoval = null
    }
  }
  const flushAddition = () => {
    if (pendingAddition) {
      additions.push(pendingAddition)
      pendingAddition = null
    }
  }

  for (const op of ops) {
    if (op.type === 'equal') {
      flushRemoval()
      flushAddition()
      lastOldLine = op.oldLine
      continue
    }
    if (op.type === 'del') {
      flushAddition()
      if (pendingRemoval && op.oldLine === pendingRemoval.endLine + 1) {
        pendingRemoval.endLine = op.oldLine
      } else {
        flushRemoval()
        pendingRemoval = { startLine: op.oldLine, endLine: op.oldLine }
      }
      lastOldLine = op.oldLine
      continue
    }
    // insertion — anchor it after the last consumed old line
    if (pendingAddition && pendingAddition.afterLine === lastOldLine) {
      pendingAddition.lines.push(op.text)
    } else {
      flushAddition()
      pendingAddition = { afterLine: lastOldLine, lines: [op.text] }
    }
  }
  flushRemoval()
  flushAddition()

  return { changed: true, removedRanges, additions, approximate: false }
}
