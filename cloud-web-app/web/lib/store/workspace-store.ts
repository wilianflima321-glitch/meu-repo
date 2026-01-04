/**
 * Aethel IDE - Global Workspace Store (Zustand)
 * 
 * Gerenciamento centralizado de estado para a IDE completa.
 * Similar ao modelo usado pelo VS Code internamente.
 */

import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// ============================================================================
// TYPES
// ============================================================================

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

interface WorkspaceStore {
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

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const defaultLayout: LayoutState = {
  sidebarPosition: 'left',
  sidebarVisible: true,
  sidebarWidth: 280,
  sidebarActiveTab: 'explorer',
  panelVisible: true,
  panelHeight: 250,
  panelActiveTab: 'terminal',
  panelMaximized: false,
  activityBarVisible: true,
  statusBarVisible: true,
  menuBarVisible: true,
  zenMode: false,
  focusMode: false,
};

const defaultSearchState: SearchState = {
  query: '',
  isRegex: false,
  isCaseSensitive: false,
  isWholeWord: false,
  includePattern: '',
  excludePattern: '**/node_modules/**',
  results: [],
  isSearching: false,
  replaceValue: '',
};

const defaultDebugState: DebugState = {
  status: 'idle',
  currentSession: null,
  breakpoints: new Map(),
  callStack: [],
  variables: [],
  watches: [],
  console: [],
};

const defaultGitState: GitState = {
  currentBranch: 'main',
  branches: [],
  remotes: [],
  stagedFiles: [],
  unstagedFiles: [],
  untrackedFiles: [],
  stashes: [],
  lastCommit: '',
  isLoading: false,
  hasConflicts: false,
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getFileNameFromPath = (path: string): string => {
  return path.split(/[/\\]/).pop() || 'untitled';
};

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript',
    py: 'python', rs: 'rust', go: 'go',
    java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
    rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
    lua: 'lua', json: 'json', yaml: 'yaml', yml: 'yaml',
    md: 'markdown', html: 'html', css: 'css', scss: 'scss',
    sql: 'sql', sh: 'shell', bash: 'shell', ps1: 'powershell',
    xml: 'xml', toml: 'toml',
  };
  return languageMap[ext || ''] || 'plaintext';
};

