'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  Plus,
  Search,
  ChevronDown,
  MoreHorizontal,
  Archive,
  Trash2,
} from 'lucide-react';

interface TerminalSessionView {
  id: string;
  name: string;
  shell: string;
}

// ============================================================================
// Terminal Tab Component
// ============================================================================

interface TerminalTabProps {
  session: TerminalSessionView;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  onRename: (name: string) => void;
}

export const TerminalTab: React.FC<TerminalTabProps> = ({
  session,
  isActive,
  onSelect,
  onClose,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRename(editName.trim() || session.name);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditName(session.name);
      setIsEditing(false);
    }
  };
  
  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 border-r border-[#3c3c3c] 
        cursor-pointer select-none min-w-0 max-w-[200px] group
        ${isActive 
          ? 'bg-[#1e1e1e] text-white' 
          : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#323232] hover:text-gray-300'
        }
      `}
      onClick={onSelect}
      onDoubleClick={() => setIsEditing(true)}
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
    >
      <TerminalIcon size={14} className="flex-shrink-0" />
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => {
            onRename(editName.trim() || session.name);
            setIsEditing(false);
          }}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-sm">{session.name}</span>
      )}
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[#4c4c4c] transition-opacity"
        aria-label="Close terminal"
      >
        <X size={12} />
      </button>
    </div>
  );
};

// ============================================================================
// Shell Selector
// ============================================================================

interface ShellOption {
  id: string;
  name: string;
  path: string;
  icon?: React.ReactNode;
}

const SHELL_OPTIONS: ShellOption[] = [
  { id: 'bash', name: 'Bash', path: '/bin/bash' },
  { id: 'zsh', name: 'Zsh', path: '/bin/zsh' },
  { id: 'fish', name: 'Fish', path: '/usr/bin/fish' },
  { id: 'pwsh', name: 'PowerShell', path: 'pwsh' },
  { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' },
  { id: 'node', name: 'Node.js', path: 'node' },
  { id: 'python', name: 'Python', path: 'python3' },
];

interface ShellSelectorProps {
  onSelect: (shell: ShellOption) => void;
  selectedShell?: string;
}

export const ShellSelector: React.FC<ShellSelectorProps> = ({ onSelect, selectedShell }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-gray-400 hover:text-white hover:bg-[#3c3c3c] rounded"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Plus size={14} />
        <ChevronDown size={12} />
      </button>
      
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-48 bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg shadow-xl z-50 py-1"
          role="listbox"
        >
          <div className="px-3 py-1.5 text-xs text-gray-500 uppercase tracking-wide border-b border-[#3c3c3c]">
            New Terminal
          </div>
          {SHELL_OPTIONS.map((shell) => (
            <button
              key={shell.id}
              onClick={() => {
                onSelect(shell);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                hover:bg-[#3c3c3c] transition-colors
                ${selectedShell === shell.path ? 'text-blue-400' : 'text-gray-300'}
              `}
              role="option"
              aria-selected={selectedShell === shell.path}
            >
              <TerminalIcon size={14} />
              <span>{shell.name}</span>
              {selectedShell === shell.path && (
                <span className="ml-auto text-xs text-blue-400">Default</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Search Bar
// ============================================================================

interface SearchBarProps {
  onSearch: (term: string) => void;
  onSearchNext: () => void;
  onSearchPrevious: () => void;
  onClose: () => void;
  matchCount?: number;
  currentMatch?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onSearchNext,
  onSearchPrevious,
  onClose,
  matchCount = 0,
  currentMatch = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  useEffect(() => {
    const debounce = setTimeout(() => {
      onSearch(searchTerm);
    }, 150);
    return () => clearTimeout(debounce);
  }, [searchTerm, onSearch]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.shiftKey ? onSearchPrevious() : onSearchNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
      <Search size={14} className="text-gray-500" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="flex-1 bg-[#3c3c3c] border border-[#4c4c4c] rounded px-2 py-1 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
      />
      {searchTerm && (
        <span className="text-xs text-gray-500">
          {matchCount > 0 ? `${currentMatch}/${matchCount}` : 'No results'}
        </span>
      )}
      <button
        onClick={onSearchPrevious}
        className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
        aria-label="Previous match"
        disabled={matchCount === 0}
      >
        <ChevronDown size={14} className="rotate-180" />
      </button>
      <button
        onClick={onSearchNext}
        className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
        aria-label="Next match"
        disabled={matchCount === 0}
      >
        <ChevronDown size={14} />
      </button>
      <button
        onClick={onClose}
        className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
        aria-label="Close search"
      >
        <X size={14} />
      </button>
    </div>
  );
};

