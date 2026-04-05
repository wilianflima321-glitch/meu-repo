/**
 * Modern IDE Shell - Split View Layout
 * Addresses UX analysis findings: disconnected preview, fragmented layout
 */

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
  Layers,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ModernIDEShellProps {
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
}

interface PanelState {
  sidebar: { open: boolean; size: number };
  editor: { open: boolean; size: number };
  preview: { open: boolean; size: number };
  chat: { open: boolean; size: number };
}

export type { PanelState };

// ============================================================================
// MODERN IDE SHELL
// ============================================================================

export function ModernIDEShell({
  children,
  projectName = 'Projeto sem nome',
  activeFileName,
  onToggleSidebar,
  sidebarOpen = true,
  panelState: controlledPanelState,
  onTogglePanel: controlledTogglePanel,
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

  // Detect compact mode based on container width
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
      {/* Header */}
      <IDEHeader
        projectName={projectName}
        activeFileName={activeFileName}
        panelState={panelState}
        onTogglePanel={togglePanel}
        onToggleSidebar={onToggleSidebar}
        isCompact={isCompact}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Sidebar */}
        {panelState.sidebar.open && (
          <div
            style={{
              width: '240px',
              minWidth: '200px',
              maxWidth: '400px',
              background: gradients.glassSubtle,
              borderRight: `1px solid ${tokens.colors.border.light}`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {children.sidebar}
          </div>
        )}

        {/* Main Content - CSS-based split view */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Editor Area */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                background: tokens.colors.bg.primary,
              }}
            >
              {children.editor}
            </div>

            {/* Inline Chat - Bottom of Editor */}
            {panelState.chat.open && !isCompact && (
              <div
                style={{
                  height: '200px',
                  borderTop: `1px solid ${tokens.colors.border.light}`,
                  background: gradients.glassMedium,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: `${tokens.spacing['2']} ${tokens.spacing['4']}`,
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
                  <button type="button"
                    onClick={() => togglePanel('chat')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: tokens.colors.text.muted,
                      cursor: 'pointer',
                      padding: tokens.spacing['1'],
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                  {children.chat}
                </div>
              </div>
            )}
          </div>

          {/* Resize Handle */}
          {panelState.preview.open && !isCompact && (
            <div
              style={{
                width: '8px',
                cursor: 'col-resize',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = tokens.colors.border.medium;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <GripVertical size={12} color={tokens.colors.text.muted} />
            </div>
          )}

          {/* Preview Panel */}
          {panelState.preview.open && !isCompact && (
            <div
              style={{
                width: '35%',
                minWidth: '250px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: tokens.colors.bg.surface,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `${tokens.spacing['2']} ${tokens.spacing['4']}`,
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
                  Preview
                </span>
                <button type="button"
                  onClick={() => togglePanel('preview')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: tokens.colors.text.muted,
                    cursor: 'pointer',
                  }}
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

        {/* Collapsed Preview - Show Toggle */}
        {!panelState.preview.open && !isCompact && (
          <button type="button"
            onClick={() => togglePanel('preview')}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              padding: `${tokens.spacing['2']} ${tokens.spacing['1']}`,
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
          >
            <ChevronLeft size={16} />
            <Play size={14} />
          </button>
        )}
      </div>

      {/* Mobile Bottom Bar */}
      {isCompact && (
        <MobileBottomBar
          panelState={panelState}
          onTogglePanel={togglePanel}
        />
      )}

      {/* Desktop Bottom Dock */}
      {!isCompact && (
        <>
          <BottomDock
            panelState={panelState}
            onTogglePanel={togglePanel}
          />
          <StatusBar
            projectName={projectName}
            activeFileName={activeFileName}
          />
        </>
      )}
    </div>
  );
}

// ============================================================================
// IDE HEADER
// ============================================================================

interface IDEHeaderProps {
  projectName: string;
  activeFileName?: string;
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
  onToggleSidebar?: () => void;
  isCompact: boolean;
}

function IDEHeader({
  projectName,
  activeFileName,
  panelState,
  onTogglePanel,
  onToggleSidebar,
  isCompact,
}: IDEHeaderProps) {
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing['2']} ${tokens.spacing['4']}`,
    background: gradients.glassStrong,
    borderBottom: `1px solid ${tokens.colors.border.light}`,
    height: '48px',
  };

  return (
    <header style={headerStyle}>
      {/* Left: Project Info & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['4'] }}>
        <button type="button"
          onClick={onToggleSidebar}
          style={{
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text.secondary,
            cursor: 'pointer',
            padding: tokens.spacing['2'],
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Layout size={20} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing['0.5'] }}>
          <span
            style={{
              fontSize: tokens.typography.fontSize.sm,
              fontWeight: tokens.typography.fontWeight.semibold,
              color: tokens.colors.text.primary,
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
              }}
            >
              <Code2 size={12} />
              {activeFileName}
            </span>
          )}
        </div>
      </div>

      {/* Center: Panel Toggles (Desktop) */}
      {!isCompact && (
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'] }}>
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
            label="Preview"
            active={panelState.preview.open}
            onClick={() => onTogglePanel('preview')}
          />
        </div>
      )}

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['2'] }}>
        <button
          type="button"
          style={{
            padding: `${tokens.spacing['1.5']} ${tokens.spacing['3']}`,
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
          }}
        >
          <Play size={14} />
          Executar
        </button>
        <button
          type="button"
          style={{
            padding: tokens.spacing['2'],
            background: 'transparent',
            border: 'none',
            color: tokens.colors.text.secondary,
            cursor: 'pointer',
          }}
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}

// ============================================================================
// PANEL TOGGLE BUTTON
// ============================================================================

interface PanelToggleProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function PanelToggle({ icon, label, active, onClick }: PanelToggleProps) {
  return (
    <button type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing['2'],
        padding: `${tokens.spacing['1.5']} ${tokens.spacing['3']}`,
        background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        border: 'none',
        borderRadius: tokens.radius.md,
        color: active ? tokens.colors.text.primary : tokens.colors.text.secondary,
        fontSize: tokens.typography.fontSize.xs,
        fontWeight: tokens.typography.fontWeight.medium,
        cursor: 'pointer',
        transition: `all ${tokens.animation.duration.fast}`,
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================================
// BOTTOM DOCK (VS Code/Figma-style)
// ============================================================================

interface BottomDockProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
}

function BottomDock({ panelState, onTogglePanel }: BottomDockProps) {
  const dockStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing['1'],
    padding: `${tokens.spacing['2']} ${tokens.spacing['3']}`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${tokens.colors.border.light}`,
    height: '40px',
  };

  const dockItems = [
    { id: 'sidebar', icon: <FolderTree size={16} />, label: 'Explorer', shortcut: 'Ctrl+Shift+E' },
    { id: 'search', icon: <Search size={16} />, label: 'Search', shortcut: 'Ctrl+Shift+F' },
    { id: 'git', icon: <GitBranch size={16} />, label: 'Source Control', shortcut: 'Ctrl+Shift+G' },
    { id: 'debug', icon: <Sparkles size={16} />, label: 'AI Console', shortcut: 'Ctrl+Shift+A' },
    { id: 'extensions', icon: <Layers size={16} />, label: 'Extensions', shortcut: 'Ctrl+Shift+X' },
  ] as const;

  return (
    <div style={dockStyle}>
      {dockItems.map((item) => {
        const isActive = item.id === 'sidebar' ? panelState.sidebar.open : false;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => item.id === 'sidebar' && onTogglePanel('sidebar')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing['2'],
              padding: `${tokens.spacing['1']} ${tokens.spacing['2']}`,
              background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderRadius: tokens.radius.sm,
              color: isActive ? tokens.colors.text.primary : tokens.colors.text.muted,
              fontSize: tokens.typography.fontSize.xs,
              cursor: 'pointer',
              transition: `all ${tokens.animation.duration.fast}`,
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

// ============================================================================
// STATUS BAR (VS Code/Unreal-style)
// ============================================================================

interface StatusBarProps {
  projectName: string;
  activeFileName?: string;
}

function StatusBar({ projectName, activeFileName }: StatusBarProps) {
  const statusBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacing['1']} ${tokens.spacing['3']}`,
    background: tokens.colors.bg.surface,
    borderTop: `1px solid ${tokens.colors.border.light}`,
    height: '24px',
    fontSize: tokens.typography.fontSize.xs,
    color: tokens.colors.text.secondary,
  };

  return (
    <div style={statusBarStyle}>
      {/* Left Side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['4'] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <GitBranch size={12} />
          <span>main</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <AlertCircle size={12} style={{ color: tokens.colors.warning }} />
          <span>0</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <AlertCircle size={12} style={{ color: tokens.colors.error }} />
          <span>0</span>
        </div>
      </div>

      {/* Center - Active File */}
      {activeFileName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <Code2 size={12} />
          <span>{activeFileName}</span>
        </div>
      )}

      {/* Right Side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['4'] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing['1'] }}>
          <CheckCircle size={12} style={{ color: tokens.colors.success }} />
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

// ============================================================================
// MOBILE BOTTOM BAR
// ============================================================================

interface MobileBottomBarProps {
  panelState: PanelState;
  onTogglePanel: (panel: keyof PanelState) => void;
}

function MobileBottomBar({ panelState, onTogglePanel }: MobileBottomBarProps) {
  const barStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: `${tokens.spacing['2']} 0`,
    background: gradients.glassStrong,
    borderTop: `1px solid ${tokens.colors.border.light}`,
    height: '56px',
  };

  const items = [
    { id: 'sidebar', icon: <FolderTree size={20} />, label: 'Arquivos' },
    { id: 'editor', icon: <Code2 size={20} />, label: 'Editor' },
    { id: 'chat', icon: <MessageSquare size={20} />, label: 'Copiloto' },
    { id: 'preview', icon: <Play size={20} />, label: 'Preview' },
  ] as const;

  return (
    <nav style={barStyle}>
      {items.map((item) => {
        const isActive = panelState[item.id as keyof PanelState].open;
        return (
          <button type="button"
            key={item.id}
            onClick={() => onTogglePanel(item.id as keyof PanelState)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: tokens.spacing['1'],
              padding: `${tokens.spacing['1']} ${tokens.spacing['3']}`,
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

// ============================================================================
// LOADING SHELL
// ============================================================================

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
        Loading IDE...
      </span>
    </div>
  );
}

export default ModernIDEShell;
