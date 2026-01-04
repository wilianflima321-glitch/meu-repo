/**
 * Git Client Implementation
 * Provides git operations for source control management
 */

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: GitFileStatus[];
  conflicted: GitFileStatus[];
}

export interface GitFileStatus {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'conflicted';
  oldPath?: string;
}

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  parents: string[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
}

export interface GitRemote {
  name: string;
  url: string;
  fetch: string;
  push: string;
}

export interface GitDiff {
  path: string;
  oldPath?: string;
  status?: string;
  additions?: number;
  deletions?: number;
  patch?: string;
  hunks: GitDiffHunk[];
}

export interface GitDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: GitDiffLine[];
}

export interface GitDiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface GitConflict {
  path: string;
  ours: string;
  theirs: string;
  base?: string;
}

export class GitClient {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = '/workspace') {
    this.workspaceRoot = workspaceRoot;
  }

  async status(): Promise<GitStatus> {
    const response = await fetch('/api/git/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot })
    });

    const data = await response.json();
    return data.status;
  }

  async add(paths: string[]): Promise<void> {
    await fetch('/api/git/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, paths })
    });
  }

  async reset(paths: string[]): Promise<void> {
    await fetch('/api/git/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, paths })
    });
  }

  /**
   * Discard changes in working directory (git checkout -- <paths>)
   */
  async discardChanges(paths: string[]): Promise<void> {
    await fetch('/api/git/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cwd: this.workspaceRoot, 
        paths,
        action: 'discard'
      })
    });
  }
  /**
   * Stash operations
   */
  async stashSaveWithId(message?: string): Promise<string> {
    const response = await fetch('/api/git/stash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, message, action: 'save' })
    });
    const data = await response.json();
    return data.stashId;
  }

  async stashPopById(stashId?: string): Promise<void> {
    await fetch('/api/git/stash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, stashId, action: 'pop' })
    });
  }

  async stashApply(stashId?: string): Promise<void> {
    await fetch('/api/git/stash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, stashId, action: 'apply' })
    });
  }

  async stashDrop(stashId: string): Promise<void> {
    await fetch('/api/git/stash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, stashId, action: 'drop' })
    });
  }

  async stashListById(): Promise<Array<{ id: string; message: string; date: Date }>> {
    const response = await fetch('/api/git/stash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'list' })
    });
    const data = await response.json();
    return data.stashes;
  }

  /**
   * Cherry-pick
   */
  async cherryPick(commitHash: string): Promise<void> {
    await fetch('/api/git/cherry-pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, commitHash })
    });
  }

  /**
   * Rebase operations
   */
  async rebaseLegacy(branch: string, interactive?: boolean): Promise<void> {
    await fetch('/api/git/rebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, branch, interactive })
    });
  }

  async rebaseContinue(): Promise<void> {
    await fetch('/api/git/rebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'continue' })
    });
  }

  async rebaseAbort(): Promise<void> {
    await fetch('/api/git/rebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'abort' })
    });
  }

  async rebaseSkip(): Promise<void> {
    await fetch('/api/git/rebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'skip' })
    });
  }

  /**
   * Blame
   */
  async blameRaw(path: string): Promise<Array<{
    line: number;
    hash: string;
    author: string;
    date: Date;
    content: string;
  }>> {
    const response = await fetch('/api/git/blame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, path })
    });
    const data = await response.json();
    return data.blame;
  }

  /**
   * File history
   */
  async fileHistory(path: string, limit?: number): Promise<GitCommit[]> {
    const response = await fetch('/api/git/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, path, limit })
    });
    const data = await response.json();
    return data.commits;
  }

  /**
   * Show commit
   */
  async showCommit(hash: string): Promise<{
    commit: GitCommit;
    diff: GitDiff[];
  }> {
    const response = await fetch('/api/git/show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, hash })
    });
    return await response.json();
  }

  /**
   * Submodule operations
   */
  async submoduleInit(): Promise<void> {
    await fetch('/api/git/submodule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'init' })
    });
  }

  async submoduleUpdate(): Promise<void> {
    await fetch('/api/git/submodule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'update' })
    });
  }

  async submoduleAdd(url: string, path: string): Promise<void> {
    await fetch('/api/git/submodule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'add', url, path })
    });
  }

  /**
   * Worktree operations
   */
  async worktreeAdd(path: string, branch?: string): Promise<void> {
    await fetch('/api/git/worktree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'add', path, branch })
    });
  }

  async worktreeRemove(path: string): Promise<void> {
    await fetch('/api/git/worktree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'remove', path })
    });
  }

  async worktreeList(): Promise<Array<{
    path: string;
    branch: string;
    head: string;
  }>> {
    const response = await fetch('/api/git/worktree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'list' })
    });
    const data = await response.json();
    return data.worktrees;
  }

  /**
   * Bisect operations
   */
  async bisectStart(bad: string, good: string): Promise<void> {
    await fetch('/api/git/bisect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'start', bad, good })
    });
  }

  async bisectGood(): Promise<void> {
    await fetch('/api/git/bisect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'good' })
    });
  }

  async bisectBad(): Promise<void> {
    await fetch('/api/git/bisect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'bad' })
    });
  }

  async bisectReset(): Promise<void> {
    await fetch('/api/git/bisect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, action: 'reset' })
    });
  }

  async commit(message: string, amend: boolean = false): Promise<string> {
    const response = await fetch('/api/git/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, message, amend })
    });

    const data = await response.json();
    return data.hash;
  }

  async push(remote: string = 'origin', branch?: string, force: boolean = false): Promise<void> {
    await fetch('/api/git/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, remote, branch, force })
    });
  }

  async pull(remote: string = 'origin', branch?: string, rebase: boolean = false): Promise<void> {
    await fetch('/api/git/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, remote, branch, rebase })
    });
  }

  async fetch(remote: string = 'origin', prune: boolean = true): Promise<void> {
    await fetch('/api/git/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, remote, prune })
    });
  }

  async branches(includeRemote: boolean = false): Promise<GitBranch[]> {
    const response = await fetch('/api/git/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, includeRemote })
    });

    const data = await response.json();
    return data.branches;
  }

  async createBranch(name: string, startPoint?: string): Promise<void> {
    await fetch('/api/git/branch/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, name, startPoint })
    });
  }

  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    await fetch('/api/git/branch/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, name, force })
    });
  }

  async checkout(branch: string, create: boolean = false): Promise<void> {
    await fetch('/api/git/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, branch, create })
    });
  }

  async merge(branch: string, noFastForward: boolean = false): Promise<void> {
    await fetch('/api/git/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, branch, noFastForward })
    });
  }

  async rebase(branch: string, interactive: boolean = false): Promise<void> {
    await fetch('/api/git/rebase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, branch, interactive })
    });
  }

  async log(limit: number = 50, skip: number = 0, branch?: string): Promise<GitCommit[]> {
    const response = await fetch('/api/git/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, limit, skip, branch })
    });

    const data = await response.json();
    return data.commits.map((c: any) => ({
      ...c,
      date: new Date(c.date)
    }));
  }

  async show(hash: string): Promise<{ commit: GitCommit; diff: GitDiff[] }> {
    const response = await fetch('/api/git/show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, hash })
    });

    const data = await response.json();
    return {
      commit: {
        ...data.commit,
        date: new Date(data.commit.date)
      },
      diff: data.diff
    };
  }

  async diff(path?: string, staged: boolean = false): Promise<GitDiff[]> {
    const response = await fetch('/api/git/diff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, path, staged })
    });

    const data = await response.json();
    return data.diff;
  }

  async blame(path: string): Promise<Array<{
    line: number;
    hash: string;
    author: string;
    date: Date;
    content: string;
  }>> {
    const response = await fetch('/api/git/blame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, path })
    });

    const data = await response.json();
    return data.blame.map((b: any) => ({
      ...b,
      date: new Date(b.date)
    }));
  }

  async stash(message?: string): Promise<void> {
    await fetch('/api/git/stash/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, message })
    });
  }

  async stashPop(index: number = 0): Promise<void> {
    await fetch('/api/git/stash/pop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, index })
    });
  }

  async stashList(): Promise<Array<{
    index: number;
    message: string;
    date: Date;
  }>> {
    const response = await fetch('/api/git/stash/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot })
    });

    const data = await response.json();
    return data.stashes.map((s: any) => ({
      ...s,
      date: new Date(s.date)
    }));
  }

  async remotes(): Promise<GitRemote[]> {
    const response = await fetch('/api/git/remotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot })
    });

    const data = await response.json();
    return data.remotes;
  }

  async addRemote(name: string, url: string): Promise<void> {
    await fetch('/api/git/remote/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, name, url })
    });
  }

  async removeRemote(name: string): Promise<void> {
    await fetch('/api/git/remote/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, name })
    });
  }

  async getConflicts(): Promise<GitConflict[]> {
    const response = await fetch('/api/git/conflicts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot })
    });

    const data = await response.json();
    return data.conflicts;
  }

  async resolveConflict(path: string, resolution: 'ours' | 'theirs' | 'manual', content?: string): Promise<void> {
    await fetch('/api/git/conflict/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, path, resolution, content })
    });
  }

  async init(bare: boolean = false): Promise<void> {
    await fetch('/api/git/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: this.workspaceRoot, bare })
    });
  }

  async clone(url: string, directory?: string): Promise<void> {
    await fetch('/api/git/clone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, directory: directory || this.workspaceRoot })
    });
  }
}

// Singleton instance
let gitClientInstance: GitClient | null = null;

export function getGitClient(workspaceRoot?: string): GitClient {
  if (!gitClientInstance) {
    gitClientInstance = new GitClient(workspaceRoot);
  }
  return gitClientInstance;
}

export function resetGitClient(): void {
  gitClientInstance = null;
}
