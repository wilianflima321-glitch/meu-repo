'use client';

/**
 * Aethel Engine - Command Palette
 * 
 * Professional command palette like VS Code with:
 * - Ctrl+Shift+P: Commands
 * - Ctrl+P: Quick Open (files)
 * - Fuzzy search with highlighting
 * - Keyboard navigation
 * - Extensible command system
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  createContext,
  useContext,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import {
  Search,
  File,
  Folder,
  Terminal,
  Settings,
  GitBranch,
  Play,
  Bug,
  Palette,
  Keyboard,
  Layout,
  Code,
  FileText,
  FolderOpen,
  RefreshCw,
  Save,
  Undo,
  Redo,
  Copy,
  Clipboard,
  Scissors,
  X,
  ChevronRight,
  Command,
  Hash,
  AtSign,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type CommandCategory = 
  | 'file' 
  | 'edit' 
  | 'view' 
  | 'go' 
  | 'run' 
  | 'terminal' 
  | 'git' 
  | 'ai' 
  | 'settings'
  | 'debug'
  | 'extension';

export type PaletteMode = 'commands' | 'files' | 'symbols' | 'lines';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: CommandCategory;
  icon?: LucideIcon;
  shortcut?: string;
  action: () => void | Promise<void>;
  when?: () => boolean;
  keywords?: string[];
}

export interface FileItem {
  path: string;
  name: string;
  type: 'file' | 'folder';
  icon?: LucideIcon;
  modified?: boolean;
  gitStatus?: 'M' | 'A' | 'D' | 'U' | 'C' | 'R';
}

export interface SymbolItem {
  name: string;
  kind: string;
  range: { startLine: number; endLine: number };
  icon?: LucideIcon;
  containerName?: string;
}

interface CommandPaletteContextType {
  isOpen: boolean;
  mode: PaletteMode;
  open: (mode?: PaletteMode) => void;
  close: () => void;
  toggle: (mode?: PaletteMode) => void;
  registerCommand: (command: CommandItem) => void;
  unregisterCommand: (id: string) => void;
  executeCommand: (id: string) => Promise<void>;
  commands: CommandItem[];
}

// ============================================================================
// Context
// ============================================================================

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null);

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return context;
}

// ============================================================================
// Default Commands
// ============================================================================

const CATEGORY_ICONS: Record<CommandCategory, LucideIcon> = {
  file: File,
  edit: Code,
  view: Layout,
  go: ChevronRight,
  run: Play,
  terminal: Terminal,
  git: GitBranch,
  ai: Sparkles,
  settings: Settings,
  debug: Bug,
  extension: Zap,
};

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  file: 'File',
  edit: 'Edit',
  view: 'View',
  go: 'Go',
  run: 'Run',
  terminal: 'Terminal',
  git: 'Git',
  ai: 'AI',
  settings: 'Settings',
  debug: 'Debug',
  extension: 'Extensions',
};

function createDefaultCommands(handlers: {
  openFile?: () => void;
  saveFile?: () => void;
  saveAll?: () => void;
  newFile?: () => void;
  newFolder?: () => void;
  closeEditor?: () => void;
  undo?: () => void;
  redo?: () => void;
  copy?: () => void;
  cut?: () => void;
  paste?: () => void;
  find?: () => void;
  replace?: () => void;
  toggleSidebar?: () => void;
  toggleTerminal?: () => void;
  toggleProblems?: () => void;
  openSettings?: () => void;
  openKeyboardShortcuts?: () => void;
  goToLine?: () => void;
  goToSymbol?: () => void;
  goToDefinition?: () => void;
  findReferences?: () => void;
  runTask?: () => void;
  startDebugging?: () => void;
  stopDebugging?: () => void;
  toggleBreakpoint?: () => void;
  newTerminal?: () => void;
  gitCommit?: () => void;
  gitPush?: () => void;
  gitPull?: () => void;
  gitBranch?: () => void;
  aiChat?: () => void;
  aiExplain?: () => void;
  aiRefactor?: () => void;
  reloadWindow?: () => void;
  changeTheme?: () => void;
}): CommandItem[] {
  return [
    // File Commands
    {
      id: 'file.open',
      label: 'Open File',
      description: 'Open a file from the workspace',
      category: 'file',
      icon: FolderOpen,
      shortcut: 'Ctrl+O',
      action: handlers.openFile || (() => {}),
      keywords: ['open', 'file', 'browse'],
    },
    {
      id: 'file.save',
      label: 'Save',
      description: 'Save the current file',
      category: 'file',
      icon: Save,
      shortcut: 'Ctrl+S',
      action: handlers.saveFile || (() => {}),
      keywords: ['save', 'write'],
    },
    {
      id: 'file.saveAll',
      label: 'Save All',
      description: 'Save all open files',
      category: 'file',
      icon: Save,
      shortcut: 'Ctrl+Shift+S',
      action: handlers.saveAll || (() => {}),
      keywords: ['save', 'all'],
    },
    {
      id: 'file.newFile',
      label: 'New File',
      description: 'Create a new file',
      category: 'file',
      icon: File,
      shortcut: 'Ctrl+N',
      action: handlers.newFile || (() => {}),
      keywords: ['new', 'create', 'file'],
    },
    {
      id: 'file.newFolder',
      label: 'New Folder',
      description: 'Create a new folder',
      category: 'file',
      icon: Folder,
      action: handlers.newFolder || (() => {}),
      keywords: ['new', 'create', 'folder', 'directory'],
    },
    {
      id: 'file.close',
      label: 'Close Editor',
      description: 'Close the current editor',
      category: 'file',
      icon: X,
      shortcut: 'Ctrl+W',
      action: handlers.closeEditor || (() => {}),
      keywords: ['close', 'editor', 'tab'],
    },

    // Edit Commands
    {
      id: 'edit.undo',
      label: 'Undo',
      description: 'Undo the last action',
      category: 'edit',
      icon: Undo,
      shortcut: 'Ctrl+Z',
      action: handlers.undo || (() => {}),
      keywords: ['undo', 'revert'],
    },
    {
      id: 'edit.redo',
      label: 'Redo',
      description: 'Redo the last undone action',
      category: 'edit',
      icon: Redo,
      shortcut: 'Ctrl+Shift+Z',
      action: handlers.redo || (() => {}),
      keywords: ['redo', 'repeat'],
    },
    {
      id: 'edit.copy',
      label: 'Copy',
      description: 'Copy selection to clipboard',
      category: 'edit',
      icon: Copy,
      shortcut: 'Ctrl+C',
      action: handlers.copy || (() => {}),
      keywords: ['copy', 'clipboard'],
    },
    {
      id: 'edit.cut',
      label: 'Cut',
      description: 'Cut selection to clipboard',
      category: 'edit',
      icon: Scissors,
      shortcut: 'Ctrl+X',
      action: handlers.cut || (() => {}),
      keywords: ['cut', 'clipboard'],
    },
    {
      id: 'edit.paste',
      label: 'Paste',
      description: 'Paste from clipboard',
      category: 'edit',
      icon: Clipboard,
      shortcut: 'Ctrl+V',
      action: handlers.paste || (() => {}),
      keywords: ['paste', 'clipboard'],
    },
    {
      id: 'edit.find',
      label: 'Find',
      description: 'Find in current file',
      category: 'edit',
      icon: Search,
      shortcut: 'Ctrl+F',
      action: handlers.find || (() => {}),
      keywords: ['find', 'search'],
    },
    {
      id: 'edit.replace',
      label: 'Find and Replace',
      description: 'Find and replace in current file',
      category: 'edit',
      icon: Search,
      shortcut: 'Ctrl+H',
      action: handlers.replace || (() => {}),
      keywords: ['find', 'replace', 'search'],
    },

    // View Commands
    {
      id: 'view.toggleSidebar',
      label: 'Toggle Sidebar',
      description: 'Show or hide the sidebar',
      category: 'view',
      icon: Layout,
      shortcut: 'Ctrl+B',
      action: handlers.toggleSidebar || (() => {}),
      keywords: ['sidebar', 'toggle', 'panel'],
    },
    {
      id: 'view.toggleTerminal',
      label: 'Toggle Terminal',
      description: 'Show or hide the terminal panel',
      category: 'view',
      icon: Terminal,
      shortcut: 'Ctrl+`',
      action: handlers.toggleTerminal || (() => {}),
      keywords: ['terminal', 'toggle', 'panel'],
    },
    {
      id: 'view.toggleProblems',
      label: 'Toggle Problems',
      description: 'Show or hide the problems panel',
      category: 'view',
      icon: Bug,
      shortcut: 'Ctrl+Shift+M',
      action: handlers.toggleProblems || (() => {}),
      keywords: ['problems', 'errors', 'warnings'],
    },

    // Go Commands
    {
      id: 'go.toLine',
      label: 'Go to Line',
      description: 'Go to a specific line number',
      category: 'go',
      icon: Hash,
      shortcut: 'Ctrl+G',
      action: handlers.goToLine || (() => {}),
      keywords: ['go', 'line', 'jump'],
    },
    {
      id: 'go.toSymbol',
      label: 'Go to Symbol',
      description: 'Go to a symbol in the current file',
      category: 'go',
      icon: AtSign,
      shortcut: 'Ctrl+Shift+O',
      action: handlers.goToSymbol || (() => {}),
      keywords: ['go', 'symbol', 'function', 'class'],
    },
    {
      id: 'go.toDefinition',
      label: 'Go to Definition',
      description: 'Go to the definition of the symbol',
      category: 'go',
      icon: ChevronRight,
      shortcut: 'F12',
      action: handlers.goToDefinition || (() => {}),
      keywords: ['go', 'definition', 'declaration'],
    },
    {
      id: 'go.findReferences',
      label: 'Find All References',
      description: 'Find all references to the symbol',
      category: 'go',
      icon: Search,
      shortcut: 'Shift+F12',
      action: handlers.findReferences || (() => {}),
      keywords: ['references', 'usages'],
    },

    // Run Commands
    {
      id: 'run.task',
      label: 'Run Task',
      description: 'Run a task from tasks.json',
      category: 'run',
      icon: Play,
      action: handlers.runTask || (() => {}),
      keywords: ['run', 'task', 'build'],
    },
    {
      id: 'run.startDebugging',
      label: 'Start Debugging',
      description: 'Start a debugging session',
      category: 'run',
      icon: Bug,
      shortcut: 'F5',
      action: handlers.startDebugging || (() => {}),
      keywords: ['debug', 'start', 'run'],
    },
    {
      id: 'run.stopDebugging',
      label: 'Stop Debugging',
      description: 'Stop the current debugging session',
      category: 'run',
      icon: X,
      shortcut: 'Shift+F5',
      action: handlers.stopDebugging || (() => {}),
      keywords: ['debug', 'stop'],
    },

    // Debug Commands
    {
      id: 'debug.toggleBreakpoint',
      label: 'Toggle Breakpoint',
      description: 'Toggle breakpoint at current line',
      category: 'debug',
      icon: Bug,
      shortcut: 'F9',
      action: handlers.toggleBreakpoint || (() => {}),
      keywords: ['breakpoint', 'toggle'],
    },

    // Terminal Commands
    {
      id: 'terminal.new',
      label: 'New Terminal',
      description: 'Create a new terminal instance',
      category: 'terminal',
      icon: Terminal,
      shortcut: 'Ctrl+Shift+`',
      action: handlers.newTerminal || (() => {}),
      keywords: ['terminal', 'new', 'shell'],
    },

    // Git Commands
    {
      id: 'git.commit',
      label: 'Commit',
      description: 'Commit staged changes',
      category: 'git',
      icon: GitBranch,
      action: handlers.gitCommit || (() => {}),
      keywords: ['git', 'commit'],
    },
    {
      id: 'git.push',
      label: 'Push',
      description: 'Push commits to remote',
      category: 'git',
      icon: GitBranch,
      action: handlers.gitPush || (() => {}),
      keywords: ['git', 'push', 'remote'],
    },
    {
      id: 'git.pull',
      label: 'Pull',
      description: 'Pull changes from remote',
      category: 'git',
      icon: GitBranch,
      action: handlers.gitPull || (() => {}),
      keywords: ['git', 'pull', 'fetch'],
    },
    {
      id: 'git.branch',
      label: 'Checkout Branch',
      description: 'Switch to a different branch',
      category: 'git',
      icon: GitBranch,
      action: handlers.gitBranch || (() => {}),
      keywords: ['git', 'branch', 'checkout'],
    },

    // AI Commands
    {
      id: 'ai.chat',
      label: 'Open AI Chat',
      description: 'Open the AI assistant chat',
      category: 'ai',
      icon: Sparkles,
      shortcut: 'Ctrl+I',
      action: handlers.aiChat || (() => {}),
      keywords: ['ai', 'chat', 'assistant', 'copilot'],
    },
    {
      id: 'ai.explain',
      label: 'AI: Explain Code',
      description: 'Ask AI to explain selected code',
      category: 'ai',
      icon: Sparkles,
      action: handlers.aiExplain || (() => {}),
      keywords: ['ai', 'explain', 'understand'],
    },
    {
      id: 'ai.refactor',
      label: 'AI: Refactor Code',
      description: 'Ask AI to refactor selected code',
      category: 'ai',
      icon: Sparkles,
      action: handlers.aiRefactor || (() => {}),
      keywords: ['ai', 'refactor', 'improve'],
    },

    // Settings Commands
    {
      id: 'settings.open',
      label: 'Open Settings',
      description: 'Open the settings editor',
      category: 'settings',
      icon: Settings,
      shortcut: 'Ctrl+,',
      action: handlers.openSettings || (() => {}),
      keywords: ['settings', 'preferences', 'config'],
    },
    {
      id: 'settings.keyboardShortcuts',
      label: 'Keyboard Shortcuts',
      description: 'Open keyboard shortcuts editor',
      category: 'settings',
      icon: Keyboard,
      shortcut: 'Ctrl+K Ctrl+S',
      action: handlers.openKeyboardShortcuts || (() => {}),
      keywords: ['keyboard', 'shortcuts', 'keybindings'],
    },
    {
      id: 'settings.changeTheme',
      label: 'Color Theme',
      description: 'Change the color theme',
      category: 'settings',
      icon: Palette,
      action: handlers.changeTheme || (() => {}),
      keywords: ['theme', 'color', 'dark', 'light'],
    },
    {
      id: 'settings.reloadWindow',
      label: 'Reload Window',
      description: 'Reload the IDE window',
      category: 'settings',
      icon: RefreshCw,
      action: handlers.reloadWindow || (() => window.location.reload()),
      keywords: ['reload', 'refresh', 'restart'],
    },
  ];
}

// ============================================================================
// Fuzzy Search
// ============================================================================

function fuzzyMatch(pattern: string, str: string): { match: boolean; score: number; indices: number[] } {
  const patternLower = pattern.toLowerCase();
  const strLower = str.toLowerCase();
  
  if (patternLower.length === 0) {
    return { match: true, score: 0, indices: [] };
  }
  
  if (patternLower.length > strLower.length) {
    return { match: false, score: 0, indices: [] };
  }
  
  const indices: number[] = [];
  let patternIdx = 0;
  let score = 0;
  let consecutiveBonus = 0;
  
  for (let i = 0; i < strLower.length && patternIdx < patternLower.length; i++) {
    if (strLower[i] === patternLower[patternIdx]) {
      indices.push(i);
      
      // Scoring
      if (i === 0) score += 10; // Start of string
      if (str[i] === str[i].toUpperCase()) score += 5; // Capital letter
      if (i > 0 && /[^a-zA-Z0-9]/.test(str[i - 1])) score += 5; // After separator
      
      // Consecutive match bonus
      if (indices.length > 1 && indices[indices.length - 2] === i - 1) {
        consecutiveBonus += 3;
      } else {
        consecutiveBonus = 0;
      }
      score += consecutiveBonus;
      
      patternIdx++;
    }
  }
  
  const match = patternIdx === patternLower.length;
  
  // Length penalty
  if (match) {
    score -= (strLower.length - patternLower.length) * 0.5;
  }
  
  return { match, score, indices };
}

function highlightMatches(text: string, indices: number[]): ReactNode {
  if (indices.length === 0) return text;
  
  const result: ReactNode[] = [];
  let lastIndex = 0;
  
  indices.forEach((idx, i) => {
    if (idx > lastIndex) {
      result.push(text.slice(lastIndex, idx));
    }
    result.push(
      <span key={i} className="text-indigo-400 font-semibold">
        {text[idx]}
      </span>
    );
    lastIndex = idx + 1;
  });
  
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }
  
  return result;
}

// ============================================================================
// Provider Component
// ============================================================================

export function CommandPaletteProvider({
  children,
  onOpenFile,
  onSaveFile,
  files = [],
}: {
  children: ReactNode;
  onOpenFile?: (path: string) => void;
  onSaveFile?: () => void;
  files?: FileItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<PaletteMode>('commands');
  const [commands, setCommands] = useState<CommandItem[]>(() => 
    createDefaultCommands({
      reloadWindow: () => window.location.reload(),
    })
  );

  const open = useCallback((newMode: PaletteMode = 'commands') => {
    setMode(newMode);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback((newMode: PaletteMode = 'commands') => {
    if (isOpen && mode === newMode) {
      setIsOpen(false);
    } else {
      setMode(newMode);
      setIsOpen(true);
    }
  }, [isOpen, mode]);

  const registerCommand = useCallback((command: CommandItem) => {
    setCommands(prev => {
      const existing = prev.findIndex(c => c.id === command.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = command;
        return updated;
      }
      return [...prev, command];
    });
  }, []);

  const unregisterCommand = useCallback((id: string) => {
    setCommands(prev => prev.filter(c => c.id !== id));
  }, []);

  const executeCommand = useCallback(async (id: string) => {
    const command = commands.find(c => c.id === id);
    if (command) {
      if (command.when && !command.when()) return;
      await command.action();
    }
  }, [commands]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Ctrl+Shift+P: Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        toggle('commands');
      }
      // Ctrl+P: Quick Open
      else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'p') {
        e.preventDefault();
        toggle('files');
      }
      // Ctrl+Shift+O: Go to Symbol
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        toggle('symbols');
      }
      // Ctrl+G: Go to Line
      else if ((e.ctrlKey || e.metaKey) && e.key === 'g') {
        e.preventDefault();
        toggle('lines');
      }
      // Escape: Close
      else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggle, close, isOpen]);

  const value: CommandPaletteContextType = {
    isOpen,
    mode,
    open,
    close,
    toggle,
    registerCommand,
    unregisterCommand,
    executeCommand,
    commands,
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      <CommandPaletteUI files={files} onOpenFile={onOpenFile} />
    </CommandPaletteContext.Provider>
  );
}

// ============================================================================
// UI Component
// ============================================================================

function CommandPaletteUI({
  files = [],
  onOpenFile,
}: {
  files?: FileItem[];
  onOpenFile?: (path: string) => void;
}) {
  const { isOpen, mode, close, commands, executeCommand } = useCommandPalette();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen, mode]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    if (mode === 'commands') {
      return commands
        .filter(cmd => !cmd.when || cmd.when())
        .map(cmd => {
          const labelMatch = fuzzyMatch(query, cmd.label);
          const descMatch = cmd.description ? fuzzyMatch(query, cmd.description) : { match: false, score: 0, indices: [] };
          const keywordMatch = cmd.keywords?.some(kw => fuzzyMatch(query, kw).match) || false;
          
          return {
            ...cmd,
            labelMatch,
            descMatch,
            match: labelMatch.match || descMatch.match || keywordMatch,
            score: Math.max(labelMatch.score, descMatch.score * 0.8),
          };
        })
        .filter(item => item.match)
        .sort((a, b) => b.score - a.score);
    }
    
    if (mode === 'files') {
      return files
        .map(file => {
          const nameMatch = fuzzyMatch(query, file.name);
          const pathMatch = fuzzyMatch(query, file.path);
          
          return {
            ...file,
            nameMatch,
            pathMatch,
            match: nameMatch.match || pathMatch.match,
            score: Math.max(nameMatch.score * 1.5, pathMatch.score),
          };
        })
        .filter(item => item.match)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);
    }
    
    return [];
  }, [mode, commands, files, query]);

  // Clamp selected index
  useEffect(() => {
    setSelectedIndex(prev => Math.min(prev, Math.max(0, filteredItems.length - 1)));
  }, [filteredItems.length]);

  // Scroll selected into view
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.children[selectedIndex] as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        handleSelect(selectedIndex);
        break;
      case 'Escape':
        e.preventDefault();
        close();
        break;
    }
  };

  const handleSelect = async (index: number) => {
    const item = filteredItems[index];
    if (!item) return;
    
    close();
    
    if (mode === 'commands' && 'action' in item) {
      await executeCommand(item.id);
    } else if (mode === 'files' && 'path' in item) {
      onOpenFile?.(item.path);
    }
  };

  if (!isOpen) return null;

  const modeConfig = {
    commands: { placeholder: 'Type a command...', prefix: '>' },
    files: { placeholder: 'Search files by name...', prefix: '' },
    symbols: { placeholder: 'Go to symbol...', prefix: '@' },
    lines: { placeholder: 'Go to line...', prefix: ':' },
  };

  const config = modeConfig[mode];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={close}
      />
      
      {/* Modal */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[600px] max-w-[90vw] z-50">
        <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Input */}
          <div className="flex items-center px-4 py-3 border-b border-slate-700">
            {config.prefix && (
              <span className="text-indigo-400 font-mono mr-2">{config.prefix}</span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={config.placeholder}
              className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↵</kbd>
              <span>select</span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">esc</kbd>
              <span>close</span>
            </div>
          </div>
          
          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[400px] overflow-y-auto"
          >
            {filteredItems.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500 text-sm">
                No results found
              </div>
            ) : (
              filteredItems.map((item, index) => {
                if (mode === 'commands' && 'action' in item) {
                  const cmd = item as CommandItem & { labelMatch: { indices: number[] } };
                  const Icon = cmd.icon || CATEGORY_ICONS[cmd.category];
                  
                  return (
                    <div
                      key={cmd.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? 'bg-indigo-600/30'
                          : 'hover:bg-slate-800/50'
                      }`}
                      onClick={() => handleSelect(index)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {highlightMatches(cmd.label, cmd.labelMatch.indices)}
                        </div>
                        {cmd.description && (
                          <div className="text-xs text-slate-500 truncate">
                            {cmd.description}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">
                          {CATEGORY_LABELS[cmd.category]}
                        </span>
                        {cmd.shortcut && (
                          <kbd className="px-1.5 py-0.5 text-xs bg-slate-800 text-slate-400 rounded">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </div>
                    </div>
                  );
                }
                
                if (mode === 'files' && 'path' in item) {
                  const file = item as FileItem & { nameMatch: { indices: number[] } };
                  const Icon = file.type === 'folder' ? Folder : File;
                  
                  return (
                    <div
                      key={file.path}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        index === selectedIndex
                          ? 'bg-indigo-600/30'
                          : 'hover:bg-slate-800/50'
                      }`}
                      onClick={() => handleSelect(index)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white truncate">
                          {highlightMatches(file.name, file.nameMatch.indices)}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {file.path}
                        </div>
                      </div>
                      {file.modified && (
                        <span className="text-xs text-amber-500">●</span>
                      )}
                      {file.gitStatus && (
                        <span className={`text-xs ${
                          file.gitStatus === 'M' ? 'text-amber-500' :
                          file.gitStatus === 'A' ? 'text-green-500' :
                          file.gitStatus === 'D' ? 'text-red-500' :
                          'text-slate-500'
                        }`}>
                          {file.gitStatus}
                        </span>
                      )}
                    </div>
                  );
                }
                
                return null;
              })
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>
                <Command className="w-3 h-3 inline mr-1" />
                <kbd className="px-1 bg-slate-800 rounded">⇧⌘P</kbd> Commands
              </span>
              <span>
                <Command className="w-3 h-3 inline mr-1" />
                <kbd className="px-1 bg-slate-800 rounded">⌘P</kbd> Files
              </span>
            </div>
            <span>{filteredItems.length} results</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Hook for registering commands
// ============================================================================

export function useRegisterCommand(command: CommandItem, deps: unknown[] = []) {
  const { registerCommand, unregisterCommand } = useCommandPalette();
  
  useEffect(() => {
    registerCommand(command);
    return () => unregisterCommand(command.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerCommand, unregisterCommand, command.id, ...deps]);
}

export default CommandPaletteProvider;
