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

export interface GitRepository {
  path: string;
  name: string;
  currentBranch: string;
  remotes: GitRemote[];
  isInitialized: boolean;
}

export interface GitRemote {
  name: string;
  url: string;
  fetchUrl?: string;
  pushUrl?: string;
}

export interface GitBranch {
  name: string;
  isRemote: boolean;
  isHead: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
  commit: string;
}

export interface GitStatus {
  staged: GitFileStatus[];
  unstaged: GitFileStatus[];
  untracked: string[];
  conflicted: GitFileStatus[];
  stashCount: number;
}

export interface GitFileStatus {
  path: string;
  oldPath?: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'unmerged';
  staged: boolean;
  isSubmodule: boolean;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: GitAuthor;
  committer: GitAuthor;
  date: Date;
  message: string;
  body?: string;
  parents: string[];
  refs: string[];
}

export interface GitAuthor {
  name: string;
  email: string;
}

export interface GitDiff {
  oldFile: string;
  newFile: string;
  hunks: GitHunk[];
  additions: number;
  deletions: number;
  binary: boolean;
}

export interface GitHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  header: string;
  lines: GitDiffLine[];
}

export interface GitDiffLine {
  type: 'context' | 'addition' | 'deletion';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface GitBlame {
  lines: GitBlameLine[];
}

export interface GitBlameLine {
  hash: string;
  author: string;
  date: Date;
  lineNumber: number;
  content: string;
  originalLine: number;
}

export interface GitStash {
  index: number;
  message: string;
  branch: string;
  date: Date;
}

export interface GitTag {
  name: string;
  hash: string;
  message?: string;
  tagger?: GitAuthor;
  date?: Date;
  isAnnotated: boolean;
}

export interface GitMergeResult {
  success: boolean;
  conflicts?: string[];
  commitHash?: string;
}

// ============================================================================
// GIT SERVICE
// ============================================================================

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
    const lines = output.split('\n').filter(Boolean);
    
