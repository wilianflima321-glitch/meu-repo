'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Search, Terminal as TerminalIcon, X } from 'lucide-react';

import type { ShellOption, TerminalSession } from './terminalModels';
import { SHELL_OPTIONS } from './terminalModels';

interface TerminalTabProps {
  session: TerminalSession;
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
        flex items-center gap-2 px-3 py-1.5 border-r border-[var(--aethel-border-primary)]
        cursor-pointer select-none min-w-0 max-w-[200px] group
        ${
          isActive
            ? 'bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)]'
            : 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)] hover:text-[var(--aethel-text-secondary)]'
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
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--aethel-surface-quaternary)] transition-opacity"
        aria-label="Close terminal"
      >
        <X size={12} />
      </button>
    </div>
  );
};

interface ShellSelectorProps {
  onSelect: (shell: ShellOption) => void;
  selectedShell?: string;
}

export const ShellSelector: React.FC<ShellSelectorProps> = ({
  onSelect,
  selectedShell,
}) => {
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
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-1 px-2 py-1 text-sm text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] rounded"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Plus size={14} />
        <ChevronDown size={12} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-48 bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)] rounded-lg shadow-xl z-50 py-1"
          role="listbox"
        >
          <div className="px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] uppercase tracking-wide border-b border-[var(--aethel-border-primary)]">
            New Terminal
          </div>
          {SHELL_OPTIONS.map((shell) => (
            <button
              type="button"
              key={shell.id}
              onClick={() => {
                onSelect(shell);
                setIsOpen(false);
              }}
              className={`
                w-full flex items-center gap-2 px-3 py-2 text-sm text-left
                hover:bg-[var(--aethel-surface-tertiary)] transition-colors
                ${
                  selectedShell === shell.path
                    ? 'text-[var(--aethel-info-light)]'
                    : 'text-[var(--aethel-text-secondary)]'
                }
              `}
              role="option"
              aria-selected={selectedShell === shell.path}
            >
              <TerminalIcon size={14} />
              <span>{shell.name}</span>
              {selectedShell === shell.path && (
                <span className="ml-auto text-xs text-[var(--aethel-info-light)]">Default</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

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
    const debounce = window.setTimeout(() => {
      onSearch(searchTerm);
    }, 150);

    return () => window.clearTimeout(debounce);
  }, [onSearch, searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.shiftKey ? onSearchPrevious() : onSearchNext();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
      <Search size={14} className="text-[var(--aethel-text-secondary)]" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        className="flex-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-strong)] rounded px-2 py-1 text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] outline-none focus:border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]"
      />
      {searchTerm && (
        <span className="text-xs text-[var(--aethel-text-secondary)]">
          {matchCount > 0 ? `${currentMatch}/${matchCount}` : 'No results'}
        </span>
      )}
      <button
        type="button"
        onClick={onSearchPrevious}
        className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
        aria-label="Previous match"
        disabled={matchCount === 0}
      >
        <ChevronDown size={14} className="rotate-180" />
      </button>
      <button
        type="button"
        onClick={onSearchNext}
        className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
        aria-label="Next match"
        disabled={matchCount === 0}
      >
        <ChevronDown size={14} />
      </button>
      <button
        type="button"
        onClick={onClose}
        className="p-1 hover:bg-[var(--aethel-surface-tertiary)] rounded text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-text-primary)]"
        aria-label="Close search"
      >
        <X size={14} />
      </button>
    </div>
  );
};
