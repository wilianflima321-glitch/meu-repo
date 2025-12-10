'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Command {
  id: string;
  title: string;
  category: string;
  action: () => void | Promise<void>;
  keybinding?: string;
  icon?: string;
}

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commands, setCommands] = useState<Command[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      loadCommands();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executeCommand(filteredCommands[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, query]);

  const loadCommands = () => {
    const allCommands: Command[] = [
      // File Commands
      {
        id: 'file.new',
        title: 'New File',
        category: 'File',
        action: () => router.push('/editor?new=true'),
        keybinding: 'Ctrl+N',
        icon: '📄'
      },
      {
        id: 'file.open',
        title: 'Open File',
        category: 'File',
        action: () => {
          const event = new CustomEvent('quick-open');
          window.dispatchEvent(event);
        },
        keybinding: 'Ctrl+O',
        icon: '📂'
      },
      {
        id: 'file.save',
        title: 'Save File',
        category: 'File',
        action: () => {
          const event = new CustomEvent('save-file');
          window.dispatchEvent(event);
        },
        keybinding: 'Ctrl+S',
        icon: '💾'
      },

      // View Commands
      {
        id: 'view.terminal',
        title: 'Toggle Terminal',
        category: 'View',
        action: () => router.push('/terminal'),
        keybinding: 'Ctrl+`',
        icon: '⌨️'
      },
      {
        id: 'view.git',
        title: 'Open Git Panel',
        category: 'View',
        action: () => router.push('/git'),
        keybinding: 'Ctrl+Shift+G',
        icon: '🔀'
      },
      {
        id: 'view.testing',
        title: 'Open Test Explorer',
        category: 'View',
        action: () => router.push('/testing'),
        keybinding: 'Ctrl+Shift+T',
        icon: '🧪'
      },
      {
        id: 'view.debugger',
        title: 'Open Debugger',
        category: 'View',
        action: () => router.push('/debugger'),
        keybinding: 'Ctrl+Shift+D',
        icon: '🐛'
      },
      {
        id: 'view.marketplace',
        title: 'Open Extension Marketplace',
        category: 'View',
        action: () => router.push('/marketplace'),
        keybinding: 'Ctrl+Shift+X',
        icon: '🧩'
      },
      {
        id: 'view.explorer',
        title: 'Open File Explorer',
        category: 'View',
        action: () => router.push('/explorer'),
        keybinding: 'Ctrl+Shift+E',
        icon: '📁'
      },
      {
        id: 'view.search',
        title: 'Open Search',
        category: 'View',
        action: () => router.push('/search'),
        keybinding: 'Ctrl+Shift+F',
        icon: '🔍'
      },

      // Git Commands
      {
        id: 'git.commit',
        title: 'Git: Commit',
        category: 'Git',
        action: () => {
          const event = new CustomEvent('git-commit');
          window.dispatchEvent(event);
        },
        icon: '✅'
      },
      {
        id: 'git.push',
        title: 'Git: Push',
        category: 'Git',
        action: () => {
          const event = new CustomEvent('git-push');
          window.dispatchEvent(event);
        },
        icon: '⬆️'
      },
      {
        id: 'git.pull',
        title: 'Git: Pull',
        category: 'Git',
        action: () => {
          const event = new CustomEvent('git-pull');
          window.dispatchEvent(event);
        },
        icon: '⬇️'
      },
      {
        id: 'git.branch',
        title: 'Git: Create Branch',
        category: 'Git',
        action: () => {
          const event = new CustomEvent('git-create-branch');
          window.dispatchEvent(event);
        },
        icon: '🌿'
      },

      // Debug Commands
      {
        id: 'debug.start',
        title: 'Start Debugging',
        category: 'Debug',
        action: () => {
          const event = new CustomEvent('start-debugging');
          window.dispatchEvent(event);
        },
        keybinding: 'F5',
        icon: '▶️'
      },
      {
        id: 'debug.stop',
        title: 'Stop Debugging',
        category: 'Debug',
        action: () => {
          const event = new CustomEvent('stop-debugging');
          window.dispatchEvent(event);
        },
        keybinding: 'Shift+F5',
        icon: '⏹️'
      },

      // Test Commands
      {
        id: 'test.run',
        title: 'Run Tests',
        category: 'Test',
        action: () => {
          const event = new CustomEvent('run-tests');
          window.dispatchEvent(event);
        },
        keybinding: 'F6',
        icon: '🧪'
      },
      {
        id: 'test.debug',
        title: 'Debug Tests',
        category: 'Test',
        action: () => {
          const event = new CustomEvent('debug-tests');
          window.dispatchEvent(event);
        },
        icon: '🐛'
      },

      // Edit Commands
      {
        id: 'edit.find',
        title: 'Find',
        category: 'Edit',
        action: () => {
          const event = new CustomEvent('find');
          window.dispatchEvent(event);
        },
        keybinding: 'Ctrl+F',
        icon: '🔍'
      },
      {
        id: 'edit.replace',
        title: 'Replace',
        category: 'Edit',
        action: () => {
          const event = new CustomEvent('replace');
          window.dispatchEvent(event);
        },
        keybinding: 'Ctrl+H',
        icon: '🔄'
      },
      {
        id: 'edit.format',
        title: 'Format Document',
        category: 'Edit',
        action: () => {
          const event = new CustomEvent('format-document');
          window.dispatchEvent(event);
        },
        keybinding: 'Ctrl+Shift+F',
        icon: '✨'
      },

      // Settings Commands
      {
        id: 'settings.open',
        title: 'Open Settings',
        category: 'Settings',
        action: () => router.push('/settings'),
        keybinding: 'Ctrl+,',
        icon: '⚙️'
      },
      {
        id: 'settings.keyboard',
        title: 'Keyboard Shortcuts',
        category: 'Settings',
        action: () => router.push('/settings/keyboard'),
        keybinding: 'Ctrl+K Ctrl+S',
        icon: '⌨️'
      }
    ];

    setCommands(allCommands);
  };

  const filteredCommands = commands.filter(cmd => {
    const searchText = `${cmd.title} ${cmd.category}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  });

  const executeCommand = async (command: Command) => {
    if (!command) return;
    
    try {
      await command.action();
      onClose();
    } catch (error) {
      console.error('Failed to execute command:', error);
    }
  };

  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-20">
      <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[600px] overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-700">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 bg-slate-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Commands List */}
        <div className="overflow-y-auto max-h-[500px]">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className="p-2">
                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase">
                  {category}
                </div>
                {cmds.map((cmd, index) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={cmd.id}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`w-full px-3 py-2 flex items-center justify-between rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-purple-600 text-white'
                          : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {cmd.icon && <span className="text-xl">{cmd.icon}</span>}
                        <span>{cmd.title}</span>
                      </div>
                      {cmd.keybinding && (
                        <span className="text-xs opacity-75 font-mono">
                          {cmd.keybinding}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
          <div className="flex gap-4">
            <span>↑↓ Navigate</span>
            <span>↵ Execute</span>
            <span>Esc Close</span>
          </div>
          <div>
            {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
