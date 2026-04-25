'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ResizeHandle } from './ModernIDEShellChrome';
import {
  BORDER_SECONDARY,
  SURFACE_PRIMARY,
  chromeBarHeight,
  chromeBarPadding,
  iconButtonStyle,
} from './chromeStyles';
import { PanelTitle } from './ModernIDEShellSideColumns';

interface ModernIDEShellCenterStackProps {
  editor: React.ReactNode;
  chat: React.ReactNode;
  chatOpen: boolean;
  chatSize: number;
  isCompact: boolean;
  editorColumnRef: React.RefObject<HTMLDivElement>;
  setChatSize: (size: number) => void;
  toggleChat: () => void;
  startVerticalResize: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export function ModernIDEShellCenterStack({
  editor,
  chat,
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

      {chatOpen && !isCompact && (
        <>
          <ResizeHandle
            ariaLabel="Redimensionar AI Console"
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
              minHeight: '160px',
              maxHeight: '55%',
              borderTop: `1px solid ${BORDER_SECONDARY}`,
              background: 'rgba(15, 23, 42, 0.82)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: chromeBarPadding,
                minHeight: chromeBarHeight,
                borderBottom: `1px solid ${BORDER_SECONDARY}`,
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <PanelTitle icon={<MessageSquare size={14} />} label="AI Console" />
              <button
                type="button"
                onClick={toggleChat}
                style={iconButtonStyle}
                aria-label="Fechar AI Console"
              >
                ×
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>{chat}</div>
          </div>
        </>
      )}
    </div>
  );
}

export default ModernIDEShellCenterStack;
