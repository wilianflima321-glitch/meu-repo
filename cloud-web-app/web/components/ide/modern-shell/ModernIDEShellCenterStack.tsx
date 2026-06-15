'use client';

import React from 'react';
import { TerminalSquare, X } from 'lucide-react';
import { ResizeHandle } from './ModernIDEShellChrome';
import {
  BORDER_SECONDARY,
  SURFACE_PRIMARY,
  chromeBarHeight,
  chromeBarPadding,
  iconButtonStyle,
} from './chromeStyles';
import type { BottomPanelMode } from './types';

interface ModernIDEShellCenterStackProps {
  editor: React.ReactNode;
  chat: React.ReactNode;
  terminal: React.ReactNode;
  chatOpen: boolean;
  chatSize: number;
  activeBottomPanel: BottomPanelMode;
  isCompact: boolean;
  editorColumnRef: React.RefObject<HTMLDivElement>;
  setChatSize: (size: number) => void;
  toggleChat: () => void;
  onSelectBottomPanel?: (panel: BottomPanelMode) => void;
  startVerticalResize: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Bottom dock chrome bar — shared between Agents and Terminal columns.
 */
function DockColumnHeader({
  label,
  onClose,
  ariaLabel,
}: {
  label: string;
  onClose: () => void;
  ariaLabel: string;
}) {
  return (
    <div
      className="flex items-center justify-between shrink-0 border-b border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/2 gap-2"
      style={{
        padding: chromeBarPadding,
        minHeight: chromeBarHeight,
      }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)]">
        {label}
      </span>
      <button
        type="button"
        onClick={onClose}
        style={iconButtonStyle}
        aria-label={ariaLabel}
        title={`Close ${label}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ModernIDEShellCenterStack({
  editor,
  chat,
  terminal,
  chatOpen,
  chatSize,
  isCompact,
  editorColumnRef,
  setChatSize,
  toggleChat,
  startVerticalResize,
}: ModernIDEShellCenterStackProps) {
  return (
    <div
      ref={editorColumnRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        minWidth: 0,
      }}
    >
      {/* Editor area */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          background: SURFACE_PRIMARY,
          minHeight: 0,
        }}
      >
        {editor}
      </div>

      {/* Bottom dock — Agents (55%) | Terminal (45%) simultaneously */}
      {chatOpen && !isCompact && (
        <>
          <ResizeHandle
            ariaLabel="Resize bottom dock"
            orientation="horizontal"
            onMouseDown={startVerticalResize}
            onAdjust={(delta) => setChatSize(chatSize + delta)}
            valueNow={chatSize}
            valueMin={18}
            valueMax={45}
          />
          <div
            className="flex flex-row overflow-hidden shrink-0 border-t border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-elevated)]"
            style={{
              height: `${chatSize}%`,
              minHeight: '140px',
              maxHeight: '44%',
            }}
            aria-label="Bottom dock: Agents and Terminal"
          >
            {/* === Agents Window — 55% === */}
            <div
              className="flex flex-col overflow-hidden border-r border-[var(--aethel-border-secondary)] min-w-0 flex-[0_0_55%]"
              aria-label="Agents Window"
            >
              <DockColumnHeader
                label="Agents"
                onClose={toggleChat}
                ariaLabel="Close bottom dock"
              />
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {chat}
              </div>
            </div>

            {/* === Terminal — 45% === */}
            <div
              className="flex flex-col overflow-hidden min-w-0 flex-[0_0_45%]"
              aria-label="Terminal"
            >
              <div
                className="flex items-center gap-[6px] shrink-0 border-b border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/2"
                style={{
                  padding: chromeBarPadding,
                  minHeight: chromeBarHeight,
                }}
              >
                <TerminalSquare size={12} className="text-[var(--aethel-text-tertiary)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-secondary)]">
                  Terminal
                </span>
              </div>
              <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                {terminal}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ModernIDEShellCenterStack;
