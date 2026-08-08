'use client';

import React, { useCallback, useState } from 'react';
import { Plus, Split, X, FlaskConical, Terminal } from 'lucide-react';
import { XTerminal } from './BaseXTerminal';
import { TerminalIconButton } from './terminalIconButton';

export interface MultiTerminalPanelProps {
  className?: string;
  initialSessions?: number;
  onClose?: () => void;
  /** L.4 — enables Forge sandbox terminal entry when project is bound. */
  forgeProjectId?: string;
  existingSandboxSessionId?: string;
}

export const MultiTerminalPanel: React.FC<MultiTerminalPanelProps> = ({
  className = '',
  initialSessions = 1,
  onClose,
  forgeProjectId,
  existingSandboxSessionId,
}) => {
  const [terminals, setTerminals] = useState<string[]>(() =>
    Array.from({ length: initialSessions }, () => crypto.randomUUID())
  );
  const [splitDirection, setSplitDirection] = useState<'horizontal' | 'vertical'>('horizontal');

  const addTerminal = useCallback(() => {
    setTerminals((prev) => [...prev, crypto.randomUUID()]);
  }, []);

  const removeTerminal = useCallback((index: number) => {
    setTerminals((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleSplitDirection = useCallback(() => {
    setSplitDirection((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  }, []);

  // Empty state
  if (terminals.length === 0) {
    return (
      <div className={`flex flex-col h-full items-center justify-center gap-3 bg-[var(--aethel-surface-primary)] ${className}`}>
        <div className="animate-float flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--aethel-glass-border)] bg-[var(--aethel-surface-secondary)]">
          <Terminal className="h-5 w-5 text-[var(--aethel-text-quaternary)]" />
        </div>
        <p className="text-xs text-[var(--aethel-text-quaternary)]">No terminal sessions</p>
        <button
          type="button"
          onClick={addTerminal}
          className="
            flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium
            border border-[var(--aethel-glass-border)]
            text-[var(--aethel-text-secondary)] hover:text-[var(--aethel-neon-cyan)]
            hover:border-cyan-500/30 hover:bg-cyan-500/8
            transition-all duration-200
          "
        >
          <Plus className="h-3.5 w-3.5" />
          New terminal
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[var(--aethel-surface-primary)] ${className}`}>

      {/* ── Panel toolbar ── */}
      <div
        className="
          flex items-center justify-between
          px-2 py-1
          bg-[var(--aethel-surface-primary)]
          border-b border-[var(--aethel-glass-border)]
          min-h-[32px]
        "
      >
        <div className="flex items-center gap-1">
          {/* New terminal */}
          <TerminalIconButton compact onClick={addTerminal} label="New terminal">
            <Plus size={13} />
          </TerminalIconButton>

          {/* Split direction toggle */}
          <TerminalIconButton
            compact
            onClick={toggleSplitDirection}
            label={`Switch to ${splitDirection === 'horizontal' ? 'vertical' : 'horizontal'} split`}
          >
            <Split
              size={13}
              className={splitDirection === 'vertical' ? 'rotate-90 transition-transform' : 'transition-transform'}
            />
          </TerminalIconButton>
        </div>

        <div className="flex items-center gap-2">
          {/* Honesty gate — multi-terminal panel level */}
          <span
            title="Terminal panels use WebSocket transport. Rust native backend is in development."
            className="
              hidden sm:inline-flex items-center gap-1 rounded border animate-glow-amber
              border-amber-400/35 bg-amber-400/6 text-amber-400/80
              px-1.5 py-0 text-[9px] font-mono uppercase tracking-widest select-none
            "
          >
            <FlaskConical className="h-2.5 w-2.5" aria-hidden />
            Native Experimental
          </span>

          {onClose && (
            <TerminalIconButton compact onClick={onClose} label="Close terminal panel">
              <X size={13} />
            </TerminalIconButton>
          )}
        </div>
      </div>

      {/* ── Terminal panes ── */}
      <div
        className={`
          flex-1 flex min-h-0
          ${splitDirection === 'horizontal' ? 'flex-row' : 'flex-col'}
          gap-px
          bg-[var(--aethel-glass-border)]
        `}
      >
        {terminals.map((id, index) => (
          <div key={id} className="flex-1 min-w-0 min-h-0">
            <XTerminal
              sessionId={id}
              className="rounded-none border-0"
              forgeProjectId={forgeProjectId}
              existingSandboxSessionId={existingSandboxSessionId}
              onClose={terminals.length > 1 ? () => removeTerminal(index) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiTerminalPanel;
