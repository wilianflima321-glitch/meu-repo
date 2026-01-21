/**
 * Command Palette Unified - Paleta de Comandos World-Class
 * 
 * Paleta de comandos profissional integrada com Command Registry.
 * Similar ao VS Code com fuzzy search, categorias, shortcuts e histórico.
 * 
 * @module components/CommandPaletteUnified
 */

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  File,
  Folder,
  Code2,
  FileText,
  Hash,
  ArrowRight,
  Clock,
  Star,
  X,
  Command,
  ChevronRight,
  Play,
  Settings,
  GitBranch,
  Terminal,
  Sparkles,
  MessageSquare,
  Bug,
  Package,
  Keyboard,
  Save,
  FolderOpen,
  Undo,
  Redo,
  Scissors,
  Copy,
  Clipboard,
  ZoomIn,
  ZoomOut,
  PanelLeft,
  PanelBottom,
  HelpCircle,
  Info,
  Workflow,
  Palette,
  Clapperboard,
  Box,
  type LucideIcon,
} from 'lucide-react';
import { 
  useCommandRegistry, 
  type CommandDefinition, 
  type CommandCategory 
} from '@/lib/commands/command-registry';

// ============================================================================
// TYPES
// ============================================================================

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaletteMode = 'commands' | 'files' | 'symbols' | 'goto';

// ============================================================================
// ICON MAPPING
// ============================================================================

const CATEGORY_ICONS: Record<CommandCategory, LucideIcon> = {
  file: File,
  edit: Scissors,
  view: PanelLeft,
  navigation: ArrowRight,
  run: Play,
  debug: Bug,
  git: GitBranch,
  ai: Sparkles,
  editor: Code2,
  engine: Box,
  workspace: Folder,
  preferences: Settings,
  help: HelpCircle,
};

const ICON_MAP: Record<string, LucideIcon> = {
  'file-plus': File,
  'folder-plus': Folder,
  'folder-open': FolderOpen,
  'save': Save,
  'save-all': Save,
  'undo': Undo,
  'redo': Redo,
  'scissors': Scissors,
  'copy': Copy,
  'clipboard': Clipboard,
  'search': Search,
  'replace': Code2,
  'command': Command,
  'files': File,
  'git-branch': GitBranch,
  'terminal': Terminal,
  'panel-left': PanelLeft,
  'panel-bottom': PanelBottom,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  'play': Play,
  'bug': Bug,
  'square': X,
  'refresh-cw': ArrowRight,
  'package': Package,
  'message-square': MessageSquare,
  'sparkles': Sparkles,
  'help-circle': HelpCircle,
  'wand': Sparkles,
  'box': Box,
  'workflow': Workflow,
  'palette': Palette,
  'clapperboard': Clapperboard,
  'settings': Settings,
  'keyboard': Keyboard,
  'book': FileText,
  'info': Info,
};

