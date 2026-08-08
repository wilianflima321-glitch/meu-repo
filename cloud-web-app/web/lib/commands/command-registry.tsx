'use client';

/**
 * Command Registry
 *
 * VS Code-style command layer for dynamic command registration.
 * Extensions and product modules can register actions that appear in the Command Palette.
 *
 * @module lib/commands/command-registry
 */
import { createContext, useContext, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { createComponentLogger } from '@/lib/observability/logger';
import {
  clearChromeCommandHistory,
  getChromeCommandHistory,
  setChromeCommandHistory,
} from '@/lib/storage/ui-persistence-spine';
import { DEFAULT_COMMANDS } from './default-commands';

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
  /** Keyboard shortcut (e.g., 'Cmd+N', 'Ctrl+Shift+P') */
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
const logger = createComponentLogger('command-registry');

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


function shortcutMatchesEvent(shortcut: string, event: KeyboardEvent): boolean {
  if (!shortcut || shortcut.includes(' ')) return false

  const parts = shortcut.split('+')
  const key = parts.pop()?.toLowerCase()
  if (!key) return false

  const isMac = navigator.platform.includes('Mac')
  const wantsCmd = parts.includes('Cmd')
  const wantsCtrl = parts.includes('Ctrl')
  const wantsAlt = parts.includes('Alt')
  const wantsShift = parts.includes('Shift')

  const expectedMeta = wantsCmd && isMac
  const expectedCtrl = wantsCtrl || (wantsCmd && !isMac)
  const actualKey = event.key === '?' ? '/' : event.key.toLowerCase()

  if (event.metaKey !== expectedMeta) return false
  if (event.ctrlKey !== expectedCtrl) return false
  if (wantsAlt !== event.altKey) return false
  if (wantsShift !== event.shiftKey) return false

  return actualKey === key
}

interface CommandRegistryProviderProps {
  children: ReactNode;
}

export function CommandRegistryProvider({ children }: CommandRegistryProviderProps) {
  const [commands, setCommands] = useState<Map<string, CommandDefinition>>(new Map());
  const [history, setHistory] = useState<CommandHistoryEntry[]>([]);

  // Load history from CW4 spine (legacy aethel_command_history migrates once).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = getChromeCommandHistory<CommandHistoryEntry>([]);
    if (saved.length > 0) {
      setHistory(saved);
    }
  }, []);

  // Persist history through spine
  useEffect(() => {
    if (typeof window === 'undefined' || history.length === 0) return;
    setChromeCommandHistory(history.slice(0, 50));
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
    clearChromeCommandHistory();
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

        if (shortcutMatchesEvent(command.shortcut, e)) {
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
