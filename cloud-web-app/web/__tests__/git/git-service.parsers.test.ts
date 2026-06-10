import { describe, expect, it } from 'vitest'
import {
  parseGitBranches,
  parseGitDiff,
  parseGitLog,
  parseGitRemotes,
  parseGitStashes,
  parseGitStatus,
  parseGitTags,
} from '@/lib/git/git-service.parsers'

describe('git-service parsers', () => {
  it('parses porcelain v2 status into staged, unstaged and untracked buckets', () => {
    const status = parseGitStatus([
      '# branch.head main',
      '1 M. N... 100644 100644 100644 abc abc src/staged.ts',
      '1 .M N... 100644 100644 100644 abc abc src/unstaged.ts',
      '? src/new-file.ts',
      'u UU N... 100644 100644 100644 100644 abc abc abc src/conflict.ts',
    ].join('\n'), 2)

    expect(status.stashCount).toBe(2)
    expect(status.staged).toEqual([{ path: 'src/staged.ts', status: 'modified', staged: true, isSubmodule: false }])
    expect(status.unstaged).toEqual([{ path: 'src/unstaged.ts', status: 'modified', staged: false, isSubmodule: false }])
    expect(status.untracked).toEqual(['src/new-file.ts'])
    expect(status.conflicted[0]).toMatchObject({ path: 'src/conflict.ts', status: 'unmerged' })
  })

  it('parses unified diffs into hunks with addition and deletion counts', () => {
    const diff = parseGitDiff([
      'diff --git a/src/app.ts b/src/app.ts',
      'index 111..222 100644',
      '--- a/src/app.ts',
      '+++ b/src/app.ts',
      '@@ -1,2 +1,2 @@ export function app()',
      ' const keep = true',
      '-const oldValue = 1',
      '+const newValue = 2',
    ].join('\n'))

    expect(diff).toHaveLength(1)
    expect(diff[0]).toMatchObject({ oldFile: 'src/app.ts', newFile: 'src/app.ts', additions: 1, deletions: 1 })
    expect(diff[0].hunks[0].lines.map((line) => line.type)).toEqual(['context', 'deletion', 'addition'])
  })

  it('parses repository metadata outputs deterministically', () => {
    expect(parseGitLog('abc|abc123|Ada|ada@example.com|Bot|bot@example.com|2026-06-10T00:00:00.000Z|Ship|Body|p1 p2|main\0')[0]).toMatchObject({
      hash: 'abc',
      shortHash: 'abc123',
      message: 'Ship',
      parents: ['p1', 'p2'],
      refs: ['main'],
    })

    expect(parseGitBranches('main|abc123|origin/main|ahead 2, behind 1|*\nfeature|def456|||')).toEqual([
      { name: 'main', isRemote: false, isHead: true, upstream: 'origin/main', ahead: 2, behind: 1, commit: 'abc123' },
      { name: 'feature', isRemote: false, isHead: false, upstream: undefined, ahead: 0, behind: 0, commit: 'def456' },
    ])

    expect(parseGitRemotes('origin\thttps://example.com/repo.git (fetch)\norigin\thttps://example.com/repo.git (push)')).toEqual([
      { name: 'origin', url: 'https://example.com/repo.git', fetchUrl: 'https://example.com/repo.git', pushUrl: 'https://example.com/repo.git' },
    ])
  })

  it('parses stash and tag listings', () => {
    expect(parseGitStashes('stash@{0}|On main: WIP spine|2026-06-10T00:00:00.000Z')[0]).toMatchObject({
      index: 0,
      message: 'WIP spine',
      branch: 'main',
    })

    expect(parseGitTags('v1.0.0|abc123|Release|Ada|<ada@example.com>|2026-06-10T00:00:00.000Z|tag')[0]).toMatchObject({
      name: 'v1.0.0',
      hash: 'abc123',
      message: 'Release',
      tagger: { name: 'Ada', email: 'ada@example.com' },
      isAnnotated: true,
    })
  })
})