// ============================================================================
// CATEGORY LABELS
// ============================================================================

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  file: 'Arquivo',
  edit: 'Editar',
  view: 'Visualizar',
  navigation: 'Navegação',
  run: 'Executar',
  debug: 'Depuração',
  git: 'Git',
  ai: 'IA',
  editor: 'Editor',
  engine: 'Engine',
  workspace: 'Workspace',
  preferences: 'Preferências',
  help: 'Ajuda',
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function CommandPaletteUnified({ isOpen, onClose }: CommandPaletteProps) {
  const { searchCommands, executeCommand, getRecentCommands, getAllCommands } = useCommandRegistry();
  
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<PaletteMode>('commands');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Determine mode based on query prefix
  useEffect(() => {
    if (query.startsWith('>')) {
      setMode('commands');
    } else if (query.startsWith('@')) {
      setMode('symbols');
    } else if (query.startsWith(':')) {
      setMode('goto');
    } else {
      setMode('files');
    }
  }, [query]);

  // Get filtered commands
  const results = useMemo(() => {
    const searchQuery = query.startsWith('>') ? query.slice(1).trim() : query;
    
    if (!searchQuery) {
      // Show recent commands first, then all commands
      const recent = getRecentCommands(5);
      const recentIds = new Set(recent.map(r => r.commandId));
      const all = getAllCommands();
      
      const recentCommands = recent
        .map(r => all.find(c => c.id === r.commandId))
        .filter((c): c is CommandDefinition => c !== undefined);
      
      const otherCommands = all.filter(c => !recentIds.has(c.id));
      
      return [...recentCommands, ...otherCommands].slice(0, 20);
    }
    
    return searchCommands(searchQuery).slice(0, 20);
  }, [query, searchCommands, getRecentCommands, getAllCommands]);

  // Group by category
  const groupedResults = useMemo(() => {
    const groups = new Map<CommandCategory, CommandDefinition[]>();
    
    for (const cmd of results) {
      const existing = groups.get(cmd.category) || [];
      existing.push(cmd);
      groups.set(cmd.category, existing);
    }
    
    return groups;
  }, [results]);

  // Flat list for navigation
  const flatResults = useMemo(() => results, [results]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('>');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      case 'Backspace':
        if (query === '>' || query === '@' || query === ':') {
          e.preventDefault();
          setQuery('');
        }
        break;
    }
  }, [flatResults, selectedIndex, onClose, query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    
    const selectedElement = list.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Handle selection
  const handleSelect = async (command: CommandDefinition) => {
    await executeCommand(command.id);
    onClose();
  };

  // Get icon for command
  const getCommandIcon = (command: CommandDefinition): LucideIcon => {
    if (command.icon && ICON_MAP[command.icon]) {
      return ICON_MAP[command.icon];
    }
    return CATEGORY_ICONS[command.category] || ArrowRight;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 border-b border-slate-800">
            <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Digite > para comandos, @ para símbolos, : para ir para linha"
              className="flex-1 py-4 bg-transparent text-white text-base placeholder-slate-500 outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex items-center gap-2">
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-slate-500 bg-slate-800 rounded">
                <Command className="w-3 h-3" />K
              </kbd>
              <button
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-slate-300 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/50 text-xs">
            <span className="text-slate-500">Modo:</span>
            <span className={`px-2 py-0.5 rounded ${
              mode === 'commands' ? 'bg-indigo-500/20 text-indigo-400' :
              mode === 'files' ? 'bg-emerald-500/20 text-emerald-400' :
              mode === 'symbols' ? 'bg-amber-500/20 text-amber-400' :
              'bg-purple-500/20 text-purple-400'
            }`}>
              {mode === 'commands' && 'Comandos'}
              {mode === 'files' && 'Arquivos'}
              {mode === 'symbols' && 'Símbolos'}
              {mode === 'goto' && 'Ir para linha'}
            </span>
            <span className="text-slate-600 ml-auto">
              {flatResults.length} resultados
            </span>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[50vh] overflow-y-auto"
          >
            {flatResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum resultado encontrado</p>
                <p className="text-sm mt-1">Tente uma busca diferente</p>
              </div>
            ) : (
              <div className="py-2">
                {flatResults.map((command, index) => {
                  const Icon = getCommandIcon(command);
                  const isSelected = index === selectedIndex;
                  const isRecent = getRecentCommands(5).some(r => r.commandId === command.id);
                  
                  return (
                    <button
                      key={command.id}
                      data-index={index}
                      onClick={() => handleSelect(command)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-500/20 text-white'
                          : 'text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-indigo-500/30' : 'bg-slate-800'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          isSelected ? 'text-indigo-400' : 'text-slate-400'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{command.label}</span>
                          {isRecent && (
                            <Clock className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          )}
                        </div>
                        {command.description && (
                          <p className="text-xs text-slate-500 truncate">{command.description}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-800 text-slate-500'
                        }`}>
                          {CATEGORY_LABELS[command.category]}
                        </span>
                        
                        {command.shortcut && (
                          <kbd className={`text-xs px-2 py-0.5 rounded font-mono ${
                            isSelected ? 'bg-slate-700 text-slate-200' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {command.shortcut}
                          </kbd>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-800 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Enter</kbd>
                selecionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Esc</kbd>
                fechar
              </span>
            </div>
            <span className="text-slate-600">
              Aethel Engine Command Palette
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// KEYBOARD SHORTCUT HOOK
// ============================================================================

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Cmd+Shift+P or Ctrl+Shift+P
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}
