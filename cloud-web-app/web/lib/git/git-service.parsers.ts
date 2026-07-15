import type {
  GitBlame,
  GitBranch,
  GitCommit,
  GitDiff,
  GitFileStatus,
  GitHunk,
  GitRemote,
  GitStash,
  GitStatus,
  GitTag,
} from './git-service.types'

export function parseStatusChar(char: string): GitFileStatus['status'] {
  switch (char) {
    case 'A': return 'added'
    case 'M': return 'modified'
    case 'D': return 'deleted'
    case 'R': return 'renamed'
    case 'C': return 'copied'
    case 'U': return 'unmerged'
    default: return 'modified'
  }
}

export function parseGitStatus(output: string, stashCount: number): GitStatus {
  const lines = output.split('\n').filter(Boolean)
  const status: GitStatus = {
    staged: [],
    unstaged: [],
    untracked: [],
    conflicted: [],
    stashCount,
  }

  for (const line of lines) {
    if (line.startsWith('#')) continue

    if (line.startsWith('1') || line.startsWith('2')) {
      const parts = line.split(' ')
      const xy = parts[1]
      const path = parts.slice(8).join(' ')
      const stagedStatus = xy[0]
      const unstagedStatus = xy[1]

      if (stagedStatus !== '.') {
        status.staged.push({
          path,
          status: parseStatusChar(stagedStatus),
          staged: true,
          isSubmodule: false,
        })
      }

      if (unstagedStatus !== '.') {
        status.unstaged.push({
          path,
          status: parseStatusChar(unstagedStatus),
          staged: false,
          isSubmodule: false,
        })
      }
    } else if (line.startsWith('?')) {
      status.untracked.push(line.slice(2))
    } else if (line.startsWith('u')) {
      const path = line.split(' ').slice(10).join(' ')
      status.conflicted.push({
        path,
        status: 'unmerged',
        staged: false,
        isSubmodule: false,
      })
    }
  }

  return status
}

export function parseGitCommitEntry(entry: string): GitCommit {
  const parts = entry.split('|')
  return {
    hash: parts[0],
    shortHash: parts[1],
    author: { name: parts[2], email: parts[3] },
    committer: { name: parts[4], email: parts[5] },
    date: new Date(parts[6]),
    message: parts[7],
    body: parts[8] || undefined,
    parents: parts[9] ? parts[9].split(' ') : [],
    refs: parts[10] ? parts[10].split(', ') : [],
  }
}

export function parseGitLog(output: string): GitCommit[] {
  return output.split('\0').filter(Boolean).map(parseGitCommitEntry)
}

export function parseGitBranches(output: string): GitBranch[] {
  const branches: GitBranch[] = []

  for (const line of output.split('\n').filter(Boolean)) {
    const [name, commit, upstream, track, head] = line.split('|')
    const aheadMatch = track.match(/ahead (\d+)/)
    const behindMatch = track.match(/behind (\d+)/)

    branches.push({
      name,
      isRemote: name.includes('/'),
      isHead: head === '*',
      upstream: upstream || undefined,
      ahead: aheadMatch ? parseInt(aheadMatch[1]) : 0,
      behind: behindMatch ? parseInt(behindMatch[1]) : 0,
      commit,
    })
  }

  return branches
}

export function parseGitRemotes(output: string): GitRemote[] {
  const remotes: Map<string, GitRemote> = new Map()

  for (const line of output.split('\n').filter(Boolean)) {
    const match = line.match(/^(\S+)\s+(\S+)\s+\((\w+)\)$/)
    if (!match) continue

    const [, name, url, type] = match
    let remote = remotes.get(name)
    if (!remote) {
      remote = { name, url }
      remotes.set(name, remote)
    }
    if (type === 'fetch') remote.fetchUrl = url
    if (type === 'push') remote.pushUrl = url
  }

  return Array.from(remotes.values())
}

