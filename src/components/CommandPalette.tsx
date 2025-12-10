import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EventBus } from '../services/EventBus';
import { KeybindingService } from '../services/KeybindingService';
import { EditorService } from '../services/EditorService';
import { WorkspaceService } from '../services/WorkspaceService';
import { SettingsService } from '../services/SettingsService';

interface Command {
  id: string;
  label: string;
  category: string;
  keybinding?: string;
  action: () => void;
  when?: () => boolean;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const [mode, setMode] = useState<'command' | 'file' | 'symbol'>('command');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    // File commands
    { id: 'file.new', label: 'New File', category: 'File', action: () => EditorService.getInstance().createEditor('') },
    { id: 'file.open', label: 'Open File', category: 'File', action: () => EventBus.getInstance().emit('file:open', {}) },
    { id: 'file.save', label: 'Save', category: 'File', keybinding: 'Ctrl+S', action: () => EditorService.getInstance().saveActiveEditor() },
    { id: 'file.saveAll', label: 'Save All', category: 'File', action: () => EditorService.getInstance().saveAllEditors() },
    { id: 'file.close', label: 'Close Editor', category: 'File', action: () => EditorService.getInstance().closeActiveEditor() },
    { id: 'file.closeAll', label: 'Close All Editors', category: 'File', action: () => EditorService.getInstance().closeAllEditors() },
    
    // Edit commands
    { id: 'edit.undo', label: 'Undo', category: 'Edit', keybinding: 'Ctrl+Z', action: () => document.execCommand('undo') },
    { id: 'edit.redo', label: 'Redo', category: 'Edit', keybinding: 'Ctrl+Y', action: () => document.execCommand('redo') },
    { id: 'edit.cut', label: 'Cut', category: 'Edit', keybinding: 'Ctrl+X', action: () => document.execCommand('cut') },
    { id: 'edit.copy', label: 'Copy', category: 'Edit', keybinding: 'Ctrl+C', action: () => document.execCommand('copy') },
    { id: 'edit.paste', label: 'Paste', category: 'Edit', keybinding: 'Ctrl+V', action: () => document.execCommand('paste') },
    { id: 'edit.find', label: 'Find', category: 'Edit', keybinding: 'Ctrl+F', action: () => EventBus.getInstance().emit('search:open', {}) },
    { id: 'edit.replace', label: 'Replace', category: 'Edit', keybinding: 'Ctrl+H', action: () => EventBus.getInstance().emit('search:replace', {}) },
    
    // View commands
    { id: 'view.toggleSidebar', label: 'Toggle Sidebar', category: 'View', action: () => EventBus.getInstance().emit('view:toggleSidebar', {}) },
    { id: 'view.togglePanel', label: 'Toggle Panel', category: 'View', action: () => EventBus.getInstance().emit('view:togglePanel', {}) },
    { id: 'view.toggleTerminal', label: 'Toggle Terminal', category: 'View', keybinding: 'Ctrl+`', action: () => EventBus.getInstance().emit('terminal:toggle', {}) },
    { id: 'view.explorer', label: 'Show Explorer', category: 'View', action: () => EventBus.getInstance().emit('view:showExplorer', {}) },
    { id: 'view.search', label: 'Show Search', category: 'View', keybinding: 'Ctrl+Shift+F', action: () => EventBus.getInstance().emit('view:showSearch', {}) },
    { id: 'view.git', label: 'Show Source Control', category: 'View', keybinding: 'Ctrl+Shift+G', action: () => EventBus.getInstance().emit('view:showGit', {}) },
    { id: 'view.debug', label: 'Show Debug', category: 'View', keybinding: 'Ctrl+Shift+D', action: () => EventBus.getInstance().emit('view:showDebug', {}) },
    { id: 'view.extensions', label: 'Show Extensions', category: 'View', keybinding: 'Ctrl+Shift+X', action: () => EventBus.getInstance().emit('view:showExtensions', {}) },
    
