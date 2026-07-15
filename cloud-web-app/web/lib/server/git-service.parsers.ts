import type {
  GitBlame,
  GitBranch,
  GitCommit,
  GitConfig,
  GitDiff,
  GitDiffHunk,
  GitFileChange,
  GitRemote,
  GitStash,
  GitStatus,
  GitTag,
} from './git-service.types';

const STATUS_MAP: Record<string, GitFileChange['status']> = {
  M: 'modified',
  A: 'added',
  D: 'deleted',
  R: 'renamed',
  C: 'copied',
  U: 'unmerged',
};

export function parseGitConfig(stdout: string): GitConfig {
  const config: GitConfig = {};

  stdout.split('\n').forEach((line) => {
    const [key, value] = line.split('=');
    if (!key) return;

    const parts = key.split('.');
    if (parts[0] === 'user') {
      config.user = config.user || {};
      (config.user as Record<string, string>)[parts[1]] = value;
    } else if (parts[0] === 'core') {
      config.core = config.core || {};
      config.core[parts[1]] = value;
    } else if (parts[0] === 'remote') {
      config.remote = config.remote || {};
      config.remote[parts[1]] = config.remote[parts[1]] || { url: '', fetch: '' };
      (config.remote[parts[1]] as unknown as Record<string, string>)[parts[2]] = value;
    }
  });

  return config;
}

export function parseGitStatus(statusStdout: string, branchStdout: string, stashStdout: string): GitStatus {
  const status: GitStatus = {
    branch: branchStdout.trim() || 'HEAD',
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [],
    untracked: [],
    conflicted: [],
    stashCount: stashStdout.split('\n').filter(Boolean).length,
  };

  for (const line of statusStdout.split('\n')) {
    if (!line) continue;

    if (line.startsWith('# branch.upstream')) {
      status.upstream = line.split(' ')[1];
    } else if (line.startsWith('# branch.ab')) {
      const match = line.match(/\+(\d+) -(\d+)/);
      if (match) {
        status.ahead = parseInt(match[1], 10);
        status.behind = parseInt(match[2], 10);
      }
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const parts = line.split(' ');
      const xy = parts[1];
      const filepath = parts.slice(8).join(' ');

      if (xy[0] !== '.') {
        status.staged.push({
          path: filepath,
          status: STATUS_MAP[xy[0]] || 'modified',
        });
      }

      if (xy[1] !== '.') {
        status.unstaged.push({
          path: filepath,
          status: STATUS_MAP[xy[1]] || 'modified',
        });
      }
    } else if (line.startsWith('u ')) {
      const filepath = line.split(' ').slice(10).join(' ');
      status.conflicted.push({
        path: filepath,
        status: 'unmerged',
      });
    } else if (line.startsWith('? ')) {
      status.untracked.push(line.substring(2));
    }
  }

  return status;
}

export function parseGitLog(stdout: string): GitCommit[] {
  const commits: GitCommit[] = [];

  for (const entry of stdout.split('---COMMIT---').filter(Boolean)) {
    const lines = entry.trim().split('\n');
    if (lines.length < 6) continue;

    commits.push({
      hash: lines[0],
      shortHash: lines[1],
      author: lines[2],
      authorEmail: lines[3],
      date: new Date(lines[4]),
      message: lines[5],
      body: lines.slice(6, -2).join('\n').trim() || undefined,
      parents: lines[lines.length - 2].split(' ').filter(Boolean),
      refs: lines[lines.length - 1] ? lines[lines.length - 1].split(', ') : undefined,
    });
  }

  return commits;
}

export function parseGitBranches(stdout: string): GitBranch[] {
  const branches: GitBranch[] = [];

  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;

    const [name, upstream, head, commit, date] = line.split('\t');

    branches.push({
      name: name.replace('remotes/', ''),
      current: head === '*',
      upstream: upstream || undefined,
      remote: name.startsWith('remotes/') ? name.split('/')[1] : undefined,
      lastCommit: commit,
      lastCommitDate: date ? new Date(date) : undefined,
    });
  }

  return branches;
}

export function parseGitRemotes(stdout: string): GitRemote[] {
  const remotes: Map<string, GitRemote> = new Map();

  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;

    const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
    if (!match) continue;

    const [, name, url, type] = match;
    if (!remotes.has(name)) {
      remotes.set(name, { name, fetchUrl: '', pushUrl: '' });
    }

    const remote = remotes.get(name)!;
    if (type === 'fetch') remote.fetchUrl = url;
    else remote.pushUrl = url;
  }

  return Array.from(remotes.values());
}

