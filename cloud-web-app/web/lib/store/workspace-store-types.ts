/**
 * Shared type contracts for workspace store state and actions.
 */

export type EditorTabType = 
  | 'code' 
  | 'blueprint' 
  | 'level' 
  | 'material' 
  | 'particles' 
  | 'animation' 
  | 'landscape' 
  | 'settings' 
  | 'keybindings'
  | 'diff'
  | 'preview'
  | 'markdown';

export interface EditorTab {
  id: string;
  title: string;
  type: EditorTabType;
  path?: string;
  dirty: boolean;
  pinned: boolean;
  preview: boolean; // Preview mode (single-click opens)
  viewState?: any; // Monaco editor view state
  language?: string;
  encoding?: string;
  lineEnding?: 'LF' | 'CRLF';
}

export interface EditorGroup {
  id: string;
  tabs: EditorTab[];
  activeTabId: string | null;
  orientation: 'horizontal' | 'vertical';
}

export interface PanelState {
  visible: boolean;
  size: number; // percentage or pixels
  minimized: boolean;
}

export interface LayoutState {
  sidebarPosition: 'left' | 'right';
  sidebarVisible: boolean;
  sidebarWidth: number;
  sidebarActiveTab: string;
  
  panelVisible: boolean;
  panelHeight: number;
  panelActiveTab: string;
  panelMaximized: boolean;
  
  activityBarVisible: boolean;
  statusBarVisible: boolean;
  menuBarVisible: boolean;
  
  zenMode: boolean;
  focusMode: boolean;
}

export interface SearchState {
  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  isWholeWord: boolean;
  includePattern: string;
  excludePattern: string;
  results: SearchResult[];
  isSearching: boolean;
  replaceValue: string;
}

export interface SearchResult {
  filePath: string;
  matches: Array<{
    line: number;
    column: number;
    text: string;
    matchLength: number;
  }>;
}

export interface FileSystemEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystemEntry[];
  expanded?: boolean;
  loading?: boolean;
}

export interface DebugState {
  status: 'idle' | 'running' | 'paused' | 'stopped';
  currentSession: string | null;
  breakpoints: Map<string, number[]>; // path -> lines
  callStack: StackFrame[];
  variables: Variable[];
  watches: WatchExpression[];
  console: DebugConsoleEntry[];
}

export interface StackFrame {
  id: number;
  name: string;
  source: string;
  line: number;
  column: number;
}

export interface Variable {
  name: string;
  value: string;
  type: string;
  variablesReference: number;
  children?: Variable[];
}

export interface WatchExpression {
  id: string;
  expression: string;
  value: string;
  error?: string;
}

export interface DebugConsoleEntry {
  type: 'log' | 'warn' | 'error' | 'info' | 'input' | 'output';
  text: string;
  timestamp: number;
}

export interface GitState {
  currentBranch: string;
  branches: string[];
  remotes: string[];
  stagedFiles: string[];
  unstagedFiles: string[];
  untrackedFiles: string[];
  stashes: GitStash[];
  lastCommit: string;
  isLoading: boolean;
  hasConflicts: boolean;
}

export interface GitStash {
  index: number;
  message: string;
  date: string;
}

export interface NotificationItem {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message?: string;
  progress?: number;
  actions?: NotificationAction[];
  persistent?: boolean;
  timestamp: number;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

export interface Problem {
  id: string;
  filePath: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  source: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  code?: string;
  quickFixes?: QuickFix[];
}

export interface QuickFix {
  title: string;
  edit: {
    filePath: string;
    range: { start: { line: number; column: number }; end: { line: number; column: number } };
    newText: string;
  };
}

// ============================================================================
// WORKSPACE STORE
// ============================================================================

export interface WorkspaceStore {
  // Workspace
  workspacePath: string | null;
  workspaceName: string;
  recentWorkspaces: string[];
  
  // Editor Groups (split editor support)
  editorGroups: EditorGroup[];
  activeGroupId: string;
  