export function parseGitDiff(diffOutput: string): GitDiff[] {
  const diffs: GitDiff[] = []
  const fileDiffs = diffOutput.split('diff --git').slice(1)

  for (const fileDiff of fileDiffs) {
    const lines = fileDiff.split('\n')
    const headerMatch = lines[0].match(/a\/(.+) b\/(.+)/)
    if (!headerMatch) continue

    const diff: GitDiff = {
      oldFile: headerMatch[1],
      newFile: headerMatch[2],
      hunks: [],
      additions: 0,
      deletions: 0,
      binary: fileDiff.includes('Binary files'),
    }

    if (!diff.binary) parseGitDiffHunks(lines, diff)
    diffs.push(diff)
  }

  return diffs
}

function parseGitDiffHunks(lines: string[], diff: GitDiff) {
  let currentHunk: GitHunk | null = null
  let oldLine = 0
  let newLine = 0

  for (const line of lines) {
    const hunkMatch = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/)

    if (hunkMatch) {
      currentHunk = {
        oldStart: parseInt(hunkMatch[1]),
        oldLines: parseInt(hunkMatch[2]) || 1,
        newStart: parseInt(hunkMatch[3]),
        newLines: parseInt(hunkMatch[4]) || 1,
        header: hunkMatch[5].trim(),
        lines: [],
      }
      diff.hunks.push(currentHunk)
      oldLine = currentHunk.oldStart
      newLine = currentHunk.newStart
    } else if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({ type: 'addition', content: line.slice(1), newLineNumber: newLine++ })
        diff.additions++
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({ type: 'deletion', content: line.slice(1), oldLineNumber: oldLine++ })
        diff.deletions++
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        })
      }
    }
  }
}

export function parseGitBlame(output: string): GitBlame {
  const lines = output.split('\n')
  const result: GitBlame = { lines: [] }
  let currentHash = ''
  let currentAuthor = ''
  let currentDate = new Date()
  let lineNumber = 0
  let originalLine = 0

  for (const line of lines) {
    const hashMatch = line.match(/^([a-f0-9]{40}) (\d+) (\d+)/)
    if (hashMatch) {
      currentHash = hashMatch[1]
      originalLine = parseInt(hashMatch[2])
      lineNumber = parseInt(hashMatch[3])
      continue
    }

    if (line.startsWith('author ')) {
      currentAuthor = line.slice(7)
    } else if (line.startsWith('author-time ')) {
      currentDate = new Date(parseInt(line.slice(12)) * 1000)
    } else if (line.startsWith('\t')) {
      result.lines.push({
        hash: currentHash.slice(0, 8),
        author: currentAuthor,
        date: currentDate,
        lineNumber,
        content: line.slice(1),
        originalLine,
      })
    }
  }

  return result
}

export function parseGitStashes(output: string): GitStash[] {
  const stashes: GitStash[] = []

  for (const line of output.split('\n').filter(Boolean)) {
    const [ref, message, date] = line.split('|')
    const indexMatch = ref.match(/stash@\{(\d+)\}/)
    const branchMatch = message.match(/On (\S+):/)

    stashes.push({
      index: indexMatch ? parseInt(indexMatch[1]) : stashes.length,
      message: message.replace(/^On \S+: /, ''),
      branch: branchMatch ? branchMatch[1] : '',
      date: new Date(date),
    })
  }

  return stashes
}

export function parseGitStashCount(output: string): number {
  return output.split('\n').filter(Boolean).length
}

export function parseGitTags(output: string): GitTag[] {
  const tags: GitTag[] = []

  for (const line of output.split('\n').filter(Boolean)) {
    const [name, hash, message, taggerName, taggerEmail, date, type] = line.split('|')
    tags.push({
      name,
      hash,
      message: message || undefined,
      tagger: taggerName ? { name: taggerName, email: taggerEmail.replace(/[<>]/g, '') } : undefined,
      date: date ? new Date(date) : undefined,
      isAnnotated: type === 'tag',
    })
  }

  return tags
}
