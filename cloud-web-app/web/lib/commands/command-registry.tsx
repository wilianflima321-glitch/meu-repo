/**
 * Command Registry - Sistema de Registro de Comandos
 * 
 * Sistema world-class similar ao VS Code para registro dinâmico de comandos.
 * Permite extensões e módulos registrarem comandos que aparecem no Command Palette.
 * 
 * @module lib/commands/command-registry
 */

'use client';

import { createContext, useContext, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type CommandCategory = 
  | 'file'
  | 'edit'
  | 'view'
  | 'navigation'
  | 'run'
  | 'debug'
  | 'git'
  | 'ai'
  | 'editor'
  | 'engine'
  | 'workspace'
  | 'preferences'
  | 'help';

export interface CommandDefinition {
  /** Unique command identifier (e.g., 'file.new', 'edit.undo') */
  id: string;
  /** Display label for the command */
  label: string;
  /** Detailed description for tooltip/help */
  description?: string;
  /** Category for grouping */
  category: CommandCategory;
  /** Keyboard shortcut (e.g., '⌘N', 'Ctrl+Shift+P') */
  shortcut?: string;
  /** Alternative keyboard shortcut */
  altShortcut?: string;
  /** Icon component or name */
  icon?: string;
  /** Command is available when this returns true */
  when?: () => boolean;
  /** Command execution handler */
  handler: (args?: Record<string, unknown>) => void | Promise<void>;
  /** Priority for sorting (higher = first) */
  priority?: number;
  /** Tags for search improvement */
  tags?: string[];
}

export interface CommandExecutionResult {
  success: boolean;
  commandId: string;
  error?: Error;
  duration: number;
}

export interface CommandHistoryEntry {
  commandId: string;
  timestamp: number;
  args?: Record<string, unknown>;
}

interface CommandRegistryContextValue {
  /** Register a new command */
  registerCommand: (command: CommandDefinition) => () => void;
  /** Register multiple commands at once */
  registerCommands: (commands: CommandDefinition[]) => () => void;
  /** Unregister a command by ID */
  unregisterCommand: (commandId: string) => void;
  /** Execute a command by ID */
  executeCommand: (commandId: string, args?: Record<string, unknown>) => Promise<CommandExecutionResult>;
  /** Get a command by ID */
  getCommand: (commandId: string) => CommandDefinition | undefined;
  /** Get all registered commands */
  getAllCommands: () => CommandDefinition[];
  /** Get commands by category */
  getCommandsByCategory: (category: CommandCategory) => CommandDefinition[];
  /** Search commands by query */
  searchCommands: (query: string) => CommandDefinition[];
  /** Get recent commands */
  getRecentCommands: (limit?: number) => CommandHistoryEntry[];
  /** Clear command history */
  clearHistory: () => void;
  /** Check if command exists */
  hasCommand: (commandId: string) => boolean;
}

// ============================================================================
// CONTEXT
// ============================================================================

const CommandRegistryContext = createContext<CommandRegistryContextValue | null>(null);

// ============================================================================
// HOOKS
// ============================================================================

export function useCommandRegistry() {
  const context = useContext(CommandRegistryContext);
  if (!context) {
    throw new Error('useCommandRegistry must be used within CommandRegistryProvider');
  }
  return context;
}

export function useCommand(commandId: string) {
  const { getCommand, executeCommand } = useCommandRegistry();
  const command = getCommand(commandId);
  
  const execute = useCallback(
    (args?: Record<string, unknown>) => executeCommand(commandId, args),
    [commandId, executeCommand]
  );

  return { command, execute };
}

export function useRegisterCommand(command: CommandDefinition) {
  const { registerCommand } = useCommandRegistry();
  
  useEffect(() => {
    const unregister = registerCommand(command);
    return unregister;
  }, [command, registerCommand]);
}

// ============================================================================
// FUZZY SEARCH
// ============================================================================

function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower === queryLower) {
    return { match: true, score: 1000 };
  }
  
  // Starts with
  if (textLower.startsWith(queryLower)) {
    return { match: true, score: 900 };
  }
  
  // Contains
  if (textLower.includes(queryLower)) {
    return { match: true, score: 800 - textLower.indexOf(queryLower) };
  }
  
  // Fuzzy match (all query chars appear in order)
  let queryIndex = 0;
  let score = 0;
  let consecutiveBonus = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
      score += 10 + consecutiveBonus;
      consecutiveBonus += 5;
    } else {
      consecutiveBonus = 0;
    }
  }
  
  if (queryIndex === queryLower.length) {
    return { match: true, score };
  }
  
  return { match: false, score: 0 };
}

