'use client';

import React from 'react';
import {
  Maximize2,
  Minimize2,
  Search,
  Split,
  X,
} from 'lucide-react';

import { ShellSelector, TerminalTab } from './XTerminalChrome';
import type { TerminalSession } from './terminalModels';
import { TerminalIconButton } from './terminalIconButton';

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
  onToggleSearch,
  onToggleMaximized,
  onClosePanel,
}: TerminalSessionHeaderProps) {
  const selectedShell = sessions.find((session) => session.id === activeSessionId)?.shell;

  return (
    <div className="flex items-center justify-between bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)] min-h-[35px]">
      <div className="flex items-center overflow-x-auto flex-1" role="tablist">
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
          onSelect={(shell) => {
            void onCreateSession(shell.path);
          }}
          selectedShell={selectedShell}
        />
      </div>

      <div className="flex items-center gap-1 px-2">
        <div
          className={`w-2 h-2 rounded-full mr-2 ${
            isConnected
              ? 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]'
              : 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)]'
          }`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />

        <TerminalIconButton
          onClick={onToggleSearch}
          label="Toggle search"
          aria-pressed={showSearch}
        >
          <Search size={14} />
        </TerminalIconButton>

        <TerminalIconButton
          onClick={() => {
            void onCreateSession();
          }}
          label="Split terminal"
        >
          <Split size={14} />
        </TerminalIconButton>

        <TerminalIconButton
          onClick={onToggleMaximized}
          label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </TerminalIconButton>

        {onClosePanel && (
          <TerminalIconButton onClick={onClosePanel} label="Close terminal panel">
            <X size={14} />
          </TerminalIconButton>
        )}
      </div>
    </div>
  );
}
