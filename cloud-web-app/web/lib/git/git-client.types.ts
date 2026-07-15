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

export type RawGitCommit = Omit<GitCommit, 'date'> & { date: string | number | Date };

export type RawGitBlame = {
  line: number;
  hash: string;
  author: string;
  date: string | number | Date;
  content: string;
};

export type RawGitStash = {
  index: number;
  message: string;
  date: string | number | Date;
};