// ============================================================================
// PROVIDER
// ============================================================================

interface CommandRegistryProviderProps {
  children: ReactNode;
}

export function CommandRegistryProvider({ children }: CommandRegistryProviderProps) {
  const [commands, setCommands] = useState<Map<string, CommandDefinition>>(new Map());
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);

  // Load history from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aethel_command_history');
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch {
          // Invalid JSON, ignore
        }
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && history.length > 0) {
      localStorage.setItem('aethel_command_history', JSON.stringify(history.slice(0, 50)));
    }
  }, [history]);

  const registerCommand = useCallback((command: CommandDefinition) => {
    setCommands(prev => {
      const next = new Map(prev);
      next.set(command.id, command);
      return next;
    });

    // Return unregister function
    return () => {
      setCommands(prev => {
        const next = new Map(prev);
        next.delete(command.id);
        return next;
      });
    };
  }, []);

  const registerCommands = useCallback((commandList: CommandDefinition[]) => {
    setCommands(prev => {
      const next = new Map(prev);
      for (const command of commandList) {
        next.set(command.id, command);
      }
      return next;
    });

    // Return unregister function
    return () => {
      setCommands(prev => {
        const next = new Map(prev);
        for (const command of commandList) {
          next.delete(command.id);
        }
        return next;
      });
    };
  }, []);

  const unregisterCommand = useCallback((commandId: string) => {
    setCommands(prev => {
      const next = new Map(prev);
      next.delete(commandId);
      return next;
    });
  }, []);

  const executeCommand = useCallback(async (
    commandId: string, 
    args?: Record<string, unknown>
  ): Promise<CommandExecutionResult> => {
    const start = performance.now();
    const command = commands.get(commandId);

    if (!command) {
      return {
        success: false,
        commandId,
        error: new Error(`Command not found: ${commandId}`),
        duration: performance.now() - start,
      };
    }

    // Check "when" condition
    if (command.when && !command.when()) {
      return {
        success: false,
        commandId,
        error: new Error(`Command not available: ${commandId}`),
        duration: performance.now() - start,
      };
    }

    try {
      await command.handler(args);

      // Add to history
      setHistory(prev => [
        { commandId, timestamp: Date.now(), args },
        ...prev.filter(h => h.commandId !== commandId).slice(0, 49),
      ]);

      return {
        success: true,
        commandId,
        duration: performance.now() - start,
      };
    } catch (error) {
      return {
        success: false,
        commandId,
        error: error instanceof Error ? error : new Error(String(error)),
        duration: performance.now() - start,
      };
    }
  }, [commands]);

  const getCommand = useCallback((commandId: string) => {
    return commands.get(commandId);
  }, [commands]);

  const getAllCommands = useCallback(() => {
    return Array.from(commands.values())
      .filter(cmd => !cmd.when || cmd.when())
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }, [commands]);

  const getCommandsByCategory = useCallback((category: CommandCategory) => {
    return getAllCommands().filter(cmd => cmd.category === category);
  }, [getAllCommands]);

  const searchCommands = useCallback((query: string) => {
    if (!query.trim()) {
      return getAllCommands();
    }

    const results: Array<{ command: CommandDefinition; score: number }> = [];

    for (const command of commands.values()) {
      // Check "when" condition
      if (command.when && !command.when()) {
        continue;
      }

      // Search in label
      const labelMatch = fuzzyMatch(command.label, query);
      if (labelMatch.match) {
        results.push({ command, score: labelMatch.score + (command.priority || 0) });
        continue;
      }

      // Search in description
      if (command.description) {
        const descMatch = fuzzyMatch(command.description, query);
        if (descMatch.match) {
          results.push({ command, score: descMatch.score * 0.8 + (command.priority || 0) });
          continue;
        }
      }

      // Search in tags
      if (command.tags) {
        for (const tag of command.tags) {
          const tagMatch = fuzzyMatch(tag, query);
          if (tagMatch.match) {
            results.push({ command, score: tagMatch.score * 0.6 + (command.priority || 0) });
            break;
          }
        }
      }

      // Search in ID
      const idMatch = fuzzyMatch(command.id, query);
      if (idMatch.match) {
        results.push({ command, score: idMatch.score * 0.5 + (command.priority || 0) });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .map(r => r.command);
  }, [commands, getAllCommands]);

  const getRecentCommands = useCallback((limit = 10) => {
    return history.slice(0, limit);
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aethel_command_history');
    }
  }, []);

  const hasCommand = useCallback((commandId: string) => {
    return commands.has(commandId);
  }, [commands]);

  const value = useMemo<CommandRegistryContextValue>(() => ({
    registerCommand,
    registerCommands,
    unregisterCommand,
    executeCommand,
    getCommand,
    getAllCommands,
    getCommandsByCategory,
    searchCommands,
    getRecentCommands,
    clearHistory,
    hasCommand,
  }), [
    registerCommand,
    registerCommands,
    unregisterCommand,
    executeCommand,
    getCommand,
    getAllCommands,
    getCommandsByCategory,
    searchCommands,
    getRecentCommands,
    clearHistory,
    hasCommand,
  ]);

  return (
    <CommandRegistryContext.Provider value={value}>
      {children}
    </CommandRegistryContext.Provider>
  );
}