export function parseGitStashes(stdout: string): GitStash[] {
  const stashes: GitStash[] = [];
  const lines = stdout.split('\n').filter(Boolean);

  for (let i = 0; i < lines.length; i += 3) {
    const indexMatch = lines[i].match(/stash@\{(\d+)\}/);
    if (!indexMatch) continue;

    const messageMatch = lines[i + 1]?.match(/On (.+?): (.+)/);
    stashes.push({
      index: parseInt(indexMatch[1], 10),
      message: messageMatch ? messageMatch[2] : lines[i + 1] || '',
      branch: messageMatch ? messageMatch[1] : '',
      date: new Date(lines[i + 2] || Date.now()),
    });
  }

  return stashes;
}

export function parseGitDiff(numstat: string, fullDiff: string): GitDiff[] {
  const diffs: GitDiff[] = [];
  const stats = new Map<string, { additions: number; deletions: number }>();

  for (const line of numstat.split('\n')) {
    if (!line) continue;
    const [add, del, path] = line.split('\t');
    stats.set(path, {
      additions: add === '-' ? 0 : parseInt(add, 10),
      deletions: del === '-' ? 0 : parseInt(del, 10),
    });
  }

  for (const block of fullDiff.split(/^diff --git/m).filter(Boolean)) {
    const headerMatch = block.match(/a\/(.+?) b\/(.+)/);
    if (!headerMatch) continue;

    const [, oldPath, newPath] = headerMatch;
    const stat = stats.get(newPath) || { additions: 0, deletions: 0 };
    const binary = block.includes('Binary files');
    const diff: GitDiff = {
      oldPath,
      newPath,
      hunks: [],
      additions: stat.additions,
      deletions: stat.deletions,
      binary,
    };

    if (!binary) {
      parseDiffHunks(block, diff.hunks);
    }

    diffs.push(diff);
  }

  return diffs;
}

function parseDiffHunks(block: string, hunks: GitDiffHunk[]): void {
  const hunkMatches = block.matchAll(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@[^\n]*/g);

  for (const match of hunkMatches) {
    const hunk: GitDiffHunk = {
      oldStart: parseInt(match[1], 10),
      oldLines: parseInt(match[2] || '1', 10),
      newStart: parseInt(match[3], 10),
      newLines: parseInt(match[4] || '1', 10),
      lines: [],
    };

    const hunkStart = match.index! + match[0].length + 1;
    const nextHunkMatch = block.slice(hunkStart).match(/@@ -\d+/);
    const hunkEnd = nextHunkMatch ? hunkStart + nextHunkMatch.index! : block.length;
    const hunkContent = block.slice(hunkStart, hunkEnd);

    let oldLine = hunk.oldStart;
    let newLine = hunk.newStart;

    for (const line of hunkContent.split('\n')) {
      if (line.startsWith('+')) {
        hunk.lines.push({
          type: 'addition',
          content: line.substring(1),
          newLineNumber: newLine++,
        });
      } else if (line.startsWith('-')) {
        hunk.lines.push({
          type: 'deletion',
          content: line.substring(1),
          oldLineNumber: oldLine++,
        });
      } else if (line.startsWith(' ') || line === '') {
        hunk.lines.push({
          type: 'context',
          content: line.substring(1),
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    }

    hunks.push(hunk);
  }
}

export function parseGitBlame(stdout: string): GitBlame[] {
  const blames: GitBlame[] = [];
  let currentCommit = '';
  let currentAuthor = '';
  let currentDate = new Date();
  let lineNumber = 0;

  for (const line of stdout.split('\n')) {
    if (line.match(/^[a-f0-9]{40}/)) {
      const parts = line.split(' ');
      currentCommit = parts[0];
      lineNumber = parseInt(parts[2], 10);
    } else if (line.startsWith('author ')) {
      currentAuthor = line.substring(7);
    } else if (line.startsWith('author-time ')) {
      currentDate = new Date(parseInt(line.substring(12), 10) * 1000);
    } else if (line.startsWith('\t')) {
      blames.push({
        lineNumber,
        commit: currentCommit.substring(0, 8),
        author: currentAuthor,
        date: currentDate,
        line: line.substring(1),
      });
    }
  }

  return blames;
}

export function parseGitTags(stdout: string): GitTag[] {
  return stdout.split('\n').filter(Boolean).map((line) => {
    const [name, commit, message] = line.split('\t');
    return { name, commit, message: message || undefined };
  });
}
