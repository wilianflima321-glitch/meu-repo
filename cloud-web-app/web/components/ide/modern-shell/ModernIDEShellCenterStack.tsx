'use client';

import React from 'react';
import { MessageSquare, TerminalSquare, X } from 'lucide-react';
import { ResizeHandle } from './ModernIDEShellChrome';
import {
  BORDER_SECONDARY,
  SURFACE_PRIMARY,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
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

// Panel tabs: labels users actually understand
const bottomPanelTabs: ReadonlyArray<{
  id: BottomPanelMode;
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
}> = [
  {
    id: 'chat',
    icon: <MessageSquare size={14} />,
    label: 'Copilot',
    ariaLabel: 'AI Copilot panel',
  },
  {
    id: 'terminal',
    icon: <TerminalSquare size={14} />,
    label: 'Terminal',
    ariaLabel: 'Terminal panel',
  },
];

export function ModernIDEShellCenterStack({
  editor,
  chat,
  terminal,
  chatOpen,
  chatSize,
  activeBottomPanel,
  isCompact,
  editorColumnRef,
  setChatSize,
  toggleChat,
  onSelectBottomPanel,
  startVerticalResize,
}: ModernIDEShellCenterStackProps) {
  const activePanelMeta = bottomPanelTabs.find((tab) => tab.id === activeBottomPanel) ?? bottomPanelTabs[0];
  const activeBottomContent = activeBottomPanel === 'terminal' ? terminal : chat;

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

      {/* Bottom panel (Copilot / Terminal) */}
      {chatOpen && !isCompact && (
        <>
          <ResizeHandle
            ariaLabel={`Resize ${activePanelMeta.label}`}
            orientation="horizontal"
            onMouseDown={startVerticalResize}
            onAdjust={(delta) => setChatSize(chatSize + delta)}
            valueNow={chatSize}
            valueMin={18}
            valueMax={45}
          />
          <div
            style={{
              height: `${chatSize}%`,
              minHeight: '136px',
              maxHeight: '42%',
              borderTop: `1px solid ${BORDER_SECONDARY}`,
              background: 'rgba(15, 23, 42, 0.82)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Panel chrome bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: chromeBarPadding,
                minHeight: chromeBarHeight,
                borderBottom: `1px solid ${BORDER_SECONDARY}`,
                background: 'rgba(255, 255, 255, 0.02)',
                gap: '8px',
              }}
            >
              {/* Tab switcher: minimal, no description text */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px',
                  border: `1px solid ${BORDER_SECONDARY}`,
                  borderRadius: '999px',
                  background: 'rgba(15, 23, 42, 0.5)',
                }}
                role="tablist"
                aria-label="Bottom panel tabs"
              >
                {bottomPanelTabs.map((tab) => {
                  const active = tab.id === activeBottomPanel;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      aria-label={tab.ariaLabel}
                      onClick={() => onSelectBottomPanel?.(tab.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '5px 10px',
                        borderRadius: '999px',
                        border: 'none',
                        cursor: 'pointer',
                        background: active ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                        color: active ? TEXT_PRIMARY : TEXT_SECONDARY,
                        fontSize: '11px',
                        fontWeight: 600,
                        transition: 'all 0.12s',
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={toggleChat}
                style={iconButtonStyle}
                aria-label={`Close ${activePanelMeta.label}`}
              >
                <X size={14} />
              </button>
            </div>

            {/* Panel content */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeBottomContent}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ModernIDEShellCenterStack;