// ============================================================================
// DEFAULT COMMANDS
// ============================================================================

export const DEFAULT_COMMANDS: CommandDefinition[] = [
  // === FILE ===
  {
    id: 'file.new',
    label: 'Novo Arquivo',
    description: 'Criar um novo arquivo',
    category: 'file',
    shortcut: '⌘N',
    icon: 'file-plus',
    priority: 100,
    tags: ['create', 'new', 'file', 'criar', 'novo', 'arquivo'],
    handler: () => console.log('New file'),
  },
  {
    id: 'file.newFolder',
    label: 'Nova Pasta',
    description: 'Criar uma nova pasta',
    category: 'file',
    shortcut: '⇧⌘N',
    icon: 'folder-plus',
    priority: 99,
    tags: ['create', 'folder', 'directory', 'pasta', 'diretório'],
    handler: () => console.log('New folder'),
  },
  {
    id: 'file.open',
    label: 'Abrir Arquivo',
    description: 'Abrir um arquivo existente',
    category: 'file',
    shortcut: '⌘O',
    icon: 'folder-open',
    priority: 98,
    tags: ['open', 'file', 'abrir', 'arquivo'],
    handler: () => console.log('Open file'),
  },
  {
    id: 'file.save',
    label: 'Salvar',
    description: 'Salvar o arquivo atual',
    category: 'file',
    shortcut: '⌘S',
    icon: 'save',
    priority: 97,
    tags: ['save', 'salvar', 'gravar'],
    handler: () => console.log('Save file'),
  },
  {
    id: 'file.saveAll',
    label: 'Salvar Todos',
    description: 'Salvar todos os arquivos abertos',
    category: 'file',
    shortcut: '⌥⌘S',
    icon: 'save-all',
    priority: 96,
    tags: ['save', 'all', 'salvar', 'todos'],
    handler: () => console.log('Save all'),
  },

  // === EDIT ===
  {
    id: 'edit.undo',
    label: 'Desfazer',
    description: 'Desfazer a última ação',
    category: 'edit',
    shortcut: '⌘Z',
    icon: 'undo',
    priority: 100,
    tags: ['undo', 'desfazer', 'voltar'],
    handler: () => console.log('Undo'),
  },
  {
    id: 'edit.redo',
    label: 'Refazer',
    description: 'Refazer a ação desfeita',
    category: 'edit',
    shortcut: '⇧⌘Z',
    icon: 'redo',
    priority: 99,
    tags: ['redo', 'refazer'],
    handler: () => console.log('Redo'),
  },
  {
    id: 'edit.cut',
    label: 'Recortar',
    description: 'Recortar seleção',
    category: 'edit',
    shortcut: '⌘X',
    icon: 'scissors',
    priority: 98,
    tags: ['cut', 'recortar', 'cortar'],
    handler: () => console.log('Cut'),
  },
  {
    id: 'edit.copy',
    label: 'Copiar',
    description: 'Copiar seleção',
    category: 'edit',
    shortcut: '⌘C',
    icon: 'copy',
    priority: 97,
    tags: ['copy', 'copiar'],
    handler: () => console.log('Copy'),
  },
  {
    id: 'edit.paste',
    label: 'Colar',
    description: 'Colar do clipboard',
    category: 'edit',
    shortcut: '⌘V',
    icon: 'clipboard',
    priority: 96,
    tags: ['paste', 'colar'],
    handler: () => console.log('Paste'),
  },
  {
    id: 'edit.find',
    label: 'Buscar',
    description: 'Buscar no arquivo',
    category: 'edit',
    shortcut: '⌘F',
    icon: 'search',
    priority: 95,
    tags: ['find', 'search', 'buscar', 'procurar', 'pesquisar'],
    handler: () => console.log('Find'),
  },
  {
    id: 'edit.replace',
    label: 'Substituir',
    description: 'Buscar e substituir',
    category: 'edit',
    shortcut: '⌥⌘F',
    icon: 'replace',
    priority: 94,
    tags: ['replace', 'substituir', 'trocar'],
    handler: () => console.log('Replace'),
  },

  // === VIEW ===
  {
    id: 'view.commandPalette',
    label: 'Command Palette',
    description: 'Abrir paleta de comandos',
    category: 'view',
    shortcut: '⇧⌘P',
    icon: 'command',
    priority: 100,
    tags: ['command', 'palette', 'comando', 'paleta'],
    handler: () => console.log('Command palette'),
  },
  {
    id: 'view.explorer',
    label: 'Explorador',
    description: 'Mostrar explorador de arquivos',
    category: 'view',
    shortcut: '⇧⌘E',
    icon: 'files',
    priority: 99,
    tags: ['explorer', 'files', 'explorador', 'arquivos'],
    handler: () => console.log('Explorer'),
  },
  {
    id: 'view.search',
    label: 'Buscar em Arquivos',
    description: 'Buscar em todos os arquivos',
    category: 'view',
    shortcut: '⇧⌘F',
    icon: 'search',
    priority: 98,
    tags: ['search', 'files', 'buscar', 'arquivos'],
    handler: () => console.log('Search'),
  },
  {
    id: 'view.git',
    label: 'Controle de Versão',
    description: 'Mostrar painel Git',
    category: 'view',
    shortcut: '⌃⇧G',
    icon: 'git-branch',
    priority: 97,
    tags: ['git', 'source', 'control', 'versão'],
    handler: () => console.log('Git'),
  },
  {
    id: 'view.terminal',
    label: 'Terminal',
    description: 'Abrir terminal integrado',
    category: 'view',
    shortcut: '⌃`',
    icon: 'terminal',
    priority: 96,
    tags: ['terminal', 'console', 'shell'],
    handler: () => console.log('Terminal'),
  },
  {
    id: 'view.toggleSidebar',
    label: 'Alternar Barra Lateral',
    description: 'Mostrar/ocultar barra lateral',
    category: 'view',
    shortcut: '⌘B',
    icon: 'panel-left',
    priority: 95,
    tags: ['sidebar', 'toggle', 'barra', 'lateral'],
    handler: () => console.log('Toggle sidebar'),
  },
  {
    id: 'view.togglePanel',
    label: 'Alternar Painel Inferior',
    description: 'Mostrar/ocultar painel inferior',
    category: 'view',
    shortcut: '⌘J',
    icon: 'panel-bottom',
    priority: 94,
    tags: ['panel', 'bottom', 'painel', 'inferior'],
    handler: () => console.log('Toggle panel'),
  },
  {
    id: 'view.zoomIn',
    label: 'Aumentar Zoom',
    description: 'Aumentar zoom do editor',
    category: 'view',
    shortcut: '⌘+',
    icon: 'zoom-in',
    priority: 93,
    tags: ['zoom', 'in', 'aumentar'],
    handler: () => console.log('Zoom in'),
  },
  {
    id: 'view.zoomOut',
    label: 'Diminuir Zoom',
    description: 'Diminuir zoom do editor',
    category: 'view',
    shortcut: '⌘-',
    icon: 'zoom-out',
    priority: 92,
    tags: ['zoom', 'out', 'diminuir'],
    handler: () => console.log('Zoom out'),
  },

  // === RUN ===
  {
    id: 'run.start',
    label: 'Iniciar',
    description: 'Executar o projeto',
    category: 'run',
    shortcut: 'F5',
    icon: 'play',
    priority: 100,
    tags: ['run', 'start', 'executar', 'iniciar', 'play'],
    handler: () => console.log('Run'),
  },
  {
    id: 'run.debug',
    label: 'Depurar',
    description: 'Iniciar depuração',
    category: 'run',
    shortcut: '⇧F5',
    icon: 'bug',
    priority: 99,
    tags: ['debug', 'depurar'],
    handler: () => console.log('Debug'),
  },
  {
    id: 'run.stop',
    label: 'Parar',
    description: 'Parar execução',
    category: 'run',
    shortcut: '⇧F5',
    icon: 'square',
    priority: 98,
    tags: ['stop', 'parar'],
    handler: () => console.log('Stop'),
  },
  {
    id: 'run.restart',
    label: 'Reiniciar',
    description: 'Reiniciar execução',
    category: 'run',
    shortcut: '⇧⌘F5',
    icon: 'refresh-cw',
    priority: 97,
    tags: ['restart', 'reiniciar'],
    handler: () => console.log('Restart'),
  },
  {
    id: 'run.build',
    label: 'Build',
    description: 'Compilar projeto',
    category: 'run',
    shortcut: '⇧⌘B',
    icon: 'package',
    priority: 96,
    tags: ['build', 'compile', 'compilar'],
    handler: () => console.log('Build'),
  },

  // === AI ===
  {
    id: 'ai.chat',
    label: 'Chat IA',
    description: 'Abrir chat com IA',
    category: 'ai',
    shortcut: '⌘I',
    icon: 'message-square',
    priority: 100,
    tags: ['ai', 'chat', 'copilot', 'ia', 'assistente'],
    handler: () => console.log('AI Chat'),
  },
  {
    id: 'ai.generateCode',
    label: 'Gerar Código com IA',
    description: 'Usar IA para gerar código',
    category: 'ai',
    shortcut: '⌃⌘I',
    icon: 'sparkles',
    priority: 99,
    tags: ['ai', 'generate', 'code', 'gerar', 'código'],
    handler: () => console.log('Generate code'),
  },
  {
    id: 'ai.explain',
    label: 'Explicar com IA',
    description: 'IA explica código selecionado',
    category: 'ai',
    icon: 'help-circle',
    priority: 98,
    tags: ['ai', 'explain', 'explicar'],
    handler: () => console.log('Explain'),
  },
  {
    id: 'ai.refactor',
    label: 'Refatorar com IA',
    description: 'IA sugere refatoração',
    category: 'ai',
    icon: 'wand',
    priority: 97,
    tags: ['ai', 'refactor', 'refatorar'],
    handler: () => console.log('Refactor'),
  },

  // === ENGINE ===
  {
    id: 'engine.viewport3d',
    label: 'Viewport 3D',
    description: 'Abrir viewport 3D',
    category: 'engine',
    icon: 'box',
    priority: 100,
    tags: ['3d', 'viewport', 'scene', 'cena'],
    handler: () => console.log('3D Viewport'),
  },
  {
    id: 'engine.visualScripting',
    label: 'Visual Scripting',
    description: 'Abrir editor de scripts visuais',
    category: 'engine',
    icon: 'workflow',
    priority: 99,
    tags: ['visual', 'scripting', 'blueprint', 'node'],
    handler: () => console.log('Visual Scripting'),
  },
  {
    id: 'engine.materials',
    label: 'Editor de Materiais',
    description: 'Abrir editor de materiais',
    category: 'engine',
    icon: 'palette',
    priority: 98,
    tags: ['material', 'shader', 'texture', 'textura'],
    handler: () => console.log('Materials'),
  },
  {
    id: 'engine.animation',
    label: 'Editor de Animação',
    description: 'Abrir timeline de animação',
    category: 'engine',
    icon: 'clapperboard',
    priority: 97,
    tags: ['animation', 'timeline', 'animação'],
    handler: () => console.log('Animation'),
  },
  {
    id: 'engine.particles',
    label: 'Editor de Partículas',
    description: 'Sistema de partículas Niagara',
    category: 'engine',
    icon: 'sparkles',
    priority: 96,
    tags: ['particles', 'niagara', 'vfx', 'partículas'],
    handler: () => console.log('Particles'),
  },

  // === PREFERENCES ===
  {
    id: 'preferences.settings',
    label: 'Configurações',
    description: 'Abrir configurações',
    category: 'preferences',
    shortcut: '⌘,',
    icon: 'settings',
    priority: 100,
    tags: ['settings', 'preferences', 'configurações', 'preferências'],
    handler: () => console.log('Settings'),
  },
  {
    id: 'preferences.keyboardShortcuts',
    label: 'Atalhos de Teclado',
    description: 'Configurar atalhos de teclado',
    category: 'preferences',
    shortcut: '⌘K ⌘S',
    icon: 'keyboard',
    priority: 99,
    tags: ['keyboard', 'shortcuts', 'teclado', 'atalhos'],
    handler: () => console.log('Keyboard shortcuts'),
  },
  {
    id: 'preferences.themes',
    label: 'Temas',
    description: 'Escolher tema de cores',
    category: 'preferences',
    icon: 'palette',
    priority: 98,
    tags: ['theme', 'colors', 'tema', 'cores'],
    handler: () => console.log('Themes'),
  },

  // === HELP ===
  {
    id: 'help.documentation',
    label: 'Documentação',
    description: 'Abrir documentação online',
    category: 'help',
    icon: 'book',
    priority: 100,
    tags: ['docs', 'documentation', 'documentação', 'help', 'ajuda'],
    handler: () => window.open('/docs', '_blank'),
  },
  {
    id: 'help.shortcuts',
    label: 'Referência de Atalhos',
    description: 'Ver todos os atalhos de teclado',
    category: 'help',
    shortcut: '⌃⇧/',
    icon: 'keyboard',
    priority: 99,
    tags: ['shortcuts', 'reference', 'atalhos', 'referência'],
    handler: () => console.log('Shortcuts reference'),
  },
  {
    id: 'help.about',
    label: 'Sobre',
    description: 'Informações sobre o Aethel Engine',
    category: 'help',
    icon: 'info',
    priority: 98,
    tags: ['about', 'version', 'sobre', 'versão'],
    handler: () => console.log('About'),
  },
];

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to register default commands on mount
 */
export function useDefaultCommands() {
  const { registerCommands } = useCommandRegistry();
  
  useEffect(() => {
    const unregister = registerCommands(DEFAULT_COMMANDS);
    return unregister;
  }, [registerCommands]);
}

/**
 * Hook for keyboard shortcut handling
 */
export function useGlobalShortcuts() {
  const { executeCommand, getAllCommands } = useCommandRegistry();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const commands = getAllCommands();
      
      for (const command of commands) {
        if (!command.shortcut) continue;
        
        // Parse shortcut and check if it matches
        // This is a simplified version - real implementation would be more complex
        const shortcut = command.shortcut;
        const isMac = navigator.platform.includes('Mac');
        
        // Convert shortcut to key combo
        let match = false;
        if (shortcut === '⌘N' && isMac && e.metaKey && e.key === 'n') match = true;
        if (shortcut === '⌘S' && isMac && e.metaKey && e.key === 's') match = true;
        if (shortcut === '⌘Z' && isMac && e.metaKey && e.key === 'z') match = true;
        if (shortcut === 'F5' && e.key === 'F5') match = true;
        // ... add more shortcuts as needed
        
        if (match) {
          e.preventDefault();
          executeCommand(command.id);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeCommand, getAllCommands]);
}
