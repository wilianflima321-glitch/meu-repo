/**
 * Aethel Engine - Git Service Backend
 * 
 * Serviço Git real usando execução de comandos git nativos.
 * Features:
 * - Status, diff, log
 * - Branch management
 * - Commit, push, pull, fetch
 * - Merge, rebase
 * - Stash management
 * - Remote management
 * - Blame, annotations
 */

import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface GitStatus {
  branch: string;
  upstream?: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  unstaged: GitFileChange[];
  untracked: string[];
  conflicted: GitFileChange[];
  stashCount: number;
}

export interface GitFileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmerged';
  oldPath?: string;
  additions?: number;
  deletions?: number;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail: string;
  date: Date;
  message: string;
  body?: string;
  parents: string[];
  refs?: string[];
}

export interface GitBranch {
  name: string;
  current: boolean;
  remote?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  lastCommit?: string;
  lastCommitDate?: Date;
}

export interface GitRemote {
  name: string;
  fetchUrl: string;
  pushUrl: string;
}

export interface GitStash {
  index: number;
  message: string;
  branch: string;
  date: Date;
}

export interface GitBlame {
  lineNumber: number;
  commit: string;
  author: string;
  date: Date;
  line: string;
}

export interface GitDiff {
  oldPath: string;
  newPath: string;
  hunks: GitDiffHunk[];
  additions: number;
  deletions: number;
  binary: boolean;
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

export interface GitConfig {
  user?: {
    name?: string;
    email?: string;
  };
  core?: Record<string, string>;
  remote?: Record<string, { url: string; fetch: string }>;
}

// ============================================================================
// Git Service
// ============================================================================

export class GitService extends EventEmitter {
  private repoPath: string;
  private gitPath: string;
  private runningProcesses: Map<string, ChildProcess> = new Map();
  
  constructor(repoPath: string, gitPath: string = 'git') {
    super();
    this.repoPath = path.resolve(repoPath);
    this.gitPath = gitPath;
  }
  
  // ==========================================================================
  // Core Command Execution
  // ==========================================================================
  
