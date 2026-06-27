'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Terminal as TerminalIcon,
  Plus,
  ChevronDown,
  X,
  Search,
  FlaskConical,
  Maximize2,
  Minimize2,
  Copy,
  Check,
} from 'lucide-react';

import type { ShellOption, TerminalSession } from './terminalModels';
import { SHELL_OPTIONS } from './terminalModels';

// ─────────────────── Native Experimental Badge ───────────────────

export function NativeExperimentalBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      title="This terminal module is Web-based. Rust native acceleration is in development."
      aria-label="Native Experimental — Rust runtime not yet active for this component"
      className={`
        inline-flex items-center gap-1 rounded border animate-glow-amber
        font-mono font-medium uppercase tracking-widest select-none
        border-amber-400/45 bg-amber-400/8 text-amber-400
        transition-all duration-300
        ${compact ? 'px-1.5 py-0 text-[9px]' : 'px-2 py-0.5 text-[10px]'}
      `}
    >
      <FlaskConical className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} aria-hidden />
      {compact ? 'Exp.' : 'Native Experimental'}
    </span>
  );
}

// ─────────────────── Terminal Tab ───────────────────

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
  const [editName, setEditName]   = useState(session.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const commit = () => {
    onRename(editName.trim() || session.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    else if (e.key === 'Escape') { setEditName(session.name); setIsEditing(false); }
  };

  return (
    <div
      className={`
        group relative flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none
        min-w-0 max-w-[180px] border-r border-[var(--aethel-glass-border)]
        transition-all duration-150
        ${isActive
          ? 'bg-[var(--aethel-surface-secondary)] text-[var(--aethel-text-primary)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1.5px] after:bg-[var(--aethel-neon-cyan)] after:shadow-[0_0_8px_var(--aethel-neon-cyan)]'
          : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-primary)]'
        }
      `}
      onClick={onSelect}
      onDoubleClick={() => setIsEditing(true)}
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
    >
      <TerminalIcon
        size={13}
        className={`flex-shrink-0 transition-colors ${isActive ? 'text-[var(--aethel-neon-cyan)]' : ''}`}
      />

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-mono"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-xs font-mono">{session.name}</span>
      )}

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--aethel-surface-quaternary)] transition-all"
        aria-label={`Close ${session.name}`}
      >
        <X size={11} />
      </button>
    </div>
  );
};

// ─────────────────── Shell Selector ───────────────────

interface ShellSelectorProps {
  onSelect: (shell: ShellOption) => void;
  selectedShell?: string;
}

