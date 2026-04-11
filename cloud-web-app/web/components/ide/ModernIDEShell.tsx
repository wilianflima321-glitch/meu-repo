'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { tokens, gradients } from '@/lib/design-tokens';
import {
  Layout,
  Code2,
  Play,
  MessageSquare,
  FolderTree,
  Settings,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  GitBranch,
  AlertCircle,
  CheckCircle,
  Clock,
  Terminal,
  Search,
  Sparkles,
} from 'lucide-react';

interface ModernIDEShellProps {
  banner?: React.ReactNode;
  children: {
    sidebar: React.ReactNode;
    editor: React.ReactNode;
    preview: React.ReactNode;
    chat: React.ReactNode;
  };
  projectName?: string;
  activeFileName?: string;
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
  panelState?: PanelState;
  onTogglePanel?: (panel: keyof PanelState) => void;
  onResizePanel?: (panel: keyof PanelState, size: number) => void;
  onRunPrimaryAction?: () => void;
  onOpenSettings?: () => void;
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void;
  onSelectSidebarTab?: (tab: 'explorer' | 'git') => void;
  onSelectPreviewMode?: (mode: 'runtime' | 'device' | 'console' | 'viewport3d') => void;
  onToggleDiagnostics?: () => void;
  activeSidebarTab?: 'explorer' | 'git';
  activePreviewMode?: 'runtime' | 'device' | 'console' | 'viewport3d';
}

interface PanelState {
  sidebar: { open: boolean; size: number };
  editor: { open: boolean; size: number };
  preview: { open: boolean; size: number };
  chat: { open: boolean; size: number };
}

export type { PanelState };

const chromeBarPadding = `${tokens.spacing['2']} ${tokens.spacing['4']}`;
const chromeBarHeight = '48px';
const iconButtonStyle: React.CSSProperties = {
  minWidth: '36px',
  minHeight: '36px',
  padding: tokens.spacing['2'],
  background: 'transparent',
  border: 'none',
  borderRadius: tokens.radius.md,
  color: tokens.colors.text.muted,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
};

