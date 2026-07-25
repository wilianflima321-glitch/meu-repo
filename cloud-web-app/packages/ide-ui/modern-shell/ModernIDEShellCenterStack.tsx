'use client';

import React from 'react';
import { X } from 'lucide-react';
import { IdeDiagnosticsDock } from '../../../web/components/ide/IdeDiagnosticsDock';
import { WorkbenchEmptyState } from '../../../web/components/ui/WorkbenchSurfaceStates';
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
      className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_8%,transparent)]"
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
  activeBottomPanel,
  isCompact,
  editorColumnRef,
  toggleChat,
  onSelectBottomPanel,
}: ModernIDEShellCenterStackProps) {
  const store = useWorkspaceStore();
  const bottomBarSize = store((s) => s.regions.bottomBar.size);

  const bottomDockVisible = !isCompact && Boolean(terminal || chat)
  const showChatInDock = activeBottomPanel === 'chat'
  const showDiagnosticsInDock = activeBottomPanel === 'diagnostics'
  const showTerminalInDock = activeBottomPanel === 'terminal'

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

      {/* Floating chat only when dock is hidden (compact) or chat requested as overlay */}
      {chatOpen && isCompact && (
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

      {bottomDockVisible && (
        <>
          <DockResizeHandle
            regionId="bottomBar"
            orientation="horizontal"
            containerRef={editorColumnRef}
            min={18}
            max={45}
            growsWithPointer={false}
          />
          <div
            className="flex shrink-0 flex-col overflow-hidden border-t border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-elevated)]"
            style={{
              height: `${bottomBarSize}%`,
              minHeight: '140px',
              maxHeight: '44%',
            }}
            aria-label="Bottom dock"
            data-active-bottom-panel={activeBottomPanel}
            data-testid="ide-bottom-dock"
          >
            <div className="flex shrink-0 items-center gap-1 border-b border-[var(--aethel-border-secondary)] px-2 py-1">
              {chat ? (
                <button
                  type="button"
                  onClick={() => onSelectBottomPanel?.('chat')}
                  aria-pressed={activeBottomPanel === 'chat'}
                  className={[
                    'rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]',
                    activeBottomPanel === 'chat'
                      ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-primary-light)]'
                      : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]',
                  ].join(' ')}
                >
                  AI Console
                </button>
              ) : null}
              {terminal ? (
                <button
                  type="button"
                  onClick={() => onSelectBottomPanel?.('terminal')}
                  aria-pressed={activeBottomPanel === 'terminal'}
                  className={[
                    'rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]',
                    activeBottomPanel === 'terminal'
                      ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-primary-light)]'
                      : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]',
                  ].join(' ')}
                >
                  Terminal
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onSelectBottomPanel?.('diagnostics')}
                aria-pressed={activeBottomPanel === 'diagnostics'}
                className={[
                  'rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]',
                  activeBottomPanel === 'diagnostics'
                    ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-primary-light)]'
                    : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]',
                ].join(' ')}
              >
                Diagnostics
              </button>
              <div className="flex-1" />
              {chatOpen ? (
                <button
                  type="button"
                  onClick={toggleChat}
                  className="rounded px-2 py-1 text-[10px] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]"
                  aria-label="Close bottom panel chrome"
                >
                  Close
                </button>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {showChatInDock && chat ? (
                <div className="h-full overflow-auto" data-testid="bottom-dock-chat">
                  {chat}
                </div>
              ) : null}

              {showChatInDock && !chat ? (
                <WorkbenchEmptyState
                  title="AI Console unavailable"
                  description="Open Agents or enable the chat surface to use the bottom AI Console."
                />
              ) : null}

              {showDiagnosticsInDock ? (
                <div className="h-full overflow-hidden" data-testid="bottom-dock-diagnostics">
                  <IdeDiagnosticsDock />
                </div>
              ) : null}

              {showTerminalInDock && terminal ? (
                <div
                  className="flex h-full min-h-0 flex-row overflow-hidden"
                  data-testid="bottom-dock-terminal"
                >
                  <DockRegion regionId="bottomBar" />
                  <div style={{ display: 'none' }} aria-hidden>
                    <DockPanel id="terminal" title="Terminal" defaultRegion="bottomBar">
                      {terminal}
                    </DockPanel>
                  </div>
                </div>
              ) : null}

              {showTerminalInDock && !terminal ? (
                <WorkbenchEmptyState
                  title="Terminal unavailable"
                  description="Host PTY remains HELD — sandbox terminal surfaces attach here when ready."
                />
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ModernIDEShellCenterStack;
