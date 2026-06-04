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

export interface GitTag {
  name: string;
  commit: string;
  message?: string;
}
