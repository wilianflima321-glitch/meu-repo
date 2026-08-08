'use client';

import React from 'react';
import { FlaskConical, Maximize2, Minimize2, Search, Split, X } from 'lucide-react';

import { ShellSelector, TerminalTab } from './XTerminalChrome';
import type { TerminalSession } from './terminalModels';
import { TerminalIconButton } from './terminalIconButton';
import { TerminalPtyHonestyBadge } from './TerminalPtyHonestyBadge';

interface TerminalSessionHeaderProps {
  sessions: TerminalSession[];
  activeSessionId: string | null;
  isConnected: boolean;
  showSearch: boolean;
  isMaximized: boolean;
  onSelectSession: (sessionId: string) => void;
  onCloseSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onCreateSession: (shellPath?: string) => void | Promise<unknown>;
  /** L.4 — open Forge sandbox lane (agent shell policy); omitted when no project bound. */
  onCreateForgeSession?: () => void | Promise<unknown>;
  onToggleSearch: () => void;
  onToggleMaximized: () => void;
  onClosePanel?: () => void;
}

export function TerminalSessionHeader({
  sessions,
  activeSessionId,
  isConnected,
  showSearch,
  isMaximized,
  onSelectSession,
  onCloseSession,
  onRenameSession,
  onCreateSession,
  onCreateForgeSession,
  onToggleSearch,
  onToggleMaximized,
  onClosePanel,
}: TerminalSessionHeaderProps) {
  const active = sessions.find((s) => s.id === activeSessionId);
  const selectedShell = active?.shell;
  const forgeActive = active?.executionLane === 'forge-sandbox';

  return (
    <div
      className="
        flex items-center justify-between
        min-h-[36px]
        bg-[var(--aethel-surface-primary)]
        border-b border-[var(--aethel-glass-border)]
      "
    >
      {/* ── Tab strip ── */}
      <div
        className="flex items-center overflow-x-auto flex-1 scrollbar-none"
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

        <ShellSelector
          onSelect={(shell) => { void onCreateSession(shell.path); }}
          selectedShell={selectedShell}
        />
      </div>

      {/* ── Right controls ── */}
      <div className="flex items-center gap-0.5 px-2 flex-shrink-0 border-l border-[var(--aethel-glass-border)]">

        {/* Block 9 — honest PTY path (cloud container ≠ local machine) */}
        <span className="mr-1">
          {forgeActive ? (
            <span
              role="status"
              title="Forge sandbox lane — agents use this path; not host PTY"
              className="inline-flex items-center gap-1 rounded border border-[color-mix(in_srgb,var(--aethel-neon-cyan)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-neon-cyan)_10%,transparent)] px-1.5 py-0 text-[9px] font-mono font-medium uppercase tracking-widest text-[var(--aethel-neon-cyan)]"
            >
              <FlaskConical className="h-2.5 w-2.5" aria-hidden />
              Forge
            </span>
          ) : (
            <TerminalPtyHonestyBadge compact />
          )}
        </span>

        {/* Connection dot */}
        <span
          title={isConnected ? 'Connected' : 'Disconnected'}
          className={`
            aethel-beacon flex h-2 w-2 mr-1
            ${isConnected ? 'text-emerald-400' : 'text-red-400'}
          `}
        >
          <span
            className={`block h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`}
          />
        </span>

        <div className="h-3.5 w-px bg-[var(--aethel-glass-border)] mx-0.5" />

        {/* Search toggle */}
        <TerminalIconButton
          onClick={onToggleSearch}
          label="Search terminal output (Ctrl+F)"
          aria-pressed={showSearch}
        >
          <Search
            size={13}
            className={showSearch ? 'text-[var(--aethel-neon-cyan)]' : ''}
          />
        </TerminalIconButton>

        {/* L.4 Forge sandbox pane */}
        {onCreateForgeSession && (
          <TerminalIconButton
            onClick={() => { void onCreateForgeSession(); }}
            label="New Forge sandbox terminal (agent lane — not host PTY)"
          >
            <FlaskConical size={13} />
          </TerminalIconButton>
        )}

        {/* Split — human host PTY */}
        <TerminalIconButton
          onClick={() => { void onCreateSession(); }}
          label="Split human terminal (host/cloud PTY — not agent)"
        >
          <Split size={13} />
        </TerminalIconButton>

        {/* Maximize */}
        <TerminalIconButton
          onClick={onToggleMaximized}
          label={isMaximized ? 'Restore terminal' : 'Maximize terminal'}
        >
          {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </TerminalIconButton>

        {/* Close panel */}
        {onClosePanel && (
          <TerminalIconButton onClick={onClosePanel} label="Close terminal panel">
            <X size={13} />
          </TerminalIconButton>
        )}
      </div>
    </div>
  );
}
