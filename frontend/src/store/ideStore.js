import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export const useIDEStore = create(
  immer((set, get) => ({
    // Projects
    projects: [],
    currentProject: null,
    
    // Files
    files: [],
    fileTree: null,
    openFiles: [],
    activeFileId: null,
    
    // Editor
    editorContent: '',
    cursorPosition: { line: 1, column: 1 },
    
    // UI State
    sidebarCollapsed: false,
    activePanel: 'explorer', // explorer, search, git, extensions, settings
    bottomPanelOpen: true,
    bottomPanelTab: 'terminal', // terminal, output, problems, debug
    rightPanelOpen: false,
    rightPanelTab: 'ai', // ai, animation, profiling
    
    // Theme
    theme: 'dark',
    settings: {
      fontSize: 14,
      fontFamily: 'JetBrains Mono, monospace',
      tabSize: 2,
      wordWrap: false,
      minimap: true,
      lineNumbers: true,
      autoSave: true
    },
    
    // Terminal
    terminalHistory: [],
    terminalOutput: [],
    
    // Git
    gitStatus: null,
    gitBranch: 'main',
    gitChanges: [],
    
    // AI Assistant
    aiConversation: [],
    aiLoading: false,
    
    // Animation
    animations: [],
    currentAnimation: null,
    animationPlaying: false,
    animationTime: 0,
    
    // Profiling
    profilingSessions: [],
    currentProfilingSession: null,
    profilingActive: false,
    
    // Debug
    debugSession: null,
    breakpoints: [],
    callStack: [],
    variables: [],
    
    // Search
    searchQuery: '',
    searchResults: [],
    
    // Extensions
    extensions: [],
    
    // Themes
    themes: [],
    
    // Snippets
    snippets: [],
    
    // Actions
    setProjects: (projects) => set((state) => { state.projects = projects; }),
    setCurrentProject: (project) => set((state) => { state.currentProject = project; }),
    
    setFiles: (files) => set((state) => { state.files = files; }),
    setFileTree: (tree) => set((state) => { state.fileTree = tree; }),
    
    openFile: (file) => set((state) => {
      if (!state.openFiles.find(f => f.id === file.id)) {
        state.openFiles.push(file);
      }
      state.activeFileId = file.id;
      state.editorContent = file.content || '';
    }),
    
    closeFile: (fileId) => set((state) => {
      state.openFiles = state.openFiles.filter(f => f.id !== fileId);
      if (state.activeFileId === fileId) {
        state.activeFileId = state.openFiles[0]?.id || null;
        state.editorContent = state.openFiles[0]?.content || '';
      }
    }),
    
    setActiveFile: (fileId) => set((state) => {
      state.activeFileId = fileId;
      const file = state.openFiles.find(f => f.id === fileId);
      if (file) {
        state.editorContent = file.content || '';
      }
    }),
    
    updateFileContent: (fileId, content) => set((state) => {
      const fileIndex = state.openFiles.findIndex(f => f.id === fileId);
      if (fileIndex !== -1) {
        state.openFiles[fileIndex].content = content;
        state.openFiles[fileIndex].modified = true;
      }
      if (state.activeFileId === fileId) {
        state.editorContent = content;
      }
    }),
    
    markFileSaved: (fileId) => set((state) => {
      const fileIndex = state.openFiles.findIndex(f => f.id === fileId);
      if (fileIndex !== -1) {
        state.openFiles[fileIndex].modified = false;
      }
    }),
    
    // UI Actions
    toggleSidebar: () => set((state) => { state.sidebarCollapsed = !state.sidebarCollapsed; }),
    setActivePanel: (panel) => set((state) => { state.activePanel = panel; }),
    toggleBottomPanel: () => set((state) => { state.bottomPanelOpen = !state.bottomPanelOpen; }),
    setBottomPanelTab: (tab) => set((state) => { state.bottomPanelTab = tab; }),
    toggleRightPanel: () => set((state) => { state.rightPanelOpen = !state.rightPanelOpen; }),
    setRightPanelTab: (tab) => set((state) => { state.rightPanelTab = tab; state.rightPanelOpen = true; }),
    
    // Theme
    setTheme: (theme) => set((state) => { state.theme = theme; }),
    updateSettings: (settings) => set((state) => { state.settings = { ...state.settings, ...settings }; }),
    
    // Terminal
    addTerminalOutput: (output) => set((state) => { state.terminalOutput.push(output); }),
    clearTerminal: () => set((state) => { state.terminalOutput = []; }),
    addTerminalHistory: (cmd) => set((state) => { state.terminalHistory.push(cmd); }),
    
    // Git
    setGitStatus: (status) => set((state) => { state.gitStatus = status; }),
    setGitBranch: (branch) => set((state) => { state.gitBranch = branch; }),
    setGitChanges: (changes) => set((state) => { state.gitChanges = changes; }),
    
    // AI
    addAIMessage: (message) => set((state) => { state.aiConversation.push(message); }),
    setAILoading: (loading) => set((state) => { state.aiLoading = loading; }),
    clearAIConversation: () => set((state) => { state.aiConversation = []; }),
    
    // Animation
    setAnimations: (animations) => set((state) => { state.animations = animations; }),
    setCurrentAnimation: (animation) => set((state) => { state.currentAnimation = animation; }),
    setAnimationPlaying: (playing) => set((state) => { state.animationPlaying = playing; }),
    setAnimationTime: (time) => set((state) => { state.animationTime = time; }),
    
    // Profiling
    setProfilingSessions: (sessions) => set((state) => { state.profilingSessions = sessions; }),
    setCurrentProfilingSession: (session) => set((state) => { state.currentProfilingSession = session; }),
    setProfilingActive: (active) => set((state) => { state.profilingActive = active; }),
    
    // Debug
    setDebugSession: (session) => set((state) => { state.debugSession = session; }),
    setBreakpoints: (breakpoints) => set((state) => { state.breakpoints = breakpoints; }),
    addBreakpoint: (bp) => set((state) => { state.breakpoints.push(bp); }),
    removeBreakpoint: (line) => set((state) => { 
      state.breakpoints = state.breakpoints.filter(b => b.line !== line); 
    }),
    setCallStack: (stack) => set((state) => { state.callStack = stack; }),
    setVariables: (vars) => set((state) => { state.variables = vars; }),
    
    // Search
    setSearchQuery: (query) => set((state) => { state.searchQuery = query; }),
    setSearchResults: (results) => set((state) => { state.searchResults = results; }),
    
    // Extensions
    setExtensions: (extensions) => set((state) => { state.extensions = extensions; }),
    toggleExtension: (id) => set((state) => {
      const ext = state.extensions.find(e => e.id === id);
      if (ext) ext.enabled = !ext.enabled;
    }),
    
    // Themes
    setThemes: (themes) => set((state) => { state.themes = themes; }),
    
    // Snippets
    setSnippets: (snippets) => set((state) => { state.snippets = snippets; }),
    
    // Cursor position
    setCursorPosition: (pos) => set((state) => { state.cursorPosition = pos; }),
  }))
);