export const ShellSelector: React.FC<ShellSelectorProps> = ({ onSelect, selectedShell }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="
          flex items-center gap-1 px-2 py-1 rounded-md text-xs
          text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)]
          hover:bg-[var(--aethel-surface-tertiary)] transition-all
        "
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="New terminal"
      >
        <Plus size={13} />
        <ChevronDown size={10} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-1.5 w-52 z-50 py-1 rounded-xl
            aethel-glass border border-[var(--aethel-glass-border)]
            shadow-[var(--aethel-shadow-xl)]
            animate-[scaleIn_.12s_ease-out_both]
          "
          role="listbox"
        >
          <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest text-[var(--aethel-text-quaternary)] border-b border-[var(--aethel-glass-border)]">
            New Terminal
          </div>
          {SHELL_OPTIONS.map((shell) => (
            <button
              type="button"
              key={shell.id}
              onClick={() => { onSelect(shell); setIsOpen(false); }}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors
                hover:bg-[var(--aethel-surface-tertiary)]
                ${selectedShell === shell.path
                  ? 'text-[var(--aethel-neon-cyan)]'
                  : 'text-[var(--aethel-text-secondary)]'}
              `}
              role="option"
              aria-selected={selectedShell === shell.path}
            >
              <TerminalIcon size={13} className="flex-shrink-0" />
              <span className="flex-1">{shell.name}</span>
              {selectedShell === shell.path && (
                <span className="text-[10px] text-[var(--aethel-neon-cyan)] opacity-70">active</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────── Copy Button ───────────────────

export function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(getText());
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy terminal contents"
      className="p-1 rounded text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] transition-all"
    >
      {copied ? <Check size={13} className="text-[var(--aethel-success)]" /> : <Copy size={13} />}
    </button>
  );
}

// ─────────────────── Search Bar ───────────────────

interface SearchBarProps {
  onSearch: (term: string) => void;
  onSearchNext: () => void;
  onSearchPrevious: () => void;
  onClose: () => void;
  matchCount?: number;
  currentMatch?: number;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch, onSearchNext, onSearchPrevious, onClose,
  matchCount = 0, currentMatch = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const t = window.setTimeout(() => onSearch(searchTerm), 150);
    return () => window.clearTimeout(t);
  }, [onSearch, searchTerm]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') e.shiftKey ? onSearchPrevious() : onSearchNext();
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[var(--aethel-glass-border)] bg-[var(--aethel-surface-primary)]">
      <Search size={12} className="text-[var(--aethel-text-quaternary)]" />
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search…"
        className="
          flex-1 bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)]
          rounded-md px-2 py-0.5 text-xs font-mono text-[var(--aethel-text-primary)]
          placeholder:text-[var(--aethel-text-quaternary)] outline-none
          focus:border-[var(--aethel-neon-cyan)] focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--aethel-neon-cyan)_10%,transparent)]
          transition-all
        "
      />
      {searchTerm && (
        <span className="text-[10px] font-mono text-[var(--aethel-text-quaternary)]">
          {matchCount > 0 ? `${currentMatch}/${matchCount}` : 'No results'}
        </span>
      )}
      {[
        { label: '↑ Prev', action: onSearchPrevious, disabled: matchCount === 0 },
        { label: '↓ Next', action: onSearchNext,     disabled: matchCount === 0 },
      ].map(({ label, action, disabled }) => (
        <button
          key={label}
          type="button"
          onClick={action}
          disabled={disabled}
          className="px-1.5 py-0.5 rounded text-[10px] font-mono text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] disabled:opacity-30 transition-all"
        >
          {label}
        </button>
      ))}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close search"
        className="p-0.5 rounded text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] transition-all"
      >
        <X size={12} />
      </button>
    </div>
  );
};

// ─────────────────── Full Terminal Chrome ───────────────────

interface XTerminalChromeProps {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onCloseSession: (id: string) => void;
  onRenameSession: (id: string, name: string) => void;
  onNewSession: (shell: ShellOption) => void;
  onSearch: (term: string) => void;
  onSearchNext: () => void;
  onSearchPrevious: () => void;
  searchMatchCount?: number;
  searchCurrentMatch?: number;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  getTerminalText?: () => string;
}

export const XTerminalChrome: React.FC<XTerminalChromeProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCloseSession,
  onRenameSession,
  onNewSession,
  onSearch,
  onSearchNext,
  onSearchPrevious,
  searchMatchCount = 0,
  searchCurrentMatch = 0,
  isExpanded = false,
  onToggleExpand,
  getTerminalText = () => '',
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      className="flex flex-col h-full rounded-xl overflow-hidden"
      style={{
        background: 'var(--aethel-surface-elevated)',
        border: '1px solid color-mix(in srgb, var(--aethel-neon-cyan) 14%, transparent)',
        boxShadow: '0 0 0 1px var(--aethel-bg-base), 0 24px 48px color-mix(in srgb, var(--aethel-bg-base) 55%, transparent), inset 0 0 32px color-mix(in srgb, var(--aethel-neon-cyan) 3%, transparent)',
      }}
    >
      {/* ── Tab Bar ── */}
      <div
        className="relative flex items-center border-b min-h-[36px]"
        style={{
          background: 'var(--aethel-surface-primary)',
          borderColor: 'color-mix(in srgb, var(--aethel-neon-cyan) 14%, transparent)',
        }}
      >
        {/* Neon top line */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--aethel-neon-cyan)_50%,transparent)] to-transparent" />
        {/* Tabs */}
        <div
          className="flex flex-1 overflow-x-auto scrollbar-none"
          role="tablist"
          aria-label="Terminal sessions"
        >
          {sessions.map((session) => (
            <TerminalTab
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onSelect={() => onSelectSession(session.id)}
              onClose={() => onCloseSession(session.id)}
              onRename={(name) => onRenameSession(session.id, name)}
            />
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-0.5 px-2 flex-shrink-0 border-l border-[var(--aethel-glass-border)]">
          <NativeExperimentalBadge compact />

          <div className="h-3.5 w-px bg-[var(--aethel-glass-border)] mx-1" />

          <ShellSelector
            onSelect={onNewSession}
            selectedShell={activeSession?.shell}
          />

          <button
            type="button"
            onClick={() => setShowSearch((v) => !v)}
            aria-label="Search terminal output"
            className={`
              p-1.5 rounded transition-all
              ${showSearch
                ? 'text-[var(--aethel-neon-cyan)] bg-[var(--aethel-surface-tertiary)]'
                : 'text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)]'
              }
            `}
          >
            <Search size={12} />
          </button>

          <CopyButton getText={getTerminalText} />

          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label={isExpanded ? 'Restore terminal' : 'Maximize terminal'}
              className="p-1.5 rounded text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-surface-tertiary)] transition-all"
            >
              {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          )}
        </div>
      </div>

      {/* ── Search ── */}
      {showSearch && (
        <SearchBar
          onSearch={onSearch}
          onSearchNext={onSearchNext}
          onSearchPrevious={onSearchPrevious}
          onClose={() => setShowSearch(false)}
          matchCount={searchMatchCount}
          currentMatch={searchCurrentMatch}
        />
      )}

      {/* ── Xterm content slot ── */}
      <div
        id="xterm-content-slot"
        className="relative flex-1 min-h-0 font-mono"
        aria-label="Terminal output"
        style={{ background: 'var(--aethel-bg-base)' }}
      >
        {/* Subtle scanline effect */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, color-mix(in srgb, var(--aethel-neon-cyan) 0.8%, transparent) 2px, color-mix(in srgb, var(--aethel-neon-cyan) 0.8%, transparent) 4px)',
            mixBlendMode: 'screen',
          }}
        />
      </div>
    </div>
  );
};

export default XTerminalChrome;