    // Go commands
    { id: 'go.toFile', label: 'Go to File', category: 'Go', keybinding: 'Ctrl+P', action: () => setMode('file') },
    { id: 'go.toSymbol', label: 'Go to Symbol', category: 'Go', keybinding: 'Ctrl+Shift+O', action: () => setMode('symbol') },
    { id: 'go.toLine', label: 'Go to Line', category: 'Go', keybinding: 'Ctrl+G', action: () => EventBus.getInstance().emit('editor:goToLine', {}) },
    { id: 'go.back', label: 'Go Back', category: 'Go', keybinding: 'Alt+Left', action: () => EventBus.getInstance().emit('editor:goBack', {}) },
    { id: 'go.forward', label: 'Go Forward', category: 'Go', keybinding: 'Alt+Right', action: () => EventBus.getInstance().emit('editor:goForward', {}) },
    
    // Terminal commands
    { id: 'terminal.new', label: 'New Terminal', category: 'Terminal', action: () => EventBus.getInstance().emit('terminal:new', {}) },
    { id: 'terminal.split', label: 'Split Terminal', category: 'Terminal', action: () => EventBus.getInstance().emit('terminal:split', {}) },
    { id: 'terminal.kill', label: 'Kill Terminal', category: 'Terminal', action: () => EventBus.getInstance().emit('terminal:kill', {}) },
    { id: 'terminal.clear', label: 'Clear Terminal', category: 'Terminal', action: () => EventBus.getInstance().emit('terminal:clear', {}) },
    
    // Debug commands
    { id: 'debug.start', label: 'Start Debugging', category: 'Debug', keybinding: 'F5', action: () => EventBus.getInstance().emit('debug:start', {}) },
    { id: 'debug.stop', label: 'Stop Debugging', category: 'Debug', keybinding: 'Shift+F5', action: () => EventBus.getInstance().emit('debug:stop', {}) },
    { id: 'debug.restart', label: 'Restart Debugging', category: 'Debug', action: () => EventBus.getInstance().emit('debug:restart', {}) },
    { id: 'debug.stepOver', label: 'Step Over', category: 'Debug', keybinding: 'F10', action: () => EventBus.getInstance().emit('debug:stepOver', {}) },
    { id: 'debug.stepInto', label: 'Step Into', category: 'Debug', keybinding: 'F11', action: () => EventBus.getInstance().emit('debug:stepInto', {}) },
    { id: 'debug.stepOut', label: 'Step Out', category: 'Debug', keybinding: 'Shift+F11', action: () => EventBus.getInstance().emit('debug:stepOut', {}) },
    { id: 'debug.continue', label: 'Continue', category: 'Debug', keybinding: 'F5', action: () => EventBus.getInstance().emit('debug:continue', {}) },
    { id: 'debug.toggleBreakpoint', label: 'Toggle Breakpoint', category: 'Debug', keybinding: 'F9', action: () => EventBus.getInstance().emit('debug:toggleBreakpoint', {}) },
    
    // Git commands
    { id: 'git.commit', label: 'Commit', category: 'Git', action: () => EventBus.getInstance().emit('git:commit', {}) },
    { id: 'git.push', label: 'Push', category: 'Git', action: () => EventBus.getInstance().emit('git:push', {}) },
    { id: 'git.pull', label: 'Pull', category: 'Git', action: () => EventBus.getInstance().emit('git:pull', {}) },
    { id: 'git.sync', label: 'Sync', category: 'Git', action: () => EventBus.getInstance().emit('git:sync', {}) },
    { id: 'git.checkout', label: 'Checkout', category: 'Git', action: () => EventBus.getInstance().emit('git:checkout', {}) },
    { id: 'git.branch', label: 'Create Branch', category: 'Git', action: () => EventBus.getInstance().emit('git:branch', {}) },
    
