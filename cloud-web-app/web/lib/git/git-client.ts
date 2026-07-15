/**
 * Git Client Implementation
 * Provides git operations for source control management
 */

import { normalizeGitBlame, normalizeGitCommits, normalizeGitStashes, postGitApi, postGitApiVoid } from './git-client-request';
import type { GitBranch, GitCommit, GitConflict, GitDiff, GitRemote, GitStatus, RawGitBlame, RawGitCommit, RawGitStash } from './git-client.types';
export type { GitBranch, GitCommit, GitConflict, GitDiff, GitDiffHunk, GitDiffLine, GitFileStatus, GitRemote, GitStatus } from './git-client.types';

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
    await postGitApiVoid('/api/git/add', { cwd: this.workspaceRoot, paths });
  }

  async reset(paths: string[]): Promise<void> {
    await postGitApiVoid('/api/git/reset', { cwd: this.workspaceRoot, paths });
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
    await postGitApiVoid('/api/git/cherry-pick', { cwd: this.workspaceRoot, commitHash });
  }

  /**
   * Rebase operations
   */
  async rebaseLegacy(branch: string, interactive?: boolean): Promise<void> {
    await postGitApiVoid('/api/git/rebase', { cwd: this.workspaceRoot, branch, interactive });
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
    await postGitApiVoid('/api/git/submodule', { cwd: this.workspaceRoot, action: 'init' });
  }

  async submoduleUpdate(): Promise<void> {
    await postGitApiVoid('/api/git/submodule', { cwd: this.workspaceRoot, action: 'update' });
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
    await postGitApiVoid('/api/git/fetch', { cwd: this.workspaceRoot, remote, prune });
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
    await postGitApiVoid('/api/git/branch/create', { cwd: this.workspaceRoot, name, startPoint });
  }

  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    await postGitApiVoid('/api/git/branch/delete', { cwd: this.workspaceRoot, name, force });
  }

  async checkout(branch: string, create: boolean = false): Promise<void> {
    await postGitApiVoid('/api/git/checkout', { cwd: this.workspaceRoot, branch, create });
  }

  async merge(branch: string, noFastForward: boolean = false): Promise<void> {
    await postGitApiVoid('/api/git/merge', { cwd: this.workspaceRoot, branch, noFastForward });
  }

  async rebase(branch: string, interactive: boolean = false): Promise<void> {
    await postGitApiVoid('/api/git/rebase', { cwd: this.workspaceRoot, branch, interactive });
  }

  async log(limit: number = 50, skip: number = 0, branch?: string): Promise<GitCommit[]> {
    const data = await postGitApi<{ commits?: RawGitCommit[] }>('/api/git/log', {
      cwd: this.workspaceRoot,
      limit,
      skip,
      branch,
    });
    return normalizeGitCommits(data.commits);
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
    const data = await postGitApi<{ blame?: RawGitBlame[] }>('/api/git/blame', {
      cwd: this.workspaceRoot,
      path,
    });
    return normalizeGitBlame(data.blame);
  }

  async stash(message?: string): Promise<void> {
    await postGitApiVoid('/api/git/stash/save', { cwd: this.workspaceRoot, message });
  }

  async stashPop(index: number = 0): Promise<void> {
    await postGitApiVoid('/api/git/stash/pop', { cwd: this.workspaceRoot, index });
  }

  async stashList(): Promise<Array<{
    index: number;
    message: string;
    date: Date;
  }>> {
    const data = await postGitApi<{ stashes?: RawGitStash[] }>('/api/git/stash/list', {
      cwd: this.workspaceRoot,
    });
    return normalizeGitStashes(data.stashes);
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
    await postGitApiVoid('/api/git/remote/add', { cwd: this.workspaceRoot, name, url });
  }

  async removeRemote(name: string): Promise<void> {
    await postGitApiVoid('/api/git/remote/remove', { cwd: this.workspaceRoot, name });
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
    await postGitApiVoid('/api/git/init', { cwd: this.workspaceRoot, bare });
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
