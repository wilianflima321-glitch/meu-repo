// Shared Git service contracts kept separate from the runtime class.

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