export function ModernIDEShell({
  banner,
  children,
  projectName = 'Projeto sem nome',
  activeFileName,
  onToggleSidebar,
  sidebarOpen = true,
  panelState: controlledPanelState,
  onTogglePanel: controlledTogglePanel,
  onResizePanel: controlledResizePanel,
  onRunPrimaryAction,
  onOpenSettings,
  onOpenCommandPalette,
  onSelectSidebarTab,
  onSelectPreviewMode,
  onToggleDiagnostics,
  activeSidebarTab = 'explorer',
  activePreviewMode = 'runtime',
}: ModernIDEShellProps) {
  const [internalPanelState, setInternalPanelState] = useState<PanelState>({
    sidebar: { open: sidebarOpen, size: 20 },
    editor: { open: true, size: 45 },
    preview: { open: true, size: 35 },
    chat: { open: false, size: 25 },
  });

  const panelState = controlledPanelState ?? internalPanelState;

  const [isCompact, setIsCompact] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const contentRowRef = useRef<HTMLDivElement>(null);
  const editorColumnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsCompact(entry.contentRect.width < 1024);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const clampPanelSize = useCallback((panel: keyof PanelState, size: number) => {
    if (panel === 'sidebar') return Math.min(32, Math.max(16, size));
    if (panel === 'preview') return Math.min(55, Math.max(25, size));
    if (panel === 'chat') return Math.min(45, Math.max(18, size));
    return Math.min(60, Math.max(25, size));
  }, []);

  const setPanelSize = useCallback((panel: keyof PanelState, size: number) => {
    const nextSize = clampPanelSize(panel, size);
    if (controlledResizePanel) {
      controlledResizePanel(panel, nextSize);
      return;
    }

    setInternalPanelState((prev) => ({
      ...prev,
      [panel]: {
        ...prev[panel],
        size: nextSize,
      },
    }));
  }, [clampPanelSize, controlledResizePanel]);

  const togglePanel = useCallback((panel: keyof PanelState) => {
    if (controlledTogglePanel) {
      controlledTogglePanel(panel);
      return;
    }

    setInternalPanelState((prev) => ({
      ...prev,
      [panel]: {
        ...prev[panel],
        open: !prev[panel].open,
      },
    }));
  }, [controlledTogglePanel]);

  const startHorizontalResize = useCallback((panel: 'sidebar' | 'preview', event: React.MouseEvent<HTMLDivElement>) => {
    if (isCompact) return;
    event.preventDefault();

    const targetRef = panel === 'sidebar' ? mainAreaRef : contentRowRef;
    const element = targetRef.current;
    if (!element) return;

    const bounds = element.getBoundingClientRect();
    if (bounds.width <= 0) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const relativeX = moveEvent.clientX - bounds.left;
      const widthPercent = (relativeX / bounds.width) * 100;
      const nextSize = panel === 'sidebar' ? widthPercent : 100 - widthPercent;
      setPanelSize(panel, nextSize);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [isCompact, setPanelSize]);

  const startVerticalResize = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isCompact) return;
    event.preventDefault();

    const element = editorColumnRef.current;
    if (!element) return;

    const bounds = element.getBoundingClientRect();
    if (bounds.height <= 0) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const relativeY = moveEvent.clientY - bounds.top;
      const heightPercent = ((bounds.height - relativeY) / bounds.height) * 100;
      setPanelSize('chat', heightPercent);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [isCompact, setPanelSize]);

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    background: tokens.colors.bg.primary,
    color: tokens.colors.text.primary,
    fontFamily: tokens.typography.fontFamily.sans,
    overflow: 'hidden',
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <IDEHeader
        projectName={projectName}
        activeFileName={activeFileName}
        panelState={panelState}
        onTogglePanel={togglePanel}
        onToggleSidebar={onToggleSidebar}
        isCompact={isCompact}
        onRunPrimaryAction={onRunPrimaryAction}
        onOpenSettings={onOpenSettings}
      />

      {banner ? (
        <div
          style={{
            borderBottom: `1px solid ${tokens.colors.border.light}`,
            background: 'color-mix(in srgb, var(--aethel-surface-secondary) 84%, transparent)',
            flexShrink: 0,
          }}
        >
          {banner}
        </div>
      ) : null}

      <div ref={mainAreaRef} style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
        {panelState.sidebar.open && (
          <div
            style={{
              width: `${panelState.sidebar.size}%`,
              minWidth: '200px',
              maxWidth: '400px',
              background: gradients.glassSubtle,
              borderRight: `1px solid ${tokens.colors.border.light}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {children.sidebar}
          </div>
        )}

        {panelState.sidebar.open && !isCompact && (
          <ResizeHandle
            ariaLabel="Redimensionar barra lateral"
            orientation="vertical"
            onMouseDown={(event) => startHorizontalResize('sidebar', event)}
            onAdjust={(delta) => setPanelSize('sidebar', panelState.sidebar.size + delta)}
            valueNow={panelState.sidebar.size}
            valueMin={16}
            valueMax={32}
          />
        )}

        <div ref={contentRowRef} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
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
                background: tokens.colors.bg.primary,
                minHeight: 0,
              }}
            >
              {children.editor}
            </div>

            {panelState.chat.open && !isCompact && (
              <>
                <ResizeHandle
                  ariaLabel="Redimensionar copiloto"
                  orientation="horizontal"
                  onMouseDown={startVerticalResize}
                  onAdjust={(delta) => setPanelSize('chat', panelState.chat.size + delta)}
                  valueNow={panelState.chat.size}
                  valueMin={18}
                  valueMax={45}
                />
                <div
                  style={{
                    height: `${panelState.chat.size}%`,
                    minHeight: '160px',
                    maxHeight: '55%',
                    borderTop: `1px solid ${tokens.colors.border.light}`,
                    background: gradients.glassMedium,
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
                      borderBottom: `1px solid ${tokens.colors.border.light}`,
                      background: 'rgba(255, 255, 255, 0.02)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: tokens.typography.fontSize.xs,
                        fontWeight: tokens.typography.fontWeight.semibold,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: tokens.colors.text.secondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing['2'],
                      }}
                    >
                      <MessageSquare size={14} />
                      Copiloto
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePanel('chat')}
                      style={iconButtonStyle}
                      aria-label="Fechar copiloto"
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    {children.chat}
                  </div>
                </div>
              </>
            )}
          </div>

          {panelState.preview.open && !isCompact && (
            <ResizeHandle
              ariaLabel="Redimensionar prévia"
              orientation="vertical"
              onMouseDown={(event) => startHorizontalResize('preview', event)}
              onAdjust={(delta) => setPanelSize('preview', panelState.preview.size + delta)}
              valueNow={panelState.preview.size}
              valueMin={25}
              valueMax={55}
            />
          )}

          {panelState.preview.open && !isCompact && (
            <div
              style={{
                width: `${panelState.preview.size}%`,
                minWidth: '250px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: tokens.colors.bg.surface,
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
                  borderBottom: `1px solid ${tokens.colors.border.light}`,
                  background: gradients.glassSubtle,
                }}
              >
                <span
                  style={{
                    fontSize: tokens.typography.fontSize.xs,
                    fontWeight: tokens.typography.fontWeight.semibold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: tokens.colors.text.secondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing['2'],
                  }}
                >
                  <Play size={14} />
                  Prévia
                </span>
                <button
                  type="button"
                  onClick={() => togglePanel('preview')}
                  style={iconButtonStyle}
                  aria-label="Fechar prévia"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div style={{ flex: 1, overflow: 'auto' }}>
                {children.preview}
              </div>
            </div>
          )}
        </div>

        {!panelState.preview.open && !isCompact && (
          <button
            type="button"
            onClick={() => togglePanel('preview')}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              padding: `${tokens.spacing['2']} ${tokens.spacing['1.5']}`,
              background: gradients.glassMedium,
              border: `1px solid ${tokens.colors.border.light}`,
              borderRight: 'none',
              borderRadius: `${tokens.radius.lg} 0 0 ${tokens.radius.lg}`,
              color: tokens.colors.text.secondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['2'],
              zIndex: 10,
            }}
            aria-label="Abrir prévia"
          >
            <ChevronLeft size={16} />
            <Play size={14} />
          </button>
        )}
      </div>

      {isCompact && <MobileBottomBar panelState={panelState} onTogglePanel={togglePanel} />}

      {!isCompact && (
        <>
          <BottomDock
            panelState={panelState}
            onTogglePanel={togglePanel}
            onOpenCommandPalette={onOpenCommandPalette}
            onSelectSidebarTab={onSelectSidebarTab}
            onSelectPreviewMode={onSelectPreviewMode}
            onToggleDiagnostics={onToggleDiagnostics}
            activeSidebarTab={activeSidebarTab}
            activePreviewMode={activePreviewMode}
          />
          <StatusBar projectName={projectName} activeFileName={activeFileName} />
        </>
      )}
    </div>
  );
}

interface ResizeHandleProps {
  ariaLabel: string;
  orientation: 'vertical' | 'horizontal';
  onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAdjust: (delta: number) => void;
  valueNow: number;
  valueMin: number;
  valueMax: number;
}

function ResizeHandle({
  ariaLabel,
  orientation,
  onMouseDown,
  onAdjust,
  valueNow,
  valueMin,
  valueMax,
}: ResizeHandleProps) {
  const isVertical = orientation === 'vertical';

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : 2;

    if (isVertical) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onAdjust(-step);
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onAdjust(step);
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onAdjust(-step);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onAdjust(step);
    }
  };

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      aria-valuenow={Math.round(valueNow)}
      aria-valuemin={valueMin}
      aria-valuemax={valueMax}
      tabIndex={0}
      style={{
        width: isVertical ? '10px' : '100%',
        height: isVertical ? '100%' : '10px',
        cursor: isVertical ? 'col-resize' : 'row-resize',
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        outline: 'none',
        transition: `background ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
      }}
      onMouseDown={onMouseDown}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        e.currentTarget.style.background = tokens.colors.border.medium;
      }}
      onBlur={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = tokens.colors.border.medium;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
      title={`${ariaLabel} — use setas${isVertical ? ' esquerda/direita' : ' cima/baixo'} para ajustar`}
    >
      <div
        style={{
          width: isVertical ? '2px' : '28px',
          height: isVertical ? '28px' : '2px',
          borderRadius: tokens.radius.full,
          background: tokens.colors.border.medium,
          opacity: 0.9,
        }}
      />
      <GripVertical
        size={12}
        color={tokens.colors.text.muted}
        style={{
          position: 'absolute',
          transform: isVertical ? undefined : 'rotate(90deg)',
        }}
      />
    </div>
  );
}

