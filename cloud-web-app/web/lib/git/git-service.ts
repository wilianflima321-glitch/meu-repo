/**
 * Aethel Git Service
 *
 * Sistema completo de Git com operações reais,
 * diff, blame, branch management e mais.
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

import type {
  GitAuthor,
  GitBlame,
  GitBranch,
  GitCommit,
  GitDiff,
  GitMergeResult,
  GitRemote,
  GitRepository,
  GitStash,
  GitStatus,
  GitTag,
} from './git-service.types';
import {
  parseGitBlame,
  parseGitBranches,
  parseGitCommitEntry,
  parseGitDiff,
  parseGitLog,
  parseGitRemotes,
  parseGitStashCount,
  parseGitStashes,
  parseGitStatus,
  parseGitTags,
} from './git-service.parsers';

export type {
  GitAuthor,
  GitBlame,
  GitBranch,
  GitCommit,
  GitDiff,
  GitMergeResult,
  GitRemote,
  GitRepository,
  GitStash,
  GitStatus,
  GitTag,
} from './git-service.types';

export class GitService extends EventEmitter {
  private repoPath: string;
  private isInitialized: boolean = false;

  constructor(repoPath: string) {
    super();
    this.repoPath = repoPath;
  }

  // ==========================================================================
  // REPOSITORY
  // ==========================================================================

  async init(): Promise<void> {
    await this.execGit(['init']);
    this.isInitialized = true;
    this.emit('initialized');
  }

  async clone(url: string, destination?: string): Promise<string> {
    const args = ['clone', url];
    if (destination) args.push(destination);

    const result = await this.execGit(args);
    this.emit('cloned', { url, destination });
    return result;
  }

  async getRepository(): Promise<GitRepository> {
    const branch = await this.getCurrentBranch();
    const remotes = await this.getRemotes();

    return {
      path: this.repoPath,
      name: this.repoPath.split(/[/\\]/).pop() || '',
      currentBranch: branch,
      remotes,
      isInitialized: this.isInitialized,
    };
  }

  // ==========================================================================
  // STATUS
  // ==========================================================================

  async getStatus(): Promise<GitStatus> {
    const output = await this.execGit(['status', '--porcelain=v2', '-b']);
    return parseGitStatus(output, await this.getStashCount());
  }

  // ==========================================================================
  // STAGING
  // ==========================================================================

  async stage(paths: string | string[]): Promise<void> {
    const files = Array.isArray(paths) ? paths : [paths];
    await this.execGit(['add', ...files]);
    this.emit('staged', files);
  }

  async stageAll(): Promise<void> {
    await this.execGit(['add', '-A']);
    this.emit('stagedAll');
  }

  async unstage(paths: string | string[]): Promise<void> {
    const files = Array.isArray(paths) ? paths : [paths];
    await this.execGit(['reset', 'HEAD', '--', ...files]);
    this.emit('unstaged', files);
  }

  async unstageAll(): Promise<void> {
    await this.execGit(['reset', 'HEAD']);
    this.emit('unstagedAll');
  }

  async discard(paths: string | string[]): Promise<void> {
    const files = Array.isArray(paths) ? paths : [paths];
    await this.execGit(['checkout', '--', ...files]);
    this.emit('discarded', files);
  }

  // ==========================================================================
  // COMMITS
  // ==========================================================================

  async commit(message: string, options: { amend?: boolean; allowEmpty?: boolean } = {}): Promise<string> {
    const args = ['commit', '-m', message];
    if (options.amend) args.push('--amend');
    if (options.allowEmpty) args.push('--allow-empty');

    const output = await this.execGit(args);
    const match = output.match(/\[[\w\s]+\s([a-f0-9]+)\]/);
    const hash = match ? match[1] : '';

    this.emit('committed', { hash, message });
    return hash;
  }

  async getLog(options: { limit?: number; skip?: number; file?: string; author?: string } = {}): Promise<GitCommit[]> {
    const args = ['log', '--format=%H|%h|%an|%ae|%cn|%ce|%aI|%s|%b|%P|%D', '-z'];

    if (options.limit) args.push(`-${options.limit}`);
    if (options.skip) args.push(`--skip=${options.skip}`);
    if (options.author) args.push(`--author=${options.author}`);
    if (options.file) args.push('--', options.file);

    return parseGitLog(await this.execGit(args));
  }

  async show(ref: string): Promise<GitCommit & { diff: GitDiff[] }> {
    const log = await this.execGit(['show', '--format=%H|%h|%an|%ae|%cn|%ce|%aI|%s|%b|%P|%D', '-z', '--stat', ref]);
    const [formatPart] = log.split('\0');
    const commit = parseGitCommitEntry(formatPart);
    const diffs = await this.getDiff(ref + '^', ref);

    return { ...commit, diff: diffs };
  }

  // ==========================================================================
  // BRANCHES
  // ==========================================================================

  async getCurrentBranch(): Promise<string> {
    const output = await this.execGit(['rev-parse', '--abbrev-ref', 'HEAD']);
    return output.trim();
  }

  async getBranches(): Promise<GitBranch[]> {
    const output = await this.execGit([
      'for-each-ref',
      '--format=%(refname:short)|%(objectname:short)|%(upstream:short)|%(upstream:track)|%(HEAD)',
      'refs/heads',
      'refs/remotes',
    ]);

    return parseGitBranches(output);
  }

  async createBranch(name: string, startPoint?: string): Promise<void> {
    const args = ['branch', name];
    if (startPoint) args.push(startPoint);

    await this.execGit(args);
    this.emit('branchCreated', name);
  }

  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    await this.execGit(['branch', force ? '-D' : '-d', name]);
    this.emit('branchDeleted', name);
  }

  async renameBranch(oldName: string, newName: string): Promise<void> {
    await this.execGit(['branch', '-m', oldName, newName]);
    this.emit('branchRenamed', { oldName, newName });
  }

  async checkout(ref: string, options: { create?: boolean } = {}): Promise<void> {
    const args = ['checkout'];
    if (options.create) args.push('-b');
    args.push(ref);

    await this.execGit(args);
    this.emit('checkedOut', ref);
  }

  // ==========================================================================
  // MERGE / REBASE
  // ==========================================================================

  async merge(branch: string, options: { noFastForward?: boolean; squash?: boolean } = {}): Promise<GitMergeResult> {
    const args = ['merge', branch];
    if (options.noFastForward) args.push('--no-ff');
    if (options.squash) args.push('--squash');

    try {
      await this.execGit(args);
      this.emit('merged', branch);
      return { success: true };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('CONFLICT')) {
        const conflicts = await this.getConflictedFiles();
        return { success: false, conflicts };
      }
      throw error;
    }
  }

  async rebase(branch: string, options: { interactive?: boolean } = {}): Promise<boolean> {
    const args = ['rebase'];
    if (options.interactive) args.push('-i');
    args.push(branch);

    try {
      await this.execGit(args);
      this.emit('rebased', branch);
      return true;
    } catch {
      return false;
    }
  }

  async abortMerge(): Promise<void> {
    await this.execGit(['merge', '--abort']);
  }

  async abortRebase(): Promise<void> {
    await this.execGit(['rebase', '--abort']);
  }

  async continueRebase(): Promise<void> {
    await this.execGit(['rebase', '--continue']);
  }

  private async getConflictedFiles(): Promise<string[]> {
    const output = await this.execGit(['diff', '--name-only', '--diff-filter=U']);
    return output.split('\n').filter(Boolean);
  }

  // ==========================================================================
  // REMOTES
  // ==========================================================================

  async getRemotes(): Promise<GitRemote[]> {
    return parseGitRemotes(await this.execGit(['remote', '-v']));
  }

  async addRemote(name: string, url: string): Promise<void> {
    await this.execGit(['remote', 'add', name, url]);
    this.emit('remoteAdded', { name, url });
  }

  async removeRemote(name: string): Promise<void> {
    await this.execGit(['remote', 'remove', name]);
    this.emit('remoteRemoved', name);
  }

  async fetch(remote?: string, options: { all?: boolean; prune?: boolean } = {}): Promise<void> {
    const args = ['fetch'];
    if (options.all) args.push('--all');
    if (options.prune) args.push('--prune');
    if (remote && !options.all) args.push(remote);

    await this.execGit(args);
    this.emit('fetched');
  }

  async pull(remote?: string, branch?: string, options: { rebase?: boolean } = {}): Promise<void> {
    const args = ['pull'];
    if (options.rebase) args.push('--rebase');
    if (remote) args.push(remote);
    if (branch) args.push(branch);

    await this.execGit(args);
    this.emit('pulled');
  }

  async push(remote?: string, branch?: string, options: { force?: boolean; setUpstream?: boolean } = {}): Promise<void> {
    const args = ['push'];
    if (options.force) args.push('--force');
    if (options.setUpstream) args.push('-u');
    if (remote) args.push(remote);
    if (branch) args.push(branch);

    await this.execGit(args);
    this.emit('pushed');
  }

  // ==========================================================================
  // DIFF
  // ==========================================================================

  async getDiff(from?: string, to?: string, file?: string): Promise<GitDiff[]> {
    const args = ['diff', '--no-color'];
    if (from) args.push(from);
    if (to) args.push(to);
    if (file) args.push('--', file);

    return parseGitDiff(await this.execGit(args));
  }

  async getStagedDiff(file?: string): Promise<GitDiff[]> {
    const args = ['diff', '--cached', '--no-color'];
    if (file) args.push('--', file);

    return parseGitDiff(await this.execGit(args));
  }

  // ==========================================================================
  // BLAME
  // ==========================================================================

  async blame(file: string): Promise<GitBlame> {
    return parseGitBlame(await this.execGit(['blame', '--porcelain', file]));
  }

  // ==========================================================================
  // STASH
  // ==========================================================================

  async stash(message?: string): Promise<void> {
    const args = ['stash', 'push'];
    if (message) args.push('-m', message);

    await this.execGit(args);
    this.emit('stashed');
  }

  async stashPop(index: number = 0): Promise<void> {
    await this.execGit(['stash', 'pop', `stash@{${index}}`]);
    this.emit('stashPopped', index);
  }

  async stashApply(index: number = 0): Promise<void> {
    await this.execGit(['stash', 'apply', `stash@{${index}}`]);
    this.emit('stashApplied', index);
  }

  async stashDrop(index: number = 0): Promise<void> {
    await this.execGit(['stash', 'drop', `stash@{${index}}`]);
    this.emit('stashDropped', index);
  }

  async getStashes(): Promise<GitStash[]> {
    return parseGitStashes(await this.execGit(['stash', 'list', '--format=%gd|%s|%aI']));
  }

  private async getStashCount(): Promise<number> {
    return parseGitStashCount(await this.execGit(['stash', 'list']));
  }

  // ==========================================================================
  // TAGS
  // ==========================================================================

  async getTags(): Promise<GitTag[]> {
    return parseGitTags(await this.execGit(['tag', '-l', '--format=%(refname:short)|%(objectname:short)|%(contents:subject)|%(taggername)|%(taggeremail)|%(creatordate:iso)|%(objecttype)']));
  }

  async createTag(name: string, options: { message?: string; commit?: string } = {}): Promise<void> {
    const args = ['tag'];
    if (options.message) args.push('-a', name, '-m', options.message);
    else args.push(name);
    if (options.commit) args.push(options.commit);

    await this.execGit(args);
    this.emit('tagCreated', name);
  }

  async deleteTag(name: string): Promise<void> {
    await this.execGit(['tag', '-d', name]);
    this.emit('tagDeleted', name);
  }

  // ==========================================================================
  // CHERRY PICK
  // ==========================================================================

  async cherryPick(commits: string | string[], options: { noCommit?: boolean } = {}): Promise<void> {
    const refs = Array.isArray(commits) ? commits : [commits];
    const args = ['cherry-pick', ...refs];
    if (options.noCommit) args.push('-n');

    await this.execGit(args);
    this.emit('cherryPicked', refs);
  }

  async abortCherryPick(): Promise<void> {
    await this.execGit(['cherry-pick', '--abort']);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async execGit(args: string[]): Promise<string> {
    // In a real implementation, this would use child_process.spawn
    // For browser environment, this would call a backend API

    // Simulated execution for frontend
    const response = await fetch('/api/git/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ args, cwd: this.repoPath }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    return response.text();
  }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createGitService(repoPath: string): GitService {
  return new GitService(repoPath);
}

export default GitService;
