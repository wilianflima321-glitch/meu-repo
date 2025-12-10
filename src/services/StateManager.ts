import { EventBus } from './EventBus';

export interface AppState {
  workspace: WorkspaceState;
  editor: EditorState;
  layout: LayoutState;
  settings: SettingsState;
  git: GitState;
  debug: DebugState;
  terminal: TerminalState;
  extensions: ExtensionState;
}

export interface WorkspaceState {
  currentWorkspace: string | null;
  recentWorkspaces: string[];
  openFolders: string[];
}

export interface EditorState {
  openEditors: EditorInfo[];
  activeEditorId: string | null;
  editorGroups: EditorGroupInfo[];
}

export interface EditorInfo {
  id: string;
  filePath: string;
  content: string;
  isDirty: boolean;
  isPinned: boolean;
  cursorPosition: { line: number; column: number };
  scrollPosition: number;
  viewState: any;
}

export interface EditorGroupInfo {
  id: string;
  editorIds: string[];
  activeEditorId: string | null;
}

export interface LayoutState {
  sidebarVisible: boolean;
  sidebarWidth: number;
  panelVisible: boolean;
  panelHeight: number;
  activityBarVisible: boolean;
  statusBarVisible: boolean;
  activeView: string;
  activePanel: string;
}

export interface SettingsState {
  theme: string;
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  insertSpaces: boolean;
  autoSave: string;
  [key: string]: any;
}

export interface GitState {
  repositories: string[];
  currentBranch: string | null;
  stagedFiles: string[];
  modifiedFiles: string[];
}

export interface DebugState {
  configurations: DebugConfiguration[];
  activeConfiguration: string | null;
  breakpoints: BreakpointInfo[];
  watchExpressions: string[];
}