    // Settings commands
    { id: 'settings.open', label: 'Open Settings', category: 'Settings', keybinding: 'Ctrl+,', action: () => EventBus.getInstance().emit('settings:open', {}) },
    { id: 'settings.openKeyboardShortcuts', label: 'Open Keyboard Shortcuts', category: 'Settings', action: () => EventBus.getInstance().emit('keybindings:open', {}) },
    { id: 'settings.theme', label: 'Change Theme', category: 'Settings', action: () => EventBus.getInstance().emit('theme:select', {}) },
    
    // Workspace commands
    { id: 'workspace.open', label: 'Open Workspace', category: 'Workspace', action: () => EventBus.getInstance().emit('workspace:open', {}) },
    { id: 'workspace.close', label: 'Close Workspace', category: 'Workspace', action: () => WorkspaceService.getInstance().closeWorkspace() },
    { id: 'workspace.addFolder', label: 'Add Folder to Workspace', category: 'Workspace', action: () => EventBus.getInstance().emit('workspace:addFolder', {}) },
  ];

  const fuzzyMatch = useCallback((text: string, query: string): number => {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    if (lowerText.includes(lowerQuery)) {
      return 100 - lowerText.indexOf(lowerQuery);
    }
    
    let score = 0;
    let queryIndex = 0;
    
    for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
      if (lowerText[i] === lowerQuery[queryIndex]) {
        score += 10;
        queryIndex++;
      }
    }
    
    return queryIndex === lowerQuery.length ? score : 0;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (query === '') {
      setFilteredCommands(commands.slice(0, 50));
    } else {
      const filtered = commands
        .map(cmd => ({
          command: cmd,
          score: fuzzyMatch(cmd.label, query) + fuzzyMatch(cmd.category, query) * 0.5
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map(item => item.command);
      
      setFilteredCommands(filtered);
    }
    setSelectedIndex(0);
  }, [query, isOpen, commands, fuzzyMatch]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  const executeCommand = (command: Command) => {
    if (command.when && !command.when()) {
      return;
    }
    command.action();
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="search-box">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'command' ? 'Type a command...' : mode === 'file' ? 'Go to file...' : 'Go to symbol...'}
          />
        </div>
        <div className="commands-list" ref={listRef}>
          {filteredCommands.map((command, index) => (
            <div
              key={command.id}
              className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => executeCommand(command)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="command-info">
                <span className="command-label">{command.label}</span>
                <span className="command-category">{command.category}</span>
              </div>
              {command.keybinding && (
                <span className="command-keybinding">{command.keybinding}</span>
              )}
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div className="no-results">No commands found</div>
          )}
        </div>
      </div>

      <style jsx>{`
        .command-palette-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          justify-content: center;
          padding-top: 100px;
          z-index: 10000;
        }

        .command-palette {
          width: 600px;
          max-height: 500px;
          background: var(--vscode-quickInput-background);
          border: 1px solid var(--vscode-quickInput-border);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }

        .search-box {
          padding: 8px;
          border-bottom: 1px solid var(--vscode-quickInput-border);
        }

        .search-box input {
          width: 100%;
          padding: 8px 12px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          outline: none;
          font-size: 14px;
        }

        .search-box input:focus {
          border-color: var(--vscode-focusBorder);
        }

        .commands-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 0;
        }

        .command-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          cursor: pointer;
          color: var(--vscode-quickInput-foreground);
        }

        .command-item:hover,
        .command-item.selected {
          background: var(--vscode-list-hoverBackground);
        }

        .command-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .command-label {
          font-size: 13px;
        }

        .command-category {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }

        .command-keybinding {
          font-size: 11px;
          padding: 2px 6px;
          background: var(--vscode-keybindingLabel-background);
          color: var(--vscode-keybindingLabel-foreground);
          border: 1px solid var(--vscode-keybindingLabel-border);
          border-radius: 3px;
        }

        .no-results {
          padding: 20px;
          text-align: center;
          color: var(--vscode-descriptionForeground);
        }
      `}</style>
    </div>
  );
};