interface IDEHeaderProps {
  projectName: string;
  activeFileName?: string;
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
  onToggleSidebar?: () => void;
  isCompact: boolean;
  onRunPrimaryAction?: () => void;
  onOpenSettings?: () => void;
}

function IDEHeader({
  projectName,
  activeFileName,
  panelState,
  onTogglePanel,
  onToggleSidebar,
  isCompact,
  onRunPrimaryAction,
  onOpenSettings,
}: IDEHeaderProps) {
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing['3']} ${tokens.spacing['5']}`,
    background: gradients.glassStrong,
    borderBottom: `1px solid ${tokens.colors.border.light}`,
    minHeight: '60px',
    gap: tokens.spacing['4'],
  };

  return (
    <header style={headerStyle}>
      <div style={{ display: 'flex', minWidth: 0, flex: '1 1 auto', alignItems: 'center', gap: tokens.spacing['4'] }}>
        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            ...iconButtonStyle,
            color: tokens.colors.text.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Alternar barra lateral"
        >
          <Layout size={20} />
        </button>

        <div style={{ display: 'flex', minWidth: 0, flexDirection: 'column', gap: tokens.spacing['0.5'] }}>
          <span
            style={{
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {projectName}
          </span>
          {activeFileName && (
            <span
              style={{
                fontSize: tokens.typography.fontSize.xs,
                color: tokens.colors.text.muted,
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing['1'],
                minWidth: 0,
              }}
            >
              <Code2 size={12} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeFileName}
              </span>
            </span>
          )}
        </div>
      </div>

      {!isCompact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'], flexWrap: 'wrap', justifyContent: 'center' }}>
          <PanelToggle
            icon={<FolderTree size={16} />}
            label="Arquivos"
            active={panelState.sidebar.open}
            onClick={() => onTogglePanel('sidebar')}
          />
          <PanelToggle
            icon={<MessageSquare size={16} />}
            label="Copiloto"
            active={panelState.chat.open}
            onClick={() => onTogglePanel('chat')}
          />
          <PanelToggle
            icon={<Play size={16} />}
            label="Prévia"
            active={panelState.preview.open}
            onClick={() => onTogglePanel('preview')}
          />
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'], flexShrink: 0 }}>
        <button
          type="button"
          onClick={onRunPrimaryAction}
          disabled={!onRunPrimaryAction}
          style={{
            minHeight: '40px',
            padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
            background: gradients.brand,
            border: 'none',
            borderRadius: tokens.radius.md,
            color: tokens.colors.text.primary,
            fontSize: tokens.typography.fontSize.xs,
            fontWeight: tokens.typography.fontWeight.semibold,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing['2'],
            opacity: onRunPrimaryAction ? 1 : 0.65,
          }}
          aria-label="Executar ação principal da prévia"
        >
          <Play size={14} />
          Executar
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          disabled={!onOpenSettings}
          style={{
            ...iconButtonStyle,
            color: tokens.colors.text.secondary,
            opacity: onOpenSettings ? 1 : 0.65,
          }}
          aria-label="Abrir configurações"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}

interface PanelToggleProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function PanelToggle({ icon, label, active, onClick }: PanelToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
        minHeight: '36px',
        padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
        background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        border: `1px solid ${active ? tokens.colors.border.medium : 'transparent'}`,
        borderRadius: tokens.radius.md,
        color: active ? tokens.colors.text.primary : tokens.colors.text.secondary,
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.medium,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

interface BottomDockProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
  onOpenCommandPalette?: (mode: 'commands' | 'files') => void;
  onSelectSidebarTab?: (tab: 'explorer' | 'git') => void;
  onSelectPreviewMode?: (mode: 'runtime' | 'device' | 'console' | 'viewport3d') => void;
  onToggleDiagnostics?: () => void;
  activeSidebarTab?: 'explorer' | 'git';
  activePreviewMode?: 'runtime' | 'device' | 'console' | 'viewport3d';
}

function BottomDock({
  panelState,
  onTogglePanel,
  onOpenCommandPalette,
  onSelectSidebarTab,
  onSelectPreviewMode,
  onToggleDiagnostics,
  activeSidebarTab = 'explorer',
  activePreviewMode = 'runtime',
}: BottomDockProps) {
  const dockStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['2'],
    padding: `${tokens.spacing['2']} ${tokens.spacing['4']}`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${tokens.colors.border.light}`,
    minHeight: '52px',
    overflowX: 'auto',
  };

  const dockItems = [
    { id: 'explorer', icon: <FolderTree size={16} />, label: 'Arquivos', shortcut: 'Ctrl+Shift+E' },
    { id: 'search', icon: <Search size={16} />, label: 'Buscar', shortcut: 'Ctrl+Shift+F' },
    { id: 'git', icon: <GitBranch size={16} />, label: 'Git', shortcut: 'Ctrl+Shift+G' },
    { id: 'console', icon: <Terminal size={16} />, label: 'Console', shortcut: 'Ctrl+J' },
    { id: 'diagnostics', icon: <AlertCircle size={16} />, label: 'Erros', shortcut: 'Ctrl+Shift+M' },
    { id: 'chat', icon: <Sparkles size={16} />, label: 'IA', shortcut: 'Ctrl+I' },
  ] as const;

  return (
    <div style={dockStyle}>
      {dockItems.map((item) => {
        const isActive =
          (item.id === 'explorer' && panelState.sidebar.open && activeSidebarTab === 'explorer') ||
          (item.id === 'git' && panelState.sidebar.open && activeSidebarTab === 'git') ||
          (item.id === 'console' && panelState.preview.open && activePreviewMode === 'console') ||
          (item.id === 'chat' && panelState.chat.open);

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === 'explorer') {
                if (!panelState.sidebar.open) onTogglePanel('sidebar');
                onSelectSidebarTab?.('explorer');
                return;
              }
              if (item.id === 'git') {
                if (!panelState.sidebar.open) onTogglePanel('sidebar');
                onSelectSidebarTab?.('git');
                return;
              }
              if (item.id === 'search') {
                onOpenCommandPalette?.('files');
                return;
              }
              if (item.id === 'console') {
                if (!panelState.preview.open) onTogglePanel('preview');
                onSelectPreviewMode?.('console');
                return;
              }
              if (item.id === 'diagnostics') {
                onToggleDiagnostics?.();
                return;
              }
              if (item.id === 'chat') {
                onTogglePanel('chat');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['2'],
              minHeight: '36px',
              padding: `${tokens.spacing['1.5']} ${tokens.spacing['2.5']}`,
              background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: `1px solid ${isActive ? tokens.colors.border.medium : 'transparent'}`,
              borderRadius: tokens.radius.sm,
              color: isActive ? tokens.colors.text.primary : tokens.colors.text.muted,
              fontSize: tokens.typography.fontSize.xs,
              cursor: 'pointer',
              flexShrink: 0,
              transition: `all ${tokens.animation.duration.fast} ${tokens.animation.easing.default}`,
              whiteSpace: 'nowrap',
            }}
            title={`${item.label} (${item.shortcut})`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface StatusBarProps {
  projectName: string;
  activeFileName?: string;
}

function StatusBar({ projectName, activeFileName }: StatusBarProps) {
  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing['1.5']} ${tokens.spacing['4']}`,
    background: tokens.colors.bg.surface,
    borderTop: `1px solid ${tokens.colors.border.light}`,
    minHeight: '28px',
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.secondary,
    gap: tokens.spacing['4'],
  };

  return (
    <div style={statusBarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['4'], minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <GitBranch size={12} />
          <span>main</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <AlertCircle size={12} style={{ color: tokens.colors.status.warning }} />
          <span>0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <AlertCircle size={12} style={{ color: tokens.colors.status.error }} />
          <span>0</span>
        </div>
      </div>

      {activeFileName && (
        <div style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: tokens.spacing['1'] }}>
          <Code2 size={12} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeFileName}</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['4'], flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <CheckCircle size={12} style={{ color: tokens.colors.status.success }} />
          <span>Prettier</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <Terminal size={12} />
          <span>UTF-8</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <Clock size={12} />
          <span>Ln 1, Col 1</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <Sparkles size={12} />
          <span>AI Ready</span>
        </div>
      </div>
    </div>
  );
}

interface MobileBottomBarProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
}

function MobileBottomBar({ panelState, onTogglePanel }: MobileBottomBarProps) {
  const barStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: `${tokens.spacing['2']} ${tokens.spacing['2']}`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${tokens.colors.border.light}`,
    minHeight: '60px',
    gap: tokens.spacing['1'],
  };

  const items = [
    { id: 'sidebar', icon: <FolderTree size={20} />, label: 'Arquivos' },
    { id: 'editor', icon: <Code2 size={20} />, label: 'Editor' },
    { id: 'chat', icon: <MessageSquare size={20} />, label: 'Copiloto' },
    { id: 'preview', icon: <Play size={20} />, label: 'Prévia' },
  ] as const;

  return (
    <nav style={barStyle}>
      {items.map((item) => {
        const isActive = panelState[item.id as keyof PanelState].open;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onTogglePanel(item.id as keyof PanelState)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: tokens.spacing['1'],
              minWidth: '64px',
              minHeight: '44px',
              padding: `${tokens.spacing['1.5']} ${tokens.spacing['3']}`,
              background: 'transparent',
              border: 'none',
              color: isActive ? tokens.colors.accent.cyan : tokens.colors.text.muted,
              fontSize: tokens.typography.fontSize.xs,
              cursor: 'pointer',
            }}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function ModernIDELoading() {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    background: tokens.colors.bg.primary,
    color: tokens.colors.text.secondary,
    gap: tokens.spacing['4'],
  };

  const spinnerStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    border: `3px solid ${tokens.colors.border.light}`,
    borderTopColor: tokens.colors.accent.cyan,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle} />
      <span style={{ fontSize: tokens.typography.fontSize.sm }}>
        Carregando IDE...
      </span>
    </div>
  );
}

export default ModernIDEShell;
