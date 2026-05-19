'use client';

import React, { useCallback, useState } from 'react';
import { Plus, Split, X } from 'lucide-react';
import { XTerminal } from './BaseXTerminal';
import { TerminalIconButton } from './terminalIconButton';

export interface MultiTerminalPanelProps {
  className?: string;
  initialSessions?: number;
  onClose?: () => void;
}

export const MultiTerminalPanel: React.FC<MultiTerminalPanelProps> = ({
  className = '',
  initialSessions = 1,
  onClose,
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

  if (terminals.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between px-2 py-1 bg-[var(--aethel-surface-secondary)] border-b border-[var(--aethel-border-primary)]">
        <div className="flex items-center gap-2">
          <TerminalIconButton compact onClick={addTerminal} label="New terminal">
            <Plus size={14} />
          </TerminalIconButton>

          <TerminalIconButton
            compact
            onClick={toggleSplitDirection}
            label="Toggle split direction"
          >
            <Split size={14} className={splitDirection === 'vertical' ? 'rotate-90' : ''} />
          </TerminalIconButton>
        </div>

        {onClose && (
          <TerminalIconButton compact onClick={onClose} label="Close terminal panel">
            <X size={14} />
          </TerminalIconButton>
        )}
      </div>

      <div
        className={`flex-1 flex ${
          splitDirection === 'horizontal' ? 'flex-row' : 'flex-col'
        } gap-px bg-[var(--aethel-surface-tertiary)]`}
      >
        {terminals.map((id, index) => (
          <div key={id} className="flex-1 min-w-0 min-h-0">
            <XTerminal
              sessionId={id}
              onClose={terminals.length > 1 ? () => removeTerminal(index) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiTerminalPanel;