  // Layout
  layout: LayoutState;
  
  // File Explorer
  fileTree: FileSystemEntry | null;
  selectedPaths: string[];
  
  // Search
  search: SearchState;
  
  // Debug
  debug: DebugState;
  
  // Git
  git: GitState;
  
  // Problems
  problems: Problem[];
  
  // Notifications
  notifications: NotificationItem[];
  
  // Terminal sessions
  terminalSessions: string[];
  activeTerminalId: string | null;
  
  // Settings
  settings: Record<string, any>;
  
  // Extensions
  enabledExtensions: string[];
  
  // Actions - Workspace
  setWorkspace: (path: string, name: string) => void;
  addRecentWorkspace: (path: string) => void;
  
  // Actions - Editor
  openFile: (path: string, options?: { preview?: boolean; type?: EditorTabType }) => void;
  closeFile: (tabId: string, groupId?: string) => void;
  closeAllFiles: (groupId?: string) => void;
  closeOtherFiles: (tabId: string, groupId?: string) => void;
  setActiveTab: (tabId: string, groupId?: string) => void;
  setTabDirty: (tabId: string, dirty: boolean) => void;
  pinTab: (tabId: string) => void;
  unpinTab: (tabId: string) => void;
  moveTab: (tabId: string, fromGroupId: string, toGroupId: string, index: number) => void;
  saveTabViewState: (tabId: string, viewState: any) => void;
  
  // Actions - Editor Groups (Split Editor)
  splitEditorRight: () => void;
  splitEditorDown: () => void;
  closeEditorGroup: (groupId: string) => void;
  setActiveGroup: (groupId: string) => void;
  focusNextGroup: () => void;
  focusPreviousGroup: () => void;
  
  // Actions - Layout
  toggleSidebar: () => void;
  togglePanel: () => void;
  setSidebarTab: (tab: string) => void;
  setPanelTab: (tab: string) => void;
  setSidebarWidth: (width: number) => void;
  setPanelHeight: (height: number) => void;
  toggleZenMode: () => void;
  toggleFocusMode: () => void;
  maximizePanel: () => void;
  
  // Actions - File Explorer
  setFileTree: (tree: FileSystemEntry) => void;
  toggleDirectory: (path: string) => void;
  selectFile: (path: string, multi?: boolean) => void;
  refreshFileTree: () => Promise<void>;
  
  // Actions - Search
  setSearchQuery: (query: string) => void;
  setSearchOptions: (options: Partial<SearchState>) => void;
  executeSearch: () => Promise<void>;
  clearSearch: () => void;
  
  // Actions - Debug
  startDebugging: (configuration: any) => Promise<void>;
  stopDebugging: () => void;
  pauseDebugging: () => void;
  continueDebugging: () => void;
  stepOver: () => void;
  stepInto: () => void;
  stepOut: () => void;
  toggleBreakpoint: (path: string, line: number) => void;
  addWatch: (expression: string) => void;
  removeWatch: (id: string) => void;
  clearDebugConsole: () => void;
  
  // Actions - Git
  refreshGitStatus: () => Promise<void>;
  stageFile: (path: string) => void;
  unstageFile: (path: string) => void;
  stageAll: () => void;
  unstageAll: () => void;
  commit: (message: string) => Promise<void>;
  checkout: (branch: string) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  
  // Actions - Problems
  setProblems: (problems: Problem[]) => void;
  addProblem: (problem: Problem) => void;
  removeProblem: (id: string) => void;
  clearProblems: (source?: string) => void;
  
  // Actions - Notifications
  showNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => string;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  updateNotificationProgress: (id: string, progress: number) => void;
  
  // Actions - Terminal
  createTerminal: () => string;
  closeTerminal: (id: string) => void;
  setActiveTerminal: (id: string) => void;
  
  // Actions - Settings
  updateSetting: (key: string, value: any) => void;
  resetSettings: () => void;
}
