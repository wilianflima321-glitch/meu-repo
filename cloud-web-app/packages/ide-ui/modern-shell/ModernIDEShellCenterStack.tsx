'use client';

import React from 'react';
import { X } from 'lucide-react';
import { DockPanel, DockRegion, DockResizeHandle, useWorkspaceStore } from '../docking';
import {
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
  isCompact,
  editorColumnRef,
  toggleChat,
}: ModernIDEShellCenterStackProps) {
  const store = useWorkspaceStore();
  const bottomBarSize = store((s) => s.regions.bottomBar.size);

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
            right: 'var(--aethel-space-6)',
            top: 'var(--aethel-space-6)',
            bottom: 'var(--aethel-space-6)',
            width: '420px',
            background: 'var(--aethel-panel-strong)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 'var(--aethel-radius-lg)',
            border: '1px solid var(--aethel-border-subtle)',
            boxShadow: 'var(--aethel-shadow-xl)',
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

      {/* Bottom dock — a real Docking Engine region. Terminal lives here as a dockable
          tab; drag it onto the Explorer/Git/Research strip (or vice versa) — both
          regions share the one WorkspaceProvider mounted by ModernIDEShell. */}
      {terminal && !isCompact && (
        <>
          <DockResizeHandle regionId="bottomBar" orientation="horizontal" containerRef={editorColumnRef} min={18} max={45} growsWithPointer={false} />
          <div
            className="flex flex-row overflow-hidden shrink-0 border-t border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-elevated)]"
            style={{
              height: `${bottomBarSize}%`,
              minHeight: '140px',
              maxHeight: '44%',
            }}
            aria-label="Bottom dock"
          >
            <DockRegion regionId="bottomBar" />
            <div style={{ display: 'none' }} aria-hidden>
              <DockPanel id="terminal" title="Terminal" defaultRegion="bottomBar">
                {terminal}
              </DockPanel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ModernIDEShellCenterStack;