export const useWorkspaceStore = create<WorkspaceStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          // Initial State
          workspacePath: null,
          workspaceName: 'Aethel Workspace',
          recentWorkspaces: [],
          
          editorGroups: [{
            id: 'main',
            tabs: [],
            activeTabId: null,
            orientation: 'horizontal',
          }],
          activeGroupId: 'main',
          
          layout: defaultLayout,
          fileTree: null,
          selectedPaths: [],
          search: defaultSearchState,
          debug: defaultDebugState,
          git: defaultGitState,
          problems: [],
          notifications: [],
          terminalSessions: [],
          activeTerminalId: null,
          settings: {},
          enabledExtensions: [],
          
          // Workspace Actions
          setWorkspace: (path, name) => set(state => {
            state.workspacePath = path;
            state.workspaceName = name;
          }),
          
          addRecentWorkspace: (path) => set(state => {
            const filtered = state.recentWorkspaces.filter(p => p !== path);
            state.recentWorkspaces = [path, ...filtered].slice(0, 10);
          }),
          
          // Editor Actions
          openFile: (path, options = {}) => set(state => {
            const { preview = true, type = 'code' } = options;
            const group = state.editorGroups.find(g => g.id === state.activeGroupId);
            if (!group) return;
            
            // Check if file already open
            const existingTab = group.tabs.find(t => t.path === path);
            if (existingTab) {
              group.activeTabId = existingTab.id;
              // If clicking on preview, make it permanent
              if (existingTab.preview) {
                existingTab.preview = false;
              }
              return;
            }
            
            // Replace preview tab if exists
            const previewIndex = group.tabs.findIndex(t => t.preview && !t.pinned);
            
            const newTab: EditorTab = {
              id: generateId(),
              title: getFileNameFromPath(path),
              type,
              path,
              dirty: false,
              pinned: false,
              preview: preview,
              language: getLanguageFromPath(path),
              encoding: 'UTF-8',
              lineEnding: 'LF',
            };
            
            if (previewIndex >= 0) {
              group.tabs[previewIndex] = newTab;
            } else {
              group.tabs.push(newTab);
            }
            
            group.activeTabId = newTab.id;
          }),
          
          closeFile: (tabId, groupId) => set(state => {
            const group = state.editorGroups.find(g => g.id === (groupId || state.activeGroupId));
            if (!group) return;
            
            const index = group.tabs.findIndex(t => t.id === tabId);
            if (index === -1) return;
            
            group.tabs.splice(index, 1);
            
            // Update active tab
            if (group.activeTabId === tabId) {
              const newIndex = Math.min(index, group.tabs.length - 1);
              group.activeTabId = group.tabs[newIndex]?.id || null;
            }
          }),
          
          closeAllFiles: (groupId) => set(state => {
            const group = state.editorGroups.find(g => g.id === (groupId || state.activeGroupId));
            if (!group) return;
            
            // Keep pinned tabs
            group.tabs = group.tabs.filter(t => t.pinned);
            group.activeTabId = group.tabs[0]?.id || null;
          }),
          
          closeOtherFiles: (tabId, groupId) => set(state => {
            const group = state.editorGroups.find(g => g.id === (groupId || state.activeGroupId));
            if (!group) return;
            
            group.tabs = group.tabs.filter(t => t.id === tabId || t.pinned);
            group.activeTabId = tabId;
          }),
          
          setActiveTab: (tabId, groupId) => set(state => {
            const group = state.editorGroups.find(g => g.id === (groupId || state.activeGroupId));
            if (!group) return;
            
            const tab = group.tabs.find(t => t.id === tabId);
            if (tab) {
              group.activeTabId = tabId;
              // Make preview permanent on double-click
              if (tab.preview) {
                tab.preview = false;
              }
            }
          }),
          
          setTabDirty: (tabId, dirty) => set(state => {
            for (const group of state.editorGroups) {
              const tab = group.tabs.find(t => t.id === tabId);
              if (tab) {
                tab.dirty = dirty;
                break;
              }
            }
          }),
          
          pinTab: (tabId) => set(state => {
            for (const group of state.editorGroups) {
              const tab = group.tabs.find(t => t.id === tabId);
              if (tab) {
                tab.pinned = true;
                tab.preview = false;
                // Move pinned tabs to front
                const index = group.tabs.indexOf(tab);
                const pinnedCount = group.tabs.filter(t => t.pinned && t !== tab).length;
                group.tabs.splice(index, 1);
                group.tabs.splice(pinnedCount, 0, tab);
                break;
              }
            }
          }),
          
          unpinTab: (tabId) => set(state => {
            for (const group of state.editorGroups) {
              const tab = group.tabs.find(t => t.id === tabId);
              if (tab) {
                tab.pinned = false;
                break;
              }
            }
          }),
          
          moveTab: (tabId, fromGroupId, toGroupId, index) => set(state => {
            const fromGroup = state.editorGroups.find(g => g.id === fromGroupId);
            const toGroup = state.editorGroups.find(g => g.id === toGroupId);
            if (!fromGroup || !toGroup) return;
            
            const tabIndex = fromGroup.tabs.findIndex(t => t.id === tabId);
            if (tabIndex === -1) return;
            
            const [tab] = fromGroup.tabs.splice(tabIndex, 1);
            toGroup.tabs.splice(index, 0, tab);
            toGroup.activeTabId = tab.id;
            
            if (fromGroup.activeTabId === tabId) {
              fromGroup.activeTabId = fromGroup.tabs[0]?.id || null;
            }
          }),
          
          saveTabViewState: (tabId, viewState) => set(state => {
            for (const group of state.editorGroups) {
              const tab = group.tabs.find(t => t.id === tabId);
              if (tab) {
                tab.viewState = viewState;
                break;
              }
            }
          }),
          
          // Split Editor Actions
          splitEditorRight: () => set(state => {
            const activeGroup = state.editorGroups.find(g => g.id === state.activeGroupId);
            if (!activeGroup || !activeGroup.activeTabId) return;
            
            const activeTab = activeGroup.tabs.find(t => t.id === activeGroup.activeTabId);
            if (!activeTab) return;
            
            const newGroup: EditorGroup = {
              id: generateId(),
              tabs: [{
                ...activeTab,
                id: generateId(),
                dirty: false,
              }],
              activeTabId: null,
              orientation: 'horizontal',
            };
            newGroup.activeTabId = newGroup.tabs[0].id;
            
            state.editorGroups.push(newGroup);
            state.activeGroupId = newGroup.id;
          }),
          
          splitEditorDown: () => set(state => {
            const activeGroup = state.editorGroups.find(g => g.id === state.activeGroupId);
            if (!activeGroup || !activeGroup.activeTabId) return;
            
            const activeTab = activeGroup.tabs.find(t => t.id === activeGroup.activeTabId);
            if (!activeTab) return;
            
            const newGroup: EditorGroup = {
              id: generateId(),
              tabs: [{
                ...activeTab,
                id: generateId(),
                dirty: false,
              }],
              activeTabId: null,
              orientation: 'vertical',
            };
            newGroup.activeTabId = newGroup.tabs[0].id;
            
            state.editorGroups.push(newGroup);
            state.activeGroupId = newGroup.id;
          }),
          
          closeEditorGroup: (groupId) => set(state => {
            if (state.editorGroups.length <= 1) return; // Keep at least one group
            
            const index = state.editorGroups.findIndex(g => g.id === groupId);
            if (index === -1) return;
            
            state.editorGroups.splice(index, 1);
            
            if (state.activeGroupId === groupId) {
              state.activeGroupId = state.editorGroups[Math.max(0, index - 1)].id;
            }
          }),
          
          setActiveGroup: (groupId) => set(state => {
            if (state.editorGroups.some(g => g.id === groupId)) {
              state.activeGroupId = groupId;
            }
          }),
          
          focusNextGroup: () => set(state => {
            const currentIndex = state.editorGroups.findIndex(g => g.id === state.activeGroupId);
            const nextIndex = (currentIndex + 1) % state.editorGroups.length;
            state.activeGroupId = state.editorGroups[nextIndex].id;
          }),
          
          focusPreviousGroup: () => set(state => {
            const currentIndex = state.editorGroups.findIndex(g => g.id === state.activeGroupId);
            const prevIndex = (currentIndex - 1 + state.editorGroups.length) % state.editorGroups.length;
            state.activeGroupId = state.editorGroups[prevIndex].id;
          }),
          
          // Layout Actions
          toggleSidebar: () => set(state => {
            state.layout.sidebarVisible = !state.layout.sidebarVisible;
          }),
          
          togglePanel: () => set(state => {
            state.layout.panelVisible = !state.layout.panelVisible;
          }),
          
          setSidebarTab: (tab) => set(state => {
            state.layout.sidebarActiveTab = tab;
            if (!state.layout.sidebarVisible) {
              state.layout.sidebarVisible = true;
            }
          }),
          
          setPanelTab: (tab) => set(state => {
            state.layout.panelActiveTab = tab;
            if (!state.layout.panelVisible) {
              state.layout.panelVisible = true;
            }
          }),
          
          setSidebarWidth: (width) => set(state => {
            state.layout.sidebarWidth = Math.max(200, Math.min(600, width));
          }),
          
          setPanelHeight: (height) => set(state => {
            state.layout.panelHeight = Math.max(100, Math.min(600, height));
          }),
          
          toggleZenMode: () => set(state => {
            state.layout.zenMode = !state.layout.zenMode;
            if (state.layout.zenMode) {
              state.layout.sidebarVisible = false;
              state.layout.panelVisible = false;
              state.layout.activityBarVisible = false;
              state.layout.statusBarVisible = false;
            } else {
              state.layout.sidebarVisible = true;
              state.layout.panelVisible = true;
              state.layout.activityBarVisible = true;
              state.layout.statusBarVisible = true;
            }
          }),
          
          toggleFocusMode: () => set(state => {
            state.layout.focusMode = !state.layout.focusMode;
          }),
          
          maximizePanel: () => set(state => {
            state.layout.panelMaximized = !state.layout.panelMaximized;
          }),
          
          // File Explorer Actions
          setFileTree: (tree) => set(state => {
            state.fileTree = tree;
          }),
          
          toggleDirectory: (path) => set(state => {
            const findAndToggle = (entry: FileSystemEntry): boolean => {
              if (entry.path === path && entry.type === 'directory') {
                entry.expanded = !entry.expanded;
                return true;
              }
              if (entry.children) {
                for (const child of entry.children) {
                  if (findAndToggle(child)) return true;
                }
              }
              return false;
            };
            
            if (state.fileTree) {
              findAndToggle(state.fileTree);
            }
          }),
          
          selectFile: (path, multi = false) => set(state => {
            if (multi) {
              const index = state.selectedPaths.indexOf(path);
              if (index >= 0) {
                state.selectedPaths.splice(index, 1);
              } else {
                state.selectedPaths.push(path);
              }
            } else {
              state.selectedPaths = [path];
            }
          }),
          
          refreshFileTree: async () => {
            // TODO: Implement file tree refresh via API
          },
          
          // Search Actions
          setSearchQuery: (query) => set(state => {
            state.search.query = query;
          }),
          
          setSearchOptions: (options) => set(state => {
            Object.assign(state.search, options);
          }),
          
          executeSearch: async () => {
            // TODO: Implement search via API
            set(state => { state.search.isSearching = true; });
            // Simulate search
            setTimeout(() => {
              set(state => { state.search.isSearching = false; });
            }, 500);
          },
          
          clearSearch: () => set(state => {
            state.search = { ...defaultSearchState };
          }),
          
          // Debug Actions
          startDebugging: async (_configuration) => {
            set(state => {
              state.debug.status = 'running';
              state.debug.currentSession = generateId();
            });
          },
          
          stopDebugging: () => set(state => {
            state.debug.status = 'stopped';
            state.debug.currentSession = null;
            state.debug.callStack = [];
            state.debug.variables = [];
          }),
          
          pauseDebugging: () => set(state => {
            state.debug.status = 'paused';
          }),
          
          continueDebugging: () => set(state => {
            state.debug.status = 'running';
          }),
          
          stepOver: () => { /* TODO: Implement */ },
          stepInto: () => { /* TODO: Implement */ },
          stepOut: () => { /* TODO: Implement */ },
          
          toggleBreakpoint: (path, line) => set(state => {
            const breakpoints = state.debug.breakpoints.get(path) || [];
            const index = breakpoints.indexOf(line);
            if (index >= 0) {
              breakpoints.splice(index, 1);
            } else {
              breakpoints.push(line);
              breakpoints.sort((a, b) => a - b);
            }
            state.debug.breakpoints.set(path, breakpoints);
          }),
          
          addWatch: (expression) => set(state => {
            state.debug.watches.push({
              id: generateId(),
              expression,
              value: '<not evaluated>',
            });
          }),
          
          removeWatch: (id) => set(state => {
            const index = state.debug.watches.findIndex(w => w.id === id);
            if (index >= 0) {
              state.debug.watches.splice(index, 1);
            }
          }),
          
          clearDebugConsole: () => set(state => {
            state.debug.console = [];
          }),
          
          // Git Actions
          refreshGitStatus: async () => {
            set(state => { state.git.isLoading = true; });
            // TODO: Implement via git service
            setTimeout(() => {
              set(state => { state.git.isLoading = false; });
            }, 300);
          },
          
          stageFile: (path) => set(state => {
            const index = state.git.unstagedFiles.indexOf(path);
            if (index >= 0) {
              state.git.unstagedFiles.splice(index, 1);
              state.git.stagedFiles.push(path);
            }
            const untrackedIndex = state.git.untrackedFiles.indexOf(path);
            if (untrackedIndex >= 0) {
              state.git.untrackedFiles.splice(untrackedIndex, 1);
              state.git.stagedFiles.push(path);
            }
          }),
          
          unstageFile: (path) => set(state => {
            const index = state.git.stagedFiles.indexOf(path);
            if (index >= 0) {
              state.git.stagedFiles.splice(index, 1);
              state.git.unstagedFiles.push(path);
            }
          }),
          
          stageAll: () => set(state => {
            state.git.stagedFiles.push(...state.git.unstagedFiles, ...state.git.untrackedFiles);
            state.git.unstagedFiles = [];
            state.git.untrackedFiles = [];
          }),
          
          unstageAll: () => set(state => {
            state.git.unstagedFiles.push(...state.git.stagedFiles);
            state.git.stagedFiles = [];
          }),
          
          commit: async (_message) => {
            // TODO: Implement via git service
          },
          
          checkout: async (_branch) => {
            // TODO: Implement via git service
          },
          
          createBranch: async (_name) => {
            // TODO: Implement via git service
          },
          
          // Problems Actions
          setProblems: (problems) => set(state => {
            state.problems = problems;
          }),
          
          addProblem: (problem) => set(state => {
            state.problems.push(problem);
          }),
          
          removeProblem: (id) => set(state => {
            const index = state.problems.findIndex(p => p.id === id);
            if (index >= 0) {
              state.problems.splice(index, 1);
            }
          }),
          
          clearProblems: (source) => set(state => {
            if (source) {
              state.problems = state.problems.filter(p => p.source !== source);
            } else {
              state.problems = [];
            }
          }),
          
          // Notifications Actions
          showNotification: (notification) => {
            const id = generateId();
            set(state => {
              state.notifications.push({
                ...notification,
                id,
                timestamp: Date.now(),
              });
            });
            return id;
          },
          
          dismissNotification: (id) => set(state => {
            const index = state.notifications.findIndex(n => n.id === id);
            if (index >= 0) {
              state.notifications.splice(index, 1);
            }
          }),
          
          clearNotifications: () => set(state => {
            state.notifications = state.notifications.filter(n => n.persistent);
          }),
          
          updateNotificationProgress: (id, progress) => set(state => {
            const notification = state.notifications.find(n => n.id === id);
            if (notification) {
              notification.progress = progress;
            }
          }),
          
          // Terminal Actions
          createTerminal: () => {
            const id = generateId();
            set(state => {
              state.terminalSessions.push(id);
              state.activeTerminalId = id;
            });
            return id;
          },
          
          closeTerminal: (id) => set(state => {
            const index = state.terminalSessions.indexOf(id);
            if (index >= 0) {
              state.terminalSessions.splice(index, 1);
              if (state.activeTerminalId === id) {
                state.activeTerminalId = state.terminalSessions[0] || null;
              }
            }
          }),
          
          setActiveTerminal: (id) => set(state => {
            if (state.terminalSessions.includes(id)) {
              state.activeTerminalId = id;
            }
          }),
          
          // Settings Actions
          updateSetting: (key, value) => set(state => {
            state.settings[key] = value;
          }),
          
          resetSettings: () => set(state => {
            state.settings = {};
          }),
        })),
        {
          name: 'aethel-workspace',
          partialize: (state) => ({
            recentWorkspaces: state.recentWorkspaces,
            layout: state.layout,
            settings: state.settings,
            enabledExtensions: state.enabledExtensions,
          }),
        }
      )
    ),
    { name: 'AethelWorkspace' }
  )
);

// ============================================================================
// SELECTORS (for performance optimization)
// ============================================================================

export const useActiveGroup = () => useWorkspaceStore(state => 
  state.editorGroups.find(g => g.id === state.activeGroupId)
);

export const useActiveTab = () => useWorkspaceStore(state => {
  const group = state.editorGroups.find(g => g.id === state.activeGroupId);
  return group?.tabs.find(t => t.id === group.activeTabId);
});

export const useLayout = () => useWorkspaceStore(state => state.layout);

export const useProblems = () => useWorkspaceStore(state => state.problems);

export const useGit = () => useWorkspaceStore(state => state.git);

export const useDebug = () => useWorkspaceStore(state => state.debug);

export const useNotifications = () => useWorkspaceStore(state => state.notifications);

export const useSearch = () => useWorkspaceStore(state => state.search);
