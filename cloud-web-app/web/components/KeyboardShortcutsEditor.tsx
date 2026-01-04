/**
 * Keyboard Shortcuts Editor
 * Professional UI for viewing and customizing keyboard shortcuts
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

interface KeyBinding {
  id: string;
  command: string;
  key: string;
  when?: string;
  category: string;
  description: string;
  isCustom?: boolean;
}

const DEFAULT_KEYBINDINGS: KeyBinding[] = [
  // File operations
  { id: '1', command: 'workbench.action.files.save', key: 'Cmd+S', category: 'File', description: 'Save file' },
  { id: '2', command: 'workbench.action.files.saveAll', key: 'Cmd+Alt+S', category: 'File', description: 'Save all files' },
  { id: '3', command: 'workbench.action.files.newUntitledFile', key: 'Cmd+N', category: 'File', description: 'New file' },
  { id: '4', command: 'workbench.action.closeActiveEditor', key: 'Cmd+W', category: 'File', description: 'Close editor' },
  
  // Navigation
  { id: '5', command: 'workbench.action.quickOpen', key: 'Cmd+P', category: 'Navigation', description: 'Quick open file' },
  { id: '6', command: 'workbench.action.showCommands', key: 'Cmd+Shift+P', category: 'Navigation', description: 'Command palette' },
  { id: '7', command: 'workbench.action.gotoLine', key: 'Ctrl+G', category: 'Navigation', description: 'Go to line' },
  { id: '8', command: 'workbench.action.gotoSymbol', key: 'Cmd+Shift+O', category: 'Navigation', description: 'Go to symbol' },
  
  // Editor
  { id: '9', command: 'editor.action.formatDocument', key: 'Shift+Alt+F', category: 'Editor', description: 'Format document' },
  { id: '10', command: 'editor.action.commentLine', key: 'Cmd+/', category: 'Editor', description: 'Toggle line comment' },
  { id: '11', command: 'editor.action.triggerSuggest', key: 'Ctrl+Space', category: 'Editor', description: 'Trigger suggest' },
  { id: '12', command: 'editor.action.goToDeclaration', key: 'F12', category: 'Editor', description: 'Go to definition' },
  { id: '13', command: 'editor.action.findReferences', key: 'Shift+F12', category: 'Editor', description: 'Find references' },
  { id: '14', command: 'editor.action.rename', key: 'F2', category: 'Editor', description: 'Rename symbol' },
  
  // Search
  { id: '15', command: 'actions.find', key: 'Cmd+F', category: 'Search', description: 'Find' },
  { id: '16', command: 'editor.action.startFindReplaceAction', key: 'Cmd+H', category: 'Search', description: 'Replace' },
  { id: '17', command: 'workbench.action.findInFiles', key: 'Cmd+Shift+F', category: 'Search', description: 'Find in files' },
  
  // View
  { id: '18', command: 'workbench.action.toggleSidebarVisibility', key: 'Cmd+B', category: 'View', description: 'Toggle sidebar' },
  { id: '19', command: 'workbench.action.togglePanel', key: 'Cmd+J', category: 'View', description: 'Toggle panel' },
  { id: '20', command: 'workbench.action.terminal.toggleTerminal', key: 'Ctrl+`', category: 'View', description: 'Toggle terminal' },
  { id: '21', command: 'workbench.action.zoomIn', key: 'Cmd+=', category: 'View', description: 'Zoom in' },
  { id: '22', command: 'workbench.action.zoomOut', key: 'Cmd+-', category: 'View', description: 'Zoom out' },
  
  // Debug
  { id: '23', command: 'workbench.action.debug.start', key: 'F5', category: 'Debug', description: 'Start debugging' },
  { id: '24', command: 'workbench.action.debug.continue', key: 'F5', when: 'inDebugMode', category: 'Debug', description: 'Continue' },
  { id: '25', command: 'workbench.action.debug.stepOver', key: 'F10', when: 'inDebugMode', category: 'Debug', description: 'Step over' },
  { id: '26', command: 'workbench.action.debug.stepInto', key: 'F11', when: 'inDebugMode', category: 'Debug', description: 'Step into' },
  { id: '27', command: 'workbench.action.debug.stepOut', key: 'Shift+F11', when: 'inDebugMode', category: 'Debug', description: 'Step out' },
  { id: '28', command: 'editor.debug.action.toggleBreakpoint', key: 'F9', category: 'Debug', description: 'Toggle breakpoint' },
  
  // Git
  { id: '29', command: 'git.commit', key: 'Cmd+Enter', when: 'scmRepository', category: 'Git', description: 'Commit' },
  { id: '30', command: 'git.sync', key: 'Cmd+Shift+Enter', when: 'scmRepository', category: 'Git', description: 'Sync' },
];

export default function KeyboardShortcutsEditor() {
  const [keybindings, setKeybindings] = useState<KeyBinding[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordingKey, setRecordingKey] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [conflicts, setConflicts] = useState<Map<string, string[]>>(new Map());

  // Detect conflicts
  const detectConflicts = useCallback((bindings: KeyBinding[]) => {
    const conflictMap = new Map<string, string[]>();

    bindings.forEach(binding => {
      const key = `${binding.key}${binding.when ? `|${binding.when}` : ''}`;
      const existing = conflictMap.get(key) || [];
      existing.push(binding.command);
      conflictMap.set(key, existing);
    });

    const actualConflicts = new Map<string, string[]>();
    conflictMap.forEach((commands, key) => {
      if (commands.length > 1) {
        actualConflicts.set(key, commands);
      }
    });

    setConflicts(actualConflicts);
  }, []);

  // Load keybindings
  useEffect(() => {
    const stored = localStorage.getItem('keyboard-shortcuts');
    let initial: KeyBinding[] = DEFAULT_KEYBINDINGS;

    if (stored) {
      try {
        initial = JSON.parse(stored) as KeyBinding[];
      } catch (error) {
        initial = DEFAULT_KEYBINDINGS;
      }
    }

    setKeybindings(initial);
    detectConflicts(initial);
  }, [detectConflicts]);

  // Save keybindings
  const saveKeybindings = useCallback((newKeybindings: KeyBinding[]) => {
    localStorage.setItem('keyboard-shortcuts', JSON.stringify(newKeybindings));
    setKeybindings(newKeybindings);
    detectConflicts(newKeybindings);
  }, [detectConflicts]);

  // Get categories
  const categories = useMemo(() => {
    const cats = new Set(keybindings.map(kb => kb.category));
    return ['All', ...Array.from(cats).sort()];
  }, [keybindings]);

  // Filter keybindings
  const filteredKeybindings = useMemo(() => {
    return keybindings.filter(kb => {
      const matchesSearch = !searchQuery || 
        kb.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kb.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kb.key.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || kb.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [keybindings, searchQuery, selectedCategory]);

  // Update keybinding
  const updateKeybinding = useCallback((id: string, newKey: string) => {
    const updated = keybindings.map(kb =>
      kb.id === id ? { ...kb, key: newKey, isCustom: true } : kb
    );
    saveKeybindings(updated);
  }, [keybindings, saveKeybindings]);

  // Start recording key
  const startRecording = (id: string) => {
    setEditingId(id);
    setRecordingKey(true);
    setRecordedKeys([]);
  };

  // Handle key press during recording
  useEffect(() => {
    if (!recordingKey) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (e.metaKey) keys.push('Cmd');

      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        keys.push(key);
      }

      if (keys.length > 0) {
        setRecordedKeys(keys);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (recordedKeys.length > 0) {
        const newKey = recordedKeys.join('+');
        updateKeybinding(editingId!, newKey);
        setRecordingKey(false);
        setEditingId(null);
        setRecordedKeys([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [recordingKey, recordedKeys, editingId, updateKeybinding]);

  // Reset keybinding
  const resetKeybinding = (id: string) => {
    const defaultBinding = DEFAULT_KEYBINDINGS.find(kb => kb.id === id);
    if (defaultBinding) {
      const updated = keybindings.map(kb =>
        kb.id === id ? { ...defaultBinding, isCustom: false } : kb
      );
      saveKeybindings(updated);
    }
  };

  // Reset all
  const resetAll = () => {
    if (confirm('Reset all keyboard shortcuts to defaults?')) {
      saveKeybindings(DEFAULT_KEYBINDINGS);
    }
  };

  // Check if has conflict
  const hasConflict = (binding: KeyBinding): boolean => {
    const key = `${binding.key}${binding.when ? `|${binding.when}` : ''}`;
    const conflictCommands = conflicts.get(key);
    return conflictCommands ? conflictCommands.length > 1 : false;
  };

  return (
    <div className="flex h-full bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-700 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Categories */}
        <div className="flex-1 overflow-y-auto">
          {categories.map(category => {
            const count = category === 'All' 
              ? keybindings.length 
              : keybindings.filter(kb => kb.category === category).length;

            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-800 ${
                  selectedCategory === category ? 'bg-gray-800 border-l-2 border-blue-500' : ''
                }`}
              >
                <div className="text-sm font-medium">{category}</div>
                <div className="text-xs text-gray-400">{count} shortcuts</div>
              </button>
            );
          })}
        </div>

        {/* Reset all */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={resetAll}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium"
          >
            Reset All to Defaults
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Keyboard Shortcuts</h1>
            <p className="text-gray-400">
              {filteredKeybindings.length} shortcuts
              {conflicts.size > 0 && (
                <span className="ml-2 text-yellow-500">
                  • {conflicts.size} conflicts detected
                </span>
              )}
            </p>
          </div>

          {/* Shortcuts table */}
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Command</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Keybinding</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">When</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredKeybindings.map(binding => {
                  const isEditing = editingId === binding.id;
                  const conflict = hasConflict(binding);

                  return (
                    <tr
                      key={binding.id}
                      className={`hover:bg-gray-750 ${conflict ? 'bg-yellow-900/20' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{binding.description}</div>
                        <div className="text-xs text-gray-400 font-mono">{binding.command}</div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing && recordingKey ? (
                          <div className="px-3 py-1 bg-blue-600 rounded text-sm font-mono inline-block">
                            {recordedKeys.length > 0 ? recordedKeys.join('+') : 'Press keys...'}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <code className="px-3 py-1 bg-gray-700 rounded text-sm font-mono">
                              {binding.key}
                            </code>
                            {binding.isCustom && (
                              <span className="px-2 py-0.5 bg-blue-600 text-xs rounded">
                                Custom
                              </span>
                            )}
                            {conflict && (
                              <span className="px-2 py-0.5 bg-yellow-600 text-xs rounded">
                                Conflict
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {binding.when && (
                          <code className="text-xs text-gray-400 font-mono">{binding.when}</code>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => startRecording(binding.id)}
                            disabled={recordingKey}
                            className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50"
                          >
                            Change
                          </button>
                          {binding.isCustom && (
                            <button
                              onClick={() => resetKeybinding(binding.id)}
                              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {filteredKeybindings.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>No shortcuts found matching &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