    const status: GitStatus = {
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      stashCount: await this.getStashCount(),
    };
    
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      
      if (line.startsWith('1') || line.startsWith('2')) {
        const parts = line.split(' ');
        const xy = parts[1];
        const path = parts.slice(8).join(' ');
        
        const stagedStatus = xy[0];
        const unstagedStatus = xy[1];
        
        if (stagedStatus !== '.') {
          status.staged.push({
            path,
            status: this.parseStatusChar(stagedStatus),
            staged: true,
            isSubmodule: false,
          });
        }
        
        if (unstagedStatus !== '.') {
          status.unstaged.push({
            path,
            status: this.parseStatusChar(unstagedStatus),
            staged: false,
            isSubmodule: false,
          });
        }
      } else if (line.startsWith('?')) {
        status.untracked.push(line.slice(2));
      } else if (line.startsWith('u')) {
        const path = line.split(' ').slice(10).join(' ');
        status.conflicted.push({
          path,
          status: 'unmerged',
          staged: false,
          isSubmodule: false,
        });
      }
    }
    
    return status;
  }
  
  private parseStatusChar(char: string): GitFileStatus['status'] {
    switch (char) {
      case 'A': return 'added';
      case 'M': return 'modified';
      case 'D': return 'deleted';
      case 'R': return 'renamed';
      case 'C': return 'copied';
      case 'U': return 'unmerged';
      default: return 'modified';
    }
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
    
    const output = await this.execGit(args);
    const entries = output.split('\0').filter(Boolean);
    
    return entries.map(entry => {
      const parts = entry.split('|');
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
      };
    });
  }
  
  async show(ref: string): Promise<GitCommit & { diff: GitDiff[] }> {
    const log = await this.execGit(['show', '--format=%H|%h|%an|%ae|%cn|%ce|%aI|%s|%b|%P|%D', '-z', '--stat', ref]);
    
    const [formatPart] = log.split('\0');
    const parts = formatPart.split('|');
    
    const commit: GitCommit = {
      hash: parts[0],
      shortHash: parts[1],
      author: { name: parts[2], email: parts[3] },
      committer: { name: parts[4], email: parts[5] },
      date: new Date(parts[6]),
      message: parts[7],
      body: parts[8] || undefined,
      parents: parts[9] ? parts[9].split(' ') : [],
      refs: parts[10] ? parts[10].split(', ') : [],
    };
    
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
    
    const branches: GitBranch[] = [];
    
    for (const line of output.split('\n').filter(Boolean)) {
      const [name, commit, upstream, track, head] = line.split('|');
      
      const aheadMatch = track.match(/ahead (\d+)/);
      const behindMatch = track.match(/behind (\d+)/);
      
      branches.push({
        name,
        isRemote: name.includes('/'),
        isHead: head === '*',
        upstream: upstream || undefined,
        ahead: aheadMatch ? parseInt(aheadMatch[1]) : 0,
        behind: behindMatch ? parseInt(behindMatch[1]) : 0,
        commit,
      });
    }
    
    return branches;
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
    } catch (error: any) {
      if (error.message.includes('CONFLICT')) {
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
    const output = await this.execGit(['remote', '-v']);
    const remotes: Map<string, GitRemote> = new Map();
    
    for (const line of output.split('\n').filter(Boolean)) {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((\w+)\)$/);
      if (match) {
        const [, name, url, type] = match;
        let remote = remotes.get(name);
        if (!remote) {
          remote = { name, url };
          remotes.set(name, remote);
        }
        if (type === 'fetch') remote.fetchUrl = url;
        if (type === 'push') remote.pushUrl = url;
      }
    }
    
    return Array.from(remotes.values());
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
    
    const output = await this.execGit(args);
    return this.parseDiff(output);
  }
  
  async getStagedDiff(file?: string): Promise<GitDiff[]> {
    const args = ['diff', '--cached', '--no-color'];
    if (file) args.push('--', file);
    
    const output = await this.execGit(args);
    return this.parseDiff(output);
  }
  
  private parseDiff(diffOutput: string): GitDiff[] {
    const diffs: GitDiff[] = [];
    const fileDiffs = diffOutput.split('diff --git').slice(1);
    
    for (const fileDiff of fileDiffs) {
      const lines = fileDiff.split('\n');
      const headerMatch = lines[0].match(/a\/(.+) b\/(.+)/);
      
      if (!headerMatch) continue;
      
      const diff: GitDiff = {
        oldFile: headerMatch[1],
        newFile: headerMatch[2],
        hunks: [],
        additions: 0,
        deletions: 0,
        binary: fileDiff.includes('Binary files'),
      };
      
      if (!diff.binary) {
        let currentHunk: GitHunk | null = null;
        let oldLine = 0;
        let newLine = 0;
        
        for (const line of lines) {
          const hunkMatch = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/);
          
          if (hunkMatch) {
            currentHunk = {
              oldStart: parseInt(hunkMatch[1]),
              oldLines: parseInt(hunkMatch[2]) || 1,
              newStart: parseInt(hunkMatch[3]),
              newLines: parseInt(hunkMatch[4]) || 1,
              header: hunkMatch[5].trim(),
              lines: [],
            };
            diff.hunks.push(currentHunk);
            oldLine = currentHunk.oldStart;
            newLine = currentHunk.newStart;
          } else if (currentHunk) {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              currentHunk.lines.push({
                type: 'addition',
                content: line.slice(1),
                newLineNumber: newLine++,
              });
              diff.additions++;
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              currentHunk.lines.push({
                type: 'deletion',
                content: line.slice(1),
                oldLineNumber: oldLine++,
              });
              diff.deletions++;
            } else if (line.startsWith(' ')) {
              currentHunk.lines.push({
                type: 'context',
                content: line.slice(1),
                oldLineNumber: oldLine++,
                newLineNumber: newLine++,
              });
            }
          }
        }
      }
      
      diffs.push(diff);
    }
    
    return diffs;
  }
  
  // ==========================================================================
  // BLAME
  // ==========================================================================
  
  async blame(file: string): Promise<GitBlame> {
    const output = await this.execGit(['blame', '--porcelain', file]);
    const lines = output.split('\n');
    const result: GitBlame = { lines: [] };
    
    let currentHash = '';
    let currentAuthor = '';
    let currentDate = new Date();
    let lineNumber = 0;
    let originalLine = 0;
    
    for (const line of lines) {
      const hashMatch = line.match(/^([a-f0-9]{40}) (\d+) (\d+)/);
      if (hashMatch) {
        currentHash = hashMatch[1];
        originalLine = parseInt(hashMatch[2]);
        lineNumber = parseInt(hashMatch[3]);
        continue;
      }
      
      if (line.startsWith('author ')) {
        currentAuthor = line.slice(7);
      } else if (line.startsWith('author-time ')) {
        currentDate = new Date(parseInt(line.slice(12)) * 1000);
      } else if (line.startsWith('\t')) {
        result.lines.push({
          hash: currentHash.slice(0, 8),
          author: currentAuthor,
          date: currentDate,
          lineNumber,
          content: line.slice(1),
          originalLine,
        });
      }
    }
    
    return result;
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
    const output = await this.execGit(['stash', 'list', '--format=%gd|%s|%aI']);
    const stashes: GitStash[] = [];
    
    for (const line of output.split('\n').filter(Boolean)) {
      const [ref, message, date] = line.split('|');
      const indexMatch = ref.match(/stash@\{(\d+)\}/);
      const branchMatch = message.match(/On (\S+):/);
      
      stashes.push({
        index: indexMatch ? parseInt(indexMatch[1]) : stashes.length,
        message: message.replace(/^On \S+: /, ''),
        branch: branchMatch ? branchMatch[1] : '',
        date: new Date(date),
      });
    }
    
    return stashes;
  }
  
  private async getStashCount(): Promise<number> {
    const output = await this.execGit(['stash', 'list']);
    return output.split('\n').filter(Boolean).length;
  }
  
  // ==========================================================================
  // TAGS
  // ==========================================================================
  
  async getTags(): Promise<GitTag[]> {
    const output = await this.execGit(['tag', '-l', '--format=%(refname:short)|%(objectname:short)|%(contents:subject)|%(taggername)|%(taggeremail)|%(creatordate:iso)|%(objecttype)']);
    const tags: GitTag[] = [];
    
    for (const line of output.split('\n').filter(Boolean)) {
      const [name, hash, message, taggerName, taggerEmail, date, type] = line.split('|');
      
      tags.push({
        name,
        hash,
        message: message || undefined,
        tagger: taggerName ? { name: taggerName, email: taggerEmail.replace(/[<>]/g, '') } : undefined,
        date: date ? new Date(date) : undefined,
        isAnnotated: type === 'tag',
      });
    }
    
    return tags;
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
