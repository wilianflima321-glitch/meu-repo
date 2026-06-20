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

      {/* Floating Glassmorphism AI Chat (Wave 12.0) */}
      {chatOpen && !isCompact && (
        <div
          className="animate-in fade-in slide-in-from-right-4 duration-200"
          style={{
            position: 'absolute',
            right: '24px',
            top: '24px',
            bottom: '24px',
            width: '420px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '16px',
            border: `1px solid rgba(255,255,255,0.1)`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 50,
          }}
        >
          <DockColumnHeader
            label="Aethel Assistant (Cmd+J)"
            onClose={toggleChat}
            ariaLabel="Close AI Chat"
          />
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {chat}
          </div>
        </div>
      )}

      {/* Bottom dock — Terminal only now (since chat is floating) */}
      {/* Terminal in Bottom Dock */}
      {terminal && !isCompact && (
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
            aria-label="Bottom dock: Terminal"
          >
            {/* === Terminal — 100% === */}
            <div
              className="flex flex-col overflow-hidden min-w-0 flex-1"
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