  private async runCommand(
    args: string[],
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<{ stdout: string; stderr: string }> {
    const cwd = options.cwd || this.repoPath;
    const timeout = options.timeout || 30000;
    
    return new Promise((resolve, reject) => {
      const proc = spawn(this.gitPath, args, {
        cwd,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      
      const id = `git_${Date.now()}`;
      this.runningProcesses.set(id, proc);
      
      let stdout = '';
      let stderr = '';
      
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Git command timed out: git ${args.join(' ')}`));
      }, timeout);
      
      proc.on('close', (code) => {
        clearTimeout(timer);
        this.runningProcesses.delete(id);
        
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(stderr || `Git command failed with code ${code}`));
        }
      });
      
      proc.on('error', (error) => {
        clearTimeout(timer);
        this.runningProcesses.delete(id);
        reject(error);
      });
    });
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
    const config: GitConfig = {};
    
    stdout.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (!key) return;
      
      const parts = key.split('.');
      if (parts[0] === 'user') {
        config.user = config.user || {};
        (config.user as any)[parts[1]] = value;
      } else if (parts[0] === 'core') {
        config.core = config.core || {};
        config.core[parts[1]] = value;
      } else if (parts[0] === 'remote') {
        config.remote = config.remote || {};
        config.remote[parts[1]] = config.remote[parts[1]] || { url: '', fetch: '' };
        (config.remote[parts[1]] as any)[parts[2]] = value;
      }
    });
    
    return config;
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
    
    const status: GitStatus = {
      branch: branchResult.stdout.trim() || 'HEAD',
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      stashCount: stashResult.stdout.split('\n').filter(Boolean).length,
    };
    
    const lines = statusResult.stdout.split('\n');
    
    for (const line of lines) {
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
        // Changed entry
        const parts = line.split(' ');
        const xy = parts[1];
        const filepath = parts.slice(8).join(' ');
        
        const statusMap: Record<string, GitFileChange['status']> = {
          'M': 'modified',
          'A': 'added',
          'D': 'deleted',
          'R': 'renamed',
          'C': 'copied',
          'U': 'unmerged',
        };
        
        if (xy[0] !== '.') {
          status.staged.push({
            path: filepath,
            status: statusMap[xy[0]] || 'modified',
          });
        }
        
        if (xy[1] !== '.') {
          status.unstaged.push({
            path: filepath,
            status: statusMap[xy[1]] || 'modified',
          });
        }
      } else if (line.startsWith('u ')) {
        // Unmerged entry
        const filepath = line.split(' ').slice(10).join(' ');
        status.conflicted.push({
          path: filepath,
          status: 'unmerged',
        });
      } else if (line.startsWith('? ')) {
        // Untracked
        status.untracked.push(line.substring(2));
      }
    }
    
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
    const commits: GitCommit[] = [];
    
    const entries = stdout.split('---COMMIT---').filter(Boolean);
    
    for (const entry of entries) {
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
    const remotes: Map<string, GitRemote> = new Map();
    
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      
      const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
      if (match) {
        const [, name, url, type] = match;
        
        if (!remotes.has(name)) {
          remotes.set(name, { name, fetchUrl: '', pushUrl: '' });
        }
        
        const remote = remotes.get(name)!;
        if (type === 'fetch') remote.fetchUrl = url;
        else remote.pushUrl = url;
      }
    }
    
    return Array.from(remotes.values());
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
    const stashes: GitStash[] = [];
    
    const lines = stdout.split('\n').filter(Boolean);
    for (let i = 0; i < lines.length; i += 3) {
      const indexMatch = lines[i].match(/stash@\{(\d+)\}/);
      if (indexMatch) {
        const messageMatch = lines[i + 1]?.match(/On (.+?): (.+)/);
        stashes.push({
          index: parseInt(indexMatch[1], 10),
          message: messageMatch ? messageMatch[2] : lines[i + 1] || '',
          branch: messageMatch ? messageMatch[1] : '',
          date: new Date(lines[i + 2] || Date.now()),
        });
      }
    }
    
    return stashes;
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
    
    // Get full diff
    args[1] = '--unified=3';
    args.splice(2, 1); // Remove --numstat
    const { stdout: fullDiff } = await this.runCommand(args);
    
    const diffs: GitDiff[] = [];
    const stats = new Map<string, { additions: number; deletions: number }>();
    
    // Parse numstat
    for (const line of numstat.split('\n')) {
      if (!line) continue;
      const [add, del, path] = line.split('\t');
      stats.set(path, {
        additions: add === '-' ? 0 : parseInt(add, 10),
        deletions: del === '-' ? 0 : parseInt(del, 10),
      });
    }
    
    // Parse full diff
    const diffBlocks = fullDiff.split(/^diff --git/m).filter(Boolean);
    
    for (const block of diffBlocks) {
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
        // Parse hunks
        const hunkMatches = block.matchAll(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@[^\n]*/g);
        let lastIndex = 0;
        
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
          
          diff.hunks.push(hunk);
        }
      }
      
      diffs.push(diff);
    }
    
    return diffs;
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
    const blames: GitBlame[] = [];
    const lines = stdout.split('\n');
    
    let currentCommit = '';
    let currentAuthor = '';
    let currentDate = new Date();
    let lineNumber = 0;
    
    for (const line of lines) {
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
  
  // ==========================================================================
  // Tags
  // ==========================================================================
  
  async getTags(): Promise<{ name: string; commit: string; message?: string }[]> {
    const { stdout } = await this.runCommand([
      'tag',
      '-l',
      '--format=%(refname:short)%09%(objectname:short)%09%(subject)',
    ]);
    
    return stdout.split('\n').filter(Boolean).map(line => {
      const [name, commit, message] = line.split('\t');
      return { name, commit, message: message || undefined };
    });
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
    for (const [id, proc] of this.runningProcesses) {
      proc.kill('SIGTERM');
    }
    this.runningProcesses.clear();
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
