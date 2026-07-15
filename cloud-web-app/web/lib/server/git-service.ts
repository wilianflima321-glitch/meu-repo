/**
 * Aethel Engine - Git Service Backend
 *
 * Git execution wrapper with parser helpers kept out of the command surface.
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import { GitCommandRunner } from './git-service-runner';
import {
  parseGitBlame,
  parseGitBranches,
  parseGitConfig,
  parseGitDiff,
  parseGitLog,
  parseGitRemotes,
  parseGitStashes,
  parseGitStatus,
  parseGitTags,
} from './git-service.parsers';
import type { GitBlame, GitBranch, GitCommit, GitConfig, GitDiff, GitRemote, GitStash, GitStatus, GitTag } from './git-service.types';

export type { GitBlame, GitBranch, GitCommit, GitConfig, GitDiff, GitDiffHunk, GitDiffLine, GitFileChange, GitRemote, GitStash, GitStatus, GitTag } from './git-service.types';

// ============================================================================
// Git Service
// ============================================================================

export class GitService extends EventEmitter {
  private repoPath: string;
  private runner: GitCommandRunner;

  constructor(repoPath: string, gitPath: string = 'git') {
    super();
    this.repoPath = path.resolve(repoPath);
    this.runner = new GitCommandRunner(this.repoPath, gitPath);
  }

  // ==========================================================================
  // Core Command Execution
  // ==========================================================================

  private async runCommand(
    args: string[],
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    return this.runner.runCommand(args, options);
  }

  // ==========================================================================
  // Repository Info
  // ==========================================================================

  async isRepository(): Promise<boolean> {
    try {
      await this.runCommand(['rev-parse', '--git-dir']);
      return true;
    } catch {
      return false;
    }
  }

  async getRepositoryRoot(): Promise<string> {
    const { stdout } = await this.runCommand(['rev-parse', '--show-toplevel']);
    return stdout.trim();
  }

  async getConfig(): Promise<GitConfig> {
    const { stdout } = await this.runCommand(['config', '--list']);
    return parseGitConfig(stdout);
  }

  async setConfig(key: string, value: string, global: boolean = false): Promise<void> {
    const args = ['config'];
    if (global) args.push('--global');
    args.push(key, value);
    await this.runCommand(args);
  }

  // ==========================================================================
  // Status
  // ==========================================================================

  async getStatus(): Promise<GitStatus> {
    const [statusResult, branchResult, stashResult] = await Promise.all([
      this.runCommand(['status', '--porcelain=v2', '--branch']),
      this.runCommand(['rev-parse', '--abbrev-ref', 'HEAD']).catch(() => ({ stdout: '' })),
      this.runCommand(['stash', 'list']).catch(() => ({ stdout: '' })),
    ]);
    const status = parseGitStatus(statusResult.stdout, branchResult.stdout, stashResult.stdout);
    this.emit('statusUpdated', status);
    return status;
  }

  // ==========================================================================
  // Staging
  // ==========================================================================

  async stage(paths: string[]): Promise<void> {
    await this.runCommand(['add', '--', ...paths]);
    this.emit('staged', paths);
  }

  async stageAll(): Promise<void> {
    await this.runCommand(['add', '-A']);
    this.emit('staged', ['all']);
  }

  async unstage(paths: string[]): Promise<void> {
    await this.runCommand(['reset', 'HEAD', '--', ...paths]);
    this.emit('unstaged', paths);
  }

  async unstageAll(): Promise<void> {
    await this.runCommand(['reset', 'HEAD']);
    this.emit('unstaged', ['all']);
  }

  async discardChanges(paths: string[]): Promise<void> {
    await this.runCommand(['checkout', '--', ...paths]);
    this.emit('discarded', paths);
  }

  async discardAllChanges(): Promise<void> {
    await this.runCommand(['checkout', '--', '.']);
    await this.runCommand(['clean', '-fd']);
    this.emit('discarded', ['all']);
  }

  // ==========================================================================
  // Commits
  // ==========================================================================

  async commit(message: string, options: {
    amend?: boolean;
    allowEmpty?: boolean;
    signoff?: boolean;
  } = {}): Promise<string> {
    const args = ['commit', '-m', message];

    if (options.amend) args.push('--amend');
    if (options.allowEmpty) args.push('--allow-empty');
    if (options.signoff) args.push('--signoff');

    const { stdout } = await this.runCommand(args);
    const match = stdout.match(/\[.+ ([a-f0-9]+)\]/);
    const hash = match ? match[1] : '';

    this.emit('committed', { hash, message });
    return hash;
  }

  async getLog(options: {
    maxCount?: number;
    skip?: number;
    since?: Date;
    until?: Date;
    author?: string;
    grep?: string;
    path?: string;
    branch?: string;
  } = {}): Promise<GitCommit[]> {
    const args = [
      'log',
      '--format=%H%n%h%n%an%n%ae%n%aI%n%s%n%b%n%P%n%D%n---COMMIT---',
    ];

    if (options.maxCount) args.push(`-n${options.maxCount}`);
    if (options.skip) args.push(`--skip=${options.skip}`);
    if (options.since) args.push(`--since=${options.since.toISOString()}`);
    if (options.until) args.push(`--until=${options.until.toISOString()}`);
    if (options.author) args.push(`--author=${options.author}`);
    if (options.grep) args.push(`--grep=${options.grep}`);
    if (options.branch) args.push(options.branch);
    if (options.path) args.push('--', options.path);

    const { stdout } = await this.runCommand(args);
    return parseGitLog(stdout);
  }

  async getCommit(ref: string): Promise<GitCommit> {
    const commits = await this.getLog({ maxCount: 1, branch: ref });
    if (commits.length === 0) {
      throw new Error(`Commit not found: ${ref}`);
    }
    return commits[0];
  }

  // ==========================================================================
  // Branches
  // ==========================================================================

  async getBranches(options: {
    includeRemotes?: boolean;
    all?: boolean;
  } = {}): Promise<GitBranch[]> {
    const args = ['branch', '-v', '--format=%(refname:short)%09%(upstream:short)%09%(HEAD)%09%(objectname:short)%09%(committerdate:iso)'];

    if (options.all) args.push('-a');
    else if (options.includeRemotes) args.push('-r');

    const { stdout } = await this.runCommand(args);
    return parseGitBranches(stdout);
  }

  async getCurrentBranch(): Promise<string> {
    const { stdout } = await this.runCommand(['rev-parse', '--abbrev-ref', 'HEAD']);
    return stdout.trim();
  }

  async createBranch(name: string, startPoint?: string): Promise<void> {
    const args = ['branch', name];
    if (startPoint) args.push(startPoint);
    await this.runCommand(args);
    this.emit('branchCreated', name);
  }

  async deleteBranch(name: string, force: boolean = false): Promise<void> {
    await this.runCommand(['branch', force ? '-D' : '-d', name]);
    this.emit('branchDeleted', name);
  }

  async renameBranch(oldName: string, newName: string): Promise<void> {
    await this.runCommand(['branch', '-m', oldName, newName]);
    this.emit('branchRenamed', { oldName, newName });
  }

  async checkout(ref: string, options: {
    createBranch?: boolean;
    force?: boolean;
  } = {}): Promise<void> {
    const args = ['checkout'];
    if (options.createBranch) args.push('-b');
    if (options.force) args.push('-f');
    args.push(ref);

    await this.runCommand(args);
    this.emit('checkout', ref);
  }

  // ==========================================================================
  // Remotes
  // ==========================================================================

  async getRemotes(): Promise<GitRemote[]> {
    const { stdout } = await this.runCommand(['remote', '-v']);
    return parseGitRemotes(stdout);
  }

  async addRemote(name: string, url: string): Promise<void> {
    await this.runCommand(['remote', 'add', name, url]);
    this.emit('remoteAdded', { name, url });
  }

  async removeRemote(name: string): Promise<void> {
    await this.runCommand(['remote', 'remove', name]);
    this.emit('remoteRemoved', name);
  }

  async setRemoteUrl(name: string, url: string): Promise<void> {
    await this.runCommand(['remote', 'set-url', name, url]);
    this.emit('remoteUpdated', { name, url });
  }

  // ==========================================================================
  // Push/Pull/Fetch
  // ==========================================================================

  async fetch(options: {
    remote?: string;
    prune?: boolean;
    all?: boolean;
    tags?: boolean;
  } = {}): Promise<void> {
    const args = ['fetch'];

    if (options.all) args.push('--all');
    if (options.prune) args.push('--prune');
    if (options.tags) args.push('--tags');
    if (options.remote && !options.all) args.push(options.remote);

    await this.runCommand(args, { timeout: 60000 });
    this.emit('fetched', options);
  }

  async pull(options: {
    remote?: string;
    branch?: string;
    rebase?: boolean;
    ff?: 'only' | 'no' | boolean;
  } = {}): Promise<void> {
    const args = ['pull'];

    if (options.rebase) args.push('--rebase');
    if (options.ff === 'only') args.push('--ff-only');
    else if (options.ff === 'no') args.push('--no-ff');
    if (options.remote) args.push(options.remote);
    if (options.branch) args.push(options.branch);

    await this.runCommand(args, { timeout: 120000 });
    this.emit('pulled', options);
  }

  async push(options: {
    remote?: string;
    branch?: string;
    force?: boolean;
    setUpstream?: boolean;
    tags?: boolean;
  } = {}): Promise<void> {
    const args = ['push'];

    if (options.force) args.push('--force-with-lease');
    if (options.setUpstream) args.push('-u');
    if (options.tags) args.push('--tags');
    if (options.remote) args.push(options.remote);
    if (options.branch) args.push(options.branch);

    await this.runCommand(args, { timeout: 120000 });
    this.emit('pushed', options);
  }

  // ==========================================================================
  // Merge & Rebase
  // ==========================================================================

  async merge(branch: string, options: {
    noCommit?: boolean;
    squash?: boolean;
    message?: string;
    abort?: boolean;
  } = {}): Promise<void> {
    if (options.abort) {
      await this.runCommand(['merge', '--abort']);
      this.emit('mergeAborted');
      return;
    }

    const args = ['merge'];

    if (options.noCommit) args.push('--no-commit');
    if (options.squash) args.push('--squash');
    if (options.message) args.push('-m', options.message);
    args.push(branch);

    await this.runCommand(args);
    this.emit('merged', branch);
  }

  async rebase(options: {
    onto?: string;
    branch?: string;
    interactive?: boolean;
    continue?: boolean;
    skip?: boolean;
    abort?: boolean;
  } = {}): Promise<void> {
    const args = ['rebase'];

    if (options.continue) {
      await this.runCommand(['rebase', '--continue']);
      return;
    }
    if (options.skip) {
      await this.runCommand(['rebase', '--skip']);
      return;
    }
    if (options.abort) {
      await this.runCommand(['rebase', '--abort']);
      this.emit('rebaseAborted');
      return;
    }

    if (options.interactive) args.push('-i');
    if (options.onto) args.push('--onto', options.onto);
    if (options.branch) args.push(options.branch);

    await this.runCommand(args);
    this.emit('rebased', options);
  }

  // ==========================================================================
  // Stash
  // ==========================================================================

  async getStashes(): Promise<GitStash[]> {
    const { stdout } = await this.runCommand(['stash', 'list', '--format=%gd%n%s%n%aI']);
    return parseGitStashes(stdout);
  }

  async stash(message?: string, options: {
    includeUntracked?: boolean;
    keepIndex?: boolean;
  } = {}): Promise<void> {
    const args = ['stash', 'push'];

    if (message) args.push('-m', message);
    if (options.includeUntracked) args.push('-u');
    if (options.keepIndex) args.push('--keep-index');

    await this.runCommand(args);
    this.emit('stashed', message);
  }

  async stashPop(index: number = 0): Promise<void> {
    await this.runCommand(['stash', 'pop', `stash@{${index}}`]);
    this.emit('stashPopped', index);
  }

  async stashApply(index: number = 0): Promise<void> {
    await this.runCommand(['stash', 'apply', `stash@{${index}}`]);
    this.emit('stashApplied', index);
  }

  async stashDrop(index: number = 0): Promise<void> {
    await this.runCommand(['stash', 'drop', `stash@{${index}}`]);
    this.emit('stashDropped', index);
  }

  async stashClear(): Promise<void> {
    await this.runCommand(['stash', 'clear']);
    this.emit('stashCleared');
  }

  // ==========================================================================
  // Diff
  // ==========================================================================

  async getDiff(options: {
    staged?: boolean;
    commit1?: string;
    commit2?: string;
    path?: string;
  } = {}): Promise<GitDiff[]> {
    const args = ['diff', '--numstat', '--unified=3'];

    if (options.staged) args.push('--staged');
    if (options.commit1) args.push(options.commit1);
    if (options.commit2) args.push(options.commit2);
    if (options.path) args.push('--', options.path);

    const { stdout: numstat } = await this.runCommand(args);

    args[1] = '--unified=3';
    args.splice(2, 1);
    const { stdout: fullDiff } = await this.runCommand(args);

    return parseGitDiff(numstat, fullDiff);
  }

  // ==========================================================================
  // Blame
  // ==========================================================================

  async blame(filePath: string, options: {
    startLine?: number;
    endLine?: number;
  } = {}): Promise<GitBlame[]> {
    const args = ['blame', '--porcelain'];

    if (options.startLine && options.endLine) {
      args.push(`-L${options.startLine},${options.endLine}`);
    }

    args.push('--', filePath);

    const { stdout } = await this.runCommand(args);
    return parseGitBlame(stdout);
  }

  // ==========================================================================
  // Tags
  // ==========================================================================

  async getTags(): Promise<GitTag[]> {
    const { stdout } = await this.runCommand([
      'tag',
      '-l',
      '--format=%(refname:short)%09%(objectname:short)%09%(subject)',
    ]);

    return parseGitTags(stdout);
  }

  async createTag(name: string, options: {
    message?: string;
    commit?: string;
    annotated?: boolean;
  } = {}): Promise<void> {
    const args = ['tag'];

    if (options.annotated || options.message) {
      args.push('-a', name);
      if (options.message) args.push('-m', options.message);
    } else {
      args.push(name);
    }

    if (options.commit) args.push(options.commit);

    await this.runCommand(args);
    this.emit('tagCreated', name);
  }

  async deleteTag(name: string, remote?: string): Promise<void> {
    await this.runCommand(['tag', '-d', name]);
    if (remote) {
      await this.runCommand(['push', remote, `:refs/tags/${name}`]);
    }
    this.emit('tagDeleted', name);
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  cancel(): void {
    this.runner.cancel();
  }

  destroy(): void {
    this.cancel();
    this.removeAllListeners();
  }
}

// ============================================================================
// Factory
// ============================================================================

const gitServices: Map<string, GitService> = new Map();

export function getGitService(repoPath: string): GitService {
  const normalizedPath = path.resolve(repoPath);

  if (!gitServices.has(normalizedPath)) {
    const service = new GitService(normalizedPath);
    gitServices.set(normalizedPath, service);
  }

  return gitServices.get(normalizedPath)!;
}

export function destroyGitService(repoPath: string): void {
  const normalizedPath = path.resolve(repoPath);
  const service = gitServices.get(normalizedPath);

  if (service) {
    service.destroy();
    gitServices.delete(normalizedPath);
  }
}

export default GitService;