export interface DebugConfiguration {
  name: string;
  type: string;
  request: string;
  program: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

export interface BreakpointInfo {
  id: string;
  filePath: string;
  line: number;
  enabled: boolean;
  condition?: string;
  hitCondition?: string;
  logMessage?: string;
}

export interface TerminalState {
  terminals: TerminalInfo[];
  activeTerminalId: string | null;
}

export interface TerminalInfo {
  id: string;
  name: string;
  cwd: string;
  history: string[];
}

export interface ExtensionState {
  installed: string[];
  enabled: string[];
  disabled: string[];
}

export class StateManager {
  private static instance: StateManager;
  private state: AppState;
  private eventBus: EventBus;
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'ide-state';
  private readonly SAVE_DELAY = 1000; // 1 second debounce

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.state = this.getDefaultState();
    this.loadState();
    this.setupEventListeners();
  }

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  private getDefaultState(): AppState {
    return {
      workspace: {
        currentWorkspace: null,
        recentWorkspaces: [],
        openFolders: []
      },
      editor: {
        openEditors: [],
        activeEditorId: null,
        editorGroups: [
          {
            id: 'main',
            editorIds: [],
            activeEditorId: null
          }
        ]
      },
      layout: {
        sidebarVisible: true,
        sidebarWidth: 300,
        panelVisible: true,
        panelHeight: 300,
        activityBarVisible: true,
        statusBarVisible: true,
        activeView: 'explorer',
        activePanel: 'terminal'
      },
      settings: {
        theme: 'dark',
        fontSize: 14,
        fontFamily: 'Consolas, monospace',
        tabSize: 4,
        insertSpaces: true,
        autoSave: 'afterDelay'
      },
      git: {
        repositories: [],
        currentBranch: null,
        stagedFiles: [],
        modifiedFiles: []
      },
      debug: {
        configurations: [],
        activeConfiguration: null,
        breakpoints: [],
        watchExpressions: []
      },
      terminal: {
        terminals: [],
        activeTerminalId: null
      },
      extensions: {
        installed: [],
        enabled: [],
        disabled: []
      }
    };
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = this.mergeStates(this.getDefaultState(), parsed);
      }
    } catch (error) {
      console.error('Failed to load state:', error);
      this.state = this.getDefaultState();
    }
  }

  private mergeStates(defaultState: AppState, savedState: Partial<AppState>): AppState {
    return {
      workspace: { ...defaultState.workspace, ...savedState.workspace },
      editor: { ...defaultState.editor, ...savedState.editor },
      layout: { ...defaultState.layout, ...savedState.layout },
      settings: { ...defaultState.settings, ...savedState.settings },
      git: { ...defaultState.git, ...savedState.git },
      debug: { ...defaultState.debug, ...savedState.debug },
      terminal: { ...defaultState.terminal, ...savedState.terminal },
      extensions: { ...defaultState.extensions, ...savedState.extensions }
    };
  }

  private saveState(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      try {
        const serialized = JSON.stringify(this.state);
        localStorage.setItem(this.STORAGE_KEY, serialized);
        this.eventBus.emit('state:saved', { timestamp: Date.now() });
      } catch (error) {
        console.error('Failed to save state:', error);
        this.eventBus.emit('state:saveFailed', { error });
      }
    }, this.SAVE_DELAY);
  }

  private setupEventListeners(): void {
    // Workspace events
    this.eventBus.subscribe('workspace:opened', (data: { path: string }) => {
      this.updateWorkspaceState({
        currentWorkspace: data.path,
        recentWorkspaces: [data.path, ...this.state.workspace.recentWorkspaces.filter(w => w !== data.path)].slice(0, 10)
      });
    });

    // Editor events
    this.eventBus.subscribe('editor:opened', (data: { editor: EditorInfo }) => {
      this.updateEditorState({
        openEditors: [...this.state.editor.openEditors, data.editor],
        activeEditorId: data.editor.id
      });
    });

    this.eventBus.subscribe('editor:closed', (data: { editorId: string }) => {
      this.updateEditorState({
        openEditors: this.state.editor.openEditors.filter(e => e.id !== data.editorId)
      });
    });

    this.eventBus.subscribe('editor:changed', (data: { editorId: string; content?: string }) => {
      const editors = this.state.editor.openEditors.map(e => 
        e.id === data.editorId ? { ...e, content: data.content || e.content, isDirty: true } : e
      );
      this.updateEditorState({ openEditors: editors });
    });

    // Layout events
    this.eventBus.subscribe('layout:changed', (data: Partial<LayoutState>) => {
      this.updateLayoutState(data);
    });

    // Settings events
    this.eventBus.subscribe('settings:changed', (data: { key: string; value: any }) => {
      this.updateSettingsState({ [data.key]: data.value });
    });

    // Git events
    this.eventBus.subscribe('git:statusChanged', (data: Partial<GitState>) => {
      this.updateGitState(data);
    });

    // Debug events
    this.eventBus.subscribe('breakpoint:added', (data: { breakpoint: BreakpointInfo }) => {
      this.updateDebugState({
        breakpoints: [...this.state.debug.breakpoints, data.breakpoint]
      });
    });

    this.eventBus.subscribe('breakpoint:removed', (data: { breakpointId: string }) => {
      this.updateDebugState({
        breakpoints: this.state.debug.breakpoints.filter(b => b.id !== data.breakpointId)
      });
    });

    // Terminal events
    this.eventBus.subscribe('terminal:created', (data: { terminal: TerminalInfo }) => {
      this.updateTerminalState({
        terminals: [...this.state.terminal.terminals, data.terminal],
        activeTerminalId: data.terminal.id
      });
    });

    this.eventBus.subscribe('terminal:closed', (data: { terminalId: string }) => {
      this.updateTerminalState({
        terminals: this.state.terminal.terminals.filter(t => t.id !== data.terminalId)
      });
    });

    // Extension events
    this.eventBus.subscribe('extension:installed', (data: { extensionId: string }) => {
      this.updateExtensionState({
        installed: [...this.state.extensions.installed, data.extensionId],
        enabled: [...this.state.extensions.enabled, data.extensionId]
      });
    });

    this.eventBus.subscribe('extension:uninstalled', (data: { extensionId: string }) => {
      this.updateExtensionState({
        installed: this.state.extensions.installed.filter(e => e !== data.extensionId),
        enabled: this.state.extensions.enabled.filter(e => e !== data.extensionId),
        disabled: this.state.extensions.disabled.filter(e => e !== data.extensionId)
      });
    });
  }

  // Public API
  public getState(): AppState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public getWorkspaceState(): WorkspaceState {
    return { ...this.state.workspace };
  }

  public getEditorState(): EditorState {
    return JSON.parse(JSON.stringify(this.state.editor));
  }

  public getLayoutState(): LayoutState {
    return { ...this.state.layout };
  }

  public getSettingsState(): SettingsState {
    return { ...this.state.settings };
  }

  public getGitState(): GitState {
    return { ...this.state.git };
  }

  public getDebugState(): DebugState {
    return JSON.parse(JSON.stringify(this.state.debug));
  }

  public getTerminalState(): TerminalState {
    return JSON.parse(JSON.stringify(this.state.terminal));
  }

  public getExtensionState(): ExtensionState {
    return { ...this.state.extensions };
  }

  public updateWorkspaceState(updates: Partial<WorkspaceState>): void {
    this.state.workspace = { ...this.state.workspace, ...updates };
    this.saveState();
    this.eventBus.emit('state:workspaceUpdated', { workspace: this.state.workspace });
  }

  public updateEditorState(updates: Partial<EditorState>): void {
    this.state.editor = { ...this.state.editor, ...updates };
    this.saveState();
    this.eventBus.emit('state:editorUpdated', { editor: this.state.editor });
  }

  public updateLayoutState(updates: Partial<LayoutState>): void {
    this.state.layout = { ...this.state.layout, ...updates };
    this.saveState();
    this.eventBus.emit('state:layoutUpdated', { layout: this.state.layout });
  }

  public updateSettingsState(updates: Partial<SettingsState>): void {
    this.state.settings = { ...this.state.settings, ...updates };
    this.saveState();
    this.eventBus.emit('state:settingsUpdated', { settings: this.state.settings });
  }

  public updateGitState(updates: Partial<GitState>): void {
    this.state.git = { ...this.state.git, ...updates };
    this.saveState();
    this.eventBus.emit('state:gitUpdated', { git: this.state.git });
  }

  public updateDebugState(updates: Partial<DebugState>): void {
    this.state.debug = { ...this.state.debug, ...updates };
    this.saveState();
    this.eventBus.emit('state:debugUpdated', { debug: this.state.debug });
  }

  public updateTerminalState(updates: Partial<TerminalState>): void {
    this.state.terminal = { ...this.state.terminal, ...updates };
    this.saveState();
    this.eventBus.emit('state:terminalUpdated', { terminal: this.state.terminal });
  }

  public updateExtensionState(updates: Partial<ExtensionState>): void {
    this.state.extensions = { ...this.state.extensions, ...updates };
    this.saveState();
    this.eventBus.emit('state:extensionsUpdated', { extensions: this.state.extensions });
  }

  public resetState(): void {
    this.state = this.getDefaultState();
    this.saveState();
    this.eventBus.emit('state:reset', {});
  }

  public exportState(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public importState(stateJson: string): boolean {
    try {
      const imported = JSON.parse(stateJson);
      this.state = this.mergeStates(this.getDefaultState(), imported);
      this.saveState();
      this.eventBus.emit('state:imported', {});
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }

  public clearState(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.state = this.getDefaultState();
      this.eventBus.emit('state:cleared', {});
    } catch (error) {
      console.error('Failed to clear state:', error);
    }
  }
}
